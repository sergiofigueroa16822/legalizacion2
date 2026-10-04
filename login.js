// ==========================================
// CONFIGURACIÓN DE SUPABASE
// ==========================================


// ==========================================
// CONFIGURACIÓN DE SUPABASE
// ==========================================

// Pega aquí los datos de tu proyecto Supabase.
// No uses una service_role key en el navegador.
const SUPABASE_URL = 'https://lmmoqcpptyzgscnjwvgk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_xRnGuxmB5oen-G7LDlI6JQ_SUEvLDMr';

let supabaseClient = null;
let authSubscription = null;


// ==========================================
// REFERENCIAS DEL DOM
// ==========================================
let loginView = null;
let appView = null;
let loginForm = null;
let emailInput = null;
let passwordInput = null;
let errorContainer = null;
let submitBtn = null;


// ==========================================
// INICIALIZACIÓN DEL CLIENTE SUPABASE
// ==========================================
function initSupabaseClient() {
  try {
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      throw new Error('El SDK de Supabase no fue cargado correctamente.');
    }

    if (
      !SUPABASE_URL ||
      SUPABASE_URL.includes('TU-PROYECTO') ||
      !SUPABASE_PUBLISHABLE_KEY ||
      SUPABASE_PUBLISHABLE_KEY.includes('TU_CLAVE')
    ) {
      throw new Error('Debes configurar SUPABASE_URL y SUPABASE_PUBLISHABLE_KEY en login.js.');
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

    console.log('Cliente Supabase inicializado correctamente.');
  } catch (error) {
    console.error('Error al inicializar Supabase:', error);
    supabaseClient = null;
  }
}


// ==========================================
// REFERENCIAS HTML
// ==========================================
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
// INICIO DE LA PÁGINA
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
  initDOMElements();
  initSupabaseClient();

  if (!loginView || !appView || !loginForm) {
    console.error('No se encontraron los elementos HTML requeridos para el login.');
    return;
  }

  loginForm.addEventListener('submit', handleLogin);

  if (!supabaseClient) {
    mostrarError(
      'No se pudo inicializar el servicio de autenticación. Revisa la configuración de Supabase.'
    );
    return;
  }

  escucharCambiosDeAutenticacion();
  await revisarSesionExistente();
});


// ==========================================
// REVISIÓN DE SESIÓN AL CARGAR
// ==========================================
async function revisarSesionExistente() {
  try {
    const {
      data: { session },
      error
    } = await supabaseClient.auth.getSession();

    if (error) {
      console.error('Error al revisar sesión:', error);
      mostrarLogin();
      return;
    }

    if (session?.user) {
      console.log('Sesión activa detectada:', session.user.email);
      mostrarAplicacionPrincipal();
      return;
    }

    mostrarLogin();
  } catch (error) {
    console.error('Error inesperado al revisar sesión:', error);
    mostrarLogin();
  }
}


// ==========================================
// LOGIN
// ==========================================
async function handleLogin(event) {
  event.preventDefault();

  const email = emailInput?.value.trim() || '';
  const password = passwordInput?.value || '';

  if (!email || !password) {
    mostrarError('Ingresa tu correo electrónico y contraseña.');
    return;
  }

  if (!supabaseClient) {
    mostrarError('No hay conexión con el servicio de autenticación.');
    return;
  }

  ocultarError();
  setLoadingState(true);

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error('Error de autenticación:', error);
      mostrarError(traducirMensajeError(error.message));
      return;
    }

    if (!data.session?.user) {
      console.warn('Supabase no devolvió una sesión después del login:', data);

      mostrarError(
        'El usuario fue validado, pero no se creó una sesión. Revisa si el correo está confirmado en Supabase.'
      );

      return;
    }

    console.log('Login correcto:', data.session.user.email);

    // Se muestra aquí para que el cambio sea inmediato.
    // onAuthStateChange también confirma el cambio de sesión.
    mostrarAplicacionPrincipal();
  } catch (error) {
    console.error('Error inesperado en login:', error);
    mostrarError('Ocurrió un error inesperado al iniciar sesión.');
  } finally {
    setLoadingState(false);
  }
}


// ==========================================
// EVENTOS DE AUTENTICACIÓN
// ==========================================
function escucharCambiosDeAutenticacion() {
  if (!supabaseClient) return;

  if (authSubscription) {
    authSubscription.unsubscribe();
  }

  const { data } = supabaseClient.auth.onAuthStateChange((event, session) => {
    console.log('Evento de autenticación:', event);

    if (
      (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') &&
      session?.user
    ) {
      mostrarAplicacionPrincipal();
    }

    if (event === 'SIGNED_OUT') {
      mostrarLogin();
    }
  });

  authSubscription = data.subscription;
}


// ==========================================
// CAMBIO DE VISTAS
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
// CIERRE DE SESIÓN
// ==========================================
window.logout = async function logout() {
  try {
    if (supabaseClient) {
      const { error } = await supabaseClient.auth.signOut();

      if (error) {
        console.error('Error al cerrar sesión:', error);
        mostrarError('No se pudo cerrar la sesión correctamente.');
        return;
      }
    }
  } catch (error) {
    console.error('Error inesperado al cerrar sesión:', error);
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
    submitBtn.classList.add('opacity-70', 'cursor-not-allowed');

    submitBtn.innerHTML = `
      <i class="fa-solid fa-spinner fa-spin text-xs"></i>
      <span>Autenticando...</span>
    `;

    return;
  }

  submitBtn.classList.remove('opacity-70', 'cursor-not-allowed');

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

function traducirMensajeError(mensajeSupabase = '') {
  const mensaje = mensajeSupabase.toLowerCase();

  if (mensaje.includes('invalid login credentials')) {
    return 'Correo o contraseña incorrectos.';
  }

  if (mensaje.includes('email not confirmed')) {
    return 'El correo electrónico aún no ha sido confirmado.';
  }

  if (mensaje.includes('too many requests')) {
    return 'Demasiados intentos. Espera unos minutos antes de volver a intentarlo.';
  }

  if (mensaje.includes('user not found')) {
    return 'No existe una cuenta con ese correo electrónico.';
  }

  if (mensaje.includes('network')) {
    return 'No se pudo conectar con Supabase. Revisa tu conexión a internet.';
  }

  return `No fue posible iniciar sesión: ${mensajeSupabase}`;
}
