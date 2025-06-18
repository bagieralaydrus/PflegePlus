const { Pool } = require('pg');

// Datenbankverbindung mit gleicher Konfiguration wie server.js
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'pflegeplus',
    password: 'bagier002',
    port: 5432,
});

class PatientAssignmentAlgorithm {

    // Aktuelle Arbeitsbelastung für jede Pflegekraft abrufen
    async getCurrentWorkloads() {
        const query = `
            SELECT
                m.id,
                m.benutzername,
                COUNT(pa.patient_id) as current_patients
            FROM mitarbeiter m
                     LEFT JOIN patient_zuweisung pa ON m.id = pa.mitarbeiter_id
                AND pa.status = 'active'
            GROUP BY m.id, m.benutzername
            ORDER BY current_patients ASC, m.id ASC
        `;

        const result = await pool.query(query);
        return result.rows;
    }

    // Pflegekraft mit niedrigster Patientenzahl finden (unter 24)
    async findAvailablePflegekraft() {
        const workloads = await this.getCurrentWorkloads();

        // Erste Pflegekraft mit weniger als 24 Patienten finden + CONST PATIENTEN = 24
        const available = workloads.find(pf => pf.current_patients < 24);

        if (!available) {
            throw new Error('Alle Pflegekräfte haben maximale Kapazität erreicht (24 Patienten je Pflegekraft)');
        }

        return available;
    }

    // Patient der besten verfügbaren Pflegekraft zuweisen
    async assignPatient(patientId) {
        try {
            // Prüfen ob Patient bereits zugewiesen ist
            const existingQuery = `
                SELECT * FROM patient_zuweisung
                WHERE patient_id = $1 AND status = 'active'
            `;
            const existing = await pool.query(existingQuery, [patientId]);

            if (existing.rows.length > 0) {
                throw new Error(`Patient ${patientId} ist bereits zugewiesen`);
            }

            // Beste verfügbare Pflegekraft finden
            const pflegekraft = await this.findAvailablePflegekraft();

            // Zuweisung erstellen
            const assignQuery = `
                INSERT INTO patient_zuweisung (mitarbeiter_id, patient_id, status)
                VALUES ($1, $2, 'active')
                    RETURNING *
            `;

            const result = await pool.query(assignQuery, [pflegekraft.id, patientId]);

            return {
                success: true,
                assignment: result.rows[0],
                pflegekraft: pflegekraft,
                message: `Patient ${patientId} wurde ${pflegekraft.benutzername} zugewiesen`
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Patiententransfer/Entlassung verwalten
    async transferPatient(patientId, reason = 'transferred') {
        try {
            // Aktuelle Zuweisung als inaktiv markieren
            const updateQuery = `
                UPDATE patient_zuweisung
                SET status = $1
                WHERE patient_id = $2 AND status = 'active'
                    RETURNING mitarbeiter_id
            `;

            const result = await pool.query(updateQuery, [reason, patientId]);

            if (result.rows.length === 0) {
                throw new Error(`Keine aktive Zuweisung für Patient ${patientId} gefunden`);
            }

            const oldPflegekraftId = result.rows[0].mitarbeiter_id;

            // Versuchen, der Pflegekraft einen neuen Patienten zuzuweisen
            await this.fillEmptySlot(oldPflegekraftId);

            return {
                success: true,
                message: `Patient ${patientId} ${reason}, Arbeitsbelastung wurde ausgeglichen`
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Freien Platz füllen wenn ein Patient die Einrichtung verlässt
    async fillEmptySlot(pflegekraftId) {
        // Nicht zugewiesene Patienten finden
        const unassignedQuery = `
            SELECT p.id
            FROM patienten p
                     LEFT JOIN patient_zuweisung pa ON p.id = pa.patient_id AND pa.status = 'active'
            WHERE pa.patient_id IS NULL
                LIMIT 1
        `;

        const unassigned = await pool.query(unassignedQuery);

        if (unassigned.rows.length > 0) {
            const newPatientId = unassigned.rows[0].id;

            const assignQuery = `
                INSERT INTO patient_zuweisung (mitarbeiter_id, patient_id, status)
                VALUES ($1, $2, 'active')
            `;

            await pool.query(assignQuery, [pflegekraftId, newPatientId]);
            return newPatientId;
        }

        return null;
    }

    // Erstmalige Zuweisung aller Patienten
    async performInitialAssignment() {
        try {
            // Alle nicht zugewiesenen Patienten abrufen
            const unassignedQuery = `
                SELECT p.id
                FROM patienten p
                         LEFT JOIN patient_zuweisung pa ON p.id = pa.patient_id AND pa.status = 'active'
                WHERE pa.patient_id IS NULL
            `;

            const unassigned = await pool.query(unassignedQuery);
            const results = [];

            for (const patient of unassigned.rows) {
                const result = await this.assignPatient(patient.id);
                results.push(result);
            }

            return results;

        } catch (error) {
            console.error('Erstmalige Zuweisung fehlgeschlagen:', error);
            throw error;
        }
    }

    // Zuweisungsstatistiken abrufen
    async getStatistics() {
        const query = `
            SELECT
                m.benutzername,
                COUNT(pa.patient_id) as assigned_patients,
                (24 - COUNT(pa.patient_id)) as available_slots
            FROM mitarbeiter m
                     LEFT JOIN patient_zuweisung pa ON m.id = pa.mitarbeiter_id AND pa.status = 'active'
            GROUP BY m.id, m.benutzername
            ORDER BY assigned_patients DESC
        `;

        const result = await pool.query(query);
        return result.rows;
    }
}

module.exports = PatientAssignmentAlgorithm;