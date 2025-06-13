document.addEventListener('DOMContentLoaded', () => {
    console.log('Admin Dashboard wird initialisiert...');

    // Aktueller Benutzer aus sessionStorage abrufen
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
    const adminId = currentUser.id;

    // Administratorberechtigung prüfen
    if (!adminId || currentUser.type !== 'mitarbeiter') {
        alert('Keine Administratorberechtigung. Bitte loggen Sie sich erneut ein.');
        window.location.href = '/';
        return;
    }

    // Dashboard initialisieren
    init();

    async function init() {
        setupParticleBackground();
        setupEventListeners();
        await loadDashboardData();
        await loadTransferData();
        setupAutoRefresh();
    }

    // Animierter Partikelhintergrund
    function setupParticleBackground() {
        const canvas = document.getElementById('bg');
        const ctx = canvas.getContext('2d');
        let particles = [];

        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }

        function createParticle() {
            return {
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                size: Math.random() * 2 + 1,
                opacity: Math.random() * 0.5 + 0.2
            };
        }

        function initParticles() {
            particles = [];
            for (let i = 0; i < 50; i++) {
                particles.push(createParticle());
            }
        }

        function updateParticles() {
            particles.forEach(particle => {
                particle.x += particle.vx;
                particle.y += particle.vy;

                if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
                if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;
            });
        }

        function drawParticles() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'rgba(45, 127, 249, 0.6)';

            particles.forEach(particle => {
                ctx.globalAlpha = particle.opacity;
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.globalAlpha = 1;
        }

        function animate() {
            updateParticles();
            drawParticles();
            requestAnimationFrame(animate);
        }

        resizeCanvas();
        initParticles();
        animate();

        window.addEventListener('resize', () => {
            resizeCanvas();
            initParticles();
        });
    }

    function setupEventListeners() {
        setupTransferFormSubmission();
    }

    // Navigation zwischen Dashboard-Bereichen
    window.showTransferSection = function() {
        hideAllSections();
        document.getElementById('transferSection').style.display = 'block';
        loadTransferData();
    };

    window.showStatisticsSection = function() {
        hideAllSections();
        document.getElementById('statisticsSection').style.display = 'block';
        loadDetailedStatistics();
    };

    window.showTransferForm = function() {
        console.log('Transfer-Formular wird geöffnet...');
        document.getElementById('transferForm').style.display = 'block';

        // Patientensuche initialisieren wenn Formular geöffnet wird
        setTimeout(() => {
            initializePatientSearch();
        }, 100);
    };

    window.hideTransferForm = function() {
        document.getElementById('transferForm').style.display = 'none';
        document.getElementById('adminTransferForm').reset();

        // Suchfelder zurücksetzen
        const searchInput = document.getElementById('transferPatientSearch');
        const hiddenInput = document.getElementById('transferPatientId');
        if (searchInput) searchInput.value = '';
        if (hiddenInput) hiddenInput.value = '';
    };

    function hideAllSections() {
        document.getElementById('dashboardSection').style.display = 'none';
        document.getElementById('transferSection').style.display = 'none';
        document.getElementById('statisticsSection').style.display = 'none';
        document.getElementById('patientManagementSection').style.display = 'none';
    }

    window.logout = function() {
        if (confirm('Möchten Sie sich wirklich abmelden?')) {
            sessionStorage.removeItem('currentUser');
            window.location.href = '/';
        }
    };

    // Patientensuche mit Echtzeitfilterung
    function initializePatientSearch() {
        console.log('Patientensuche wird initialisiert...');

        let patients = [];

        // Alle verfügbaren Patienten für Suche laden
        fetch('/api/patients')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Server returned ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                patients = data;
                console.log('Loaded', patients.length, 'patients for search');
            })
            .catch(error => {
                console.error('Error loading patients:', error);
                showNotification('Fehler beim Laden der Patientenliste', 'error');
            });

        const searchInput = document.getElementById('transferPatientSearch');
        const resultsContainer = document.getElementById('patientSearchResults');

        if (!searchInput || !resultsContainer) {
            console.log('Suchfeldelemente nicht gefunden');
            return;
        }

        // Alte Event-Listener durch Klonen des Elements entfernen
        const newSearchInput = searchInput.cloneNode(true);
        searchInput.parentNode.replaceChild(newSearchInput, searchInput);

        // Suche bei Benutzereingabe
        newSearchInput.addEventListener('input', function(e) {
            const query = e.target.value.trim();

            if (query.length < 2) {
                resultsContainer.style.display = 'none';
                return;
            }

            // Patienten nach Namen filtern
            const filtered = patients.filter(patient => {
                const fullName = `${patient.vorname} ${patient.nachname}`.toLowerCase();
                return fullName.includes(query.toLowerCase());
            });

            // Suchergebnisse mit aktuellem Standort anzeigen
            if (filtered.length === 0) {
                resultsContainer.innerHTML = '<div class="no-results">Keine Patienten gefunden</div>';
            } else {
                resultsContainer.innerHTML = filtered.map(patient => `
                    <div class="search-result-item" onclick="selectPatient(${patient.id}, '${patient.vorname} ${patient.nachname}')">
                        <div class="patient-name">${patient.vorname} ${patient.nachname}</div>
                        <div class="patient-details">
                            ID: ${patient.id} | 
                            Aktuell: ${patient.standort || 'Unbekannt'}
                        </div>
                    </div>
                `).join('');
            }

            resultsContainer.style.display = 'block';
        });

        // Ergebnisse ausblenden beim Klick außerhalb
        newSearchInput.addEventListener('blur', function() {
            setTimeout(() => {
                resultsContainer.style.display = 'none';
            }, 200);
        });
    }

    // Patient aus Suchergebnissen auswählen und Standort-Dropdown aktualisieren
    window.selectPatient = async function(id, name) {
        document.getElementById('transferPatientSearch').value = name;
        document.getElementById('transferPatientId').value = id;
        document.getElementById('patientSearchResults').style.display = 'none';
        console.log('Patient ausgewählt:', id, name);

        // Standort-Dropdown basierend auf aktuellem Patientenstandort aktualisieren
        await updateLocationDropdown(id);
    };

    // Standort-Dropdown basierend auf aktuellem Patientenstandort anpassen
    async function updateLocationDropdown(patientId) {
        try {
            // Aktuellen Patientenstandort abrufen
            const response = await fetch(`/api/patients/${patientId}/location`);
            if (!response.ok) throw new Error('Failed to get patient location');

            const data = await response.json();
            const currentLocation = data.currentLocation;

            const locationSelect = document.getElementById('newLocation');
            const options = locationSelect.querySelectorAll('option');

            // Optionen basierend auf aktuellem Standort anzeigen/verstecken
            options.forEach(option => {
                if (option.value === '') {
                    // Platzhalter-Option beibehalten
                    option.style.display = 'block';
                } else if (option.value === currentLocation) {
                    // Aktuellen Standort ausblenden
                    option.style.display = 'none';
                } else {
                    // Andere Standorte anzeigen
                    option.style.display = 'block';
                }
            });

            // Dropdown auf Platzhalter zurücksetzen
            locationSelect.value = '';

            console.log(`Patient ist derzeit in ${currentLocation}, andere Optionen werden angezeigt`);

        } catch (error) {
            console.error('Fehler beim Aktualisieren des Standort-Dropdowns:', error);
            // Bei Fehler alle Optionen anzeigen
            const locationSelect = document.getElementById('newLocation');
            const options = locationSelect.querySelectorAll('option');
            options.forEach(option => {
                option.style.display = 'block';
            });
        }
    }

    // Transfer-Formular Übermittlung mit Validierung und Admin-Transfer-API
    function setupTransferFormSubmission() {
        const form = document.getElementById('adminTransferForm');
        if (!form) {
            console.log('Transfer-Formular nicht gefunden');
            return;
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('Formular übermittelt');

            const patientId = document.getElementById('transferPatientId').value;
            const newLocation = document.getElementById('newLocation').value;
            const reason = document.getElementById('transferReason').value;

            console.log('Formulardaten:', { patientId, newLocation, reason });

            if (!patientId) {
                showNotification('Bitte wählen Sie einen Patienten aus', 'error');
                return;
            }

            if (!newLocation) {
                showNotification('Bitte wählen Sie einen neuen Standort', 'error');
                return;
            }

            const transferData = {
                patientId: patientId,
                newLocation: newLocation,
                reason: reason || 'Admin Transfer',
                adminId: adminId
            };

            try {
                showLoadingState();

                const response = await fetch('/api/admin/transfers', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(transferData)
                });

                const result = await response.json();

                if (result.success) {
                    showNotification('Transfer erfolgreich durchgeführt', 'success');
                    hideTransferForm();
                    await loadTransferData();
                    await loadDashboardData();
                } else {
                    throw new Error(result.message || 'Transfer failed');
                }
            } catch (error) {
                console.error('Transfer-Fehler:', error);
                showNotification('Fehler beim Transfer: ' + error.message, 'error');
            } finally {
                hideLoadingState();
            }
        });
    }

    // Dashboard-Daten von Server laden und UI aktualisieren
    async function loadDashboardData() {
        try {
            showLoadingState();

            const response = await fetch('/api/admin/dashboard');
            if (!response.ok) throw new Error('Failed to load dashboard data');

            const data = await response.json();

            if (data.success) {
                updateDashboardUI(data.dashboard);
            } else {
                throw new Error(data.message || 'Failed to load dashboard');
            }

        } catch (error) {
            console.error('Dashboard-Ladefehler:', error);
            showNotification('Fehler beim Laden der Dashboard-Daten', 'error');
        } finally {
            hideLoadingState();
        }
    }

    // Dashboard-UI mit Server-Daten aktualisieren
    function updateDashboardUI(dashboard) {
        console.log('Dashboard-Daten empfangen:', dashboard);
        console.log('Standort-Statistiken:', dashboard.location_statistics);

        if (dashboard.location_statistics && dashboard.location_statistics.patients) {
            console.log('Patientenstandorte:', dashboard.location_statistics.patients);
            dashboard.location_statistics.patients.forEach(loc => {
                console.log(`${loc.standort}: ${loc.total_patients} Patienten`);
            });
        }

        document.getElementById('adminUsername').textContent = currentUser.username || 'Administrator';

        // Statistiken verarbeiten und anzeigen
        if (dashboard.location_statistics) {
            const stats = dashboard.location_statistics;

            let totalPatients = 0;
            let totalPflegekraefte = 0;
            let krefeldPatients = 0;
            let moenchengladbachPatients = 0;
            let zuhausePatients = 0;

            // Patientenstatistiken verarbeiten
            stats.patients.forEach(location => {
                const count = parseInt(location.total_patients) || 0;
                totalPatients += count;

                if (location.standort === 'Krefeld') {
                    krefeldPatients = count;
                } else if (location.standort === 'Mönchengladbach') {
                    moenchengladbachPatients = count;
                } else if (location.standort === 'Zuhause') {
                    zuhausePatients = count;
                }
            });

            // Pflegekraft-Statistiken verarbeiten
            stats.pflegekraefte.forEach(location => {
                totalPflegekraefte += parseInt(location.total_pflegekraefte) || 0;
            });

            // DOM-Elemente aktualisieren
            document.getElementById('totalPatients').textContent = totalPatients;
            document.getElementById('totalPflegekraefte').textContent = totalPflegekraefte;
            document.getElementById('krefeld_patients').textContent = krefeldPatients;
            document.getElementById('moenchengladbach_patients').textContent = moenchengladbachPatients;
            document.getElementById('zuhause_patients').textContent = zuhausePatients;
        }

        // Aktuelle Aktivitäten anzeigen
        if (dashboard.recent_transfers) {
            const activitiesHtml = dashboard.recent_transfers.length === 0
                ? '<div class="activity-item"><div class="activity-icon">📝</div><div class="activity-content"><span>Keine aktuellen Transfers</span></div></div>'
                : dashboard.recent_transfers.map(transfer => `
                    <div class="activity-item">
                        <div class="activity-icon">🔄</div>
                        <div class="activity-content">
                            <strong>${transfer.patient_name}</strong> von ${transfer.alter_standort || 'Unbekannt'} nach ${transfer.neuer_standort || 'Unbekannt'}
                            <div class="activity-time">${new Date(transfer.geaendert_am).toLocaleDateString('de-DE')}</div>
                        </div>
                    </div>
                `).join('');

            document.getElementById('recentActivities').innerHTML = activitiesHtml;
        }

        // Arbeitsbelastungs-Warnungen anzeigen
        if (dashboard.workload_alerts) {
            const alertsHtml = dashboard.workload_alerts.length === 0
                ? '<div class="alert-item">✅ Alle Pflegekräfte haben normale Arbeitsbelastung</div>'
                : dashboard.workload_alerts.map(alert => `
                    <div class="alert-item ${alert.patient_count > 22 ? 'critical' : ''}">
                        ⚠️ <strong>${alert.pflegekraft_name}</strong> (${alert.standort || 'Unbekannt'}): ${alert.patient_count}/24 Patienten
                    </div>
                `).join('');

            document.getElementById('workloadAlerts').innerHTML = alertsHtml;
        }
    }

    // Transfer-Daten laden (Anfragen und Historie)
    async function loadTransferData() {
        try {
            // Kürzliche Transfers laden
            const transfersResponse = await fetch('/api/admin/transfers/recent');
            if (transfersResponse.ok) {
                const transfersData = await transfersResponse.json();
                updateRecentTransfersTable(transfersData.transfers || []);
            }

            // Offene Anfragen laden
            const requestsResponse = await fetch('/api/admin/transfers/requests');
            if (requestsResponse.ok) {
                const requestsData = await requestsResponse.json();
                updateTransferRequestsTable(requestsData.requests || []);
            }
        } catch (error) {
            console.error('Transfer-Daten Ladefehler:', error);
        }
    }

    function updateRecentTransfersTable(transfers) {
        const tbody = document.querySelector('#recentTransfersTable tbody');

        if (transfers.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; color: #666;">
                        Keine Transfers gefunden
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = transfers.map(transfer => `
            <tr>
                <td>${transfer.patient_name}</td>
                <td>${transfer.alter_standort || 'Unbekannt'}</td>
                <td>${transfer.neuer_standort || 'Unbekannt'}</td>
                <td>${transfer.grund || 'Kein Grund angegeben'}</td>
                <td>${transfer.admin_name || 'System'}</td>
                <td>${new Date(transfer.geaendert_am).toLocaleDateString('de-DE')}</td>
            </tr>
        `).join('');
    }

    function updateTransferRequestsTable(requests) {
        const tbody = document.querySelector('#transferRequestsTable tbody');

        if (requests.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; color: #666;">
                        Keine offenen Anfragen
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = requests.map(request => `
            <tr>
                <td>${request.patient_name}</td>
                <td>${request.requester_name}</td>
                <td>${request.gewuenschter_standort}</td>
                <td>${request.grund}</td>
                <td>${new Date(request.erstellt_am).toLocaleDateString('de-DE')}</td>
                <td>
                    <button class="btn-success" onclick="approveTransferRequest(${request.id})">
                        Genehmigen
                    </button>
                    <button class="btn-danger" onclick="rejectTransferRequest(${request.id})">
                        Ablehnen
                    </button>
                </td>
            </tr>
        `).join('');
    }

    // Detaillierte Statistiken für Statistik-Sektion laden
    async function loadDetailedStatistics() {
        try {
            const response = await fetch('/api/admin/statistics/detailed');
            if (!response.ok) throw new Error('Failed to load detailed statistics');

            const data = await response.json();

            if (data.success) {
                updateLocationStatistics(data.statistics.locations);
                updateWorkloadStatistics(data.statistics.workload);
            }
        } catch (error) {
            console.error('Detaillierte Statistiken Fehler:', error);
            showNotification('Fehler beim Laden der Statistiken', 'error');
        }
    }

    function updateLocationStatistics(locations) {
        const container = document.getElementById('locationStats');
        const totalPatients = locations.reduce((sum, loc) => sum + (loc.patient_count || 0), 0);

        container.innerHTML = locations.map(location => {
            const percentage = totalPatients > 0 ? ((location.patient_count || 0) / totalPatients * 100) : 0;

            return `
                <div class="location-item">
                    <div class="location-info">
                        <h4>${location.standort}</h4>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${percentage}%"></div>
                        </div>
                        <span class="location-numbers">${location.patient_count || 0} / ${totalPatients} Patienten (${percentage.toFixed(1)}%)</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    function updateWorkloadStatistics(workload) {
        const container = document.getElementById('workloadStats');

        if (!workload || workload.length === 0) {
            container.innerHTML = '<div class="workload-item">Keine Auslastungsdaten verfügbar</div>';
            return;
        }

        container.innerHTML = workload.map(pf => {
            const patientCount = pf.patient_count || 0;
            let statusClass = 'good';

            if (patientCount > 22) statusClass = 'critical';
            else if (patientCount > 18) statusClass = '';

            return `
                <div class="workload-item ${statusClass}">
                    <strong>${pf.pflegekraft_name}</strong> (${pf.standort || 'Unbekannt'}): 
                    ${patientCount}/24 Patienten 
                    <span style="float: right;">${((patientCount/24)*100).toFixed(1)}% Auslastung</span>
                </div>
            `;
        }).join('');
    }

    // Hilfsfunktionen für UI-Zustand
    function showLoadingState() {
        document.querySelectorAll('.stat-card p').forEach(el => {
            if (el.textContent === '—') {
                el.textContent = '...';
            }
        });
    }

    function hideLoadingState() {
        document.querySelectorAll('.stat-card p').forEach(el => {
            if (el.textContent === '...') {
                el.textContent = '—';
            }
        });
    }

    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        const notificationArea = document.getElementById('notificationArea');
        notificationArea.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);

        notification.addEventListener('click', () => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        });
    }

    // Automatische Aktualisierung einrichten
    function setupAutoRefresh() {
        // Dashboard alle 2 Minuten aktualisieren
        setInterval(async () => {
            await loadDashboardData();
        }, 120000);

        // Transfer-Daten jede Minute aktualisieren (nur wenn Transfer-Sektion sichtbar)
        setInterval(async () => {
            const transferSection = document.getElementById('transferSection');
            if (transferSection.style.display !== 'none') {
                await loadTransferData();
            }
        }, 60000);
    }

    // Globale Funktionen für Transfer-Anfragen-Verwaltung
    window.approveTransferRequest = async function(requestId) {
        if (!confirm('Möchten Sie diese Transfer-Anfrage genehmigen?')) return;

        try {
            const response = await fetch(`/api/admin/transfers/requests/${requestId}/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adminId: adminId })
            });

            const result = await response.json();

            if (result.success) {
                showNotification('Transfer-Anfrage genehmigt', 'success');
                await loadTransferData();
                await loadDashboardData();
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Genehmigungsfehler:', error);
            showNotification('Fehler bei der Genehmigung: ' + error.message, 'error');
        }
    };

    window.rejectTransferRequest = async function(requestId) {
        const reason = prompt('Grund für die Ablehnung (optional):');
        if (reason === null) return;

        try {
            const response = await fetch(`/api/admin/transfers/requests/${requestId}/reject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    adminId: adminId,
                    rejectionReason: reason
                })
            });

            const result = await response.json();

            if (result.success) {
                showNotification('Transfer-Anfrage abgelehnt', 'success');
                await loadTransferData();
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Ablehnungsfehler:', error);
            showNotification('Fehler bei der Ablehnung: ' + error.message, 'error');
        }
    };

    console.log('Admin Dashboard vollständig initialisiert');
});

// Erweiterte kritische Gesundheitsalarme für Dashboard
function setupCriticalAlertMonitoring() {
    // Alle 30 Sekunden auf kritische Alarme prüfen
    setInterval(async () => {
        await checkForCriticalAlerts();
    }, 30000);

    // Sofort beim Seitenladen prüfen
    checkForCriticalAlerts();
}

async function checkForCriticalAlerts() {
    try {
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
        const userId = currentUser.id;
        const userType = currentUser.type;

        if (!userId) return;

        // Ungelesene kritische Benachrichtigungen abrufen
        const response = await fetch(`/api/notifications/critical/${userId}?userType=${userType}`);

        if (!response.ok) return;

        const data = await response.json();

        if (data.success && data.criticalAlerts.length > 0) {
            displayCriticalAlerts(data.criticalAlerts);
        }

    } catch (error) {
        console.error('Kritische Alarm-Prüfung Fehler:', error);
    }
}

function displayCriticalAlerts(alerts) {
    // Existierendes kritisches Alarm-Banner entfernen
    const existingBanner = document.querySelector('.critical-alert-banner');
    if (existingBanner) {
        existingBanner.remove();
    }

    if (alerts.length === 0) return;

    // Kritisches Alarm-Banner erstellen
    const banner = document.createElement('div');
    banner.className = 'critical-alert-banner';
    banner.innerHTML = `
        <div class="critical-alert-content">
            <div class="critical-alert-icon">🚨</div>
            <div class="critical-alert-text">
                <strong>KRITISCHE GESUNDHEITSWERTE ERKANNT!</strong>
                <div class="critical-alert-details">
                    ${alerts.length} Patient(en) benötigen sofortige Aufmerksamkeit
                </div>
            </div>
            <div class="critical-alert-banner-actions">
                <button class="critical-alert-action" onclick="showCriticalAlertDetails()">
                    📋 Details anzeigen
                </button>
                <button class="critical-alert-action secondary" onclick="acknowledgeAllAlertsFromBanner()">
                    ✅ Alle erledigt
                </button>
            </div>
            <button class="critical-alert-close" onclick="this.parentElement.parentElement.remove()">
                ×
            </button>
        </div>
    `;

    // Am oberen Rand der Seite einfügen
    document.body.insertBefore(banner, document.body.firstChild);

    // Alarme für Detailansicht speichern
    window.currentCriticalAlerts = alerts;

    // Automatisch nach 2 Minuten entfernen wenn nicht interagiert
    setTimeout(() => {
        if (banner.parentElement) {
            banner.remove();
        }
    }, 120000);
}

function showCriticalAlertDetails() {
    const alerts = window.currentCriticalAlerts || [];

    if (alerts.length === 0) return;

    // Modal mit Alarm-Details erstellen
    const modal = document.createElement('div');
    modal.className = 'critical-alert-modal';
    modal.innerHTML = `
        <div class="critical-alert-modal-content">
            <div class="critical-alert-modal-header">
                <h2>🚨 Kritische Gesundheitswerte</h2>
                <button class="modal-close" onclick="this.closest('.critical-alert-modal').remove()">×</button>
            </div>
            <div class="critical-alert-modal-body">
                ${alerts.map(alert => `
                    <div class="critical-alert-item" data-alert-id="${alert.id}">
                        <div class="critical-alert-patient">
                            <strong>${alert.patient_name || 'Unbekannter Patient'}</strong>
                            <span class="critical-alert-time">${new Date(alert.erstellt_am).toLocaleTimeString('de-DE')}</span>
                        </div>
                        <div class="critical-alert-message">
                            ${alert.nachricht}
                        </div>
                        <div class="critical-alert-actions">
                            <button class="btn-primary" onclick="acknowledgeAlert(${alert.id})">
                                ✅ Als gesehen markieren
                            </button>
                            <button class="btn-secondary" onclick="viewPatientDetails(${alert.patient_id})">
                                👤 Patient anzeigen
                            </button>
                        </div>
                    </div>
                `).join('')}
                ${alerts.length > 1 ? `
                    <div class="critical-alert-bulk-actions">
                        <button class="btn-warning" onclick="acknowledgeAllAlerts()">
                            ✅ Alle als gesehen markieren
                        </button>
                    </div>
                ` : ''}
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

// Einzelnen Alarm als gelesen markieren
async function acknowledgeAlert(alertId) {
    try {
        const button = event.target;
        const originalText = button.innerHTML;
        button.innerHTML = '<span class="loading-spinner"></span>Wird verarbeitet...';
        button.disabled = true;

        const response = await fetch(`/api/notifications/${alertId}/read`, {
            method: 'PUT'
        });

        if (response.ok) {
            // Spezifisches Alarm-Element mit Animation entfernen
            const alertItem = button.closest('.critical-alert-item');
            if (alertItem) {
                alertItem.style.transition = 'all 0.3s ease';
                alertItem.style.opacity = '0';
                alertItem.style.transform = 'translateX(100%)';

                setTimeout(() => {
                    alertItem.remove();

                    // Prüfen ob das der letzte Alarm im Modal war
                    const remainingAlerts = document.querySelectorAll('.critical-alert-item');
                    if (remainingAlerts.length === 0) {
                        // Modal und Banner schließen wenn keine Alarme übrig
                        const modal = document.querySelector('.critical-alert-modal');
                        const banner = document.querySelector('.critical-alert-banner');

                        if (modal) {
                            modal.style.opacity = '0';
                            setTimeout(() => modal.remove(), 300);
                        }
                        if (banner) {
                            banner.style.opacity = '0';
                            setTimeout(() => banner.remove(), 300);
                        }

                        showNotification('✅ Alle kritischen Alarme bearbeitet!', 'success');
                    } else {
                        showNotification('✅ Alarm als gesehen markiert', 'success');
                        updateBannerAlertCount();
                    }
                }, 300);
            }

            // Diesen Alarm aus gespeicherten Alarmen entfernen
            if (window.currentCriticalAlerts) {
                window.currentCriticalAlerts = window.currentCriticalAlerts.filter(
                    alert => alert.id !== alertId
                );
            }

        } else {
            throw new Error('Server returned error');
        }
    } catch (error) {
        console.error('Fehler beim Markieren des Alarms:', error);

        // Button-Zustand wiederherstellen
        button.innerHTML = originalText;
        button.disabled = false;

        showNotification('❌ Fehler beim Markieren des Alarms', 'error');
    }
}

function updateBannerAlertCount() {
    const banner = document.querySelector('.critical-alert-banner');
    const alertCountElement = banner?.querySelector('.critical-alert-details');

    if (alertCountElement && window.currentCriticalAlerts) {
        const remainingCount = window.currentCriticalAlerts.length;
        if (remainingCount > 0) {
            alertCountElement.textContent = `${remainingCount} Patient(en) benötigen sofortige Aufmerksamkeit`;
        }
    }
}

// Alle Alarme als gelesen markieren
async function acknowledgeAllAlerts() {
    const button = event.target;
    const originalText = button.innerHTML;

    try {
        button.innerHTML = '<span class="loading-spinner"></span>Bearbeite alle Alarme...';
        button.disabled = true;

        const currentAlerts = window.currentCriticalAlerts || [];
        const alertIds = currentAlerts.map(alert => alert.id);

        // Alle Alarme verarbeiten
        const promises = alertIds.map(alertId =>
            fetch(`/api/notifications/${alertId}/read`, { method: 'PUT' })
        );

        const results = await Promise.all(promises);
        const successCount = results.filter(r => r.ok).length;

        if (successCount === alertIds.length) {
            // Alle erfolgreich - alles schließen
            const modal = document.querySelector('.critical-alert-modal');
            const banner = document.querySelector('.critical-alert-banner');

            // Modal-Schließung animieren
            if (modal) {
                modal.style.opacity = '0';
                setTimeout(() => modal.remove(), 300);
            }

            // Banner-Entfernung animieren
            if (banner) {
                banner.style.opacity = '0';
                setTimeout(() => banner.remove(), 300);
            }

            // Gespeicherte Alarme löschen
            window.currentCriticalAlerts = [];

            showNotification(`✅ Alle ${successCount} Alarme erfolgreich bearbeitet!`, 'success');

        } else {
            throw new Error(`Nur ${successCount} von ${alertIds.length} Alarmen erfolgreich bearbeitet`);
        }

    } catch (error) {
        console.error('Fehler beim Bearbeiten aller Alarme:', error);
        button.innerHTML = originalText;
        button.disabled = false;
        showNotification('❌ Fehler beim Bearbeiten aller Alarme: ' + error.message, 'error');
    }
}

async function acknowledgeAllAlertsFromBanner() {
    const button = event.target;
    const originalText = button.innerHTML;

    try {
        button.innerHTML = '<span class="loading-spinner"></span>Bearbeite...';
        button.disabled = true;

        const currentAlerts = window.currentCriticalAlerts || [];
        const alertIds = currentAlerts.map(alert => alert.id);

        if (alertIds.length === 0) {
            showNotification('Keine Alarme zu bearbeiten', 'info');
            return;
        }

        // Alle Alarme verarbeiten
        const promises = alertIds.map(alertId =>
            fetch(`/api/notifications/${alertId}/read`, { method: 'PUT' })
        );

        const results = await Promise.all(promises);
        const successCount = results.filter(r => r.ok).length;

        if (successCount === alertIds.length) {
            // Banner mit Animation entfernen
            const banner = document.querySelector('.critical-alert-banner');
            if (banner) {
                banner.style.opacity = '0';
                banner.style.transform = 'translateY(-100%)';
                setTimeout(() => banner.remove(), 300);
            }

            // Gespeicherte Alarme löschen
            window.currentCriticalAlerts = [];

            showNotification(`🎉 Perfekt! Alle ${successCount} Alarme erledigt!`, 'success');

        } else {
            throw new Error(`Nur ${successCount} von ${alertIds.length} Alarmen erfolgreich bearbeitet`);
        }

    } catch (error) {
        console.error('Fehler beim Bearbeiten aller Alarme vom Banner:', error);
        button.innerHTML = originalText;
        button.disabled = false;
        showNotification('❌ Fehler: ' + error.message, 'error');
    }
}

function viewPatientDetails(patientId) {
    // Zu Patientenansicht weiterleiten oder Patientendetails öffnen
    if (window.currentUser && window.currentUser.type === 'mitarbeiter') {
        // Für Personal - könnte zu Patientenverwaltung weiterleiten
        window.location.href = `/admin?patient=${patientId}`;
    } else {
        showNotification('Patientendetails öffnen...', 'info');
    }
}

// CSS für kritische Alarme hinzufügen
function injectCriticalAlertCSS() {
    const style = document.createElement('style');
    style.textContent = `
        .critical-alert-banner {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: linear-gradient(135deg, #dc3545, #c82333);
            color: white;
            z-index: 9999;
            box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
            animation: criticalPulse 2s ease-in-out infinite;
        }

        .critical-alert-content {
            display: flex;
            align-items: center;
            padding: 1rem;
            max-width: 1200px;
            margin: 0 auto;
            gap: 1rem;
        }

        .critical-alert-icon {
            font-size: 2rem;
            animation: shake 0.5s infinite;
        }

        .critical-alert-text {
            flex: 1;
        }

        .critical-alert-details {
            font-size: 0.9rem;
            opacity: 0.9;
            margin-top: 0.25rem;
        }

        .critical-alert-banner-actions {
            display: flex;
            gap: 0.5rem;
            flex-wrap: wrap;
        }

        .critical-alert-action {
            background: rgba(255, 255, 255, 0.2);
            border: 2px solid white;
            color: white;
            padding: 0.5rem 1rem;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.3s ease;
            font-size: 0.9rem;
            white-space: nowrap;
        }

        .critical-alert-action:hover {
            background: white;
            color: #dc3545;
        }

        .critical-alert-action.secondary {
            background: rgba(255, 255, 255, 0.1);
            border-color: rgba(255, 255, 255, 0.6);
        }

        .critical-alert-action.secondary:hover {
            background: rgba(255, 255, 255, 0.9);
            color: #dc3545;
        }

        .critical-alert-close {
            background: none;
            border: none;
            color: white;
            font-size: 1.5rem;
            cursor: pointer;
            padding: 0.5rem;
            border-radius: 50%;
            transition: background 0.3s ease;
        }

        .critical-alert-close:hover {
            background: rgba(255, 255, 255, 0.2);
        }

        .critical-alert-modal {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
        }

        .critical-alert-modal-content {
            background: white;
            border-radius: 12px;
            max-width: 800px;
            max-height: 80vh;
            overflow-y: auto;
            width: 100%;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }

        .critical-alert-modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1.5rem;
            border-bottom: 1px solid #eee;
            background: linear-gradient(135deg, #dc3545, #c82333);
            color: white;
            border-radius: 12px 12px 0 0;
        }

        .critical-alert-modal-body {
            padding: 1.5rem;
            max-height: 400px;
            overflow-y: auto;
        }

        .critical-alert-item {
            background: #fff5f5;
            border: 1px solid #f5c6cb;
            border-radius: 8px;
            padding: 1rem;
            margin-bottom: 1rem;
            transition: all 0.3s ease;
        }

        .critical-alert-item.dismissing {
            opacity: 0;
            transform: translateX(100%);
        }

        .critical-alert-patient {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.5rem;
        }

        .critical-alert-time {
            font-size: 0.8rem;
            color: #666;
        }

        .critical-alert-message {
            margin-bottom: 1rem;
            line-height: 1.4;
            white-space: pre-line;
        }

        .critical-alert-actions {
            display: flex;
            gap: 0.5rem;
        }

        .critical-alert-actions button {
            transition: all 0.3s ease;
        }

        .critical-alert-actions button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none !important;
        }

        .loading-spinner {
            display: inline-block;
            width: 12px;
            height: 12px;
            border: 2px solid #f3f3f3;
            border-top: 2px solid #fff;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-right: 0.5rem;
        }

        .critical-alert-bulk-actions {
            margin-top: 1rem;
            padding-top: 1rem;
            border-top: 1px solid #ddd;
            text-align: center;
        }

        .btn-warning {
            background: linear-gradient(135deg, #ffc107, #ffb300);
            color: #212529;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            font-size: 1rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s ease;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            justify-content: center;
        }

        .btn-warning:hover {
            background: linear-gradient(135deg, #ffb300, #ff8f00);
            transform: translateY(-1px);
        }

        .btn-warning:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none !important;
        }

        @keyframes criticalPulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.8; }
        }

        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-2px); }
            75% { transform: translateX(2px); }
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        /* Hauptinhalt anpassen wenn kritisches Banner angezeigt wird */
        body:has(.critical-alert-banner) .main {
            margin-top: calc(3.5rem + 80px);
        }

        @media (max-width: 768px) {
            .critical-alert-content {
                flex-direction: column;
                text-align: center;
                gap: 0.5rem;
            }

            .critical-alert-banner-actions {
                justify-content: center;
                width: 100%;
            }

            .critical-alert-action {
                flex: 1;
                min-width: 120px;
            }

            .critical-alert-modal {
                padding: 1rem;
            }

            .critical-alert-actions {
                flex-direction: column;
            }

            .critical-alert-bulk-actions .btn-warning {
                width: 100%;
            }
        }
    `;
    document.head.appendChild(style);
}

// Kritisches Alarmsystem initialisieren
document.addEventListener('DOMContentLoaded', () => {
    injectCriticalAlertCSS();
    setupCriticalAlertMonitoring();
});

// Add these functions to your Admin/script.js file

// Global variables for patient management
let allPatients = [];
let availablePflegekraefte = [];

// Navigation function for patient management
window.showPatientManagementSection = function() {
    hideAllSections();
    document.getElementById('patientManagementSection').style.display = 'block';
    loadPatientsManagement();
};

window.showNewPatientForm = function() {
    document.getElementById('newPatientForm').style.display = 'block';
    setupPatientRegistrationForm();
};

window.hideNewPatientForm = function() {
    document.getElementById('newPatientForm').style.display = 'none';
    document.getElementById('patientRegistrationForm').reset();
    document.getElementById('assignmentPreview').style.display = 'none';
};

// Setup patient registration form with real-time availability checking
function setupPatientRegistrationForm() {
    const form = document.getElementById('patientRegistrationForm');
    const standortSelect = document.getElementById('patientStandort');

    // Remove existing event listeners
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);

    // Add form submission handler
    newForm.addEventListener('submit', handlePatientRegistration);

    // Add standort change handler for availability preview
    const newStandortSelect = document.getElementById('patientStandort');
    newStandortSelect.addEventListener('change', function() {
        if (this.value) {
            checkPflegekraftAvailability(this.value);
        } else {
            document.getElementById('assignmentPreview').style.display = 'none';
        }
    });

    console.log('Patient registration form setup complete');
}

// Check Pflegekraft availability at selected location
async function checkPflegekraftAvailability(standort) {
    const previewDiv = document.getElementById('assignmentPreview');
    const availableDiv = document.getElementById('availablePflegekraft');

    previewDiv.style.display = 'block';
    availableDiv.innerHTML = '<span class="loading">Prüfe verfügbare Pflegekräfte...</span>';
    availableDiv.className = 'preview-box';

    try {
        const response = await fetch(`/api/admin/pflegekraft-availability/${standort}`);
        const data = await response.json();

        if (data.success) {
            const available = data.pflegekraefte.filter(pf => pf.current_patients < 24);

            if (available.length > 0) {
                const bestMatch = available[0]; // Pflegekraft with least patients
                availableDiv.innerHTML = `
                    <div class="success">
                        ✅ <strong>Zuweisung möglich!</strong><br>
                        <strong>${bestMatch.name}</strong> hat ${bestMatch.current_patients}/24 Patienten<br>
                        <small>Patient wird automatisch zugewiesen</small>
                    </div>
                `;
                availableDiv.className = 'preview-box success';
            } else {
                availableDiv.innerHTML = `
                    <div class="warning">
                        ⚠️ <strong>Keine verfügbare Pflegekraft!</strong><br>
                        Alle Pflegekräfte am Standort ${standort} haben 24 Patienten<br>
                        <small>Patient wird ohne Zuweisung registriert</small>
                    </div>
                `;
                availableDiv.className = 'preview-box warning';
            }
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Availability check error:', error);
        availableDiv.innerHTML = `
            <div class="error">
                ❌ <strong>Fehler beim Prüfen der Verfügbarkeit</strong><br>
                <small>${error.message}</small>
            </div>
        `;
        availableDiv.className = 'preview-box error';
    }
}

// Handle patient registration form submission
async function handlePatientRegistration(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const patientData = Object.fromEntries(formData.entries());

    // Validation
    if (!patientData.vorname || !patientData.nachname || !patientData.geburtsdatum || !patientData.standort) {
        showNotification('Bitte füllen Sie alle Pflichtfelder aus', 'error');
        return;
    }

    // Generate username automatically
    const baseUsername = (patientData.vorname + '.' + patientData.nachname).toLowerCase()
        .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
        .replace(/[^a-z.]/g, '');

    const submitButton = e.target.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;
    submitButton.innerHTML = '<span class="loading-spinner"></span>Registriere...';
    submitButton.disabled = true;

    try {
        const response = await fetch('/api/admin/patients/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ...patientData,
                benutzername: baseUsername,
                adminId: adminId // from currentUser
            })
        });

        const result = await response.json();

        if (result.success) {
            showNotification(`Patient ${patientData.vorname} ${patientData.nachname} erfolgreich registriert! ${result.assignmentMessage || ''}`, 'success');
            hideNewPatientForm();
            await loadPatientsManagement(); // Refresh the list
        } else {
            throw new Error(result.message || 'Registration failed');
        }

    } catch (error) {
        console.error('Patient registration error:', error);
        showNotification('Fehler bei der Registrierung: ' + error.message, 'error');
    } finally {
        submitButton.innerHTML = originalText;
        submitButton.disabled = false;
    }
}

// Load patients management data
async function loadPatientsManagement() {
    try {
        const response = await fetch('/api/admin/patients/detailed');
        if (!response.ok) throw new Error('Failed to load patients');

        const data = await response.json();

        if (data.success) {
            allPatients = data.patients;
            updatePatientsTable(allPatients);
        } else {
            throw new Error(data.message);
        }

    } catch (error) {
        console.error('Load patients error:', error);
        showNotification('Fehler beim Laden der Patientenliste', 'error');
    }
}

// Update patients table
function updatePatientsTable(patients) {
    const tbody = document.querySelector('#patientsManagementTable tbody');

    if (patients.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; color: #666;">
                    Keine Patienten gefunden
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = patients.map(patient => `
        <tr>
            <td>${patient.id}</td>
            <td><strong>${patient.vorname} ${patient.nachname}</strong></td>
            <td>${new Date(patient.geburtsdatum).toLocaleDateString('de-DE')}</td>
            <td>${patient.standort}</td>
            <td>${patient.zimmer_nummer || 'TBD'}</td>
            <td>${patient.assigned_pflegekraft || '<span style="color: #e53e3e;">Nicht zugewiesen</span>'}</td>
            <td>
                <span class="status-badge ${patient.status}">${patient.status}</span>
            </td>
            <td>
                <button class="patient-action-btn view" onclick="viewPatientDetails(${patient.id})" title="Details ansehen">
                    👁️
                </button>
                <button class="patient-action-btn edit" onclick="editPatient(${patient.id})" title="Bearbeiten">
                    ✏️
                </button>
                ${patient.status === 'active' ? `
                    <button class="patient-action-btn delete" onclick="deactivatePatient(${patient.id})" title="Deaktivieren">
                        🚫
                    </button>
                ` : ''}
            </td>
        </tr>
    `).join('');
}

// Filter patients based on search and location
window.filterPatients = function() {
    const searchTerm = document.getElementById('patientSearchInput').value.toLowerCase();
    const locationFilter = document.getElementById('locationFilter').value;

    let filtered = allPatients;

    // Apply search filter
    if (searchTerm) {
        filtered = filtered.filter(patient =>
            patient.vorname.toLowerCase().includes(searchTerm) ||
            patient.nachname.toLowerCase().includes(searchTerm) ||
            patient.id.toString().includes(searchTerm)
        );
    }

    // Apply location filter
    if (locationFilter) {
        filtered = filtered.filter(patient => patient.standort === locationFilter);
    }

    updatePatientsTable(filtered);
};

// Patient action functions
window.viewPatientDetails = function(patientId) {
    const patient = allPatients.find(p => p.id === patientId);
    if (!patient) return;

    // Create modal with patient details
    const modal = document.createElement('div');
    modal.className = 'patient-details-modal';
    modal.innerHTML = `
        <div class="patient-details-modal-content">
            <div class="patient-details-modal-header">
                <h2>👤 ${patient.vorname} ${patient.nachname}</h2>
                <button class="modal-close" onclick="this.closest('.patient-details-modal').remove()">×</button>
            </div>
            <div class="patient-details-modal-body">
                <div class="patient-details-grid">
                    <div class="detail-section">
                        <h4>📋 Grunddaten</h4>
                        <p><strong>ID:</strong> ${patient.id}</p>
                        <p><strong>Geburtsdatum:</strong> ${new Date(patient.geburtsdatum).toLocaleDateString('de-DE')}</p>
                        <p><strong>Benutzername:</strong> ${patient.benutzername}</p>
                        <p><strong>Status:</strong> ${patient.status}</p>
                    </div>
                    
                    <div class="detail-section">
                        <h4>🏠 Aufenthalt</h4>
                        <p><strong>Standort:</strong> ${patient.standort}</p>
                        <p><strong>Zimmer:</strong> ${patient.zimmer_nummer || 'Nicht zugewiesen'}</p>
                        <p><strong>Aufnahme:</strong> ${patient.aufnahmedatum ? new Date(patient.aufnahmedatum).toLocaleDateString('de-DE') : 'Unbekannt'}</p>
                        <p><strong>Pflegekraft:</strong> ${patient.assigned_pflegekraft || 'Nicht zugewiesen'}</p>
                    </div>
                    
                    <div class="detail-section">
                        <h4>📞 Kontakt</h4>
                        <p><strong>Telefon:</strong> ${patient.telefon || 'Nicht angegeben'}</p>
                        <p><strong>Adresse:</strong> ${patient.adresse || 'Nicht angegeben'}</p>
                        <p><strong>Notfallkontakt:</strong> ${patient.notfallkontakt || 'Nicht angegeben'}</p>
                    </div>
                    
                    <div class="detail-section">
                        <h4>🏥 Medizinisch</h4>
                        <p><strong>Gesundheitszustand:</strong> ${patient.gesundheitszustand || 'Nicht dokumentiert'}</p>
                        <p><strong>Medikamente:</strong> ${patient.medikamente || 'Keine angegeben'}</p>
                        <p><strong>Allergien:</strong> ${patient.allergien || 'Keine bekannt'}</p>
                    </div>
                </div>
            </div>
            <div class="patient-details-modal-footer">
                <button class="btn-secondary" onclick="this.closest('.patient-details-modal').remove()">Schließen</button>
                <button class="btn-primary" onclick="editPatient(${patient.id}); this.closest('.patient-details-modal').remove();">Bearbeiten</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Add styles for the modal
    if (!document.getElementById('patient-details-modal-styles')) {
        const style = document.createElement('style');
        style.id = 'patient-details-modal-styles';
        style.textContent = `
            .patient-details-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.8);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 2rem;
            }
            
            .patient-details-modal-content {
                background: white;
                border-radius: 12px;
                max-width: 800px;
                max-height: 80vh;
                overflow-y: auto;
                width: 100%;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            }
            
            .patient-details-modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 1.5rem;
                border-bottom: 1px solid #eee;
                background: linear-gradient(135deg, #2d7ff9, #4b86f9);
                color: white;
                border-radius: 12px 12px 0 0;
            }
            
            .patient-details-modal-body {
                padding: 1.5rem;
            }
            
            .patient-details-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 1.5rem;
            }
            
            .detail-section {
                background: #f8fafc;
                padding: 1rem;
                border-radius: 8px;
                border-left: 4px solid #2d7ff9;
            }
            
            .detail-section h4 {
                color: #2d3748;
                margin-bottom: 0.75rem;
                font-size: 1rem;
                font-weight: 600;
            }
            
            .detail-section p {
                margin-bottom: 0.5rem;
                line-height: 1.4;
            }
            
            .patient-details-modal-footer {
                padding: 1.5rem;
                border-top: 1px solid #eee;
                display: flex;
                justify-content: flex-end;
                gap: 1rem;
            }
            
            .status-badge {
                padding: 0.25rem 0.5rem;
                border-radius: 4px;
                font-size: 0.8rem;
                font-weight: 500;
            }
            
            .status-badge.active {
                background: #c6f6d5;
                color: #22543d;
            }
            
            .status-badge.discharged {
                background: #fed7d7;
                color: #c53030;
            }
        `;
        document.head.appendChild(style);
    }
};

window.editPatient = function(patientId) {
    showNotification('Patienten-Bearbeitung wird implementiert...', 'info');
    // TODO: Implement patient editing functionality
};

window.deactivatePatient = function(patientId) {
    const patient = allPatients.find(p => p.id === patientId);
    if (!patient) return;

    if (confirm(`Möchten Sie ${patient.vorname} ${patient.nachname} wirklich deaktivieren?`)) {
        // TODO: Implement patient deactivation
        showNotification('Patienten-Deaktivierung wird implementiert...', 'info');
    }
};

// Make sure to call this when the admin dashboard loads
document.addEventListener('DOMContentLoaded', function() {
    // Existing initialization code...

    // Add patient management initialization if needed
    if (window.location.hash === '#patients') {
        showPatientManagementSection();
    }
});