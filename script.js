// Reemplaza con tus credenciales de Supabase
const SUPABASE_URL = 'https://TU_PROYECTO.supabase.co';
const SUPABASE_ANON_KEY = 'TU_SUPABASE_ANON_KEY';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const loginForm = document.getElementById('loginForm');
const errorMessage = document.getElementById('errorMessage');
const submitBtn = document.getElementById('submitBtn');

// Redirige al usuario si ya tiene sesión iniciada
async function checkSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    window.location.href = 'dashboard.html';
  }
}
checkSession();

// Evento de inicio de sesión
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  errorMessage.textContent = '';
  submitBtn.disabled = true;
  submitBtn.textContent = 'Cargando...';

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

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
    window.location.href = 'dashboard.html';
  }
});