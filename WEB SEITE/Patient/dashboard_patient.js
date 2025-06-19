document.addEventListener('DOMContentLoaded', () => {
    const userEl = document.getElementById('username');
    const caregiverEl = document.getElementById('caregiver');
    const taskCountEl = document.getElementById('todayTaskCount');
    const currentLocationEl = document.getElementById('currentLocation');
    const tableBody = document.querySelector('#assignmentsTable tbody');
    const historyTable = document.getElementById('historyTable');
    const historyTableBody = document.querySelector('#historyTable tbody');
    const showHistoryBtn = document.getElementById('showHistoryBtn');

    // Aktueller Benutzer aus sessionStorage laden
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
    const patientId = currentUser.id;
    let patientData = {};

    if (!patientId) {
        alert('Benutzer nicht gefunden. Bitte loggen Sie sich erneut ein.');
        window.location.href = '/';
        return;
    }

    // Navigation zwischen Abschnitten
    window.showTransferRequestSection = function() {
        hideAllSections();
        document.getElementById('transferRequestSection').style.display = 'block';
        loadTransferRequests();
        updateTransferForm();
    };

    window.showDashboardSection = function() {
        hideAllSections();
        document.getElementById('dashboardSection').style.display = 'block';
    };

    function hideAllSections() {
        document.getElementById('dashboardSection').style.display = 'none';
        document.getElementById('transferRequestSection').style.display = 'none';
    }

    // Dashboard-Daten vom Server laden
    function loadDashboardData() {
        fetch(`/api/patient/dashboard/${patientId}`)
            .then(res => {
                if (!res.ok) {
                    throw new Error('Network response was not ok');
                }
                return res.json();
            })
            .then(data => {
                if (data.success) {
                    patientData = data;
                    userEl.textContent = data.username;
                    caregiverEl.textContent = data.caregiver;
                    taskCountEl.textContent = data.todaysAssignments.length;
                    currentLocationEl.textContent = data.currentLocation || 'Unbekannt';

                    tableBody.innerHTML = '';

                    if (data.todaysAssignments.length === 0) {
                        const tr = document.createElement('tr');
                        tr.innerHTML = `
              <td colspan="3" style="text-align: center; color: #666;">
                Keine Aufgaben für heute geplant
              </td>
            `;
                        tableBody.appendChild(tr);
                    } else {
                        data.todaysAssignments.forEach(a => {
                            const tr = document.createElement('tr');
                            tr.innerHTML = `
                <td>${a.aufgabe}</td>
                <td>${a.zeit}</td>
                <td><span class="status ${a.status.toLowerCase()}">${a.status}</span></td>
              `;
                            tableBody.appendChild(tr);
                        });
                    }
                } else {
                    throw new Error(data.message || 'Failed to load dashboard');
                }
            })
            .catch(error => {
                console.error('Dashboard loading error:', error);
                userEl.textContent = currentUser.username || 'Unbekannt';
                caregiverEl.textContent = 'Nicht verfügbar';
                taskCountEl.textContent = '—';
                currentLocationEl.textContent = 'Unbekannt';

                const tr = document.createElement('tr');
                tr.innerHTML = `
          <td colspan="3" style="text-align: center; color: #666;">
            Fehler beim Laden der Daten. Bitte versuchen Sie es später erneut.
          </td>
        `;
                tableBody.appendChild(tr);
            });
    }

    // Transfer-Formular mit aktuellen Standort-Daten aktualisieren
    function updateTransferForm() {
        const currentLocationDisplay = document.getElementById('currentLocationDisplay');
        const requestedLocationSelect = document.getElementById('requestedLocation');

        currentLocationDisplay.value = patientData.currentLocation || 'Unbekannt';

        // Aktuellen Standort aus Optionen entfernen
        const currentLocation = patientData.currentLocation;
        Array.from(requestedLocationSelect.options).forEach(option => {
            if (option.value === currentLocation) {
                option.style.display = 'none';
            } else {
                option.style.display = 'block';
            }
        });
    }

    function loadTransferRequests() {
        fetch(`/api/patient/transfer-requests/${patientId}`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    updateRequestsTable(data.requests);
                }
            })
            .catch(error => {
                console.error('Transfer requests loading error:', error);
            });
    }

    // Tabelle mit Transfer-Anfragen aktualisieren
    function updateRequestsTable(requests) {
        const tbody = document.querySelector('#requestsTable tbody');

        if (requests.length === 0) {
            tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; color: #666;">
            Keine Anfragen vorhanden
          </td>
        </tr>
      `;
            return;
        }

        tbody.innerHTML = requests.map(request => {
            const statusClass = getStatusClass(request.status);
            const priorityClass = getPriorityClass(request.priority);

            return `
        <tr>
          <td>${request.requested_standort}</td>
          <td>${request.reason.substring(0, 50)}${request.reason.length > 50 ? '...' : ''}</td>
          <td><span class="priority ${priorityClass}">${getPriorityText(request.priority)}</span></td>
          <td><span class="status ${statusClass}">${getStatusText(request.status)}</span></td>
          <td>${new Date(request.created_at).toLocaleDateString('de-DE')}</td>
          <td>${request.admin_response || 'Ausstehend'}</td>
        </tr>
      `;
        }).join('');
    }

    // CSS-Klassen für Status und Priorität bestimmen
    function getStatusClass(status) {
        const classes = {
            'pending': 'ausstehend',
            'approved': 'approved',
            'rejected': 'rejected',
            'completed': 'abgeschlossen'
        };
        return classes[status] || 'ausstehend';
    }

    function getPriorityClass(priority) {
        const classes = {
            'normal': 'normal',
            'high': 'high',
            'urgent': 'urgent'
        };
        return classes[priority] || 'normal';
    }

    function getStatusText(status) {
        const texts = {
            'pending': 'Ausstehend',
            'approved': 'Genehmigt',
            'rejected': 'Abgelehnt',
            'completed': 'Abgeschlossen'
        };
        return texts[status] || 'Unbekannt';
    }

    function getPriorityText(priority) {
        const texts = {
            'normal': 'Normal',
            'high': 'Hoch',
            'urgent': 'Dringend'
        };
        return texts[priority] || 'Normal';
    }

    // Transfer-Anfrage senden
    document.getElementById('transferRequestForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(e.target);

        const requestData = {
            patientId: patientId,
            currentStandort: patientData.currentLocation,
            requestedStandort: formData.get('requestedLocation'),
            reason: formData.get('transferReason'),
            prioritaet: formData.get('priority'),
            requesterType: 'patient',
            requesterId: patientId,
            requesterName: patientData.fullName || patientData.username || 'Patient'
        };

        // Frontend-Validierung
        if (!requestData.requestedStandort || !requestData.reason || !requestData.requesterName) {
            showNotification('Bitte füllen Sie alle Pflichtfelder aus', 'error');
            return;
        }

        try {
            const response = await fetch('/api/patient/transfer-requests', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });

            const result = await response.json();

            if (result.success) {
                showNotification('Transfer-Anfrage erfolgreich gesendet', 'success');
                document.getElementById('transferRequestForm').reset();
                loadTransferRequests();
            } else {
                throw new Error(result.message || 'Anfrage konnte nicht gesendet werden');
            }
        } catch (error) {
            console.error('Transfer request error:', error);
            showNotification('Fehler beim Senden der Anfrage: ' + error.message, 'error');
        }
    });

    // Add these functions to your dashboard_patient.js file

// Load vital signs data for patient dashboard
    function loadVitalSigns(patientId) {
        fetch(`/api/patient/${patientId}/vital-summary`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    updateVitalSignsDisplay(data);
                } else {
                    showVitalSignsError(data.message || 'Fehler beim Laden der Vitaldaten');
                }
            })
            .catch(error => {
                console.error('Vital signs loading error:', error);
                showVitalSignsError('Fehler beim Laden der Vitaldaten');
            });
    }

// Update vital signs display with data
    function updateVitalSignsDisplay(data) {
        const loadingState = document.getElementById('vitalLoadingState');
        const noDataState = document.getElementById('vitalNoDataState');
        const dataDisplay = document.getElementById('vitalDataDisplay');
        const lastUpdateEl = document.getElementById('vitalLastUpdate');

        // Hide loading state
        loadingState.style.display = 'none';

        if (!data.hasData) {
            // Show no data state
            noDataState.style.display = 'block';
            dataDisplay.style.display = 'none';
            lastUpdateEl.textContent = 'Keine aktuellen Daten';
            return;
        }

        // Show data display
        noDataState.style.display = 'none';
        dataDisplay.style.display = 'block';

        // Update last measurement time
        if (data.lastMeasurement) {
            const measurementDate = new Date(data.lastMeasurement);
            const now = new Date();
            const diffHours = Math.floor((now - measurementDate) / (1000 * 60 * 60));

            let timeText;
            if (diffHours < 1) {
                timeText = 'Vor weniger als einer Stunde gemessen';
            } else if (diffHours < 24) {
                timeText = `Vor ${diffHours} Stunde${diffHours > 1 ? 'n' : ''} gemessen`;
            } else {
                const diffDays = Math.floor(diffHours / 24);
                timeText = `Vor ${diffDays} Tag${diffDays > 1 ? 'en' : ''} gemessen`;
            }

            lastUpdateEl.textContent = timeText;
        }

        // Update status banner
        updateVitalStatusBanner(data.overallStatus, data.statusMessage);

        // Update individual vital cards
        updateVitalCard('vitalBloodPressure', data.vitals.bloodPressure);
        updateVitalCard('vitalPulse', data.vitals.pulse);
        updateVitalCard('vitalTemperature', data.vitals.temperature);
        updateVitalCard('vitalOxygen', data.vitals.oxygenSaturation);
        updateVitalCard('vitalWeight', data.vitals.weight);
    }

// Update status banner
    function updateVitalStatusBanner(status, message) {
        const banner = document.querySelector('.vital-status-banner');
        const indicator = document.getElementById('vitalStatusIndicator');
        const messageEl = document.getElementById('vitalStatusMessage');

        // Remove existing status classes
        banner.classList.remove('warning', 'critical');
        indicator.classList.remove('warning', 'critical');

        // Add appropriate status class
        if (status === 'warning') {
            banner.classList.add('warning');
            indicator.classList.add('warning');
        } else if (status === 'critical') {
            banner.classList.add('critical');
            indicator.classList.add('critical');
        }

        messageEl.textContent = message;
    }

// Update individual vital card
    function updateVitalCard(cardId, vitalData) {
        const card = document.getElementById(cardId);
        const valueEl = card.querySelector('.value');
        const trendEl = card.querySelector('.vital-trend');

        // Remove existing status classes
        card.classList.remove('warning', 'critical');

        if (vitalData.value !== null && vitalData.value !== undefined) {
            // Display value
            if (typeof vitalData.value === 'number') {
                valueEl.textContent = vitalData.value.toFixed(1);
            } else {
                valueEl.textContent = vitalData.value;
            }

            // Update trend
            trendEl.className = `vital-trend ${vitalData.trend}`;

            // Set trend text based on trend direction
            const trendTexts = {
                'increasing': 'Steigend',
                'decreasing': 'Fallend',
                'stable': 'Stabil'
            };
            trendEl.textContent = trendTexts[vitalData.trend] || '';

            // Add status class to card
            if (vitalData.status === 'warning') {
                card.classList.add('warning');
            } else if (vitalData.status === 'critical') {
                card.classList.add('critical');
            }
        } else {
            // No data available
            valueEl.textContent = '--';
            trendEl.textContent = '';
            trendEl.className = 'vital-trend';
        }
    }

// Show error state for vital signs
    function showVitalSignsError(message) {
        const loadingState = document.getElementById('vitalLoadingState');
        const noDataState = document.getElementById('vitalNoDataState');
        const dataDisplay = document.getElementById('vitalDataDisplay');
        const lastUpdateEl = document.getElementById('vitalLastUpdate');

        loadingState.style.display = 'none';
        dataDisplay.style.display = 'none';

        // Show error in no data state
        noDataState.style.display = 'block';
        noDataState.querySelector('h4').textContent = 'Fehler beim Laden';
        noDataState.querySelector('p').textContent = message;

        lastUpdateEl.textContent = 'Daten nicht verfügbar';
    }

// Add this to your existing DOMContentLoaded event listener
// Update the main loadDashboardData function to also load vital signs

    function loadDashboardData() {
        fetch(`/api/patient/dashboard/${patientId}`)
            .then(res => {
                if (!res.ok) {
                    throw new Error('Network response was not ok');
                }
                return res.json();
            })
            .then(data => {
                if (data.success) {
                    patientData = data;
                    userEl.textContent = data.username;
                    caregiverEl.textContent = data.caregiver;
                    taskCountEl.textContent = data.todaysAssignments.length;
                    currentLocationEl.textContent = data.currentLocation || 'Unbekannt';

                    // Update assignments table
                    tableBody.innerHTML = '';
                    if (data.todaysAssignments.length === 0) {
                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                        <td colspan="3" style="text-align: center; color: #666;">
                            Keine Aufgaben für heute geplant
                        </td>
                    `;
                        tableBody.appendChild(tr);
                    } else {
                        data.todaysAssignments.forEach(a => {
                            const tr = document.createElement('tr');
                            tr.innerHTML = `
                            <td>${a.aufgabe}</td>
                            <td>${a.zeit}</td>
                            <td><span class="status ${a.status.toLowerCase()}">${a.status}</span></td>
                        `;
                            tableBody.appendChild(tr);
                        });
                    }

                    // Load vital signs data
                    loadVitalSigns(patientId);
                } else {
                    throw new Error(data.message || 'Failed to load dashboard');
                }
            })
            .catch(error => {
                console.error('Dashboard loading error:', error);
                userEl.textContent = currentUser.username || 'Unbekannt';
                caregiverEl.textContent = 'Nicht verfügbar';
                taskCountEl.textContent = '—';
                currentLocationEl.textContent = 'Unbekannt';

                const tr = document.createElement('tr');
                tr.innerHTML = `
                <td colspan="3" style="text-align: center; color: #666;">
                    Fehler beim Laden der Daten. Bitte versuchen Sie es später erneut.
                </td>
            `;
                tableBody.appendChild(tr);

                // Show error for vital signs too
                showVitalSignsError('Fehler beim Laden der Dashboard-Daten');
            });
    }

// Update the interval to also refresh vital signs
// Replace the existing setInterval call with:
    setInterval(() => {
        loadDashboardData(); // This now includes vital signs loading
    }, 30000); // Refresh every 30 seconds

    // Vergangene Aktivitäten laden
    function loadAssignmentHistory() {
        fetch(`/api/patient/assignments/history/${patientId}?days=7`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    historyTableBody.innerHTML = '';

                    if (data.assignments.length === 0) {
                        const tr = document.createElement('tr');
                        tr.innerHTML = `
              <td colspan="5" style="text-align: center; color: #666;">
                Keine vergangenen Aktivitäten gefunden
              </td>
            `;
                        historyTableBody.appendChild(tr);
                    } else {
                        data.assignments.forEach(a => {
                            const tr = document.createElement('tr');
                            tr.innerHTML = `
                <td>${a.datum}</td>
                <td>${a.aufgabe}</td>
                <td>${a.zeit}</td>
                <td><span class="status ${a.status.toLowerCase()}">${a.status}</span></td>
                <td>${a.pflegekraft}</td>
              `;
                            historyTableBody.appendChild(tr);
                        });
                    }

                    historyTable.style.display = 'table';
                    showHistoryBtn.textContent = 'Vergangene Aktivitäten ausblenden';
                }
            })
            .catch(error => {
                console.error('History loading error:', error);
                showNotification('Fehler beim Laden der Aktivitäten-Historie', 'error');
            });
    }

    // Historie anzeigen/ausblenden
    showHistoryBtn.addEventListener('click', () => {
        if (historyTable.style.display === 'none' || historyTable.style.display === '') {
            loadAssignmentHistory();
        } else {
            historyTable.style.display = 'none';
            showHistoryBtn.textContent = 'Vergangene Aktivitäten anzeigen';
        }
    });

    // Benachrichtigungssystem
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
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    window.logout = function() {
        if (confirm('Möchten Sie sich wirklich abmelden?')) {
            sessionStorage.removeItem('currentUser');
            window.location.href = '/';
        }
    };

    loadDashboardData();


    // Automatische Aktualisierung alle 30 Sekunden
    setInterval(loadDashboardData, 30000);

    // Partikel-Hintergrund Animation
    const canvas = document.getElementById('bg');
    const ctx = canvas.getContext('2d');
    let particles = [];
    const count = 120;

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
            this.size = Math.random() * 3 + 1;
            this.vx = (Math.random() - 0.5) * 0.7;
            this.vy = (Math.random() - 0.5) * 0.7;
            this.alpha = Math.random() * 0.5 + 0.3;
        }
        update() {
            this.x += this.vx;
            this.y += this.vy;
            if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height)
                this.reset();
        }
        draw() {
            ctx.fillStyle = `rgba(255,255,255,${this.alpha})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function init() {
        particles = [];
        for (let i = 0; i < count; i++)
            particles.push(new Particle());
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            p.update();
            p.draw();
        });
        requestAnimationFrame(animate);
    }

    init();
    animate();
});