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

  // 1. Cargar el JSON del arancel desde la raíz de GitHub/servidor
  await cargarArancelJSON();

  // 2. Asignar event listeners a los inputs de la app
  configurarEventListeners();

  // 3. Primera evaluación con los valores por defecto
  evaluarReglasAereas();
};

// ==========================================
// CARGA DE BASE DE DATOS LOCAL (arancel_chile.json)
// ==========================================
async function cargarArancelJSON() {
  const dbBadge = document.getElementById('db-status-badge');

  try {
    // Busca el archivo arancel_chile.json en la raíz del proyecto
    const response = await fetch('./arancel_chile.json');

    if (!response.ok) {
      throw new Error(`HTTP Error status: ${response.status}`);
    }

    arancelData = await response.json();
    console.log(`✅ Arancel cargado con éxito: ${arancelData.length} registros.`);

    if (dbBadge) {
      dbBadge.textContent = `JSON Cargado (${arancelData.length} partidas)`;
      dbBadge.className = 'text-[10px] bg-emerald-900 text-emerald-300 font-mono px-2 py-1 rounded border border-emerald-700';
    }
  } catch (error) {
    console.error('❌ Error cargando arancel_chile.json:', error);
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

  if (query.length < 2) {
    dropdown.classList.add('hidden');
    dropdown.innerHTML = '';
    return;
  }

  // Filtrar partidas por código o por descripción (glosa)
  const resultados = arancelData.filter(item => {
    const codigoMatch = item.codigo && item.codigo.replaceAll('.', '').includes(query.replaceAll('.', ''));
    const glosaMatch = item.glosa && item.glosa.toLowerCase().includes(query);
    return codigoMatch || glosaMatch;
  }).slice(0, 15); // Limitar a los primeros 15 resultados

  if (resultados.length === 0) {
    dropdown.innerHTML = `<div class="p-3 text-xs text-slate-500 italic">No se encontraron partidas para "${query}"</div>`;
    dropdown.classList.remove('hidden');
    return;
  }

  dropdown.innerHTML = resultados.map(item => `
    <div class="hs-item-option p-2.5 hover:bg-slate-100 cursor-pointer text-xs flex justify-between items-center transition border-b border-slate-100 last:border-b-0"
         onclick="seleccionarPartida('${item.codigo}')">
      <div>
        <span class="font-mono font-bold text-aduana-700 mr-2">${item.codigo}</span>
        <span class="text-slate-700">${item.glosa}</span>
      </div>
      <span class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">${item.organismo || 'GENERAL'}</span>
    </div>
  `).join('');

  dropdown.classList.remove('hidden');
};

window.seleccionarPartida = function (codigo) {
  const item = arancelData.find(a => a.codigo === codigo);
  if (!item) return;

  partidaSeleccionada = item;

  // Actualizar la interfaz con los datos seleccionados
  document.getElementById('hs-search-input').value = `${item.codigo} - ${item.glosa}`;
  document.getElementById('hs-dropdown').classList.add('hidden');

  document.getElementById('tariff-code-display').textContent = item.codigo;
  document.getElementById('tariff-glosa-display').textContent = item.glosa;

  const badgeOrg = document.getElementById('tariff-organismo-badge');
  badgeOrg.textContent = item.organismo || 'GENERAL';

  const descVobo = document.getElementById('tariff-vobo-desc');
  descVobo.textContent = item.vobo_descripcion || 'Sin requerimientos especiales de visto bueno previo para exportación.';

  // Reevaluar reglas con la nueva partida
  evaluarReglasAereas();
};

window.clearHsSearch = function () {
  document.getElementById('hs-search-input').value = '';
  document.getElementById('hs-dropdown').classList.add('hidden');
  document.getElementById('tariff-code-display').textContent = '--.--.--.--';
  document.getElementById('tariff-glosa-display').textContent = 'Seleccione una partida del buscador para evaluar vistos buenos.';
  document.getElementById('tariff-vobo-desc').textContent = '';
  document.getElementById('tariff-organismo-badge').textContent = 'GENERAL';
  partidaSeleccionada = null;
  evaluarReglasAereas();
};

// ==========================================
// EVALUACIÓN NORMATIVA Y REGLAS AÉREAS
// ==========================================
window.evaluarReglasAereas = function () {
  const fob = parseFloat(document.getElementById('num-fob')?.value || 0);
  const regimen = document.getElementById('sel-regimen')?.value;
  const awbType = document.querySelector('input[name="awb_type"]:checked')?.value;
  const requiereGD = document.getElementById('chk-traslado-camion')?.checked;

  // 1. Evaluar Obligatoriedad de Agente de Aduana (USD 3.000 FOB)
  const badgeMandato = document.getElementById('badge-mandato');
  if (badgeMandato) {
    if (fob >= 3000) {
      badgeMandato.textContent = 'Agente Aduana Obligatorio (≥ USD 3.000)';
      badgeMandato.className = 'text-[10px] font-bold px-2 py-0.5 rounded bg-red-600 text-white';
    } else {
      badgeMandato.textContent = 'Tramitación Directa / Tramite Simplificado (< USD 3.000)';
      badgeMandato.className = 'text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-600 text-white';
    }
  }

  // 2. Evaluar Guía de Despacho Terrestre
  const resGdStatus = document.getElementById('res-gd-status');
  if (resGdStatus) {
    resGdStatus.textContent = requiereGD ? 'OBLIGATORIA (RUT Explotador)' : 'NO REQUERIDA (En Aeropuerto)';
    resGdStatus.className = requiereGD ? 'font-bold text-xs text-amber-700 mt-1' : 'font-bold text-xs text-slate-700 mt-1';
  }

  // 3. Evaluar Tipo de Guía Aérea (AWB)
  const resAwbStatus = document.getElementById('res-awb-status');
  if (resAwbStatus) {
    resAwbStatus.textContent = awbType === 'FORWARDER' ? 'HAWB + MAWB (Agente Carga)' : 'MAWB DIRECTA (Aerolínea)';
  }

  // 4. Actualizar tarjeta de Visto Bueno según la partida seleccionada
  actualizarTarjetaVoBo();

  // 5. Renderizar Checklist dinámico
  renderizarChecklist(fob, requiereGD, awbType);
};

function actualizarTarjetaVoBo() {
  const voboTag = document.getElementById('vobo-organismo-tag');
  const voboTitle = document.getElementById('vobo-title');
  const voboDesc = document.getElementById('vobo-full-desc');

  if (!partidaSeleccionada || !partidaSeleccionada.organismo || partidaSeleccionada.organismo === 'GENERAL') {
    if (voboTag) voboTag.textContent = 'RÉGIMEN GENERAL';
    if (voboTitle) voboTitle.textContent = 'Sin Visto Bueno Obligatorio en Origen';
    if (voboDesc) voboDesc.textContent = 'La mercancía no está sujeta a fiscalización de organismos externos (SAG, ISP, Sernapesca, etc.). Sigue el proceso regular de fiscalización aduanera.';
    return;
  }

  const org = partidaSeleccionada.organismo;
  if (voboTag) voboTag.textContent = `REQUIERE REVISIÓN ${org}`;
  if (voboTitle) voboTitle.textContent = `Visto Bueno / Certificado ${org}`;
  if (voboDesc) voboDesc.textContent = partidaSeleccionada.vobo_descripcion || `Requiere inspección o certificado de ${org} previo a la legalización de la DUS.`;
}

function renderizarChecklist(fob, requiereGD, awbType) {
  const container = document.getElementById('checklist-container');
  if (!container) return;

  const docs = [
    { id: 'doc-factura', name: 'Factura de Exportación (sii.cl)', req: true },
    { id: 'doc-awb', name: awbType === 'FORWARDER' ? 'Guía Aérea Consolidada (HAWB)' : 'Guía Aérea Guía Madre (MAWB)', req: true },
    { id: 'doc-gd', name: 'Guía de Despacho (Tránsito Terrestre a Aeropuerto)', req: requiereGD },
    { id: 'doc-mandato', name: 'Mandato / Encargo Conferido al Agente de Aduana', req: fob >= 3000 },
    { id: 'doc-vobo', name: `Certificado / Visto Bueno (${partidaSeleccionada?.organismo || 'SAG/ISP'})`, req: Boolean(partidaSeleccionada && partidaSeleccionada.organismo && partidaSeleccionada.organismo !== 'GENERAL') }
  ];

  container.innerHTML = docs.map(d => `
    <div class="p-3 flex items-center justify-between text-xs hover:bg-slate-50 transition">
      <label for="${d.id}" class="flex items-center gap-2 cursor-pointer ${d.req ? 'font-medium text-slate-800' : 'text-slate-400 line-through'}">
        <input type="checkbox" id="${d.id}" ${d.req ? '' : 'disabled'} class="rounded text-aduana-600 focus:ring-aduana-500">
        <span>${d.name}</span>
      </label>
      <span class="text-[10px] font-bold px-2 py-0.5 rounded ${d.req ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-400'}">
        ${d.req ? 'REQUERIDO' : 'OPCIONAL'}
      </span>
    </div>
  `).join('');
}

function configurarEventListeners() {
  // Ocultar dropdown al hacer clic fuera del buscador
  document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('hs-dropdown');
    const input = document.getElementById('hs-search-input');
    if (dropdown && !dropdown.contains(e.target) && e.target !== input) {
      dropdown.classList.add('hidden');
    }
  });
}

window.copyChecklistToClipboard = function () {
  const checks = document.querySelectorAll('#checklist-container input[type="checkbox"]');
  let texto = 'CHECKLIST EXPEDIENTE DUS AÉREA:\n';
  checks.forEach(c => {
    const label = c.closest('div').querySelector('span').textContent;
    texto += `${c.checked ? '[X]' : '[ ]'} ${label}\n`;
  });

  navigator.clipboard.writeText(texto).then(() => {
    const toast = document.getElementById('toast-msg');
    if (toast) {
      toast.classList.remove('hidden');
      setTimeout(() => toast.classList.add('hidden'), 2500);
    }
  });
};
