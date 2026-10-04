// ==========================================
// CONFIGURACIÓN DE SUPABASE
// ==========================================
const SUPABASE_URL = 'https://lmmoqcpptyzgscnjwvgk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_xRnGuxmB5oen-G7LDlI6JQ_SUEvLDMr';

let supabaseClient = null;

try {
  if (window.supabase && typeof window.supabase.createClient === 'function') {
    supabaseClient = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY
    );
  } else {
    console.error('El SDK de Supabase no se ha cargado correctamente.');
  }
} catch (err) {
  console.error('Error al inicializar el cliente de Supabase:', err);
}


// ==========================================
// REFERENCIAS AL DOM
// ==========================================
let loginView;
let appView;
let loginForm;
let emailInput;
let passwordInput;
let errorContainer;
let submitBtn;

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
// INICIALIZACIÓN DE LA APLICACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
  initDOMElements();

  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  if (!supabaseClient) {
    mostrarError('No fue posible conectar con el servicio de autenticación.');
    return;
  }

  try {
    const {
      data: { session },
      error
    } = await supabaseClient.auth.getSession();

    if (error) {
      console.warn('No se pudo verificar la sesión:', error.message);
      return;
    }

    if (session) {
      mostrarAplicacionPrincipal();
    }
  } catch (err) {
    console.error('Error al revisar la sesión activa:', err);
  }

  escucharCambiosDeAutenticacion();
});


// ==========================================
// LOGIN
// ==========================================
async function handleLogin(e) {
  e.preventDefault();

  const email = emailInput ? emailInput.value.trim() : '';
  const password = passwordInput ? passwordInput.value : '';

  if (!email || !password) {
    mostrarError('Por favor, ingresa tu correo y contraseña.');
    return;
  }

  if (!supabaseClient) {
    mostrarError('Error de conexión con el servicio de autenticación.');
    return;
  }

  setLoadingState(true);
  ocultarError();

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      mostrarError(traducirMensajeError(error.message));
      return;
    }

    if (data.session || data.user) {
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
// CAMBIOS DE ESTADO DE AUTENTICACIÓN
// ==========================================
function escucharCambiosDeAutenticacion() {
  if (!supabaseClient) return;

  supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
      mostrarAplicacionPrincipal();
    }

    if (event === 'SIGNED_OUT') {
      mostrarLogin();
    }
  });
}


// ==========================================
// VISTAS
// ==========================================
function mostrarAplicacionPrincipal() {
  if (loginView) {
    loginView.classList.add('hidden');
  }

  if (appView) {
    appView.classList.remove('hidden');
  }

  if (typeof window.initApp === 'function') {
    window.initApp();
  }
}

function mostrarLogin() {
  if (appView) {
    appView.classList.add('hidden');
  }

  if (loginView) {
    loginView.classList.remove('hidden');
  }

  if (loginForm) {
    loginForm.reset();
  }

  ocultarError();
}


// ==========================================
// LOGOUT
// ==========================================
window.logout = async function () {
  try {
    if (supabaseClient) {
      const { error } = await supabaseClient.auth.signOut();

      if (error) {
        console.error('Error al cerrar sesión:', error.message);
      }
    }
  } catch (err) {
    console.error('Error inesperado al cerrar sesión:', err);
  } finally {
    mostrarLogin();
  }
};


// ==========================================
// ESTADO DEL BOTÓN
// ==========================================
function setLoadingState(isLoading) {
  if (!submitBtn) return;

  submitBtn.disabled = isLoading;

  if (isLoading) {
    submitBtn.innerHTML = `
      <i class="fa-solid fa-spinner fa-spin text-xs"></i>
      <span>Autenticando...</span>
    `;
    return;
  }

  submitBtn.innerHTML = `
    <span>Ingresar al Sistema</span>
    <i class="fa-solid fa-arrow-right text-xs"></i>
  `;
}


// ==========================================
// MENSAJES DE ERROR
// ==========================================
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

function traducirMensajeError(msg = '') {
  const mensaje = msg.toLowerCase();

  if (mensaje.includes('invalid login credentials')) {
    return 'Correo o contraseña incorrectos.';
  }

  if (mensaje.includes('email not confirmed')) {
    return 'El correo electrónico todavía no ha sido confirmado.';
  }

  if (mensaje.includes('too many requests')) {
    return 'Demasiados intentos fallidos. Inténtalo nuevamente en unos minutos.';
  }

  if (mensaje.includes('user not found')) {
    return 'No existe una cuenta registrada con ese correo.';
  }

  if (mensaje.includes('network')) {
    return 'No fue posible conectar con el servicio. Revisa tu conexión a internet.';
  }

  return 'No fue posible iniciar sesión. Verifica tus datos e inténtalo nuevamente.';
}
