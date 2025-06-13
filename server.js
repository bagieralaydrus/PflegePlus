const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const cors = require('cors');
const AssignmentAlgorithm = require('./zuweisung-algorithm');
const algorithm = new AssignmentAlgorithm();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('WEB SEITE/LOGIN'));
app.use('/pflegekraft', express.static('WEB SEITE/Pflegekraft'));

// PostgreSQL Verbindung mit UTF-8 Konfiguration
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'pflegeplus',
    password: 'bagier002',
    port: 5432,
    client_encoding: 'UTF8',
    application_name: 'pflegevision-app',
    connectionString: `postgresql://postgres:bagier002@localhost:5432/pflegeplus?client_encoding=UTF8`,
    ssl: false
});

// Verbindungseinstellungen für jede neue Datenbankverbindung
pool.on('connect', (client) => {
    client.query('SET client_encoding TO UTF8');
    client.query('SET timezone TO \'Europe/Berlin\'');
});

pool.on('error', (err) => {
    console.error('Database pool error:', err);
});

// Datenbankverbindung testen
pool.connect((err, client, release) => {
    if (err) {
        console.error('Error connecting to PostgreSQL:', err);
    } else {
        console.log('Successfully connected to PostgreSQL database');
        release();
    }
});

// Login-Endpunkt für Mitarbeiter und Patienten
app.post('/api/login', async (req, res) => {
    const { username, birthdate } = req.body;

    if (!username || !birthdate) {
        return res.status(400).json({
            success: false,
            message: 'Benutzername und Geburtsdatum sind erforderlich'
        });
    }

    try {
        // Zuerst in Mitarbeiter-Tabelle suchen
        const mitarbeiterQuery = `
            SELECT id, benutzername, rolle, 'mitarbeiter' as user_type
            FROM mitarbeiter
            WHERE LOWER(benutzername) = LOWER($1) AND geburtsdatum = $2
        `;

        const mitarbeiterResult = await pool.query(mitarbeiterQuery, [username, birthdate]);

        if (mitarbeiterResult.rows.length > 0) {
            return res.json({
                success: true,
                message: `Willkommen, ${mitarbeiterResult.rows[0].benutzername}!`,
                user: {
                    id: mitarbeiterResult.rows[0].id,
                    username: mitarbeiterResult.rows[0].benutzername,
                    type: 'mitarbeiter',
                    role: mitarbeiterResult.rows[0].rolle || 'pflegekraft'
                }
            });
        }

        // Falls nicht in Mitarbeiter gefunden, in Patienten-Tabelle suchen
        const patientenQuery = `
            SELECT id, benutzername, 'patient' as user_type
            FROM patienten
            WHERE LOWER(benutzername) = LOWER($1) AND geburtsdatum = $2
        `;

        const patientenResult = await pool.query(patientenQuery, [username, birthdate]);

        if (patientenResult.rows.length > 0) {
            return res.json({
                success: true,
                message: `Willkommen, ${patientenResult.rows[0].benutzername}!`,
                user: {
                    id: patientenResult.rows[0].id,
                    username: patientenResult.rows[0].benutzername,
                    type: 'patient'
                }
            });
        }

        return res.status(401).json({
            success: false,
            message: 'Ungültige Anmeldedaten'
        });

    } catch (error) {
        console.error('Database error:', error);
        return res.status(500).json({
            success: false,
            message: 'Serverfehler bei der Anmeldung'
        });
    }
});

// HTML-Seiten bereitstellen
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'WEB SEITE', 'LOGIN', 'index.html'));
});

app.get('/pflegekraft', (req, res) => {
    res.sendFile(path.join(__dirname, 'WEB SEITE', 'Pflegekraft', 'index.html'));
});

app.get('/patient', (req, res) => {
    res.sendFile(path.join(__dirname, 'WEB SEITE', 'Patient', 'dashboard_patient.html'));
});

app.use('/patient', express.static('WEB SEITE/Patient'));

// Zufällige Patientenzuweisung für Demo-Zwecke
app.post('/api/assign-random', async (req, res) => {
    try {
        console.log('Starte Random-Assign-Algorithmus...');

        await pool.query('DELETE FROM patient_zuweisung');
        console.log('Alte Zuweisungen gelöscht.');

        // Alle verfügbaren Mitarbeiter laden
        const mitarbeiterList = (await pool.query('SELECT id FROM mitarbeiter')).rows.map(row => ({
            id: row.id,
            assignedCount: 0
        }));
        console.log(`Gefundene Mitarbeiter: ${mitarbeiterList.length}`);

        // Alle Patienten in zufälliger Reihenfolge laden
        const patienten = (await pool.query('SELECT id FROM patienten ORDER BY RANDOM()')).rows;
        console.log(`Gefundene Patienten: ${patienten.length}`);

        if (mitarbeiterList.length === 0 || patienten.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Keine Mitarbeiter oder Patienten vorhanden.'
            });
        }

        let mitarbeiterIndex = 0;

        for (const patient of patienten) {
            let assigned = false;
            let attempts = 0;

            while (!assigned && attempts < mitarbeiterList.length) {
                const currentMitarbeiter = mitarbeiterList[mitarbeiterIndex];

                if (currentMitarbeiter.assignedCount < 24) {
                    try {
                        await pool.query(
                            'INSERT INTO patient_zuweisung (mitarbeiter_id, patient_id) VALUES ($1, $2)',
                            [currentMitarbeiter.id, patient.id]
                        );
                        console.log(`Patient ${patient.id} zu Mitarbeiter ${currentMitarbeiter.id} zugewiesen.`);
                        currentMitarbeiter.assignedCount++;
                        assigned = true;
                    } catch (insertError) {
                        console.error(`Insert-Fehler bei Patient ${patient.id}:`, insertError.detail || insertError.message);
                    }
                }

                mitarbeiterIndex = (mitarbeiterIndex + 1) % mitarbeiterList.length;
                attempts++;
            }

            if (!assigned) {
                console.warn(`Kein freier Mitarbeiter für Patient ${patient.id} gefunden.`);
            }
        }

        res.json({ success: true, message: 'Random-Patienten-Zuweisung abgeschlossen!' });
    } catch (error) {
        console.error('Fehler im Zuweisungsprozess:', error);
        res.status(500).json({ success: false, message: 'Fehler bei der Random-Patienten-Zuweisung' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    pool.end(() => {
        console.log('Database pool has ended');
        process.exit(0);
    });
});

app.use('/pflegekraft', (req, res, next) => {
    console.log('Trying to serve:', req.url);
    next();
}, express.static('WEB SEITE/Pflegekraft'));

// Zuweisungsstatistiken abrufen
app.get('/api/assignments', async (req, res) => {
    try {
        const stats = await algorithm.getStatistics();
        res.json({ success: true, statistics: stats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Patient zuweisen
app.post('/api/assign-patient', async (req, res) => {
    const { patientId } = req.body;
    const result = await algorithm.assignPatient(patientId);
    res.json(result);
});

// Patient transferieren
app.post('/api/transfer-patient', async (req, res) => {
    const { patientId, reason } = req.body;
    const result = await algorithm.transferPatient(patientId, reason);
    res.json(result);
});

// Aufgabenstatus aktualisieren
app.put('/api/assignments/:assignmentId/status', async (req, res) => {
    const { assignmentId } = req.params;
    const { status } = req.body;

    try {
        const updateQuery = `
            UPDATE assignments
            SET status = $1, updated_at = NOW()
            WHERE id = $2
                RETURNING *
        `;

        const result = await pool.query(updateQuery, [status, assignmentId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Assignment not found'
            });
        }

        res.json({
            success: true,
            assignment: result.rows[0]
        });
    } catch (error) {
        console.error('Status update error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating assignment status'
        });
    }
});

// Aufgabe löschen
app.delete('/api/assignments/:assignmentId', async (req, res) => {
    const { assignmentId } = req.params;

    try {
        const deleteQuery = `
            DELETE FROM assignments
            WHERE id = $1
                RETURNING *
        `;

        const result = await pool.query(deleteQuery, [assignmentId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Assignment not found'
            });
        }

        res.json({
            success: true,
            message: 'Assignment deleted successfully'
        });
    } catch (error) {
        console.error('Delete assignment error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting assignment'
        });
    }
});

// Dashboard-Daten für angemeldeten Mitarbeiter
app.get('/api/dashboard/:mitarbeiterId', async (req, res) => {
    const { mitarbeiterId } = req.params;

    try {
        // Mitarbeiter-Informationen abrufen
        const mitarbeiterQuery = `
            SELECT benutzername, vorname, nachname
            FROM mitarbeiter
            WHERE id = $1
        `;
        const mitarbeiterResult = await pool.query(mitarbeiterQuery, [mitarbeiterId]);

        if (mitarbeiterResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Mitarbeiter not found'
            });
        }

        const mitarbeiter = mitarbeiterResult.rows[0];

        // Anzahl zugewiesener Patienten
        const patientsCountQuery = `
            SELECT COUNT(*) as patient_count
            FROM patient_zuweisung mp
            WHERE mp.mitarbeiter_id = $1
        `;
        const patientsCountResult = await pool.query(patientsCountQuery, [mitarbeiterId]);
        const patientCount = patientsCountResult.rows[0].patient_count;

        // Heutige Aufgaben aus der assignments-Tabelle
        const todaysAssignmentsQuery = `
            SELECT
                a.id as assignment_id,
                p.vorname || ' ' || p.nachname as patient_name,
                a.aufgabe,
                a.zeit,
                a.status
            FROM assignments a
                     JOIN patienten p ON a.patient_id = p.id
            WHERE a.mitarbeiter_id = $1
              AND DATE(a.created_at) = CURRENT_DATE
            ORDER BY a.zeit
        `;
        const assignmentsResult = await pool.query(todaysAssignmentsQuery, [mitarbeiterId]);

        // Anzahl abgeschlossener Aufgaben heute
        const completedCountQuery = `
            SELECT COUNT(*) as completed_count
            FROM assignments
            WHERE mitarbeiter_id = $1
              AND status = 'abgeschlossen'
              AND DATE(created_at) = CURRENT_DATE
        `;
        const completedResult = await pool.query(completedCountQuery, [mitarbeiterId]);
        const completedCount = completedResult.rows[0].completed_count;

        res.json({
            success: true,
            username: mitarbeiter.vorname || mitarbeiter.benutzername,
            activePatients: parseInt(patientCount),
            completedAssignments: parseInt(completedCount),
            todaysAssignments: assignmentsResult.rows.map(row => ({
                id: row.assignment_id,
                patient: row.patient_name,
                aufgabe: row.aufgabe,
                zeit: row.zeit,
                status: row.status
            }))
        });

    } catch (error) {
        console.error('Dashboard API error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error loading dashboard'
        });
    }
});

// Neue Aufgabe erstellen
app.post('/api/assignments', async (req, res) => {
    const { mitarbeiterId, patientId, aufgabe, zeit, status } = req.body;

    try {
        // Assignments-Tabelle erstellen falls sie nicht existiert
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS assignments (
                                                       id SERIAL PRIMARY KEY,
                                                       mitarbeiter_id INTEGER REFERENCES mitarbeiter(id),
                patient_id INTEGER REFERENCES patienten(id),
                aufgabe TEXT NOT NULL,
                zeit VARCHAR(5) NOT NULL,
                status VARCHAR(20) NOT NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
                )
        `;
        await pool.query(createTableQuery);

        // Neue Aufgabe einfügen
        const insertQuery = `
            INSERT INTO assignments (mitarbeiter_id, patient_id, aufgabe, zeit, status, created_at)
            VALUES ($1, $2, $3, $4, $5, NOW())
                RETURNING *
        `;

        const result = await pool.query(insertQuery, [mitarbeiterId, patientId, aufgabe, zeit, status]);

        res.json({
            success: true,
            message: 'Aufgabe erfolgreich gespeichert',
            assignment: result.rows[0]
        });

    } catch (error) {
        console.error('Assignment creation error:', error);
        res.status(500).json({
            success: false,
            message: 'Fehler beim Erstellen der Aufgabe: ' + error.message
        });
    }
});

// Alle aktiven Patienten für Zuweisungsformular
app.get('/api/patients', async (req, res) => {
    try {
        await pool.query('SET client_encoding TO UTF8');

        const query = `
            SELECT 
                id, 
                vorname, 
                nachname,
                standort,
                zimmer_nummer
            FROM patienten 
            WHERE status = 'active'
            ORDER BY nachname COLLATE "C", vorname COLLATE "C"
        `;

        const result = await pool.query(query);

        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.json(result.rows);

    } catch (error) {
        console.error('Patients API error:', error);
        res.status(500).json({
            success: false,
            message: 'Error loading patients'
        });
    }
});

// UTF-8 Encoding-Probleme reparieren
app.post('/api/admin/fix-encoding', async (req, res) => {
    try {
        await pool.query('SET client_encoding TO UTF8');

        // Häufige deutsche Zeichen-Encoding-Probleme beheben
        const fixes = [
            { from: 'Ã–', to: 'Ö' },
            { from: 'Ã¼', to: 'ü' },
            { from: 'Ã¤', to: 'ä' },
            { from: 'ÃŸ', to: 'ß' },
            { from: 'Ã„', to: 'Ä' },
            { from: 'Ãœ', to: 'Ü' }
        ];

        let totalFixed = 0;

        for (const fix of fixes) {
            // Patienten-Tabelle reparieren
            const patientResult = await pool.query(`
                UPDATE patienten 
                SET 
                    vorname = REPLACE(vorname, $1, $2),
                    nachname = REPLACE(nachname, $1, $2)
                WHERE vorname LIKE '%' || $1 || '%' OR nachname LIKE '%' || $1 || '%'
            `, [fix.from, fix.to]);

            // Mitarbeiter-Tabelle reparieren
            const mitarbeiterResult = await pool.query(`
                UPDATE mitarbeiter 
                SET 
                    vorname = REPLACE(vorname, $1, $2),
                    nachname = REPLACE(nachname, $1, $2),
                    benutzername = REPLACE(benutzername, $1, $2)
                WHERE vorname LIKE '%' || $1 || '%' 
                   OR nachname LIKE '%' || $1 || '%'
                   OR benutzername LIKE '%' || $1 || '%'
            `, [fix.from, fix.to]);

            totalFixed += (patientResult.rowCount || 0) + (mitarbeiterResult.rowCount || 0);
        }

        res.json({
            success: true,
            message: `UTF-8 Encoding repariert. ${totalFixed} Datensätze bearbeitet.`,
            fixedRecords: totalFixed
        });

    } catch (error) {
        console.error('Encoding fix error:', error);
        res.status(500).json({
            success: false,
            message: 'Fehler beim Reparieren der Zeichenkodierung: ' + error.message
        });
    }
});

// Patientensuche mit Teilstring-Matching
app.get('/api/patients/search', async (req, res) => {
    const { q } = req.query;

    if (!q || q.length < 2) {
        return res.json([]);
    }

    try {
        await pool.query('SET client_encoding TO UTF8');

        const searchQuery = `
            SELECT 
                id, 
                vorname, 
                nachname,
                standort,
                zimmer_nummer
            FROM patienten 
            WHERE (
                LOWER(vorname) LIKE LOWER($1) OR 
                LOWER(nachname) LIKE LOWER($1) OR 
                LOWER(vorname || ' ' || nachname) LIKE LOWER($1)
            )
            AND status = 'active'
            ORDER BY nachname, vorname
            LIMIT 20
        `;

        const searchTerm = `%${q}%`;
        const result = await pool.query(searchQuery, [searchTerm]);

        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.json(result.rows);

    } catch (error) {
        console.error('Patient search error:', error);
        res.status(500).json({
            success: false,
            message: 'Fehler bei der Patientensuche'
        });
    }
});

// Zugewiesene Patienten für spezifischen Mitarbeiter
app.get('/api/patients/assigned/:mitarbeiterId', async (req, res) => {
    const { mitarbeiterId } = req.params;

    try {
        const query = `
            SELECT p.id, p.vorname, p.nachname
            FROM patient_zuweisung pz
                     JOIN patienten p ON pz.patient_id = p.id
            WHERE pz.mitarbeiter_id = $1
            ORDER BY p.nachname, p.vorname
        `;
        const result = await pool.query(query, [mitarbeiterId]);

        res.json({
            success: true,
            patients: result.rows
        });
    } catch (error) {
        console.error('Assigned patients API error:', error);
        res.status(500).json({
            success: false,
            message: 'Error loading assigned patients'
        });
    }
});

// Patienten-Dashboard mit aktueller Position
app.get('/api/patient/dashboard/:patientId', async (req, res) => {
    const { patientId } = req.params;

    try {
        // Patienteninformationen einschließlich aktueller Standort
        const patientQuery = `
            SELECT id, benutzername, vorname, nachname, standort
            FROM patienten
            WHERE id = $1
        `;
        const patientResult = await pool.query(patientQuery, [patientId]);

        if (patientResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Patient nicht gefunden'
            });
        }

        const patient = patientResult.rows[0];

        // Zugewiesene Pflegekraft ermitteln
        const pflegekraftQuery = `
            SELECT m.vorname, m.nachname, m.benutzername
            FROM patient_zuweisung pz
            JOIN mitarbeiter m ON pz.mitarbeiter_id = m.id
            WHERE pz.patient_id = $1 AND pz.status = 'active'
        `;
        const pflegekraftResult = await pool.query(pflegekraftQuery, [patientId]);

        let assignedPflegekraft = 'Nicht zugewiesen';
        if (pflegekraftResult.rows.length > 0) {
            const pf = pflegekraftResult.rows[0];
            assignedPflegekraft = pf.vorname ? `${pf.vorname} ${pf.nachname}` : pf.benutzername;
        }

        // Heutige Aufgaben für diesen Patienten
        const todaysAssignmentsQuery = `
            SELECT
                a.id,
                a.aufgabe,
                a.zeit,
                a.status,
                a.created_at
            FROM assignments a
            WHERE a.patient_id = $1
            AND DATE(a.created_at) = CURRENT_DATE
            ORDER BY a.zeit
        `;
        const assignmentsResult = await pool.query(todaysAssignmentsQuery, [patientId]);

        res.json({
            success: true,
            username: patient.vorname || patient.benutzername,
            fullName: patient.vorname ? `${patient.vorname} ${patient.nachname}` : patient.benutzername,
            caregiver: assignedPflegekraft,
            currentLocation: patient.standort || 'Unbekannt',
            todaysAssignments: assignmentsResult.rows.map(row => ({
                id: row.id,
                aufgabe: row.aufgabe,
                zeit: row.zeit,
                status: row.status === 'abgeschlossen' ? 'Abgeschlossen' : 'Ausstehend'
            }))
        });

    } catch (error) {
        console.error('Patient Dashboard API error:', error);
        res.status(500).json({
            success: false,
            message: 'Serverfehler beim Laden des Dashboards'
        });
    }
});

// Neue Transfer-Anfrage erstellen
app.post('/api/patient/transfer-requests', async (req, res) => {
    const {
        patientId,
        currentStandort,
        requestedStandort,
        reason,
        prioritaet,
        requesterType,
        requesterId,
        requesterName
    } = req.body;

    try {
        // Validierung der Pflichtfelder
        const missingFields = [];

        if (!patientId) missingFields.push('Patient ID');
        if (!requestedStandort) missingFields.push('Gewünschter Standort');
        if (!reason || reason.trim().length === 0) missingFields.push('Grund');
        if (!requesterName) missingFields.push('Requester Name');

        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Fehlende Pflichtfelder: ${missingFields.join(', ')}`
            });
        }

        // Prüfen ob Patient existiert
        const patientCheck = await pool.query(
            'SELECT standort, vorname, nachname FROM patienten WHERE id = $1',
            [patientId]
        );

        if (patientCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Patient nicht gefunden'
            });
        }

        const actualCurrentStandort = patientCheck.rows[0].standort;

        // Prüfen ob gewünschter Standort unterschiedlich ist
        if (actualCurrentStandort === requestedStandort) {
            return res.status(400).json({
                success: false,
                message: 'Der gewünschte Standort ist bereits der aktuelle Standort'
            });
        }

        // Prüfen auf bereits existierende ausstehende Anfragen
        const existingRequestCheck = await pool.query(
            `SELECT id FROM transfer_requests 
             WHERE patient_id = $1 AND status = 'pending'`,
            [patientId]
        );

        if (existingRequestCheck.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Es existiert bereits eine ausstehende Anfrage für diesen Patienten'
            });
        }

        // Transfer-Anfrage erstellen
        const insertQuery = `
            INSERT INTO transfer_requests (
                patient_id,
                requester_type,
                requester_id,
                requester_name,
                current_standort,
                gewuenschter_standort,
                grund,
                prioritaet,
                status,
                erstellt_am
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', NOW())
                RETURNING *
        `;

        const result = await pool.query(insertQuery, [
            patientId,
            requesterType || 'patient',
            requesterId,
            requesterName,
            actualCurrentStandort,
            requestedStandort,
            reason.trim(),
            prioritaet || 'normal'
        ]);

        res.json({
            success: true,
            message: 'Transfer-Anfrage erfolgreich erstellt',
            request: result.rows[0]
        });

    } catch (error) {
        console.error('Transfer request creation error:', error);
        res.status(500).json({
            success: false,
            message: 'Serverfehler beim Erstellen der Transfer-Anfrage: ' + error.message
        });
    }
});

// Transfer-Anfragen für spezifischen Patienten abrufen
app.get('/api/patient/transfer-requests/:patientId', async (req, res) => {
    const { patientId } = req.params;

    try {
        const requestsQuery = `
            SELECT 
                tr.*,
                m.vorname || ' ' || m.nachname as admin_name
            FROM transfer_requests tr
            LEFT JOIN mitarbeiter m ON tr.admin_id = m.id
            WHERE tr.patient_id = $1
            ORDER BY tr.erstellt_am DESC
        `;

        const result = await pool.query(requestsQuery, [patientId]);

        res.json({
            success: true,
            requests: result.rows
        });

    } catch (error) {
        console.error('Transfer requests loading error:', error);
        res.status(500).json({
            success: false,
            message: 'Fehler beim Laden der Transfer-Anfragen'
        });
    }
});

// Transfer-Anfrage stornieren
app.delete('/api/patient/transfer-requests/:requestId', async (req, res) => {
    const { requestId } = req.params;
    const { patientId } = req.body;

    try {
        // Prüfen ob Anfrage existiert und zu Patient gehört
        const requestCheck = await pool.query(
            `SELECT status FROM transfer_requests 
             WHERE id = $1 AND patient_id = $2`,
            [requestId, patientId]
        );

        if (requestCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Transfer-Anfrage nicht gefunden'
            });
        }

        if (requestCheck.rows[0].status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Nur ausstehende Anfragen können storniert werden'
            });
        }

        // Status auf storniert setzen
        const updateQuery = `
            UPDATE transfer_requests
            SET status = 'cancelled', bearbeitet_am = NOW()
            WHERE id = $1
                RETURNING *
        `;

        const result = await pool.query(updateQuery, [requestId]);

        res.json({
            success: true,
            message: 'Transfer-Anfrage erfolgreich storniert',
            request: result.rows[0]
        });

    } catch (error) {
        console.error('Transfer request cancellation error:', error);
        res.status(500).json({
            success: false,
            message: 'Fehler beim Stornieren der Transfer-Anfrage'
        });
    }
});

// Alle ausstehenden Transfer-Anfragen für Admin
app.get('/api/admin/transfers/requests', async (req, res) => {
    try {
        const requestsQuery = `
            SELECT 
                tr.*,
                p.vorname || ' ' || p.nachname as patient_name,
                tr.requester_name
            FROM transfer_requests tr
            JOIN patienten p ON tr.patient_id = p.id
            WHERE tr.status = 'pending'
            ORDER BY 
                CASE tr.prioritaet 
                    WHEN 'urgent' THEN 1 
                    WHEN 'high' THEN 2 
                    WHEN 'normal' THEN 3 
                    ELSE 4 
                END,
                tr.erstellt_am ASC
        `;

        const result = await pool.query(requestsQuery);

        res.json({
            success: true,
            requests: result.rows
        });

    } catch (error) {
        console.error('Admin transfer requests error:', error);
        res.status(500).json({
            success: false,
            message: 'Fehler beim Laden der Transfer-Anfragen'
        });
    }
});

// Transfer-Anfrage ablehnen
app.post('/api/admin/transfers/requests/:requestId/reject', async (req, res) => {
    const { requestId } = req.params;
    const { adminId, rejectionReason } = req.body;

    try {
        // Anfrage-Details abrufen
        const requestQuery = `
            SELECT * FROM transfer_requests 
            WHERE id = $1 AND status = 'pending'
        `;
        const requestResult = await pool.query(requestQuery, [requestId]);

        if (requestResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Transfer-Anfrage nicht gefunden oder bereits bearbeitet'
            });
        }

        const request = requestResult.rows[0];

        // Anfrage-Status aktualisieren
        const updateRequestQuery = `
            UPDATE transfer_requests
            SET
                status = 'rejected',
                admin_response = $1,
                admin_id = $2,
                bearbeitet_am = NOW()
            WHERE id = $3
                RETURNING *
        `;
        const result = await pool.query(updateRequestQuery, [
            rejectionReason || 'Transfer-Anfrage abgelehnt',
            adminId,
            requestId
        ]);

        // Benachrichtigung für Patient erstellen
        const patientNotificationQuery = `
            INSERT INTO benachrichtigungen (
                patient_id,
                typ,
                titel,
                nachricht,
                prioritaet,
                erstellt_am
            )
            VALUES ($1, 'transfer_rejected', 'Transfer abgelehnt', $2, 'normal', NOW())
        `;
        const notificationMessage = `Ihr Transfer-Antrag von ${request.current_standort} nach ${request.gewuenschter_standort} wurde abgelehnt. Grund: ${rejectionReason || 'Nicht angegeben'}`;
        await pool.query(patientNotificationQuery, [request.patient_id, notificationMessage]);

        res.json({
            success: true,
            message: 'Transfer-Anfrage abgelehnt',
            request: result.rows[0]
        });

    } catch (error) {
        console.error('Transfer request rejection error:', error);
        res.status(500).json({
            success: false,
            message: 'Fehler bei der Ablehnung der Transfer-Anfrage: ' + error.message
        });
    }
});

// Transfer-Statistiken für Admin-Dashboard
app.get('/api/admin/transfers/statistics', async (req, res) => {
    try {
        const statsQuery = `
            SELECT 
                COUNT(*) as total_requests,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_requests,
                COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_requests,
                COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_requests,
                COUNT(CASE WHEN prioritaet = 'urgent' AND status = 'pending' THEN 1 END) as urgent_pending
            FROM transfer_requests
            WHERE erstellt_am >= NOW() - INTERVAL '30 days'
        `;

        const result = await pool.query(statsQuery);

        res.json({
            success: true,
            statistics: result.rows[0]
        });

    } catch (error) {
        console.error('Transfer request statistics error:', error);
        res.status(500).json({
            success: false,
            message: 'Fehler beim Laden der Transfer-Statistiken'
        });
    }
});

// Aufgaben-Historie für Patienten
app.get('/api/patient/assignments/history/:patientId', async (req, res) => {
    const { patientId } = req.params;
    const { days = 7 } = req.query;

    try {
        const historyQuery = `
            SELECT
                a.aufgabe,
                a.zeit,
                a.status,
                a.created_at,
                m.vorname || ' ' || m.nachname as pflegekraft_name
            FROM assignments a
                     JOIN mitarbeiter m ON a.mitarbeiter_id = m.id
            WHERE a.patient_id = $1
              AND a.created_at >= NOW() - INTERVAL '${days} days'
            ORDER BY a.created_at DESC
        `;

        const result = await pool.query(historyQuery, [patientId]);

        res.json({
            success: true,
            assignments: result.rows.map(row => ({
                aufgabe: row.aufgabe,
                zeit: row.zeit,
                status: row.status === 'abgeschlossen' ? 'Abgeschlossen' : 'Ausstehend',
                datum: row.created_at.toLocaleDateString('de-DE'),
                pflegekraft: row.pflegekraft_name
            }))
        });
    } catch (error) {
        console.error('Patient assignment history error:', error);
        res.status(500).json({
            success: false,
            message: 'Fehler beim Laden der Aufgaben-Historie'
        });
    }
});

// Patient-Dashboard Route
app.get('/patient/', (req, res) => {
    res.sendFile(path.join(__dirname, 'WEB SEITE', 'Patient', 'dashboard_patient.html'));
});

// Admin statische Dateien bereitstellen
app.use('/admin', express.static('WEB SEITE/Admin'));

// Admin-Dashboard Route
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'WEB SEITE', 'Admin', 'index.html'));
});

// Admin-Dashboard API - Standort- und Arbeitsbelastungsstatistiken
app.get('/api/admin/dashboard', async (req, res) => {
    try {
        // Patientenverteilung nach Standorten
        const patientLocationStats = await pool.query(`
            SELECT 
                COALESCE(p.standort, 'Unbekannt') as standort,
                COUNT(p.id) as total_patients,
                COUNT(CASE WHEN pz.status = 'active' THEN 1 END) as assigned_patients
            FROM patienten p
            LEFT JOIN patient_zuweisung pz ON p.id = pz.patient_id AND pz.status = 'active'
            WHERE p.status = 'active'
            GROUP BY p.standort
            ORDER BY p.standort
        `);

        // Pflegekraft-Statistiken nach Standort
        const pflegekraftLocationStats = await pool.query(`
            SELECT 
                COALESCE(m.standort, 'Unbekannt') as standort,
                COUNT(m.id) as total_pflegekraefte,
                ROUND(AVG(COALESCE(patient_counts.patient_count, 0)), 2) as avg_patients_per_pflegekraft
            FROM mitarbeiter m
            LEFT JOIN (
                SELECT mitarbeiter_id, COUNT(*) as patient_count
                FROM patient_zuweisung 
                WHERE status = 'active'
                GROUP BY mitarbeiter_id
            ) patient_counts ON m.id = patient_counts.mitarbeiter_id
            WHERE m.rolle = 'pflegekraft' AND m.status = 'active'
            GROUP BY m.standort
            ORDER BY m.standort
        `);

        // Aktuelle Transfers (letzte 7 Tage)
        const recentTransfers = await pool.query(`
            SELECT 
                sv.*,
                p.vorname || ' ' || p.nachname as patient_name
            FROM standort_verlauf sv
            JOIN patienten p ON sv.patient_id = p.id
            WHERE sv.geaendert_am >= NOW() - INTERVAL '7 days'
            ORDER BY sv.geaendert_am DESC
            LIMIT 5
        `);

        // Arbeitsbelastungs-Warnungen (Pflegekräfte mit >20 Patienten)
        const workloadAlerts = await pool.query(`
            SELECT 
                m.id,
                COALESCE(m.vorname || ' ' || m.nachname, m.benutzername) as pflegekraft_name,
                COALESCE(m.standort, 'Unbekannt') as standort,
                COUNT(pz.patient_id) as patient_count
            FROM mitarbeiter m
            LEFT JOIN patient_zuweisung pz ON m.id = pz.mitarbeiter_id AND pz.status = 'active'
            WHERE m.rolle = 'pflegekraft' AND m.status = 'active'
            GROUP BY m.id, m.vorname, m.nachname, m.benutzername, m.standort
            HAVING COUNT(pz.patient_id) > 20
            ORDER BY COUNT(pz.patient_id) DESC
        `);

        // Allgemeine Systemstatistiken
        const systemStats = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM patienten WHERE status = 'active') as total_active_patients,
                (SELECT COUNT(*) FROM mitarbeiter WHERE rolle = 'pflegekraft' AND status = 'active') as total_pflegekraefte,
                (SELECT COUNT(*) FROM patient_zuweisung WHERE status = 'active') as total_assignments
        `);

        res.json({
            success: true,
            dashboard: {
                location_statistics: {
                    patients: patientLocationStats.rows,
                    pflegekraefte: pflegekraftLocationStats.rows
                },
                recent_transfers: recentTransfers.rows,
                workload_alerts: workloadAlerts.rows,
                system_stats: systemStats.rows[0]
            }
        });

    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Error loading admin dashboard: ' + error.message
        });
    }
});

// Admin-initiierter Transfer mit automatischer Neuzuweisung
app.post('/api/admin/transfers', async (req, res) => {
    const { patientId, newLocation, reason, adminId } = req.body;

    try {
        await pool.query('BEGIN');

        // Aktuelle Patienteninformationen und Zuweisung abrufen
        const currentPatientQuery = `
            SELECT 
                p.id,
                p.standort as current_location, 
                p.vorname, 
                p.nachname,
                pz.id as assignment_id,
                pz.mitarbeiter_id as current_pflegekraft_id,
                m.vorname || ' ' || m.nachname as current_pflegekraft_name,
                m.standort as pflegekraft_location
            FROM patienten p
            LEFT JOIN patient_zuweisung pz ON p.id = pz.patient_id AND pz.status = 'active'
            LEFT JOIN mitarbeiter m ON pz.mitarbeiter_id = m.id
            WHERE p.id = $1
        `;
        const currentPatient = await pool.query(currentPatientQuery, [patientId]);

        if (currentPatient.rows.length === 0) {
            throw new Error('Patient nicht gefunden');
        }

        const patient = currentPatient.rows[0];
        const oldLocation = patient.current_location;

        if (oldLocation === newLocation) {
            throw new Error('Patient ist bereits am gewünschten Standort');
        }

        console.log(`Transfer: ${patient.vorname} ${patient.nachname}`);
        console.log(`Von: ${oldLocation} → Nach: ${newLocation}`);
        console.log(`Aktuelle Pflegekraft: ${patient.current_pflegekraft_name} (ID: ${patient.current_pflegekraft_id})`);

        // Schritt 1: Patientenstandort aktualisieren
        await pool.query('UPDATE patienten SET standort = $1 WHERE id = $2', [newLocation, patientId]);

        // Schritt 2: Transfer in standort_verlauf protokollieren
        await pool.query(
            'INSERT INTO standort_verlauf (patient_id, alter_standort, neuer_standort, grund, geaendert_von, geaendert_am) VALUES ($1, $2, $3, $4, $5, NOW())',
            [patientId, oldLocation, newLocation, reason, adminId]
        );

        // Schritt 3: Pflegekraft-Neuzuweisung verwalten
        let reassignmentMessage = '';

        if (patient.current_pflegekraft_id && patient.assignment_id) {
            // Patient hat aktuelle Zuweisung - Neuzuweisung prüfen

            console.log(`Aktuelle Zuweisung gefunden - prüfe Pflegekraft-Standort...`);

            // Prüfen ob aktuelle Pflegekraft auch am neuen Standort arbeitet
            if (patient.pflegekraft_location === newLocation) {
                // Gleiche Pflegekraft kann weiter betreuen - keine Neuzuweisung nötig
                reassignmentMessage = ` (Pflegekraft ${patient.current_pflegekraft_name} arbeitet bereits am Zielort - Zuweisung beibehalten)`;
                console.log(`Pflegekraft bleibt zugewiesen (gleicher Standort)`);
            } else {
                // Pflegekraft ist an anderem Standort - Neuzuweisung erforderlich
                console.log(`Pflegekraft ist an anderem Standort - suche neue Pflegekraft am Standort ${newLocation}...`);

                // Verfügbare Pflegekraft am neuen Standort finden
                const findNewPflegekraftQuery = `
                    SELECT 
                        m.id,
                        m.vorname || ' ' || m.nachname as name,
                        COUNT(pz.patient_id) as current_patients
                    FROM mitarbeiter m
                    LEFT JOIN patient_zuweisung pz ON m.id = pz.mitarbeiter_id AND pz.status = 'active'
                    WHERE m.rolle = 'pflegekraft' 
                      AND m.status = 'active'
                      AND m.standort = $1
                    GROUP BY m.id, m.vorname, m.nachname
                    HAVING COUNT(pz.patient_id) < 24
                    ORDER BY COUNT(pz.patient_id) ASC, m.id ASC
                    LIMIT 1
                `;

                const newPflegekraftResult = await pool.query(findNewPflegekraftQuery, [newLocation]);

                if (newPflegekraftResult.rows.length > 0) {
                    // Verfügbare Pflegekraft am neuen Standort gefunden
                    const newPflegekraft = newPflegekraftResult.rows[0];
                    console.log(`Neue Pflegekraft gefunden: ${newPflegekraft.name} (ID: ${newPflegekraft.id}, ${newPflegekraft.current_patients}/24 Patienten)`);

                    // Bestehende Zuweisung aktualisieren
                    const updateResult = await pool.query(
                        'UPDATE patient_zuweisung SET mitarbeiter_id = $1, zuweisung_datum = NOW(), updated_at = NOW() WHERE id = $2 RETURNING *',
                        [newPflegekraft.id, patient.assignment_id]
                    );

                    console.log(`Assignment updated:`, updateResult.rows[0]);

                    reassignmentMessage = ` und neuer Pflegekraft ${newPflegekraft.name} zugewiesen`;

                    // Neue Pflegekraft benachrichtigen
                    await pool.query(
                        'INSERT INTO benachrichtigungen (patient_id, mitarbeiter_id, typ, titel, nachricht, prioritaet, erstellt_am) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
                        [patientId, newPflegekraft.id, 'new_patient_assignment', 'Neuer Patient zugewiesen', `${patient.vorname} ${patient.nachname} wurde Ihnen durch Transfer von ${oldLocation} zugewiesen.`, 'normal']
                    );

                    // Alte Pflegekraft benachrichtigen
                    await pool.query(
                        'INSERT INTO benachrichtigungen (patient_id, mitarbeiter_id, typ, titel, nachricht, prioritaet, erstellt_am) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
                        [patientId, patient.current_pflegekraft_id, 'patient_transferred', 'Patient verlegt', `${patient.vorname} ${patient.nachname} wurde nach ${newLocation} verlegt und einer anderen Pflegekraft zugewiesen.`, 'normal']
                    );

                } else {
                    // Keine verfügbare Pflegekraft am neuen Standort - als nicht zugewiesen markieren
                    console.log(`Keine verfügbare Pflegekraft am Standort ${newLocation}`);

                    const deactivateResult = await pool.query(
                        'UPDATE patient_zuweisung SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
                        ['unassigned', patient.assignment_id]
                    );

                    console.log(`Assignment deactivated:`, deactivateResult.rows[0]);

                    reassignmentMessage = ` (⚠️ Keine verfügbare Pflegekraft am Zielort - Patient vorübergehend ohne Zuweisung)`;

                    // Alte Pflegekraft benachrichtigen
                    await pool.query(
                        'INSERT INTO benachrichtigungen (patient_id, mitarbeiter_id, typ, titel, nachricht, prioritaet, erstellt_am) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
                        [patientId, patient.current_pflegekraft_id, 'patient_transferred', 'Patient verlegt', `${patient.vorname} ${patient.nachname} wurde nach ${newLocation} verlegt. Keine Pflegekraft verfügbar am Zielort.`, 'high']
                    );

                    // Administratoren warnen
                    await pool.query(
                        'INSERT INTO benachrichtigungen (patient_id, typ, titel, nachricht, prioritaet, erstellt_am) VALUES ($1, $2, $3, $4, $5, NOW())',
                        [patientId, 'admin_alert', 'Patient ohne Pflegekraft', `Patient ${patient.vorname} ${patient.nachname} wurde nach ${newLocation} verlegt, aber keine Pflegekraft verfügbar. Manuelle Zuweisung erforderlich.`, 'high']
                    );
                }
            }
        } else {
            // Patient hatte keine Zuweisung - versuche Zuweisung am neuen Standort
            console.log(`Patient hatte keine Zuweisung - suche Pflegekraft am neuen Standort...`);

            const findPflegekraftQuery = `
                SELECT 
                    m.id,
                    m.vorname || ' ' || m.nachname as name,
                    COUNT(pz.patient_id) as current_patients
                FROM mitarbeiter m
                LEFT JOIN patient_zuweisung pz ON m.id = pz.mitarbeiter_id AND pz.status = 'active'
                WHERE m.rolle = 'pflegekraft' 
                  AND m.status = 'active'
                  AND m.standort = $1
                GROUP BY m.id, m.vorname, m.nachname
                HAVING COUNT(pz.patient_id) < 24
                ORDER BY COUNT(pz.patient_id) ASC, m.id ASC
                LIMIT 1
            `;

            const pflegekraftResult = await pool.query(findPflegekraftQuery, [newLocation]);

            if (pflegekraftResult.rows.length > 0) {
                const pflegekraft = pflegekraftResult.rows[0];
                console.log(`Pflegekraft für unassigned Patient gefunden: ${pflegekraft.name}`);

                // Neue Zuweisung erstellen
                const createResult = await pool.query(
                    'INSERT INTO patient_zuweisung (patient_id, mitarbeiter_id, status, zuweisung_datum) VALUES ($1, $2, $3, NOW()) ON CONFLICT (patient_id) DO UPDATE SET mitarbeiter_id = EXCLUDED.mitarbeiter_id, zuweisung_datum = EXCLUDED.zuweisung_datum, status = EXCLUDED.status, updated_at = NOW() RETURNING *',
                    [patientId, pflegekraft.id, 'active']
                );

                console.log(`New assignment created:`, createResult.rows[0]);

                reassignmentMessage = ` und Pflegekraft ${pflegekraft.name} zugewiesen`;

                // Neue Pflegekraft benachrichtigen
                await pool.query(
                    'INSERT INTO benachrichtigungen (patient_id, mitarbeiter_id, typ, titel, nachricht, prioritaet, erstellt_am) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
                    [patientId, pflegekraft.id, 'new_patient_assignment', 'Neuer Patient zugewiesen', `${patient.vorname} ${patient.nachname} wurde Ihnen durch Transfer zugewiesen.`, 'normal']
                );
            } else {
                console.log(`Keine Pflegekraft verfügbar für unassigned Patient`);
                reassignmentMessage = ` (⚠️ Keine Pflegekraft verfügbar am Zielort)`;
            }
        }

        // Endgültigen Zustand überprüfen
        const verifyQuery = `
            SELECT 
                p.standort,
                pz.mitarbeiter_id,
                pz.status,
                m.vorname || ' ' || m.nachname as pflegekraft_name
            FROM patienten p
            LEFT JOIN patient_zuweisung pz ON p.id = pz.patient_id AND pz.status = 'active'
            LEFT JOIN mitarbeiter m ON pz.mitarbeiter_id = m.id
            WHERE p.id = $1
        `;
        const finalState = await pool.query(verifyQuery, [patientId]);
        console.log(`Final state:`, finalState.rows[0]);

        await pool.query('COMMIT');
        console.log(`Transfer abgeschlossen: ${patient.vorname} ${patient.nachname}${reassignmentMessage}`);

        res.json({
            success: true,
            message: `Patient erfolgreich von ${oldLocation} nach ${newLocation} verlegt${reassignmentMessage}`,
            finalState: finalState.rows[0]
        });

    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Transfer Fehler:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Fehler beim Transfer'
        });
    }
});

// Debug-Endpunkt zum Überprüfen des aktuellen Patientenstatus
app.get('/api/debug/patient/:patientId', async (req, res) => {
    const { patientId } = req.params;

    try {
        const debugQuery = `
            SELECT 
                p.id as patient_id,
                p.vorname,
                p.nachname,
                p.standort as patient_standort,
                pz.id as assignment_id,
                pz.mitarbeiter_id,
                pz.status as assignment_status,
                pz.zuweisung_datum,
                m.vorname || ' ' || m.nachname as pflegekraft_name,
                m.standort as pflegekraft_standort
            FROM patienten p
            LEFT JOIN patient_zuweisung pz ON p.id = pz.patient_id
            LEFT JOIN mitarbeiter m ON pz.mitarbeiter_id = m.id
            WHERE p.id = $1
            ORDER BY pz.zuweisung_datum DESC
        `;

        const result = await pool.query(debugQuery, [patientId]);

        res.json({
            success: true,
            patient_info: result.rows
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Transfer-Anfrage genehmigen
app.post('/api/admin/transfers/requests/:requestId/approve', async (req, res) => {
    const { requestId } = req.params;
    const { adminId, adminResponse } = req.body;

    try {
        await pool.query('BEGIN');

        // Anfrage-Details abrufen
        const requestResult = await pool.query('SELECT * FROM transfer_requests WHERE id = $1 AND status = $2', [requestId, 'pending']);

        if (requestResult.rows.length === 0) {
            await pool.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: 'Transfer-Anfrage nicht gefunden oder bereits bearbeitet'
            });
        }

        const request = requestResult.rows[0];

        // Patienteninformationen und aktuelle Zuweisung abrufen
        const patientInfo = await pool.query(`
            SELECT 
                p.vorname, p.nachname, 
                pz.mitarbeiter_id, 
                m.vorname || ' ' || m.nachname as current_pflegekraft_name,
                m.standort as pflegekraft_location
            FROM patienten p 
            LEFT JOIN patient_zuweisung pz ON p.id = pz.patient_id AND pz.status = $1 
            LEFT JOIN mitarbeiter m ON pz.mitarbeiter_id = m.id 
            WHERE p.id = $2
        `, ['active', request.patient_id]);

        const patient = patientInfo.rows[0];

        console.log(`Genehmige Transfer-Antrag: ${patient.vorname} ${patient.nachname} → ${request.gewuenschter_standort}`);

        // Patientenstandort aktualisieren
        await pool.query('UPDATE patienten SET standort = $1 WHERE id = $2', [request.gewuenschter_standort, request.patient_id]);

        // Transfer protokollieren
        await pool.query(
            'INSERT INTO standort_verlauf (patient_id, alter_standort, neuer_standort, grund, geaendert_von, geaendert_am) VALUES ($1, $2, $3, $4, $5, NOW())',
            [request.patient_id, request.current_standort, request.gewuenschter_standort, `Genehmigter Transfer-Antrag: ${request.grund}`, adminId]
        );

        // Neuzuweisung verwalten (gleiche Logik wie Admin-Transfer)
        let reassignmentMessage = '';

        if (patient.mitarbeiter_id) {
            // Prüfen ob aktuelle Pflegekraft auch am neuen Standort arbeitet
            if (patient.pflegekraft_location === request.gewuenschter_standort) {
                reassignmentMessage = ` (Pflegekraft ${patient.current_pflegekraft_name} arbeitet bereits am Zielort)`;
            } else {
                // Neue Pflegekraft am Zielort finden
                const newPflegekraftResult = await pool.query(`
                    SELECT 
                        m.id,
                        m.vorname || ' ' || m.nachname as name,
                        COUNT(pz.patient_id) as current_patients
                    FROM mitarbeiter m
                    LEFT JOIN patient_zuweisung pz ON m.id = pz.mitarbeiter_id AND pz.status = 'active'
                    WHERE m.rolle = 'pflegekraft' 
                      AND m.status = 'active'
                      AND m.standort = $1
                    GROUP BY m.id, m.vorname, m.nachname
                    HAVING COUNT(pz.patient_id) < 24
                    ORDER BY COUNT(pz.patient_id) ASC, m.id ASC
                    LIMIT 1
                `, [request.gewuenschter_standort]);

                if (newPflegekraftResult.rows.length > 0) {
                    const newPflegekraft = newPflegekraftResult.rows[0];

                    // Zuweisung aktualisieren
                    await pool.query(
                        'UPDATE patient_zuweisung SET mitarbeiter_id = $1, zuweisung_datum = NOW(), updated_at = NOW() WHERE patient_id = $2 AND status = $3',
                        [newPflegekraft.id, request.patient_id, 'active']
                    );

                    reassignmentMessage = ` und neuer Pflegekraft ${newPflegekraft.name} zugewiesen`;

                    // Neue Pflegekraft benachrichtigen
                    await pool.query(
                        'INSERT INTO benachrichtigungen (patient_id, mitarbeiter_id, typ, titel, nachricht, prioritaet, erstellt_am) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
                        [request.patient_id, newPflegekraft.id, 'new_patient_assignment', 'Neuer Patient zugewiesen', `${patient.vorname} ${patient.nachname} wurde Ihnen durch genehmigten Transfer zugewiesen.`, 'normal']
                    );

                    // Alte Pflegekraft benachrichtigen
                    await pool.query(
                        'INSERT INTO benachrichtigungen (patient_id, mitarbeiter_id, typ, titel, nachricht, prioritaet, erstellt_am) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
                        [request.patient_id, patient.mitarbeiter_id, 'patient_transferred', 'Patient verlegt', `${patient.vorname} ${patient.nachname} wurde nach ${request.gewuenschter_standort} verlegt.`, 'normal']
                    );
                } else {
                    // Keine Pflegekraft verfügbar
                    await pool.query(
                        'UPDATE patient_zuweisung SET status = $1, updated_at = NOW() WHERE patient_id = $2 AND status = $3',
                        ['unassigned', request.patient_id, 'active']
                    );
                    reassignmentMessage = ` (⚠️ Keine Pflegekraft verfügbar am Zielort)`;
                }
            }
        }

        // Anfrage-Status aktualisieren
        const finalResponse = (adminResponse || 'Transfer-Anfrage genehmigt und durchgeführt') + reassignmentMessage;
        const updateResult = await pool.query(
            'UPDATE transfer_requests SET status = $1, admin_response = $2, admin_id = $3, bearbeitet_am = NOW() WHERE id = $4 RETURNING *',
            ['approved', finalResponse, adminId, requestId]
        );

        // Patient über Genehmigung benachrichtigen
        await pool.query(
            'INSERT INTO benachrichtigungen (patient_id, typ, titel, nachricht, prioritaet, erstellt_am) VALUES ($1, $2, $3, $4, $5, NOW())',
            [request.patient_id, 'transfer_approved', 'Transfer genehmigt', `Ihr Transfer-Antrag von ${request.current_standort} nach ${request.gewuenschter_standort} wurde genehmigt und durchgeführt.${reassignmentMessage}`, 'normal']
        );

        await pool.query('COMMIT');
        console.log(`Transfer-Antrag genehmigt: ${patient.vorname} ${patient.nachname}`);

        res.json({
            success: true,
            message: 'Transfer-Anfrage genehmigt und durchgeführt' + reassignmentMessage,
            request: updateResult.rows[0]
        });

    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Transfer-Antrag Genehmigungsfehler:', error);
        res.status(500).json({
            success: false,
            message: 'Fehler bei der Genehmigung der Transfer-Anfrage: ' + error.message
        });
    }
});

// Debug-Endpunkte zur Überprüfung der Datenbankeinträge

// Alle Patientenzuweisungen anzeigen
app.get('/api/debug/all-assignments', async (req, res) => {
    try {
        const query = `
            SELECT 
                p.id as patient_id,
                p.vorname,
                p.nachname,
                p.standort as patient_location,
                pz.id as assignment_id,
                pz.mitarbeiter_id,
                pz.status,
                m.vorname || ' ' || m.nachname as pflegekraft_name,
                m.standort as pflegekraft_location
            FROM patienten p
            LEFT JOIN patient_zuweisung pz ON p.id = pz.patient_id 
            LEFT JOIN mitarbeiter m ON pz.mitarbeiter_id = m.id
            ORDER BY p.id
        `;

        const result = await pool.query(query);
        res.json({ assignments: result.rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Pflegekraft-Arbeitsbelastung anzeigen
app.get('/api/debug/pflegekraft-workload', async (req, res) => {
    try {
        const query = `
            SELECT 
                m.id,
                m.vorname || ' ' || m.nachname as name,
                m.standort,
                m.status,
                COUNT(pz.patient_id) as current_patients
            FROM mitarbeiter m
            LEFT JOIN patient_zuweisung pz ON m.id = pz.mitarbeiter_id AND pz.status = 'active'
            WHERE m.rolle = 'pflegekraft'
            GROUP BY m.id, m.vorname, m.nachname, m.standort, m.status
            ORDER BY m.standort, current_patients
        `;

        const result = await pool.query(query);
        res.json({ pflegekraefte: result.rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Hilfsfunktion: Verfügbare Pflegekraft am Standort finden
async function findAvailablePflegekraftAtLocation(location) {
    const query = `
        SELECT 
            m.id,
            m.vorname || ' ' || m.nachname as name,
            m.benutzername,
            COUNT(pz.patient_id) as current_patients
        FROM mitarbeiter m
        LEFT JOIN patient_zuweisung pz ON m.id = pz.mitarbeiter_id AND pz.status = 'active'
        WHERE m.rolle = 'pflegekraft' 
          AND m.status = 'active'
          AND m.standort = $1
        GROUP BY m.id, m.vorname, m.nachname, m.benutzername
        HAVING COUNT(pz.patient_id) < 24
        ORDER BY COUNT(pz.patient_id) ASC, m.id ASC
        LIMIT 1
    `;

    const result = await pool.query(query, [location]);
    return result.rows.length > 0 ? result.rows[0] : null;
}

// Kritische Gesundheitsdaten überwachen und Alarme senden
async function checkCriticalHealthData(patientId, gesundheitsdatenId) {
    try {
        // Kritische Gesundheitsdaten mit Patienten- und Zuweisungsinformationen abrufen
        const criticalDataQuery = `
            SELECT 
                g.id,
                g.patient_id,
                g.blutdruck_systolisch,
                g.blutdruck_diastolisch,
                g.puls,
                g.temperatur,
                g.sauerstoffsaettigung,
                g.ist_kritisch,
                g.bemerkungen,
                p.vorname || ' ' || p.nachname as patient_name,
                p.standort,
                p.zimmer_nummer,
                pz.mitarbeiter_id as assigned_pflegekraft_id,
                m.vorname || ' ' || m.nachname as pflegekraft_name,
                m.telefon as pflegekraft_telefon
            FROM gesundheitsdaten g
            JOIN patienten p ON g.patient_id = p.id
            LEFT JOIN patient_zuweisung pz ON p.id = pz.patient_id AND pz.status = 'active'
            LEFT JOIN mitarbeiter m ON pz.mitarbeiter_id = m.id
            WHERE g.id = $1 AND g.ist_kritisch = true
        `;

        const result = await pool.query(criticalDataQuery, [gesundheitsdatenId]);

        if (result.rows.length === 0) {
            return;
        }

        const criticalData = result.rows[0];
        console.log(`CRITICAL ALERT: ${criticalData.patient_name} - Room ${criticalData.zimmer_nummer}`);

        // Alarm-Nachricht generieren
        const alertMessage = generateCriticalAlertMessage(criticalData);

        // Alarme an relevante Personen senden
        await sendCriticalAlerts(criticalData, alertMessage);

    } catch (error) {
        console.error('Critical health data check error:', error);
    }
}

// Kritische Alarm-Nachricht generieren
function generateCriticalAlertMessage(data) {
    const criticalValues = [];

    if (data.blutdruck_systolisch > 180 || data.blutdruck_systolisch < 90) {
        criticalValues.push(`Blutdruck: ${data.blutdruck_systolisch}/${data.blutdruck_diastolisch}`);
    }
    if (data.puls > 120 || data.puls < 50) {
        criticalValues.push(`Puls: ${data.puls}`);
    }
    if (data.temperatur > 39 || data.temperatur < 35) {
        criticalValues.push(`Temperatur: ${data.temperatur}°C`);
    }
    if (data.sauerstoffsaettigung < 90) {
        criticalValues.push(`O2-Sättigung: ${data.sauerstoffsaettigung}%`);
    }

    return `🚨 KRITISCHER ZUSTAND: ${data.patient_name} (Zimmer ${data.zimmer_nummer})
Kritische Werte: ${criticalValues.join(', ')}
${data.bemerkungen ? 'Bemerkung: ' + data.bemerkungen : ''}
Sofortige Aufmerksamkeit erforderlich!`;
}

// Kritische Alarme an relevante Personen senden
async function sendCriticalAlerts(criticalData, alertMessage) {
    const alerts = [];

    // Priorität 1: Zugewiesene Pflegekraft
    if (criticalData.assigned_pflegekraft_id) {
        alerts.push({
            patient_id: criticalData.patient_id,
            mitarbeiter_id: criticalData.assigned_pflegekraft_id,
            typ: 'critical_health_alert',
            titel: '🚨 KRITISCHER GESUNDHEITSZUSTAND',
            nachricht: alertMessage,
            prioritaet: 'urgent'
        });
    }

    // Priorität 1: Alle Administratoren
    const adminQuery = `
        SELECT id FROM mitarbeiter 
        WHERE rolle = 'administrator' AND status = 'active'
    `;
    const admins = await pool.query(adminQuery);

    admins.rows.forEach(admin => {
        alerts.push({
            patient_id: criticalData.patient_id,
            mitarbeiter_id: admin.id,
            typ: 'critical_health_alert',
            titel: '🚨 KRITISCHER GESUNDHEITSZUSTAND',
            nachricht: alertMessage,
            prioritaet: 'urgent'
        });
    });

    // Priorität 2: Andere Pflegekräfte am gleichen Standort (falls keine zugewiesene Pflegekraft)
    if (!criticalData.assigned_pflegekraft_id) {
        const locationPflegekraftQuery = `
            SELECT id FROM mitarbeiter 
            WHERE rolle = 'pflegekraft' 
              AND status = 'active'
              AND standort = $1
            LIMIT 3
        `;
        const locationPflegekraefte = await pool.query(locationPflegekraftQuery, [criticalData.standort]);

        locationPflegekraefte.rows.forEach(pf => {
            alerts.push({
                patient_id: criticalData.patient_id,
                mitarbeiter_id: pf.id,
                typ: 'critical_health_alert',
                titel: '🚨 UNASSIGNED PATIENT - KRITISCH',
                nachricht: `${alertMessage}\n\n⚠️ Patient hat keine zugewiesene Pflegekraft!`,
                prioritaet: 'urgent'
            });
        });
    }

    // Alle Alarme in Datenbank einfügen
    for (const alert of alerts) {
        await pool.query(
            'INSERT INTO benachrichtigungen (patient_id, mitarbeiter_id, typ, titel, nachricht, prioritaet, erstellt_am) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
            [alert.patient_id, alert.mitarbeiter_id, alert.typ, alert.titel, alert.nachricht, alert.prioritaet]
        );
    }

    console.log(`Sent ${alerts.length} critical health alerts`);
}

// Pflegekraft-Verfügbarkeit an Standort prüfen
app.get('/api/admin/pflegekraft-availability/:location', async (req, res) => {
    const { location } = req.params;

    try {
        const availabilityQuery = `
            SELECT 
                m.id,
                m.vorname || ' ' || m.nachname as name,
                COUNT(pz.patient_id) as current_patients,
                (24 - COUNT(pz.patient_id)) as available_slots
            FROM mitarbeiter m
            LEFT JOIN patient_zuweisung pz ON m.id = pz.mitarbeiter_id AND pz.status = 'active'
            WHERE m.rolle = 'pflegekraft' 
              AND m.status = 'active'
              AND m.standort = $1
            GROUP BY m.id, m.vorname, m.nachname
            ORDER BY current_patients ASC
        `;

        const result = await pool.query(availabilityQuery, [location]);

        res.json({
            success: true,
            location: location,
            pflegekraefte: result.rows,
            totalAvailable: result.rows.filter(pf => pf.current_patients < 24).length
        });

    } catch (error) {
        console.error('Availability check error:', error);
        res.status(500).json({
            success: false,
            message: 'Fehler beim Prüfen der Verfügbarkeit'
        });
    }
});

// Aktuelle Transfers abrufen
app.get('/api/admin/transfers/recent', async (req, res) => {
    try {
        const recentTransfersQuery = `
            SELECT 
                sv.*,
                p.vorname || ' ' || p.nachname as patient_name,
                m.vorname || ' ' || m.nachname as admin_name
            FROM standort_verlauf sv
            JOIN patienten p ON sv.patient_id = p.id
            LEFT JOIN mitarbeiter m ON sv.geaendert_von = m.id
            ORDER BY sv.geaendert_am DESC
            LIMIT 10
        `;

        const result = await pool.query(recentTransfersQuery);

        res.json({
            success: true,
            transfers: result.rows
        });

    } catch (error) {
        console.error('Recent transfers error:', error);
        res.status(500).json({
            success: false,
            message: 'Fehler beim Laden der Transfer-Historie'
        });
    }
});

// Detaillierte Statistiken für Admin
app.get('/api/admin/statistics/detailed', async (req, res) => {
    try {
        // Standort-Statistiken mit mehr Details
        const locationStatsQuery = `
            SELECT 
                p.standort,
                COUNT(p.id) as patient_count,
                COUNT(CASE WHEN p.status = 'active' THEN 1 END) as active_patients,
                COUNT(CASE WHEN p.status = 'discharged' THEN 1 END) as discharged_patients
            FROM patienten p
            GROUP BY p.standort
            ORDER BY p.standort
        `;

        // Pflegekraft-Arbeitsbelastungsstatistiken
        const workloadStatsQuery = `
            SELECT 
                m.id,
                m.vorname || ' ' || m.nachname as pflegekraft_name,
                m.standort,
                COUNT(pz.patient_id) as patient_count,
                ROUND((COUNT(pz.patient_id)::decimal / 24) * 100, 1) as utilization_percentage
            FROM mitarbeiter m
            LEFT JOIN patient_zuweisung pz ON m.id = pz.mitarbeiter_id AND pz.status = 'active'
            WHERE m.rolle = 'pflegekraft' AND m.status = 'active'
            GROUP BY m.id, m.vorname, m.nachname, m.standort
            ORDER BY patient_count DESC
        `;

        const [locationResult, workloadResult] = await Promise.all([
            pool.query(locationStatsQuery),
            pool.query(workloadStatsQuery)
        ]);

        res.json({
            success: true,
            statistics: {
                locations: locationResult.rows,
                workload: workloadResult.rows
            }
        });

    } catch (error) {
        console.error('Detailed statistics error:', error);
        res.status(500).json({
            success: false,
            message: 'Fehler beim Laden der detaillierten Statistiken'
        });
    }
});

// Alle Patienten für Admin-Verwaltung
app.get('/api/admin/patients', async (req, res) => {
    try {
        const patientsQuery = `
            SELECT 
                p.id,
                p.vorname,
                p.nachname,
                p.geburtsdatum,
                p.standort,
                p.zimmer_nummer,
                p.status,
                p.aufnahmedatum,
                COALESCE(m.vorname || ' ' || m.nachname, 'Nicht zugewiesen') as assigned_pflegekraft
            FROM patienten p
            LEFT JOIN patient_zuweisung pz ON p.id = pz.patient_id AND pz.status = 'active'
            LEFT JOIN mitarbeiter m ON pz.mitarbeiter_id = m.id
            ORDER BY p.nachname, p.vorname
        `;

        const result = await pool.query(patientsQuery);

        res.json({
            success: true,
            patients: result.rows
        });

    } catch (error) {
        console.error('Admin patients error:', error);
        res.status(500).json({
            success: false,
            message: 'Error loading patients list'
        });
    }
});

// Aktueller Patientenstandort für Admin-Transfer-Formular
app.get('/api/patients/:patientId/location', async (req, res) => {
    const { patientId } = req.params;

    try {
        const query = `
            SELECT standort
            FROM patienten 
            WHERE id = $1
        `;

        const result = await pool.query(query, [patientId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Patient not found'
            });
        }

        res.json({
            success: true,
            currentLocation: result.rows[0].standort || 'Unbekannt'
        });

    } catch (error) {
        console.error('Patient location API error:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting patient location'
        });
    }
});

// Alle Pflegekräfte für Admin-Verwaltung
app.get('/api/admin/pflegekraefte', async (req, res) => {
    try {
        const pflegekraftQuery = `
            SELECT 
                m.id,
                m.vorname,
                m.nachname,
                m.benutzername,
                m.standort,
                m.rolle,
                m.status,
                COUNT(pz.patient_id) as assigned_patients
            FROM mitarbeiter m
            LEFT JOIN patient_zuweisung pz ON m.id = pz.mitarbeiter_id AND pz.status = 'active'
            WHERE m.rolle = 'pflegekraft'
            GROUP BY m.id, m.vorname, m.nachname, m.benutzername, m.standort, m.rolle, m.status
            ORDER BY m.nachname, m.vorname
        `;

        const result = await pool.query(pflegekraftQuery);

        res.json({
            success: true,
            pflegekraefte: result.rows
        });

    } catch (error) {
        console.error('Admin pflegekraefte error:', error);
        res.status(500).json({
            success: false,
            message: 'Error loading pflegekraefte list'
        });
    }
});

// Zuweisungsübersicht für Admin
app.get('/api/admin/assignments/overview', async (req, res) => {
    try {
        const assignmentsQuery = `
            SELECT 
                pz.id,
                p.vorname || ' ' || p.nachname as patient_name,
                p.standort as patient_standort,
                m.vorname || ' ' || m.nachname as pflegekraft_name,
                m.standort as pflegekraft_standort,
                pz.assigned_at,
                pz.status
            FROM patient_zuweisung pz
            JOIN patienten p ON pz.patient_id = p.id
            JOIN mitarbeiter m ON pz.mitarbeiter_id = m.id
            WHERE pz.status = 'active'
            ORDER BY pz.assigned_at DESC
        `;

        const result = await pool.query(assignmentsQuery);

        res.json({
            success: true,
            assignments: result.rows
        });

    } catch (error) {
        console.error('Assignment overview error:', error);
        res.status(500).json({
            success: false,
            message: 'Error loading assignment overview'
        });
    }
});

// Manuelle Patientenzuweisung
app.post('/api/admin/assignments/manual', async (req, res) => {
    const { patientId, pflegekraftId, adminId } = req.body;

    try {
        // Prüfen ob Patient bereits zugewiesen ist
        const existingQuery = `
            SELECT * FROM patient_zuweisung
            WHERE patient_id = $1 AND status = 'active'
        `;
        const existing = await pool.query(existingQuery, [patientId]);

        if (existing.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Patient ist bereits zugewiesen'
            });
        }

        // Pflegekraft-Kapazität prüfen
        const capacityQuery = `
            SELECT COUNT(*) as current_patients
            FROM patient_zuweisung
            WHERE mitarbeiter_id = $1 AND status = 'active'
        `;
        const capacity = await pool.query(capacityQuery, [pflegekraftId]);

        if (parseInt(capacity.rows[0].current_patients) >= 24) {
            return res.status(400).json({
                success: false,
                message: 'Pflegekraft hat bereits maximale Anzahl von Patienten (24)'
            });
        }

        // Zuweisung erstellen
        const assignQuery = `
            INSERT INTO patient_zuweisung (patient_id, mitarbeiter_id, status, assigned_at)
            VALUES ($1, $2, 'active', NOW())
            RETURNING *
        `;

        const result = await pool.query(assignQuery, [patientId, pflegekraftId]);

        res.json({
            success: true,
            message: 'Patient erfolgreich zugewiesen',
            assignment: result.rows[0]
        });

    } catch (error) {
        console.error('Manual assignment error:', error);
        res.status(500).json({
            success: false,
            message: 'Fehler bei der Zuweisung: ' + error.message
        });
    }
});

// Zuweisung entfernen
app.delete('/api/admin/assignments/:assignmentId', async (req, res) => {
    const { assignmentId } = req.params;
    const { reason = 'Admin removal' } = req.body;

    try {
        // Zuweisungsstatus aktualisieren
        const updateQuery = `
            UPDATE patient_zuweisung 
            SET status = $1, updated_at = NOW()
            WHERE id = $2
            RETURNING *
        `;

        const result = await pool.query(updateQuery, [reason, assignmentId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Zuweisung nicht gefunden'
            });
        }

        res.json({
            success: true,
            message: 'Zuweisung erfolgreich entfernt'
        });

    } catch (error) {
        console.error('Assignment removal error:', error);
        res.status(500).json({
            success: false,
            message: 'Fehler beim Entfernen der Zuweisung'
        });
    }
});

// System-Benachrichtigungen für Admin
app.get('/api/admin/notifications', async (req, res) => {
    try {
        const notificationsQuery = `
            SELECT
                b.*,
                p.vorname || ' ' || p.nachname as patient_name,
                m.vorname || ' ' || m.nachname as mitarbeiter_name
            FROM benachrichtigungen b
                     LEFT JOIN patienten p ON b.patient_id = p.id
                     LEFT JOIN mitarbeiter m ON b.mitarbeiter_id = m.id
            WHERE b.erstellt_am >= NOW() - INTERVAL '24 hours'
            ORDER BY b.erstellt_am DESC
                LIMIT 50
        `;

        const result = await pool.query(notificationsQuery);

        res.json({
            success: true,
            notifications: result.rows
        });

    } catch (error) {
        console.error('Admin notifications error:', error);
        res.status(500).json({
            success: false,
            message: 'Error loading notifications'
        });
    }
});

// System-Gesundheitsstatus
app.get('/api/admin/system/health', async (req, res) => {
    try {
        // Datenbankverbindungstest
        const dbTest = await pool.query('SELECT NOW()');

        // Verschiedene System-Metriken abrufen
        const metricsQuery = `
            SELECT 
                (SELECT COUNT(*) FROM patienten WHERE status = 'active') as active_patients,
                (SELECT COUNT(*) FROM mitarbeiter WHERE status = 'active') as active_staff,
                (SELECT COUNT(*) FROM patient_zuweisung WHERE status = 'active') as active_assignments,
                (SELECT COUNT(*) FROM assignments WHERE DATE(created_at) = CURRENT_DATE) as todays_tasks,
                (SELECT COUNT(*) FROM benachrichtigungen WHERE gelesen = false) as unread_notifications
        `;

        const metrics = await pool.query(metricsQuery);

        res.json({
            success: true,
            health: {
                database: 'connected',
                timestamp: dbTest.rows[0].now,
                metrics: metrics.rows[0]
            }
        });

    } catch (error) {
        console.error('System health error:', error);
        res.status(500).json({
            success: false,
            message: 'System health check failed',
            health: {
                database: 'disconnected',
                error: error.message
            }
        });
    }
});

// Datenexport für Admin (grundlegender CSV-Export)
app.get('/api/admin/export/:type', async (req, res) => {
    const { type } = req.params;

    try {
        let query = '';
        let filename = '';

        switch(type) {
            case 'patients':
                query = `
                    SELECT 
                        p.id, p.vorname, p.nachname, p.geburtsdatum, 
                        p.standort, p.zimmer_nummer, p.status, p.aufnahmedatum
                    FROM patienten p
                    ORDER BY p.nachname, p.vorname
                `;
                filename = 'patienten_export.csv';
                break;

            case 'assignments':
                query = `
                    SELECT 
                        p.vorname || ' ' || p.nachname as patient,
                        m.vorname || ' ' || m.nachname as pflegekraft,
                        p.standort,
                        pz.assigned_at
                    FROM patient_zuweisung pz
                    JOIN patienten p ON pz.patient_id = p.id
                    JOIN mitarbeiter m ON pz.mitarbeiter_id = m.id
                    WHERE pz.status = 'active'
                    ORDER BY pz.assigned_at DESC
                `;
                filename = 'zuweisungen_export.csv';
                break;

            case 'transfers':
                query = `
                    SELECT 
                        p.vorname || ' ' || p.nachname as patient,
                        sv.alter_standort,
                        sv.neuer_standort,
                        sv.grund,
                        sv.geaendert_am
                    FROM standort_verlauf sv
                    JOIN patienten p ON sv.patient_id = p.id
                    ORDER BY sv.geaendert_am DESC
                `;
                filename = 'transfers_export.csv';
                break;

            default:
                return res.status(400).json({
                    success: false,
                    message: 'Invalid export type'
                });
        }

        const result = await pool.query(query);

        // In CSV konvertieren
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No data to export'
            });
        }

        const headers = Object.keys(result.rows[0]);
        const csvContent = [
            headers.join(','),
            ...result.rows.map(row =>
                headers.map(header =>
                    JSON.stringify(row[header] || '')
                ).join(',')
            )
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csvContent);

    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({
            success: false,
            message: 'Export failed: ' + error.message
        });
    }
});

// Transfer-Tabellen initialisieren
app.post('/api/admin/init-transfer-tables', async (req, res) => {
    try {
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS transfer_requests (
                                                             id SERIAL PRIMARY KEY,
                                                             patient_id INTEGER REFERENCES patienten(id) ON DELETE CASCADE,
                requester_type VARCHAR(20) NOT NULL,
                requester_id INTEGER,
                requester_name VARCHAR(200) NOT NULL,
                current_standort VARCHAR(50) NOT NULL,
                gewuenschter_standort VARCHAR(50) NOT NULL,
                grund TEXT NOT NULL,
                status VARCHAR(20) DEFAULT 'pending',
                admin_id INTEGER REFERENCES mitarbeiter(id),
                admin_response TEXT,
                erstellt_am TIMESTAMP DEFAULT NOW(),
                bearbeitet_am TIMESTAMP,
                prioritaet VARCHAR(20) DEFAULT 'normal'
                );

            -- Indexe hinzufügen
            CREATE INDEX IF NOT EXISTS idx_transfer_requests_patient ON transfer_requests(patient_id);
            CREATE INDEX IF NOT EXISTS idx_transfer_requests_status ON transfer_requests(status);
            CREATE INDEX IF NOT EXISTS idx_transfer_requests_created ON transfer_requests(erstellt_am);
        `;

        await pool.query(createTableQuery);

        res.json({
            success: true,
            message: 'Transfer-Tabellen erfolgreich initialisiert'
        });

    } catch (error) {
        console.error('Table initialization error:', error);
        res.status(500).json({
            success: false,
            message: 'Fehler bei der Tabellen-Initialisierung: ' + error.message
        });
    }
});

// Kritische Gesundheitsdaten automatisch überprüfen
app.post('/api/health/check-critical/:gesundheitsdatenId', async (req, res) => {
    const { gesundheitsdatenId } = req.params;

    try {
        await checkCriticalHealthData(null, gesundheitsdatenId);

        res.json({
            success: true,
            message: 'Critical health check completed'
        });
    } catch (error) {
        console.error('Critical health check error:', error);
        res.status(500).json({
            success: false,
            message: 'Error checking critical health data'
        });
    }
});

// Gesundheitsdaten einfügen mit automatischer Kritik-Prüfung
app.post('/api/health/data', async (req, res) => {
    const {
        patientId,
        mitarbeiterId,
        blutdruckSystolisch,
        blutdruckDiastolisch,
        puls,
        temperatur,
        sauerstoffsaettigung,
        bemerkungen
    } = req.body;

    try {
        // Bestimmen ob Werte kritisch sind
        const isCritical = (
            (blutdruckSystolisch && (blutdruckSystolisch > 180 || blutdruckSystolisch < 90)) ||
            (blutdruckDiastolisch && (blutdruckDiastolisch > 120 || blutdruckDiastolisch < 60)) ||
            (puls && (puls > 120 || puls < 50)) ||
            (temperatur && (temperatur > 39 || temperatur < 35)) ||
            (sauerstoffsaettigung && sauerstoffsaettigung < 90)
        );

        // Gesundheitsdaten einfügen
        const insertQuery = `
            INSERT INTO gesundheitsdaten (
                patient_id, mitarbeiter_id, blutdruck_systolisch, blutdruck_diastolisch,
                puls, temperatur, sauerstoffsaettigung, bemerkungen, ist_kritisch, gemessen_am
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
            RETURNING *
        `;

        const result = await pool.query(insertQuery, [
            patientId, mitarbeiterId, blutdruckSystolisch, blutdruckDiastolisch,
            puls, temperatur, sauerstoffsaettigung, bemerkungen, isCritical
        ]);

        const newHealthData = result.rows[0];

        // Falls kritisch, Alarmsystem auslösen
        if (isCritical) {
            await checkCriticalHealthData(patientId, newHealthData.id);
        }

        res.json({
            success: true,
            message: isCritical ? 'Gesundheitsdaten gespeichert - KRITISCHE WERTE ERKANNT!' : 'Gesundheitsdaten erfolgreich gespeichert',
            healthData: newHealthData,
            critical: isCritical
        });

    } catch (error) {
        console.error('Health data insertion error:', error);
        res.status(500).json({
            success: false,
            message: 'Fehler beim Speichern der Gesundheitsdaten'
        });
    }
});

// Kritische Benachrichtigungen für Benutzer abrufen
app.get('/api/notifications/critical/:userId', async (req, res) => {
    const { userId } = req.params;
    const { userType } = req.query;

    try {
        let query = '';

        if (userType === 'mitarbeiter') {
            query = `
                SELECT 
                    b.*,
                    p.vorname || ' ' || p.nachname as patient_name
                FROM benachrichtigungen b
                JOIN patienten p ON b.patient_id = p.id
                WHERE b.mitarbeiter_id = $1
                  AND b.typ = 'critical_health_alert'
                  AND b.gelesen = false
                  AND b.erstellt_am >= NOW() - INTERVAL '24 hours'
                ORDER BY b.erstellt_am DESC
            `;
        } else {
            // Für Patienten - sie erhalten keine kritischen Gesundheitsalarme über sich selbst
            query = `
                SELECT 
                    b.*,
                    'Sie' as patient_name
                FROM benachrichtigungen b
                WHERE b.patient_id = $1
                  AND b.typ IN ('transfer_approved', 'transfer_rejected')
                  AND b.gelesen = false
                  AND b.erstellt_am >= NOW() - INTERVAL '24 hours'
                ORDER BY b.erstellt_am DESC
            `;
        }

        const result = await pool.query(query, [userId]);

        res.json({
            success: true,
            criticalAlerts: result.rows
        });

    } catch (error) {
        console.error('Critical notifications error:', error);
        res.status(500).json({
            success: false,
            message: 'Error loading critical notifications'
        });
    }
});

// Benachrichtigung als gelesen markieren
app.put('/api/notifications/:notificationId/read', async (req, res) => {
    const { notificationId } = req.params;

    try {
        const updateQuery = `
            UPDATE benachrichtigungen 
            SET gelesen = true, erstellt_am = NOW()
            WHERE id = $1
            RETURNING *
        `;

        const result = await pool.query(updateQuery, [notificationId]);

        res.json({
            success: true,
            notification: result.rows[0]
        });

    } catch (error) {
        console.error('Mark notification read error:', error);
        res.status(500).json({
            success: false,
            message: 'Error marking notification as read'
        });
    }
});

// Demo-Endpunkt: Kritische Gesundheitsdaten simulieren
app.post('/api/demo/critical-health', async (req, res) => {
    const { patientId, scenario = 'high_blood_pressure' } = req.body;

    try {
        let healthData = {};

        switch (scenario) {
            case 'high_blood_pressure':
                healthData = {
                    blutdruck_systolisch: 195,
                    blutdruck_diastolisch: 125,
                    puls: 95,
                    temperatur: 37.2,
                    sauerstoffsaettigung: 98,
                    bemerkungen: 'Patient klagt über Kopfschmerzen und Schwindel'
                };
                break;
            case 'low_oxygen':
                healthData = {
                    blutdruck_systolisch: 130,
                    blutdruck_diastolisch: 85,
                    puls: 105,
                    temperatur: 38.1,
                    sauerstoffsaettigung: 87,
                    bemerkungen: 'Atemnot und Unruhe beobachtet'
                };
                break;
            case 'high_fever':
                healthData = {
                    blutdruck_systolisch: 110,
                    blutdruck_diastolisch: 70,
                    puls: 125,
                    temperatur: 39.8,
                    sauerstoffsaettigung: 95,
                    bemerkungen: 'Hohes Fieber, Patient ist schwach'
                };
                break;
            default:
                healthData = {
                    blutdruck_systolisch: 200,
                    blutdruck_diastolisch: 130,
                    puls: 130,
                    temperatur: 40.1,
                    sauerstoffsaettigung: 85,
                    bemerkungen: 'MEHRERE KRITISCHE WERTE - NOTFALL!'
                };
        }

        // Kritische Gesundheitsdaten einfügen
        const insertQuery = `
            INSERT INTO gesundheitsdaten (
                patient_id, blutdruck_systolisch, blutdruck_diastolisch,
                puls, temperatur, sauerstoffsaettigung, bemerkungen, 
                ist_kritisch, gemessen_am
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW())
            RETURNING *
        `;

        const result = await pool.query(insertQuery, [
            patientId,
            healthData.blutdruck_systolisch,
            healthData.blutdruck_diastolisch,
            healthData.puls,
            healthData.temperatur,
            healthData.sauerstoffsaettigung,
            healthData.bemerkungen
        ]);

        // Alarmsystem auslösen
        await checkCriticalHealthData(patientId, result.rows[0].id);

        res.json({
            success: true,
            message: `Demo-Alarm ausgelöst: ${scenario}`,
            healthData: result.rows[0]
        });

    } catch (error) {
        console.error('Demo critical health error:', error);
        res.status(500).json({
            success: false,
            message: 'Fehler beim Demo-Alarm: ' + error.message
        });
    }
});

// Alle Patienten für Demo-Auswahl
app.get('/api/demo/patients', async (req, res) => {
    try {
        const query = `
            SELECT 
                p.id,
                p.vorname || ' ' || p.nachname as name,
                p.standort,
                p.zimmer_nummer,
                COALESCE(m.vorname || ' ' || m.nachname, 'Keine Pflegekraft') as pflegekraft
            FROM patienten p
            LEFT JOIN patient_zuweisung pz ON p.id = pz.patient_id AND pz.status = 'active'
            LEFT JOIN mitarbeiter m ON pz.mitarbeiter_id = m.id
            WHERE p.status = 'active'
            ORDER BY p.nachname, p.vorname
            LIMIT 10
        `;

        const result = await pool.query(query);

        res.json({
            success: true,
            patients: result.rows
        });

    } catch (error) {
        console.error('Demo patients error:', error);
        res.status(500).json({
            success: false,
            message: 'Error loading patients for demo'
        });
    }
});

// Demo-Seite bereitstellen
app.get('/demo-health-alerts', (req, res) => {
    res.sendFile(path.join(__dirname, 'WEB SEITE', 'demo-health-alerts.html'));
});

// Gesundheitsüberwachung beim Serverstart initialisieren
app.post('/api/admin/init-health-monitoring', async (req, res) => {
    try {
        // Prüfen ob erforderliche Tabellen existieren
        const checkTablesQuery = `
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('gesundheitsdaten', 'benachrichtigungen', 'patienten', 'mitarbeiter', 'patient_zuweisung')
        `;

        const result = await pool.query(checkTablesQuery);

        const requiredTables = ['gesundheitsdaten', 'benachrichtigungen', 'patienten', 'mitarbeiter', 'patient_zuweisung'];
        const existingTables = result.rows.map(row => row.table_name);
        const missingTables = requiredTables.filter(table => !existingTables.includes(table));

        if (missingTables.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Missing required tables: ${missingTables.join(', ')}`
            });
        }

        res.json({
            success: true,
            message: 'Health monitoring system is ready',
            tables: existingTables
        });

    } catch (error) {
        console.error('Health monitoring init error:', error);
        res.status(500).json({
            success: false,
            message: 'Error initializing health monitoring system'
        });
    }
});

// Add these endpoints to your server.js file

// Helper function to generate random room number
function generateRoomNumber(standort) {
    const roomPrefixes = {
        'Krefeld': 'K',
        'Mönchengladbach': 'MG',
        'Zuhause': 'H'
    };

    const prefix = roomPrefixes[standort] || 'X';
    const number = Math.floor(Math.random() * 900) + 100; // 100-999
    return `${prefix}${number}`;
}

// Helper function to generate realistic fake data
function generatePatientDefaults(baseData) {
    const streets = ['Hauptstraße', 'Kirchstraße', 'Bahnhofstraße', 'Gartenstraße', 'Schulstraße'];
    const cities = ['Krefeld', 'Mönchengladbach', 'Düsseldorf', 'Köln'];
    const conditions = ['Stabil', 'Rehabilitation', 'Beobachtung', 'Chronische Erkrankung'];
    const medications = ['Aspirin 100mg täglich', 'Blutdrucksenker morgens', 'Vitamin D3 wöchentlich', 'Nach Bedarf'];
    const allergies = ['Keine bekannt', 'Penicillin', 'Nüsse', 'Laktoseintoleranz'];

    const defaults = {
        // Address if not provided
        adresse: baseData.adresse || `${streets[Math.floor(Math.random() * streets.length)]} ${Math.floor(Math.random() * 200) + 1}, ${Math.floor(Math.random() * 90000) + 10000} ${cities[Math.floor(Math.random() * cities.length)]}`,

        // Phone if not provided
        telefon: baseData.telefon || `+49 ${Math.floor(Math.random() * 900) + 100} ${Math.floor(Math.random() * 9000000) + 1000000}`,

        // Emergency contact if not provided
        notfallkontakt: baseData.notfallkontakt || `Angehörige: +49 ${Math.floor(Math.random() * 900) + 100} ${Math.floor(Math.random() * 9000000) + 1000000}`,

        // Medical info if not provided
        gesundheitszustand: baseData.gesundheitszustand || conditions[Math.floor(Math.random() * conditions.length)],
        medikamente: baseData.medikamente || medications[Math.floor(Math.random() * medications.length)],
        allergien: baseData.allergien || allergies[Math.floor(Math.random() * allergies.length)],

        // System generated fields
        zimmer_nummer: generateRoomNumber(baseData.standort),
        aufnahmedatum: new Date().toISOString().split('T')[0], // Today
        status: 'active'
    };

    return defaults;
}

// Register new patient with automatic assignment
app.post('/api/admin/patients/register', async (req, res) => {
    const { adminId, benutzername, ...patientData } = req.body;

    // Validate required fields
    const requiredFields = ['vorname', 'nachname', 'geburtsdatum', 'standort'];
    const missingFields = requiredFields.filter(field => !patientData[field]);

    if (missingFields.length > 0) {
        return res.status(400).json({
            success: false,
            message: `Fehlende Pflichtfelder: ${missingFields.join(', ')}`
        });
    }

    try {
        await pool.query('BEGIN');

        // Check if username already exists and make it unique
        let finalUsername = benutzername;
        let counter = 1;

        while (true) {
            const usernameCheck = await pool.query(
                'SELECT id FROM patienten WHERE benutzername = $1 UNION SELECT id FROM mitarbeiter WHERE benutzername = $1',
                [finalUsername]
            );

            if (usernameCheck.rows.length === 0) break;

            finalUsername = `${benutzername}${counter}`;
            counter++;
        }

        // Generate default values for missing optional fields
        const defaults = generatePatientDefaults(patientData);

        // Combine provided data with defaults
        const completePatientData = {
            ...defaults,
            ...patientData, // User provided data overrides defaults
            benutzername: finalUsername
        };

        console.log('Registering new patient:', {
            name: `${completePatientData.vorname} ${completePatientData.nachname}`,
            standort: completePatientData.standort,
            username: finalUsername
        });

        // Insert patient into database
        const insertPatientQuery = `
            INSERT INTO patienten (
                vorname, nachname, benutzername, geburtsdatum, adresse, telefon,
                notfallkontakt, gesundheitszustand, medikamente, allergien,
                zimmer_nummer, standort, aufnahmedatum, status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING *
        `;

        const patientResult = await pool.query(insertPatientQuery, [
            completePatientData.vorname,
            completePatientData.nachname,
            completePatientData.benutzername,
            completePatientData.geburtsdatum,
            completePatientData.adresse,
            completePatientData.telefon,
            completePatientData.notfallkontakt,
            completePatientData.gesundheitszustand,
            completePatientData.medikamente,
            completePatientData.allergien,
            completePatientData.zimmer_nummer,
            completePatientData.standort,
            completePatientData.aufnahmedatum,
            completePatientData.status
        ]);

        const newPatient = patientResult.rows[0];
        console.log('Patient registered with ID:', newPatient.id);

        // Automatic assignment to available Pflegekraft
        let assignmentMessage = '';

        const availablePflegekraftQuery = `
            SELECT 
                m.id,
                m.vorname || ' ' || m.nachname as name,
                COUNT(pz.patient_id) as current_patients
            FROM mitarbeiter m
            LEFT JOIN patient_zuweisung pz ON m.id = pz.mitarbeiter_id AND pz.status = 'active'
            WHERE m.rolle = 'pflegekraft' 
              AND m.status = 'active'
              AND m.standort = $1
            GROUP BY m.id, m.vorname, m.nachname
            HAVING COUNT(pz.patient_id) < 24
            ORDER BY COUNT(pz.patient_id) ASC, m.id ASC
            LIMIT 1
        `;

        const pflegekraftResult = await pool.query(availablePflegekraftQuery, [completePatientData.standort]);

        if (pflegekraftResult.rows.length > 0) {
            const pflegekraft = pflegekraftResult.rows[0];

            // Create assignment
            const assignmentQuery = `
                INSERT INTO patient_zuweisung (patient_id, mitarbeiter_id, status, zuweisung_datum)
                VALUES ($1, $2, 'active', NOW())
                ON CONFLICT (patient_id) 
                DO UPDATE SET 
                    mitarbeiter_id = EXCLUDED.mitarbeiter_id,
                    zuweisung_datum = EXCLUDED.zuweisung_datum,
                    status = EXCLUDED.status,
                    updated_at = NOW()
                RETURNING *
            `;

            const assignmentResult = await pool.query(assignmentQuery, [newPatient.id, pflegekraft.id]);

            console.log('Patient assigned to:', pflegekraft.name);
            assignmentMessage = `Automatisch ${pflegekraft.name} zugewiesen (${pflegekraft.current_patients + 1}/24 Patienten)`;

            // Notify the assigned Pflegekraft
            await pool.query(
                'INSERT INTO benachrichtigungen (patient_id, mitarbeiter_id, typ, titel, nachricht, prioritaet, erstellt_am) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
                [
                    newPatient.id,
                    pflegekraft.id,
                    'new_patient_assignment',
                    'Neuer Patient zugewiesen',
                    `${newPatient.vorname} ${newPatient.nachname} wurde Ihnen neu zugewiesen. Standort: ${newPatient.standort}, Zimmer: ${newPatient.zimmer_nummer}`,
                    'normal'
                ]
            );

        } else {
            console.log('No available Pflegekraft at', completePatientData.standort);
            assignmentMessage = `⚠️ Keine verfügbare Pflegekraft am Standort ${completePatientData.standort} - manuelle Zuweisung erforderlich`;

            // Notify administrators about unassigned patient
            const adminNotificationQuery = `
                INSERT INTO benachrichtigungen (patient_id, typ, titel, nachricht, prioritaet, erstellt_am)
                VALUES ($1, $2, $3, $4, $5, NOW())
            `;

            await pool.query(adminNotificationQuery, [
                newPatient.id,
                'admin_alert',
                'Patient ohne Pflegekraft',
                `Neuer Patient ${newPatient.vorname} ${newPatient.nachname} wurde registriert, aber keine Pflegekraft am Standort ${completePatientData.standort} verfügbar. Manuelle Zuweisung erforderlich.`,
                'high'
            ]);
        }

        // Log the registration in system
        console.log(`Patient registration completed: ${newPatient.vorname} ${newPatient.nachname} (ID: ${newPatient.id})`);

        await pool.query('COMMIT');

        res.json({
            success: true,
            message: 'Patient erfolgreich registriert',
            patient: newPatient,
            assignmentMessage: assignmentMessage,
            loginCredentials: {
                username: finalUsername,
                birthdate: completePatientData.geburtsdatum
            }
        });

    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Patient registration error:', error);

        if (error.code === '23505') { // Unique constraint violation
            res.status(400).json({
                success: false,
                message: 'Ein Patient mit diesen Daten existiert bereits'
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Fehler bei der Registrierung: ' + error.message
            });
        }
    }
});

// Get detailed patients list for admin management
app.get('/api/admin/patients/detailed', async (req, res) => {
    try {
        const patientsQuery = `
            SELECT 
                p.*,
                COALESCE(m.vorname || ' ' || m.nachname, 'Nicht zugewiesen') as assigned_pflegekraft,
                pz.zuweisung_datum,
                pz.status as assignment_status
            FROM patienten p
            LEFT JOIN patient_zuweisung pz ON p.id = pz.patient_id AND pz.status = 'active'
            LEFT JOIN mitarbeiter m ON pz.mitarbeiter_id = m.id
            ORDER BY p.aufnahmedatum DESC, p.nachname, p.vorname
        `;

        const result = await pool.query(patientsQuery);

        res.json({
            success: true,
            patients: result.rows
        });

    } catch (error) {
        console.error('Detailed patients list error:', error);
        res.status(500).json({
            success: false,
            message: 'Fehler beim Laden der Patientenliste: ' + error.message
        });
    }
});

// Update patient information
app.put('/api/admin/patients/:patientId', async (req, res) => {
    const { patientId } = req.params;
    const { adminId, ...updateData } = req.body;

    try {
        // Remove undefined/null values
        const cleanUpdateData = Object.entries(updateData)
            .filter(([key, value]) => value !== undefined && value !== null && value !== '')
            .reduce((obj, [key, value]) => {
                obj[key] = value;
                return obj;
            }, {});

        if (Object.keys(cleanUpdateData).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Keine Aktualisierungsdaten bereitgestellt'
            });
        }

        // Build dynamic update query
        const updateFields = Object.keys(cleanUpdateData);
        const updateValues = Object.values(cleanUpdateData);

        const setClause = updateFields.map((field, index) => `${field} = ${index + 1}`).join(', ');
        const updateQuery = `
            UPDATE patienten 
            SET ${setClause}
            WHERE id = ${updateFields.length + 1}
            RETURNING *
        `;

        const result = await pool.query(updateQuery, [...updateValues, patientId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Patient nicht gefunden'
            });
        }

        console.log(`Patient ${patientId} updated by admin ${adminId}`);

        res.json({
            success: true,
            message: 'Patient erfolgreich aktualisiert',
            patient: result.rows[0]
        });

    } catch (error) {
        console.error('Patient update error:', error);
        res.status(500).json({
            success: false,
            message: 'Fehler beim Aktualisieren des Patienten: ' + error.message
        });
    }
});

// Deactivate patient
app.put('/api/admin/patients/:patientId/deactivate', async (req, res) => {
    const { patientId } = req.params;
    const { adminId, reason = 'Administrativ deaktiviert' } = req.body;

    try {
        await pool.query('BEGIN');

        // Update patient status
        const updatePatientQuery = `
            UPDATE patienten 
            SET status = 'discharged', entlassungsdatum = CURRENT_DATE
            WHERE id = $1 AND status = 'active'
            RETURNING *
        `;

        const patientResult = await pool.query(updatePatientQuery, [patientId]);

        if (patientResult.rows.length === 0) {
            await pool.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: 'Aktiver Patient nicht gefunden'
            });
        }

        const patient = patientResult.rows[0];

        // Deactivate assignment if exists
        const deactivateAssignmentQuery = `
            UPDATE patient_zuweisung 
            SET status = 'discharged', updated_at = NOW()
            WHERE patient_id = $1 AND status = 'active'
            RETURNING mitarbeiter_id
        `;

        const assignmentResult = await pool.query(deactivateAssignmentQuery, [patientId]);

        // Notify assigned Pflegekraft if there was one
        if (assignmentResult.rows.length > 0) {
            const pflegekraftId = assignmentResult.rows[0].mitarbeiter_id;

            await pool.query(
                'INSERT INTO benachrichtigungen (patient_id, mitarbeiter_id, typ, titel, nachricht, prioritaet, erstellt_am) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
                [
                    patientId,
                    pflegekraftId,
                    'patient_discharged',
                    'Patient entlassen',
                    `${patient.vorname} ${patient.nachname} wurde entlassen. Grund: ${reason}`,
                    'normal'
                ]
            );
        }

        await pool.query('COMMIT');

        console.log(`Patient ${patient.vorname} ${patient.nachname} deactivated by admin ${adminId}`);

        res.json({
            success: true,
            message: `Patient ${patient.vorname} ${patient.nachname} erfolgreich deaktiviert`,
            patient: patient
        });

    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Patient deactivation error:', error);
        res.status(500).json({
            success: false,
            message: 'Fehler beim Deaktivieren des Patienten: ' + error.message
        });
    }
});

// Get registration statistics
app.get('/api/admin/patients/statistics', async (req, res) => {
    try {
        const statsQuery = `
            SELECT 
                COUNT(*) as total_patients,
                COUNT(CASE WHEN status = 'active' THEN 1 END) as active_patients,
                COUNT(CASE WHEN status = 'discharged' THEN 1 END) as discharged_patients,
                COUNT(CASE WHEN aufnahmedatum >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_this_month,
                COUNT(CASE WHEN aufnahmedatum >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as new_this_week
            FROM patienten
        `;

        const locationStatsQuery = `
            SELECT 
                standort,
                COUNT(*) as total,
                COUNT(CASE WHEN status = 'active' THEN 1 END) as active
            FROM patienten
            GROUP BY standort
            ORDER BY standort
        `;

        const [statsResult, locationResult] = await Promise.all([
            pool.query(statsQuery),
            pool.query(locationStatsQuery)
        ]);

        res.json({
            success: true,
            statistics: {
                overview: statsResult.rows[0],
                by_location: locationResult.rows
            }
        });

    } catch (error) {
        console.error('Patient statistics error:', error);
        res.status(500).json({
            success: false,
            message: 'Fehler beim Laden der Statistiken'
        });
    }
});

// Bulk patient operations
app.post('/api/admin/patients/bulk-assign', async (req, res) => {
    const { patientIds, pflegekraftId, adminId } = req.body;

    if (!Array.isArray(patientIds) || patientIds.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Keine Patienten ausgewählt'
        });
    }

    try {
        await pool.query('BEGIN');

        // Check Pflegekraft capacity
        const capacityQuery = `
            SELECT COUNT(*) as current_patients
            FROM patient_zuweisung
            WHERE mitarbeiter_id = $1 AND status = 'active'
        `;
        const capacityResult = await pool.query(capacityQuery, [pflegekraftId]);
        const currentPatients = parseInt(capacityResult.rows[0].current_patients);

        if (currentPatients + patientIds.length > 24) {
            await pool.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: `Pflegekraft würde ${currentPatients + patientIds.length} Patienten haben (Maximum: 24)`
            });
        }

        // Assign all patients
        const assignmentPromises = patientIds.map(patientId =>
            pool.query(
                `INSERT INTO patient_zuweisung (patient_id, mitarbeiter_id, status, zuweisung_datum)
                 VALUES ($1, $2, 'active', NOW())
                 ON CONFLICT (patient_id) 
                 DO UPDATE SET 
                     mitarbeiter_id = EXCLUDED.mitarbeiter_id,
                     zuweisung_datum = EXCLUDED.zuweisung_datum,
                     status = EXCLUDED.status,
                     updated_at = NOW()`,
                [patientId, pflegekraftId]
            )
        );

        await Promise.all(assignmentPromises);
        await pool.query('COMMIT');

        res.json({
            success: true,
            message: `${patientIds.length} Patienten erfolgreich zugewiesen`
        });

    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Bulk assignment error:', error);
        res.status(500).json({
            success: false,
            message: 'Fehler bei der Massenzuweisung: ' + error.message
        });
    }
});

// Add these endpoints to your server.js file

// Get Pflegekräfte by location for manual selection
app.get('/api/admin/pflegekraefte/by-location/:location', async (req, res) => {
    const { location } = req.params;

    try {
        const pflegekraefteQuery = `
            SELECT 
                m.id,
                m.vorname,
                m.nachname,
                m.benutzername,
                m.standort,
                COALESCE(m.vorname || ' ' || m.nachname, m.benutzername) as name,
                COUNT(pz.patient_id) as current_patients
            FROM mitarbeiter m
            LEFT JOIN patient_zuweisung pz ON m.id = pz.mitarbeiter_id AND pz.status = 'active'
            WHERE m.rolle = 'pflegekraft' 
              AND m.status = 'active'
              AND m.standort = $1
            GROUP BY m.id, m.vorname, m.nachname, m.benutzername, m.standort
            ORDER BY current_patients ASC, m.nachname, m.vorname
        `;

        const result = await pool.query(pflegekraefteQuery, [location]);

        res.json({
            success: true,
            location: location,
            pflegekraefte: result.rows
        });

    } catch (error) {
        console.error('Pflegekräfte by location error:', error);
        res.status(500).json({
            success: false,
            message: 'Fehler beim Laden der Pflegekräfte: ' + error.message
        });
    }
});

// Update patient registration to handle manual Pflegekraft assignment
app.post('/api/admin/patients/register', async (req, res) => {
    const { adminId, benutzername, assignmentMode, manualPflegekraftId, ...patientData } = req.body;

    // Validate required fields
    const requiredFields = ['vorname', 'nachname', 'geburtsdatum', 'standort'];
    const missingFields = requiredFields.filter(field => !patientData[field]);

    if (missingFields.length > 0) {
        return res.status(400).json({
            success: false,
            message: `Fehlende Pflichtfelder: ${missingFields.join(', ')}`
        });
    }

    try {
        await pool.query('BEGIN');

        // Check if username already exists and make it unique
        let finalUsername = benutzername;
        let counter = 1;

        while (true) {
            const usernameCheck = await pool.query(
                'SELECT id FROM patienten WHERE benutzername = $1 UNION SELECT id FROM mitarbeiter WHERE benutzername = $1',
                [finalUsername]
            );

            if (usernameCheck.rows.length === 0) break;

            finalUsername = `${benutzername}${counter}`;
            counter++;
        }

        // Generate default values for missing optional fields
        const defaults = generatePatientDefaults(patientData);

        // Combine provided data with defaults
        const completePatientData = {
            ...defaults,
            ...patientData, // User provided data overrides defaults
            benutzername: finalUsername
        };

        console.log('Registering new patient:', {
            name: `${completePatientData.vorname} ${completePatientData.nachname}`,
            standort: completePatientData.standort,
            username: finalUsername,
            assignmentMode: assignmentMode
        });

        // Insert patient into database
        const insertPatientQuery = `
            INSERT INTO patienten (
                vorname, nachname, benutzername, geburtsdatum, adresse, telefon,
                notfallkontakt, gesundheitszustand, medikamente, allergien,
                zimmer_nummer, standort, aufnahmedatum, status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING *
        `;

        const patientResult = await pool.query(insertPatientQuery, [
            completePatientData.vorname,
            completePatientData.nachname,
            completePatientData.benutzername,
            completePatientData.geburtsdatum,
            completePatientData.adresse,
            completePatientData.telefon,
            completePatientData.notfallkontakt,
            completePatientData.gesundheitszustand,
            completePatientData.medikamente,
            completePatientData.allergien,
            completePatientData.zimmer_nummer,
            completePatientData.standort,
            completePatientData.aufnahmedatum,
            completePatientData.status
        ]);

        const newPatient = patientResult.rows[0];
        console.log('Patient registered with ID:', newPatient.id);

        // Handle assignment based on mode
        let assignmentMessage = '';
        let limitReached = false;

        if (assignmentMode === 'manual' && manualPflegekraftId) {
            // Manual assignment to specific Pflegekraft
            console.log('Attempting manual assignment to Pflegekraft ID:', manualPflegekraftId);

            // Check if the selected Pflegekraft can take more patients
            const pflegekraftCapacityQuery = `
                SELECT 
                    m.id,
                    m.vorname || ' ' || m.nachname as name,
                    COUNT(pz.patient_id) as current_patients
                FROM mitarbeiter m
                LEFT JOIN patient_zuweisung pz ON m.id = pz.mitarbeiter_id AND pz.status = 'active'
                WHERE m.id = $1
                GROUP BY m.id, m.vorname, m.nachname
            `;

            const pflegekraftResult = await pool.query(pflegekraftCapacityQuery, [manualPflegekraftId]);

            if (pflegekraftResult.rows.length === 0) {
                throw new Error('Ausgewählte Pflegekraft nicht gefunden');
            }

            const pflegekraft = pflegekraftResult.rows[0];
            console.log(`Selected Pflegekraft: ${pflegekraft.name}, current patients: ${pflegekraft.current_patients}`);

            if (pflegekraft.current_patients >= 24) {
                // 24-patient limit reached - register patient but don't assign
                console.log('🚨 24-PATIENT LIMIT REACHED! Cannot assign to selected Pflegekraft');

                limitReached = true;
                assignmentMessage = `⚠️ LIMIT ERREICHT: ${pflegekraft.name} hat bereits 24 Patienten - Patient ohne Zuweisung registriert`;

                // Notify administrators about the limit being reached
                await pool.query(
                    'INSERT INTO benachrichtigungen (patient_id, typ, titel, nachricht, prioritaet, erstellt_am) VALUES ($1, $2, $3, $4, $5, NOW())',
                    [
                        newPatient.id,
                        'admin_alert',
                        '🚨 24-Patienten-Limit erreicht',
                        `Patient ${newPatient.vorname} ${newPatient.nachname} konnte nicht ${pflegekraft.name} zugewiesen werden - 24-Patienten-Limit erreicht! Manuelle Neuzuweisung erforderlich.`,
                        'high'
                    ]
                );

                // Notify the Pflegekraft about the attempted assignment
                await pool.query(
                    'INSERT INTO benachrichtigungen (patient_id, mitarbeiter_id, typ, titel, nachricht, prioritaet, erstellt_am) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
                    [
                        newPatient.id,
                        manualPflegekraftId,
                        'assignment_limit_reached',
                        '⚠️ Zuweisungs-Limit erreicht',
                        `Ein neuer Patient (${newPatient.vorname} ${newPatient.nachname}) sollte Ihnen zugewiesen werden, aber Sie haben bereits 24 Patienten. Der Patient wurde ohne Zuweisung registriert.`,
                        'normal'
                    ]
                );

            } else {
                // Assignment possible - create assignment
                const assignmentQuery = `
                    INSERT INTO patient_zuweisung (patient_id, mitarbeiter_id, status, zuweisung_datum)
                    VALUES ($1, $2, 'active', NOW())
                    ON CONFLICT (patient_id) 
                    DO UPDATE SET 
                        mitarbeiter_id = EXCLUDED.mitarbeiter_id,
                        zuweisung_datum = EXCLUDED.zuweisung_datum,
                        status = EXCLUDED.status,
                        updated_at = NOW()
                    RETURNING *
                `;

                await pool.query(assignmentQuery, [newPatient.id, manualPflegekraftId]);

                console.log('Manual assignment successful');
                assignmentMessage = `✅ Manuell ${pflegekraft.name} zugewiesen (${pflegekraft.current_patients + 1}/24 Patienten)`;

                // Notify the assigned Pflegekraft
                await pool.query(
                    'INSERT INTO benachrichtigungen (patient_id, mitarbeiter_id, typ, titel, nachricht, prioritaet, erstellt_am) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
                    [
                        newPatient.id,
                        manualPflegekraftId,
                        'new_patient_assignment',
                        'Neuer Patient zugewiesen',
                        `${newPatient.vorname} ${newPatient.nachname} wurde Ihnen manuell zugewiesen. Standort: ${newPatient.standort}, Zimmer: ${newPatient.zimmer_nummer}`,
                        'normal'
                    ]
                );
            }

        } else {
            // Automatic assignment (original logic)
            const availablePflegekraftQuery = `
                SELECT 
                    m.id,
                    m.vorname || ' ' || m.nachname as name,
                    COUNT(pz.patient_id) as current_patients
                FROM mitarbeiter m
                LEFT JOIN patient_zuweisung pz ON m.id = pz.mitarbeiter_id AND pz.status = 'active'
                WHERE m.rolle = 'pflegekraft' 
                  AND m.status = 'active'
                  AND m.standort = $1
                GROUP BY m.id, m.vorname, m.nachname
                HAVING COUNT(pz.patient_id) < 24
                ORDER BY COUNT(pz.patient_id) ASC, m.id ASC
                LIMIT 1
            `;

            const pflegekraftResult = await pool.query(availablePflegekraftQuery, [completePatientData.standort]);

            if (pflegekraftResult.rows.length > 0) {
                const pflegekraft = pflegekraftResult.rows[0];

                // Create assignment
                const assignmentQuery = `
                    INSERT INTO patient_zuweisung (patient_id, mitarbeiter_id, status, zuweisung_datum)
                    VALUES ($1, $2, 'active', NOW())
                    ON CONFLICT (patient_id) 
                    DO UPDATE SET 
                        mitarbeiter_id = EXCLUDED.mitarbeiter_id,
                        zuweisung_datum = EXCLUDED.zuweisung_datum,
                        status = EXCLUDED.status,
                        updated_at = NOW()
                    RETURNING *
                `;

                await pool.query(assignmentQuery, [newPatient.id, pflegekraft.id]);

                console.log('Automatic assignment successful to:', pflegekraft.name);
                assignmentMessage = `Automatisch ${pflegekraft.name} zugewiesen (${pflegekraft.current_patients + 1}/24 Patienten)`;

                // Notify the assigned Pflegekraft
                await pool.query(
                    'INSERT INTO benachrichtigungen (patient_id, mitarbeiter_id, typ, titel, nachricht, prioritaet, erstellt_am) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
                    [
                        newPatient.id,
                        pflegekraft.id,
                        'new_patient_assignment',
                        'Neuer Patient zugewiesen',
                        `${newPatient.vorname} ${newPatient.nachname} wurde Ihnen automatisch zugewiesen. Standort: ${newPatient.standort}, Zimmer: ${newPatient.zimmer_nummer}`,
                        'normal'
                    ]
                );

            } else {
                console.log('No available Pflegekraft at', completePatientData.standort);
                assignmentMessage = `⚠️ Alle Pflegekräfte am Standort ${completePatientData.standort} haben 24 Patienten - manuelle Zuweisung erforderlich`;

                // Notify administrators about unassigned patient
                await pool.query(
                    'INSERT INTO benachrichtigungen (patient_id, typ, titel, nachricht, prioritaet, erstellt_am) VALUES ($1, $2, $3, $4, $5, NOW())',
                    [
                        newPatient.id,
                        'admin_alert',
                        'Patient ohne Pflegekraft',
                        `Neuer Patient ${newPatient.vorname} ${newPatient.nachname} wurde registriert, aber alle Pflegekräfte am Standort ${completePatientData.standort} haben bereits 24 Patienten. Manuelle Zuweisung erforderlich.`,
                        'high'
                    ]
                );
            }
        }

        await pool.query('COMMIT');

        console.log(`Patient registration completed: ${newPatient.vorname} ${newPatient.nachname} (ID: ${newPatient.id})`);
        console.log(`Assignment result: ${assignmentMessage}`);

        res.json({
            success: true,
            message: 'Patient erfolgreich registriert',
            patient: newPatient,
            assignmentMessage: assignmentMessage,
            limitReached: limitReached,
            loginCredentials: {
                username: finalUsername,
                birthdate: completePatientData.geburtsdatum
            }
        });

    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Patient registration error:', error);

        if (error.code === '23505') { // Unique constraint violation
            res.status(400).json({
                success: false,
                message: 'Ein Patient mit diesen Daten existiert bereits'
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Fehler bei der Registrierung: ' + error.message
            });
        }
    }
});

// Test endpoint to artificially set a Pflegekraft to 24 patients
app.post('/api/test/set-pflegekraft-to-limit', async (req, res) => {
    const { pflegekraftId, targetPatientCount = 24 } = req.body;

    if (!pflegekraftId) {
        return res.status(400).json({
            success: false,
            message: 'pflegekraftId is required'
        });
    }

    try {
        await pool.query('BEGIN');

        // First, get current assignments for this Pflegekraft
        const currentAssignmentsQuery = `
            SELECT 
                pz.patient_id,
                p.vorname || ' ' || p.nachname as patient_name
            FROM patient_zuweisung pz
            JOIN patienten p ON pz.patient_id = p.id
            WHERE pz.mitarbeiter_id = $1 AND pz.status = 'active'
        `;

        const currentAssignments = await pool.query(currentAssignmentsQuery, [pflegekraftId]);
        const currentCount = currentAssignments.rows.length;

        console.log(`Pflegekraft ${pflegekraftId} currently has ${currentCount} patients`);

        if (currentCount >= targetPatientCount) {
            await pool.query('ROLLBACK');
            return res.json({
                success: true,
                message: `Pflegekraft hat bereits ${currentCount} Patienten (Ziel: ${targetPatientCount})`,
                currentPatientCount: currentCount,
                targetReached: true
            });
        }

        // Get available patients that are not assigned or assigned to other Pflegekräfte
        const availablePatientsQuery = `
            SELECT 
                p.id,
                p.vorname || ' ' || p.nachname as name,
                p.standort
            FROM patienten p
            LEFT JOIN patient_zuweisung pz ON p.id = pz.patient_id AND pz.status = 'active'
            WHERE p.status = 'active' 
              AND (pz.id IS NULL OR pz.mitarbeiter_id != $1)
            ORDER BY p.id
            LIMIT $2
        `;

        const patientsNeeded = targetPatientCount - currentCount;
        const availablePatients = await pool.query(availablePatientsQuery, [pflegekraftId, patientsNeeded]);

        if (availablePatients.rows.length < patientsNeeded) {
            await pool.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: `Nicht genügend verfügbare Patienten. Benötigt: ${patientsNeeded}, Verfügbar: ${availablePatients.rows.length}`
            });
        }

        // Assign the required number of patients
        const assignedPatients = [];

        for (const patient of availablePatients.rows) {
            // Remove any existing assignment
            await pool.query(
                'UPDATE patient_zuweisung SET status = $1 WHERE patient_id = $2 AND status = $3',
                ['reassigned', patient.id, 'active']
            );

            // Create new assignment
            await pool.query(
                `INSERT INTO patient_zuweisung (patient_id, mitarbeiter_id, status, zuweisung_datum)
                 VALUES ($1, $2, 'active', NOW())
                 ON CONFLICT (patient_id) 
                 DO UPDATE SET 
                     mitarbeiter_id = EXCLUDED.mitarbeiter_id,
                     zuweisung_datum = EXCLUDED.zuweisung_datum,
                     status = EXCLUDED.status,
                     updated_at = NOW()`,
                [patient.id, pflegekraftId]
            );

            assignedPatients.push(patient);
        }

        // Get Pflegekraft info
        const pflegekraftInfo = await pool.query(
            'SELECT vorname || \' \' || nachname as name, standort FROM mitarbeiter WHERE id = $1',
            [pflegekraftId]
        );

        await pool.query('COMMIT');

        console.log(`✅ Test setup complete: Pflegekraft ${pflegekraftId} now has ${targetPatientCount} patients`);

        res.json({
            success: true,
            message: `✅ Pflegekraft erfolgreich auf ${targetPatientCount} Patienten gesetzt für Limit-Test`,
            pflegekraftInfo: pflegekraftInfo.rows[0],
            previousPatientCount: currentCount,
            newPatientCount: targetPatientCount,
            assignedPatients: assignedPatients,
            readyForLimitTest: true
        });

    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Test setup error:', error);
        res.status(500).json({
            success: false,
            message: 'Fehler beim Test-Setup: ' + error.message
        });
    }
});

// Test endpoint to get Pflegekräfte with their current patient counts for easy testing
app.get('/api/test/pflegekraefte-for-limit-test', async (req, res) => {
    try {
        const pflegekraefteQuery = `
            SELECT 
                m.id,
                m.vorname || ' ' || m.nachname as name,
                m.standort,
                COUNT(pz.patient_id) as current_patients,
                (24 - COUNT(pz.patient_id)) as slots_available,
                CASE 
                    WHEN COUNT(pz.patient_id) >= 24 THEN 'AT_LIMIT'
                    WHEN COUNT(pz.patient_id) >= 20 THEN 'NEAR_LIMIT'
                    ELSE 'AVAILABLE'
                END as status
            FROM mitarbeiter m
            LEFT JOIN patient_zuweisung pz ON m.id = pz.mitarbeiter_id AND pz.status = 'active'
            WHERE m.rolle = 'pflegekraft' AND m.status = 'active'
            GROUP BY m.id, m.vorname, m.nachname, m.standort
            ORDER BY current_patients DESC, m.standort, m.nachname
        `;

        const result = await pool.query(pflegekraefteQuery);

        res.json({
            success: true,
            pflegekraefte: result.rows,
            testingSuggestion: "Use /api/test/set-pflegekraft-to-limit with pflegekraftId to set a Pflegekraft to 24 patients for testing"
        });

    } catch (error) {
        console.error('Pflegekräfte for testing error:', error);
        res.status(500).json({
            success: false,
            message: 'Error loading Pflegekräfte for testing: ' + error.message
        });
    }
});