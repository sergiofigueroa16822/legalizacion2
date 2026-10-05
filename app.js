// ==========================================
// BUSCADOR Y AUTOCOMPLETADO DE ARANCEL (CORREGIDO)
// ==========================================
window.filterTariffCodes = function () {
  const input = document.getElementById('hs-search-input');
  const dropdown = document.getElementById('hs-dropdown');

  if (!input || !dropdown) return;

  // Sanitizar el texto ingresado
  const query = input.value.trim().toLowerCase();
  const queryLimpia = query.replace(/[^0-9a-z]/gi, ''); // Remueve puntos, espacios y guiones

  if (query.length < 2) {
    dropdown.classList.add('hidden');
    dropdown.innerHTML = '';
    return;
  }

  if (!Array.isArray(arancelData) || arancelData.length === 0) {
    dropdown.innerHTML = `<div class="p-3 text-xs text-amber-600 bg-amber-50 italic">Cargando base de datos o sin registros...</div>`;
    dropdown.classList.remove('hidden');
    return;
  }

  // Filtrado robusto (soporta formatos con o sin puntos, números y texto)
  const resultados = arancelData.filter(item => {
    if (!item) return false;

    // Convertir a string seguro
    const codigoStr = String(item.codigo || '').toLowerCase();
    const codigoLimpio = codigoStr.replace(/[^0-9a-z]/gi, '');
    const glosaStr = String(item.glosa || '').toLowerCase();

    const coincideCodigo = queryLimpia.length > 0 && codigoLimpio.includes(queryLimpia);
    const coincideGlosa = glosaStr.includes(query);

    return coincideCodigo || coincideGlosa;
  }).slice(0, 15); // Mostrar máx. 15 resultados

  if (resultados.length === 0) {
    dropdown.innerHTML = `<div class="p-3 text-xs text-slate-500 italic">No se encontraron partidas para "${query}"</div>`;
    dropdown.classList.remove('hidden');
    return;
  }

  // Renderizado dinámico de la lista desplegable
  dropdown.innerHTML = resultados.map(item => {
    const cod = String(item.codigo || '');
    const glosa = String(item.glosa || '');
    const org = String(item.organismo || 'GENERAL').toUpperCase();

    return `
      <div class="hs-item-option p-2.5 hover:bg-slate-100 cursor-pointer text-xs flex justify-between items-center transition border-b border-slate-100 last:border-b-0"
           onclick="seleccionarPartida('${cod}')">
        <div>
          <span class="font-mono font-bold text-aduana-700 mr-2">${cod}</span>
          <span class="text-slate-700">${glosa}</span>
        </div>
        <span class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">${org}</span>
      </div>
    `;
  }).join('');

  dropdown.classList.remove('hidden');
};

window.seleccionarPartida = function (codigo) {
  if (!arancelData || arancelData.length === 0) return;

  // Búsqueda flexible por código
  const item = arancelData.find(a => String(a.codigo || '').trim() === String(codigo).trim());
  if (!item) return;

  partidaSeleccionada = item;

  // Actualizar campos en el HTML
  const inputSearch = document.getElementById('hs-search-input');
  if (inputSearch) inputSearch.value = `${item.codigo} - ${item.glosa}`;

  const dropdown = document.getElementById('hs-dropdown');
  if (dropdown) dropdown.classList.add('hidden');

  document.getElementById('tariff-code-display').textContent = item.codigo || '--.--.--.--';
  document.getElementById('tariff-glosa-display').textContent = item.glosa || '';

  const badgeOrg = document.getElementById('tariff-organismo-badge');
  if (badgeOrg) badgeOrg.textContent = (item.organismo || 'GENERAL').toUpperCase();

  const descVobo = document.getElementById('tariff-vobo-desc');
  if (descVobo) {
    descVobo.textContent = item.vobo_descripcion || item.vobo || 'Sin requerimientos especiales de visto bueno previo para exportación.';
  }

  // Reevaluar las reglas aduaneras
  evaluarReglasAereas();
};
