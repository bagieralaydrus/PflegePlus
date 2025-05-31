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

  // Function to load dashboard data
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
            if (data.todaysAssignments && data.todaysAssignments.length > 0) {
              data.todaysAssignments.forEach(a => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                  <td>${a.patient}</td>
                  <td>${a.aufgabe}</td>
                  <td>${a.zeit}</td>
                  <td><span class="status ${a.status.toLowerCase()}">${a.status}</span></td>
                `;
                tableBody.appendChild(tr);
              });
            } else {
              // Show message when no assignments for today
              const tr = document.createElement('tr');
              tr.innerHTML = `
                <td colspan="4" style="text-align: center; color: #666; font-style: italic;">
                  Keine Einsätze für heute vorhanden
                </td>
              `;
              tableBody.appendChild(tr);
            }
          } else {
            throw new Error(data.message || 'Failed to load dashboard');
          }
        })
        .catch(error => {
          console.error('Dashboard loading error:', error);

          // Fallback-Dummy data
          userEl.textContent      = currentUser.username || 'Unbekannt';
          activeEl.textContent    = '—';
          completedEl.textContent = '—';

          // Show error message
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td colspan="4" style="text-align: center; color: #666;">
              Fehler beim Laden der Daten. Bitte versuchen Sie es später erneut.
            </td>
          `;
          tableBody.appendChild(tr);
        });
  }

  // Load dashboard data initially
  loadDashboardData();

  // Check if we just came from the assignment form (success message)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('success') === 'assignment') {
    // Show success message
    const successDiv = document.createElement('div');
    successDiv.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      background: #28a745;
      color: white;
      padding: 15px 20px;
      border-radius: 5px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      z-index: 1000;
      font-weight: bold;
    `;
    successDiv.textContent = 'Aufgabe erfolgreich gespeichert!';
    document.body.appendChild(successDiv);

    // Remove success message after 3 seconds
    setTimeout(() => {
      successDiv.remove();
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }, 3000);

    // Reload dashboard data to show the new assignment
    setTimeout(loadDashboardData, 500);
  }

  // Auto-refresh dashboard every 30 seconds to show real-time updates
  setInterval(loadDashboardData, 30000);

  // 2) Particle-Hintergrund (unchanged)
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
});