# Notebooks (uno por módulo del sílabo)

| Notebook | Semana | Contenido | Entrada principal |
|---|---|---|---|
| `01_qgis_capas.md` | 1 | Proyecto QGIS: capas de `geobanca_norte.gpkg`, reproyección a EPSG:32717, DEM | `data/processed/geobanca_norte.gpkg` |
| `02_aede.ipynb` | 2 | AEDE: boxmaps, outliers espaciales, histogramas de acceso | `distritos` |
| `03_pesos_autocorrelacion.ipynb` | 3, 7 | Queen vs kNN, Moran, Geary, LISA y LISA bivariado pobreza-acceso | `distritos` |
| `04_regresion_espacial.ipynb` | 4 | OLS, SAR, SEM (ML y GMM), Durbin, GWR | `distritos` |
| `05_mapas_interactivos.ipynb` | 6 | Álbum folium | todas |
| `06_semivariograma_kriging.ipynb` | 9, 10 | Semivariograma, kriging, cokriging con altitud, validación LOO | estaciones SENAMHI (ver `docs/guia_senamhi.md`) |
| `07_patrones_puntuales.ipynb` | 11, 12 | Funciones K y G, CSR, Poisson no homogéneo | `osm_bancos_atm`, `centros_poblados` |
| `08_espaciotemporal_ml.ipynb` | 14 | Panel SBS 2017-2026, RF/XGBoost con rezagos espaciales, CV espacial, SHAP | `sbs_puntos_atencion_panel_distrito.csv` |
| `09_ubicacion_optima.ipynb` | extra | MCLP: dónde abrir N agentes | `centros_poblados` + score |
