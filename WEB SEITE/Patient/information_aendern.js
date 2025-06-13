document.addEventListener('DOMContentLoaded', () => {
  const updateForm = document.getElementById('updateForm');
  const deleteBtn = document.getElementById('deleteAccountBtn');

  // Formular zum Aktualisieren der Informationen
  updateForm.addEventListener('submit', e => {
    e.preventDefault();
    const data = {
      relative: updateForm.relative.value.trim(),
      location: updateForm.location.value
    };

    fetch('/api/updateInformation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
        .then(res => {
          if (!res.ok) throw new Error('Netzwerkfehler');
          return res.json();
        })
        .then(() => {
          alert('Informationen erfolgreich aktualisiert.');
          updateForm.reset();
        })
        .catch(err => {
          console.error(err);
          alert('Fehler beim Aktualisieren der Informationen.');
        });
  });

  // Konto löschen mit Bestätigung
  deleteBtn.addEventListener('click', () => {
    const confirmed = confirm('Sind Sie sicher, dass Sie Ihr Konto löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.');
    if (confirmed) {
      fetch('/api/deleteAccount', {
        method: 'DELETE'
      })
          .then(res => {
            if (!res.ok) throw new Error('Netzwerkfehler');
            return res.json();
          })
          .then(() => {
            alert('Ihr Konto wurde erfolgreich gelöscht.');
            window.location.href = 'index.html';
          })
          .catch(err => {
            console.error(err);
            alert('Fehler beim Löschen des Kontos.');
          });
    }
  });

  // Partikel-Hintergrund
  const canvas = document.getElementById('bg');
  const ctx = canvas.getContext('2d');
  let particles = [];
  const num = 100;

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
      this.vx = (Math.random() - 0.5) * 0.5;
      this.vy = (Math.random() - 0.5) * 0.5;
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

  function initParticles() {
    particles = [];
    for (let i = 0; i < num; i++)
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

  initParticles();
  animate();
});