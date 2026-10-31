/* Gráficos SVG livianos para el póster.
   Cada función recibe el contenedor y los datos; se vuelve a dibujar al cambiar el ancho. */
(function () {
  "use strict";

  const NS = "http://www.w3.org/2000/svg";
  const tip = document.getElementById("tooltip");

  // ---- Utilidades ----
  function el(tag, attrs, parent) {
    const node = document.createElementNS(NS, tag);
    for (const k in attrs || {}) node.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(node);
    return node;
  }
  function text(parent, x, y, str, attrs) {
    const t = el("text", Object.assign({ x, y }, attrs || {}), parent);
    t.textContent = str;
    return t;
  }
  function svgRoot(container, height) {
    container.innerHTML = "";
    const width = Math.max(260, container.clientWidth || 480);
    const svg = el("svg", { viewBox: `0 0 ${width} ${height}`, role: "img" }, container);
    return { svg, width, height };
  }
  function linear(d0, d1, r0, r1) {
    const k = (r1 - r0) / (d1 - d0 || 1);
    const f = (v) => r0 + (v - d0) * k;
    f.invert = (p) => d0 + (p - r0) / k;
    return f;
  }
  function niceMax(v) {
    const p = Math.pow(10, Math.floor(Math.log10(v || 1)));
    const m = v / p;
    return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
  }
  function ticks(max, n) {
    const step = niceMax(max / n);
    const out = [];
    for (let v = 0; v <= max + 1e-9; v += step) out.push(+v.toFixed(6));
    return out;
  }

  // Tooltip compartido: sigue al puntero y se oculta al salir
  function showTip(evt, html) {
    tip.innerHTML = html;
    tip.hidden = false;
    const pad = 14;
    const r = tip.getBoundingClientRect();
    let x = evt.clientX + pad, y = evt.clientY + pad;
    if (x + r.width > window.innerWidth - 8) x = evt.clientX - r.width - pad;
    if (y + r.height > window.innerHeight - 8) y = evt.clientY - r.height - pad;
    tip.style.left = x + "px";
    tip.style.top = y + "px";
  }
  function hideTip() { tip.hidden = true; }
  function bindTip(node, html) {
    node.addEventListener("pointermove", (e) => showTip(e, typeof html === "function" ? html() : html));
    node.addEventListener("pointerleave", hideTip);
  }

  function legend(container, items, kind) {
    const box = document.createElement("div");
    box.className = "chart-legend";
    items.forEach((it) => {
      const s = document.createElement("span");
      const i = document.createElement("i");
      if (kind) i.className = kind;
      i.style.background = it.color;
      s.append(i, document.createTextNode(it.name));
      box.appendChild(s);
    });
    container.prepend(box);
  }

  // Ruta de barra con extremo de datos redondeado (4 px) y base recta
  function barPath(x0, y, w, h, r) {
    r = Math.min(r, w, h / 2);
    if (w <= 0) return "";
    return `M${x0},${y} H${x0 + w - r} Q${x0 + w},${y} ${x0 + w},${y + r} V${y + h - r} Q${x0 + w},${y + h} ${x0 + w - r},${y + h} H${x0} Z`;
  }

  // ---- Barras horizontales ----
  // data: [{label, value, color, tip, marker?}]
  function barsH(container, data, opt) {
    opt = opt || {};
    const rowH = opt.rowH || 26;
    const labelW = opt.labelW || 120;
    const height = data.length * rowH + 26;
    const { svg, width } = svgRoot(container, height);
    const max = opt.max || niceMax(Math.max(...data.map((d) => Math.max(d.value, d.marker || 0))));
    const x = linear(0, max, labelW, width - (opt.rightPad || 56));
    const gGrid = el("g", { class: "grid" }, svg);
    ticks(max, 4).forEach((t) => {
      el("line", { x1: x(t), x2: x(t), y1: 0, y2: height - 20 }, gGrid);
      text(svg, x(t), height - 4, opt.tickFormat ? opt.tickFormat(t) : t, { "text-anchor": "middle" });
    });
    data.forEach((d, i) => {
      const y = i * rowH + 4, h = rowH - 9;
      text(svg, labelW - 8, y + h / 2 + 4, d.label, { "text-anchor": "end" });
      el("path", { d: barPath(x(0), y, x(d.value) - x(0), h, 4), fill: d.color }, svg);
      if (d.marker != null) {
        el("line", { x1: x(d.marker), x2: x(d.marker), y1: y - 3, y2: y + h + 3, stroke: "#1d2b2a", "stroke-width": 2 }, svg);
      }
      text(svg, x(Math.max(d.value, d.marker || 0)) + 6, y + h / 2 + 4, opt.format ? opt.format(d.value) : d.value, { class: "value-label" });
      const hit = el("rect", { class: "hit", x: 0, y: y - 4, width, height: rowH }, svg);
      bindTip(hit, d.tip || `<b>${d.label}</b><br>${opt.format ? opt.format(d.value) : d.value}`);
    });
  }

  // ---- Líneas con cursor vertical ----
  // cfg: {labels: [...], series: [{name, color, values}], format}
  function lines(container, cfg) {
    const height = 250;
    const { svg, width } = svgRoot(container, height);
    const m = { l: 48, r: 92, t: 12, b: 28 };
    const max = niceMax(Math.max(...cfg.series.flatMap((s) => s.values)));
    const x = linear(0, cfg.labels.length - 1, m.l, width - m.r);
    const y = linear(0, max, height - m.b, m.t);
    const g = el("g", { class: "grid" }, svg);
    ticks(max, 4).forEach((t) => {
      el("line", { x1: m.l, x2: width - m.r, y1: y(t), y2: y(t) }, g);
      text(svg, m.l - 6, y(t) + 4, cfg.format(t), { "text-anchor": "end" });
    });
    const every = width < 520 ? 2 : 1;
    cfg.labels.forEach((lab, i) => {
      if (i % every === 0 || i === cfg.labels.length - 1) text(svg, x(i), height - 8, lab, { "text-anchor": "middle" });
    });
    // Etiquetas directas al final, separadas para que no choquen
    const ends = cfg.series.map((s) => ({ s, y: y(s.values[s.values.length - 1]) })).sort((a, b) => a.y - b.y);
    for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 14) ends[i].y = ends[i - 1].y + 14;
    cfg.series.forEach((s) => {
      const d = s.values.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join("");
      el("path", { d, fill: "none", stroke: s.color, "stroke-width": 2, "stroke-linejoin": "round" }, svg);
    });
    ends.forEach((e) => text(svg, width - m.r + 8, e.y + 4, e.s.name, { class: "series-label" }));
    legend(container, cfg.series.map((s) => ({ name: s.name, color: s.color })), "line");

    const cross = el("line", { y1: m.t, y2: height - m.b, stroke: "#1d2b2a", "stroke-width": 1, opacity: 0 }, svg);
    const dots = cfg.series.map((s) => el("circle", { r: 4, fill: s.color, stroke: "#f7f8f6", "stroke-width": 2, opacity: 0 }, svg));
    const hit = el("rect", { class: "hit", x: m.l, y: m.t, width: width - m.l - m.r, height: height - m.t - m.b }, svg);
    hit.addEventListener("pointermove", (e) => {
      const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
      const p = pt.matrixTransform(svg.getScreenCTM().inverse());
      const i = Math.max(0, Math.min(cfg.labels.length - 1, Math.round(x.invert(p.x))));
      cross.setAttribute("x1", x(i)); cross.setAttribute("x2", x(i)); cross.setAttribute("opacity", 0.35);
      dots.forEach((dt, k) => { dt.setAttribute("cx", x(i)); dt.setAttribute("cy", y(cfg.series[k].values[i])); dt.setAttribute("opacity", 1); });
      const rows = cfg.series.slice().sort((a, b) => b.values[i] - a.values[i])
        .map((s) => `${s.name}: ${cfg.format(s.values[i])}`).join("<br>");
      const total = cfg.series.reduce((a, s) => a + s.values[i], 0);
      showTip(e, `<b>${cfg.labels[i]}</b> · total ${cfg.format(total)}<br>${rows}`);
    });
    hit.addEventListener("pointerleave", () => { hideTip(); cross.setAttribute("opacity", 0); dots.forEach((d) => d.setAttribute("opacity", 0)); });
  }

  // ---- Gráfico de puntos por grupo (filas = grupos, puntos = series) ----
  // cfg: {groups: [...], series: [{name, color, values}], format, xLabel, max?, min?}
  function dotRows(container, cfg) {
    const rowH = 38;
    const height = cfg.groups.length * rowH + 34;
    const { svg, width } = svgRoot(container, height);
    const labelW = cfg.labelW || 120;
    const all = cfg.series.flatMap((s) => s.values);
    const min = cfg.min != null ? cfg.min : 0;
    const max = cfg.max || niceMax(Math.max(...all));
    const x = linear(min, max, labelW, width - 24);
    const g = el("g", { class: "grid" }, svg);
    const step = niceMax((max - min) / 4);
    for (let t = min; t <= max + 1e-9; t += step) {
      el("line", { x1: x(t), x2: x(t), y1: 0, y2: height - 26 }, g);
      text(svg, x(t), height - 10, cfg.format(t), { "text-anchor": "middle" });
    }
    if (cfg.xLabel) text(svg, width - 24, height - 10 + 0, "", {});
    cfg.groups.forEach((grp, gi) => {
      const cy = gi * rowH + rowH / 2;
      text(svg, labelW - 10, cy + 4, grp, { "text-anchor": "end" });
      const vals = cfg.series.map((s) => s.values[gi]);
      el("line", { x1: x(Math.min(...vals)), x2: x(Math.max(...vals)), y1: cy, y2: cy, stroke: "#a3aca8", "stroke-width": 2 }, svg);
      cfg.series.forEach((s) => {
        const c = el("circle", { cx: x(s.values[gi]), cy, r: 6, fill: s.color, stroke: "#f7f8f6", "stroke-width": 2 }, svg);
        const hit = el("circle", { class: "hit", cx: x(s.values[gi]), cy, r: 12 }, svg);
        bindTip(hit, `<b>${grp}</b><br>${s.name}: ${cfg.format(s.values[gi])}`);
        void c;
      });
    });
    legend(container, cfg.series.map((s) => ({ name: s.name, color: s.color })), "dot");
  }

  // ---- Dispersión con cuadrantes ----
  // cfg: {points: [{x, y, r, color, tip}], xLabel, yLabel, vx, vy, quadLabels}
  function scatter(container, cfg) {
    const size = Math.max(280, Math.min(container.clientWidth || 480, 560));
    container.innerHTML = "";
    const width = size, height = size * 0.86;
    const svg = el("svg", { viewBox: `0 0 ${width} ${height}`, role: "img" }, container);
    const m = { l: 46, r: 12, t: 12, b: 40 };
    const x = linear(0, 1, m.l, width - m.r);
    const y = linear(0, 1, height - m.b, m.t);
    const g = el("g", { class: "grid" }, svg);
    [0, 0.25, 0.5, 0.75, 1].forEach((t) => {
      el("line", { x1: x(t), x2: x(t), y1: m.t, y2: height - m.b }, g);
      el("line", { x1: m.l, x2: width - m.r, y1: y(t), y2: y(t) }, g);
      text(svg, x(t), height - m.b + 16, Math.round(t * 100), { "text-anchor": "middle" });
      text(svg, m.l - 6, y(t) + 4, Math.round(t * 100), { "text-anchor": "end" });
    });
    text(svg, (m.l + width - m.r) / 2, height - 4, cfg.xLabel, { "text-anchor": "middle" });
    text(svg, 12, (m.t + height - m.b) / 2, cfg.yLabel, { "text-anchor": "middle", transform: `rotate(-90 12 ${(m.t + height - m.b) / 2})` });
    el("line", { x1: x(cfg.vx), x2: x(cfg.vx), y1: m.t, y2: height - m.b, stroke: "#1d2b2a", "stroke-dasharray": "4 4", "stroke-width": 1 }, svg);
    el("line", { x1: m.l, x2: width - m.r, y1: y(cfg.vy), y2: y(cfg.vy), stroke: "#1d2b2a", "stroke-dasharray": "4 4", "stroke-width": 1 }, svg);
    cfg.points.slice().sort((a, b) => b.r - a.r).forEach((p) => {
      const c = el("circle", { cx: x(p.x), cy: y(p.y), r: p.r, fill: p.color, "fill-opacity": 0.85, stroke: "#f7f8f6", "stroke-width": 2 }, svg);
      bindTip(c, p.tip);
    });
  }

  // Redibujo al cambiar el ancho del contenedor
  const registry = [];
  function register(fn) { registry.push(fn); fn(); }
  let lastW = window.innerWidth, timer;
  window.addEventListener("resize", () => {
    clearTimeout(timer);
    timer = setTimeout(() => { if (window.innerWidth !== lastW) { lastW = window.innerWidth; registry.forEach((f) => f()); } }, 150);
  });

  window.Charts = { barsH, lines, dotRows, scatter, register, legend, showTip, hideTip };
})();
