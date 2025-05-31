const { Pool } = require('pg');

// Use same database config as your server.js
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'pflegeplus',
    password: 'bagier002',
    port: 5432,
});

class PatientAssignmentAlgorithm {

    // Get current workload for each Pflegekraft
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

    // Find Pflegekraft with lowest patient count (under 24)
    async findAvailablePflegekraft() {
        const workloads = await this.getCurrentWorkloads();

        // Find first Pflegekraft with less than 24 patients
        const available = workloads.find(pf => pf.current_patients < 24);

        if (!available) {
            throw new Error('All Pflegekräfte are at maximum capacity (24 patients each)');
        }

        return available;
    }

    // Assign a patient to best available Pflegekraft
    async assignPatient(patientId) {
        try {
            // Check if patient is already assigned
            const existingQuery = `
        SELECT * FROM patient_zuweisung 
        WHERE patient_id = $1 AND status = 'active'
      `;
            const existing = await pool.query(existingQuery, [patientId]);

            if (existing.rows.length > 0) {
                throw new Error(`Patient ${patientId} is already assigned`);
            }

            // Find best Pflegekraft
            const pflegekraft = await this.findAvailablePflegekraft();

            // Create assignment
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
                message: `Patient ${patientId} assigned to ${pflegekraft.benutzername}`
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Handle patient transfer/discharge
    async transferPatient(patientId, reason = 'transferred') {
        try {
            // Mark current assignment as inactive
            const updateQuery = `
        UPDATE patient_zuweisung 
        SET status = $1 
        WHERE patient_id = $2 AND status = 'active'
        RETURNING mitarbeiter_id
      `;

            const result = await pool.query(updateQuery, [reason, patientId]);

            if (result.rows.length === 0) {
                throw new Error(`No active assignment found for patient ${patientId}`);
            }

            const oldPflegekraftId = result.rows[0].mitarbeiter_id;

            // Try to assign a new patient to the Pflegekraft who lost one
            await this.fillEmptySlot(oldPflegekraftId);

            return {
                success: true,
                message: `Patient ${patientId} ${reason}, workload rebalanced`
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Fill empty slot when a patient leaves
    async fillEmptySlot(pflegekraftId) {
        // Find unassigned patients
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

    // Initial assignment of all patients
    async performInitialAssignment() {
        try {
            // Get all unassigned patients
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
            console.error('Initial assignment failed:', error);
            throw error;
        }
    }

    // Get assignment statistics
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