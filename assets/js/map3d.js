/* Mapa 3D de distritos con MapLibre (mapa base) y deck.gl (extrusiones y columnas).
   Las clases de color se calculan desde los datos al cargar; nada está fijado a mano salvo los cortes de la brecha. */
(function () {
  "use strict";

  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  // Mismo formato que app.js: espacio fino de miles
  const fmt0 = { format: (v) => Math.round(v).toLocaleString("en-US").replace(/,/g, "\u202f") };

  // Rampas: secuencial de un solo tono (claro a oscuro) y divergente con punto medio gris
  const RAMP_GREEN = ["#dcebe1", "#a9d0b6", "#6fae88", "#368558", "#17583a"];
  const RAMP_BLUE = ["#dde7f2", "#a9c3e0", "#6f9bcc", "#3a6fae", "#1b467c"];
  const DIVERGING = ["#8e2f55", "#d08aa6", "#e0e3e1", "#93c4a6", "#1e7d50"];
  const NO_DATA = "#c9cfcc";

  function quantileBreaks(values, k) {
    const v = values.filter((x) => x != null && !Number.isNaN(x)).sort((a, b) => a - b);
    const out = [];
    for (let i = 1; i < k; i++) out.push(v[Math.floor((i * v.length) / k)]);
    return out;
  }
  function classify(v, breaks) {
    let i = 0;
    while (i < breaks.length && v >= breaks[i]) i++;
    return i;
  }

  // Definición de métricas de color: función de color + leyenda
  function buildColorMetrics(features) {
    const P = features.map((f) => f.properties);
    const accB = quantileBreaks(P.map((p) => p.acc), 5);
    const expoB = quantileBreaks(P.map((p) => p.expo), 5);
    const brechaB = [-1, -0.25, 0.25, 1];
    const rangeLabels = (b, f) => [`menos de ${f(b[0])}`, ...b.slice(0, -1).map((x, i) => `${f(x)} a ${f(b[i + 1])}`), `${f(b[b.length - 1])} o más`];

    const LISA = {
      "Alto-Alto": "#1e7d50", "Bajo-Bajo": "#b23a68", "Alto-Bajo": "#93c4a6", "Bajo-Alto": "#d99ab4", "No significativo": "#dfe3e1",
    };
    const QUAD = {
      "Prioridad: canal físico": "#1e7d50", "Prioridad: canal resiliente": "#b98010",
      "Bajo impacto, alto riesgo": "#2a6fb8", "Bajo impacto, bajo riesgo": "#a3aca8",
    };
    return {
      acc: {
        label: "Acceso",
        title: "Puntos de atención por 10 mil adultos (suavizado)",
        color: (p) => (p.acc == null ? NO_DATA : RAMP_GREEN[classify(p.acc, accB)]),
        legend: rangeLabels(accB, (v) => fmt0.format(v)).map((l, i) => ({ label: l, color: RAMP_GREEN[i] })),
        note: "Quintiles de los 327 distritos.",
      },
      brecha: {
        label: "Brecha",
        title: "Acceso observado frente al esperado (escala logarítmica)",
        color: (p) => (p.brecha == null ? NO_DATA : DIVERGING[classify(p.brecha, brechaB)]),
        legend: [
          { label: "Muy por debajo de lo esperado", color: DIVERGING[0] },
          { label: "Por debajo", color: DIVERGING[1] },
          { label: "Cerca de lo esperado", color: DIVERGING[2] },
          { label: "Por encima", color: DIVERGING[3] },
          { label: "Muy por encima", color: DIVERGING[4] },
        ],
        note: "Esperado según pobreza, urbanización, altitud y vecindad (notebook 08).",
      },
      lisa: {
        label: "Clusters",
        title: "Clusters locales de acceso (LISA, p < 0,05)",
        color: (p) => LISA[p.lisa] || NO_DATA,
        legend: Object.entries(LISA).map(([k, c]) => ({ label: k, color: c })),
        note: "Bajo-Bajo: desiertos financieros rodeados de distritos similares.",
      },
      expo: {
        label: "El Niño",
        title: "Índice de exposición a lluvia extrema (1998, 2017, 2023)",
        color: (p) => (p.expo == null ? NO_DATA : RAMP_BLUE[classify(p.expo, expoB)]),
        legend: ["Muy baja", "Baja", "Media", "Alta", "Muy alta"].map((l, i) => ({ label: l, color: RAMP_BLUE[i] })),
        note: "Quintiles del índice estimado por kriging (notebook 06).",
      },
      cuad: {
        label: "Prioridad",
        title: "Prioridad de los distritos desatendidos",
        color: (p) => (p.cuad ? QUAD[p.cuad] : "#eef0ee"),
        legend: [...Object.entries(QUAD).map(([k, c]) => ({ label: k, color: c })), { label: "Sin déficit", color: "#eef0ee" }],
        note: "Matriz oportunidad por riesgo (notebook 09).",
      },
    };
  }

  const HEIGHTS = {
    ad: { label: "Adultos", get: (p) => p.ad || 0 },
    ad_des: { label: "Adultos desatendidos", get: (p) => p.ad_des || 0 },
    none: { label: "Plano", get: () => 0 },
  };
  const MAX_ELEVATION_M = 55000; // altura visual del distrito más alto

  const state = { color: "acc", height: "ad", sites: true, selected: -1, hoverTip: null };
  let map, overlay, features, sites, colorMetrics, heightMax = {}, onSelect, container;

  const VIEW_3D = { center: [-79.0, -6.45], zoom: 6.85, pitch: 50, bearing: -16 };
  const VIEW_2D = { center: [-79.0, -6.4], zoom: 6.95, pitch: 0, bearing: 0 };

  // Mapa base: teselas raster CARTO; si no hay internet queda el fondo y las capas siguen funcionando
  const BASE_STYLE = {
    version: 8,
    sources: {
      carto: {
        type: "raster",
        tiles: ["a", "b", "c"].map((s) => `https://${s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}@2x.png`),
        tileSize: 256,
        attribution: "© OpenStreetMap, © CARTO",
      },
    },
    layers: [
      { id: "fondo", type: "background", paint: { "background-color": "#dfe5e2" } },
      { id: "carto", type: "raster", source: "carto", paint: { "raster-opacity": 0.85 } },
    ],
  };

  function departmentLabels() {
    const acc = {};
    features.forEach((f) => {
      const p = f.properties;
      const ring = f.geometry.type === "Polygon" ? f.geometry.coordinates[0] : f.geometry.coordinates[0][0];
      const c = ring.reduce((a, q) => [a[0] + q[0], a[1] + q[1]], [0, 0]).map((v) => v / ring.length);
      const w = p.pob || 1;
      acc[p.d] = acc[p.d] || { x: 0, y: 0, w: 0 };
      acc[p.d].x += c[0] * w; acc[p.d].y += c[1] * w; acc[p.d].w += w;
    });
    return Object.entries(acc).map(([name, a]) => ({ name, position: [a.x / a.w, a.y / a.w] }));
  }

  function layers() {
    const cm = colorMetrics[state.color];
    const hm = HEIGHTS[state.height];
    const hmax = heightMax[state.height] || 1;
    const out = [
      new deck.GeoJsonLayer({
        id: "distritos",
        data: features,
        extruded: state.height !== "none",
        wireframe: false,
        filled: true,
        stroked: state.height === "none",
        getLineColor: [255, 255, 255, 200],
        lineWidthMinPixels: 0.6,
        getFillColor: (f) => [...hex(cm.color(f.properties)), 235],
        getElevation: (f) => (hm.get(f.properties) / hmax) * MAX_ELEVATION_M,
        material: { ambient: 0.55, diffuse: 0.6, shininess: 24, specularColor: [40, 40, 40] },
        pickable: true,
        autoHighlight: state.selected < 0,
        highlightColor: [29, 43, 42, 110],
        highlightedObjectIndex: state.selected,
        transitions: { getElevation: { duration: 650 }, getFillColor: { duration: 350 } },
        updateTriggers: { getFillColor: state.color, getElevation: state.height },
        onHover: hoverDistrict,
        onClick: (info) => info.object && select(info.index, true),
      }),
    ];
    if (state.sites) {
      const smax = Math.max(...sites.map((s) => s.demanda_en_radio));
      out.push(
        new deck.ScatterplotLayer({
          id: "radios",
          data: sites,
          getPosition: (s) => [s.lon, s.lat],
          getRadius: 5000,
          stroked: true,
          filled: true,
          getFillColor: [185, 128, 16, 40],
          getLineColor: [185, 128, 16, 220],
          lineWidthMinPixels: 1.5,
        }),
        new deck.ColumnLayer({
          id: "sitios",
          data: sites,
          diskResolution: 24,
          radius: 3200,
          extruded: true,
          getPosition: (s) => [s.lon, s.lat],
          getElevation: (s) => 12000 + (s.demanda_en_radio / smax) * 48000,
          getFillColor: (s) => (s.se_mantiene_con_riesgo ? [185, 128, 16, 255] : [226, 194, 122, 255]),
          material: { ambient: 0.6, diffuse: 0.6 },
          pickable: true,
          onHover: hoverSite,
          onClick: (info) => info.object && window.App && window.App.selectSite(info.object),
        })
      );
    }
    out.push(
      new deck.TextLayer({
        id: "departamentos",
        data: departmentLabels(),
        getPosition: (d) => d.position,
        parameters: { depthCompare: "always", depthWriteEnabled: false }, // siempre visibles sobre las extrusiones
        getText: (d) => d.name,
        getSize: 15,
        fontFamily: "Archivo, system-ui, sans-serif",
        fontWeight: 700,
        getColor: [29, 43, 42, 255],
        outlineWidth: 4,
        outlineColor: [247, 248, 246, 230],
        fontSettings: { sdf: true },
        characterSet: "auto",
        billboard: true,
      })
    );
    return out;
  }

  function tipAt(info, html) {
    if (!info.object) { window.Charts.hideTip(); return; }
    const r = container.getBoundingClientRect();
    window.Charts.showTip({ clientX: r.left + info.x, clientY: r.top + info.y }, html);
  }
  function hoverDistrict(info) {
    if (!info.object) return tipAt(info);
    const p = info.object.properties;
    tipAt(info, `<b>${p.n}</b> (${p.p}, ${p.d})<br>${window.App.describeMetric(state.color, p)}`);
  }
  function hoverSite(info) {
    if (!info.object) return tipAt(info);
    const s = info.object;
    tipAt(info, `<b>${s.ccpp}</b><br>${s.distrito}, ${s.provincia}<br>Demanda en radio: ${fmt0.format(s.demanda_en_radio)} adultos<br>${s.se_mantiene_con_riesgo ? "Se mantiene con riesgo" : "Cambia al descontar el riesgo"}`);
  }

  function refresh() { if (overlay) overlay.setProps({ layers: layers() }); }

  function select(index, fromMap) {
    state.selected = index;
    refresh();
    if (onSelect) onSelect(index >= 0 ? features[index] : null, fromMap);
  }

  function init(opts) {
    features = opts.features;
    sites = opts.sites;
    onSelect = opts.onSelect;
    container = document.getElementById("map");
    colorMetrics = buildColorMetrics(features);
    Object.entries(HEIGHTS).forEach(([k, h]) => { heightMax[k] = Math.max(...features.map((f) => h.get(f.properties))); });

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    try {
      map = new maplibregl.Map({
        container, style: BASE_STYLE, ...VIEW_3D,
        maxPitch: 70, antialias: true, attributionControl: { compact: true },
        fadeDuration: reduce ? 0 : 300,
      });
      if (window.matchMedia("(min-width: 821px)").matches) map.setPadding({ left: 280, right: 40, top: 0, bottom: 0 });
      map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "bottom-right");
      overlay = new deck.MapboxOverlay({ interleaved: false, layers: layers() });
      map.addControl(overlay);
      map.getCanvas().setAttribute("tabindex", "0");
    } catch (err) {
      const fb = document.getElementById("map-fallback");
      fb.hidden = false;
      fb.textContent = "Este navegador no pudo iniciar WebGL, necesario para el mapa 3D. Los gráficos y tablas del póster siguen disponibles.";
      console.error(err);
    }
  }

  function flyTo(lon, lat, zoom) {
    if (!map) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    map[reduce ? "jumpTo" : "flyTo"]({ center: [lon, lat], zoom: zoom || 9.2, pitch: map.getPitch() || 45, essential: true, duration: 1600 });
  }

  window.Map3D = {
    init,
    get colorMetrics() { return colorMetrics; },
    HEIGHTS,
    setColor(k) { state.color = k; refresh(); },
    setHeight(k) { state.height = k; refresh(); },
    setSites(v) { state.sites = v; refresh(); },
    select,
    flyTo,
    view(mode) {
      if (!map) return;
      const v = mode === "2d" ? VIEW_2D : VIEW_3D;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      map[reduce ? "jumpTo" : "easeTo"]({ ...v, duration: 1200 });
    },
    get state() { return state; },
  };
})();
