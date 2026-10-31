/* Controlador del póster: enlaza las cifras, el mapa 3D, los gráficos y las tablas.
   Todos los valores salen de window.GEOBANCA (generado por src/02_exportar_web.py). */
(function () {
  "use strict";

  const D = window.GEOBANCA;
  if (!D) {
    document.body.insertAdjacentHTML("afterbegin", '<p style="padding:16px">No se encontró assets/data/geobanca_web.js. Ejecuta: python src/02_exportar_web.py</p>');
    return;
  }

  // ---- Formato numérico: coma decimal y espacio fino de miles, como en los notebooks ----
  function fmt(v, d) {
    if (v == null || Number.isNaN(v)) return "s. d.";
    const s = Number(v).toLocaleString("en-US", { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
    return s.replace(/,/g, " ").replace(".", ",");
  }
  const pct = (v, d) => fmt(v, d == null ? 1 : d) + "%";

  const COLORS = { green: "#1e7d50", ochre: "#b98010", blue: "#2a6fb8", magenta: "#b23a68", violet: "#6a55c2" };
  // Orden categórico fijo de departamentos (validado para daltonismo y contraste)
  const DEP_COLORS = { Cajamarca: "#1e7d50", "La Libertad": "#b98010", Lambayeque: "#2a6fb8", Piura: "#b23a68", Tumbes: "#6a55c2" };

  const K = D.kpi;
  const features = D.distritos.features;
  const props = features.map((f) => f.properties);
  const desat = props.filter((p) => p.des);

  // ---- Cifras derivadas ----
  const lisaCount = (c) => props.filter((p) => p.lisa === c).length;
  const panel = D.panel;
  const panelMax = panel.reduce((a, b) => (b.canales > a.canales ? b : a));
  const panel2025 = panel.find((p) => p.corte === "di2025") || panel[panel.length - 1];
  const models = D.modelos.filter((m) => m["método"] === "MCO" || m["método"] === "ML");
  const ols = models.find((m) => m.modelo === "OLS");
  const sdm = models.find((m) => m.modelo === "SDM");
  const mclpBy = (P) => D.mclp.find((m) => m.P === P);
  const topUrban = props.filter((p) => p.falt_urb > 0).sort((a, b) => b.falt_urb - a.falt_urb);
  const top7Share = (100 * topUrban.slice(0, 7).reduce((a, p) => a + p.falt_urb, 0)) / K.canales_faltantes;
  const r2Key = Object.keys(D.ml_cv[0]).find((k) => k.startsWith("R²"));
  const mlBest = D.ml_cv.reduce((a, b) => (b[r2Key] > a[r2Key] ? b : a));
  const cambioProm = D.ml_cambio.find((r) => r.prueba === "Promedio");

  const BIND = {
    distritos: fmt(K.distritos),
    adultos: fmt(K.adultos),
    puntos_atencion: fmt(K.puntos_atencion),
    moran: fmt(D.estadisticos.moran_acceso.I, 3),
    moran_p: fmt(D.estadisticos.moran_acceso.p_sim, 3),
    lisa_ll: fmt(lisaCount("Bajo-Bajo")),
    lisa_hh: fmt(lisaCount("Alto-Alto")),
    sdm_aic: fmt(sdm["AIC"], 1),
    ols_moran: fmt(ols["I de Moran residuos"], 3),
    distritos_desatendidos: fmt(K.distritos_desatendidos),
    adultos_desatendidos: fmt(K.adultos_desatendidos),
    canales_faltantes: fmt(K.canales_faltantes),
    canales_urbanos_faltantes: fmt(K.canales_urbanos_faltantes),
    // Demanda del MCLP (adultos rurales desatendidos en distritos con caseríos georreferenciados), como en el notebook 09
    adultos_rurales_desatendidos: fmt(mclpBy(25).adultos_cubiertos / (mclpBy(25)["cobertura_exacta_%"] / 100)),
    top7_share: pct(top7Share, 0),
    mclp25: pct(mclpBy(25)["cobertura_exacta_%"]),
    mclp50: pct(mclpBy(50)["cobertura_exacta_%"]),
    puntos_x10k_adultos: fmt(K.puntos_x10k_adultos, 1),
    mediana_distrital_x10k: fmt(K.mediana_distrital_x10k, 0),
    sin_cajero: fmt(K.sin_cajero),
    sin_oficina: fmt(K.sin_oficina),
    sin_punto_atencion: fmt(K.sin_punto_atencion),
    panel_first: fmt(panel[0].canales),
    panel_first_label: panel[0].etiqueta.replace("Dic", "diciembre de"),
    panel_max: fmt(panelMax.canales),
    panel_max_label: panelMax.etiqueta.replace("Dic", "diciembre de"),
    panel_2025: fmt(panel2025.canales),
    ml_best_r2: fmt(mlBest[r2Key], 2),
    persist_rmse: fmt(cambioProm["Persistencia RMSE"], 3),
    rf_rmse: fmt(cambioProm["Random Forest RMSE"], 3),
    generado: D.generado.split("-").reverse().join("/"),
  };
  document.querySelectorAll("[data-k]").forEach((n) => {
    const v = BIND[n.dataset.k];
    if (v != null) n.textContent = v;
  });

  // ---- Tabla 1: unidades de análisis ----
  const units = [
    ["Distritos", fmt(K.distritos)],
    ["Población 2025", fmt(K.poblacion)],
    ["Adultos (18 años o más)", fmt(K.adultos)],
    ["Cajeros automáticos", fmt(K.atm)],
    ["Agentes corresponsales", fmt(K.corresponsales)],
    ["Oficinas", fmt(K.oficinas)],
    ["Cortes SBS en el panel", fmt(panel.length)],
  ];
  document.getElementById("table-units").innerHTML = units.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join("");

  // ---- Tabla 2: modelos ----
  (function modelsTable() {
    const t = document.getElementById("table-models");
    const bestAic = Math.min(...models.map((m) => m.AIC));
    const spatial = (m) => (m["rho (rezago de y)"] != null ? `ρ ${fmt(m["rho (rezago de y)"], 3)}` : m["lambda (error espacial)"] != null ? `λ ${fmt(m["lambda (error espacial)"], 3)}` : "–");
    const coef = (s) => (typeof s === "string" ? s.replace(".", ",") : fmt(s, 3));
    t.insertAdjacentHTML("beforeend", `<thead><tr>
      <th scope="col">Modelo</th><th scope="col">Pobreza</th><th scope="col">Urbana</th>
      <th scope="col">Altitud</th><th scope="col">AIC</th><th scope="col">Pseudo R²</th>
      <th scope="col">I res.</th><th scope="col">ρ / λ</th></tr></thead>`);
    t.insertAdjacentHTML("beforeend", "<tbody>" + models.map((m) => `<tr class="${m.AIC === bestAic ? "is-best" : ""}">
      <td>${m.modelo}</td><td>${coef(m["Pobreza 2018 (%)"])}</td><td>${coef(m["Población urbana (%)"])}</td>
      <td>${coef(m["Altitud (km)"])}</td><td>${fmt(m.AIC, 1)}</td><td>${fmt(m["pseudo R²"], 3)}</td>
      <td>${fmt(m["I de Moran residuos"], 3)}</td><td>${spatial(m)}</td></tr>`).join("") + "</tbody>");
  })();

  // ---- Gráficos ----
  Charts.register(() => {
    const dep = Object.entries(K.mediana_acceso_eb_departamento).sort((a, b) => b[1] - a[1]);
    Charts.barsH(document.getElementById("chart-dep"), dep.map(([n, v]) => ({
      label: n, value: v, color: DEP_COLORS[n],
      tip: `<b>${n}</b><br>Mediana: ${fmt(v, 1)} puntos por 10 mil adultos`,
    })), { labelW: 96, format: (v) => fmt(v, 0) });
  });

  Charts.register(() => {
    const deps = Object.keys(DEP_COLORS);
    Charts.lines(document.getElementById("chart-panel"), {
      labels: panel.map((p) => p.etiqueta.replace("Dic ", "").replace("Mar 2026", "Mar 26")),
      series: deps.map((d) => ({ name: d, color: DEP_COLORS[d], values: panel.map((p) => p.por_departamento[d] || 0) })),
      format: (v) => fmt(v),
    });
  });

  Charts.register(() => {
    const ev = [...new Set(D.interpolacion.map((r) => r.evento))];
    const methods = [["IDW", "IDW", COLORS.magenta], ["KO", "Kriging ordinario", COLORS.green], ["KDE", "Kriging con deriva (altitud)", COLORS.blue]];
    Charts.dotRows(document.getElementById("chart-krig"), {
      groups: ev.map((e) => "Marzo " + e.slice(0, 4)),
      series: methods.map(([k, name, color]) => ({ name, color, values: ev.map((e) => D.interpolacion.find((r) => r.evento === e && r.metodo === k).RMSE_LOO_mm) })),
      format: (v) => fmt(v, 0) + " mm", min: 50, max: 150, labelW: 96,
    });
  });

  (function expoList() {
    const top = props.filter((p) => p.expo != null).sort((a, b) => b.expo - a.expo).slice(0, 8);
    document.getElementById("list-expo").innerHTML = top.map((p) =>
      `<li>${p.n} <span class="rank-val">(${p.d}, índice ${fmt(p.expo, 2)})</span></li>`).join("");
  })();

  Charts.register(() => {
    Charts.barsH(document.getElementById("chart-urban"), topUrban.slice(0, 10).map((p) => ({
      label: p.n, value: p.falt_urb, color: COLORS.magenta,
      tip: `<b>${p.n}</b> (${p.p})<br>Canales urbanos faltantes: ${fmt(p.falt_urb)}<br>Acceso observado: ${fmt(p.obs, 0)} frente a ${fmt(p.esp, 0)} esperado por 10 mil adultos<br>Riesgo climático: percentil ${fmt(100 * p.rpct, 0)}`,
    })), { labelW: 150, format: (v) => fmt(v) });
  });

  Charts.register(() => {
    Charts.barsH(document.getElementById("chart-mclp"), D.mclp.map((m) => ({
      label: `${m.P} canales`, value: m["cobertura_exacta_%"], marker: m["cobertura_voraz_%"], color: COLORS.green,
      tip: `<b>${m.P} canales nuevos</b><br>Exacto (CBC): ${pct(m["cobertura_exacta_%"])}<br>Voraz: ${pct(m["cobertura_voraz_%"])}<br>${fmt(m.adultos_cubiertos)} adultos cubiertos`,
    })), { labelW: 90, max: 50, format: (v) => pct(v), tickFormat: (t) => t + "%" });
    const box = document.getElementById("chart-mclp");
    Charts.legend(box, [{ name: "Solución exacta", color: COLORS.green }, { name: "Heurística voraz (línea)", color: "#1d2b2a" }]);
  });

  Charts.register(() => {
    const sets = [...new Set(D.ml_cv.map((r) => r.variables))];
    const mods = [["Ridge", COLORS.blue], ["Random Forest", COLORS.green], ["XGBoost", COLORS.ochre]];
    const niceSet = { "estructurales (X)": "Variables propias", "X + rezagos espaciales (WX)": "+ rezagos WX", "X + WX + coordenadas": "+ WX y posición" };
    Charts.dotRows(document.getElementById("chart-ml"), {
      groups: sets.map((s) => niceSet[s] || s),
      series: mods.map(([m, c]) => ({ name: m, color: c, values: sets.map((s) => D.ml_cv.find((r) => r.modelo === m && r.variables === s)[r2Key]) })),
      format: (v) => fmt(v, 2), min: 0, max: 0.4, labelW: 128,
    });
  });

  const QUAD_COLORS = Map3D_colors();
  function Map3D_colors() {
    return { "Prioridad: canal físico": COLORS.green, "Prioridad: canal resiliente": COLORS.ochre, "Bajo impacto, alto riesgo": COLORS.blue, "Bajo impacto, bajo riesgo": "#a3aca8" };
  }
  Charts.register(() => {
    const box = document.getElementById("chart-matrix");
    const med = (arr) => { const s = arr.slice().sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
    const maxAd = Math.max(...desat.map((p) => p.ad_des));
    Charts.scatter(box, {
      xLabel: "Oportunidad (percentil de adultos desatendidos)",
      yLabel: "Riesgo (percentil de exposición)",
      vx: med(desat.map((p) => p.opct)), vy: med(desat.map((p) => p.rpct)),
      points: desat.map((p) => ({
        x: p.opct, y: p.rpct, r: 3 + 13 * Math.sqrt(p.ad_des / maxAd), color: QUAD_COLORS[p.cuad],
        tip: `<b>${p.n}</b> (${p.d})<br>${p.cuad}<br>${fmt(p.ad_des)} adultos desatendidos`,
      })),
    });
    const counts = Object.keys(QUAD_COLORS).map((q) => ({ name: `${q} (${desat.filter((p) => p.cuad === q).length})`, color: QUAD_COLORS[q] }));
    Charts.legend(box, counts, "dot");
  });

  // ---- Tabla 3: sitios MCLP ----
  const sites = D.sitios.map((s, i) => ({ ...s, rank: i + 1 }));
  const siteCols = [
    ["rank", "N.º", (s) => s.rank, "num"],
    ["ccpp", "Centro poblado", (s) => titleCase(s.ccpp), "txt"],
    ["distrito", "Distrito", (s) => titleCase(s.distrito), "txt"],
    ["departamento", "Departamento", (s) => titleCase(s.departamento), "txt"],
    ["demanda_en_radio", "Demanda en radio", (s) => fmt(s.demanda_en_radio), "num"],
    ["riesgo_pct", "Riesgo (pct.)", (s) => fmt(100 * s.riesgo_pct, 0), "num"],
    ["cuadrante", "Tipo de canal", (s) => QUAD_SHORT[s.cuadrante] || s.cuadrante, "txt"],
    ["se_mantiene_con_riesgo", "Con riesgo", (s) => (s.se_mantiene_con_riesgo ? "Se mantiene" : "Cambia"), "txt"],
  ];
  const QUAD_SHORT = {
    "Prioridad: canal físico": "Físico", "Prioridad: canal resiliente": "Resiliente",
    "Bajo impacto, alto riesgo": "Bajo impacto, riesgo alto", "Bajo impacto, bajo riesgo": "Bajo impacto, riesgo bajo",
  };
  let sortKey = "rank", sortDir = 1, selectedSite = null;
  const MINOR = new Set(["de", "del", "la", "las", "los", "el", "y", "e"]);
  function titleCase(s) {
    return String(s).toLowerCase().split(" ").map((w, i) => (i > 0 && MINOR.has(w) ? w : w.replace(/^(\(?)(\p{L})/u, (m, a, b) => a + b.toUpperCase()))).join(" ");
  }
  function renderSites() {
    const t = document.getElementById("table-sites");
    const robust = document.getElementById("filter-robust").checked;
    const rows = sites.filter((s) => !robust || s.se_mantiene_con_riesgo)
      .sort((a, b) => (a[sortKey] > b[sortKey] ? 1 : a[sortKey] < b[sortKey] ? -1 : 0) * sortDir);
    const head = siteCols.map(([k, lab]) => {
      const aria = sortKey === k ? (sortDir > 0 ? "ascending" : "descending") : "none";
      return `<th scope="col" aria-sort="${aria}"><button type="button" data-sort="${k}">${lab}</button></th>`;
    }).join("");
    t.querySelectorAll("thead, tbody").forEach((n) => n.remove());
    t.insertAdjacentHTML("beforeend", `<thead><tr>${head}</tr></thead><tbody>` + rows.map((s) =>
      `<tr tabindex="0" data-rank="${s.rank}" class="${selectedSite === s.rank ? "is-selected" : ""}" aria-label="Ubicar ${titleCase(s.ccpp)} en el mapa">` +
      siteCols.map(([, , f, cls]) => `<td class="${cls}">${f(s)}</td>`).join("") + "</tr>").join("") + "</tbody>");
  }
  document.getElementById("table-sites").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-sort]");
    if (b) { const k = b.dataset.sort; sortDir = sortKey === k ? -sortDir : 1; sortKey = k; renderSites(); return; }
    const tr = e.target.closest("tr[data-rank]");
    if (tr) selectSite(sites.find((s) => s.rank === +tr.dataset.rank), true);
  });
  document.getElementById("table-sites").addEventListener("keydown", (e) => {
    const tr = e.target.closest("tr[data-rank]");
    if (tr && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); selectSite(sites.find((s) => s.rank === +tr.dataset.rank), true); }
  });
  document.getElementById("filter-robust").addEventListener("change", renderSites);
  renderSites();

  function selectSite(s, scroll) {
    selectedSite = s.rank;
    renderSites();
    const idx = features.findIndex((f) => f.properties.n.toUpperCase() === s.distrito && f.properties.d.toUpperCase() === s.departamento);
    if (idx >= 0) Map3D.select(idx, false);
    Map3D.flyTo(s.lon, s.lat, 8.6);
    if (scroll) document.querySelector(".block-map").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  }

  // ---- Mapa 3D y controles ----
  function describeMetric(key, p) {
    switch (key) {
      case "acc": return `Acceso: ${fmt(p.acc, 0)} puntos por 10 mil adultos`;
      case "brecha": return p.esp ? `Observado ${fmt(p.obs, 0)} frente a ${fmt(p.esp, 0)} esperado` : "Sin estimación";
      case "lisa": return `Cluster: ${p.lisa}`;
      case "expo": return `Exposición a lluvia extrema: ${fmt(p.expo, 2)}`;
      case "cuad": return p.cuad ? `${p.cuad}<br>${fmt(p.ad_des)} adultos desatendidos` : "Sin déficit de acceso";
      default: return "";
    }
  }

  function renderCard(f) {
    const card = document.getElementById("card");
    if (!f) { card.hidden = true; card.innerHTML = ""; return; }
    const p = f.properties;
    const row = (a, b) => `<dt>${a}</dt><dd>${b}</dd>`;
    card.innerHTML = `
      <button class="card-close" type="button" aria-label="Cerrar ficha">×</button>
      <h4>${p.n}</h4>
      <p class="card-sub">${p.p}, ${p.d}</p>
      <dl>
        <dt class="card-group">Población</dt>
        ${row("Habitantes 2025", fmt(p.pob))}
        ${row("Adultos", fmt(p.ad))}
        ${row("Población urbana", pct(p.urb, 0))}
        ${row("Pobreza 2018", p.pobr == null ? "s. d." : pct(p.pobr, 1))}
        ${row("Altitud de la capital", p.alt == null ? "s. d." : fmt(p.alt) + " m")}
        <dt class="card-group">Oferta financiera</dt>
        ${row("Cajeros automáticos", fmt(p.atm))}
        ${row("Agentes corresponsales", fmt(p.cnb))}
        ${row("Oficinas", fmt(p.of))}
        ${row("Puntos por 10 mil adultos", fmt(p.tasa, 0))}
        ${row("Acceso esperado", p.esp == null ? "s. d." : fmt(p.esp, 0))}
        ${row("Cluster LISA", p.lisa)}
        <dt class="card-group">Riesgo y prioridad</dt>
        ${row("Lluvia mar. 1998 / 2017 / 2023", `${fmt(p.pp98, 0)} / ${fmt(p.pp17, 0)} / ${fmt(p.pp23, 0)} mm`)}
        ${row("Exposición (percentil)", fmt(100 * p.rpct, 0))}
        ${row("Adultos desatendidos", fmt(p.ad_des))}
        ${row("Canales faltantes", fmt(p.falt, 0))}
        ${row("Prioridad", p.cuad ? QUAD_SHORT[p.cuad] : "Sin déficit")}
        ${row("Sitios MCLP propuestos", fmt(p.sitios))}
      </dl>`;
    card.hidden = false;
    card.querySelector(".card-close").addEventListener("click", () => Map3D.select(-1));
  }

  function renderLegend() {
    const m = Map3D.colorMetrics[Map3D.state.color];
    document.getElementById("legend").innerHTML =
      `<span class="legend-title">${m.title}</span>` +
      m.legend.map((l) => `<span class="legend-row"><span class="legend-swatch" style="background:${l.color}"></span>${l.label}</span>`).join("") +
      `<span class="legend-note">${m.note}</span>`;
  }

  function radios(containerId, name, entries, current, onChange) {
    const box = document.getElementById(containerId);
    box.innerHTML = entries.map(([k, label]) =>
      `<label><input type="radio" name="${name}" value="${k}" ${k === current ? "checked" : ""}><span>${label}</span></label>`).join("");
    box.addEventListener("change", (e) => onChange(e.target.value));
  }

  Map3D.init({ features, sites: D.sitios, onSelect: (f) => renderCard(f) });
  radios("color-options", "color", Object.entries(Map3D.colorMetrics).map(([k, m]) => [k, m.label]), "acc", (k) => { Map3D.setColor(k); renderLegend(); });
  radios("height-options", "height", Object.entries(Map3D.HEIGHTS).map(([k, h]) => [k, h.label]), "ad", (k) => Map3D.setHeight(k));
  renderLegend();
  document.getElementById("toggle-sites").addEventListener("change", (e) => Map3D.setSites(e.target.checked));
  document.querySelectorAll("[data-view]").forEach((b) => b.addEventListener("click", () => Map3D.view(b.dataset.view)));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") Map3D.select(-1); });

  // Búsqueda de distrito
  const options = props.map((p, i) => ({ i, label: `${p.n}, ${p.p}` })).sort((a, b) => a.label.localeCompare(b.label, "es"));
  document.getElementById("district-list").innerHTML = options.map((o) => `<option value="${o.label}"></option>`).join("");
  const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  function runSearch(value) {
    const msg = document.getElementById("search-msg");
    const q = norm(value);
    if (!q) { msg.textContent = ""; return; }
    const hit = options.find((o) => norm(o.label) === q) || options.find((o) => norm(o.label).startsWith(q)) || options.find((o) => norm(o.label).includes(q));
    if (!hit) { msg.textContent = "No hay un distrito con ese nombre en el ámbito. Revisa la ortografía."; return; }
    msg.textContent = "";
    const f = features[hit.i];
    Map3D.select(hit.i, false);
    const ring = f.geometry.type === "Polygon" ? f.geometry.coordinates[0] : f.geometry.coordinates[0][0];
    const c = ring.reduce((a, q2) => [a[0] + q2[0], a[1] + q2[1]], [0, 0]).map((v) => v / ring.length);
    Map3D.flyTo(c[0], c[1], 8.4);
  }
  const search = document.getElementById("search");
  search.addEventListener("change", (e) => runSearch(e.target.value));
  search.addEventListener("keydown", (e) => { if (e.key === "Enter") runSearch(e.target.value); });

  window.App = { describeMetric, selectSite, fmt };
})();
