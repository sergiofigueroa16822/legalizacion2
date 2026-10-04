// ==========================================
// CONFIGURACIÓN DE SUPABASE
// ==========================================
const SUPABASE_URL = 'https://lmmoqcpptyzgscnjwvgk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_xRnGuxmB5oen-G7LDlI6JQ_SUEvLDMr';

// Inicialización segura del cliente Supabase v2
let supabase = null;

try {
  if (window.supabase && typeof window.supabase.createClient === 'function') {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } else {
    console.error("El SDK de Supabase no se ha cargado en window.supabase");
  }
} catch (err) {
  console.error("Error al inicializar el cliente de Supabase:", err);
}

// ==========================================
// REFERENCIAS AL DOM
// ==========================================
let loginView, appView, loginForm, emailInput, passwordInput, errorContainer, submitBtn;

function initDOMElements() {
  loginView = document.getElementById('login-view');
  appView = document.getElementById('app-view');
  loginForm = document.getElementById('login-form');
  emailInput = document.getElementById('login-email');
  passwordInput = document.getElementById('login-password');
  errorContainer = document.getElementById('login-error');
  submitBtn = document.getElementById('login-submit-btn');
}

// ==========================================
// EVENT LISTENERS Y FLUJO PRINCIPAL
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
  initDOMElements();

  // Verificar si hay sesión activa al cargar la página
  if (supabase) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        mostrarAplicacionPrincipal();
      }
    } catch (e) {
      console.warn("No se pudo verificar la sesión con Supabase:", e);
    }
  }

  // Escuchar evento de envío del formulario
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }
});

/**
 * Procesa la autenticación del usuario
 */
async function handleLogin(e) {
  e.preventDefault();
  
  const email = emailInput ? emailInput.value.trim() : '';
  const password = passwordInput ? passwordInput.value : '';

  if (!email || !password) {
    mostrarError('Por favor, ingresa tu correo y contraseña.');
    return;
  }

  setLoadingState(true);
  ocultarError();

  if (!supabase) {
    mostrarError('Error de conexión con el servicio de autenticación.');
    setLoadingState(false);
    return;
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) {
      mostrarError(traducirMensajeError(error.message));
      setLoadingState(false);
      return;
    }

    if (data.user) {
      mostrarAplicacionPrincipal();
    }
  } catch (err) {
    console.error('Error durante el login:', err);
    mostrarError('Ocurrió un error inesperado al intentar conectar.');
  } finally {
    setLoadingState(false);
  }
}

// ==========================================
// GESTIÓN DE INTERFAZ Y VISTAS
// ==========================================

function mostrarAplicacionPrincipal() {
  if (loginView) loginView.classList.add('hidden');
  if (appView) appView.classList.remove('hidden');

  // Si app.js tiene una función de inicio, la ejecutamos
  if (typeof window.initApp === 'function') {
    window.initApp();
  }
}

/**
 * Función global de Logout invocada desde el botón Salir
 */
window.logout = async function () {
  if (supabase) {
    await supabase.auth.signOut();
  }
  if (appView) appView.classList.add('hidden');
  if (loginView) loginView.classList.remove('hidden');
  if (loginForm) loginForm.reset();
  ocultarError();
};

function setLoadingState(isLoading) {
  if (!submitBtn) return;

  if (isLoading) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <i class="fa-solid fa-spinner fa-spin text-xs"></i>
      <span>Autenticando...</span>
    `;
  } else {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `
      <span>Ingresar al Sistema</span>
      <i class="fa-solid fa-arrow-right text-xs"></i>
    `;
  }
}

function mostrarError(mensaje) {
  if (!errorContainer) return;
  errorContainer.textContent = mensaje;
  errorContainer.classList.remove('hidden');
}

function ocultarError() {
  if (!errorContainer) return;
  errorContainer.textContent = '';
  errorContainer.classList.add('hidden');
}

/**
 * Traductor de respuestas de error de Supabase
 */
function traducirMensajeError(msg) {
  if (msg.includes('Invalid login credentials')) {
    return 'Correo o contraseña incorrectos.';
  }
  if (msg.includes('Email not confirmed')) {
    return 'El correo electrónico no ha sido confirmado en Supabase.';
  }
  if (msg.includes('Too many requests')) {
    return 'Demasiados intentos fallidos. Inténtalo de nuevo en unos minutos.';
  }
  return msg;
}
