'use strict';

// ==========================================
// ESTADO GLOBAL DE LA APLICACIÓN
// ==========================================
let arancelData = [];
let partidaSeleccionada = null;

// ==========================================
// INICIALIZACIÓN (Invocada desde login.js)
// ==========================================
window.initApp = async function () {
  console.log('🚀 Inicializando DUS Aérea Chile...');

  // 1. Cargar el JSON del arancel
  await cargarArancelJSON();

  // 2. Configurar listeners de la interfaz
  configurarEventListeners();

  // 3. Evaluar reglas iniciales
  if (typeof window.evaluarReglasAereas === 'function') {
    window.evaluarReglasAereas();
  }
};

// ==========================================
// CARGA DE BASE DE DATOS LOCAL (arancel_chile.json)
// ==========================================
async function cargarArancelJSON() {
  const dbBadge = document.getElementById('db-status-badge');

  try {
    // Intenta cargar desde la raíz
    const response = await fetch('./arancel_chile.json');

    if (!response.ok) {
      throw new Error(`HTTP Error Status: ${response.status}`);
    }

    const rawData = await response.json();

    // Normalizar la estructura por si viene como Array o Objeto
    if (Array.isArray(rawData)) {
      arancelData = rawData;
    } else if (typeof rawData === 'object' && rawData !== null) {
      // Si viene envuelto en una clave como "arancel", "partidas" o como diccionario
      arancelData = rawData.arancel || rawData.partidas || Object.values(rawData);
    } else {
      arancelData = [];
    }

    console.log(`✅ Arancel cargado con éxito: ${arancelData.length} partidas registradas.`);

    if (dbBadge) {
      dbBadge.textContent = `JSON Cargado (${arancelData.length} partidas)`;
      dbBadge.className = 'text-[10px] bg-emerald-900 text-emerald-300 font-mono px-2 py-1 rounded border border-emerald-700';
    }
  } catch (error) {
    console.error('❌ Error al cargar arancel_chile.json:', error);
    if (dbBadge) {
      dbBadge.textContent = 'Error al cargar JSON';
      dbBadge.className = 'text-[10px] bg-red-900 text-red-300 font-mono px-2 py-1 rounded border border-red-700';
    }
  }
}

// ==========================================
// BUSCADOR Y AUTOCOMPLETADO DE ARANCEL
// ==========================================
window.filterTariffCodes = function () {
  const input = document.getElementById('hs-search-input');
  const dropdown = document.getElementById('hs-dropdown');

  if (!input || !dropdown) return;

  const query = input.value.trim().toLowerCase();
  const queryLimpia = query.replace(/[^0-9a-z]/gi, ''); // Elimina puntos, espacios y caracteres especiales

  // Si la búsqueda es menor a 2 caracteres, ocultar lista
  if (query.length < 2) {
    dropdown.classList.add('hidden');
    dropdown.innerHTML = '';
    return;
  }

  // Verificar si la base de datos se cargó correctamente
  if (!Array.isArray(arancelData) || arancelData.length === 0) {
    dropdown.innerHTML = `<div class="p-3 text-xs text-amber-600 bg-amber-50 italic">Cargando base de datos o sin registros...</div>`;
    dropdown.classList.remove('hidden');
    return;
  }

  // Búsqueda flexible por Código o por Glosa/Descripción
  const resultados = arancelData.filter(item => {
    if (!item) return false;

    // Soportar diferentes nombres de propiedades que puedan venir en el JSON
    const codOriginal = String(item.codigo || item.partida || item.hs_code || '').toLowerCase();
    const codLimpio = codOriginal.replace(/[^0-9a-z]/gi, '');
    const glosa = String(item.glosa || item.descripcion || item.nombre || '').toLowerCase();

    const coincideCodigo = queryLimpia.length > 0 && codLimpio.includes(queryLimpia);
    const coincideGlosa = glosa.includes(query);

    return coincideCodigo || coincideGlosa;
  }).slice(0, 15); // Limitar a los primeros 15 resultados para fluidez visual

  if (resultados.length === 0) {
    dropdown.innerHTML = `<div class="p-3 text-xs text-slate-500 italic">No se encontraron partidas para "${query}"</div>`;
    dropdown.classList.remove('hidden');
    return;
  }

  // Generar HTML del menú desplegable
  dropdown.innerHTML = resultados.map(item => {
    const cod = String(item.codigo || item.partida || item.hs_code || '');
    const glosa = String(item.glosa || item.descripcion || item.nombre || '');
    const org = String(item.organismo || item.vobo_organismo || 'GENERAL').toUpperCase();

    // Escapar comillas simples para evitar errores sintácticos en onclick
    const codEscaped = cod.replace(/'/g, "\\'");

    return `
      <div class="hs-item-option p-2.5 hover:bg-slate-100 cursor-pointer text-xs flex justify-between items-center transition border-b border-slate-100 last:border-b-0"
           onclick="seleccionarPartida('${codEscaped}')">
        <div>
          <span class="font-mono font-bold text-slate-800 mr-2">${cod}</span>
          <span class="text-slate-600">${glosa}</span>
        </div>
        <span class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">${org}</span>
      </div>
    `;
  }).join('');

  dropdown.classList.remove('hidden');
};

window.seleccionarPartida = function (codigo) {
  if (!arancelData || arancelData.length === 0) return;

  // Buscar coincidencia exacta
  const item = arancelData.find(a => {
    const c = String(a.codigo || a.partida || a.hs_code || '').trim();
    return c === String(codigo).trim();
  });

  if (!item) return;

  partidaSeleccionada = item;

  const cod = item.codigo || item.partida || item.hs_code || '--.--.--.--';
  const glosa = item.glosa || item.descripcion || item.nombre || '';
  const org = (item.organismo || item.vobo_organismo || 'GENERAL').toUpperCase();
  const voboDesc = item.vobo_descripcion || item.vobo || item.requerimiento || 'Sin requerimientos especiales de visto bueno previo para exportación.';

  // Actualizar el valor del buscador
  const inputSearch = document.getElementById('hs-search-input');
  if (inputSearch) inputSearch.value = `${cod} - ${glosa}`;

  // Ocultar desplegable
  const dropdown = document.getElementById('hs-dropdown');
  if (dropdown) dropdown.classList.add('hidden');

  // Actualizar la visualización de la partida en el panel
  const displayCode = document.getElementById('tariff-code-display');
  if (displayCode) displayCode.textContent = cod;

  const displayGlosa = document.getElementById('tariff-glosa-display');
  if (displayGlosa) displayGlosa.textContent = glosa;

  const badgeOrg = document.getElementById('tariff-organismo-badge');
  if (badgeOrg) badgeOrg.textContent = org;

  const descVobo = document.getElementById('tariff-vobo-desc');
  if (descVobo) descVobo.textContent = voboDesc;

  // Reevaluar la normativa
  if (typeof window.evaluarReglasAereas === 'function') {
    window.evaluarReglasAereas();
  }
};

window.clearHsSearch = function () {
  const inputSearch = document.getElementById('hs-search-input');
  if (inputSearch) inputSearch.value = '';

  const dropdown = document.getElementById('hs-dropdown');
  if (dropdown) dropdown.classList.add('hidden');

  const displayCode = document.getElementById('tariff-code-display');
  if (displayCode) displayCode.textContent = '--.--.--.--';

  const displayGlosa = document.getElementById('tariff-glosa-display');
  if (displayGlosa) displayGlosa.textContent = 'Seleccione una partida del buscador para evaluar vistos buenos.';

  const descVobo = document.getElementById('tariff-vobo-desc');
  if (descVobo) descVobo.textContent = '';

  const badgeOrg = document.getElementById('tariff-organismo-badge');
  if (badgeOrg) badgeOrg.textContent = 'GENERAL';

  partidaSeleccionada = null;

  if (typeof window.evaluarReglasAereas === 'function') {
    window.evaluarReglasAereas();
  }
};

function configurarEventListeners() {
  // Cierra el menú desplegable al hacer clic fuera del buscador
  document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('hs-dropdown');
    const input = document.getElementById('hs-search-input');
    if (dropdown && !dropdown.contains(e.target) && e.target !== input) {
      dropdown.classList.add('hidden');
    }
  });
}
