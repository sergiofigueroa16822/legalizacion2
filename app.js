// ==========================================
// BASE DE DATOS Y ESTADO GLOBAL DE LA APP
// ==========================================
let arancelDatabase = [];
let currentTariff = null;

// Normaliza texto para búsquedas (quita puntos, espacios y pasa a minúsculas)
function normalizarCodigo(str) {
  return String(str || '').replace(/[\s.]/g, '').toLowerCase();
}

// Carga de la base de datos de Arancel desde JSON
async function cargarBaseDatosArancel() {
  const badge = document.getElementById('db-status-badge');
  try {
    const response = await fetch('arancel_chile.json');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    arancelDatabase = await response.json();
    
    if (badge) {
      badge.textContent = `${arancelDatabase.length} registros`;
      badge.className = "text-[10px] bg-emerald-100 text-emerald-800 font-mono px-1.5 py-0.5 rounded border border-emerald-300 font-bold";
    }
    
    // Carga por defecto del primer elemento si existe
    if (arancelDatabase.length > 0) {
      currentTariff = arancelDatabase[0];
      updateTariffUI();
      evaluarReglasAereas();
    }
  } catch (error) {
    console.error('Error al cargar arancel_chile.json:', error);
    if (badge) {
      badge.textContent = "Error al cargar JSON";
      badge.className = "text-[10px] bg-red-100 text-red-800 font-mono px-1.5 py-0.5 rounded border border-red-300 font-bold";
    }
  }
}

// ==========================================
// BUSCADOR Y SELECCIÓN DE ARANCEL
// ==========================================
function filterTariffCodes() {
  const queryRaw = document.getElementById('hs-search-input').value.trim();
  const queryNorm = normalizarCodigo(queryRaw);
  const queryText = queryRaw.toLowerCase();
  const dropdown = document.getElementById('hs-dropdown');
  
  if (!queryRaw) {
    dropdown.classList.add('hidden');
    return;
  }

  const matches = arancelDatabase.filter(item => {
    const codeNorm = normalizarCodigo(item.code);
    const glosaText = String(item.glosa || '').toLowerCase();
    const orgText = String(item.organismo || '').toLowerCase();
    const voboText = String(item.vobo_nombre || '').toLowerCase();
    return codeNorm.includes(queryNorm) || glosaText.includes(queryText) || orgText.includes(queryText) || voboText.includes(queryText);
  }).slice(0, 30);

  if (matches.length === 0) {
    dropdown.innerHTML = `
      <div class="p-3 text-slate-400 text-center text-[11px]">
        No se encontraron partidas exactas. Se aplicará Régimen General de Salida.
      </div>
    `;
  } else {
    dropdown.innerHTML = matches.map(item => `
      <div onclick="selectTariff('${item.code}')" class="p-2.5 hover:bg-slate-100 cursor-pointer transition flex items-start justify-between gap-2">
        <div>
          <div class="font-mono font-bold text-aduana-600 text-xs">${item.code || 'S/C'}</div>
          <div class="font-semibold text-slate-800 text-[11px]">${item.glosa || 'Sin Glosa'}</div>
          <div class="text-[10px] text-slate-500 leading-tight">${item.vobo_nombre || ''}</div>
        </div>
        <span class="text-[9px] font-bold px-1.5 py-0.5 rounded ${item.obligatorio ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-slate-100 text-slate-600'}">
          ${item.organismo || 'GENERAL'}
        </span>
      </div>
    `).join('');
  }
  dropdown.classList.remove('hidden');
}

function selectTariff(code) {
  const found = arancelDatabase.find(t => t.code === code);
  if (found) {
    currentTariff = found;
    updateTariffUI();
    evaluarReglasAereas();
  }
  document.getElementById('hs-dropdown').classList.add('hidden');
  document.getElementById('hs-search-input').value = "";
}

function clearHsSearch() {
  document.getElementById('hs-search-input').value = "";
  document.getElementById('hs-dropdown').classList.add('hidden');
}

function updateTariffUI() {
  if (!currentTariff) return;
  document.getElementById('tariff-code-display').textContent = currentTariff.code || 'S/C';
  document.getElementById('tariff-glosa-display').textContent = currentTariff.glosa || 'Sin glosa disponible';
  document.getElementById('tariff-organismo-badge').textContent = currentTariff.organismo || 'GENERAL';
  document.getElementById('tariff-vobo-desc').textContent = currentTariff.desc || currentTariff.vobo_nombre || 'Sin observaciones adicionales.';

  document.getElementById('vobo-organismo-tag').textContent = currentTariff.organismo || 'RÉGIMEN GENERAL';
  document.getElementById('vobo-title').textContent = currentTariff.vobo_nombre || 'Sin Visto Bueno Obligatorio';
  document.getElementById('vobo-full-desc').textContent = currentTariff.desc || 'Mercancía bajo régimen general no sujeta a control fitosanitario u organismo restrictivo directo en origen.';

  const voboCard = document.getElementById('vobo-card-alert');
  if (!currentTariff.obligatorio) {
    voboCard.className = "p-4 rounded-xl border border-slate-200 bg-slate-100/80 shadow-sm space-y-2";
  } else {
    voboCard.className = "p-4 rounded-xl border border-amber-300 bg-amber-50/90 shadow-sm space-y-2";
  }
}

// ==========================================
// EVALUACIÓN DE REGLAS ADUANERAS Y CHECKLIST
// ==========================================
function evaluarReglasAereas() {
  const regimen = document.getElementById('sel-regimen').value;
  const incoterm = document.getElementById('sel-incoterm').value;
  const awbType = document.querySelector('input[name="awb_type"]:checked')?.value || 'DIRECT';
  const fobUSD = parseFloat(document.getElementById('num-fob').value) || 0;
  const trasladaCamion = document.getElementById('chk-traslado-camion').checked;
  const seguroContratado = document.getElementById('chk-seguro-contratado').checked;

  const requiereAgente = fobUSD >= 3000;
  const requiereAWBValorada = ["CPT", "CIP", "DAP", "DPU", "DDP"].includes(incoterm);

  // 1. Actualización de Encabezado y Badges
  const badgeMandato = document.getElementById('badge-mandato');
  const statusTitle = document.getElementById('status-title');
  const regimenNames = {
    "DEF": "DUS EXPORTACIÓN DEFINITIVA AÉREA (COD. 10)",
    "TEMP_SALIDA": "SALIDA TEMPORAL DE MERCANCÍAS (COD. 20)",
    "TEMP_PERFECC": "SALIDA TEMPORAL P/ PERFECCIONAMIENTO (COD. 21)",
    "REEXP": "REEXPORTACIÓN DE MERCANCÍAS (COD. 30)",
    "RANCHO": "RANCHO DE NAVES / AERONAVES (COD. 40)"
  };

  if (statusTitle) statusTitle.textContent = regimenNames[regimen] || "DUS AÉREA CHILE";

  if (badgeMandato) {
    if (requiereAgente) {
      badgeMandato.textContent = "Agente Aduana Obligatorio (≥ USD 3.000)";
      badgeMandato.className = "text-[10px] font-bold px-2 py-0.5 rounded bg-red-600 text-white";
    } else {
      badgeMandato.textContent = "Tramitación Directa / Simplificada (< USD 3.000)";
      badgeMandato.className = "text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-600 text-white";
    }
  }

  // 2. Tarjetas Guía de Despacho, AWB y Seguro
  const resGdStatus = document.getElementById('res-gd-status');
  const resGdText = document.getElementById('res-gd-text');
  if (resGdStatus && resGdText) {
    if (trasladaCamion) {
      resGdStatus.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-500"></i> OBLIGATORIA`;
      resGdText.textContent = "Exigida para respaldar el tránsito terrestre hacia el aeropuerto.";
    } else {
      resGdStatus.innerHTML = `<i class="fa-solid fa-circle-minus text-slate-400"></i> NO REQUERIDA`;
      resGdText.textContent = "Ingreso directo sin traslado en camión.";
    }
  }

  const resAwbStatus = document.getElementById('res-awb-status');
  const resAwbText = document.getElementById('res-awb-text');
  if (resAwbStatus && resAwbText) {
    if (requiereAWBValorada) {
      resAwbStatus.innerHTML = `<i class="fa-solid fa-file-invoice-dollar text-aduana-600"></i> AWB VALORADA (FLETE)`;
      resAwbText.textContent = `Incoterm ${incoterm} exige desglose de flete contratado.`;
    } else {
      resAwbStatus.innerHTML = `<i class="fa-solid fa-file-lines text-slate-600"></i> AWB ESTÁNDAR`;
      resAwbText.textContent = `Incoterm ${incoterm} (Flete por cobrar o flete no incluido).`;
    }
  }

  const resSegStatus = document.getElementById('res-seg-status');
  const resSegText = document.getElementById('res-seg-text');
  if (resSegStatus && resSegText) {
    if (seguroContratado) {
      resSegStatus.innerHTML = `<i class="fa-solid fa-shield-check text-emerald-500"></i> PÓLIZA EFECTIVA`;
      resSegText.textContent = "Póliza real de seguro contratada en Chile.";
    } else {
      resSegStatus.innerHTML = `<i class="fa-solid fa-triangle-exclamation text-amber-500"></i> SEGURO TEÓRICO (2%)`;
      resSegText.textContent = "Se aplicará 2% sobre valor FOB por tabla aduanera.";
    }
  }

  // 3. Renderizado de Checklist Dinámica
  renderChecklist({
    fobUSD,
    requiereAgente,
    trasladaCamion,
    awbType,
    requiereAWBValorada,
    seguroContratado,
    currentTariff
  });

  // 4. Renderizado de Consideraciones Normativas SNA
  renderNormativeList(requiereAgente, trasladaCamion, incoterm);
}

function renderChecklist(opts) {
  const container = document.getElementById('checklist-container');
  if (!container) return;

  const docs = [
    {
      title: "Factura Comercial de Exportación (E-Factura)",
      req: "OBLIGATORIO",
      desc: "Emitida en dólares u otra divisa convertible. Respalda la venta internacional."
    },
    {
      title: opts.awbType === 'FORWARDER' ? "House Air Waybill (HAWB) + Master AWB" : "Master Air Waybill (MAWB) Directo",
      req: "OBLIGATORIO",
      desc: opts.requiereAWBValorada ? "Documento de transporte aéreo con desglose de flete contratado." : "Documento de transporte emisor por la aerolínea/agent."
    },
    {
      title: "Guía de Despacho (SII)",
      req: opts.trasladaCamion ? "OBLIGATORIO" : "OPCIONAL",
      desc: opts.trasladaCamion ? "Acredita el traslado de la carga desde origen hacia Depósito Franco / Aeropuerto." : "No requerida si no existe tramo terrestre."
    },
    {
      title: opts.currentTariff?.organismo ? `Visto Bueno / Certificado ${opts.currentTariff.organismo}` : "Certificado Sectorial / Visto Bueno",
      req: opts.currentTariff?.obligatorio ? "OBLIGATORIO" : "NO REQUERIDO",
      desc: opts.currentTariff?.vobo_nombre || "Mercancía sin requerimientos regulatorios especiales en origen."
    },
    {
      title: "Mandato Aduanero (Poder Especial)",
      req: opts.requiereAgente ? "OBLIGATORIO" : "NO REQUERIDO",
      desc: opts.requiereAgente ? "Exigible para operaciones de valor FOB igual o superior a USD 3.000." : "Tramitación simplificada por el propio exportador."
    },
    {
      title: "Póliza o Certificado de Seguro de Carga",
      req: opts.seguroContratado ? "OBLIGATORIO" : "APLICA TEÓRICO (2%)",
      desc: opts.seguroContratado ? "Respalda la cobertura efectiva del trayecto internacional." : "En ausencia de póliza, SNA calcula un 2% teórico sobre valor FOB."
    }
  ];

  container.innerHTML = docs.map(d => `
    <div class="p-3 flex items-start justify-between gap-3 hover:bg-slate-50 transition">
      <div class="space-y-0.5">
        <div class="font-bold text-slate-800 text-xs">${d.title}</div>
        <div class="text-[11px] text-slate-500 leading-tight">${d.desc}</div>
      </div>
      <span class="text-[9px] font-extrabold px-2 py-1 rounded shrink-0 ${
        d.req.includes('OBLIGATORIO') ? 'bg-amber-100 text-amber-900 border border-amber-300' :
        d.req.includes('NO REQUERIDO') ? 'bg-slate-100 text-slate-500' : 'bg-sky-100 text-sky-800'
      }">
        ${d.req}
      </span>
    </div>
  `).join('');
}

function renderNormativeList(requiereAgente, trasladaCamion, incoterm) {
  const normList = document.getElementById('normative-list');
  if (!normList) return;

  normList.innerHTML = `
    <li><strong>Legalización DUS (2° Mensaje):</strong> Plazo máximo de 25 días corridos contados desde la fecha de embarque (CNA Cap. IV).</li>
    <li><strong>Examen e Inspección:</strong> ${currentTariff?.obligatorio ? `Sujeto a control previo por ${currentTariff.organismo}.` : 'Sujeto a fiscalización aleatoria por Aduana de Salida.'}</li>
    <li><strong>Control Documental:</strong> Un valor FOB de USD ${document.getElementById('num-fob').value} ${requiereAgente ? 'exige la intervención de un Agente de Aduanas matriculado.' : 'permite tramitación simplificada.'}</li>
    <li><strong>Regla Incoterm ${incoterm}:</strong> Asegurar concordancia entre valores declarados en Factura, AWB y DUS Primer Mensaje.</li>
  `;
}

// ==========================================
// UTILIDADES (COPIAR AL PORTAPAPELES)
// ==========================================
function copyChecklistToClipboard() {
  const code = currentTariff?.code || 'S/C';
  const org = currentTariff?.organismo || 'GENERAL';
  const fob = document.getElementById('num-fob').value;
  const incoterm = document.getElementById('sel-incoterm').value;

  const textToCopy = `=== EXPEDIENTE DUS LEGALIZACIÓN AÉREA ===
Partida Arancelaria: ${code} (${org})
Valor FOB Estimado: USD ${fob}
Incoterm: ${incoterm}
Organismo Requisito: ${currentTariff?.vobo_nombre || 'Régimen General'}

-- DOCUMENTOS OBLIGATORIOS --
1. Factura Comercial de Exportación
2. Documento de Transporte (AWB)
3. Guía de Despacho (Si aplica traslado)
4. Vistos Buenos Sectoriales
5. Mandato Aduanero (Si FOB >= 3000 USD)`;

  navigator.clipboard.writeText(textToCopy).then(() => {
    const toast = document.getElementById('toast-msg');
    if (toast) {
      toast.classList.remove('hidden');
      setTimeout(() => toast.classList.add('hidden'), 3000);
    }
  });
}

// Cargar la base de datos al iniciar la página
document.addEventListener('DOMContentLoaded', () => {
  cargarBaseDatosArancel();
});
