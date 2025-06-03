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

    // ========== NAVIGATION FUNCTIONS ==========

    window.showTransferSection = function() {
        hideAllSections();
        document.getElementById('transferSection').style.display = 'block';
        loadTransferData();
        loadPatientsList();
    };

    window.showStatisticsSection = function() {
        hideAllSections();
        document.getElementById('statisticsSection').style.display = 'block';
        loadDetailedStatistics();
    };

    window.showTransferForm = function() {
        document.getElementById('transferForm').style.display = 'block';
    };

    window.hideTransferForm = function() {
        document.getElementById('transferForm').style.display = 'none';
        document.getElementById('adminTransferForm').reset();
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

    // ========== DATA LOADING FUNCTIONS ==========

    async function loadDashboardData() {
        try {
            showLoadingState();

            // Load admin dashboard data
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
        document.getElementById('adminUsername').textContent = currentUser.username;

        // Update statistics
        if (dashboard.location_statistics) {
            const stats = dashboard.location_statistics;

            let totalPatients = 0;
            let totalPflegekraefte = 0;
            let krefeldPatients = 0;
            let moenchengladbachPatients = 0;

            stats.patients.forEach(location => {
                totalPatients += parseInt(location.total_patients);
                if (location.standort === 'Krefeld') {
                    krefeldPatients = location.total_patients;
                } else if (location.standort === 'Mönchengladbach') {
                    moenchengladbachPatients = location.total_patients;
                }
            });

            stats.pflegekraefte.forEach(location => {
                totalPflegekraefte += parseInt(location.total_pflegekraefte);
            });

            document.getElementById('totalPatients').textContent = totalPatients;
            document.getElementById('totalPflegekraefte').textContent = totalPflegekraefte;
            document.getElementById('krefeld_patients').textContent = krefeldPatients;
            document.getElementById('moenchengladbach_patients').textContent = moenchengladbachPatients;
        }

        // Update recent activities
// Update recent activities
        if (dashboard.recent_transfers) {
            const activitiesHtml = dashboard.recent_transfers.length === 0
                ? '<div class="activity-item"><div class="activity-icon">📝</div><div class="activity-content"><span>Keine aktuellen Transfers</span></div></div>'
                : dashboard.recent_transfers.map(transfer => `
          <div class="activity-item">
            <div class="activity-icon">🔄</div>
            <div class="activity-content">
              <strong>${transfer.patient_name}</strong> von ${transfer.alter_standort} nach ${transfer.neuer_standort}
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
            ⚠️ <strong>${alert.pflegekraft_name}</strong> (${alert.standort}): ${alert.patient_count}/24 Patienten
          </div>
        `).join('');

            document.getElementById('workloadAlerts').innerHTML = alertsHtml;
        }}