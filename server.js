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
app.use(express.static('WEB SEITE/LOGIN')); // Serve your static files
app.use('/pflegekraft', express.static('WEB SEITE/Pflegekraft')); // Serve Pflegekraft files


// PostgreSQL connection
// Replace your existing PostgreSQL connection with this:

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'pflegeplus',
    password: 'bagier002',
    port: 5432,
    // Add these options for proper UTF-8 handling
    client_encoding: 'UTF8',
    application_name: 'pflegevision-app'
});

// Also add this to ensure UTF-8 encoding for new connections
pool.on('connect', (client) => {
    client.query('SET client_encoding TO UTF8');
});

// Test database connection
pool.connect((err, client, release) => {
    if (err) {
        console.error('Error connecting to PostgreSQL:', err);
    } else {
        console.log('Successfully connected to PostgreSQL database');
        release();
    }
});

// Login endpoint
// Login endpoint - FIXED VERSION
app.post('/api/login', async (req, res) => {
    const { username, birthdate } = req.body;

    if (!username || !birthdate) {
        return res.status(400).json({
            success: false,
            message: 'Benutzername und Geburtsdatum sind erforderlich'
        });
    }

    try {
        // Check in Mitarbeiter table first
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
                    role: mitarbeiterResult.rows[0].rolle || 'pflegekraft'  // Default to pflegekraft if rolle is null
                }
            });
        }

        // Check in Patienten table if not found in Mitarbeiter
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

        // No user found
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

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'WEB SEITE', 'LOGIN', 'index.html'));
});

// Add this new route for Pflegekraft dashboard
app.get('/pflegekraft', (req, res) => {
    res.sendFile(path.join(__dirname, 'WEB SEITE', 'Pflegekraft', 'index.html'));
});

app.get('/patient', (req, res) => {
    res.sendFile(path.join(__dirname, 'WEB SEITE', 'Patient', 'dashboard_patient.html'));
});

// Add this line to serve all Patient folder files
app.use('/patient', express.static('WEB SEITE/Patient'));
app.post('/api/assign-random', async (req, res) => {
    try {
        console.log('Starte Random-Assign-Algorithmus...');

        // Alte Einträge löschen (nur für Tests, vorsichtig im echten Einsatz!)
        await pool.query('DELETE FROM patient_zuweisung');
        console.log('Alte Zuweisungen gelöscht.');

        // Alle Mitarbeiter holen
        const mitarbeiterList = (await pool.query('SELECT id FROM mitarbeiter')).rows.map(row => ({
            id: row.id,
            assignedCount: 0
        }));
        console.log(`Gefundene Mitarbeiter: ${mitarbeiterList.length}`);

        // Alle Patienten random holen
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
                        console.log(`✅ Patient ${patient.id} zu Mitarbeiter ${currentMitarbeiter.id} zugewiesen.`);
                        currentMitarbeiter.assignedCount++;
                        assigned = true;
                    } catch (insertError) {
                        console.error(`❌ Insert-Fehler bei Patient ${patient.id}:`, insertError.detail || insertError.message);
                    }
                }

                mitarbeiterIndex = (mitarbeiterIndex + 1) % mitarbeiterList.length;
                attempts++;
            }

            if (!assigned) {
                console.warn(`⚠ Kein freier Mitarbeiter für Patient ${patient.id} gefunden.`);
            }
        }

        res.json({ success: true, message: 'Random-Patienten-Zuweisung abgeschlossen!' });
    } catch (error) {
        console.error('💥 Fehler im Zuweisungsprozess:', error);
        res.status(500).json({ success: false, message: 'Fehler bei der Random-Patienten-Zuweisung' });
    }
});


// Start server
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

// Add this line to see what files Express is trying to serve
app.use('/pflegekraft', (req, res, next) => {
    console.log('Trying to serve:', req.url);
    next();
}, express.static('WEB SEITE/Pflegekraft'));

// Get assignment dashboard
app.get('/api/assignments', async (req, res) => {
    try {
        const stats = await algorithm.getStatistics();
        res.json({ success: true, statistics: stats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Assign a patient
app.post('/api/assign-patient', async (req, res) => {
    const { patientId } = req.body;
    const result = await algorithm.assignPatient(patientId);
    res.json(result);
});

// Transfer a patient
app.post('/api/transfer-patient', async (req, res) => {
    const { patientId, reason } = req.body;
    const result = await algorithm.transferPatient(patientId, reason);
    res.json(result);
});

// Update assignment status (mark as completed)
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

// Delete assignment
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


// Add these new endpoints to your existing server.js file

// Dashboard endpoint - gets data for logged-in Mitarbeiter
// Add this updated section to your server.js file

// Dashboard endpoint - gets data for logged-in Mitarbeiter
// Updated dashboard endpoint to include actual assignments from the assignments table
app.get('/api/dashboard/:mitarbeiterId', async (req, res) => {
    const { mitarbeiterId } = req.params;

    try {
        // Get Mitarbeiter info
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

        // Get assigned patients count
        const patientsCountQuery = `
            SELECT COUNT(*) as patient_count
            FROM patient_zuweisung mp
            WHERE mp.mitarbeiter_id = $1
        `;
        const patientsCountResult = await pool.query(patientsCountQuery, [mitarbeiterId]);
        const patientCount = patientsCountResult.rows[0].patient_count;

        // Get today's assignments from the assignments table
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

        // Count completed assignments for today
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

// Updated assignments endpoint to work with your existing database structure
// Replace the existing /api/assignments POST endpoint in your server.js with this fixed version:

app.post('/api/assignments', async (req, res) => {
    const { mitarbeiterId, patientId, aufgabe, zeit, status } = req.body;

    try {
        // Create assignments table if it doesn't exist
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

        // Insert the new assignment
        const insertQuery = `
            INSERT INTO assignments (mitarbeiter_id, patient_id, aufgabe, zeit, status, created_at)
            VALUES ($1, $2, $3, $4, $5, NOW())
                RETURNING *
        `;

        const result = await pool.query(insertQuery, [mitarbeiterId, patientId, aufgabe, zeit, status]);

        // REMOVED THE PROBLEMATIC CODE - No longer trying to update patient_zuweisung table
        // The patient_zuweisung table is only for permanent patient-to-pflegekraft assignments
        // Daily assignments are handled separately in the assignments table

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

// Also, let's make sure we remove the duplicate /api/assignments endpoint
// Keep only this one and remove any other duplicate endpoints in your server.js
// Get patients list for assignment form
app.get('/api/patients', async (req, res) => {
    try {
        const query = `
            SELECT id, vorname, nachname 
            FROM patienten 
            ORDER BY nachname, vorname
        `;
        const result = await pool.query(query);

        res.json(result.rows);
    } catch (error) {
        console.error('Patients API error:', error);
        res.status(500).json({
            success: false,
            message: 'Error loading patients'
        });
    }
});

app.post('/api/assignments', async (req, res) => {
    const { mitarbeiterId, patientId, aufgabe, zeit, status } = req.body;

    try {
        // Create assignments table if it doesn't exist
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS assignments (
                                                       id SERIAL PRIMARY KEY,
                                                       mitarbeiter_id INTEGER REFERENCES mitarbeiter(id),
                patient_id INTEGER REFERENCES patienten(id),
                aufgabe TEXT NOT NULL,
                zeit VARCHAR(5) NOT NULL,
                status VARCHAR(20) NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
                )
        `;
        await pool.query(createTableQuery);

        const insertQuery = `
            INSERT INTO assignments (mitarbeiter_id, patient_id, aufgabe, zeit, status, created_at)
            VALUES ($1, $2, $3, $4, $5, NOW())
            RETURNING *
        `;

        const result = await pool.query(insertQuery, [mitarbeiterId, patientId, aufgabe, zeit, status]);

        res.json({
            success: true,
            assignment: result.rows[0]
        });
    } catch (error) {
        console.error('Assignment creation error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating assignment'
        });
    }
});
// Add this new endpoint to your server.js file (after the existing /api/patients endpoint)

// Get ASSIGNED patients list for a specific Mitarbeiter
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

// Add these new endpoints to your existing server.js file

// Patient Dashboard API - shows patient-specific data
app.get('/api/patient/dashboard/:patientId', async (req, res) => {
    const { patientId } = req.params;

    try {
        // Get patient info
        const patientQuery = `
            SELECT id, benutzername, vorname, nachname
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

        // Get assigned Pflegekraft info
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

        // Get today's assignments for this patient
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

// Get patient's assignment history (optional - for viewing past assignments)
app.get('/api/patient/assignments/history/:patientId', async (req, res) => {
    const { patientId } = req.params;
    const { days = 7 } = req.query; // Default to last 7 days

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

// Update the existing patient dashboard route to serve the HTML
app.get('/patient/', (req, res) => {
    res.sendFile(path.join(__dirname, 'WEB SEITE', 'Patient', 'dashboard_patient.html'));
});

// Add admin static file serving
app.use('/admin', express.static('WEB SEITE/Admin'));

// Admin dashboard route
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'WEB SEITE', 'Admin', 'index.html'));
});

// Admin dashboard API endpoint
app.get('/api/admin/dashboard', async (req, res) => {
    try {
        // Get location statistics
        const locationStats = await pool.query(`
            SELECT 
                p.standort,
                COUNT(p.id) as total_patients,
                COUNT(CASE WHEN pz.status = 'active' THEN 1 END) as assigned_patients
            FROM patienten p
            LEFT JOIN patient_zuweisung pz ON p.id = pz.patient_id AND pz.status = 'active'
            WHERE p.status = 'active'
            GROUP BY p.standort
            ORDER BY p.standort
        `);

        const pflegekraftStats = await pool.query(`
            SELECT 
                m.standort,
                COUNT(m.id) as total_pflegekraefte,
                ROUND(AVG(patient_counts.patient_count), 2) as avg_patients_per_pflegekraft
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

        // Get recent transfers (last 7 days)
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

        // Get workload alerts (Pflegekräfte with >20 patients)
        const workloadAlerts = await pool.query(`
            SELECT 
                m.id,
                m.vorname || ' ' || m.nachname as pflegekraft_name,
                m.standort,
                COUNT(pz.patient_id) as patient_count
            FROM mitarbeiter m
            LEFT JOIN patient_zuweisung pz ON m.id = pz.mitarbeiter_id AND pz.status = 'active'
            WHERE m.rolle = 'pflegekraft' AND m.status = 'active'
            GROUP BY m.id, m.vorname, m.nachname, m.standort
            HAVING COUNT(pz.patient_id) > 20
            ORDER BY COUNT(pz.patient_id) DESC
        `);

        res.json({
            success: true,
            dashboard: {
                location_statistics: {
                    patients: locationStats.rows,
                    pflegekraefte: pflegekraftStats.rows
                },
                recent_transfers: recentTransfers.rows,
                workload_alerts: workloadAlerts.rows
            }
        });

    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Error loading admin dashboard'
        });
    }
});