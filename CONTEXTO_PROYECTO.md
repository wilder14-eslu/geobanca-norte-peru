# Contexto y Guía de Continuidad — GeoBanca Norte Perú

> **Documento de transferencia y memoria técnica** para la elaboración del informe/documentación final y futuras iteraciones del frontend.

---

## 1. Resumen Ejecutivo y Pregunta de Negocio

* **Objetivo:** Determinar la ubicación óptima para la expansión de canales financieros (agentes corresponsales, cajeros automáticos, oficinas bancarias) en la Macro Región Norte del Perú, equilibrando **Oportunidad** (brecha poblacional desatendida) y **Riesgo Territorial** (exposición a precipitaciones extremas por el Fenómeno El Niño - FEN).
* **Ámbito Geográfico:** 5 departamentos (Piura, Lambayeque, La Libertad, Cajamarca, Tumbes), abarcando **327 distritos** y **7,323,726 habitantes** (5,490,861 adultos 18+).
* **Proyección Cartográfica Oficial:** `EPSG:32717` (UTM Zona 17S, WGS 84).
* **Fuentes de Datos Oficiales Integradas:**
  * **SBS:** Panel histórico de cajeros y oficinas (2017–2026) y corresponsales no bancarios.
  * **INEI:** Censo 2025 (población total y adulta), mapa de pobreza monetaria distrital 2018, IDH 2019.
  * **SENAMHI:** Red meteorológica histórica y actual (175 estaciones en el ámbito).
  * **CHIRPS / DEM:** Precipitación grillada satelital y modelo de elevación digital.
  * **OpenStreetMap (OSM):** Puntos de atención georreferenciados (395 bancos/cajeros) y 14,481 centros poblados.

---

## 2. Síntesis Metodológica y Resultados Clave (Para el Informe)

### Fase 1: Datos de Áreas y AEDE (`notebooks/02_aede.ipynb` y `03_pesos_autocorrelacion.ipynb`)
* **Matriz de Pesos Espaciales ($W$):** Contigüidad Reina de 1er orden estandarizada por filas.
* **Moran Global:** $I = 0.540$ ($p < 0.001$, 999 permutaciones), confirmando autocorrelación espacial positiva altamente significativa.
* **LISA (Local Indicators of Spatial Association):**
  * *Hotspots (Alto-Alto):* Eje costero Trujillo–Chiclayo–Piura (fuerte aglomeración y spillover).
  * *Coldspots (Bajo-Bajo):* Zonas altoandinas de Cajamarca y sierras de Piura (Ayabaca/Huancabamba), evidenciando trampas territoriales de bajo acceso.
* **Desiertos Financieros:** 5 distritos con 0 puntos de atención de cualquier tipo.

### Fase 2: Econometría Espacial de Áreas (`notebooks/04_regresion_espacial.ipynb`)
Comparación formal de modelos para explicar la tasa de acceso:
$$\begin{array}{lcccc}
\hline
\textbf{Modelo} & \textbf{AIC} & \textbf{Pseudo } R^2 & \textbf{Moran Residuos} & \textbf{Parámetro Espacial} \\
\hline
\text{OLS (MCO)} & 1695.6 & 0.233 & 0.214^{***} & - \\
\text{SAR (ML)} & 1680.3 & 0.286 & 0.045 & \rho = 0.298^{***} \\
\text{SEM (ML)} & 1661.7 & 0.231 & -0.016 & \lambda = 0.452^{***} \\
\textbf{SDM (Durbin Espacial, ML)} & \mathbf{1648.0} & \mathbf{0.384} & \mathbf{0.001} \text{ (ns)} & \rho = 0.427^{***} \\
\hline
\end{array}$$
* **Conclusión clave:** El modelo **Spatial Durbin Model (SDM)** es el superior. Elimina completamente la autocorrelación en residuos y demuestra que la urbanización y la pobreza de los distritos vecinos ejercen derrames (*spillovers*) significativos sobre el acceso local.

### Fase 3: Geoestadística de Lluvias Extremas FEN (`notebooks/06_geoestadistica_precipitacion.ipynb`)
* **Objetivo:** Modelar la amenaza climática por inundaciones durante los tres grandes eventos El Niño (marzo 1998, marzo 2017 y marzo 2023).
* **Semivariograma:** Ajustado por WLS con modelos esférico y exponencial; rango espacial de dependencia pluviométrica de ~140 km.
* **Validación Cruzada LOO (Marzo 1998):**
  * IDW: $\text{RMSE} = 94.7\text{ mm}$
  * Kriging Ordinario (KO): $\mathbf{\text{RMSE} = 72.5\text{ mm}}$ (reducción de error > 23%)
  * Kriging con Deriva Externa (KDE con elevación DEM): $\text{RMSE} = 74.1\text{ mm}$

### Fase 4: Procesos Puntuales Espaciales (`notebooks/07_patrones_puntuales.ipynb`)
* **Test de Clark-Evans:** $R = 0.41$ ($p < 0.001$), rechazando fuertemente la Hipótesis de Completa Aleatoriedad Espacial (CSR).
* **Función $K$ y $L$ inhomogénea de Ripley:** Las curvas empíricas sobrepasan las envolventes de simulación de Monte Carlo, evidenciando una fuerte atracción y competencia espacial en nodos comerciales menores a 5 km.
* **Kernel 2D:** Hiperconcentración en centros históricos de capitales provinciales (ej. Trujillo) y periferias populosas desatendidas.

### Fase 5: Espacio-Tiempo, ML y Explicabilidad (`notebooks/08_espaciotemporal_ml.ipynb`)
* **Markov Espacial:** Demuestra condicionamiento del entorno regional: la probabilidad de ascenso de categoría de acceso aumenta más del triple cuando los distritos vecinos son de alto acceso.
* **Cross-Validation Espacial (Spatial Block CV):**
  * Random Forest Espacial ($X + WX + \text{coords}$): $\mathbf{R^2 = 0.332, \text{RMSE} = 0.903}$.
* **SHAP:** Altitud y pobreza deprimen el potencial; la interacción con rezagos $WX$ modula la severidad.

### Fase 6: Optimización Territorial MCLP (`notebooks/09_ubicacion_optima.ipynb`)
* **Problema de Máxima Cobertura con Localización (MCLP):** Formulado y resuelto de forma exacta mediante Programación Entera Mixta (MIP) con el solver **CBC (Branch-and-Cut)** frente a la heurística voraz.
* **Resultados para $P = 25$ puntos estratégicos:**
  * Cobertura exacta: **27.42%** de la población en demanda insatisfecha.
  * Adultos cubiertos: **63,643 personas**.

---

## 3. Estado Actual del Frontend y Despliegue

* **URL en Producción (GitHub Pages):** [https://wilder14-eslu.github.io/geobanca-norte-peru/](https://wilder14-eslu.github.io/geobanca-norte-peru/)
* **Punto de Entrada:** [`index.html`](file:///C:/Users/esluw/OneDrive/Documents/Proyectos%20completos/geobanca-norte-peru/index.html) (alojado en la raíz de `main`).
* **Componentes y Tecnologías:**
  * **Framework:** Tailwind CSS vía CDN (modo oscuro corporativo/académico).
  * **Fórmulas:** MathJax 3 vía CDN (renderiza LaTeX en el navegador).
  * **Iconografía:** FontAwesome 6 Free CDN.
  * **Interactividad Cartográfica:** `<iframe>` con pestañas para alternar entre:
    * `outputs/mapas/05_mapa_principal.html`
    * `outputs/mapas/05_desiertos_financieros.html`
    * `outputs/mapas/05_oferta_osm.html`
  * **Lightbox / Zoom:** Sistema en Vanilla JS para ampliar a pantalla completa cualquiera de las 29 figuras PNG de `outputs/figuras/`.
* **Automatización CI/CD:**
  * Archivo `.nojekyll` en la raíz (evita que Jekyll bloquee mapas pesados de Leaflet/Folium).
  * Archivo `.github/workflows/deploy-pages.yml` (despliegue automático a GitHub Pages en cada `git push origin main`).

---

## 4. Hoja de Ruta para el Futuro

### A. Para el Informe Escrito / Documentación (`docs/informe/`):
1. **Estructura Recomendada:**
   * **Capítulo 1:** Introducción, contextualización territorial del norte del Perú y justificación ante el FEN.
   * **Capítulo 2:** Catálogo de datos y normalización geoespacial (ver [`docs/catalogo_datos.md`](file:///C:/Users/esluw/OneDrive/Documents/Proyectos%20completos/geobanca-norte-peru/docs/catalogo_datos.md)).
   * **Capítulo 3:** Análisis Exploratorio de Datos Espaciales (AEDE, Moran y LISA).
   * **Capítulo 4:** Econometría Espacial (pruebas LM, OLS vs SAR/SEM vs SDM e interpretación de impactos).
   * **Capítulo 5:** Geoestadística aplicada al riesgo de inundaciones (Semivariograma, Kriging y validación cruzada).
   * **Capítulo 6:** Procesos puntuales (Clark-Evans, Kernel e inhomogeneidad de Ripley).
   * **Capítulo 7:** Machine Learning espacio-temporal y Cadenas de Markov espaciales.
   * **Capítulo 8:** Decisión multicriterio y optimización combinatoria (MCLP).
   * **Capítulo 9:** Conclusiones, limitaciones y recomendaciones de política bancaria.

### B. Para Futuras Mejoras del Frontend (`index.html`):
1. **Galería Completa de Figuras:** Actualmente se muestran 12 figuras principales; se puede añadir un carrusel o selector tipo acordeón para ver las 29 figuras de `outputs/figuras/`.
2. **Buscador Distrital:** Integrar un selector desplegable o buscador en JS donde el usuario elija un distrito (ej. "Mórrope", "Catacaos", "Chicama") y se muestre una tarjeta flotante con sus métricas específicas (población, tasa de canales, riesgo FEN, brecha).
3. **Versión Imprimible Póster A0/A1:** Ajustar las reglas CSS `@media print` para generar un PDF en una sola lámina póster de alta definición para congresos científicos.
4. **Exportador de Datos:** Agregar un botón para descargar el CSV de los 25 puntos óptimos MCLP (`outputs/tablas/09_sitios_mclp_P25.csv`).
