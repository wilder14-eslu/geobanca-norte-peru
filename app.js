/**
 * GeoBanca Norte Perú — Módulo de Lógica Frontend y Visualización SIG
 * Autor: Wilder E. (esluw) | 2026
 * Licencia: MIT
 */

// =============================================================================
// 1. DATASETS Y ESTRUCTURAS DE DATOS
// =============================================================================

const SITIOS_MCLP = [
  { id: 1, ccpp: "SHAULLO GRANDE", tipo: "Rural", distrito: "LLACANORA", prov: "CAJAMARCA", dpto: "CAJAMARCA", lat: -7.17542, lon: -78.41833, demanda: 5061, riesgo: 0.38, cuadrante: "Prioridad: canal físico", robusto: true },
  { id: 2, ccpp: "CHUNGAYO", tipo: "Rural", distrito: "SANTO DOMINGO", prov: "MORROPON", dpto: "PIURA", lat: -5.05659, lon: -79.88882, demanda: 4170, riesgo: 0.93, cuadrante: "Prioridad: canal resiliente", robusto: true },
  { id: 3, ccpp: "FARO BAJO", tipo: "Rural", distrito: "SOROCHUCO", prov: "CELENDIN", dpto: "CAJAMARCA", lat: -6.92647, lon: -78.27613, demanda: 3447, riesgo: 0.53, cuadrante: "Prioridad: canal resiliente", robusto: true },
  { id: 4, ccpp: "QUINUAPATA", tipo: "Rural", distrito: "LOS BAÑOS DEL INCA", prov: "CAJAMARCA", dpto: "CAJAMARCA", lat: -7.10738, lon: -78.48607, demanda: 3077, riesgo: 0.51, cuadrante: "Prioridad: canal resiliente", robusto: true },
  { id: 5, ccpp: "LAS PALMERAS DE LA JOYITA", tipo: "Urbano", distrito: "PIMENTEL", prov: "CHICLAYO", dpto: "LAMBAYEQUE", lat: -6.80597, lon: -79.88288, demanda: 3041, riesgo: 0.26, cuadrante: "Prioridad: canal físico", robusto: true },
  { id: 6, ccpp: "SAN LORENZO", tipo: "Rural", distrito: "CHALACO", prov: "MORROPON", dpto: "PIURA", lat: -5.07043, lon: -79.79845, demanda: 2888, riesgo: 0.90, cuadrante: "Prioridad: canal resiliente", robusto: true },
  { id: 7, ccpp: "LA RINCONADA", tipo: "Rural", distrito: "MOLLEBAMBA", prov: "SANTIAGO DE CHUCO", dpto: "LA LIBERTAD", lat: -8.15783, lon: -77.97338, demanda: 2871, riesgo: 0.54, cuadrante: "Bajo impacto, alto riesgo", robusto: true },
  { id: 8, ccpp: "PUEBLO LIBRE", tipo: "Rural", distrito: "SAN JUAN", prov: "CAJAMARCA", dpto: "CAJAMARCA", lat: -7.28619, lon: -78.49857, demanda: 2858, riesgo: 0.43, cuadrante: "Prioridad: canal físico", robusto: true },
  { id: 9, ccpp: "SALALA", tipo: "Rural", distrito: "EL CARMEN DE LA FRONTERA", prov: "HUANCABAMBA", dpto: "PIURA", lat: -5.11041, lon: -79.46321, demanda: 2798, riesgo: 0.77, cuadrante: "Prioridad: canal resiliente", robusto: true },
  { id: 10, ccpp: "CHANCHAMAYO", tipo: "Rural", distrito: "SAYAPULLO", prov: "GRAN CHIMU", dpto: "LA LIBERTAD", lat: -7.57238, lon: -78.51278, demanda: 2589, riesgo: 0.46, cuadrante: "Prioridad: canal físico", robusto: true },
  { id: 11, ccpp: "LA PALMA", tipo: "Rural", distrito: "CAÑARIS", prov: "FERREÑAFE", dpto: "LAMBAYEQUE", lat: -6.02305, lon: -79.38477, demanda: 2532, riesgo: 0.43, cuadrante: "Prioridad: canal físico", robusto: true },
  { id: 12, ccpp: "RUMURO", tipo: "Rural", distrito: "USQUIL", prov: "OTUZCO", dpto: "LA LIBERTAD", lat: -7.85006, lon: -78.37551, demanda: 2524, riesgo: 0.79, cuadrante: "Prioridad: canal resiliente", robusto: true },
  { id: 13, ccpp: "RONDOCUSMA", tipo: "Rural", distrito: "JOSE GALVEZ", prov: "CELENDIN", dpto: "CAJAMARCA", lat: -6.92731, lon: -78.16905, demanda: 2466, riesgo: 0.38, cuadrante: "Bajo impacto, bajo riesgo", robusto: true },
  { id: 14, ccpp: "LA CORTADERA", tipo: "Rural", distrito: "GREGORIO PITA", prov: "SAN MARCOS", dpto: "CAJAMARCA", lat: -7.26239, lon: -78.16800, demanda: 2293, riesgo: 0.44, cuadrante: "Prioridad: canal físico", robusto: true },
  { id: 15, ccpp: "CANRRAMACA", tipo: "Rural", distrito: "SANAGORAN", prov: "SANCHEZ CARRION", dpto: "LA LIBERTAD", lat: -7.73056, lon: -78.12631, demanda: 2268, riesgo: 0.75, cuadrante: "Prioridad: canal resiliente", robusto: false },
  { id: 16, ccpp: "SHANCAYJO", tipo: "Rural", distrito: "INCAHUASI", prov: "FERREÑAFE", dpto: "LAMBAYEQUE", lat: -6.24915, lon: -79.35376, demanda: 2145, riesgo: 0.35, cuadrante: "Prioridad: canal físico", robusto: false },
  { id: 17, ccpp: "LOS SHIRAQUES", tipo: "Rural", distrito: "JOSE MANUEL QUIROZ", prov: "SAN MARCOS", dpto: "CAJAMARCA", lat: -7.33401, lon: -78.04986, demanda: 2124, riesgo: 0.46, cuadrante: "Prioridad: canal físico", robusto: true },
  { id: 18, ccpp: "CHONTAPACCHA", tipo: "Rural", distrito: "CHETILLA", prov: "CAJAMARCA", dpto: "CAJAMARCA", lat: -7.14119, lon: -78.67297, demanda: 2039, riesgo: 0.50, cuadrante: "Bajo impacto, alto riesgo", robusto: true },
  { id: 19, ccpp: "MONCHORUCO", tipo: "Rural", distrito: "EL CARMEN DE LA FRONTERA", prov: "HUANCABAMBA", dpto: "PIURA", lat: -4.96303, lon: -79.31240, demanda: 1865, riesgo: 0.77, cuadrante: "Prioridad: canal resiliente", robusto: false },
  { id: 20, ccpp: "LAGUNAS", tipo: "Rural", distrito: "CHONTALI", prov: "JAEN", dpto: "CAJAMARCA", lat: -5.70528, lon: -79.07762, demanda: 1856, riesgo: 0.73, cuadrante: "Prioridad: canal resiliente", robusto: false },
  { id: 21, ccpp: "LOS LOROS", tipo: "Rural", distrito: "SANAGORAN", prov: "SANCHEZ CARRION", dpto: "LA LIBERTAD", lat: -7.81639, lon: -78.20129, demanda: 1829, riesgo: 0.75, cuadrante: "Prioridad: canal resiliente", robusto: false },
  { id: 22, ccpp: "CRUZ BAJA (SANTISIMA CRUZ)", tipo: "Rural", distrito: "LALAQUIZ", prov: "HUANCABAMBA", dpto: "PIURA", lat: -5.17701, lon: -79.65527, demanda: 1778, riesgo: 0.65, cuadrante: "Prioridad: canal resiliente", robusto: false },
  { id: 23, ccpp: "SUNCHUPAMPA", tipo: "Rural", distrito: "ICHOCAN", prov: "SAN MARCOS", dpto: "CAJAMARCA", lat: -7.36383, lon: -78.13504, demanda: 1733, riesgo: 0.41, cuadrante: "Bajo impacto, bajo riesgo", robusto: true },
  { id: 24, ccpp: "PERLAMAYO TAMBILLO BAJO", tipo: "Rural", distrito: "CHUGUR", prov: "HUALGAYOC", dpto: "CAJAMARCA", lat: -6.66251, lon: -78.71856, demanda: 1698, riesgo: 0.86, cuadrante: "Bajo impacto, alto riesgo", robusto: false },
  { id: 25, ccpp: "ROSA SAURA", tipo: "Rural", distrito: "SINSICAP", prov: "OTUZCO", dpto: "LA LIBERTAD", lat: -7.86465, lon: -78.71306, demanda: 1693, riesgo: 0.31, cuadrante: "Prioridad: canal físico", robusto: true }
];

// Metadatos enriquecidos de las figuras analíticas para el visor HD
const METADATOS_FIGURAS = {
  "outputs/figuras/03_moran_global.png": {
    titulo: "Diagrama de Dispersión de Moran Global (W Reina 1)",
    categoria: "Fase 1 · Estadística Espacial (AEDE)",
    insight: "Autocorrelación espacial positiva robusta e indiscutible (I = 0.540, p < 0.001). Confirma que la infraestructura bancaria y corresponsal no se distribuye al azar, sino que presenta una intensa aglomeración regional.",
    desc: "Predominancia de distritos en los cuadrantes Q1 (Alto-Alto) en la franja costera y Q3 (Bajo-Bajo) en el macizo andino. La pendiente de la recta ajustada sintetiza el grado de inercia espacial en el territorio."
  },
  "outputs/figuras/03_lisa_acceso.png": {
    titulo: "Clusters Espaciales Locales LISA (Anselin)",
    categoria: "Fase 1 · Estadística Espacial (AEDE)",
    insight: "Dicotomía territorial crítica: Eje costero Trujillo–Chiclayo–Piura concentra clusters Alto-Alto (Hotspots), mientras la sierra de Cajamarca y Piura (Huancabamba y Ayabaca) forma trampas de exclusión Bajo-Bajo (Coldspots).",
    desc: "Mapa de significancia pseudo p < 0.05 bajo 999 permutaciones aleatorias condicionales. Delimita zonas de intervención prioritaria para subsidios de inclusión y expansión de red."
  },
  "outputs/figuras/04_coeficientes.png": {
    titulo: "Impactos Marginales: Directos, Indirectos y Totales (SDM)",
    categoria: "Fase 2 · Econometría Espacial",
    insight: "Efectos de desbordamiento (Spillovers): La urbanización vecina genera un derrame indirecto positivo (+0.28) que compensa parcialmente la pobreza local. La planificación bancaria debe ser interdistrital.",
    desc: "Descomposición de impactos marginales del Modelo Durbin Espacial (SDM). Evidencia que intervenciones financieras en capitales de provincia irradian efectos benéficos sobre su corona rural inmediata."
  },
  "outputs/figuras/04_residuos_ols_sem.png": {
    titulo: "Diagnóstico Residual: MCO frente a Modelos Espaciales",
    categoria: "Fase 2 · Econometría Espacial",
    insight: "El modelo Durbin Espacial (SDM) minimiza el AIC a 1648.0 (R² = 0.384) y elimina por completo la autocorrelación residual (I_res = 0.001, no significativo), garantizando una estimación sin sesgos.",
    desc: "Mínimos Cuadrados Ordinarios (MCO) viola el supuesto clásico de independencia de perturbaciones (Moran I = 0.214, p < 0.001). El SDM corrige la endogeneidad espacial y captura los efectos espaciales cruzados."
  },
  "outputs/figuras/06_semivariograma.png": {
    titulo: "Ajuste del Semivariograma Teórico Pluviométrico (WLS)",
    categoria: "Fase 3 · Geoestadística FEN",
    insight: "Rango de dependencia espacial pluviométrica de ~140 km. Los eventos El Niño presentan una fuerte continuidad regional que permite interpolar con alta fidelidad a partir de 175 estaciones meteorológicas.",
    desc: "Modelos Esférico y Exponencial ajustados por Mínimos Cuadrados Ponderados (WLS) sobre registros de lluvia extrema acumulada en eventos históricos de impacto catastrófico (1998, 2017 y 2023)."
  },
  "outputs/figuras/06_kriging_1998.png": {
    titulo: "Superficie de Predicción Óptima Kriging Ordinario (FEN 1998)",
    categoria: "Fase 3 · Geoestadística FEN",
    insight: "Kriging Ordinario supera ampliamente al IDW, reduciendo el error en un 23.4% (RMSE 72.5 mm vs 94.7 mm). Identifica el núcleo hipercrítico (>500 mm) en el bajo Piura, Morropón y la cuenca de Tumbes.",
    desc: "Estimador Lineal Insesgado de Mínima Varianza (BLUE). La superficie continua se integró como variable restrictiva de penalización en el modelo combinatorio para evitar el colapso operativo de nuevos canales."
  },
  "outputs/figuras/07_kernel_trujillo.png": {
    titulo: "Densidad Kernel 2D de Canales en Trujillo Metropolitano",
    categoria: "Fase 4 · Procesos Puntuales Espaciales",
    insight: "Hiperconcentración del 78% de cajeros y oficinas en un radio menor a 2 km del centro histórico de Trujillo, desabasteciendo distritos populosos periféricos como El Porvenir y La Esperanza.",
    desc: "Estimación bivariada de intensidad λ(s) para puntos de atención georreferenciados (OSM). Evidencia una excesiva redundancia en el casco histórico y amplias oportunidades de mercado en el cinturón residencial."
  },
  "outputs/figuras/07_k_inhomogenea.png": {
    titulo: "Función K Inhomogénea de Ripley con Bandas de Monte Carlo",
    categoria: "Fase 4 · Procesos Puntuales Espaciales",
    insight: "El estadístico de Clark-Evans (R = 0.41) y la función K inhomogénea demuestran atracción competitiva a distancias < 5 km, fundamentando técnicamente el radio de servicio de 5 km para el modelo MCLP.",
    desc: "La curva empírica supera significativamente las envolventes de simulación bajo Poisson No Homogéneo, demostrando que las entidades bancarias tienden a agruparse en clústeres de proximidad mutua."
  },
  "outputs/figuras/08_markov_espacial.png": {
    titulo: "Matrices de Transición de Cadenas de Markov Espaciales",
    categoria: "Fase 5 · ML Espacio-Temporal",
    insight: "Condicionamiento vecinal intertemporal: La probabilidad de ascenso a un cuartil superior de inclusión financiera se triplica si el distrito colinda con vecinos de alta infraestructura financiera.",
    desc: "Modelado de dinámica espacio-temporal basado en el panel distrital SBS (10 periodos, 2017–2026). Demuestra empíricamente el efecto arrastre de los polos de desarrollo territorial."
  },
  "outputs/figuras/08_shap_acceso_potencial.png": {
    titulo: "Importancia de Variables y Valores SHAP (Random Forest)",
    categoria: "Fase 5 · ML Espacio-Temporal",
    insight: "Random Forest con Spatial Block-CV (R² = 0.332). Las tres variables predictoras cardinales son la altitud de la capital, el nivel de pobreza monetaria y el retardo espacial vecinal (W × Pobreza).",
    desc: "Explicabilidad algorítmica mediante Shapley Additive Explanations (TreeExplainer). La validación por bloques espaciales garantiza predicciones realistas al neutralizar el sesgo por contigüidad geográfica."
  },
  "outputs/figuras/09_matriz_oportunidad_riesgo.png": {
    titulo: "Matriz Oportunidad vs. Riesgo Climático FEN",
    categoria: "Fase 6 · Optimización Territorial",
    insight: "Segmentación en 4 cuadrantes operativos: Permite diferenciar localidades aptas para inversión física (Cuadrante Verde: alta demanda, bajo riesgo) de aquellas que demandan canales digitales resilientes (Ámbar).",
    desc: "Cruza la brecha insatisfecha de adultos con el percentil de exposición a inundaciones. Guía las decisiones corporativas sobre qué tipología tecnológica desplegar en cada centro poblado."
  },
  "outputs/figuras/09_mclp_cobertura.png": {
    titulo: "Curva de Cobertura Poblacional Acumulada (MCLP Exacto P=25)",
    categoria: "Fase 6 · Optimización Territorial",
    insight: "Eficiencia matemática insuperable: Con solo P = 25 puntos se cubre al 27.42% (63,643 adultos) de la demanda no atendida en el norte, superando sistemáticamente a la solución voraz (greedy).",
    desc: "Resolución exacta de Programación Entera Mixta (MIP) mediante el solver COIN-OR CBC. Presenta la ley de rendimientos decrecientes y ubica geográficamente los nodos óptimos de cobertura."
  }
};

// =============================================================================
// 2. GESTIÓN DEL VISOR CARTOGRÁFICO INTERACTIVO (LEAFLET)
// =============================================================================

let map = null;
let layerDistritosBrecha = null;
let layerKrigingFEN = null;
let layerDensidadCNB = null;
let layerMCLP = null;
let mclpMarkersMap = {}; // Diccionario id -> L.Marker

// Paletas de colores
const COLOR_BRECHA = {
  deficitAlto: "#b91c1c",    // Brecha < -1.0 (Rojo oscuro)
  deficitMedio: "#f97316",   // Brecha -1.0 a -0.2 (Naranja)
  equilibrado: "#94a3b8",    // Brecha -0.2 a 0.2 (Gris)
  superavitMedio: "#38bdf8", // Brecha 0.2 a 1.0 (Celeste)
  superavitAlto: "#1d4ed8"   // Brecha > 1.0 (Azul marino)
};

function getColorBrecha(val) {
  if (val === null || val === undefined) return "#64748b";
  if (val < -0.8) return COLOR_BRECHA.deficitAlto;
  if (val < -0.2) return COLOR_BRECHA.deficitMedio;
  if (val <= 0.2) return COLOR_BRECHA.equilibrado;
  if (val <= 0.8) return COLOR_BRECHA.superavitMedio;
  return COLOR_BRECHA.superavitAlto;
}

function getColorKriging(mm) {
  if (mm === null || mm === undefined) return "#334155";
  if (mm > 450) return "#4338ca"; // Lluvia extrema severa (Añil oscuro)
  if (mm > 350) return "#0284c7"; // Lluvia muy alta (Azul brillante)
  if (mm > 250) return "#06b6d4"; // Lluvia alta (Cian)
  if (mm > 150) return "#10b981"; // Lluvia moderada (Verde esmeralda)
  return "#e2e8f0";               // Lluvia baja (Gris claro)
}

function getColorDensidad(cnb) {
  if (cnb > 500) return "#047857";
  if (cnb > 150) return "#10b981";
  if (cnb > 50) return "#34d399";
  if (cnb > 0) return "#a7f3d0";
  return "#e2e8f0";
}

function inicializarMapa() {
  const mapElement = document.getElementById('map-container');
  if (!mapElement) return;

  // Centro aproximado de la Macro Región Norte
  const centroNorte = [-6.65, -79.35];
  
  map = L.map('map-container', {
    center: centroNorte,
    zoom: 7,
    zoomControl: true,
    minZoom: 6,
    maxZoom: 16
  });

  // Capas base de teselas
  const baseCartoDark = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    subdomains: 'abcd',
    maxZoom: 19
  });

  const baseOSM = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19
  });

  baseCartoDark.addTo(map);

  // Inicializar grupos de capas
  layerDistritosBrecha = L.featureGroup();
  layerKrigingFEN = L.featureGroup();
  layerDensidadCNB = L.featureGroup();
  layerMCLP = L.featureGroup();

  // Si se dispone del GeoJSON compilado en window.GEOBANCA_DISTRITOS
  if (window.GEOBANCA_DISTRITOS) {
    cargarCapasDistritales(window.GEOBANCA_DISTRITOS);
  }

  // Cargar siempre los 25 sitios óptimos MCLP con sus radios de 5 km
  cargarSitiosMCLPEnMapa();

  // Activar capas por defecto
  layerDistritosBrecha.addTo(map);
  layerMCLP.addTo(map);

  // Ajustar vista inicial
  if (layerDistritosBrecha.getLayers().length > 0) {
    map.fitBounds(layerDistritosBrecha.getBounds(), { padding: [20, 20] });
  }

  actualizarLeyenda();
}

function cargarCapasDistritales(geojson) {
  // 1. Capa Brecha de Acceso
  L.geoJson(geojson, {
    style: function(f) {
      const b = f.properties.brecha;
      return {
        fillColor: getColorBrecha(b),
        weight: 0.8,
        opacity: 0.9,
        color: "#1e293b",
        fillOpacity: 0.72
      };
    },
    onEachFeature: function(f, layer) {
      const p = f.properties;
      const tooltipContent = `
        <div class="font-sans text-xs">
          <div class="font-bold text-slate-100">${p.distrito} (${p.provincia})</div>
          <div class="text-[10px] text-slate-400 font-mono">${p.departamento} · Población: ${p.pob_total_2025 ? p.pob_total_2025.toLocaleString() : 'N/D'} hab.</div>
          <div class="mt-1 pt-1 border-t border-slate-700 flex justify-between gap-3">
            <span>Brecha de acceso:</span>
            <strong class="font-mono ${p.brecha < 0 ? 'text-rose-400' : 'text-cyan-400'}">${p.brecha !== null ? p.brecha : 'N/D'}</strong>
          </div>
          <div class="flex justify-between gap-3 text-[10px] text-slate-300">
            <span>Puntos atención:</span>
            <strong class="font-mono text-emerald-400">${p.puntos_atencion || 0} (CNB: ${p.n_cnb || 0}, ATM: ${p.n_atm || 0})</strong>
          </div>
        </div>
      `;
      layer.bindTooltip(tooltipContent, { sticky: true, className: 'leaflet-tooltip-dark' });
      
      layer.on({
        mouseover: function(e) {
          const l = e.target;
          l.setStyle({ weight: 2.2, color: '#f8fafc', fillOpacity: 0.9 });
          if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) l.bringToFront();
        },
        mouseout: function(e) {
          layerDistritosBrecha.resetStyle(e.target);
        }
      });
    }
  }).addTo(layerDistritosBrecha);

  // 2. Capa Kriging Precipitación FEN
  L.geoJson(geojson, {
    style: function(f) {
      const mm = f.properties.pp_1998;
      return {
        fillColor: getColorKriging(mm),
        weight: 0.6,
        opacity: 0.8,
        color: "#0f172a",
        fillOpacity: 0.75
      };
    },
    onEachFeature: function(f, layer) {
      const p = f.properties;
      const tooltipContent = `
        <div class="font-sans text-xs">
          <div class="font-bold text-slate-100">${p.distrito}</div>
          <div class="text-[10px] text-sky-400 font-mono">Lluvia FEN 1998 (Kriging): ${p.pp_1998 ? p.pp_1998 + ' mm/mes' : 'N/D'}</div>
          <div class="text-[10px] text-slate-300 mt-1">Exposición FEN: <strong>${p.indice_exposicion ? Math.round(p.indice_exposicion * 100) + '%' : 'N/D'}</strong></div>
        </div>
      `;
      layer.bindTooltip(tooltipContent, { sticky: true });
    }
  }).addTo(layerKrigingFEN);

  // 3. Capa Densidad CNB y Cajeros
  L.geoJson(geojson, {
    style: function(f) {
      const cnb = f.properties.n_cnb || 0;
      return {
        fillColor: getColorDensidad(cnb),
        weight: 0.6,
        opacity: 0.8,
        color: "#0f172a",
        fillOpacity: 0.75
      };
    },
    onEachFeature: function(f, layer) {
      const p = f.properties;
      const tooltipContent = `
        <div class="font-sans text-xs">
          <div class="font-bold text-slate-100">${p.distrito}</div>
          <div class="text-[10px] text-emerald-400 font-mono">Total CNBs: ${p.n_cnb || 0} | ATMs: ${p.n_atm || 0}</div>
          <div class="text-[10px] text-slate-300 mt-1">Acceso Empírico de Bayes: <strong>${p.acceso_eb || 0} / 10k ad.</strong></div>
        </div>
      `;
      layer.bindTooltip(tooltipContent, { sticky: true });
    }
  }).addTo(layerDensidadCNB);
}

function cargarSitiosMCLPEnMapa() {
  mclpMarkersMap = {};
  layerMCLP.clearLayers();

  SITIOS_MCLP.forEach(site => {
    // 1. Círculo translúcido de radio de cobertura (5,000 metros)
    const radioCirculo = L.circle([site.lat, site.lon], {
      radius: 5000,
      color: site.robusto ? "#10b981" : "#f59e0b",
      fillColor: site.robusto ? "#10b981" : "#f59e0b",
      fillOpacity: 0.16,
      weight: 1.5,
      dashArray: site.robusto ? null : "4, 4"
    }).addTo(layerMCLP);

    // 2. Marcador personalizado tipo icono
    const iconHtml = `
      <div style="
        width: 28px;
        height: 28px;
        background: ${site.robusto ? '#065f46' : '#854d0e'};
        border: 2px solid ${site.robusto ? '#34d399' : '#fbbf24'};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ffffff;
        font-size: 11px;
        font-weight: 800;
        box-shadow: 0 4px 10px rgba(0,0,0,0.5);
        cursor: pointer;
        transition: transform 0.2s ease;
      ">
        <i class="fa-solid fa-star text-[11px] ${site.robusto ? 'text-emerald-300' : 'text-amber-300'}"></i>
      </div>
    `;

    const customIcon = L.divIcon({
      html: iconHtml,
      className: 'mclp-marker-icon',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -14]
    });

    const marker = L.marker([site.lat, site.lon], { icon: customIcon }).addTo(layerMCLP);
    mclpMarkersMap[site.id] = marker;

    // Ficha técnica completa en Popup
    const riesgoPct = Math.round(site.riesgo * 100);
    let badgeClass = "badge-riesgo-medio";
    let badgeTexto = "Medio (30-60%)";
    if (riesgoPct < 30) {
      badgeClass = "badge-riesgo-bajo";
      badgeTexto = "Bajo (<30%)";
    } else if (riesgoPct > 60) {
      badgeClass = "badge-riesgo-alto";
      badgeTexto = "Crítico (>60%)";
    }

    const popupHtml = `
      <div class="p-3 font-sans text-slate-100 max-w-[270px]">
        <div class="flex items-center justify-between pb-2 mb-2 border-b border-slate-700">
          <div class="flex items-center gap-1.5">
            <span class="w-5 h-5 rounded-full bg-emerald-900/80 text-emerald-300 flex items-center justify-center text-[10px] font-mono font-bold">
              ${site.id}
            </span>
            <span class="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400">Sitio MCLP P=25</span>
          </div>
          <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">${site.tipo}</span>
        </div>

        <h4 class="text-sm font-extrabold text-white leading-tight mb-1">${site.ccpp}</h4>
        <div class="text-xs text-slate-400 mb-3">${site.distrito}, ${site.prov} <span class="text-emerald-400 font-semibold font-mono">(${site.dpto})</span></div>

        <div class="space-y-1.5 text-xs bg-slate-900/90 rounded-lg p-2.5 border border-slate-800">
          <div class="flex justify-between items-center">
            <span class="text-slate-400">Demanda en 5 km:</span>
            <strong class="font-mono text-white text-xs">${site.demanda.toLocaleString()} adultos</strong>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-slate-400">Riesgo FEN:</span>
            <span class="inline-block px-2 py-0.5 rounded text-[10px] font-bold font-mono ${badgeClass}">
              ${riesgoPct}% · ${badgeTexto}
            </span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-slate-400">Canal sugerido:</span>
            <strong class="text-[11px] ${site.estrategia.includes('físico') ? 'text-emerald-400' : 'text-amber-400'}">${site.estrategia}</strong>
          </div>
          <div class="flex justify-between items-center pt-1 border-t border-slate-800 text-[10px]">
            <span class="text-slate-500">Robustez climática:</span>
            <span class="${site.robusto ? 'text-emerald-400' : 'text-amber-400'} font-semibold font-mono">
              ${site.robusto ? '✓ Mantiene con riesgo' : '⚠ Sensible al riesgo'}
            </span>
          </div>
        </div>

        <div class="mt-2.5 text-[10px] font-mono text-slate-500 flex justify-between">
          <span>Lat: ${site.lat.toFixed(5)}</span>
          <span>Lon: ${site.lon.toFixed(5)}</span>
        </div>
      </div>
    `;

    marker.bindPopup(popupHtml, { maxWidth: 300 });

    // Interacción Mapa -> Tabla (Al hacer clic en el marcador, resalta la fila)
    marker.on('click', () => {
      resaltarFilaEnTabla(site.id, false);
    });
  });
}

// =============================================================================
// 3. INTERACCIÓN BIDIRECCIONAL: TABLA MCLP <-> MAPA
// =============================================================================

function seleccionarSitioMCLP(siteId, volarAlSitio = true) {
  const site = SITIOS_MCLP.find(s => s.id === siteId);
  if (!site) return;

  // 1. Resaltar fila en la tabla
  resaltarFilaEnTabla(siteId, true);

  // 2. Operación cartográfica: map.flyTo([lat, lng], 14, { duration: 1.5 })
  if (volarAlSitio && map) {
    // Si la capa MCLP está apagada, encenderla automáticamente
    const chkMCLP = document.getElementById('chk-layer-mclp');
    if (chkMCLP && !chkMCLP.checked) {
      chkMCLP.checked = true;
      toggleCapa('mclp', true);
    }

    map.flyTo([site.lat, site.lon], 14, {
      duration: 1.5,
      easeLinearity: 0.25
    });

    // Abrir popup con la ficha técnica detallada después de aproximarse
    setTimeout(() => {
      const marker = mclpMarkersMap[site.id];
      if (marker) {
        marker.openPopup();
      }
    }, 700);

    // Si el usuario está lejos del visor en móvil, desplazar vista suavemente hacia el mapa
    const mapWrapper = document.getElementById('cartografia');
    if (mapWrapper && window.innerWidth < 768) {
      mapWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}

function resaltarFilaEnTabla(siteId, scrollTabla = false) {
  // Quitar clases previas
  document.querySelectorAll('#mclp-table-body tr').forEach(row => {
    row.classList.remove('mclp-row-active');
  });

  const fila = document.getElementById(`mclp-row-${siteId}`);
  if (fila) {
    fila.classList.add('mclp-row-active');
    if (scrollTabla) {
      fila.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }
}

// =============================================================================
// 4. CONTROL DE CAPAS Y LEYENDA DINÁMICA
// =============================================================================

function toggleCapa(capaId, forzarEstado = null) {
  if (!map) return;

  let layerGroup = null;
  let chk = null;

  if (capaId === 'brecha') {
    layerGroup = layerDistritosBrecha;
    chk = document.getElementById('chk-layer-brecha');
  } else if (capaId === 'kriging') {
    layerGroup = layerKrigingFEN;
    chk = document.getElementById('chk-layer-kriging');
  } else if (capaId === 'cnb') {
    layerGroup = layerDensidadCNB;
    chk = document.getElementById('chk-layer-cnb');
  } else if (capaId === 'mclp') {
    layerGroup = layerMCLP;
    chk = document.getElementById('chk-layer-mclp');
  }

  if (!layerGroup || !chk) return;

  const activar = forzarEstado !== null ? forzarEstado : chk.checked;
  chk.checked = activar;

  if (activar) {
    if (!map.hasLayer(layerGroup)) map.addLayer(layerGroup);
  } else {
    if (map.hasLayer(layerGroup)) map.removeLayer(layerGroup);
  }

  actualizarLeyenda();
}

function actualizarLeyenda() {
  const legendBrecha = document.getElementById('legend-section-brecha');
  const legendKriging = document.getElementById('legend-section-kriging');
  const legendCNB = document.getElementById('legend-section-cnb');
  const legendMCLP = document.getElementById('legend-section-mclp');

  const chkBrecha = document.getElementById('chk-layer-brecha');
  const chkKriging = document.getElementById('chk-layer-kriging');
  const chkCNB = document.getElementById('chk-layer-cnb');
  const chkMCLP = document.getElementById('chk-layer-mclp');

  if (legendBrecha && chkBrecha) legendBrecha.style.display = chkBrecha.checked ? 'block' : 'none';
  if (legendKriging && chkKriging) legendKriging.style.display = chkKriging.checked ? 'block' : 'none';
  if (legendCNB && chkCNB) legendCNB.style.display = chkCNB.checked ? 'block' : 'none';
  if (legendMCLP && chkMCLP) legendMCLP.style.display = chkMCLP.checked ? 'block' : 'none';
}

function toggleLeyendaRetractil() {
  const content = document.getElementById('legend-content');
  const icon = document.getElementById('legend-toggle-icon');
  if (!content) return;

  content.classList.toggle('collapsed');
  if (icon) {
    if (content.classList.contains('collapsed')) {
      icon.classList.remove('fa-chevron-down');
      icon.classList.add('fa-chevron-up');
    } else {
      icon.classList.remove('fa-chevron-up');
      icon.classList.add('fa-chevron-down');
    }
  }
}

function togglePantallaCompleta() {
  const elem = document.getElementById('map-wrapper');
  if (!elem) return;

  if (!document.fullscreenElement) {
    elem.requestFullscreen().then(() => {
      setTimeout(() => { if (map) map.invalidateSize(); }, 200);
    }).catch(err => {
      console.warn("Pantalla completa no disponible:", err);
    });
  } else {
    document.exitFullscreen().then(() => {
      setTimeout(() => { if (map) map.invalidateSize(); }, 200);
    });
  }
}

// =============================================================================
// 5. HERRAMIENTAS AVANZADAS DE LA TABLA (FILTROS Y EXPORTACIÓN)
// =============================================================================

function renderizarTablaMCLP(lista) {
  const tbody = document.getElementById('mclp-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (lista.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="py-8 text-center text-slate-400 font-sans">
          <i class="fa-solid fa-magnifying-glass text-lg mb-2 text-slate-500 block"></i>
          No se encontraron sitios con los criterios de búsqueda especificados.
        </td>
      </tr>
    `;
    return;
  }

  lista.forEach(item => {
    const tr = document.createElement('tr');
    tr.id = `mclp-row-${item.id}`;
    tr.className = "hover:bg-slate-900/90 transition-colors cursor-pointer group";
    
    // Al hacer clic en la fila se activa el flyTo hacia el mapa
    tr.onclick = () => seleccionarSitioMCLP(item.id, true);

    const riesgoPct = Math.round(item.riesgo * 100);
    let badgeHtml = '';

    if (riesgoPct < 30) {
      badgeHtml = `
        <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono badge-riesgo-bajo">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>${riesgoPct}% (Bajo)
        </span>
      `;
    } else if (riesgoPct <= 60) {
      badgeHtml = `
        <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono badge-riesgo-medio">
          <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>${riesgoPct}% (Medio)
        </span>
      `;
    } else {
      badgeHtml = `
        <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono badge-riesgo-alto">
          <span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span>${riesgoPct}% (Crítico)
        </span>
      `;
    }

    const estrategiaColor = item.cuadrante.includes('físico') ? 'text-emerald-300 bg-emerald-950/60 border-emerald-800/80' : 
                           (item.cuadrante.includes('resiliente') ? 'text-amber-300 bg-amber-950/60 border-amber-800/80' : 'text-slate-300 bg-slate-800/60 border-slate-700');

    tr.innerHTML = `
      <td class="py-3 px-3 table-sticky-col font-mono text-slate-400 text-center font-bold">
        ${item.id}
      </td>
      <td class="py-3 px-3 font-bold text-white group-hover:text-emerald-400 transition-colors">
        <div class="flex items-center gap-2">
          <span>${item.ccpp}</span>
          <span class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">${item.tipo}</span>
        </div>
      </td>
      <td class="py-3 px-3 text-slate-300">
        ${item.distrito} <span class="text-slate-500 font-mono text-[10px]">(${item.prov})</span>
      </td>
      <td class="py-3 px-3 font-semibold text-emerald-400 font-mono text-xs">
        ${item.dpto}
      </td>
      <td class="py-3 px-3 text-right font-mono font-bold text-white">
        ${item.demanda.toLocaleString()} <span class="text-[10px] font-normal text-slate-400">hab.</span>
      </td>
      <td class="py-3 px-3 text-center">
        ${badgeHtml}
      </td>
      <td class="py-3 px-3">
        <span class="inline-block px-2.5 py-1 rounded-md text-[10px] font-semibold border ${estrategiaColor}">
          ${item.cuadrante}
        </span>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function filtrarTablaMCLP() {
  const depto = document.getElementById('filtro-depto').value;
  const texto = (document.getElementById('filtro-busqueda').value || '').trim().toLowerCase();

  const filtrados = SITIOS_MCLP.filter(s => {
    const matchDepto = (depto === "TODOS" || s.dpto === depto);
    const matchTexto = !texto || (
      s.ccpp.toLowerCase().includes(texto) ||
      s.distrito.toLowerCase().includes(texto) ||
      s.prov.toLowerCase().includes(texto)
    );
    return matchDepto && matchTexto;
  });

  renderizarTablaMCLP(filtrados);
}

// Descarga en vivo de CSV
function exportarCSV() {
  const headers = ["id", "ccpp", "tipo", "distrito", "provincia", "departamento", "latitud", "longitud", "demanda_en_radio", "riesgo_fen_pct", "cuadrante_estrategico", "robusto_al_riesgo"];
  const rows = SITIOS_MCLP.map(s => [
    s.id,
    `"${s.ccpp.replace(/"/g, '""')}"`,
    s.tipo,
    `"${s.distrito}"`,
    `"${s.prov}"`,
    s.dpto,
    s.lat,
    s.lon,
    s.demanda,
    s.riesgo,
    `"${s.cuadrante}"`,
    s.robusto
  ]);

  const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "sitios_optimos_mclp_p25.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Descarga en vivo de GeoJSON FeatureCollection
function exportarGeoJSON() {
  const geojson = {
    type: "FeatureCollection",
    name: "sitios_optimos_mclp_p25",
    crs: {
      type: "name",
      properties: { name: "urn:ogc:def:crs:OGC:1.3:CRS84" }
    },
    features: SITIOS_MCLP.map(s => ({
      type: "Feature",
      id: s.id,
      properties: {
        id: s.id,
        ccpp: s.ccpp,
        tipo: s.tipo,
        distrito: s.distrito,
        provincia: s.prov,
        departamento: s.dpto,
        demanda_en_radio: s.demanda,
        riesgo_fen_pct: s.riesgo,
        cuadrante: s.cuadrante,
        robusto_al_riesgo: s.robusto
      },
      geometry: {
        type: "Point",
        coordinates: [s.lon, s.lat]
      }
    }))
  };

  const jsonString = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(geojson, null, 2));
  const link = document.createElement("a");
  link.setAttribute("href", jsonString);
  link.setAttribute("download", "sitios_optimos_mclp_p25.geojson");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// =============================================================================
// 6. MODAL ANALÍTICO HD CON ZOOM Y ARRASTRE (PAN & ZOOM) E INSIGHTS CLAVE
// =============================================================================

let currentZoom = 1;
let isPanning = false;
let startX = 0, startY = 0;
let translateX = 0, translateY = 0;

function openModal(src, titleOverride, descOverride) {
  const modal = document.getElementById('image-modal');
  const modalImg = document.getElementById('modal-img');
  const modalTitle = document.getElementById('modal-title');
  const modalDesc = document.getElementById('modal-desc');
  const modalInsight = document.getElementById('modal-insight-text');
  const modalCategoria = document.getElementById('modal-category');

  if (!modal || !modalImg) return;

  // Extraer ruta relativa limpia
  let cleanSrc = src;
  if (src.includes('outputs/figuras/')) {
    cleanSrc = 'outputs/figuras/' + src.split('outputs/figuras/')[1];
  }

  const meta = METADATOS_FIGURAS[cleanSrc] || {
    titulo: titleOverride || "Visualización Analítica",
    categoria: "Resultados Metodológicos",
    insight: descOverride || "Gráfico analítico resultante del flujo de modelado espacial.",
    desc: descOverride || ""
  };

  modalImg.src = src;
  if (modalTitle) modalTitle.textContent = meta.titulo;
  if (modalCategoria) modalCategoria.textContent = meta.categoria;
  if (modalDesc) modalDesc.textContent = meta.desc;
  if (modalInsight) modalInsight.textContent = meta.insight;

  // Reset de transformaciones
  resetZoom();

  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  // Configurar eventos de arrastre y rueda
  setupPanAndZoomEvents();
}

function closeModal() {
  const modal = document.getElementById('image-modal');
  if (modal) modal.classList.add('hidden');
  document.body.style.overflow = 'auto';
  resetZoom();
}

function updateImageTransform() {
  const modalImg = document.getElementById('modal-img');
  if (modalImg) {
    modalImg.style.transform = `translate(${translateX}px, ${translateY}px) scale(${currentZoom})`;
  }
  const zoomDisplay = document.getElementById('zoom-percentage');
  if (zoomDisplay) {
    zoomDisplay.textContent = Math.round(currentZoom * 100) + '%';
  }
}

function zoomIn() {
  currentZoom = Math.min(currentZoom + 0.35, 4.0);
  updateImageTransform();
}

function zoomOut() {
  currentZoom = Math.max(currentZoom - 0.35, 0.7);
  updateImageTransform();
}

function resetZoom() {
  currentZoom = 1;
  translateX = 0;
  translateY = 0;
  updateImageTransform();
}

function setupPanAndZoomEvents() {
  const viewport = document.getElementById('modal-viewport');
  if (!viewport || viewport.dataset.initialized) return;

  viewport.dataset.initialized = "true";

  // Rueda de ratón (Wheel zoom)
  viewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.2 : 0.82;
    currentZoom = Math.min(Math.max(currentZoom * zoomFactor, 0.7), 4.5);
    updateImageTransform();
  }, { passive: false });

  // Arrastre con ratón (Mouse Drag / Pan)
  viewport.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    isPanning = true;
    startX = e.clientX - translateX;
    startY = e.clientY - translateY;
    viewport.classList.add('dragging');
  });

  window.addEventListener('mousemove', (e) => {
    if (!isPanning) return;
    translateX = e.clientX - startX;
    translateY = e.clientY - startY;
    updateImageTransform();
  });

  window.addEventListener('mouseup', () => {
    isPanning = false;
    viewport.classList.remove('dragging');
  });

  // Gestos táctiles básicos para móvil
  let touchStartX = 0, touchStartY = 0;
  viewport.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      isPanning = true;
      touchStartX = e.touches[0].clientX - translateX;
      touchStartY = e.touches[0].clientY - translateY;
    }
  }, { passive: true });

  viewport.addEventListener('touchmove', (e) => {
    if (isPanning && e.touches.length === 1) {
      translateX = e.touches[0].clientX - touchStartX;
      translateY = e.touches[0].clientY - touchStartY;
      updateImageTransform();
    }
  }, { passive: true });

  viewport.addEventListener('touchend', () => {
    isPanning = false;
  });
}

// =============================================================================
// 7. INICIALIZACIÓN GLOBAL Y LISTENERS
// =============================================================================

window.addEventListener('scroll', () => {
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
  const progressBar = document.getElementById('reading-progress');
  if (progressBar) progressBar.style.width = progress + '%';
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
  if (e.key === '+' || e.key === '=') zoomIn();
  if (e.key === '-' || e.key === '_') zoomOut();
  if (e.key === '0') resetZoom();
});

document.addEventListener('DOMContentLoaded', () => {
  // 1. Inicializar tabla con los 25 sitios
  renderizarTablaMCLP(SITIOS_MCLP);

  // 2. Inicializar mapa interactivo nativo Leaflet
  inicializarMapa();
});
