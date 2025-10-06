# PflegeVision 🏥

**Advanced Healthcare Management System for Nursing Facilities**

A full-stack web application designed to streamline patient care coordination, automate health monitoring, and optimize nurse workload distribution across multiple facility locations.

[![Node.js](https://img.shields.io/badge/Node.js-18.x-green.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17.5-blue.svg)](https://www.postgresql.org/)
[![Express](https://img.shields.io/badge/Express-4.21.2-lightgrey.svg)](https://expressjs.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [System Architecture](#system-architecture)
- [Technology Stack](#technology-stack)
- [Installation](#installation)
- [Database Schema](#database-schema)
- [API Documentation](#api-documentation)
- [Usage Examples](#usage-examples)
- [Screenshots](#screenshots)
- [Team](#team)

---

## 🎯 Overview

PflegeVision is a comprehensive healthcare management platform developed to address real-world challenges in nursing home operations. The system manages **1000+ patient records** with support for **200+ concurrent users** across multiple facility locations (Krefeld, Mönchengladbach, and home care).

### Project Context
- **Course**: Website Engineering (Grade: 1.3)
- **Institution**: Hochschule Niederrhein
- **Semester**: June 2025
- **Team Size**: 3 developers
- **Development Time**: 3 months

### Problem Solved
Traditional nursing home management involves manual patient assignment, delayed health alerts, and inefficient workload distribution. PflegeVision automates these processes, ensuring optimal care delivery and rapid response to critical health conditions.

---

## ✨ Key Features

### 🚨 Intelligent Health Monitoring
- **Real-time vital sign tracking**: Blood pressure, pulse, temperature, oxygen saturation, weight, blood sugar
- **Automatic critical alerts** when thresholds exceeded:
  - Blood Pressure: >180/120 or <90/60 mmHg
  - Oxygen Saturation: <90%
  - Temperature: >39°C or <35°C
  - Pulse: >120 or <50 bpm
- **Multi-tier notification system**: Alerts sent to assigned nurse, backup staff, and administrators
- **Alert history and tracking** with read/unread status

### 👥 Smart Patient Assignment Algorithm
- **24-patient limit enforcement** per nurse (configurable)
- **Automatic workload balancing** using least-loaded assignment strategy
- **Location-aware distribution** ensures nurses only assigned patients at their facility
- **Dynamic reassignment** when patients transfer between locations
- **Capacity warnings** when facilities approach maximum occupancy

### 🏥 Multi-Location Transfer Management
- **Patient/family transfer requests** with justification system
- **Admin approval workflow** with accept/reject capabilities
- **Automatic nurse reassignment** upon location change
- **Transfer history logging** with timestamp and reason tracking
- **Notification system** for all affected parties (patient, old nurse, new nurse, admin)

### 🔐 Role-Based Access Control (4 User Types)
1. **Administrator**
   - Full system access
   - Patient registration and management
   - Transfer request approval/rejection
   - Workload statistics and reporting
   - Manual patient reassignment

2. **Pflegekraft (Nurse)**
   - Assigned patient dashboard (max 24)
   - Health data recording and monitoring
   - Daily task management
   - Critical alert notifications
   - Patient vital history access

3. **Patient**
   - Personal health data view
   - Transfer request submission
   - Assigned nurse information
   - Appointment/task schedule view
   - Family contact management

4. **Angehörige (Family Member)**
   - Patient health status monitoring
   - Transfer request capability
   - Notification access
   - Limited medical information view

### 📊 Dashboard & Analytics
- **Real-time workload visualization** per nurse and location
- **Patient distribution statistics** across facilities
- **Critical alert summary** with priority filtering
- **Transfer request tracking** with pending/approved/rejected counts
- **System health monitoring** with database connection status

### 🧪 Demo & Testing Features
- **Demo health alert simulator** (`demo-health-alerts.html`)
- **Predefined critical scenarios**: High BP, low oxygen, high fever, multiple critical values
- **Test patient (Sophia Schwarz)** pre-configured for demonstrations
- **API test endpoints** for workload limit testing

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Admin   │  │  Nurse   │  │ Patient  │  │  Family  │   │
│  │Dashboard │  │Dashboard │  │Dashboard │  │Dashboard │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │             │              │             │          │
└───────┼─────────────┼──────────────┼─────────────┼──────────┘
        │             │              │             │
        └─────────────┴──────────────┴─────────────┘
                          │
        ┌─────────────────▼─────────────────┐
        │     Express.js REST API (50+ endpoints)     │
        │  ┌────────────────────────────┐  │
        │  │  Authentication Middleware │  │
        │  └────────────────────────────┘  │
        │  ┌────────────────────────────┐  │
        │  │  Business Logic Layer      │  │
        │  │  - Assignment Algorithm    │  │
        │  │  - Health Alert System     │  │
        │  │  - Transfer Manager        │  │
        │  │  - Notification Service    │  │
        │  └────────────────────────────┘  │
        └─────────────────┬─────────────────┘
                          │
        ┌─────────────────▼─────────────────┐
        │     PostgreSQL Database (11 Tables)│
        │  ┌────────────┐  ┌────────────┐   │
        │  │ Patienten  │  │ Mitarbeiter│   │
        │  └────────────┘  └────────────┘   │
        │  ┌────────────┐  ┌────────────┐   │
        │  │Gesundheits-│  │Benachrich- │   │
        │  │   daten    │  │  tigungen  │   │
        │  └────────────┘  └────────────┘   │
        │  ┌────────────┐  ┌────────────┐   │
        │  │  Patient_  │  │  Transfer_ │   │
        │  │ Zuweisung  │  │  Requests  │   │
        │  └────────────┘  └────────────┘   │
        └───────────────────────────────────┘
```

### Data Flow Example: Critical Health Alert

```
1. Nurse records vital signs via dashboard
        ↓
2. POST /api/health/data → Server validates & stores
        ↓
3. Auto-check: ist_kritisch = true (BP 195/125)
        ↓
4. checkCriticalHealthData() triggered
        ↓
5. Query patient, assigned nurse, location data
        ↓
6. Generate alert message with critical values
        ↓
7. Insert notifications to:
   - Assigned nurse (urgent priority)
   - All admins (urgent priority)
   - Backup nurses at same location (if no assigned nurse)
        ↓
8. Real-time dashboard update (polling/refresh)
        ↓
9. Nurse acknowledges alert → gelesen = true
```

---

## 💻 Technology Stack

### Backend
- **Runtime**: Node.js 18.x
- **Framework**: Express.js 4.21.2
- **Database**: PostgreSQL 17.5
- **Database Driver**: node-postgres (pg) 8.16.0
- **CORS**: cors 2.8.5

### Frontend
- **HTML5/CSS3**: Responsive design with Flexbox/Grid
- **JavaScript**: Vanilla ES6+ (no frameworks)
- **UI Design**: Custom gradient themes, card-based layouts
- **Icons**: Font Awesome 5

### Database
- **RDBMS**: PostgreSQL with proper normalization (3NF)
- **Indexes**: Optimized queries with 15+ indexes
- **Constraints**: Foreign keys, unique constraints, cascading deletes
- **Data Types**: Proper use of VARCHAR, INTEGER, NUMERIC, DATE, TIMESTAMP, TEXT[], BOOLEAN

### Development Tools
- **Package Manager**: npm
- **Dev Server**: nodemon 3.1.10
- **Version Control**: Git
- **Code Editor**: VS Code (implied from project structure)

---

## 🚀 Installation

### Prerequisites
- Node.js 18.x or higher
- PostgreSQL 17.x or higher
- npm 9.x or higher

### Step 1: Clone Repository
```bash
git clone https://github.com/mubag001/PflegePlus.git
cd PflegePlus
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Database Setup
```bash
# Login to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE pflegeplus;

# Import schema
\i pflegeplus_schema.sql
```

### Step 4: Configure Database Connection
Edit `server.js` (lines 20-28):
```javascript
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'pflegeplus',
    password: 'YOUR_PASSWORD',  // Change this
    port: 5432,
});
```

### Step 5: Start Server
```bash
# Development mode (auto-restart)
npm run dev

# Production mode
npm start
```

Server runs on `http://localhost:3000`

### Step 6: Access Application
- **Login Page**: `http://localhost:3000`
- **Admin Dashboard**: `http://localhost:3000/admin`
- **Nurse Dashboard**: `http://localhost:3000/pflegekraft`
- **Patient Dashboard**: `http://localhost:3000/patient`
- **Demo Alerts**: `http://localhost:3000/demo-health-alerts`

---

## 🗄️ Database Schema

### Core Tables (11 Total)

#### 1. **patienten** (Patients)
```sql
- id (PK)
- vorname, nachname, benutzername (UNIQUE)
- geburtsdatum, adresse, telefon
- gesundheitszustand, medikamente, allergien
- zimmer_nummer, standort (Krefeld/Mönchengladbach/Zuhause)
- aufnahmedatum, entlassungsdatum
- status (active/discharged)
```

#### 2. **mitarbeiter** (Staff)
```sql
- id (PK)
- vorname, nachname, benutzername (UNIQUE)
- rolle (administrator/pflegekraft)
- standort, abteilung, schicht
- telefon, email, qualifikationen
- status (active/inactive)
```

#### 3. **patient_zuweisung** (Patient Assignments)
```sql
- id (PK)
- mitarbeiter_id (FK → mitarbeiter)
- patient_id (FK → patienten, UNIQUE)
- zuweisung_datum, status
- Constraint: UNIQUE(patient_id) ensures 1:1 assignment
```

#### 4. **gesundheitsdaten** (Health Data)
```sql
- id (PK)
- patient_id (FK → patienten)
- mitarbeiter_id (FK → mitarbeiter)
- blutdruck_systolisch, blutdruck_diastolisch
- puls, temperatur, gewicht, blutzucker
- sauerstoffsaettigung
- ist_kritisch (BOOLEAN, auto-calculated)
- bemerkungen (TEXT)
- gemessen_am (TIMESTAMP)
```

#### 5. **benachrichtigungen** (Notifications)
```sql
- id (PK)
- patient_id (FK → patienten)
- mitarbeiter_id (FK → mitarbeiter)
- typ (critical_health_alert/transfer_approved/etc.)
- titel, nachricht
- prioritaet (urgent/high/normal)
- gelesen (BOOLEAN)
- erstellt_am (TIMESTAMP)
```

#### 6. **transfer_requests** (Transfer Requests)
```sql
- id (PK)
- patient_id (FK → patienten)
- requester_type, requester_id, requester_name
- current_standort, gewuenschter_standort
- grund (TEXT, reason for transfer)
- status (pending/approved/rejected/cancelled)
- admin_id (FK → mitarbeiter), admin_response
- prioritaet (urgent/high/normal)
- erstellt_am, bearbeitet_am (TIMESTAMPS)
```

#### 7. **standort_verlauf** (Location History)
```sql
- id (PK)
- patient_id (FK → patienten)
- alter_standort, neuer_standort
- grund (TEXT)
- geaendert_von (FK → mitarbeiter)
- geaendert_am (TIMESTAMP)
```

#### 8. **medikamenten_plan** (Medication Schedule)
```sql
- id (PK)
- patient_id (FK → patienten)
- medikament_name, dosierung
- einnahmezeiten (TEXT[])
- start_datum, end_datum
- besondere_hinweise
- erstellt_von (FK → mitarbeiter)
```

#### 9. **angehoerige** (Family Members)
```sql
- id (PK)
- patient_id (FK → patienten)
- vorname, nachname, benutzername (UNIQUE)
- beziehung (relationship type)
- telefon, email, geburtsdatum
- berechtigung_level (authorization level)
```

#### 10. **assignments** (Daily Tasks)
```sql
- id (PK)
- mitarbeiter_id (FK → mitarbeiter)
- patient_id (FK → patienten)
- aufgabe (TEXT, task description)
- zeit (VARCHAR(5), e.g., "14:30")
- status (pending/abgeschlossen)
- created_at (TIMESTAMP)
```

### Database Indexes (15+)
```sql
idx_gesundheitsdaten_patient (patient_id)
idx_gesundheitsdaten_datum (gemessen_am)
idx_patient_zuweisung_mitarbeiter (mitarbeiter_id)
idx_patient_zuweisung_status (status)
idx_benachrichtigungen_patient (patient_id)
idx_transfer_requests_status (status)
idx_transfer_requests_created (erstellt_am)
... and more
```

---

## 📡 API Documentation

### Authentication

#### POST `/api/login`
Login for all user types (Mitarbeiter & Patienten)

**Request Body:**
```json
{
  "username": "frank",
  "birthdate": "1985-05-15"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Willkommen, frank!",
  "user": {
    "id": 1,
    "username": "frank",
    "type": "mitarbeiter",
    "role": "pflegekraft"
  }
}
```

---

### Patient Management

#### GET `/api/patients`
Get all active patients

**Response:**
```json
[
  {
    "id": 1,
    "vorname": "Max",
    "nachname": "Mustermann",
    "standort": "Krefeld",
    "zimmer_nummer": "K123"
  }
]
```

#### POST `/api/admin/patients/register`
Register new patient (Admin only)

**Request Body:**
```json
{
  "adminId": 1,
  "benutzername": "maxm",
  "vorname": "Max",
  "nachname": "Mustermann",
  "geburtsdatum": "1950-03-20",
  "standort": "Krefeld",
  "assignmentMode": "automatic"  // or "manual" with manualPflegekraftId
}
```

**Response:**
```json
{
  "success": true,
  "message": "Patient erfolgreich registriert",
  "patient": { /* patient object */ },
  "assignmentMessage": "Automatisch Frank Schmidt zugewiesen (12/24 Patienten)",
  "loginCredentials": {
    "username": "maxm",
    "birthdate": "1950-03-20"
  }
}
```

#### GET `/api/admin/patients/detailed`
Get detailed patient list with assignments (Admin only)

---

### Health Data Management

#### POST `/api/health/data`
Record vital signs with automatic critical check

**Request Body:**
```json
{
  "patientId": 38,
  "mitarbeiterId": 2,
  "blutdruckSystolisch": 195,
  "blutdruckDiastolisch": 125,
  "puls": 95,
  "temperatur": 37.2,
  "sauerstoffsaettigung": 98,
  "bemerkungen": "Patient klagt über Kopfschmerzen"
}
```

**Response (Critical Values Detected):**
```json
{
  "success": true,
  "message": "Gesundheitsdaten gespeichert - KRITISCHE WERTE ERKANNT!",
  "healthData": { /* health data object */ },
  "critical": true
}
```
*Automatically sends alerts to assigned nurse and all admins*

#### GET `/api/patient/:patientId/vital-history`
Get patient's vital data history

**Query Params:** `?days=30` (default: 30)

---

### Patient Assignment

#### POST `/api/admin/assignments/manual`
Manually assign patient to nurse (Admin only)

**Request Body:**
```json
{
  "patientId": 10,
  "pflegekraftId": 3,
  "adminId": 1
}
```

**Error Response (Capacity Limit):**
```json
{
  "success": false,
  "message": "Pflegekraft hat bereits maximale Anzahl von Patienten (24)"
}
```

#### GET `/api/pflegekraft/patients-with-vitals/:mitarbeiterId`
Get assigned patients with latest vital signs

**Response:**
```json
{
  "success": true,
  "patients": [
    {
      "id": 5,
      "vorname": "Anna",
      "nachname": "Schmidt",
      "zimmer_nummer": "K105",
      "standort": "Krefeld",
      "latest_vitals": {
        "blutdruck_systolisch": 130,
        "blutdruck_diastolisch": 85,
        "puls": 75,
        "temperatur": 36.8,
        "sauerstoffsaettigung": 98,
        "ist_kritisch": false,
        "gemessen_am": "2025-01-15T14:30:00.000Z"
      }
    }
  ]
}
```

---

### Transfer Management

#### POST `/api/patient/transfer-requests`
Submit transfer request (Patient/Family)

**Request Body:**
```json
{
  "patientId": 15,
  "currentStandort": "Krefeld",
  "requestedStandort": "Mönchengladbach",
  "reason": "Näher zur Familie",
  "prioritaet": "normal",
  "requesterType": "patient",
  "requesterId": 15,
  "requesterName": "Max Mustermann"
}
```

#### GET `/api/admin/transfers/requests`
Get all pending transfer requests (Admin only)

**Response:**
```json
{
  "success": true,
  "requests": [
    {
      "id": 3,
      "patient_name": "Max Mustermann",
      "current_standort": "Krefeld",
      "gewuenschter_standort": "Mönchengladbach",
      "grund": "Näher zur Familie",
      "status": "pending",
      "prioritaet": "normal",
      "erstellt_am": "2025-01-15T10:00:00.000Z"
    }
  ]
}
```

#### POST `/api/admin/transfers/requests/:requestId/approve`
Approve transfer request with automatic reassignment

**Request Body:**
```json
{
  "adminId": 1,
  "adminResponse": "Transfer genehmigt - Pflegekraft am Zielort verfügbar"
}
```

**Process:**
1. Updates patient's `standort` in database
2. Logs transfer in `standort_verlauf`
3. Finds available nurse at new location (< 24 patients)
4. Updates `patient_zuweisung` to new nurse
5. Sends notifications to patient, old nurse, new nurse
6. Updates transfer request status to 'approved'

#### POST `/api/admin/transfers/requests/:requestId/reject`
Reject transfer request

---

### Dashboard APIs

#### GET `/api/dashboard/:mitarbeiterId`
Get nurse dashboard data

**Response:**
```json
{
  "success": true,
  "username": "Frank",
  "activePatients": 18,
  "completedAssignments": 24,
  "todaysAssignments": [
    {
      "id": 101,
      "patient": "Max Mustermann",
      "aufgabe": "Medikamentengabe",
      "zeit": "14:30",
      "status": "pending"
    }
  ]
}
```

#### GET `/api/admin/dashboard`
Get admin dashboard with system statistics

**Response:**
```json
{
  "success": true,
  "dashboard": {
    "location_statistics": {
      "patients": [
        { "standort": "Krefeld", "total_patients": 450, "assigned_patients": 440 },
        { "standort": "Mönchengladbach", "total_patients": 380, "assigned_patients": 375 }
      ],
      "pflegekraefte": [
        { "standort": "Krefeld", "total_pflegekraefte": 20, "avg_patients_per_pflegekraft": 22.0 }
      ]
    },
    "recent_transfers": [ /* last 5 transfers */ ],
    "workload_alerts": [ /* nurses with >20 patients */ ],
    "system_stats": {
      "total_active_patients": 830,
      "total_pflegekraefte": 38,
      "total_assignments": 820
    }
  }
}
```

---

### Notification System

#### GET `/api/notifications/critical/:userId`
Get unread critical notifications

**Query Params:** `?userType=mitarbeiter` or `?userType=patient`

**Response:**
```json
{
  "success": true,
  "criticalAlerts": [
    {
      "id": 50,
      "patient_name": "Anna Schmidt",
      "typ": "critical_health_alert",
      "titel": "🚨 KRITISCHER GESUNDHEITSZUSTAND",
      "nachricht": "🚨 KRITISCHER ZUSTAND: Anna Schmidt (Zimmer K105)\nKritische Werte: Blutdruck: 195/125, O2-Sättigung: 87%\nSofortige Aufmerksamkeit erforderlich!",
      "prioritaet": "urgent",
      "gelesen": false,
      "erstellt_am": "2025-01-15T15:45:00.000Z"
    }
  ]
}
```

#### PUT `/api/notifications/:notificationId/read`
Mark notification as read

---

### Demo & Testing

#### POST `/api/demo/critical-health`
Trigger demo critical health scenario

**Request Body:**
```json
{
  "patientId": 38,
  "scenario": "high_blood_pressure"  // or "low_oxygen", "high_fever", "multiple_critical"
}
```

**Available Scenarios:**
- `high_blood_pressure`: 195/125 mmHg
- `low_oxygen`: O2 87% + breathing difficulty
- `high_fever`: 39.8°C + weakness
- `multiple_critical`: Multiple critical values (emergency)
- `normal`: Normal values (no alert)

#### GET `/api/demo/patients`
Get demo patients for testing

---

## 📱 Usage Examples

### Example 1: Nurse Records Critical Vital Signs

```bash
# 1. Nurse logs in
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username": "frank", "birthdate": "1985-05-15"}'

# Response: {"success": true, "user": {"id": 2, "type": "mitarbeiter", "role": "pflegekraft"}}

# 2. Nurse records vital signs for patient
curl -X POST http://localhost:3000/api/health/data \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": 38,
    "mitarbeiterId": 2,
    "blutdruckSystolisch": 195,
    "blutdruckDiastolisch": 125,
    "puls": 95,
    "temperatur": 37.2,
    "sauerstoffsaettigung": 98,
    "bemerkungen": "Patient klagt über Kopfschmerzen"
  }'

# System automatically:
# - Detects ist_kritisch = true (BP > 180/120)
# - Sends urgent alert to Frank (assigned nurse)
# - Sends urgent alert to all admins
# - Records in benachrichtigungen table

# 3. Check notifications
curl http://localhost:3000/api/notifications/critical/2?userType=mitarbeiter

# Response: Critical alert with patient details and vital values
```

### Example 2: Patient Requests Transfer

```bash
# 1. Patient logs in
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username": "maxm", "birthdate": "1950-03-20"}'

# 2. Patient submits transfer request
curl -X POST http://localhost:3000/api/patient/transfer-requests \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": 10,
    "currentStandort": "Krefeld",
    "requestedStandort": "Mönchengladbach",
    "reason": "Möchte näher bei Familie sein",
    "prioritaet": "normal",
    "requesterType": "patient",
    "requesterId": 10,
    "requesterName": "Max Mustermann"
  }'

# Response: {"success": true, "message": "Transfer-Anfrage erfolgreich erstellt"}

# 3. Admin reviews pending requests
curl http://localhost:3000/api/admin/transfers/requests

# 4. Admin approves transfer
curl -X POST http://localhost:3000/api/admin/transfers/requests/3/approve \
  -H "Content-Type: application/json" \
  -d '{
    "adminId": 1,
    "adminResponse": "Transfer genehmigt"
  }'

# System automatically:
# - Updates patient standort to "Mönchengladbach"
# - Finds available nurse at new location (< 24 patients)
# - Updates patient_zuweisung to new nurse
# - Logs transfer in standort_verlauf
# - Sends notifications to patient, old nurse, new nurse
```

### Example 3: Admin Registers New Patient

```bash
# Admin registers patient with automatic assignment
curl -X POST http://localhost:3000/api/admin/patients/register \
  -H "Content-Type: application/json" \
  -d '{
    "adminId": 1,
    "benutzername": "annas",
    "vorname": "Anna",
    "nachname": "Schmidt",
    "geburtsdatum": "1948-07-12",
    "standort": "Krefeld",
    "assignmentMode": "automatic"
  }'

# System automatically:
# - Generates unique username if conflict
# - Creates patient record with default values
# - Finds nurse with fewest patients at Krefeld (< 24)
# - Creates patient_zuweisung entry
# - Sends notification to assigned nurse
# - Returns login credentials

# Response includes:
# - Patient details
# - Assignment info: "Automatisch Maria Müller zugewiesen (15/24 Patienten)"
# - Login credentials for patient
```

### Example 4: Testing 24-Patient Limit

```bash
# 1. Set nurse to 24 patients for testing
curl -X POST http://localhost:3000/api/test/set-pflegekraft-to-limit \
  -H "Content-Type: application/json" \
  -d '{"pflegekraftId": 3, "targetPatientCount": 24}'

# Response: {"success": true, "readyForLimitTest": true, "newPatientCount": 24}

# 2. Try to assign 25th patient manually
curl -X POST http://localhost:3000/api/admin/assignments/manual \
  -H "Content-Type: application/json" \
  -d '{"patientId": 50, "pflegekraftId": 3, "adminId": 1}'

# Response: 
# {
#   "success": false, 
#   "message": "Pflegekraft hat bereits maximale Anzahl von Patienten (24)"
# }

# 3. Try automatic assignment (bypasses full nurse)
curl -X POST http://localhost:3000/api/admin/patients/register \
  -H "Content-Type: application/json" \
  -d '{
    "adminId": 1,
    "benutzername": "testp",
    "vorname": "Test",
    "nachname": "Patient",
    "geburtsdatum": "1960-01-01",
    "standort": "Krefeld",
    "assignmentMode": "automatic"
  }'

# System finds next available nurse with < 24 patients
```

---

## 📸 Screenshots

### Login Page
*Clean authentication interface supporting all user roles*

### Admin Dashboard
*System overview with location statistics, workload alerts, and pending transfers*

### Nurse Dashboard
*Assigned patients (18/24), today's tasks, critical alerts*

### Patient Dashboard
*Current location, assigned nurse, health summary, transfer request form*

### Demo Health Alerts Page
*Interactive testing tool with predefined critical scenarios*

### Critical Alert Modal
*🚨 Real-time notification popup with patient details and vital values*

---

## 👥 Team

**3-Person Development Team**

- **Muhammad Bagier Alaydrus** - [GitHub](https://github.com/bagieralaydrus) | [LinkedIn](https://linkedin.com/in/bagier-alaydrus)
  - Project lead, backend architecture, database design
  - Assignment algorithm implementation
  - Health monitoring system & alert logic
  
- **Eren Cicekli** - Full-stack development
  - Frontend dashboard implementation
  - API integration
  
- **Gian Piero Caruso** - Frontend & UX
  - UI/UX design
  - Responsive layouts
  - Form validation

**Academic Supervision**
- **Course**: Website Engineering (Hochschule Niederrhein)
- **Grade**: 1.3

---

## 🔒 Security Features

### Authentication
- **Session-based authentication** using username + birthdate
- **Role-based authorization** middleware for protected routes
- **Input validation** on all user inputs
- **SQL injection prevention** via parameterized queries
- **Password-free design** for patient accessibility (birthdate authentication)

### Data Protection
- **PostgreSQL transactions** for data consistency
- **Cascade delete rules** to maintain referential integrity
- **Unique constraints** to prevent duplicate users
- **UTF-8 encoding** throughout system for international character support

### Error Handling
- **Try-catch blocks** on all database operations
- **Transaction rollback** on error conditions
- **Graceful degradation** when services unavailable
- **User-friendly error messages** (no stack traces exposed)

---

## 🎯 Assignment Algorithm Details

### Load Balancing Strategy

The system uses a **least-loaded first-fit algorithm** with location awareness:

```javascript
// Simplified algorithm logic
async function findAvailablePflegekraft(location) {
    // 1. Query all nurses at the specified location
    // 2. Join with patient_zuweisung to count current assignments
    // 3. Filter: current_patients < 24 AND status = 'active'
    // 4. Sort by: current_patients ASC, id ASC
    // 5. Return first result (least loaded nurse)
}
```

### Key Constraints
- **Hard Limit**: 24 patients per nurse (configurable in algorithm)
- **Location Constraint**: Nurses only assigned patients at their facility
- **Single Assignment**: Each patient has exactly one nurse (UNIQUE constraint)
- **Active Status**: Only active nurses/patients considered

### Assignment Scenarios

#### Scenario 1: New Patient Registration
```
1. Admin registers patient at Krefeld
2. System queries: SELECT nurse WITH min(patients) WHERE location='Krefeld' AND patients < 24
3. If found → Create patient_zuweisung entry → Notify nurse
4. If not found → Patient unassigned → Alert admin
```

#### Scenario 2: Patient Transfer Between Locations
```
1. Patient at Krefeld transfers to Mönchengladbach
2. System updates patient.standort = 'Mönchengladbach'
3. Old nurse (Krefeld) assignment deactivated
4. System queries: Find available nurse at Mönchengladbach
5. If found → Update patient_zuweisung to new nurse
6. If not found → Patient temporarily unassigned
7. Notifications sent to all affected parties
```

#### Scenario 3: Nurse Reaches 24-Patient Limit
```
1. Admin attempts manual assignment to Nurse A (24/24)
2. System checks: COUNT(assignments) WHERE nurse_id = A
3. Returns error: "Pflegekraft hat bereits maximale Anzahl von Patienten (24)"
4. Admin must choose different nurse or wait for capacity
```

#### Scenario 4: Patient Discharge
```
1. Admin sets patient status = 'discharged'
2. System updates patient_zuweisung.status = 'discharged'
3. Nurse now has capacity (23/24)
4. System does NOT auto-assign (manual decision)
```

### Algorithm Performance
- **Time Complexity**: O(log n) for sorted query with index
- **Space Complexity**: O(1) per assignment
- **Scalability**: Handles 1000+ patients efficiently with proper indexing

---

## 🚨 Health Alert System Architecture

### Critical Thresholds

| Vital Sign | Normal Range | Warning | Critical |
|------------|--------------|---------|----------|
| **Blood Pressure (Systolic)** | 90-160 mmHg | 160-180 or 90-100 | >180 or <90 |
| **Blood Pressure (Diastolic)** | 60-100 mmHg | 100-120 or 60-70 | >120 or <60 |
| **Pulse** | 60-100 bpm | 100-120 or 50-60 | >120 or <50 |
| **Temperature** | 36-38°C | 38-39 or 35-36 | >39 or <35 |
| **Oxygen Saturation** | 95-100% | 90-95% | <90% |

### Alert Priority Levels

#### 🔴 URGENT (Priority: urgent)
- **Trigger**: Any critical threshold exceeded
- **Recipients**: 
  1. Assigned nurse (immediate notification)
  2. All administrators (immediate notification)
  3. Backup nurses at same location (if no assigned nurse)
- **Response Time Expected**: < 5 minutes
- **Examples**: BP 195/125, O2 87%, Multiple critical values

#### 🟠 HIGH (Priority: high)
- **Trigger**: Warning threshold exceeded OR system issues
- **Recipients**: Administrators, relevant nurses
- **Response Time Expected**: < 30 minutes
- **Examples**: Patient unassigned, 24-patient limit reached

#### 🟡 NORMAL (Priority: normal)
- **Trigger**: Routine notifications
- **Recipients**: Specific user (patient, nurse, admin)
- **Response Time Expected**: 24 hours
- **Examples**: Transfer approved, new patient assigned, appointment reminder

### Alert Workflow

```
Health Data Input (Nurse records vitals)
          ↓
Automatic Calculation (Server-side)
          ↓
    ist_kritisch = true?
          ↓
    [YES] → Trigger checkCriticalHealthData()
          ↓
Query: Patient info + Assigned nurse + Location
          ↓
Generate alert message with:
  - Patient name & room number
  - All critical values
  - Timestamp
  - Recommendations
          ↓
INSERT INTO benachrichtigungen (Parallel):
  1. Assigned nurse (urgent)
  2. All admins (urgent)
  3. Backup staff if needed
          ↓
Dashboard Update (Next polling/refresh)
          ↓
Nurse acknowledges → UPDATE gelesen = true
```

### Alert Message Template

```
🚨 KRITISCHER ZUSTAND: Anna Schmidt (Zimmer K105)

Kritische Werte:
- Blutdruck: 195/125 mmHg (Normal: 90-160/60-100)
- O2-Sättigung: 87% (Normal: >95%)

Bemerkung: Patient klagt über Atemnot

⚠️ Sofortige Aufmerksamkeit erforderlich!

Gemessen am: 15.01.2025 15:45 Uhr
Gemessen von: Frank Schmidt (Pflegekraft)
```

---

## 📊 System Statistics & Monitoring

### Real-time Metrics Tracked

#### Patient Metrics
- Total active patients
- Patients per location (Krefeld, Mönchengladbach, Zuhause)
- Assigned vs. unassigned patients
- Patients with critical health status
- New admissions (last 7/30 days)
- Discharges (last 7/30 days)

#### Nurse Workload Metrics
- Total active nurses
- Average patients per nurse (by location)
- Nurses at capacity (24/24)
- Nurses near capacity (>20 patients)
- Underutilized nurses (<10 patients)
- Workload distribution variance

#### System Health Metrics
- Database connection status
- Total API calls per hour
- Average response time
- Critical alerts sent (last 24 hours)
- Pending transfer requests
- Unread notifications count

### Admin Dashboard Widgets

**1. Location Statistics Card**
```
┌─────────────────────────────────┐
│  📍 Krefeld                      │
│  Patients: 450 (440 assigned)   │
│  Nurses: 20 (avg 22.0 patients) │
│  Capacity: 92%                   │
└─────────────────────────────────┘
```

**2. Workload Alerts Card**
```
┌─────────────────────────────────┐
│  ⚠️ Workload Warnings            │
│  • Maria Müller: 24/24 patients │
│  • Frank Schmidt: 23/24 patients│
│  Action: Consider redistribution│
└─────────────────────────────────┘
```

**3. Recent Transfers Card**
```
┌─────────────────────────────────┐
│  🔄 Recent Transfers (Last 7d)  │
│  • Max M.: Krefeld → MG (Today) │
│  • Anna S.: MG → Krefeld (2d)   │
│  Total: 12 transfers this week  │
└─────────────────────────────────┘
```

**4. Critical Alerts Card**
```
┌─────────────────────────────────┐
│  🚨 Critical Alerts (24h)       │
│  • 3 high blood pressure alerts │
│  • 1 low oxygen alert           │
│  • 0 unacknowledged (GOOD!)     │
└─────────────────────────────────┘
```

---

## 🧪 Testing & Quality Assurance

### Testing Features Implemented

#### 1. Demo Health Alert System
- **File**: `demo-health-alerts.html`
- **Purpose**: Interactive testing of critical alert scenarios
- **Features**:
  - Predefined test patient (Sophia Schwarz, ID: 38)
  - 4 critical scenarios + 1 normal scenario
  - Real-time dashboard integration
  - Visual feedback on alert triggering

**Test Scenarios:**
- `high_blood_pressure`: 195/125 mmHg
- `low_oxygen`: 87% O2 + breathing difficulty symptoms
- `high_fever`: 39.8°C + weakness
- `multiple_critical`: Emergency scenario with multiple critical values
- `normal`: All values in normal range (control test)

#### 2. API Test Endpoints
- `POST /api/test/set-pflegekraft-to-limit`: Artificially set nurse to 24 patients
- `GET /api/test/pflegekraefte-for-limit-test`: List nurses with capacity info
- `GET /api/debug/patient/:patientId`: Inspect patient assignment status
- `GET /api/debug/all-assignments`: View all patient-nurse relationships
- `GET /api/debug/pflegekraft-workload`: Analyze workload distribution

#### 3. Database Integrity Checks
```sql
-- Check for orphaned assignments (patients with no nurse)
SELECT p.* FROM patienten p 
LEFT JOIN patient_zuweisung pz ON p.id = pz.patient_id 
WHERE pz.id IS NULL AND p.status = 'active';

-- Check for over-capacity nurses
SELECT m.id, COUNT(pz.patient_id) as patient_count 
FROM mitarbeiter m 
JOIN patient_zuweisung pz ON m.id = pz.mitarbeiter_id 
WHERE pz.status = 'active' 
GROUP BY m.id 
HAVING COUNT(pz.patient_id) > 24;

-- Check for duplicate assignments
SELECT patient_id, COUNT(*) 
FROM patient_zuweisung 
WHERE status = 'active' 
GROUP BY patient_id 
HAVING COUNT(*) > 1;
```

### Manual Testing Checklist

#### Patient Registration Flow
- [ ] Register patient with automatic assignment (capacity available)
- [ ] Register patient with automatic assignment (all nurses at 24)
- [ ] Register patient with manual assignment (valid nurse)
- [ ] Register patient with manual assignment (nurse at 24-limit)
- [ ] Verify unique username generation on conflict

#### Health Alert Flow
- [ ] Record normal vital signs (no alert)
- [ ] Record high blood pressure (alert sent)
- [ ] Record low oxygen (alert sent)
- [ ] Record multiple critical values (urgent alert)
- [ ] Verify alerts appear in nurse dashboard
- [ ] Verify alerts appear in admin dashboard
- [ ] Mark alert as read (gelesen = true)

#### Transfer Request Flow
- [ ] Patient submits transfer request (valid locations)
- [ ] Patient submits transfer request (invalid same location)
- [ ] Admin approves transfer (nurse available at destination)
- [ ] Admin approves transfer (no nurse available)
- [ ] Admin rejects transfer with reason
- [ ] Patient cancels pending transfer
- [ ] Verify notifications sent to all parties

#### Assignment Algorithm
- [ ] New patient assigned to least-loaded nurse
- [ ] Transfer triggers reassignment at new location
- [ ] Manual assignment respects 24-patient limit
- [ ] Discharged patient frees up nurse capacity
- [ ] Location constraint enforced (nurse only gets local patients)

---

## 🔮 Future Enhancements

### Planned Features (V2.0)

#### 1. Real-time WebSocket Notifications
**Current**: Polling-based dashboard updates  
**Future**: WebSocket connection for instant push notifications
```javascript
// Planned implementation
const io = require('socket.io')(server);
io.on('connection', (socket) => {
  socket.on('subscribe', (userId, userType) => {
    socket.join(`${userType}-${userId}`);
  });
});
// Emit on critical alert
io.to(`pflegekraft-${nurseId}`).emit('critical-alert', alertData);
```

#### 2. Mobile Application
- React Native app for nurses (iOS/Android)
- Quick vital sign recording with camera input
- Push notifications for critical alerts
- Offline mode with sync on reconnection

#### 3. Advanced Analytics Dashboard
- **Trend Analysis**: Patient health trends over time (graphs)
- **Predictive Alerts**: ML model to predict health deterioration
- **Workload Heatmap**: Visual representation of nurse capacity by time/day
- **Transfer Pattern Analysis**: Identify frequent transfer routes

#### 4. Family Portal Enhancement
- **Video Calls**: Scheduled video visits with patients
- **Photo Sharing**: Family can upload photos for patients
- **Care Plan Visibility**: View upcoming appointments and treatments
- **Feedback System**: Rate care quality and provide comments

#### 5. Medication Management
- **Barcode Scanning**: Scan medication to verify correct drug/dose
- **Automated Reminders**: Push notifications at medication times
- **Interaction Checker**: Alert on drug-drug interactions
- **Inventory Tracking**: Monitor medication stock levels

#### 6. Shift Management
- **Nurse Scheduling**: Automated shift roster generation
- **Shift Handover**: Digital handover notes between shifts
- **Overtime Tracking**: Monitor and balance nurse work hours
- **On-call Management**: Track and notify on-call nurses

#### 7. Integration with Medical Devices
- **IoT Sensors**: Automatic vital sign collection from wearables
- **Smart Beds**: Pressure sensors to detect falls or movement
- **Alert Escalation**: Multi-tier escalation if nurse doesn't respond

#### 8. Reporting & Compliance
- **Regulatory Reports**: Auto-generate reports for health authorities
- **Audit Trail**: Complete log of all data access and changes
- **Export to EHR**: Integration with external Electronic Health Records
- **GDPR Compliance**: Enhanced data protection features

#### 9. AI-Powered Features
- **Chatbot for Patients**: Answer common questions 24/7
- **Intelligent Assignment**: ML-based assignment considering nurse skills
- **Risk Prediction**: Identify high-risk patients before critical events
- **Voice Commands**: Hands-free vital sign recording for nurses

### Known Limitations (V1.0)

#### Technical Limitations
- **No Real-time Updates**: Dashboards require manual refresh
- **Single Database Instance**: No high-availability setup
- **No Load Balancing**: Single server handles all requests
- **Limited File Upload**: No document/image upload capability
- **No Email Integration**: Notifications only in-app

#### Business Logic Limitations
- **Fixed 24-Patient Limit**: Not configurable per nurse skill level
- **Simple Assignment**: Doesn't consider nurse specializations
- **No Patient Preferences**: Can't request specific nurse
- **Limited Transfer Reasons**: Free-text only, no categorization
- **No Emergency Override**: Can't exceed 24-patient limit even in crisis

#### Security Limitations
- **No Password System**: Relies on birthdate authentication
- **No 2FA**: No two-factor authentication option
- **No Session Timeout**: Sessions persist indefinitely
- **No Rate Limiting**: No API throttling implemented
- **No HTTPS Enforcement**: Runs on HTTP in development

---

## 🐛 Troubleshooting

### Common Issues & Solutions

#### Issue 1: Database Connection Failed
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
**Solution:**
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Start PostgreSQL if stopped
sudo systemctl start postgresql

# Verify connection
psql -U postgres -d pflegeplus -c "SELECT NOW();"
```

#### Issue 2: UTF-8 Encoding Problems (ÃŸ, Ã¤, Ã¶)
```
Patient name displays as: "MÃ¼ller" instead of "Müller"
```
**Solution:**
```bash
# Run encoding fix endpoint
curl -X POST http://localhost:3000/api/admin/fix-encoding

# Or manually in PostgreSQL
psql -U postgres pflegeplus
SET client_encoding = 'UTF8';
UPDATE patienten SET nachname = REPLACE(nachname, 'Ã¼', 'ü');
```

#### Issue 3: Port 3000 Already in Use
```
Error: listen EADDRINUSE: address already in use :::3000
```
**Solution:**
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use different port
PORT=3001 npm start
```

#### Issue 4: Patient Assignment Not Working
**Symptoms**: New patients remain unassigned  
**Solution:**
```sql
-- Check if nurses exist and are active
SELECT * FROM mitarbeiter WHERE rolle = 'pflegekraft' AND status = 'active';

-- Check nurse capacity
SELECT m.id, m.benutzername, COUNT(pz.patient_id) as current_patients
FROM mitarbeiter m
LEFT JOIN patient_zuweisung pz ON m.id = pz.mitarbeiter_id
WHERE m.rolle = 'pflegekraft' AND pz.status = 'active'
GROUP BY m.id, m.benutzername;

-- If all nurses at 24, create new nurse or discharge patients
```

#### Issue 5: Critical Alerts Not Appearing
**Symptoms**: ist_kritisch = true but no notifications  
**Debug Steps:**
```bash
# 1. Check if health data was inserted
curl http://localhost:3000/api/patient/38/vital-history?days=1

# 2. Check if notifications were created
curl http://localhost:3000/api/notifications/critical/2?userType=mitarbeiter

# 3. Check server logs for errors
tail -f server.log
```

#### Issue 6: Transfer Request Fails
**Error**: "Patient ist bereits am gewünschten Standort"  
**Solution:**
```sql
-- Check patient's current location
SELECT id, vorname, nachname, standort FROM patienten WHERE id = 10;

-- If wrong, update manually
UPDATE patienten SET standort = 'Krefeld' WHERE id = 10;
```

---

## 📄 License

This project is licensed under the **MIT License**.

```
MIT License

Copyright (c) 2025 Muhammad Bagier Alaydrus, Eren Cicekli, Gian Piero Caruso

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 🙏 Acknowledgments

- **Hochschule Niederrhein** - For providing the academic framework and resources
- **Website Engineering Course Team** - For guidance and feedback
- **Open Source Community** - For the excellent libraries used (Express, pg, node-postgres)
- **PostgreSQL Team** - For the robust database system
- **Stack Overflow Community** - For troubleshooting assistance during development

---

## 📞 Contact & Support

### Project Lead
**Muhammad Bagier Alaydrus**  
📧 Email: alaydrusbagier@gmail.com  
🔗 LinkedIn: [linkedin.com/in/bagier-alaydrus](https://linkedin.com/in/bagier-alaydrus)  
💻 GitHub: [github.com/bagieralaydrus](https://github.com/bagieralaydrus)

### Repository
🔗 GitHub Repository: [github.com/mubag001/PflegePlus](https://github.com/mubag001/PflegePlus)

### Bug Reports & Feature Requests
Please use GitHub Issues for bug reports and feature requests:
- 🐛 Bug Report: [Create Issue](https://github.com/mubag001/PflegePlus/issues)
- 💡 Feature Request: [Create Issue](https://github.com/mubag001/PflegePlus/issues)

### Academic Inquiries
For questions related to the academic aspects of this project:
- **Institution**: Hochschule Niederrhein, Krefeld
- **Course**: Website Engineering
- **Semester**: Summer 2025

---

## 🚀 Quick Start Summary

```bash
# Clone repository
git clone https://github.com/mubag001/PflegePlus.git
cd PflegePlus

# Install dependencies
npm install

# Setup PostgreSQL
psql -U postgres -c "CREATE DATABASE pflegeplus;"
psql -U postgres pflegeplus < pflegeplus_schema.sql

# Configure database (edit server.js line 23-25)
# Change password: 'YOUR_PASSWORD'

# Start server
npm start

# Access application
open http://localhost:3000
```

**Default Test Users:**
- Admin: `admin` / `1980-01-01`
- Nurse: `frank` / `1985-05-15`
- Patient: `sophia` / `1945-03-15`

---

## 📚 Additional Resources

### Documentation
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

### Related Technologies
- [RESTful API Design](https://restfulapi.net/)
- [SQL Indexing Strategies](https://use-the-index-luke.com/)
- [Database Normalization](https://en.wikipedia.org/wiki/Database_normalization)

### Healthcare IT Standards (For Future Integration)
- [HL7 FHIR](https://www.hl7.org/fhir/) - Healthcare data exchange standard
- [DICOM](https://www.dicomstandard.org/) - Medical imaging standard
- [ICD-10](https://www.who.int/standards/classifications/classification-of-diseases) - Disease classification

---

**⭐ If you find this project helpful, please consider giving it a star on GitHub!**

---

*Last Updated: January 2025*  
*Version: 1.0.0*  
*Status: Production-Ready for Academic Demonstration*
