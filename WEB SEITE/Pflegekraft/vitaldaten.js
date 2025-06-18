document.addEventListener('DOMContentLoaded', () => {
    const patientSearchInput = document.getElementById('patientSearch');
    const filterCriticalSelect = document.getElementById('filterCritical');
    const patientsGrid = document.getElementById('patientsGrid');
    const patientCountSpan = document.getElementById('patientCount');
    const recentVitalDataTable = document.querySelector('#recentVitalDataTable tbody');
    const modalPatientSelect = document.getElementById('modalPatientSelect');
    const vitalDataForm = document.getElementById('vitalDataForm');

    // Aktueller Benutzer aus sessionStorage
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
    const mitarbeiterId = currentUser.id;

    // Benutzerauthentifizierung prüfen
    if (!mitarbeiterId) {
        alert('Benutzer nicht gefunden. Bitte loggen Sie sich erneut ein.');
        window.location.href = '/';
        return;
    }

    // Navigation aktiv markieren
    const navLinks = document.querySelectorAll('.nav a');
    navLinks.forEach(link => {
        if (link.getAttribute('href') === 'vitaldaten.html') {
            link.classList.add('active');
        }
    });

    let allPatients = [];
    let filteredPatients = [];

    // Seite initialisieren
    initializePage();

    async function initializePage() {
        try {
            await loadAssignedPatients();
            await loadRecentVitalData();
            setupEventListeners();
        } catch (error) {
            console.error('Initialisierungsfehler:', error);
            showNotification('Fehler beim Laden der Seite', 'error');
        }
    }

    // Zugewiesene Patienten mit neuesten Vitaldaten laden
    async function loadAssignedPatients() {
        try {
            showLoading(patientsGrid);

            const response = await fetch(`/api/pflegekraft/patients-with-vitals/${mitarbeiterId}`);
            if (!response.ok) throw new Error('Network response was not ok');

            const data = await response.json();

            if (data.success) {
                allPatients = data.patients;
                filteredPatients = allPatients;
                renderPatients(filteredPatients);
                updatePatientCount(filteredPatients.length);
                populatePatientSelect();
            } else {
                throw new Error(data.message || 'Failed to load patients');
            }
        } catch (error) {
            console.error('Fehler beim Laden der Patienten:', error);
            patientsGrid.innerHTML = `
                <div class="error-message">
                    <p>Fehler beim Laden der Patientendaten.</p>
                    <button class="btn-primary" onclick="location.reload()">Erneut versuchen</button>
                </div>
            `;
        }
    }

    // Kürzlich erfasste Vitaldaten laden
    async function loadRecentVitalData() {
        try {
            const response = await fetch(`/api/pflegekraft/recent-vital-data/${mitarbeiterId}`);
            if (!response.ok) throw new Error('Network response was not ok');

            const data = await response.json();

            if (data.success) {
                renderRecentVitalData(data.vitalData);
            } else {
                throw new Error(data.message || 'Failed to load recent vital data');
            }
        } catch (error) {
            console.error('Fehler beim Laden der kürzlichen Vitaldaten:', error);
            recentVitalDataTable.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; color: #666;">
                        Fehler beim Laden der Daten
                    </td>
                </tr>
            `;
        }
    }

    // Event Listeners einrichten
    function setupEventListeners() {
        // Suchfunktion
        patientSearchInput.addEventListener('input', debounce(filterPatients, 300));

        // Filter für kritische Werte
        filterCriticalSelect.addEventListener('change', filterPatients);

        // Formular für neue Vitaldaten
        vitalDataForm.addEventListener('submit', handleVitalDataSubmit);

        // Modal-Schließen bei Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeAddVitalDataModal();
                closeDetailsModal();
            }
        });
    }

    // Patienten rendern
    function renderPatients(patients) {
        if (patients.length === 0) {
            patientsGrid.innerHTML = `
                <div class="no-patients">
                    <p>Keine Patienten gefunden.</p>
                </div>
            `;
            return;
        }

        patientsGrid.innerHTML = patients.map(patient => {
            const latestVitals = patient.latest_vitals;
            const status = getPatientVitalStatus(latestVitals);
            const statusClass = status.class;
            const statusText = status.text;

            return `
                <div class="patient-card ${statusClass}">
                    <div class="patient-header">
                        <div>
                            <div class="patient-name">${patient.vorname} ${patient.nachname}</div>
                            <div class="patient-info">
                                Zimmer: ${patient.zimmer_nummer || 'N/A'} | 
                                ${patient.standort || 'Unbekannt'}
                            </div>
                        </div>
                        <div class="patient-status ${statusClass}">${statusText}</div>
                    </div>
                    
                    ${latestVitals ? `
                        <div class="vital-signs">
                            ${latestVitals.blutdruck_systolisch ? `
                                <div class="vital-item ${getVitalItemClass('blood_pressure', latestVitals.blutdruck_systolisch, latestVitals.blutdruck_diastolisch)}">
                                    <span class="vital-label">Blutdruck</span>
                                    <span class="vital-value">${latestVitals.blutdruck_systolisch}/${latestVitals.blutdruck_diastolisch}</span>
                                </div>
                            ` : ''}
                            
                            ${latestVitals.puls ? `
                                <div class="vital-item ${getVitalItemClass('pulse', latestVitals.puls)}">
                                    <span class="vital-label">Puls</span>
                                    <span class="vital-value">${latestVitals.puls} bpm</span>
                                </div>
                            ` : ''}
                            
                            ${latestVitals.temperatur ? `
                                <div class="vital-item ${getVitalItemClass('temperature', latestVitals.temperatur)}">
                                    <span class="vital-label">Temperatur</span>
                                    <span class="vital-value">${latestVitals.temperatur}°C</span>
                                </div>
                            ` : ''}
                            
                            ${latestVitals.sauerstoffsaettigung ? `
                                <div class="vital-item ${getVitalItemClass('oxygen', latestVitals.sauerstoffsaettigung)}">
                                    <span class="vital-label">O2-Sättigung</span>
                                    <span class="vital-value">${latestVitals.sauerstoffsaettigung}%</span>
                                </div>
                            ` : ''}
                        </div>
                        <div class="vital-time">
                            Letzte Messung: ${formatDateTime(latestVitals.gemessen_am)}
                        </div>
                    ` : `
                        <div class="no-vitals">
                            <p>Noch keine Vitaldaten erfasst</p>
                        </div>
                    `}
                    
                    <div class="patient-actions">
                        <button class="btn-primary btn-small" onclick="showAddVitalDataModal(${patient.id})">
                            📊 Neue Messung
                        </button>
                        <button class="btn-secondary btn-small" onclick="showPatientVitalHistory(${patient.id})">
                            📈 Verlauf
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Kürzliche Vitaldaten in Tabelle rendern
    function renderRecentVitalData(vitalData) {
        if (vitalData.length === 0) {
            recentVitalDataTable.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; color: #666;">
                        Noch keine Vitaldaten erfasst
                    </td>
                </tr>
            `;
            return;
        }

        recentVitalDataTable.innerHTML = vitalData.map(data => {
            const status = getVitalDataStatus(data);

            return `
                <tr>
                    <td>${formatDateTime(data.gemessen_am)}</td>
                    <td>${data.patient_name}</td>
                    <td>${data.blutdruck_systolisch && data.blutdruck_diastolisch ?
                `${data.blutdruck_systolisch}/${data.blutdruck_diastolisch}` : '-'}</td>
                    <td>${data.puls || '-'}</td>
                    <td>${data.temperatur ? `${data.temperatur}°C` : '-'}</td>
                    <td>${data.sauerstoffsaettigung ? `${data.sauerstoffsaettigung}%` : '-'}</td>
                    <td><span class="table-status ${status.class}">${status.text}</span></td>
                    <td>
                        <button class="btn-secondary btn-small" onclick="showVitalDataDetails(${data.id})">
                            Details
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // Patienten filtern
    function filterPatients() {
        const searchTerm = patientSearchInput.value.toLowerCase();
        const criticalFilter = filterCriticalSelect.value;

        filteredPatients = allPatients.filter(patient => {
            // Suchfilter
            const matchesSearch = !searchTerm ||
                `${patient.vorname} ${patient.nachname}`.toLowerCase().includes(searchTerm) ||
                (patient.zimmer_nummer && patient.zimmer_nummer.toLowerCase().includes(searchTerm));

            // Kritischer Status Filter
            let matchesCritical = true;
            if (criticalFilter !== 'all') {
                const status = getPatientVitalStatus(patient.latest_vitals);
                if (criticalFilter === 'critical') {
                    matchesCritical = status.class === 'critical';
                } else if (criticalFilter === 'normal') {
                    matchesCritical = status.class === 'normal';
                }
            }

            return matchesSearch && matchesCritical;
        });

        renderPatients(filteredPatients);
        updatePatientCount(filteredPatients.length);
    }

    // Patient-Status basierend auf Vitaldaten bestimmen
    function getPatientVitalStatus(vitals) {
        if (!vitals) {
            return { class: 'no-data', text: 'Keine Daten' };
        }

        const isCritical = vitals.ist_kritisch ||
            (vitals.blutdruck_systolisch && (vitals.blutdruck_systolisch > 180 || vitals.blutdruck_systolisch < 90)) ||
            (vitals.puls && (vitals.puls > 120 || vitals.puls < 50)) ||
            (vitals.temperatur && (vitals.temperatur > 39 || vitals.temperatur < 35)) ||
            (vitals.sauerstoffsaettigung && vitals.sauerstoffsaettigung < 90);

        if (isCritical) {
            return { class: 'critical', text: 'Kritisch' };
        }

        const isWarning =
            (vitals.blutdruck_systolisch && (vitals.blutdruck_systolisch > 160 || vitals.blutdruck_systolisch < 100)) ||
            (vitals.puls && (vitals.puls > 100 || vitals.puls < 60)) ||
            (vitals.temperatur && (vitals.temperatur > 38 || vitals.temperatur < 36)) ||
            (vitals.sauerstoffsaettigung && vitals.sauerstoffsaettigung < 95);

        if (isWarning) {
            return { class: 'warning', text: 'Warnung' };
        }

        return { class: 'normal', text: 'Normal' };
    }

    // Vital-Item-Klasse für einzelne Werte bestimmen
    function getVitalItemClass(type, value, value2 = null) {
        switch(type) {
            case 'blood_pressure':
                if (value > 180 || value < 90 || (value2 && (value2 > 120 || value2 < 60))) {
                    return 'critical';
                }
                if (value > 160 || value < 100 || (value2 && (value2 > 100 || value2 < 70))) {
                    return 'warning';
                }
                return '';

            case 'pulse':
                if (value > 120 || value < 50) return 'critical';
                if (value > 100 || value < 60) return 'warning';
                return '';

            case 'temperature':
                if (value > 39 || value < 35) return 'critical';
                if (value > 38 || value < 36) return 'warning';
                return '';

            case 'oxygen':
                if (value < 90) return 'critical';
                if (value < 95) return 'warning';
                return '';

            default:
                return '';
        }
    }

    // Status für Vitaldaten in Tabelle
    function getVitalDataStatus(data) {
        if (data.ist_kritisch) {
            return { class: 'critical', text: 'Kritisch' };
        }

        const status = getPatientVitalStatus(data);
        return status;
    }

    // Patientenanzahl aktualisieren
    function updatePatientCount(count) {
        patientCountSpan.textContent = `${count} Patient${count !== 1 ? 'en' : ''}`;
    }

    // Patient-Select für Modal füllen
    function populatePatientSelect() {
        modalPatientSelect.innerHTML = '<option value="">-- Patient wählen --</option>';
        allPatients.forEach(patient => {
            const option = document.createElement('option');
            option.value = patient.id;
            option.textContent = `${patient.vorname} ${patient.nachname} (${patient.zimmer_nummer || 'N/A'})`;
            modalPatientSelect.appendChild(option);
        });
    }

    // Modal für neue Vitaldaten öffnen
    window.showAddVitalDataModal = function(preselectedPatientId = null) {
        const modal = document.getElementById('addVitalDataModal');
        modal.classList.add('show');

        // Formular zurücksetzen
        vitalDataForm.reset();

        // Patient vorauswählen falls übergeben
        if (preselectedPatientId) {
            modalPatientSelect.value = preselectedPatientId;
        }

        // Erstes Eingabefeld fokussieren
        if (!preselectedPatientId) {
            modalPatientSelect.focus();
        } else {
            document.getElementById('blutdruckSystolisch').focus();
        }
    };

    // Modal für neue Vitaldaten schließen
    window.closeAddVitalDataModal = function() {
        const modal = document.getElementById('addVitalDataModal');
        modal.classList.remove('show');
    };

    // Formular für neue Vitaldaten verarbeiten
    async function handleVitalDataSubmit(e) {
        e.preventDefault();

        const formData = new FormData(vitalDataForm);
        const vitalData = {
            patientId: modalPatientSelect.value,
            mitarbeiterId: mitarbeiterId,
            blutdruckSystolisch: document.getElementById('blutdruckSystolisch').value || null,
            blutdruckDiastolisch: document.getElementById('blutdruckDiastolisch').value || null,
            puls: document.getElementById('puls').value || null,
            temperatur: document.getElementById('temperatur').value || null,
            sauerstoffsaettigung: document.getElementById('sauerstoffsaettigung').value || null,
            gewicht: document.getElementById('gewicht').value || null,
            blutzucker: document.getElementById('blutzucker').value || null,
            bemerkungen: document.getElementById('bemerkungen').value || null
        };

        // Validierung - mindestens ein Wert muss ausgefüllt sein
        const hasValues = Object.entries(vitalData)
            .filter(([key]) => !['patientId', 'mitarbeiterId', 'bemerkungen'].includes(key))
            .some(([key, value]) => value !== null && value !== '');

        if (!hasValues) {
            showNotification('Bitte geben Sie mindestens einen Vital-Wert ein', 'error');
            return;
        }

        try {
            const submitButton = vitalDataForm.querySelector('button[type="submit"]');
            const originalText = submitButton.innerHTML;
            submitButton.innerHTML = '<span class="loading"></span>Speichere...';
            submitButton.disabled = true;

            const response = await fetch('/api/health/data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(vitalData)
            });

            const result = await response.json();

            if (result.success) {
                showNotification(
                    result.critical ?
                        '⚠️ Vitaldaten gespeichert - KRITISCHE WERTE erkannt!' :
                        '✅ Vitaldaten erfolgreich gespeichert',
                    result.critical ? 'warning' : 'success'
                );

                closeAddVitalDataModal();

                // Daten neu laden
                await loadAssignedPatients();
                await loadRecentVitalData();

            } else {
                throw new Error(result.message || 'Fehler beim Speichern');
            }

        } catch (error) {
            console.error('Vitaldaten-Speicherung Fehler:', error);
            showNotification('Fehler beim Speichern der Vitaldaten: ' + error.message, 'error');
        } finally {
            const submitButton = vitalDataForm.querySelector('button[type="submit"]');
            submitButton.innerHTML = 'Vitaldaten speichern';
            submitButton.disabled = false;
        }
    }

    // Vitaldaten-Details anzeigen
    window.showVitalDataDetails = function(vitalDataId) {
        // Implementierung für Details-Modal
        showNotification('Details-Ansicht wird implementiert', 'info');
    };

    // Patienten-Vitaldaten-Verlauf anzeigen
    window.showPatientVitalHistory = function(patientId) {
        // Implementierung für Verlaufs-Ansicht
        showNotification('Verlaufs-Ansicht wird implementiert', 'info');
    };

    // Hilfsfunktionen
    function formatDateTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function showLoading(element) {
        element.innerHTML = '<div class="loading">Lädt...</div>';
    }

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Benachrichtigungen anzeigen
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-text">${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        const notificationArea = document.getElementById('notificationArea');
        notificationArea.appendChild(notification);
        setTimeout(() => {
            if (notification.parentElement) notification.remove();
        }, 5000);
    }

    // Animierter Partikelhintergrund (vereinfacht)
    const canvas = document.getElementById('bg');
    const ctx = canvas.getContext('2d');
    let particles = [];
    const num = 80;

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    class Particle {
        constructor() { this.reset(); }
        reset() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 2 + 1;
            this.vx = (Math.random() - 0.5) * 0.5;
            this.vy = (Math.random() - 0.5) * 0.5;
            this.alpha = Math.random() * 0.3 + 0.2;
        }
        update() {
            this.x += this.vx;
            this.y += this.vy;
            if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
                this.reset();
            }
        }
        draw() {
            ctx.fillStyle = `rgba(255,255,255,${this.alpha})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function initParticles() {
        particles = [];
        for (let i = 0; i < num; i++) particles.push(new Particle());
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => { p.update(); p.draw(); });
        requestAnimationFrame(animate);
    }

    initParticles();
    animate();
});