// Reemplaza con tus credenciales de Supabase
const SUPABASE_URL = 'https://lmmoqcpptyzgscnjwvgk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_xRnGuxmB5oen-G7LDlI6JQ_SUEvLDMr';



// 1. Reemplaza con las credenciales reales de tu proyecto en Supabase
const SUPABASE_URL = 'https://TU_PROYECTO.supabase.co';
const SUPABASE_ANON_KEY = 'TU_SUPABASE_ANON_KEY';

let supabase = null;

// Inicialización segura de Supabase
if (typeof window.supabase !== 'undefined' && SUPABASE_URL && !SUPABASE_URL.includes('TU_PROYECTO')) {
  try {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (err) {
    console.error("Error al inicializar Supabase:", err);
  }
}

const loginCard = document.querySelector('.login-card');
const appContent = document.getElementById('app-content');
const loginForm = document.getElementById('loginForm');
const errorMessage = document.getElementById('errorMessage');
const submitBtn = document.getElementById('submitBtn');

// Función para mostrar la aplicación y ocultar el login
function showApp() {
  if (loginCard) loginCard.classList.add('hidden');
  if (appContent) appContent.classList.remove('hidden');
}

// Función para mostrar el login y ocultar la aplicación
function showLogin() {
  if (loginCard) loginCard.classList.remove('hidden');
  if (appContent) appContent.classList.add('hidden');
}

// Verifica el estado de la sesión
async function checkSession() {
  if (!supabase) {
    // Si aún no se ha configurado la URL real de Supabase, verifica si hay sesión local
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
    console.warn("No se pudo verificar sesión con la base de datos:", e);
    showLogin();
  }
}

// Manejo del formulario de inicio de sesión
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    errorMessage.textContent = '';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Cargando...';

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // Si Supabase aún tiene la URL de ejemplo, permite ingreso local
    if (!supabase) {
      if (email && password) {
        localStorage.setItem('isLoggedIn', 'true');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Ingresar';
        showApp();
      } else {
        errorMessage.textContent = 'Ingresa un correo y contraseña válidos.';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Ingresar';
      }
      return;
    }

    // Inicio de sesión real contra la base de datos de Supabase
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        errorMessage.textContent = error.message === 'Invalid login credentials' 
          ? 'Correo o contraseña incorrectos' 
          : error.message;
        submitBtn.disabled = false;
        submitBtn.textContent = 'Ingresar';
      } else {
        localStorage.setItem('isLoggedIn', 'true');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Ingresar';
        showApp();
      }
    } catch (err) {
      errorMessage.textContent = 'Error de conexión con la base de datos.';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Ingresar';
    }
  });
}

// Función de Cierre de Sesión
async function logout() {
  localStorage.removeItem('isLoggedIn');
  if (supabase) {
    await supabase.auth.signOut();
  }
  showLogin();
}

// Ejecutar comprobación al cargar la página
document.addEventListener('DOMContentLoaded', () => {
  checkSession();
});












