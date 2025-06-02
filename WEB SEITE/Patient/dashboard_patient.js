document.addEventListener('DOMContentLoaded', () => {
  const userEl = document.getElementById('username');
  const caregiverEl = document.getElementById('caregiver');
  const tableBody = document.querySelector('#assignmentsTable tbody');

  // Get current user from sessionStorage
  const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
  const patientId = currentUser.id;

  if (!patientId) {
    alert('Benutzer nicht gefunden. Bitte loggen Sie sich erneut ein.');
    window.location.href = '/';
    return;
  }

  // Function to load patient dashboard data
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
            userEl.textContent = data.username;
            caregiverEl.textContent = data.caregiver;

            // Clear existing table rows
            tableBody.innerHTML = '';

            // Add assignments to table
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

          const tr = document.createElement('tr');
          tr.innerHTML = `
          <td colspan="3" style="text-align: center; color: #666;">
            Fehler beim Laden der Daten. Bitte versuchen Sie es später erneut.
          </td>
        `;
          tableBody.appendChild(tr);
        });
  }

  // Load dashboard data initially
  loadDashboardData();

  // Auto-refresh every 30 seconds to show new assignments
  setInterval(loadDashboardData, 30000);

  // Particle background code (keeping existing code)
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

  // Add this enhanced notification system to your patient dashboard

  class PatientNotificationSystem {
    constructor(patientId) {
      this.patientId = patientId;
      this.lastKnownAssignments = new Set();
      this.refreshInterval = 30000; // 30 seconds
      this.setupNotifications();
    }

    setupNotifications() {
      // Request notification permission if supported
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }

      // Start checking for new assignments
      this.startMonitoring();
    }

    startMonitoring() {
      setInterval(() => {
        this.checkForNewAssignments();
      }, this.refreshInterval);
    }

    async checkForNewAssignments() {
      try {
        const response = await fetch(`/api/patient/dashboard/${this.patientId}`);
        const data = await response.json();

        if (data.success) {
          const currentAssignments = new Set(
              data.todaysAssignments.map(a => `${a.aufgabe}-${a.zeit}`)
          );

          // Check for new assignments
          const newAssignments = [...currentAssignments].filter(
              assignment => !this.lastKnownAssignments.has(assignment)
          );

          if (newAssignments.length > 0 && this.lastKnownAssignments.size > 0) {
            this.showNewAssignmentNotification(newAssignments.length);
            this.highlightNewAssignments();
          }

          this.lastKnownAssignments = currentAssignments;
        }
      } catch (error) {
        console.error('Error checking for new assignments:', error);
      }
    }

    showNewAssignmentNotification(count) {
      const message = count === 1
          ? 'Sie haben eine neue Aufgabe erhalten!'
          : `Sie haben ${count} neue Aufgaben erhalten!`;

      // Browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('PflegeVision', {
          body: message,
          icon: '/favicon.ico',
          badge: '/favicon.ico'
        });
      }

      // In-page notification
      this.showInPageNotification(message);
    }

    showInPageNotification(message) {
      // Remove existing notification if any
      const existingNotification = document.querySelector('.notification-banner');
      if (existingNotification) {
        existingNotification.remove();
      }

      // Create notification banner
      const notification = document.createElement('div');
      notification.className = 'notification-banner';
      notification.innerHTML = `
      <div class="notification-content">
        <span class="notification-icon">🔔</span>
        <span class="notification-text">${message}</span>
        <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;

      // Add to page
      document.body.appendChild(notification);

      // Auto-remove after 5 seconds
      setTimeout(() => {
        if (notification.parentElement) {
          notification.remove();
        }
      }, 5000);
    }

    highlightNewAssignments() {
      // Add highlight effect to new table rows
      const tableRows = document.querySelectorAll('#assignmentsTable tbody tr');
      tableRows.forEach(row => {
        row.classList.add('new-assignment');
        setTimeout(() => {
          row.classList.remove('new-assignment');
        }, 2000);
      });
    }

    // Method to manually refresh data
    async refreshData() {
      const event = new CustomEvent('refreshDashboard');
      document.dispatchEvent(event);
    }
  }
  // CSS for notification system - add this to your CSS file
  const notificationCSS = `
.notification-banner {
  position: fixed;
  top: 70px;
  right: 20px;
  background: linear-gradient(135deg, #28a745, #20c997);
  color: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 1000;
  animation: slideIn 0.3s ease-out;
  max-width: 300px;
}

.notification-content {
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.notification-icon {
  font-size: 1.2rem;
}

.notification-text {
  flex: 1;
  font-size: 0.9rem;
  line-height: 1.3;
}

.notification-close {
  background: none;
  border: none;
  color: white;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background 0.2s ease;
}

.notification-close:hover {
  background: rgba(255,255,255,0.2);
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.new-assignment {
  animation: highlightNew 2s ease-in-out;
}

@keyframes highlightNew {
  0% { 
    background-color: rgba(40, 167, 69, 0.2);
    transform: scale(1.02);
  }
  50% {
    background-color: rgba(40, 167, 69, 0.1);
  }
  100% { 
    background-color: transparent;
    transform: scale(1);
  }
}

.refresh-indicator {
  position: fixed;
  top: 100px;
  right: 20px;
  background: rgba(45, 127, 249, 0.9);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.8rem;
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: 999;
}

.refresh-indicator.show {
  opacity: 1;
}
`;

// Function to inject CSS
  function injectNotificationCSS() {
    const style = document.createElement('style');
    style.textContent = notificationCSS;
    document.head.appendChild(style);
  }

// Enhanced dashboard loading function with notifications
  function createEnhancedPatientDashboard(patientId) {
    // Inject notification CSS
    injectNotificationCSS();

    // Initialize notification system
    const notificationSystem = new PatientNotificationSystem(patientId);

    // Enhanced dashboard data loading with refresh indicator
    function loadDashboardDataWithIndicator() {
      // Show refresh indicator
      showRefreshIndicator();

      return fetch(`/api/patient/dashboard/${patientId}`)
          .then(res => {
            if (!res.ok) {
              throw new Error('Network response was not ok');
            }
            return res.json();
          })
          .then(data => {
            if (data.success) {
              updateDashboardUI(data);
              hideRefreshIndicator();
              return data;
            } else {
              throw new Error(data.message || 'Failed to load dashboard');
            }
          })
          .catch(error => {
            console.error('Dashboard loading error:', error);
            hideRefreshIndicator();
            showErrorState();
            throw error;
          });
    }

    function showRefreshIndicator() {
      let indicator = document.querySelector('.refresh-indicator');
      if (!indicator) {
        indicator = document.createElement('div');
        indicator.className = 'refresh-indicator';
        indicator.textContent = 'Aktualisiere...';
        document.body.appendChild(indicator);
      }
      indicator.classList.add('show');
    }

    function hideRefreshIndicator() {
      const indicator = document.querySelector('.refresh-indicator');
      if (indicator) {
        indicator.classList.remove('show');
      }
    }

    function updateDashboardUI(data) {
      const userEl = document.getElementById('username');
      const caregiverEl = document.getElementById('caregiver');
      const taskCountEl = document.getElementById('todayTaskCount');
      const tableBody = document.querySelector('#assignmentsTable tbody');

      if (userEl) userEl.textContent = data.username;
      if (caregiverEl) caregiverEl.textContent = data.caregiver;
      if (taskCountEl) taskCountEl.textContent = data.todaysAssignments.length;

      // Clear existing table rows
      if (tableBody) {
        tableBody.innerHTML = '';

        // Add assignments to table
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
      }
    }

    function showErrorState() {
      const userEl = document.getElementById('username');
      const caregiverEl = document.getElementById('caregiver');
      const taskCountEl = document.getElementById('todayTaskCount');
      const tableBody = document.querySelector('#assignmentsTable tbody');

      if (userEl) userEl.textContent = 'Fehler';
      if (caregiverEl) caregiverEl.textContent = 'Nicht verfügbar';
      if (taskCountEl) taskCountEl.textContent = '—';

      if (tableBody) {
        tableBody.innerHTML = `
        <tr>
          <td colspan="3" style="text-align: center; color: #dc3545;">
            Fehler beim Laden der Daten. Bitte versuchen Sie es später erneut.
          </td>
        </tr>
      `;
      }
    }

    // Listen for manual refresh events
    document.addEventListener('refreshDashboard', () => {
      loadDashboardDataWithIndicator();
    });

    return {
      loadData: loadDashboardDataWithIndicator,
      notificationSystem: notificationSystem
    };
  }
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