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
// INICIO
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

  loginForm.addEventListener('submit', iniciarSesion);

  if (!supabaseClient) {
    mostrarError(
      'No se pudo iniciar Supabase. Revisa la URL y la clave pública.'
    );
    return;
  }

  // Primero se registra el listener para no perder eventos de autenticación.
  registrarEventosAuth();

  // Luego se comprueba si existe una sesión guardada.
  await comprobarSesion();
}

// ==========================================
// CONFIGURACIÓN
// ==========================================

function inicializarSupabase() {
  try {
    if (
      !window.supabase ||
      typeof window.supabase.createClient !== 'function'
    ) {
      throw new Error(
        'El SDK de Supabase no está disponible. Revisa el orden de los scripts.'
      );
    }

    if (
      !SUPABASE_URL ||
      !SUPABASE_PUBLISHABLE_KEY ||
      SUPABASE_URL.includes('TU-') ||
      SUPABASE_PUBLISHABLE_KEY.includes('TU_')
    ) {
      throw new Error('La configuración de Supabase está incompleta.');
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
// SESIÓN EXISTENTE
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
      console.log('Sesión existente:', data.session.user.email);
      mostrarAplicacion();
    } else {
      mostrarLogin();
    }
  } catch (error) {
    console.error('Error inesperado comprobando sesión:', error);
    mostrarLogin();
  }
}

// ==========================================
// EVENTOS DE AUTH
// ==========================================

function registrarEventosAuth() {
  if (!supabaseClient) return;

  const respuesta = supabaseClient.auth.onAuthStateChange(
    (evento, session) => {
      console.log('Evento Supabase Auth:', evento);

      if (
        (evento === 'SIGNED_IN' ||
          evento === 'INITIAL_SESSION' ||
          evento === 'TOKEN_REFRESHED') &&
        session &&
        session.user
      ) {
        // Se difiere para evitar operaciones complejas dentro del callback.
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
// INICIO DE SESIÓN
// ==========================================

async function iniciarSesion(event) {
  event.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

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
    console.log('Intentando autenticar:', email);

    const respuesta = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    const { data, error } = respuesta;

    console.log('Respuesta de Supabase:', {
      user: data?.user?.email || null,
      existeSession: Boolean(data?.session),
      error: error || null
    });

    if (error) {
      mostrarError(convertirError(error));
      return;
    }

    if (!data || !data.session || !data.user) {
      mostrarError(
        'Supabase no devolvió una sesión. Verifica que el correo esté confirmado y que el proveedor Email esté habilitado.'
      );
      return;
    }

    // Cambio inmediato de vista.
    mostrarAplicacion();
  } catch (error) {
    console.error('Error durante la autenticación:', error);
    mostrarError(`Error de conexión: ${error.message}`);
  } finally {
    cambiarEstadoBoton(false);
  }
}

// ==========================================
// VISTAS
// ==========================================

function mostrarAplicacion() {
  console.log('Cambiando a la aplicación principal.');

  if (loginView) {
    loginView.classList.add('hidden');
    loginView.style.display = 'none';
  }

  if (appView) {
    appView.classList.remove('hidden');
    appView.style.display = 'flex';
  }

  if (typeof window.initApp === 'function') {
    window.initApp();
  } else {
    console.warn(
      'app.js no cargó o no contiene window.initApp().'
    );
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

  ocultarError();
}

// ==========================================
// CERRAR SESIÓN
// ==========================================

window.logout = async function () {
  try {
    if (supabaseClient) {
      const { error } = await supabaseClient.auth.signOut();

      if (error) {
        console.error('Error cerrando sesión:', error);
        mostrarError(error.message);
        return;
      }
    }

    mostrarLogin();
  } catch (error) {
    console.error('Error inesperado cerrando sesión:', error);
    mostrarLogin();
  }
};

// ==========================================
// UI
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
    return 'No se pudo conectar con Supabase. Revisa la URL, la conexión y el navegador.';
  }

  return `Supabase: ${error.message || 'error desconocido'}`;
}
