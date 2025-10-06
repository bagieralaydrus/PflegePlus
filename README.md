# PflegeVision 

**Healthcare Management System for Nursing Facilities**

A full-stack web application for managing patient care coordination, automated health monitoring, and nurse workload optimization across multiple facility locations.

[![Node.js](https://img.shields.io/badge/Node.js-18.x-green.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17.5-blue.svg)](https://www.postgresql.org/)
[![Express](https://img.shields.io/badge/Express-4.21.2-lightgrey.svg)](https://expressjs.com/)

**Project Context:** Software Engineering Course | Hochschule Niederrhein | June 2025

---

##  Overview

PflegeVision is a nursing home management platform that handles **1000+ patient records** across multiple locations (Krefeld, Mönchengladbach, home care) with support for **200+ concurrent users**. The system automates patient-to-nurse assignments, monitors vital signs in real-time, and manages patient transfers between facilities.

### Key Achievements
- **Intelligent Assignment Algorithm**: Automatically distributes patients to nurses (max 24 per nurse)
- **Real-Time Health Monitoring**: Automatic critical alerts when vital signs exceed thresholds
- **Multi-Location Management**: Seamless patient transfers with automatic nurse reassignment
- **Role-Based Access**: 4 user types (Admin, Nurse, Patient, Family) with tailored dashboards

---

##  Core Features

###  Automated Health Monitoring
- Tracks blood pressure, pulse, temperature, oxygen saturation, weight, blood sugar
- **Critical alerts** triggered automatically when thresholds exceeded:
  - BP >180/120 or <90/60 mmHg
  - O2 <90%
  - Temperature >39°C or <35°C
  - Pulse >120 or <50 bpm
- Notifications sent to assigned nurse and administrators immediately

###  Smart Patient Assignment
- **24-patient limit** enforced per nurse
- Automatic workload balancing using least-loaded strategy
- Location-aware assignment (nurses only get patients at their facility)
- Dynamic reassignment when patients transfer locations

###  Transfer Management
- Patients/family can request location transfers with justification
- Admin approval workflow (approve/reject with comments)
- Automatic nurse reassignment upon transfer approval
- Complete transfer history tracking

###  Role-Based Dashboards
1. **Administrator**: Patient registration, transfer approvals, workload statistics, system management
2. **Nurse (Pflegekraft)**: Assigned patients (max 24), vital sign recording, task management, critical alerts
3. **Patient**: Health data view, transfer requests, assigned nurse info, appointment schedule
4. **Family (Angehörige)**: Patient health status, limited medical info, transfer request capability

---

##  Technology Stack

**Backend:**
- Node.js 18.x + Express.js 4.21.2
- PostgreSQL 17.5 with 11 normalized tables
- node-postgres (pg) for database operations

**Frontend:**
- Vanilla HTML5/CSS3/JavaScript (no frameworks)
- Responsive design with Flexbox/Grid
- Font Awesome 5 icons

**Architecture:**
- RESTful API with 50+ endpoints
- Client-server model with role-based authentication
- Transaction-based operations for data consistency

---

##  Database Schema

**11 Tables:**
- `patienten` - Patient records with location and room assignments
- `mitarbeiter` - Staff (admins and nurses) with roles and locations
- `patient_zuweisung` - Patient-to-nurse assignments (max 24 per nurse)
- `gesundheitsdaten` - Health vital signs with automatic critical detection
- `benachrichtigungen` - Notification system with priority levels
- `transfer_requests` - Patient transfer requests with approval workflow
- `standort_verlauf` - Location change history
- `medikamenten_plan` - Medication schedules
- `angehoerige` - Family members with access permissions
- `assignments` - Daily care tasks
- And more...

**Key Constraints:**
- UNIQUE(patient_id) in patient_zuweisung ensures 1:1 assignment
- Foreign keys with CASCADE DELETE for referential integrity
- 15+ indexes for optimized queries

---

##  Quick Start

```bash
# Clone and install
git clone https://github.com/mubag001/PflegePlus.git
cd PflegePlus
npm install

# Setup database
psql -U postgres -c "CREATE DATABASE pflegeplus;"
psql -U postgres pflegeplus < pflegeplus_schema.sql

# Configure database connection in server.js (line 20-28)
# Change password: 'YOUR_PASSWORD'

# Start server
npm start

# Access at http://localhost:3000
```

**Test Credentials:**
- Admin: `admin` / `1980-01-01`
- Nurse: `frank` / `1985-05-15`
- Patient: `sophia` / `1945-03-15`

---

##  How It Works

### Patient Assignment Algorithm
```
1. New patient registered at Krefeld
2. System finds nurse with fewest patients at Krefeld (< 24)
3. Creates patient_zuweisung entry
4. Sends notification to assigned nurse
5. If no nurse available → patient unassigned, admin alerted
```

### Critical Health Alert Flow
```
1. Nurse records vital signs: BP 195/125
2. System auto-detects critical value (>180/120)
3. Sets ist_kritisch = true in database
4. Sends urgent alerts to:
   - Assigned nurse
   - All administrators
   - Backup nurses at same location (if needed)
5. Dashboard updates with critical notification
6. Nurse acknowledges alert
```

### Transfer Request Workflow
```
1. Patient/family requests transfer: Krefeld → Mönchengladbach
2. Request stored with status = 'pending'
3. Admin reviews and approves
4. System updates patient.standort = 'Mönchengladbach'
5. Finds available nurse at new location
6. Updates patient_zuweisung to new nurse
7. Logs transfer in standort_verlauf
8. Notifications sent to patient, old nurse, new nurse
```

---

##  System Statistics

- **Capacity**: 1000+ patient records, 200+ concurrent users
- **Locations**: 3 facilities (Krefeld, Mönchengladbach, Home Care)
- **Workload Limit**: 24 patients per nurse (enforced)
- **API Endpoints**: 50+ RESTful routes
- **Database Tables**: 11 normalized tables
- **Alert Types**: 3 priority levels (urgent, high, normal)

---

##  Demo & Testing

**Demo Page**: `http://localhost:3000/demo-health-alerts`

Interactive testing tool with predefined critical scenarios:
- High blood pressure (195/125)
- Low oxygen (87%)
- High fever (39.8°C)
- Multiple critical values
- Normal values (control)

---

##  Team

**3-Person Development Team** - Hochschule Niederrhein

- **Muhammad Bagier Alaydrus** - Backend, database, assignment algorithm, health monitoring
- **Eren Cicekli** - Full-stack development, API integration
- **Gian Piero Caruso** - Frontend, UI/UX design, responsive layouts

**Course**: Website Engineering (Grade: 1.3)  
**Institution**: Hochschule Niederrhein, Krefeld  
**Semester**: June 2025

---

##  Features Showcase

- **Login System**: Role-based authentication (username + birthdate)
- **Admin Dashboard**: System overview, workload statistics, pending transfer requests
- **Nurse Dashboard**: Assigned patients (18/24), today's tasks, critical alerts
- **Patient Dashboard**: Health summary, assigned nurse, transfer request form
- **Alert System**: Real-time critical health notifications with priority levels
- **Transfer Management**: Request, review, approve/reject workflow

---

##  Future Improvements

- Real-time WebSocket notifications (replace polling)
- Mobile application for nurses (React Native)
- Advanced analytics with health trend graphs
- IoT integration for automatic vital sign collection
- ML-based predictive health alerts
- Video call feature for family visits

---

**Repository**: [github.com/mubag001/PflegePlus](https://github.com/mubag001/PflegePlus)

---

*Developed as part of Software Engineering course at Hochschule Niederrhein | June 2025*
