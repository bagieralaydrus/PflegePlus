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

// ——— Form Section ———
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  const loadingOverlay = document.getElementById('loadingOverlay');

  form.addEventListener('submit', handleFormSubmission);
  setupFormValidation();
});

// Enhanced form submission with better UX
async function handleFormSubmission(e) {
  e.preventDefault();

  const username = document.getElementById('username').value.trim();
  const day = document.getElementById('day').value.padStart(2, '0');
  const month = document.getElementById('month').value;
  const year = document.getElementById('year').value;

  // Validate all fields
  if (!validateForm(username, day, month, year)) {
    return;
  }

  // Construct birthdate in YYYY-MM-DD format
  const birthdate = `${year}-${month}-${day}`;

  // Show loading state
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
      // Store complete user info
      sessionStorage.setItem('currentUser', JSON.stringify({
        id: data.user.id,
        username: data.user.username,
        type: data.user.type
      }));

      // Show success state
      showSuccessState();

      // Add delay for better UX, then redirect
      setTimeout(() => {
        if (data.user.type === 'mitarbeiter') {
          window.location.href = '/pflegekraft/dashboard.html';
        } else if (data.user.type === 'patient') {
          window.location.href = '/patient/';
        }
      }, 1500);

    } else {
      hideLoadingState();
      showErrorMessage(data.message || 'Anmeldung fehlgeschlagen');
      shakeForm();
    }
  } catch (error) {
    console.error('Login error:', error);
    hideLoadingState();
    showErrorMessage('Verbindungsfehler. Bitte versuchen Sie es später erneut.');
    shakeForm();
  }
}

// Comprehensive form validation
function validateForm(username, day, month, year) {
  let isValid = true;

  // Clear previous errors
  clearFormErrors();

  // Validate username
  if (!username || username.length < 2) {
    setFieldError('username', 'Benutzername ist erforderlich');
    isValid = false;
  }

  // Validate date components
  if (!day) {
    setFieldError('day', 'Tag auswählen');
    isValid = false;
  }

  if (!month) {
    setFieldError('month', 'Monat auswählen');
    isValid = false;
  }

  if (!year) {
    setFieldError('year', 'Jahr auswählen');
    isValid = false;
  }

  // Validate complete date if all components exist
  if (day && month && year) {
    const date = new Date(year, month - 1, day);
    const today = new Date();

    // Check if date is valid
    if (date.getDate() != day || date.getMonth() != month - 1 || date.getFullYear() != year) {
      setFieldError('day', 'Ungültiges Datum');
      isValid = false;
    }

    // Check if date is not in the future
    if (date > today) {
      setFieldError('day', 'Geburtsdatum kann nicht in der Zukunft liegen');
      isValid = false;
    }

    // Check reasonable age limits (not older than 120 years)
    const age = today.getFullYear() - date.getFullYear();
    if (age > 120) {
      setFieldError('year', 'Bitte überprüfen Sie das Jahr');
      isValid = false;
    }
  }

  return isValid;
}

// Form validation helpers
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

  // Add error message if not already present
  if (!formGroup.querySelector('.error-message')) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.cssText = `
      color: #ef4444;
      font-size: 0.8rem;
      margin-top: 0.25rem;
      display: flex;
      align-items: center;
      gap: 0.25rem;
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

// Loading and UI states
function showLoadingState() {
  const overlay = document.getElementById('loadingOverlay');
  const button = document.querySelector('.login-button');

  overlay.classList.add('show');
  button.disabled = true;

  // Update button text
  const buttonText = button.querySelector('.button-text');
  buttonText.textContent = 'Wird angemeldet...';
}

function hideLoadingState() {
  const overlay = document.getElementById('loadingOverlay');
  const button = document.querySelector('.login-button');

  overlay.classList.remove('show');
  button.disabled = false;

  // Reset button text
  const buttonText = button.querySelector('.button-text');
  buttonText.textContent = 'Anmelden';
}

function showSuccessState() {
  const button = document.querySelector('.login-button');
  const buttonText = button.querySelector('.button-text');
  const buttonIcon = button.querySelector('.button-icon');

  button.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
  buttonText.textContent = 'Erfolgreich angemeldet!';
  buttonIcon.innerHTML = `
    <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  `;

  // Add success animation to form
  const form = document.querySelector('.login-container');
  form.style.transform = 'scale(1.02)';
  form.style.boxShadow = '0 25px 50px -12px rgba(16, 185, 129, 0.25)';

  setTimeout(() => {
    form.style.transform = 'scale(1)';
  }, 200);
}

function showErrorMessage(message) {
  // Remove existing error notifications
  document.querySelectorAll('.error-notification').forEach(el => el.remove());

  const notification = document.createElement('div');
  notification.className = 'error-notification';
  notification.style.cssText = `
    position: fixed;
    top: 2rem;
    right: 2rem;
    background: #ef4444;
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
  `;

  notification.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <line x1="15" y1="9" x2="9" y2="15"/>
      <line x1="9" y1="9" x2="15" y2="15"/>
    </svg>
    <span>${message}</span>
    <button onclick="this.parentElement.remove()" style="
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      font-size: 1.2rem;
      padding: 0;
      margin-left: auto;
    ">×</button>
  `;

  // Add animation keyframes to document
  if (!document.querySelector('#error-animations')) {
    const style = document.createElement('style');
    style.id = 'error-animations';
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
      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
        20%, 40%, 60%, 80% { transform: translateX(4px); }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(notification);

  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (notification.parentElement) {
      notification.style.animation = 'slideInRight 0.3s ease-out reverse';
      setTimeout(() => notification.remove(), 300);
    }
  }, 5000);
}

function shakeForm() {
  const form = document.querySelector('.login-container');
  form.style.animation = 'shake 0.6s ease-in-out';
  setTimeout(() => {
    form.style.animation = '';
  }, 600);
}

// Enhanced form validation setup
function setupFormValidation() {
  const usernameField = document.getElementById('username');
  const dayField = document.getElementById('day');
  const monthField = document.getElementById('month');
  const yearField = document.getElementById('year');

  // Real-time validation for username
  usernameField.addEventListener('input', (e) => {
    const value = e.target.value.trim();
    if (value.length >= 2) {
      setFieldSuccess('username');
    } else if (value.length > 0) {
      setFieldError('username', 'Mindestens 2 Zeichen erforderlich');
    }
  });

  // Real-time validation for date fields
  [dayField, monthField, yearField].forEach(field => {
    field.addEventListener('change', validateDateFields);
    field.addEventListener('input', validateDateFields);
  });

  // Add helpful placeholders and improve UX
  usernameField.addEventListener('focus', () => {
    usernameField.placeholder = 'z.B. max.mustermann oder patient123';
  });

  usernameField.addEventListener('blur', () => {
    usernameField.placeholder = 'Ihr Benutzername';
  });

  // Add placeholder hints for date inputs
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

function validateDateFields() {
  const day = document.getElementById('day').value;
  const month = document.getElementById('month').value;
  const year = document.getElementById('year').value;

  // Clear previous date errors
  ['day', 'month', 'year'].forEach(fieldName => {
    const formGroup = document.getElementById(fieldName).closest('.form-group');
    formGroup.classList.remove('error');
    const errorMsg = formGroup.querySelector('.error-message');
    if (errorMsg) errorMsg.remove();
  });

  // Validate individual fields
  if (day && (parseInt(day) < 1 || parseInt(day) > 31)) {
    setFieldError('day', 'Tag muss zwischen 1 und 31 liegen');
    return;
  }

  if (year && (parseInt(year) < 1900 || parseInt(year) > 2010)) {
    setFieldError('year', 'Jahr muss zwischen 1900 und 2010 liegen');
    return;
  }

  // If all fields are filled, validate the complete date
  if (day && month && year) {
    const date = new Date(year, month - 1, day);
    const today = new Date();

    if (date.getDate() != day || date.getMonth() != month - 1 || date.getFullYear() != year) {
      setFieldError('day', 'Ungültiges Datum');
      return;
    }

    if (date > today) {
      setFieldError('day', 'Datum liegt in der Zukunft');
      return;
    }

    const age = today.getFullYear() - date.getFullYear();
    if (age > 120) {
      setFieldError('year', 'Unrealistisches Alter');
      return;
    }

    // All validations passed
    setFieldSuccess('day');
    setFieldSuccess('month');
    setFieldSuccess('year');
  }
}

// Keyboard accessibility improvements
document.addEventListener('keydown', (e) => {
  // Enter key should submit form
  if (e.key === 'Enter' && e.target.closest('.login-form')) {
    e.preventDefault();
    document.getElementById('loginForm').dispatchEvent(new Event('submit'));
  }

  // Escape key should clear form
  if (e.key === 'Escape') {
    clearFormErrors();
    document.querySelectorAll('.error-notification').forEach(el => el.remove());
  }
});

// Auto-focus username field when page loads
window.addEventListener('load', () => {
  document.getElementById('username').focus();
});

// Add some helpful tooltips for better UX
function addTooltips() {
  const yearInput = document.getElementById('year');
  yearInput.title = 'Geburtsjahr zwischen 1900-2010';

  const dayInput = document.getElementById('day');
  dayInput.title = 'Tag des Monats (1-31)';

  const usernameInput = document.getElementById('username');
  usernameInput.title = 'Ihr eindeutiger Benutzername im System';
}

// Initialize tooltips
addTooltips();