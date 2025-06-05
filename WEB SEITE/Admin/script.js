document.addEventListener('DOMContentLoaded', () => {
    console.log('🔧 Admin Dashboard initializing...');

    // Get current user from sessionStorage
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
    const adminId = currentUser.id;

    if (!adminId || currentUser.type !== 'mitarbeiter') {
        alert('Keine Administratorberechtigung. Bitte loggen Sie sich erneut ein.');
        window.location.href = '/';
        return;
    }

    // Initialize dashboard
    init();

    async function init() {
        setupParticleBackground();
        setupEventListeners();
        await loadDashboardData();
        await loadTransferData();
        setupAutoRefresh();
    }

    // ========== PARTICLE BACKGROUND ==========
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

    // ========== EVENT LISTENERS ==========
    function setupEventListeners() {
        // Setup transfer form submission
        setupTransferFormSubmission();
    }

    // ========== NAVIGATION FUNCTIONS ==========
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
        console.log('Opening transfer form...');
        document.getElementById('transferForm').style.display = 'block';

        // Initialize patient search when form opens
        setTimeout(() => {
            initializePatientSearch();
        }, 100);
    };

    window.hideTransferForm = function() {
        document.getElementById('transferForm').style.display = 'none';
        document.getElementById('adminTransferForm').reset();

        // Clear search
        const searchInput = document.getElementById('transferPatientSearch');
        const hiddenInput = document.getElementById('transferPatientId');
        if (searchInput) searchInput.value = '';
        if (hiddenInput) hiddenInput.value = '';
    };

    function hideAllSections() {
        document.getElementById('dashboardSection').style.display = 'none';
        document.getElementById('transferSection').style.display = 'none';
        document.getElementById('statisticsSection').style.display = 'none';
    }

    window.logout = function() {
        if (confirm('Möchten Sie sich wirklich abmelden?')) {
            sessionStorage.removeItem('currentUser');
            window.location.href = '/';
        }
    };

    // ========== PATIENT SEARCH ==========
    function initializePatientSearch() {
        console.log('Initializing patient search...');

        let patients = [];

        // Load patients when search is initialized
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
            console.log('Search elements not found');
            return;
        }

        // Remove old event listeners by cloning the element
        const newSearchInput = searchInput.cloneNode(true);
        searchInput.parentNode.replaceChild(newSearchInput, searchInput);

        // Search when user types
        newSearchInput.addEventListener('input', function(e) {
            const query = e.target.value.trim();

            if (query.length < 2) {
                resultsContainer.style.display = 'none';
                return;
            }

            // Filter patients
            const filtered = patients.filter(patient => {
                const fullName = `${patient.vorname} ${patient.nachname}`.toLowerCase();
                return fullName.includes(query.toLowerCase());
            });

            // Show results
// Show results - ENHANCED VERSION with current location
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

        // Hide results when clicking outside
        newSearchInput.addEventListener('blur', function() {
            setTimeout(() => {
                resultsContainer.style.display = 'none';
            }, 200);
        });
    }

    // Global function to select a patient
// Global function to select a patient - ENHANCED VERSION
    // Global function to select a patient - ENHANCED VERSION
    window.selectPatient = async function(id, name) {
        document.getElementById('transferPatientSearch').value = name;
        document.getElementById('transferPatientId').value = id;
        document.getElementById('patientSearchResults').style.display = 'none';
        console.log('Selected patient:', id, name);

        // Update location dropdown based on patient's current location
        await updateLocationDropdown(id);
    };

// Add this new function to update the location dropdown
    async function updateLocationDropdown(patientId) {
        try {
            // Get patient's current location
            const response = await fetch(`/api/patients/${patientId}/location`);
            if (!response.ok) throw new Error('Failed to get patient location');

            const data = await response.json();
            const currentLocation = data.currentLocation;

            const locationSelect = document.getElementById('newLocation');
            const options = locationSelect.querySelectorAll('option');

            // Show/hide options based on current location
            options.forEach(option => {
                if (option.value === '') {
                    // Keep the placeholder option
                    option.style.display = 'block';
                } else if (option.value === currentLocation) {
                    // Hide current location
                    option.style.display = 'none';
                } else {
                    // Show other locations
                    option.style.display = 'block';
                }
            });

            // Reset the dropdown to placeholder
            locationSelect.value = '';

            console.log(`Patient is currently in ${currentLocation}, showing other options`);

        } catch (error) {
            console.error('Error updating location dropdown:', error);
            // If error, show all options
            const locationSelect = document.getElementById('newLocation');
            const options = locationSelect.querySelectorAll('option');
            options.forEach(option => {
                option.style.display = 'block';
            });
        }
    }

    // ========== FORM SUBMISSION ==========
    function setupTransferFormSubmission() {
        const form = document.getElementById('adminTransferForm');
        if (!form) {
            console.log('Transfer form not found');
            return;
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('Form submitted');

            const patientId = document.getElementById('transferPatientId').value;
            const newLocation = document.getElementById('newLocation').value;
            const reason = document.getElementById('transferReason').value;

            console.log('Form data:', { patientId, newLocation, reason });

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
                console.error('Transfer error:', error);
                showNotification('Fehler beim Transfer: ' + error.message, 'error');
            } finally {
                hideLoadingState();
            }
        });
    }

    // ========== DATA LOADING FUNCTIONS ==========
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
            console.error('Dashboard loading error:', error);
            showNotification('Fehler beim Laden der Dashboard-Daten', 'error');
        } finally {
            hideLoadingState();
        }
    }

    function updateDashboardUI(dashboard) {
        // Update admin username
        document.getElementById('adminUsername').textContent = currentUser.username || 'Administrator';

        // Update statistics
        if (dashboard.location_statistics) {
            const stats = dashboard.location_statistics;

            let totalPatients = 0;
            let totalPflegekraefte = 0;
            let krefeldPatients = 0;
            let moenchengladbachPatients = 0;

            // Process patient statistics
            stats.patients.forEach(location => {
                const count = parseInt(location.total_patients) || 0;
                totalPatients += count;

                if (location.standort === 'Krefeld') {
                    krefeldPatients = count;
                } else if (location.standort === 'Mönchengladbach') {
                    moenchengladbachPatients = count;
                }
            });

            // Process pflegekraft statistics
            stats.pflegekraefte.forEach(location => {
                totalPflegekraefte += parseInt(location.total_pflegekraefte) || 0;
            });

            // Update DOM elements
            document.getElementById('totalPatients').textContent = totalPatients;
            document.getElementById('totalPflegekraefte').textContent = totalPflegekraefte;
            document.getElementById('krefeld_patients').textContent = krefeldPatients;
            document.getElementById('moenchengladbach_patients').textContent = moenchengladbachPatients;
        }

        // Update recent activities
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

        // Update workload alerts
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

    // ========== TRANSFER MANAGEMENT ==========
    async function loadTransferData() {
        try {
            // Load recent transfers
            const transfersResponse = await fetch('/api/admin/transfers/recent');
            if (transfersResponse.ok) {
                const transfersData = await transfersResponse.json();
                updateRecentTransfersTable(transfersData.transfers || []);
            }

            // Load pending requests
            const requestsResponse = await fetch('/api/admin/transfers/requests');
            if (requestsResponse.ok) {
                const requestsData = await requestsResponse.json();
                updateTransferRequestsTable(requestsData.requests || []);
            }
        } catch (error) {
            console.error('Transfer data loading error:', error);
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

    // ========== DETAILED STATISTICS ==========
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
            console.error('Detailed statistics error:', error);
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

    // ========== UTILITY FUNCTIONS ==========
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

    // ========== AUTO REFRESH ==========
    function setupAutoRefresh() {
        setInterval(async () => {
            await loadDashboardData();
        }, 120000);

        setInterval(async () => {
            const transferSection = document.getElementById('transferSection');
            if (transferSection.style.display !== 'none') {
                await loadTransferData();
            }
        }, 60000);
    }

    // ========== GLOBAL FUNCTIONS ==========
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
            console.error('Approval error:', error);
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
            console.error('Rejection error:', error);
            showNotification('Fehler bei der Ablehnung: ' + error.message, 'error');
        }
    };

    console.log('✅ Admin Dashboard fully initialized');
});

// Add this to your dashboard JavaScript files (both Pflegekraft and Admin)

// Enhanced notification system for critical health alerts
function setupCriticalAlertMonitoring() {
    // Check for critical alerts every 30 seconds
    setInterval(async () => {
        await checkForCriticalAlerts();
    }, 30000);

    // Check immediately on page load
    checkForCriticalAlerts();
}

async function checkForCriticalAlerts() {
    try {
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
        const userId = currentUser.id;
        const userType = currentUser.type;

        if (!userId) return;

        // Get unread critical notifications
        const response = await fetch(`/api/notifications/critical/${userId}?userType=${userType}`);

        if (!response.ok) return;

        const data = await response.json();

        if (data.success && data.criticalAlerts.length > 0) {
            displayCriticalAlerts(data.criticalAlerts);
        }

    } catch (error) {
        console.error('Critical alert check error:', error);
    }
}

function displayCriticalAlerts(alerts) {
    // Remove existing critical alert banner
    const existingBanner = document.querySelector('.critical-alert-banner');
    if (existingBanner) {
        existingBanner.remove();
    }

    if (alerts.length === 0) return;

    // Create critical alert banner
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

    // Insert at top of page
    document.body.insertBefore(banner, document.body.firstChild);

    // Store alerts for detail view
    window.currentCriticalAlerts = alerts;

    // Auto-remove after 2 minutes if not interacted with
    setTimeout(() => {
        if (banner.parentElement) {
            banner.remove();
        }
    }, 120000);
}

function showCriticalAlertDetails() {
    const alerts = window.currentCriticalAlerts || [];

    if (alerts.length === 0) return;

    // Create modal with alert details
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

async function acknowledgeAlert(alertId) {
    try {
        // Show loading state on button
        const button = event.target;
        const originalText = button.innerHTML;
        button.innerHTML = '<span class="loading-spinner"></span>Wird verarbeitet...';
        button.disabled = true;

        const response = await fetch(`/api/notifications/${alertId}/read`, {
            method: 'PUT'
        });

        if (response.ok) {
            // Find and remove the specific alert item with animation
            const alertItem = button.closest('.critical-alert-item');
            if (alertItem) {
                // Add dismissal animation
                alertItem.style.transition = 'all 0.3s ease';
                alertItem.style.opacity = '0';
                alertItem.style.transform = 'translateX(100%)';

                setTimeout(() => {
                    alertItem.remove();

                    // Check if this was the last alert in the modal
                    const remainingAlerts = document.querySelectorAll('.critical-alert-item');
                    if (remainingAlerts.length === 0) {
                        // Close modal and remove banner if no alerts left
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

                        // Update banner count
                        updateBannerAlertCount();
                    }
                }, 300);
            }

            // Remove this alert from our stored alerts
            if (window.currentCriticalAlerts) {
                window.currentCriticalAlerts = window.currentCriticalAlerts.filter(
                    alert => alert.id !== alertId
                );
            }

        } else {
            throw new Error('Server returned error');
        }
    } catch (error) {
        console.error('Error acknowledging alert:', error);

        // Restore button state
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

async function acknowledgeAllAlerts() {
    const button = event.target;
    const originalText = button.innerHTML;

    try {
        button.innerHTML = '<span class="loading-spinner"></span>Bearbeite alle Alarme...';
        button.disabled = true;

        const currentAlerts = window.currentCriticalAlerts || [];
        const alertIds = currentAlerts.map(alert => alert.id);

        // Process all alerts
        const promises = alertIds.map(alertId =>
            fetch(`/api/notifications/${alertId}/read`, { method: 'PUT' })
        );

        const results = await Promise.all(promises);
        const successCount = results.filter(r => r.ok).length;

        if (successCount === alertIds.length) {
            // All successful - close everything
            const modal = document.querySelector('.critical-alert-modal');
            const banner = document.querySelector('.critical-alert-banner');

            // Animate modal closure
            if (modal) {
                modal.style.opacity = '0';
                setTimeout(() => modal.remove(), 300);
            }

            // Animate banner removal
            if (banner) {
                banner.style.opacity = '0';
                setTimeout(() => banner.remove(), 300);
            }

            // Clear stored alerts
            window.currentCriticalAlerts = [];

            showNotification(`✅ Alle ${successCount} Alarme erfolgreich bearbeitet!`, 'success');

        } else {
            throw new Error(`Nur ${successCount} von ${alertIds.length} Alarmen erfolgreich bearbeitet`);
        }

    } catch (error) {
        console.error('Error acknowledging all alerts:', error);
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

        // Process all alerts
        const promises = alertIds.map(alertId =>
            fetch(`/api/notifications/${alertId}/read`, { method: 'PUT' })
        );

        const results = await Promise.all(promises);
        const successCount = results.filter(r => r.ok).length;

        if (successCount === alertIds.length) {
            // Remove banner with animation
            const banner = document.querySelector('.critical-alert-banner');
            if (banner) {
                banner.style.opacity = '0';
                banner.style.transform = 'translateY(-100%)';
                setTimeout(() => banner.remove(), 300);
            }

            // Clear stored alerts
            window.currentCriticalAlerts = [];

            showNotification(`🎉 Perfekt! Alle ${successCount} Alarme erledigt!`, 'success');

        } else {
            throw new Error(`Nur ${successCount} von ${alertIds.length} Alarmen erfolgreich bearbeitet`);
        }

    } catch (error) {
        console.error('Error acknowledging all alerts from banner:', error);
        button.innerHTML = originalText;
        button.disabled = false;
        showNotification('❌ Fehler: ' + error.message, 'error');
    }
}

function viewPatientDetails(patientId) {
    // Redirect to patient view or open patient details
    if (window.currentUser && window.currentUser.type === 'mitarbeiter') {
        // For staff - could redirect to patient management
        window.location.href = `/admin?patient=${patientId}`;
    } else {
        showNotification('Patient-Details öffnen...', 'info');
    }
}

// Add CSS for critical alerts
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

        /* Adjust main content when critical banner is shown */
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

// Initialize critical alert system
document.addEventListener('DOMContentLoaded', () => {
    injectCriticalAlertCSS();
    setupCriticalAlertMonitoring();
});