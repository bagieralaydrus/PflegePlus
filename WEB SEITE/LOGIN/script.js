// Animierter Partikelhintergrund
console.log('🚀 Partikelsystem wird gestartet...');

const canvas = document.getElementById('bg');
const ctx = canvas.getContext('2d');

// Canvas-Größe anpassen
function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  console.log('Canvas-Größe:', canvas.width, 'x', canvas.height);
}
resize();
window.addEventListener('resize', resize);

// Partikel-Array
const particles = [];
const particleCount = 100;

// Partikel erstellen
for (let i = 0; i < particleCount; i++) {
  particles.push({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    size: Math.random() * 5 + 2,
    speedX: (Math.random() - 0.5) * 2,
    speedY: (Math.random() - 0.5) * 2,
    opacity: Math.random() * 0.8 + 0.2
  });
}

console.log('✨ Erstellt', particles.length, 'Partikel');

// Animationsschleife
function animate() {
  // Canvas leeren
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Partikel zeichnen
  particles.forEach(particle => {
    // Position aktualisieren
    particle.x += particle.speedX;
    particle.y += particle.speedY;

    // Am Bildschirmrand umkehren
    if (particle.x < 0) particle.x = canvas.width;
    if (particle.x > canvas.width) particle.x = 0;
    if (particle.y < 0) particle.y = canvas.height;
    if (particle.y > canvas.height) particle.y = 0;

    // Partikel zeichnen
    ctx.fillStyle = `rgba(255, 255, 255, ${particle.opacity})`;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
  });

  requestAnimationFrame(animate);
}

// Animation starten
animate();
console.log('🎬 Animation gestartet!');

// Anmeldesystem und Formularverarbeitung
document.addEventListener('DOMContentLoaded', () => {
  console.log('🔐 Anmeldesystem wird initialisiert...');

  const form = document.getElementById('loginForm');
  const loadingOverlay = document.getElementById('loadingOverlay');

  // Formular-Event-Listener einrichten
  form.addEventListener('submit', handleFormSubmission);
  setupFormValidation();
  setupAccessibilityFeatures();

  console.log('✅ Anmeldesystem bereit!');
});

// Erweiterte Formularübermittlung mit moderner UX
async function handleFormSubmission(e) {
  e.preventDefault();
  console.log('📋 Formularübermittlung gestartet...');

  const username = document.getElementById('username').value.trim();
  const day = document.getElementById('day').value.padStart(2, '0');
  const month = document.getElementById('month').value;
  const year = document.getElementById('year').value;

  // Umfassende Validierung
  if (!validateForm(username, day, month, year)) {
    console.log('❌ Formularvalidierung fehlgeschlagen');
    return;
  }

  const birthdate = `${year}-${month}-${day}`;
  console.log('📝 Anmeldung übermittelt für Benutzer:', username);

  // Ladezustand anzeigen
  showLoadingState();

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: username,
        birthdate: birthdate
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ Anmeldung erfolgreich für:', data.user.username);

      // Benutzersitzung speichern (mit Rolle für Weiterleitung)
      sessionStorage.setItem('currentUser', JSON.stringify({
        id: data.user.id,
        username: data.user.username,
        type: data.user.type,
        role: data.user.role
      }));

      // Weiterleitung basierend auf Benutzertyp und Rolle
      setTimeout(() => {
        if (data.user.type === 'mitarbeiter') {
          if (data.user.role === 'administrator') {
            console.log('👑 Weiterleitung zum Admin-Dashboard...');
            window.location.href = '/admin/index.html';
          } else {
            console.log('👨‍⚕️ Weiterleitung zum Pflegekraft-Dashboard...');
            window.location.href = '/pflegekraft/dashboard.html';
          }
        } else if (data.user.type === 'patient') {
          console.log('👤 Weiterleitung zum Patienten-Dashboard...');
          window.location.href = '/patient/';
        }
      }, 1500);

    } else {
      console.log('❌ Anmeldung fehlgeschlagen:', data.message);
      hideLoadingState();
      showErrorMessage(data.message || 'Anmeldung fehlgeschlagen');
      shakeForm();
    }
  } catch (error) {
    console.error('💥 Netzwerkfehler während der Anmeldung:', error);
    hideLoadingState();
    showErrorMessage('Verbindungsfehler. Bitte versuchen Sie es später erneut.');
    shakeForm();
  }
}

// Formularvalidierungssystem
function validateForm(username, day, month, year) {
  let isValid = true;

  // Vorherige Fehler löschen
  clearFormErrors();

  // Benutzername-Validierung
  if (!username || username.length < 2) {
    setFieldError('username', 'Mindestens 2 Zeichen erforderlich');
    isValid = false;
  } else if (username.length > 50) {
    setFieldError('username', 'Zu lang (max. 50 Zeichen)');
    isValid = false;
  }

  // Datumsvalidierung
  if (!day || parseInt(day) < 1 || parseInt(day) > 31) {
    setFieldError('day', 'Gültiger Tag erforderlich (1-31)');
    isValid = false;
  }

  if (!month) {
    setFieldError('month', 'Monat auswählen');
    isValid = false;
  }

  if (!year || parseInt(year) < 1900 || parseInt(year) > 2010) {
    setFieldError('year', 'Jahr zwischen 1900-2010 erforderlich');
    isValid = false;
  }

  // Vollständige Datumsvalidierung
  if (day && month && year) {
    const date = new Date(year, month - 1, day);
    const today = new Date();

    // Prüfen ob Datum gültig ist
    if (date.getDate() != day || date.getMonth() != month - 1 || date.getFullYear() != year) {
      setFieldError('day', 'Ungültiges Datum');
      isValid = false;
    }

    // Prüfen ob Datum nicht in der Zukunft liegt
    if (date > today) {
      setFieldError('day', 'Datum liegt in der Zukunft');
      isValid = false;
    }

    // Altersvalidierung
    const age = today.getFullYear() - date.getFullYear();
    if (age > 120) {
      setFieldError('year', 'Unrealistisches Alter');
      isValid = false;
    }
  }

  return isValid;
}

// Formular-Fehlerbehandlung
function clearFormErrors() {
  document.querySelectorAll('.form-group').forEach(group => {
    group.classList.remove('error', 'success');
  });
  document.querySelectorAll('.error-message').forEach(msg => msg.remove());
}

function setFieldError(fieldName, message) {
  const field = document.getElementById(fieldName);
  const formGroup = field.closest('.form-group');

  formGroup.classList.add('error');

  if (!formGroup.querySelector('.error-message')) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.cssText = `
      color: #ef4444;
      font-size: 0.85rem;
      margin-top: 0.5rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 500;
    `;
    errorDiv.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="15" y1="9" x2="9" y2="15"/>
        <line x1="9" y1="9" x2="15" y2="15"/>
      </svg>
      ${message}
    `;
    formGroup.appendChild(errorDiv);
  }
}

function setFieldSuccess(fieldName) {
  const field = document.getElementById(fieldName);
  const formGroup = field.closest('.form-group');
  formGroup.classList.remove('error');
  formGroup.classList.add('success');
}

// UI-Zustandsverwaltung
function showLoadingState() {
  const overlay = document.getElementById('loadingOverlay');
  const button = document.querySelector('.login-button');
  const buttonText = button.querySelector('.button-text');

  overlay.classList.add('show');
  button.disabled = true;
  buttonText.textContent = 'Wird angemeldet...';

  console.log('⏳ Ladezustand aktiviert');
}

function hideLoadingState() {
  const overlay = document.getElementById('loadingOverlay');
  const button = document.querySelector('.login-button');
  const buttonText = button.querySelector('.button-text');

  overlay.classList.remove('show');
  button.disabled = false;
  buttonText.textContent = 'Anmelden';

  console.log('✅ Ladezustand deaktiviert');
}

function showSuccessState() {
  const button = document.querySelector('.login-button');
  const buttonText = button.querySelector('.button-text');
  const buttonIcon = button.querySelector('.button-icon');

  // Button-Erscheinungsbild aktualisieren
  button.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
  buttonText.textContent = 'Erfolgreich angemeldet!';

  // Icon zu Häkchen ändern
  buttonIcon.innerHTML = `
    <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  `;

  // Erfolgsanimation zum Container hinzufügen
  const container = document.querySelector('.login-container');
  container.style.transform = 'scale(1.02)';
  container.style.boxShadow = '0 25px 50px -12px rgba(16, 185, 129, 0.25)';

  setTimeout(() => {
    container.style.transform = 'scale(1)';
  }, 300);

  console.log('🎉 Erfolgszustand angezeigt');
}

function showErrorMessage(message) {
  // Bestehende Benachrichtigungen entfernen
  document.querySelectorAll('.error-notification').forEach(el => el.remove());

  const notification = document.createElement('div');
  notification.className = 'error-notification';
  notification.style.cssText = `
    position: fixed;
    top: 2rem;
    right: 2rem;
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 12px;
    box-shadow: 0 10px 25px rgba(239, 68, 68, 0.3);
    z-index: 1001;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    max-width: 400px;
    animation: slideInRight 0.3s ease-out;
    border: 1px solid rgba(255, 255, 255, 0.2);
  `;

  notification.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <line x1="15" y1="9" x2="9" y2="15"/>
      <line x1="9" y1="9" x2="15" y2="15"/>
    </svg>
    <span style="font-weight: 500;">${message}</span>
    <button onclick="this.parentElement.remove()" style="
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      font-size: 1.2rem;
      padding: 0;
      margin-left: auto;
      opacity: 0.8;
      transition: opacity 0.2s;
    " onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.8'">×</button>
  `;

  // Animationsstile hinzufügen falls noch nicht vorhanden
  if (!document.querySelector('#notification-animations')) {
    const style = document.createElement('style');
    style.id = 'notification-animations';
    style.textContent = `
      @keyframes slideInRight {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(notification);

  // Benachrichtigung automatisch entfernen
  setTimeout(() => {
    if (notification.parentElement) {
      notification.style.animation = 'slideInRight 0.3s ease-out reverse';
      setTimeout(() => notification.remove(), 300);
    }
  }, 5000);

  console.log('🚨 Fehlerbenachrichtigung angezeigt:', message);
}

function shakeForm() {
  const form = document.querySelector('.login-container');
  form.style.animation = 'shake 0.6s ease-in-out';
  setTimeout(() => {
    form.style.animation = '';
  }, 600);
}

// Echtzeit-Formularvalidierung
function setupFormValidation() {
  const usernameField = document.getElementById('username');
  const dayField = document.getElementById('day');
  const monthField = document.getElementById('month');
  const yearField = document.getElementById('year');

  // Benutzername-Validierung
  usernameField.addEventListener('input', (e) => {
    const value = e.target.value.trim();
    const formGroup = e.target.closest('.form-group');

    // Bestehende Fehler löschen
    formGroup.classList.remove('error');
    const errorMsg = formGroup.querySelector('.error-message');
    if (errorMsg) errorMsg.remove();

    if (value.length >= 2 && value.length <= 50) {
      setFieldSuccess('username');
    } else if (value.length > 0) {
      if (value.length < 2) {
        setFieldError('username', 'Mindestens 2 Zeichen');
      } else {
        setFieldError('username', 'Zu lang (max. 50 Zeichen)');
      }
    }
  });

  // Datumsfeld-Validierung
  [dayField, monthField, yearField].forEach(field => {
    field.addEventListener('change', validateDateFields);
    field.addEventListener('input', validateDateFields);
  });

  // Erweiterte Platzhalter-Hinweise
  setupPlaceholderHints();
}

function validateDateFields() {
  const day = document.getElementById('day').value;
  const month = document.getElementById('month').value;
  const year = document.getElementById('year').value;

  // Datumsfeld-Fehler löschen
  ['day', 'month', 'year'].forEach(fieldName => {
    const formGroup = document.getElementById(fieldName).closest('.form-group');
    formGroup.classList.remove('error', 'success');
    const errorMsg = formGroup.querySelector('.error-message');
    if (errorMsg) errorMsg.remove();
  });

  // Einzelfeld-Validierung
  if (day && (parseInt(day) < 1 || parseInt(day) > 31)) {
    setFieldError('day', 'Tag: 1-31');
    return;
  }

  if (year && (parseInt(year) < 1900 || parseInt(year) > 2010)) {
    setFieldError('year', 'Jahr: 1900-2010');
    return;
  }

  // Vollständige Datumsvalidierung
  if (day && month && year) {
    const date = new Date(year, month - 1, day);
    const today = new Date();

    if (date.getDate() != day || date.getMonth() != month - 1 || date.getFullYear() != year) {
      setFieldError('day', 'Ungültiges Datum');
      return;
    }

    if (date > today) {
      setFieldError('day', 'Zukunftsdatum nicht erlaubt');
      return;
    }

    const age = today.getFullYear() - date.getFullYear();
    if (age > 120) {
      setFieldError('year', 'Unrealistisches Alter');
      return;
    }

    // Alle Validierungen bestanden
    setFieldSuccess('day');
    setFieldSuccess('month');
    setFieldSuccess('year');
  }
}

// Barrierefreiheit & UX-Verbesserungen
function setupAccessibilityFeatures() {
  // Benutzername-Feld automatisch fokussieren
  window.addEventListener('load', () => {
    document.getElementById('username').focus();
  });

  // Tastaturnavigation
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.closest('.login-form')) {
      e.preventDefault();
      document.getElementById('loginForm').dispatchEvent(new Event('submit'));
    }

    if (e.key === 'Escape') {
      clearFormErrors();
      document.querySelectorAll('.error-notification').forEach(el => el.remove());
    }
  });

  // Erweiterte Tooltips
  setupTooltips();
}

function setupPlaceholderHints() {
  const usernameField = document.getElementById('username');
  const dayField = document.getElementById('day');
  const yearField = document.getElementById('year');

  // Dynamische Platzhalter-Hinweise
  usernameField.addEventListener('focus', () => {
    usernameField.placeholder = 'z.B. max.mustermann oder patient123';
  });

  usernameField.addEventListener('blur', () => {
    usernameField.placeholder = 'Ihr Benutzername';
  });

  dayField.addEventListener('focus', () => {
    dayField.placeholder = '1-31';
  });

  dayField.addEventListener('blur', () => {
    dayField.placeholder = 'Tag';
  });

  yearField.addEventListener('focus', () => {
    yearField.placeholder = '1920-2010';
  });

  yearField.addEventListener('blur', () => {
    yearField.placeholder = 'Jahr';
  });
}

function setupTooltips() {
  const fields = [
    { id: 'username', title: 'Ihr eindeutiger Benutzername im PflegeVision System' },
    { id: 'day', title: 'Tag Ihres Geburtsdatums (1-31)' },
    { id: 'month', title: 'Monat Ihres Geburtsdatums' },
    { id: 'year', title: 'Jahr Ihres Geburtsdatums (1900-2010)' }
  ];

  fields.forEach(field => {
    const element = document.getElementById(field.id);
    if (element) {
      element.title = field.title;
    }
  });
}

// Performance-Überwachung für Partikelsystem
let frameCount = 0;
let lastTime = performance.now();

function monitorPerformance() {
  frameCount++;
  const currentTime = performance.now();

  if (currentTime - lastTime >= 5000) { // Alle 5 Sekunden
    const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
    console.log(`🎯 Partikelsystem FPS: ${fps}`);

    // Partikelanzahl reduzieren bei schlechter Performance
    if (fps < 30 && particles.length > 50) {
      console.log('⚡ Partikelanzahl für bessere Performance reduziert');
      particles.splice(0, 20);
    }

    frameCount = 0;
    lastTime = currentTime;
  }

  requestAnimationFrame(monitorPerformance);
}

// Performance-Überwachung starten
monitorPerformance();

console.log('🚀 PflegeVision Anmeldesystem vollständig initialisiert!');