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
const pool = new Pool({
    user: 'postgres',     // Replace with your PostgreSQL username
    host: 'localhost',         // Replace with your host
    database: 'pflegeplus', // Replace with your database name
    password: 'bagier002', // Replace with your password
    port: 5432,               // Default PostgreSQL port
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
      SELECT id, benutzername, 'mitarbeiter' as user_type 
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
                    type: 'mitarbeiter'
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

// Add these new endpoints to your existing server.js file

// Dashboard endpoint - gets data for logged-in Mitarbeiter
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

        // Get today's assignments (you can expand this based on your assignments table structure)
        const todaysAssignmentsQuery = `
            SELECT 
                p.vorname || ' ' || p.nachname as patient_name,
                'Allgemeine Pflege' as aufgabe,
                '08:00' as zeit,
                'Ausstehend' as status
            FROM patient_zuweisung mp
            JOIN patienten p ON mp.patient_id = p.id
            WHERE mp.mitarbeiter_id = $1
            LIMIT 10
        `;
        const assignmentsResult = await pool.query(todaysAssignmentsQuery, [mitarbeiterId]);

        // Get assigned patients details
        const assignedPatientsQuery = `
            SELECT 
                p.id,
                p.vorname,
                p.nachname,
                p.geburtsdatum
            FROM patient_zuweisung mp
            JOIN patienten p ON mp.patient_id = p.id
            WHERE mp.mitarbeiter_id = $1
            ORDER BY p.nachname, p.vorname
        `;
        const assignedPatientsResult = await pool.query(assignedPatientsQuery, [mitarbeiterId]);

        res.json({
            success: true,
            username: mitarbeiter.vorname || mitarbeiter.benutzername,
            activePatients: parseInt(patientCount),
            completedAssignments: Math.floor(Math.random() * 5), // Dummy data for now
            todaysAssignments: assignmentsResult.rows.map(row => ({
                patient: row.patient_name,
                aufgabe: row.aufgabe,
                zeit: row.zeit,
                status: row.status
            })),
            assignedPatients: assignedPatientsResult.rows
        });

    } catch (error) {
        console.error('Dashboard API error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error loading dashboard'
        });
    }
});

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

// Create new assignment
app.post('/api/assignments', async (req, res) => {
    const { patientId, aufgabe, zeit, status } = req.body;

    try {
        // For now, we'll create a simple assignments table entry
        // You might need to create an assignments table if it doesn't exist
        const query = `
            INSERT INTO assignments (patient_id, aufgabe, zeit, status, created_at)
            VALUES ($1, $2, $3, $4, NOW())
            RETURNING *
        `;

        const result = await pool.query(query, [patientId, aufgabe, zeit, status]);

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