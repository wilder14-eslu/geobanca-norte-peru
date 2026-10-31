# Arquitectura de GeoBanca Norte Perú

Este documento explica cómo está construido el proyecto: de dónde vienen los datos, cómo fluyen entre los scripts y los
notebooks, cómo funciona el póster web y cómo se publica. Los diagramas usan Mermaid y GitHub los muestra como imágenes.

1. [Contexto del sistema](#1-contexto-del-sistema)
2. [Arquitectura por capas](#2-arquitectura-por-capas)
3. [Flujo de datos entre etapas](#3-flujo-de-datos-entre-etapas)
4. [Modelo de datos del póster](#4-modelo-de-datos-del-póster)
5. [Componentes del frontend](#5-componentes-del-frontend)
6. [Interacción en el póster](#6-interacción-en-el-póster)
7. [Despliegue](#7-despliegue)
8. [Pipeline orquestado (propuesta)](#8-pipeline-orquestado-propuesta)
9. [Decisiones de diseño](#9-decisiones-de-diseño)

---

## 1. Contexto del sistema

Quién entrega datos al sistema y quién consume sus resultados.

```mermaid
flowchart LR
    subgraph Fuentes["Fuentes oficiales y abiertas"]
        SBS["SBS<br/>cajeros, corresponsales,<br/>oficinas, depósitos"]
        INEI["INEI<br/>Censo 2025, pobreza 2018,<br/>límites, centros poblados"]
        SEN["SENAMHI<br/>red de estaciones"]
        CH["CHIRPS v2.0<br/>lluvia mensual"]
        DEM["Copernicus DEM<br/>GLO-90"]
        OSM["OpenStreetMap<br/>bancos y cajeros"]
    end

    subgraph Sistema["GeoBanca Norte Perú"]
        ING["Ingesta e integración<br/>src/00 y src/01"]
        ANA["Análisis espacial<br/>notebooks 02 a 09"]
        PUB["Póster web<br/>src/02 + index.html"]
        ING --> ANA --> PUB
    end

    SBS & INEI & SEN & CH & DEM & OSM --> ING
    PUB -->|GitHub Pages| U1["Jurado y docentes"]
    PUB -->|GitHub Pages| U2["Analistas de banca"]
    ANA -->|repositorio| U3["Revisores técnicos"]
    CARTO["CARTO<br/>mapa base"] -.->|teselas| PUB
```

## 2. Arquitectura por capas

Cada capa solo lee de la capa anterior. Así un cambio en una fuente no obliga a tocar el póster.

```mermaid
flowchart TB
    subgraph C1["Capa de datos"]
        RAW["data/raw<br/>archivos originales sin tocar"]
        INT["data/interim<br/>tablas intermedias y casos sin cruce"]
        PRO["data/processed<br/>bases listas para el análisis"]
    end

    subgraph C2["Capa de procesamiento: src/"]
        CFG["config.py<br/>rutas, ámbito, CRS"]
        UBI["utils_ubigeo.py<br/>normalización de nombres"]
        S00["00_descargar_datos.py"]
        S01["01_construir_base_distrital.py"]
    end

    subgraph C3["Capa analítica: notebooks/"]
        NB["02 a 09<br/>un notebook por método"]
        OUT["outputs/<br/>figuras, mapas HTML, tablas"]
    end

    subgraph C4["Capa de exportación"]
        S02["src/02_exportar_web.py"]
        JS["assets/data/geobanca_web.js<br/>window.GEOBANCA"]
    end

    subgraph C5["Capa de presentación"]
        WEB["index.html + assets/css + assets/js"]
        VEN["assets/vendor<br/>MapLibre, deck.gl"]
    end

    S00 --> RAW
    RAW --> S01
    CFG -.-> S00 & S01
    UBI -.-> S01
    S01 --> INT & PRO
    PRO --> NB
    NB --> PRO
    NB --> OUT
    PRO & OUT --> S02 --> JS --> WEB
    VEN --> WEB
```

## 3. Flujo de datos entre etapas

Qué archivo produce cada etapa y quién lo consume. Es el grafo real de dependencias, extraído del código de los notebooks.

```mermaid
flowchart LR
    S01(["src/01"]) --> GPKG[("geobanca_norte.gpkg<br/>distritos, osm_bancos_atm,<br/>senamhi_estaciones,<br/>centros_poblados")]
    S01 --> GEO[("distritos_norte.geojson")]
    S01 --> PAN[("sbs_puntos_atencion_<br/>panel_distrito.csv")]

    GPKG --> N02(["02 AEDE"]) --> AEDE[("base_aede.csv")]
    AEDE --> N03(["03 Autocorrelación"]) --> LISA[("lisa_acceso.csv")]
    LISA --> N04(["04 Regresión espacial"]) --> T04[/"04_comparacion_modelos.csv"/]

    RAWC[("CHIRPS, DEM,<br/>estaciones SENAMHI")] --> N06(["06 Geoestadística"])
    GPKG --> N06 --> LLU[("lluvia_extrema_distrito.csv")]
    N06 --> T06[/"06_validacion_interpolacion.csv"/]

    GPKG --> N07(["07 Procesos puntuales"]) --> IPP[("intensidad_ipp_grilla.csv")]

    PAN & LISA --> N08(["08 Espacio-tiempo y ML"]) --> BRE[("brecha_acceso_2025.csv")]
    N08 --> T08[/"08_*.csv"/]

    AEDE & BRE & LISA --> N05(["05 Mapas interactivos"]) --> HTML[/"outputs/mapas/*.html"/]

    AEDE & BRE & LLU --> N09(["09 Ubicación óptima"])
    GPKG --> N09
    N09 --> PRI[("priorizacion_distrital.csv")]
    N09 --> T09[/"09_mclp_*.csv<br/>09_sitios_mclp_P25.csv"/]

    GEO & AEDE & LISA & LLU & PRI & PAN & T04 & T06 & T08 & T09 --> S02(["src/02_exportar_web"]) --> WEBJS[/"geobanca_web.js"/]
```

Orden de ejecución que respeta las dependencias: `01 → 02 → 03 → 04 → 06 → 07 → 08 → 05 → 09 → exportar_web`.
El notebook 05 va después del 08 porque usa la brecha de acceso que el 08 calcula.

## 4. Modelo de datos del póster

Estructura de `window.GEOBANCA`, el único archivo de datos que lee la web. Los nombres de propiedad de cada distrito son cortos
para que el archivo pese menos (442 KB con las 327 geometrías simplificadas).

```mermaid
classDiagram
    class GEOBANCA {
        +string generado
        +Kpi kpi
        +Estadisticos estadisticos
        +PanelCorte[] panel
        +Modelo[] modelos
        +Interpolacion[] interpolacion
        +FilaML[] ml_cv
        +FilaML[] ml_cambio
        +FilaMCLP[] mclp
        +Sitio[] sitios
        +FeatureCollection distritos
    }
    class Distrito {
        +string u  ubigeo
        +string n  distrito
        +string p  provincia
        +string d  departamento
        +int pob
        +float ad  adultos
        +float acc  acceso suavizado
        +string lisa
        +float obs  tasa observada
        +float esp  tasa esperada
        +float brecha
        +float expo  exposición El Niño
        +string cuad  cuadrante
        +float ad_des  adultos desatendidos
        +float falt_urb
        +int sitios
    }
    class Sitio {
        +string ccpp
        +string distrito
        +float lat
        +float lon
        +float demanda_en_radio
        +float riesgo_pct
        +string cuadrante
        +bool se_mantiene_con_riesgo
    }
    class PanelCorte {
        +string corte
        +string etiqueta
        +int atm
        +int corresponsal_establecimientos
        +int canales
        +map por_departamento
    }
    class Kpi {
        +int distritos
        +int adultos
        +int puntos_atencion
        +int distritos_desatendidos
        +int canales_faltantes
        +map mediana_acceso_eb_departamento
    }
    GEOBANCA "1" *-- "327" Distrito : distritos.features
    GEOBANCA "1" *-- "25" Sitio : sitios
    GEOBANCA "1" *-- "10" PanelCorte : panel
    GEOBANCA "1" *-- "1" Kpi : kpi
    Sitio ..> Distrito : se ubica en
```

## 5. Componentes del frontend

La web es estática: no hay servidor ni base de datos. Cada módulo de JavaScript expone un objeto global con una sola
responsabilidad, y `app.js` los coordina.

```mermaid
flowchart TB
    HTML["index.html<br/>estructura del póster:<br/>Resumen, Introducción, Método,<br/>Resultados, Discusión, Conclusiones"]

    subgraph Datos
        GB["geobanca_web.js<br/>window.GEOBANCA"]
    end

    subgraph Librerias["Librerías locales"]
        ML["MapLibre GL 4.7<br/>mapa base y cámara 3D"]
        DK["deck.gl 9.0<br/>capas WebGL"]
    end

    subgraph Modulos["Módulos propios"]
        APP["app.js · window.App<br/>controlador: enlaza cifras,<br/>tablas, controles y ficha"]
        MAP["map3d.js · window.Map3D<br/>métricas de color, alturas,<br/>selección, vistas"]
        CH["charts.js · window.Charts<br/>barras, líneas, puntos,<br/>dispersión, tooltip"]
    end

    subgraph Capas["Capas de deck.gl"]
        L1["GeoJsonLayer<br/>distritos extruidos"]
        L2["ColumnLayer<br/>25 sitios MCLP"]
        L3["ScatterplotLayer<br/>radios de 5 km"]
        L4["TextLayer<br/>departamentos"]
    end

    HTML --> GB & ML & DK & CH & MAP & APP
    GB --> APP
    APP -->|init, setColor, setHeight,<br/>select, flyTo| MAP
    APP -->|barsH, lines, dotRows,<br/>scatter| CH
    MAP -->|onSelect| APP
    MAP -->|describeMetric| APP
    MAP --> ML
    MAP --> DK --> L1 & L2 & L3 & L4
    MAP -->|tooltip compartido| CH
```

## 6. Interacción en el póster

Qué pasa cuando alguien selecciona un sitio en la Tabla 3. El clic en un distrito del mapa sigue el mismo camino desde
`Map3D.select`.

```mermaid
sequenceDiagram
    actor U as Usuario
    participant T as Tabla 3 (DOM)
    participant A as App (app.js)
    participant M as Map3D (map3d.js)
    participant D as deck.gl
    participant L as MapLibre

    U->>T: clic en una fila
    T->>A: selectSite(sitio)
    A->>A: marca la fila y busca el distrito por nombre
    A->>M: select(índice del distrito)
    M->>D: setProps(capas con highlightedObjectIndex)
    D-->>U: distrito resaltado
    M->>A: onSelect(feature)
    A-->>U: ficha del distrito con población, oferta y riesgo
    A->>M: flyTo(lon, lat, zoom)
    M->>L: flyTo (o jumpTo si se pidió menos movimiento)
    L-->>U: cámara sobre el sitio
```

## 7. Despliegue

El póster se publica solo en cada push a `main`. GitHub Actions sube el repositorio como sitio estático.

```mermaid
flowchart LR
    DEV["VS Code local<br/>commit y push"] -->|git push origin main| GH["GitHub<br/>wilder14-eslu/geobanca-norte-peru"]
    GH -->|evento push| WF

    subgraph WF["GitHub Actions: deploy-pages.yml"]
        direction TB
        A1["checkout"] --> A2["configure-pages"] --> A3["upload-pages-artifact<br/>path: ."] --> A4["deploy-pages"]
    end

    WF --> CDN["GitHub Pages<br/>wilder14-eslu.github.io/geobanca-norte-peru"]
    CDN --> NAV["Navegador"]
    TILES["CARTO<br/>teselas del mapa base"] -.-> NAV
```

Todo lo que necesita el póster (datos, librerías, tipografía, escudo) va dentro del repositorio. Si falla internet durante
una exposición, el póster abre igual desde la carpeta local; solo falta el mapa base de fondo.

## 8. Pipeline orquestado (propuesta)

Hoy cada etapa se ejecuta a mano. Esta es la propuesta para un `run_pipeline.py` que ejecute todo en orden, valide la salida
de cada etapa y se detenga ante el primer error, para que un dato roto nunca llegue al póster. **Todavía no está implementado.**

```mermaid
flowchart TB
    START(["run_pipeline.py --desde etapa"]) --> E0

    E0["00 Descarga<br/>fuentes fijadas por commit"] --> V0{"¿Archivos completos?"}
    V0 -->|no| X(["Detener y reportar"])
    V0 -->|sí| E1["01 Integración por ubigeo"]
    E1 --> V1{"327 distritos<br/>población total cuadra<br/>sin ubigeos nulos"}
    V1 -->|no| X
    V1 -->|sí| E2["Notebooks en orden de dependencias<br/>02, 03, 04, 06, 07, 08, 05, 09<br/>ejecutados con nbconvert"]
    E2 --> V2{"¿Tablas de outputs/<br/>generadas y sin errores?"}
    V2 -->|no| X
    V2 -->|sí| E3["02 Exportar web"]
    E3 --> V3{"I de Moran = notebook 03<br/>25 sitios, 10 cortes"}
    V3 -->|no| X
    V3 -->|sí| FIN(["Listo para commit y push"])
```

## 9. Decisiones de diseño

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Sitio estático en GitHub Pages | Servidor con API (Flask, Node) | No hay datos sensibles ni consultas en vivo; un sitio estático no se cae ni cuesta. |
| Cifras generadas por `02_exportar_web.py` | Escribirlas a mano en el HTML | Una sola fuente de verdad: si cambia un notebook, la web se actualiza sin errores de copia. |
| Librerías y tipografía dentro del repo | Cargarlas desde un CDN | El póster funciona sin internet durante la exposición. |
| MapLibre + deck.gl | Leaflet o folium | Extrusión 3D por WebGL, cámara con inclinación y rotación, y miles de polígonos fluidos. |
| Geometrías simplificadas a 350 m | GeoJSON completo (7,6 MB) | 442 KB en total; a escala regional la diferencia no se ve. |
| Dos sistemas de referencia | Uno solo | EPSG:4326 para intercambio y web; EPSG:32717 (UTM 17S) para distancias, áreas, kriging y el MCLP. |
| Ubigeo INEI de 6 dígitos como llave | Unir por nombre de distrito | Los nombres cambian de escritura entre fuentes; el ubigeo no. `utils_ubigeo.py` resuelve los casos que solo traen nombre. |
| Un notebook por método | Un solo notebook largo | Cada etapa se revisa, corrige y vuelve a ejecutar sin rehacer todo. |
