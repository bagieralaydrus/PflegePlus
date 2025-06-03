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
            if (filtered.length === 0) {
                resultsContainer.innerHTML = '<div class="no-results">Keine Patienten gefunden</div>';
            } else {
                resultsContainer.innerHTML = filtered.map(patient => `
                    <div class="search-result-item" onclick="selectPatient(${patient.id}, '${patient.vorname} ${patient.nachname}')">
                        <div class="patient-name">${patient.vorname} ${patient.nachname}</div>
                        <div class="patient-details">ID: ${patient.id}</div>
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
    window.selectPatient = function(id, name) {
        document.getElementById('transferPatientSearch').value = name;
        document.getElementById('transferPatientId').value = id;
        document.getElementById('patientSearchResults').style.display = 'none';
        console.log('Selected patient:', id, name);
    };

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