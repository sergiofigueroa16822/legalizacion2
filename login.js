'use strict';

// ==========================================
// CONFIGURACIÓN DE SUPABASE
// ==========================================

const SUPABASE_URL = 'https://lmmoqcpptyzgscnjwvgk.supabase.co';
const SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_xRnGuxmB5oen-G7LDlI6JQ_SUEvLDMr';

let supabaseClient = null;
let authSubscription = null;

// ==========================================
// ELEMENTOS DEL DOM
// ==========================================

let loginView;
let appView;
let loginForm;
let emailInput;
let passwordInput;
let errorContainer;
let submitBtn;

// ==========================================
// INICIALIZACIÓN
// ==========================================

document.addEventListener('DOMContentLoaded', iniciarAplicacion);

async function iniciarAplicacion() {
  obtenerElementosDOM();
  inicializarSupabase();

  if (!loginForm || !loginView || !appView) {
    console.error(
      'Faltan elementos obligatorios: login-form, login-view o app-view.'
    );
    return;
  }

  // 1. Evento para iniciar sesión
  loginForm.addEventListener('submit', iniciarSesion);

  // 2. Evento global para cerrar sesión (Captura clics en cualquier botón de salir)
  document.addEventListener('click', (e) => {
    const logoutBtn = e.target.closest('#logout-btn');
    if (logoutBtn) {
      e.preventDefault();
      cerrarSesion();
    }
  });

  if (!supabaseClient) {
    mostrarError(
      'No se pudo iniciar Supabase. Revisa la URL y la clave pública.'
    );
    return;
  }

  // Comprobar sesión de Supabase
  registrarEventosAuth();
  await comprobarSesion();
}

// ==========================================
// CONFIGURACIÓN DE SUPABASE
// ==========================================

function inicializarSupabase() {
  try {
    if (
      !window.supabase ||
      typeof window.supabase.createClient !== 'function'
    ) {
      throw new Error(
        'El SDK de Supabase no está disponible. Revisa el orden de los scripts en el HTML.'
      );
    }

    supabaseClient = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      }
    );

    console.log('Supabase inicializado correctamente.');
  } catch (error) {
    console.error('Error inicializando Supabase:', error);
    supabaseClient = null;
  }
}

function obtenerElementosDOM() {
  loginView = document.getElementById('login-view');
  appView = document.getElementById('app-view');
  loginForm = document.getElementById('login-form');
  emailInput = document.getElementById('login-email');
  passwordInput = document.getElementById('login-password');
  errorContainer = document.getElementById('login-error');
  submitBtn = document.getElementById('login-submit-btn');
}

// ==========================================
// MANEJO DE SESIÓN
// ==========================================

async function comprobarSesion() {
  try {
    const { data, error } = await supabaseClient.auth.getSession();

    if (error) {
      console.error('Error obteniendo sesión:', error);
      mostrarLogin();
      return;
    }

    if (data.session && data.session.user) {
      console.log('Sesión activa:', data.session.user.email);
      mostrarAplicacion();
    } else {
      mostrarLogin();
    }
  } catch (error) {
    console.error('Error inesperado comprobando sesión:', error);
    mostrarLogin();
  }
}

function registrarEventosAuth() {
  if (!supabaseClient) return;

  const respuesta = supabaseClient.auth.onAuthStateChange(
    (evento, session) => {
      console.log('Evento Auth:', evento);

      if (
        (evento === 'SIGNED_IN' ||
          evento === 'INITIAL_SESSION' ||
          evento === 'TOKEN_REFRESHED') &&
        session &&
        session.user
      ) {
        setTimeout(() => {
          mostrarAplicacion();
        }, 0);
      }

      if (evento === 'SIGNED_OUT') {
        setTimeout(() => {
          mostrarLogin();
        }, 0);
      }
    }
  );

  authSubscription = respuesta.data.subscription;
}

// ==========================================
// ACCIONES: INICIAR Y CERRAR SESIÓN
// ==========================================

async function iniciarSesion(event) {
  event.preventDefault();

  const email = emailInput ? emailInput.value.trim() : '';
  const password = passwordInput ? passwordInput.value : '';

  ocultarError();

  if (!email || !password) {
    mostrarError('Ingresa el correo electrónico y la contraseña.');
    return;
  }

  if (!supabaseClient) {
    mostrarError('El cliente Supabase no está disponible.');
    return;
  }

  cambiarEstadoBoton(true);

  try {
    const respuesta = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    const { data, error } = respuesta;

    if (error) {
      mostrarError(convertirError(error));
      return;
    }

    if (!data || !data.session || !data.user) {
      mostrarError('No se pudo iniciar sesión. Verifica tu cuenta.');
      return;
    }

    mostrarAplicacion();
  } catch (error) {
    console.error('Error durante la autenticación:', error);
    mostrarError(`Error de conexión: ${error.message}`);
  } finally {
    cambiarEstadoBoton(false);
  }
}

async function cerrarSesion() {
  if (supabaseClient) {
    try {
      await supabaseClient.auth.signOut();
    } catch (err) {
      console.error('Error al cerrar sesión en Supabase:', err);
    }
  }
  mostrarLogin();
}

// Compatibilidad con invocación por inline onclick="handleLogout()"
window.handleLogout = function() {
  cerrarSesion();
};

// ==========================================
// CONTROL DE VISTAS (DOM)
// ==========================================

function mostrarAplicacion() {
  if (loginView) {
    loginView.classList.add('hidden');
    loginView.style.display = 'none';
  }

  if (appView) {
    appView.classList.remove('hidden');
    appView.style.display = 'flex';
  }

  document.body.classList.remove('overflow-hidden');

  if (typeof renderChecklist === 'function') {
    renderChecklist();
  }

  if (typeof window.initApp === 'function') {
    window.initApp();
  }
}

function mostrarLogin() {
  if (appView) {
    appView.classList.add('hidden');
    appView.style.display = 'none';
  }

  if (loginView) {
    loginView.classList.remove('hidden');
    loginView.style.display = 'flex';
  }

  if (loginForm) {
    loginForm.reset();
  }

  document.body.classList.add('overflow-hidden');
  ocultarError();
}

// ==========================================
// UTILIDADES UI Y MENSAJES
// ==========================================

function cambiarEstadoBoton(cargando) {
  if (!submitBtn) return;

  submitBtn.disabled = cargando;

  if (cargando) {
    submitBtn.innerHTML = `
      <i class="fa-solid fa-spinner fa-spin text-xs"></i>
      <span>Autenticando...</span>
    `;
    submitBtn.classList.add('opacity-70', 'cursor-not-allowed');
  } else {
    submitBtn.innerHTML = `
      <span>Ingresar al Sistema</span>
      <i class="fa-solid fa-arrow-right text-xs"></i>
    `;
    submitBtn.classList.remove('opacity-70', 'cursor-not-allowed');
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

function convertirError(error) {
  const mensaje = String(error?.message || '').toLowerCase();

  if (mensaje.includes('invalid login credentials')) {
    return 'Correo o contraseña incorrectos.';
  }
  if (mensaje.includes('email not confirmed')) {
    return 'El correo electrónico todavía no está confirmado.';
  }
  if (mensaje.includes('user not found')) {
    return 'No existe un usuario con ese correo.';
  }
  if (mensaje.includes('too many requests')) {
    return 'Demasiados intentos. Espera unos minutos.';
  }
  if (
    mensaje.includes('failed to fetch') ||
    mensaje.includes('network') ||
    mensaje.includes('fetch')
  ) {
    return 'No se pudo conectar con Supabase. Revisa la conexión.';
  }

  return `Supabase: ${error.message || 'Error desconocido'}`;
}
