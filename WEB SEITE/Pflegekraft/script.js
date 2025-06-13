document.addEventListener('DOMContentLoaded', () => {
  const patientSelect = document.getElementById('patient');
  const timeSelect    = document.getElementById('time');
  const form          = document.getElementById('assignmentForm');

  // Aktueller Benutzer aus sessionStorage
  const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
  const mitarbeiterId = currentUser.id;

  // Benutzerauthentifizierung prüfen
  if (!mitarbeiterId) {
    alert('Benutzer nicht gefunden. Bitte loggen Sie sich erneut ein.');
    window.location.href = '/';
    return;
  }

  // Nur zugewiesene Patienten laden (nicht alle Patienten)
  fetch(`/api/patients/assigned/${mitarbeiterId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          if (data.patients.length === 0) {
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = 'Keine Patienten zugewiesen';
            opt.disabled = true;
            patientSelect.appendChild(opt);
          } else {
            data.patients.forEach(p => {
              const opt = document.createElement('option');
              opt.value = p.id;
              opt.textContent = `${p.vorname} ${p.nachname}`;
              patientSelect.appendChild(opt);
            });
          }
        } else {
          throw new Error(data.message || 'Failed to load patients');
        }
      })
      .catch(error => {
        console.error('Fehler beim Laden der Patienten:', error);
        // Fehler im Dropdown anzeigen
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'Fehler beim Laden der Patienten';
        opt.disabled = true;
        patientSelect.appendChild(opt);
      });

  // Uhrzeiten 0-23 füllen
  for (let h = 0; h < 24; h++) {
    const opt = document.createElement('option');
    const val = h.toString().padStart(2, '0');
    opt.value = val;
    opt.textContent = val;
    timeSelect.appendChild(opt);
  }

  // Formular-Übermittlung mit verbesserter Fehlerbehandlung
  form.addEventListener('submit', e => {
    e.preventDefault();
    const payload = {
      mitarbeiterId: mitarbeiterId,
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
          console.log('Response status:', res.status);
          console.log('Response headers:', res.headers);

          if (!res.ok) {
            return res.text().then(text => {
              console.error('Error response body:', text);
              throw new Error(`Server error: ${res.status} - ${text}`);
            });
          }
          return res.json();
        })
        .then(data => {
          console.log('Erfolgreiche Antwort:', data);
          alert('Aufgabe erfolgreich gespeichert!');
          form.reset();
        })
        .catch(err => {
          console.error('Vollständige Fehlerdetails:', err);
          alert(`Detaillierter Fehler: ${err.message}`);
        });
  });

  // Animierter Partikelhintergrund
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