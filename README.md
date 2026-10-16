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
python -m venv .venv
.venv\Scripts\activate            # Windows
pip install -r requirements.txt
python src/00_descargar_datos.py  # opcional: los datos ya están en data/raw
python src/01_construir_base_distrital.py
```

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
