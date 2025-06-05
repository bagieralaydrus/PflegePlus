document.addEventListener('DOMContentLoaded', () => {
  const userEl       = document.getElementById('username');
  const activeEl     = document.getElementById('activePatients');
  const completedEl  = document.getElementById('completedAssignments');
  const tableBody    = document.querySelector('#assignmentsTable tbody');

  // Get current user from sessionStorage
  const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
  const mitarbeiterId = currentUser.id;

  if (!mitarbeiterId) {
    alert('Benutzer nicht gefunden. Bitte loggen Sie sich erneut ein.');
    window.location.href = '/';
    return;
  }

  function loadDashboardData() {
    fetch(`/api/dashboard/${mitarbeiterId}`)
        .then(res => {
          if (!res.ok) {
            throw new Error('Network response was not ok');
          }
          return res.json();
        })
        .then(data => {
          if (data.success) {
            userEl.textContent      = data.username;
            activeEl.textContent    = data.activePatients;
            completedEl.textContent = data.completedAssignments;

            // Clear existing table rows
            tableBody.innerHTML = '';

            // Add assignments to table
            data.todaysAssignments.forEach(a => {
              const tr = document.createElement('tr');
              tr.innerHTML = `
                <td>${a.patient}</td>
                <td>${a.aufgabe}</td>
                <td>${a.zeit}</td>
                <td>
                  <span class="status ${a.status.toLowerCase()}">${a.status}</span>
                  <div class="task-actions">
                    ${a.status.toLowerCase() === 'ausstehend' ?
                  `<button class="btn-complete" onclick="completeTask(${a.id})">✓ Abschließen</button>` :
                  ''
              }
                    <button class="btn-delete" onclick="deleteTask(${a.id})">🗑 Löschen</button>
                  </div>
                </td>
              `;
              tableBody.appendChild(tr);
            });
          } else {
            throw new Error(data.message || 'Failed to load dashboard');
          }
        })
        .catch(error => {
          console.error('Dashboard loading error:', error);
          userEl.textContent      = currentUser.username || 'Unbekannt';
          activeEl.textContent    = '—';
          completedEl.textContent = '—';

          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td colspan="4" style="text-align: center; color: #666;">
              Fehler beim Laden der Daten. Bitte versuchen Sie es später erneut.
            </td>
          `;
          tableBody.appendChild(tr);
        });
  }

  // Function to complete a task
  window.completeTask = function(assignmentId) {
    if (confirm('Aufgabe als abgeschlossen markieren?')) {
      fetch(`/api/assignments/${assignmentId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'abgeschlossen' })
      })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              loadDashboardData(); // Reload dashboard
              showNotification('Aufgabe erfolgreich abgeschlossen!', 'success');
            } else {
              showNotification('Fehler beim Abschließen der Aufgabe', 'error');
            }
          })
          .catch(error => {
            console.error('Complete task error:', error);
            showNotification('Fehler beim Abschließen der Aufgabe', 'error');
          });
    }
  };

  // Function to delete a task
  window.deleteTask = function(assignmentId) {
    if (confirm('Aufgabe wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
      fetch(`/api/assignments/${assignmentId}`, {
        method: 'DELETE'
      })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              loadDashboardData(); // Reload dashboard
              showNotification('Aufgabe erfolgreich gelöscht!', 'success');
            } else {
              showNotification('Fehler beim Löschen der Aufgabe', 'error');
            }
          })
          .catch(error => {
            console.error('Delete task error:', error);
            showNotification('Fehler beim Löschen der Aufgabe', 'error');
          });
    }
  };

  // Initial load
  loadDashboardData();

  // Particle background code (keep existing code)
  const canvas = document.getElementById('bg');
  const ctx    = canvas.getContext('2d');
  let particles = [];
  const count   = 120;

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  class Particle {
    constructor() { this.reset(); }
    reset() {
      this.x     = Math.random() * canvas.width;
      this.y     = Math.random() * canvas.height;
      this.size  = Math.random() * 3 + 1;
      this.vx    = (Math.random() - 0.5) * 0.7;
      this.vy    = (Math.random() - 0.5) * 0.7;
      this.alpha = Math.random() * 0.5 + 0.3;
    }
    update() {
      this.x += this.vx; this.y += this.vy;
      if (this.x<0||this.x>canvas.width||this.y<0||this.y>canvas.height) this.reset();
    }
    draw() {
      ctx.fillStyle = `rgba(255,255,255,${this.alpha})`;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI*2);
      ctx.fill();
    }
  }

  function init() {
    particles = [];
    for (let i=0; i<count; i++) particles.push(new Particle());
  }
  function animate() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    particles.forEach(p => { p.update(); p.draw(); });
    requestAnimationFrame(animate);
  }

  init();
  animate();

  // ========== CRITICAL ALERT SYSTEM ==========
  setupCriticalAlertMonitoring();

  function setupCriticalAlertMonitoring() {
    setInterval(async () => {
      await checkForCriticalAlerts();
    }, 30000);
    checkForCriticalAlerts();
  }

  async function checkForCriticalAlerts() {
    try {
      const response = await fetch(`/api/notifications/critical/${mitarbeiterId}?userType=mitarbeiter`);
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
    const existingBanner = document.querySelector('.critical-alert-banner');
    if (existingBanner) existingBanner.remove();
    if (alerts.length === 0) return;

    const banner = document.createElement('div');
    banner.className = 'critical-alert-banner';
    banner.innerHTML = `
      <div class="critical-alert-content">
        <div class="critical-alert-icon">🚨</div>
        <div class="critical-alert-text">
          <strong>KRITISCHE GESUNDHEITSWERTE ERKANNT!</strong>
          <div class="critical-alert-details">${alerts.length} Patient(en) benötigen sofortige Aufmerksamkeit</div>
        </div>
        <div class="critical-alert-banner-actions">
          <button class="critical-alert-action" onclick="showCriticalAlertDetails()">📋 Details anzeigen</button>
          <button class="critical-alert-action secondary" onclick="acknowledgeAllAlertsFromBanner()">✅ Alle erledigt</button>
        </div>
        <button class="critical-alert-close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;
    document.body.insertBefore(banner, document.body.firstChild);
    window.currentCriticalAlerts = alerts;
  }

  window.showCriticalAlertDetails = function() {
    const alerts = window.currentCriticalAlerts || [];
    if (alerts.length === 0) return;

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
              <div class="critical-alert-message">${alert.nachricht}</div>
              <div class="critical-alert-actions">
                <button class="btn-primary" onclick="acknowledgeAlert(${alert.id})">✅ Als gesehen markieren</button>
                <button class="btn-secondary" onclick="viewPatientDetails(${alert.patient_id})">👤 Patient anzeigen</button>
              </div>
            </div>
          `).join('')}
          ${alerts.length > 1 ? `
            <div class="critical-alert-bulk-actions">
              <button class="btn-warning" onclick="acknowledgeAllAlerts()">✅ Alle als gesehen markieren</button>
            </div>
          ` : ''}
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  };

  window.acknowledgeAlert = async function(alertId) {
    try {
      const button = event.target;
      const originalText = button.innerHTML;
      button.innerHTML = '<span class="loading-spinner"></span>Wird verarbeitet...';
      button.disabled = true;

      const response = await fetch(`/api/notifications/${alertId}/read`, { method: 'PUT' });
      if (response.ok) {
        const alertItem = button.closest('.critical-alert-item');
        if (alertItem) {
          alertItem.style.opacity = '0';
          alertItem.style.transform = 'translateX(100%)';
          setTimeout(() => {
            alertItem.remove();
            const remainingAlerts = document.querySelectorAll('.critical-alert-item');
            if (remainingAlerts.length === 0) {
              const modal = document.querySelector('.critical-alert-modal');
              const banner = document.querySelector('.critical-alert-banner');
              if (modal) modal.remove();
              if (banner) banner.remove();
              showNotification('✅ Alle kritischen Alarme bearbeitet!', 'success');
            } else {
              showNotification('✅ Alarm als gesehen markiert', 'success');
            }
          }, 300);
        }
      }
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      showNotification('❌ Fehler beim Markieren des Alarms', 'error');
    }
  };

  window.acknowledgeAllAlertsFromBanner = async function() {
    try {
      const alerts = window.currentCriticalAlerts || [];
      const promises = alerts.map(alert => fetch(`/api/notifications/${alert.id}/read`, { method: 'PUT' }));
      await Promise.all(promises);

      const banner = document.querySelector('.critical-alert-banner');
      if (banner) banner.remove();
      showNotification(`🎉 Alle ${alerts.length} Alarme erledigt!`, 'success');
    } catch (error) {
      showNotification('❌ Fehler beim Bearbeiten der Alarme', 'error');
    }
  };

  window.acknowledgeAllAlerts = async function() {
    try {
      const alerts = window.currentCriticalAlerts || [];
      const promises = alerts.map(alert => fetch(`/api/notifications/${alert.id}/read`, { method: 'PUT' }));
      await Promise.all(promises);

      const modal = document.querySelector('.critical-alert-modal');
      const banner = document.querySelector('.critical-alert-banner');
      if (modal) modal.remove();
      if (banner) banner.remove();
      showNotification(`✅ Alle ${alerts.length} Alarme erfolgreich bearbeitet!`, 'success');
    } catch (error) {
      showNotification('❌ Fehler beim Bearbeiten aller Alarme', 'error');
    }
  };

  window.viewPatientDetails = function(patientId) {
    showNotification(`Patient-Details für ID ${patientId}`, 'info');
  };

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
});