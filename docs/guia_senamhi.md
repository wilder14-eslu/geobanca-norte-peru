# Datos de lluvia: decisión de diseño

## Por qué no se usan los registros de estaciones
El portal de SENAMHI entrega los datos diarios estación por estación: la descarga histórica pide registro y la red
actual pide captcha en cada consulta. Para las 235 estaciones meteorológicas del ámbito eso no es reproducible.

## Qué se usa
| Insumo | Origen | Uso |
|---|---|---|
| CHIRPS v2.0 mensual (0,05°) de marzo 1998, 2017 y 2023 | `python src/00_descargar_datos.py --chirps` | Campo de lluvia de referencia |
| Copernicus DEM GLO-90 | `python src/00_descargar_datos.py --dem` | Deriva externa (altitud) |
| Coordenadas de la red SENAMHI | `data/raw/senamhi/estaciones_*.csv` (ya en el repo) | Diseño de muestreo |

CHIRPS combina satélite y pluviómetros (incluidos los de SENAMHI) y es el producto de referencia para lluvia mensual
en zonas con red escasa (Funk et al., 2015).

## Diseño del notebook 06
1. Se observa CHIRPS solo en los píxeles que contienen una estación SENAMHI real (149 píxeles distintos).
2. Con esos puntos se ajusta el semivariograma y se interpola con IDW, kriging ordinario y kriging con deriva externa.
3. Se valida de dos formas: dejando una estación fuera y contra el campo completo, que es conocido en cada píxel.

Así se mide cuánta información pierde la geometría real de la red, y en qué zonas.
La limitación es que el valor en cada estación es el del píxel CHIRPS, no el del pluviómetro.

## Si se consiguen registros de estaciones
Guardarlos en `data/raw/senamhi/historico/<codigo>.csv`; el notebook 06 puede reemplazar el valor del píxel por el
registro observado sin cambiar el resto del flujo.
