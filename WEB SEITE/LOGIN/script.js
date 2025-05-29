// ——— Particle Background ———
const canvas = document.getElementById('bg');
const ctx = canvas.getContext('2d');
let particlesArray = [];
const numberOfParticles = 120;

// Canvas die width, height einstellen
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Particle CLASS
class Particle {
  constructor() {
    this.reset();
  }
  reset() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.size = Math.random() * 3 + 1;
    this.speedX = (Math.random() - 0.5) * 0.7;
    this.speedY = (Math.random() - 0.5) * 0.7;
    this.alpha = Math.random() * 0.5 + 0.3;
  }
  update() {
    this.x += this.speedX;
    this.y += this.speedY;
    if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
      this.reset();
    }
  }
  draw() {
    ctx.fillStyle = `rgba(255, 255, 255, ${this.alpha})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Fängt das Practice an.
function initParticles() {
  particlesArray = [];
  for (let i = 0; i < numberOfParticles; i++) {
    particlesArray.push(new Particle());
  }
}
initParticles();

// ANIMATION PART :)
function animateParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particlesArray.forEach(p => {
    p.update();
    p.draw();
  });
  requestAnimationFrame(animateParticles);
}
animateParticles();

// ——— Form Section with Database Integration ———
document.getElementById('loginForm').addEventListener('submit', async function(e) {
  e.preventDefault();

  const user = document.getElementById('username').value.trim();
  const date = document.getElementById('birthdate').value;

  if (!user || !date) {
    alert('Bitte füllen Sie alle Felder aus.');
    return;
  }

  // Show loading state
  const submitButton = document.querySelector('button[type="submit"]');
  const originalText = submitButton.textContent;
  submitButton.textContent = 'Wird geladen...';
  submitButton.disabled = true;

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: user,
        birthdate: date
      })
    });

    const data = await response.json();

    if (data.success) {
      // Store user info for potential use
      sessionStorage.setItem('currentUser', JSON.stringify(data.user));

      // Show success message
      alert(data.message + `\nSie sind als ${data.user.type} angemeldet.`);

      // Redirect based on user type
      if (data.user.type === 'mitarbeiter') {
        // Redirect to employee dashboard
        window.location.href = '/employee-dashboard.html';
      } else if (data.user.type === 'patient') {
        // Redirect to patient dashboard
        window.location.href = '/patient-dashboard.html';
      }
    } else {
      alert(data.message || 'Anmeldung fehlgeschlagen');
    }
  } catch (error) {
    console.error('Login error:', error);
    alert('Verbindungsfehler. Bitte versuchen Sie es später erneut.');
  } finally {
    // Reset button state
    submitButton.textContent = originalText;
    submitButton.disabled = false;
  }
});