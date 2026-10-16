# GeoBanca Norte Perú

**Oportunidad y riesgo territorial para la expansión de canales financieros en el norte del Perú**
Trabajo integrador de *Estadística Espacial* (UNMSM, Escuela de Estadística, 2026-II).

## Pregunta de negocio
Si una entidad financiera quiere abrir **N agentes, cajeros corresponsales o EOB** en la Macro Región Norte
(Tumbes, Piura, Lambayeque, La Libertad y Cajamarca; 327 distritos, 7,3 millones de habitantes), ¿dónde debería ponerlos?

1. **Oportunidad** (datos de áreas): ¿qué distritos tienen población adulta con poco acceso a canales?
2. **Riesgo** (geoestadística): ¿qué zonas están más expuestas a lluvias extremas tipo El Niño, que deterioran la capacidad de pago?
3. **Decisión** (patrones puntuales + ML + optimización): ubicación óptima de nuevos puntos.

## Estructura
```
geobanca-norte-peru/
├── data/
│   ├── raw/          fuentes originales sin tocar (ver docs/catalogo_datos.md)
│   ├── interim/      tablas intermedias y casos sin cruce de ubigeo
│   └── processed/    base_distrital_norte.csv, geobanca_norte.gpkg, panel SBS
├── src/
│   ├── config.py                     rutas, ámbito y CRS
│   ├── utils_ubigeo.py               normalización de nombres y asignación de UBIGEO
│   ├── 00_descargar_datos.py         descarga reproducible de todas las fuentes
│   └── 01_construir_base_distrital.py  une todo por UBIGEO y genera las capas
├── notebooks/        un notebook por módulo del sílabo (ver notebooks/README.md)
├── qgis/             proyecto QGIS
├── outputs/          figuras, mapas HTML, tablas
└── docs/             catálogo de datos, guía SENAMHI, informe y presentación
```

## Cómo reproducir
```bash
git clone https://github.com/wilder14-eslu/geobanca-norte-peru.git
cd geobanca-norte-peru
python -m venv .venv
.venv\Scripts\activate                   # Windows  (Linux/Mac: source .venv/bin/activate)
pip install -r requirements.txt
python src/00_descargar_datos.py          # baja las fuentes a data/raw (~220 MB, unos minutos)
python src/01_construir_base_distrital.py # une todo por UBIGEO y genera data/processed
```

**Qué trae el repo y qué se descarga**
| Ya está en el repo | Se descarga con `00_descargar_datos.py` | Paso manual |
|---|---|---|
| Base distrital, panel SBS y oficinas (`data/processed/*.csv`) | Límites INEI, ubigeos, censo 2025, pobreza 2018 (versiones fijadas por commit) | Lluvia de estaciones SENAMHI (registro o captcha): ver `docs/guia_senamhi.md` |
| Bancos/ATM de OpenStreetMap del 16/10/2026 (`data/raw/osm/`) | 89 cuadros de la SBS | |
| Catálogos de estaciones SENAMHI (`data/raw/senamhi/`) | Opcional: DEM (`--dem`) y CHIRPS (`--chirps`) | |

- Para **solo ver o rehacer el análisis** no hace falta descargar nada: los notebooks leen los CSV de `data/processed`.
- Las fuentes de GitHub están **fijadas a un commit**, así que cualquiera obtiene los mismos archivos usados aquí.
- OSM es una foto al 16/10/2026: `--osm-actualizar` vuelve a consultarlo, pero los conteos pueden cambiar.
- La SBS podría mover sus archivos en el futuro; las rutas están en `00_descargar_datos.py`.

## Datos listos (16/10/2026)
| Capa | Archivo | Registros |
|---|---|---|
| Distritos con todas las variables | `data/processed/geobanca_norte.gpkg` capa `distritos` y `base_distrital_norte.csv` | 327 |
| Panel de cajeros, corresponsales y EOB por distrito (todas las entidades SBS) | `data/processed/sbs_puntos_atencion_panel_distrito.csv` | 10 cortes, dic-2017 a mar-2026 |
| Oficinas con depósitos y créditos | `data/processed/sbs_oficinas_norte.csv` | 629 oficinas a dic-2025 |
| Bancos y ATM (OpenStreetMap) | capa `osm_bancos_atm` | 395 |
| Estaciones meteorológicas SENAMHI | capa `senamhi_estaciones` | 175 |
| Centros poblados | capa `centros_poblados` | 14 481 |

Verificación del cruce en `outputs/tablas/reporte_verificacion.txt`.

## Pendiente (paso manual)
- **Precipitación de estaciones SENAMHI** para la Unidad III: el portal pide registro o captcha. Ver `docs/guia_senamhi.md`.

## Fuentes
INEI (Censo 2025, Mapa de Pobreza 2018, límites y ubigeos), SBS (Boletín Estadístico), SENAMHI, OpenStreetMap.
Detalle, licencias y advertencias en `docs/catalogo_datos.md`.
