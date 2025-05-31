document.addEventListener('DOMContentLoaded', () => {
  const userEl       = document.getElementById('username');
  const activeEl     = document.getElementById('activePatients');
  const completedEl  = document.getElementById('completedAssignments');
  const tableBody    = document.querySelector('#assignmentsTable tbody');

  // 1) Dashboard-Daten laden
  fetch('/api/dashboard')
    .then(res => res.json())
    .then(data => {
      userEl.textContent      = data.username;
      activeEl.textContent    = data.activePatients;
      completedEl.textContent = data.completedAssignments;
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
    })
    .catch(() => {
      // Fallback-Dummy
      userEl.textContent      = 'Lisa';
      activeEl.textContent    = 24;
      completedEl.textContent = 12;
      [
        {patient:'Anna Müller', aufgabe:'Blutdruck messen', zeit:'08:00', status:'Abgeschlossen'},
        {patient:'Johann Becker', aufgabe:'Mobilisation', zeit:'09:30', status:'Ausstehend'},
        // …
      ].forEach(a => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${a.patient}</td>
          <td>${a.aufgabe}</td>
          <td>${a.zeit}</td>
          <td><span class="status ${a.status.toLowerCase()}">${a.status}</span></td>
        `;
        tableBody.appendChild(tr);
      });
    });

  // 2) Particle-Hintergrund
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

  // 1) Dashboard-Daten laden
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
            <td><span class="status ${a.status.toLowerCase()}">${a.status}</span></td>
          `;
            tableBody.appendChild(tr);
          });
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

  // 2) Particle-Hintergrund (keep existing code)
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