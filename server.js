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


// Enhanced PostgreSQL connection with proper UTF-8 handling
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'pflegeplus',
    password: 'bagier002',
    port: 5432,
    // Enhanced UTF-8 configuration
    client_encoding: 'UTF8',
    application_name: 'pflegevision-app',
    // Additional connection options for UTF-8
    connectionString: `postgresql://postgres:bagier002@localhost:5432/pflegeplus?client_encoding=UTF8`,
    ssl: false
});

// Enhanced connection handling with UTF-8 setup
pool.on('connect', (client) => {
    // Set UTF-8 encoding for each connection
    client.query('SET client_encoding TO UTF8');
    client.query('SET timezone TO \'Europe/Berlin\'');
    //console.log('Database connection established with UTF-8 encoding');
});

pool.on('error', (err) => {
    console.error('Database pool error:', err);
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

// Get patients list for assignment form
app.get('/api/patients', async (req, res) => {
    try {
        // Force UTF-8 encoding for this query
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

        // Ensure proper UTF-8 encoding in response
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
app.post('/api/admin/fix-encoding', async (req, res) => {
    try {
        // Set UTF-8 encoding
        await pool.query('SET client_encoding TO UTF8');

        // Fix common German character encoding issues
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
            // Fix patienten table
            const patientResult = await pool.query(`
                UPDATE patienten 
                SET 
                    vorname = REPLACE(vorname, $1, $2),
                    nachname = REPLACE(nachname, $1, $2)
                WHERE vorname LIKE '%' || $1 || '%' OR nachname LIKE '%' || $1 || '%'
            `, [fix.from, fix.to]);

            // Fix mitarbeiter table
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

app.get('/api/patients/search', async (req, res) => {
    const { q } = req.query;

    if (!q || q.length < 2) {
        return res.json([]);
    }

    try {
        // Ensure UTF-8 encoding
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

// ========== PATIENT TRANSFER REQUEST ENDPOINTS - FIXED ==========

// Enhanced patient dashboard endpoint to include current location
app.get('/api/patient/dashboard/:patientId', async (req, res) => {
    const { patientId } = req.params;

    try {
        // Get patient info including current location
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

// Create a new transfer request - FIXED
// Create a new transfer request - FIXED VALIDATION
app.post('/api/patient/transfer-requests', async (req, res) => {
    const {
        patientId,
        currentStandort,
        requestedStandort,
        reason,
        prioritaet, // Note: using German spelling to match database
        requesterType,
        requesterId,
        requesterName
    } = req.body;

    try {
        // Enhanced validation with better error messages
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

        // Check if patient exists
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

        // Check if requested location is different from current
        if (actualCurrentStandort === requestedStandort) {
            return res.status(400).json({
                success: false,
                message: 'Der gewünschte Standort ist bereits der aktuelle Standort'
            });
        }

        // Check for existing pending requests
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

        // Create the transfer request using correct German column names
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

// Get transfer requests for a specific patient - FIXED
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

// Cancel a transfer request - FIXED
app.delete('/api/patient/transfer-requests/:requestId', async (req, res) => {
    const { requestId } = req.params;
    const { patientId } = req.body;

    try {
        // Check if request exists and belongs to patient
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

        // Update status to cancelled using correct German column names
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

// ========== ADMIN ENDPOINTS FOR TRANSFER REQUESTS - FIXED ==========

// Get all pending transfer requests for admin - FIXED
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


// Reject a transfer request - FIXED
app.post('/api/admin/transfers/requests/:requestId/reject', async (req, res) => {
    const { requestId } = req.params;
    const { adminId, rejectionReason } = req.body;

    try {
        // Get request details
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

        // Update request status using correct German column names
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

        // Create notification for patient/requester
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

// Get transfer request statistics for admin dashboard - FIXED
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

// Admin dashboard API endpoint - FIXED
app.get('/api/admin/dashboard', async (req, res) => {
    try {
        // Get location statistics for patients
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

        // Get pflegekraft statistics by location
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

        // Get overall system statistics
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

// ========== TRANSFER MANAGEMENT ENDPOINTS - FIXED ==========

// Handle admin-initiated transfers
// ========== ENHANCED TRANSFER LOGIC WITH AUTO-REASSIGNMENT ==========

// ========== FIXED TRANSFER LOGIC - HANDLES UNIQUE CONSTRAINT ==========

// Replace your existing admin-initiated transfer endpoint in server.js


// ========== FIXED APPROVE TRANSFER REQUEST ==========

// ========== SIMPLE TRANSFER FIX - ALWAYS REASSIGN ON LOCATION CHANGE ==========

// ========== FIXED ADMIN TRANSFER ENDPOINT ==========
// Replace your existing /api/admin/transfers endpoint with this corrected version

// ========== COMPLETELY FIXED ADMIN TRANSFER ENDPOINT ==========
// Replace your existing /api/admin/transfers endpoint with this version

app.post('/api/admin/transfers', async (req, res) => {
    const { patientId, newLocation, reason, adminId } = req.body;

    try {
        await pool.query('BEGIN');

        // Get current patient info and assignment
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

        console.log(`🔄 Transfer: ${patient.vorname} ${patient.nachname}`);
        console.log(`📍 Von: ${oldLocation} → Nach: ${newLocation}`);
        console.log(`👨‍⚕️ Aktuelle Pflegekraft: ${patient.current_pflegekraft_name} (ID: ${patient.current_pflegekraft_id})`);
        console.log(`📋 Assignment ID: ${patient.assignment_id}`);

        // Step 1: Update patient location
        await pool.query('UPDATE patienten SET standort = $1 WHERE id = $2', [newLocation, patientId]);

        // Step 2: Log the transfer in standort_verlauf
        await pool.query(
            'INSERT INTO standort_verlauf (patient_id, alter_standort, neuer_standort, grund, geaendert_von, geaendert_am) VALUES ($1, $2, $3, $4, $5, NOW())',
            [patientId, oldLocation, newLocation, reason, adminId]
        );

        // Step 3: Handle Pflegekraft reassignment
        let reassignmentMessage = '';

        if (patient.current_pflegekraft_id && patient.assignment_id) {
            // Patient has a current assignment - we need to handle reassignment

            console.log(`🔍 Aktuelle Zuweisung gefunden - prüfe Pflegekraft-Standort...`);

            // Check if current Pflegekraft is also at the new location
            if (patient.pflegekraft_location === newLocation) {
                // Same Pflegekraft can continue caring - no reassignment needed
                reassignmentMessage = ` (Pflegekraft ${patient.current_pflegekraft_name} arbeitet bereits am Zielort - Zuweisung beibehalten)`;
                console.log(`✅ Pflegekraft bleibt zugewiesen (gleicher Standort)`);
            } else {
                // Pflegekraft is at different location - need to reassign
                console.log(`🔄 Pflegekraft ist an anderem Standort - suche neue Pflegekraft am Standort ${newLocation}...`);

                // Find available Pflegekraft at new location
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
                    // Found available Pflegekraft at new location
                    const newPflegekraft = newPflegekraftResult.rows[0];
                    console.log(`✅ Neue Pflegekraft gefunden: ${newPflegekraft.name} (ID: ${newPflegekraft.id}, ${newPflegekraft.current_patients}/24 Patienten)`);

                    // DIRECT UPDATE - Update the existing assignment record
                    const updateResult = await pool.query(
                        'UPDATE patient_zuweisung SET mitarbeiter_id = $1, zuweisung_datum = NOW(), updated_at = NOW() WHERE id = $2 RETURNING *',
                        [newPflegekraft.id, patient.assignment_id]
                    );

                    console.log(`📝 Assignment updated:`, updateResult.rows[0]);

                    reassignmentMessage = ` und neuer Pflegekraft ${newPflegekraft.name} zugewiesen`;

                    // Notify new Pflegekraft
                    await pool.query(
                        'INSERT INTO benachrichtigungen (patient_id, mitarbeiter_id, typ, titel, nachricht, prioritaet, erstellt_am) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
                        [patientId, newPflegekraft.id, 'new_patient_assignment', 'Neuer Patient zugewiesen', `${patient.vorname} ${patient.nachname} wurde Ihnen durch Transfer von ${oldLocation} zugewiesen.`, 'normal']
                    );

                    // Notify old Pflegekraft
                    await pool.query(
                        'INSERT INTO benachrichtigungen (patient_id, mitarbeiter_id, typ, titel, nachricht, prioritaet, erstellt_am) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
                        [patientId, patient.current_pflegekraft_id, 'patient_transferred', 'Patient verlegt', `${patient.vorname} ${patient.nachname} wurde nach ${newLocation} verlegt und einer anderen Pflegekraft zugewiesen.`, 'normal']
                    );

                } else {
                    // No available Pflegekraft at new location - mark as unassigned
                    console.log(`❌ Keine verfügbare Pflegekraft am Standort ${newLocation}`);

                    const deactivateResult = await pool.query(
                        'UPDATE patient_zuweisung SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
                        ['unassigned', patient.assignment_id]
                    );

                    console.log(`📝 Assignment deactivated:`, deactivateResult.rows[0]);

                    reassignmentMessage = ` (⚠️ Keine verfügbare Pflegekraft am Zielort - Patient vorübergehend ohne Zuweisung)`;

                    // Notify old Pflegekraft
                    await pool.query(
                        'INSERT INTO benachrichtigungen (patient_id, mitarbeiter_id, typ, titel, nachricht, prioritaet, erstellt_am) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
                        [patientId, patient.current_pflegekraft_id, 'patient_transferred', 'Patient verlegt', `${patient.vorname} ${patient.nachname} wurde nach ${newLocation} verlegt. Keine Pflegekraft verfügbar am Zielort.`, 'high']
                    );

                    // Alert administrators
                    await pool.query(
                        'INSERT INTO benachrichtigungen (patient_id, typ, titel, nachricht, prioritaet, erstellt_am) VALUES ($1, $2, $3, $4, $5, NOW())',
                        [patientId, 'admin_alert', 'Patient ohne Pflegekraft', `Patient ${patient.vorname} ${patient.nachname} wurde nach ${newLocation} verlegt, aber keine Pflegekraft verfügbar. Manuelle Zuweisung erforderlich.`, 'high']
                    );
                }
            }
        } else {
            // Patient had no assignment - try to assign to someone at new location
            console.log(`🔍 Patient hatte keine Zuweisung - suche Pflegekraft am neuen Standort...`);

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
                console.log(`✅ Pflegekraft für unassigned Patient gefunden: ${pflegekraft.name}`);

                // Create new assignment
                const createResult = await pool.query(
                    'INSERT INTO patient_zuweisung (patient_id, mitarbeiter_id, status, zuweisung_datum) VALUES ($1, $2, $3, NOW()) ON CONFLICT (patient_id) DO UPDATE SET mitarbeiter_id = EXCLUDED.mitarbeiter_id, zuweisung_datum = EXCLUDED.zuweisung_datum, status = EXCLUDED.status, updated_at = NOW() RETURNING *',
                    [patientId, pflegekraft.id, 'active']
                );

                console.log(`📝 New assignment created:`, createResult.rows[0]);

                reassignmentMessage = ` und Pflegekraft ${pflegekraft.name} zugewiesen`;

                // Notify new Pflegekraft
                await pool.query(
                    'INSERT INTO benachrichtigungen (patient_id, mitarbeiter_id, typ, titel, nachricht, prioritaet, erstellt_am) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
                    [patientId, pflegekraft.id, 'new_patient_assignment', 'Neuer Patient zugewiesen', `${patient.vorname} ${patient.nachname} wurde Ihnen durch Transfer zugewiesen.`, 'normal']
                );
            } else {
                console.log(`❌ Keine Pflegekraft verfügbar für unassigned Patient`);
                reassignmentMessage = ` (⚠️ Keine Pflegekraft verfügbar am Zielort)`;
            }
        }

        // Verify the final state
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
        console.log(`🔍 Final state:`, finalState.rows[0]);

        await pool.query('COMMIT');
        console.log(`✅ Transfer abgeschlossen: ${patient.vorname} ${patient.nachname}${reassignmentMessage}`);

        res.json({
            success: true,
            message: `Patient erfolgreich von ${oldLocation} nach ${newLocation} verlegt${reassignmentMessage}`,
            finalState: finalState.rows[0]
        });

    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('❌ Transfer Fehler:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Fehler beim Transfer'
        });
    }
});

// ========== DEBUG ENDPOINT TO CHECK CURRENT STATE ==========
// Add this endpoint to help debug the current state
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
// ========== FIXED APPROVE TRANSFER REQUEST ENDPOINT ==========
// Replace your existing /api/admin/transfers/requests/:requestId/approve endpoint

app.post('/api/admin/transfers/requests/:requestId/approve', async (req, res) => {
    const { requestId } = req.params;
    const { adminId, adminResponse } = req.body;

    try {
        await pool.query('BEGIN');

        // Get request details
        const requestResult = await pool.query('SELECT * FROM transfer_requests WHERE id = $1 AND status = $2', [requestId, 'pending']);

        if (requestResult.rows.length === 0) {
            await pool.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: 'Transfer-Anfrage nicht gefunden oder bereits bearbeitet'
            });
        }

        const request = requestResult.rows[0];

        // Get patient info and current assignment
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

        console.log(`🔄 Genehmige Transfer-Antrag: ${patient.vorname} ${patient.nachname} → ${request.gewuenschter_standort}`);

        // Update patient location
        await pool.query('UPDATE patienten SET standort = $1 WHERE id = $2', [request.gewuenschter_standort, request.patient_id]);

        // Log transfer
        await pool.query(
            'INSERT INTO standort_verlauf (patient_id, alter_standort, neuer_standort, grund, geaendert_von, geaendert_am) VALUES ($1, $2, $3, $4, $5, NOW())',
            [request.patient_id, request.current_standort, request.gewuenschter_standort, `Genehmigter Transfer-Antrag: ${request.grund}`, adminId]
        );

        // Handle reassignment (same logic as admin transfer)
        let reassignmentMessage = '';

        if (patient.mitarbeiter_id) {
            // Check if current Pflegekraft is also at new location
            if (patient.pflegekraft_location === request.gewuenschter_standort) {
                reassignmentMessage = ` (Pflegekraft ${patient.current_pflegekraft_name} arbeitet bereits am Zielort)`;
            } else {
                // Find new Pflegekraft at destination
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

                    // Update assignment
                    await pool.query(
                        'UPDATE patient_zuweisung SET mitarbeiter_id = $1, zuweisung_datum = NOW(), updated_at = NOW() WHERE patient_id = $2 AND status = $3',
                        [newPflegekraft.id, request.patient_id, 'active']
                    );

                    reassignmentMessage = ` und neuer Pflegekraft ${newPflegekraft.name} zugewiesen`;

                    // Notify new Pflegekraft
                    await pool.query(
                        'INSERT INTO benachrichtigungen (patient_id, mitarbeiter_id, typ, titel, nachricht, prioritaet, erstellt_am) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
                        [request.patient_id, newPflegekraft.id, 'new_patient_assignment', 'Neuer Patient zugewiesen', `${patient.vorname} ${patient.nachname} wurde Ihnen durch genehmigten Transfer zugewiesen.`, 'normal']
                    );

                    // Notify old Pflegekraft
                    await pool.query(
                        'INSERT INTO benachrichtigungen (patient_id, mitarbeiter_id, typ, titel, nachricht, prioritaet, erstellt_am) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
                        [request.patient_id, patient.mitarbeiter_id, 'patient_transferred', 'Patient verlegt', `${patient.vorname} ${patient.nachname} wurde nach ${request.gewuenschter_standort} verlegt.`, 'normal']
                    );
                } else {
                    // No Pflegekraft available
                    await pool.query(
                        'UPDATE patient_zuweisung SET status = $1, updated_at = NOW() WHERE patient_id = $2 AND status = $3',
                        ['unassigned', request.patient_id, 'active']
                    );
                    reassignmentMessage = ` (⚠️ Keine Pflegekraft verfügbar am Zielort)`;
                }
            }
        }

        // Update request status
        const finalResponse = (adminResponse || 'Transfer-Anfrage genehmigt und durchgeführt') + reassignmentMessage;
        const updateResult = await pool.query(
            'UPDATE transfer_requests SET status = $1, admin_response = $2, admin_id = $3, bearbeitet_am = NOW() WHERE id = $4 RETURNING *',
            ['approved', finalResponse, adminId, requestId]
        );

        // Notify patient of approval
        await pool.query(
            'INSERT INTO benachrichtigungen (patient_id, typ, titel, nachricht, prioritaet, erstellt_am) VALUES ($1, $2, $3, $4, $5, NOW())',
            [request.patient_id, 'transfer_approved', 'Transfer genehmigt', `Ihr Transfer-Antrag von ${request.current_standort} nach ${request.gewuenschter_standort} wurde genehmigt und durchgeführt.${reassignmentMessage}`, 'normal']
        );

        await pool.query('COMMIT');
        console.log(`✅ Transfer-Antrag genehmigt: ${patient.vorname} ${patient.nachname}`);

        res.json({
            success: true,
            message: 'Transfer-Anfrage genehmigt und durchgeführt' + reassignmentMessage,
            request: updateResult.rows[0]
        });

    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('❌ Transfer-Antrag Genehmigungsfehler:', error);
        res.status(500).json({
            success: false,
            message: 'Fehler bei der Genehmigung der Transfer-Anfrage: ' + error.message
        });
    }
});

// Add these debug endpoints to your server.js to check what's actually in the database

// 1. Check all patient assignments
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

// 2. Check all Pflegekraft and their current workload
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

// 3. Check specific patient (Fatima)
app.get('/api/debug/fatima', async (req, res) => {
    try {
        const patientQuery = `
            SELECT * FROM patienten WHERE vorname = 'Fatima' AND nachname = 'Demir'
        `;

        const assignmentQuery = `
            SELECT pz.*, m.vorname, m.nachname, m.standort 
            FROM patient_zuweisung pz
            LEFT JOIN mitarbeiter m ON pz.mitarbeiter_id = m.id
            WHERE pz.patient_id = (SELECT id FROM patienten WHERE vorname = 'Fatima' AND nachname = 'Demir')
        `;

        const [patientResult, assignmentResult] = await Promise.all([
            pool.query(patientQuery),
            pool.query(assignmentQuery)
        ]);

        res.json({
            patient: patientResult.rows[0],
            assignments: assignmentResult.rows
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// ========== HELPER FUNCTION: Get Available Pflegekraft ==========

// Add this helper function to your server.js
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

// ========== UTILITY ENDPOINT: Check Pflegekraft Availability ==========

// Add this endpoint to check availability at different locations
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

// Get recent transfers
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

// ========== DETAILED STATISTICS ENDPOINTS ==========

// Get detailed statistics for the statistics section
app.get('/api/admin/statistics/detailed', async (req, res) => {
    try {
        // Location statistics with more details
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

        // Pflegekraft workload statistics
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

// ========== PATIENT MANAGEMENT ENDPOINTS ==========

// Get all patients for admin management
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

// Get patient's current location for admin transfer form
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

// ========== PFLEGEKRAFT MANAGEMENT ENDPOINTS ==========

// Get all pflegekraft for admin management
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

// ========== ASSIGNMENT MANAGEMENT ENDPOINTS ==========

// Get assignment overview
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

// Manually assign patient to pflegekraft
app.post('/api/admin/assignments/manual', async (req, res) => {
    const { patientId, pflegekraftId, adminId } = req.body;

    try {
        // Check if patient is already assigned
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

        // Check pflegekraft capacity
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

        // Create assignment
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

// Remove assignment
app.delete('/api/admin/assignments/:assignmentId', async (req, res) => {
    const { assignmentId } = req.params;
    const { reason = 'Admin removal' } = req.body;

    try {
        // Update assignment status
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

// ========== NOTIFICATION MANAGEMENT ==========

// Get system notifications for admin
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

// ========== SYSTEM HEALTH ENDPOINTS ==========

// Get system health status
app.get('/api/admin/system/health', async (req, res) => {
    try {
        // Database connection test
        const dbTest = await pool.query('SELECT NOW()');

        // Get various system metrics
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

// ========== DATA EXPORT ENDPOINTS ==========

// Export data for admin (basic CSV export)
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

        // Convert to CSV
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

// Create the transfer_requests table if it doesn't exist with correct schema
app.post('/api/admin/init-transfer-tables', async (req, res) => {
    try {
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS transfer_requests (
                                                             id SERIAL PRIMARY KEY,
                                                             patient_id INTEGER REFERENCES patienten(id) ON DELETE CASCADE,
                requester_type VARCHAR(20) NOT NULL, -- 'patient' or 'angehoerige'
                requester_id INTEGER, -- patient_id if patient, angehoerige_id if family member
                requester_name VARCHAR(200) NOT NULL,
                current_standort VARCHAR(50) NOT NULL,
                gewuenschter_standort VARCHAR(50) NOT NULL,
                grund TEXT NOT NULL,
                status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
                admin_id INTEGER REFERENCES mitarbeiter(id), -- who processed the request
                admin_response TEXT, -- admin's response/reason
                erstellt_am TIMESTAMP DEFAULT NOW(),
                bearbeitet_am TIMESTAMP,
                prioritaet VARCHAR(20) DEFAULT 'normal' -- 'low', 'normal', 'high', 'urgent'
                );

            -- Add indexes
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