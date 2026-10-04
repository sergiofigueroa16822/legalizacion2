// ==========================================
// CONFIGURACIÓN DE SUPABASE
// ==========================================
const SUPABASE_URL = 'https://lmmoqcpptyzgscnjwvgk.supabase.co';
// Reemplaza esta cadena con tu anon key (JWT) real de Supabase:
const SUPABASE_ANON_KEY = 'sb_publishable_xRnGuxmB5oen-G7LDlI6JQ_SUEvLDMr';

// Inicialización del cliente Supabase v2
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==========================================
// REFERENCIAS AL DOM
// ==========================================
const loginView = document.getElementById('login-view');
const appView = document.getElementById('app-view');
const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('login-email');
const passwordInput = document.getElementById('login-password');
const errorContainer = document.getElementById('login-error');
const submitBtn = document.getElementById('login-submit-btn');

// ==========================================
// EVENT LISTENERS Y MANEJO DE INICIO DE SESIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
  // Verificar si existe una sesión activa al cargar la página
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session) {
    mostrarAplicacionPrincipal();
  }

  // Escuchar el evento de envío del formulario de Login
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }
});

/**
 * Procesa la autenticación del usuario mediante Supabase Auth
 */
async function handleLogin(e) {
  e.preventDefault();
  
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    mostrarError('Por favor, ingresa tu correo y contraseña.');
    return;
  }

  setLoadingState(true);
  ocultarError();

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

    // Autenticación exitosa
    if (data.user) {
      mostrarAplicacionPrincipal();
    }
  } catch (err) {
    console.error('Error inesperado durante el login:', err);
    mostrarError('Ocurrió un error inesperado. Inténtalo nuevamente.');
    setLoadingState(false);
  }
}

// ==========================================
// GESTIÓN DE VISTAS Y ESTADOS DE INTERFAZ
// ==========================================

function mostrarAplicacionPrincipal() {
  loginView.classList.add('hidden');
  appView.classList.remove('hidden');

  // Invoca la inicialización definida en app.js
  if (typeof window.initApp === 'function') {
    window.initApp();
  }
}

/**
 * Función global para cerrar sesión (invocada desde el botón "Salir" en index.html)
 */
window.logout = async function () {
  await supabase.auth.signOut();
  appView.classList.add('hidden');
  loginView.classList.remove('hidden');
  loginForm.reset();
  ocultarError();
};

function setLoadingState(isLoading) {
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
  errorContainer.textContent = mensaje;
  errorContainer.classList.remove('hidden');
}

function ocultarError() {
  errorContainer.textContent = '';
  errorContainer.classList.add('hidden');
}

function traducirMensajeError(msg) {
  if (msg.includes('Invalid login credentials')) {
    return 'Credenciales inválidas. Verifica tu correo y contraseña.';
  }
  if (msg.includes('Email not confirmed')) {
    return 'El correo electrónico no ha sido confirmado aún.';
  }
  if (msg.includes('Too many requests')) {
    return 'Demasiados intentos fallidos. Inténtalo más tarde.';
  }
  return msg;
}
