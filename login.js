


const SUPABASE_URL = 'https://lmmoqcpptyzgscnjwvgk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_xRnGuxmB5oen-G7LDlI6JQ_SUEvLDMr';

let supabase = null;

// Inicialización de Supabase
if (typeof window.supabase !== 'undefined' && SUPABASE_URL && !SUPABASE_URL.includes('TU_PROYECTO')) {
  try {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (err) {
    console.error("Error al inicializar Supabase:", err);
  }
}

// Variables globales para referencias del DOM
let loginCard, appContent, loginForm, errorMessage, submitBtn;

function initDOMElements() {
  loginCard = document.querySelector('.login-card');
  appContent = document.getElementById('app-content');
  loginForm = document.getElementById('loginForm');
  errorMessage = document.getElementById('errorMessage');
  submitBtn = document.getElementById('submitBtn');
}

// Muestra la aplicación y oculta el login
function showApp() {
  if (loginCard) loginCard.classList.add('hidden');
  if (appContent) appContent.classList.remove('hidden');
}

// Muestra el login y oculta la aplicación
function showLogin() {
  if (loginCard) loginCard.classList.remove('hidden');
  if (appContent) appContent.classList.add('hidden');
}

// Verifica el estado de la sesión activa
async function checkSession() {
  if (!supabase) {
    if (localStorage.getItem('isLoggedIn') === 'true') {
      showApp();
    } else {
      showLogin();
    }
    return;
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      showApp();
    } else {
      showLogin();
    }
  } catch (e) {
    console.warn("No se pudo verificar la sesión con Supabase:", e);
    showLogin();
  }
}

// Manejo del evento Submit del formulario de Login
function setupLoginFormListener() {
  if (!loginForm) return;

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (errorMessage) errorMessage.textContent = '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Cargando...';
    }

    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    const email = emailInput ? emailInput.value : '';
    const password = passwordInput ? passwordInput.value : '';

    // Si Supabase no está configurado, permite login local de prueba
    if (!supabase) {
      if (email && password) {
        localStorage.setItem('isLoggedIn', 'true');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Ingresar';
        }
        showApp();
      } else {
        if (errorMessage) errorMessage.textContent = 'Ingresa un correo y contraseña válidos.';
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Ingresar';
        }
      }
      return;
    }

    // Inicio de sesión con Supabase
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        if (errorMessage) {
          errorMessage.textContent = error.message === 'Invalid login credentials' 
            ? 'Correo o contraseña incorrectos.' 
            : error.message;
        }
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Ingresar';
        }
      } else {
        localStorage.setItem('isLoggedIn', 'true');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Ingresar';
        }
        showApp();
      }
    } catch (err) {
      if (errorMessage) errorMessage.textContent = 'Error de conexión con el servidor.';
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Ingresar';
      }
    }
  });
}

// Función de Cierre de Sesión (exportada opcionalmente al scope global)
window.logout = async function() {
  localStorage.removeItem('isLoggedIn');
  if (supabase) {
    await supabase.auth.signOut();
  }
  showLogin();
};

// Inicialización segura cuando el DOM está 100% cargado
document.addEventListener('DOMContentLoaded', () => {
  initDOMElements();
  setupLoginFormListener();
  checkSession();
});
