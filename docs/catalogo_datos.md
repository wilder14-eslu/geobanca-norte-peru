# Catálogo de datos

Ámbito: Macro Región Norte (Tumbes 24, Piura 20, Lambayeque 14, La Libertad 13, Cajamarca 06), **327 distritos**.
Llave de unión: **UBIGEO INEI de 6 dígitos**. Fecha de descarga: 16/10/2026.

| # | Carpeta (`data/raw/`) | Qué contiene | Fuente original | Nivel | Periodo | Cómo se une |
|---|---|---|---|---|---|---|
| 1 | `limites/` | Polígonos de 1893 distritos, 196 provincias, 25 departamentos (EPSG:4326) y lista oficial de ubigeos | INEI (WFS de interoperabilidad y SISCONCODE), procesado en el repo Rodasluis/Peru-maps | Distrito | Ubigeo 2026 | `ubigeo` |
| 2 | `ubigeo/ubigeo_distrito.csv` | Altitud y coordenadas de la capital, superficie, IDH 2019, índice de vulnerabilidad alimentaria | jmcastagnetto/ubigeo-peru-aumentado (INEI, PNUD, MIDIS) | Distrito | 2019-2020 | `inei` = ubigeo |
| 3 | `ubigeo/ubigeo_ccpp.csv` | ~95 mil centros poblados con coordenadas (14 481 en el ámbito) | jmcastagnetto/ubigeo-peru-aumentado (INEI) | Punto | 2017 | `inei_distrito` |
| 4 | `pobreza2018/` | Mapa de Pobreza Monetaria 2018: intervalo de confianza al 95%, grupos robustos, ranking; diccionario e informe | INEI (anexos oficiales) | Distrito | 2018 | `Ubigeo` |
| 5 | `censo2025/` | 10 libros de tabulados del Censo 2025 (población, edad, educación, vivienda, servicios, seguro, TIC) | INEI, censos2025.inei.gob.pe (copia en carlosperez100/censo-peru-2025) | Distrito solo para población total/urbana/rural; el resto llega a provincia | 2025 | por nombre, con `src/utils_ubigeo.py` |
| 6 | `sbs/B-2364, B-3261, C-1236, C-2241, C-4230, B-5216` | Cajeros automáticos, establecimientos con cajeros corresponsales y EOB, por empresa y distrito | SBS, Boletín Estadístico (banca múltiple, financieras, cajas municipales, cajas rurales, edpymes, Banco de la Nación) | Distrito | dic-2017 a dic-2025 + mar-2026 | por nombre |
| 7 | `sbs/B-2358, B-3241, C-1234, C-2234, C-4228, B-5215` | Depósitos y créditos directos por **oficina** (miles de soles), con código de oficina | SBS | Oficina → distrito | dic-2023, dic-2024, dic-2025 (+ ago-2026 banca múltiple) | por nombre |
| 8 | `sbs/B-2303` | Número de oficinas por empresa y departamento | SBS | Departamento | dic-2017 a ago-2026 | departamento |
| 9 | `osm/` | 395 bancos, ATM y casas de cambio con coordenadas | OpenStreetMap vía Overpass API (© colaboradores de OSM, ODbL) | Punto | 16/10/2026 | espacial (`sjoin`) |
| 10 | `senamhi/` | Catálogo de estaciones: red actual (973, 175 meteorológicas en el ámbito) y portal histórico (293, 68 en el ámbito) con códigos y coordenadas | SENAMHI, mapas públicos | Punto | vigente | espacial |
| 11 | `dem/` *(opcional)* | Copernicus DEM GLO-90 | ESA / AWS Open Data | Ráster 90 m | 2021 | covariable de cokriging |
| 12 | `chirps/` *(opcional)* | Precipitación mensual CHIRPS v2.0 (feb-mar 1998, 2017, 2023) | UCSB Climate Hazards Center | Ráster 0.05° | — | solo validación |

## Variables construidas (`data/processed/base_distrital_norte.csv`)

| Variable | Definición | Fuente |
|---|---|---|
| `pob_total_2025`, `pob_censada`, `pob_urbana`, `pob_rural`, `pct_urbana` | Población del Censo 2025 | 5 |
| `pob_18mas` | **Estimada**: población total del distrito × (1 − proporción de menores de 18 de su provincia). El INEI no publica edad por distrito | 5 |
| `pct_60mas_prov` | % de 60+ de la provincia (contexto) | 5 |
| `pobreza_2018` | Punto medio del IC 95% de pobreza monetaria | 4 |
| `idh_2019`, `ivia`, `altitud_capital_m` | IDH, vulnerabilidad alimentaria, altitud | 2 |
| `n_atm`, `n_corresponsal_establecimientos`, `n_corresponsal_cajeros`, `n_eob` | Suma de todas las entidades supervisadas, corte mar-2026 | 6 |
| `n_oficinas`, `depositos_miles`, `creditos_miles` | Oficinas y saldos al dic-2025 | 7 |
| `puntos_atencion`, `puntos_x10k_adultos`, `atm_x10k_adultos`, `corresp_x10k_adultos` | Indicadores de acceso (formato SBS: por 10 mil adultos) | 5, 6, 7 |
| `creditos_pc_soles`, `depositos_pc_soles` | Profundidad financiera por adulto | 5, 7 |
| `sin_punto_atencion` | 1 si el distrito no tiene ningún canal | 6, 7 |

## Advertencias para el informe
- **Conteo por entidad**: un mismo local puede ser corresponsal de varias empresas; la SBS lo cuenta una vez por empresa. Interprétalo como "puntos de atención ofrecidos", no como locales físicos.
- **Alto Trujillo (130112)** se creó en 2022: tiene censo 2025 pero no pobreza 2018 ni IDH 2019.
- **Pobreza 2018** es la última versión distrital publicada; está 7 años desfasada respecto del Censo 2025.
- **OSM** cubre una fracción de lo que reporta la SBS (395 puntos vs ~5 mil ATM). Úsalo para patrones puntuales en ciudades bien mapeadas (Trujillo, Chiclayo, Piura) y dilo explícitamente.
- Los nombres de la SBS y del Censo se cruzan por nombre normalizado. Los casos sin cruce quedan en `data/interim/no_emparejados_*.csv` (ninguno en el ámbito al 16/10/2026).
