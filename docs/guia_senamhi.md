# Cómo obtener los datos de estaciones SENAMHI (paso manual)

Los datos diarios de estaciones no se pueden bajar de forma automática:
el portal histórico pide **registro gratuito** y el mapa de la red actual pide **captcha** por consulta.
Los catálogos con códigos y coordenadas ya están en `data/raw/senamhi/`.

## Opción A (recomendada): descarga histórica con registro
1. Entra a <https://www.senamhi.gob.pe/site/descarga-datos/> y crea tu usuario (pestaña *Ingreso*).
2. Las 68 estaciones del ámbito están en `estaciones_descarga_historica.csv`
   (Tumbes 4, Piura 20, Lambayeque 8, La Libertad 10, Cajamarca 26).
3. Descarga cada estación y guarda los archivos en `data/raw/senamhi/historico/`
   con el nombre `<codigo>.csv` (o el .txt/.zip tal como venga).
4. Variable objetivo sugerida: **precipitación acumulada de marzo de 1998** (El Niño extraordinario)
   y su **anomalía** respecto de la media de marzo de los años disponibles.
   Con ~68 puntos alcanza para semivariograma, kriging ordinario/universal y cokriging con altitud.

## Opción B: red actual (2021-2026, incluye el Ciclón Yaku de marzo 2023)
1. Abre <https://www.senamhi.gob.pe/?&p=estaciones>, filtra el norte y elige estaciones meteorológicas
   (`tipo = M` en `estaciones_red_actual.csv`; hay 175 en el ámbito).
2. En cada estación selecciona el mes **2023-03**, resuelve el captcha y exporta la tabla.
3. Guarda cada tabla como `data/raw/senamhi/red_actual/<codigo>_202303.csv`.
   Aunque sean menos estaciones (prioriza las convencionales `CO` y automáticas `EMA`), con 40-60 basta.

## Validación con producto grillado (sin login)
`python src/00_descargar_datos.py --chirps` baja CHIRPS (satélite + estaciones) para feb-mar de 1998, 2017 y 2023.
Úsalo **solo para validar** el mapa de kriging, no como dato de entrada: ya viene interpolado.
