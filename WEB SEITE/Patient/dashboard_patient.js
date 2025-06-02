document.addEventListener('DOMContentLoaded', () => {
  const userEl       = document.getElementById('username');
  const caregiverEl  = document.getElementById('caregiver');
  const tableBody    = document.querySelector('#assignmentsTable tbody');

  fetch('/api/dashboard')
    .then(res => res.json())
    .then(data => {
      userEl.textContent      = data.username;
      caregiverEl.textContent = data.caregiver || 'Hans Peter';
      data.todaysAssignments.forEach(a => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${a.aufgabe}</td>
          <td>${a.zeit}</td>
          <td><span class="status ${a.status.toLowerCase()}">${a.status}</span></td>
        `;
        tableBody.appendChild(tr);
      });
    })
    .catch(() => {
      userEl.textContent      = 'Lisa';
      caregiverEl.textContent = 'Hans Peter';
      [
        {aufgabe:'Blutdruck messen', zeit:'08:00', status:'Abgeschlossen'},
        {aufgabe:'Mobilisation', zeit:'09:30', status:'Ausstehend'},
      ].forEach(a => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${a.aufgabe}</td>
          <td>${a.zeit}</td>
          <td><span class="status ${a.status.toLowerCase()}">${a.status}</span></td>
        `;
        tableBody.appendChild(tr);
      });
    });

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
