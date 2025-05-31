document.addEventListener('DOMContentLoaded', () => {
  const patientSelect = document.getElementById('patient');
  const timeSelect    = document.getElementById('time');
  const form          = document.getElementById('assignmentForm');

  // Get current user from sessionStorage
  const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
  const mitarbeiterId = currentUser.id;

  if (!mitarbeiterId) {
    alert('Benutzer nicht gefunden. Bitte loggen Sie sich erneut ein.');
    window.location.href = '/';
    return;
  }

  // 1) Load ASSIGNED patients only (not all patients)
  fetch(`/api/patients/assigned/${mitarbeiterId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          data.patients.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = `${p.vorname} ${p.nachname}`;
            patientSelect.appendChild(opt);
          });
        } else {
          throw new Error(data.message || 'Failed to load patients');
        }
      })
      .catch(error => {
        console.error('Error loading patients:', error);
        // Fallback for demo purposes
        ['Müller', 'Schmidt', 'Meier'].forEach((name, i) => {
          const opt = document.createElement('option');
          opt.value = `demo-${i}`;
          opt.textContent = name;
          patientSelect.appendChild(opt);
        });
      });

  // 2) Fill hours 0–23
  for (let h = 0; h < 24; h++) {
    const opt = document.createElement('option');
    const val = h.toString().padStart(2, '0');
    opt.value = val;
    opt.textContent = val;
    timeSelect.appendChild(opt);
  }

  // 3) Form submission
  form.addEventListener('submit', e => {
    e.preventDefault();
    const payload = {
      mitarbeiterId: mitarbeiterId, // Add mitarbeiter ID to the payload
      patientId: patientSelect.value,
      aufgabe:   form.task.value.trim(),
      zeit:      form.time.value,
      status:    form.status.value
    };

    fetch('/api/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload)
    })
        .then(res => {
          if (!res.ok) throw new Error('Network response was not ok');
          return res.json();
        })
        .then(() => {
          alert('Aufgabe erfolgreich gespeichert!');
          form.reset();
        })
        .catch(err => {
          console.error(err);
          alert('Fehler beim Speichern. Bitte versuche es erneut.');
        });
  });

  // ——— Particle Background ———
  const canvas = document.getElementById('bg');
  const ctx = canvas.getContext('2d');
  let particles = [];
  const num = 120;

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
      if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
        this.reset();
      }
    }
    draw() {
      ctx.fillStyle = `rgba(255,255,255,${this.alpha})`;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function initParticles() {
    particles = [];
    for (let i = 0; i < num; i++) particles.push(new Particle());
  }
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => { p.update(); p.draw(); });
    requestAnimationFrame(animate);
  }

  initParticles();
  animate();
});