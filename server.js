const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const cors = require('cors');

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
app.get('/pflegekraft-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'WEB SEITE', 'Pflegekraft', 'index.html'));
});

app.get('/patient-dashboard', (req, res) => {
    res.send('<h1>Patient Dashboard - Coming Soon!</h1>');
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