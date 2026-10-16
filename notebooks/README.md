# Notebooks

Cada notebook corresponde a una etapa del análisis y lee las salidas de la anterior.
Antes de correrlos: `python src/01_construir_base_distrital.py`.

| Notebook | Etapa | Métodos | Entrada principal | Estado |
|---|---|---|---|---|
| `02_aede.ipynb` | Análisis exploratorio | Suavizado Bayes empírico, boxmap, centrografía | `geobanca_norte.gpkg` | Listo |
| `03_pesos_autocorrelacion.ipynb` | Dependencia espacial | Matrices de pesos, Moran, Geary, LISA, Gi*, Moran bivariado | `base_aede.csv` | Listo |
| `04_regresion_espacial.ipynb` | Modelos de áreas | OLS + LM, SAR, SEM (ML y GMM), Durbin espacial e impactos | `lisa_acceso.csv` | Listo |
| `05_mapas_interactivos.ipynb` | Comunicación | Álbum folium | todas las capas | Pendiente |
| `06_semivariograma_kriging.ipynb` | Geoestadística | Semivariograma, kriging ordinario y universal, cokriging, validación cruzada | estaciones SENAMHI | Pendiente |
| `07_patrones_puntuales.ipynb` | Procesos puntuales | Funciones K, L y G, CSR, Poisson no homogéneo | `osm_bancos_atm`, `centros_poblados` | Pendiente |
| `08_espaciotemporal_ml.ipynb` | Espacio-tiempo y ML | Panel 2017-2026, RF/XGBoost con rezagos espaciales, validación cruzada espacial, SHAP | panel SBS | Pendiente |
| `09_ubicacion_optima.ipynb` | Decisión | Score oportunidad × riesgo, MCLP | `centros_poblados` | Pendiente |
