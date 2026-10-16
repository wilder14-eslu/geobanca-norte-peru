"""
Configuración central del proyecto GeoBanca Norte Perú.
Rutas, ámbito geográfico y sistema de referencia usados por todos los scripts.
"""
from pathlib import Path

# Rutas del proyecto (relativas a la raíz del repo)
ROOT = Path(__file__).resolve().parents[1]
DATA_RAW = ROOT / "data" / "raw"
DATA_INTERIM = ROOT / "data" / "interim"
DATA_PROCESSED = ROOT / "data" / "processed"
OUTPUTS = ROOT / "outputs"

# Ámbito: Macro Región Norte (código INEI de departamento -> nombre)
DEPARTAMENTOS_NORTE = {
    "24": "TUMBES",
    "20": "PIURA",
    "14": "LAMBAYEQUE",
    "13": "LA LIBERTAD",
    "06": "CAJAMARCA",
}

# Sistemas de referencia
CRS_GEOGRAFICO = "EPSG:4326"   # WGS84, como vienen las fuentes
CRS_METRICO = "EPSG:32717"     # UTM zona 17S, para distancias, áreas, kriging y procesos puntuales

# Caja envolvente aproximada del ámbito (lon_min, lat_min, lon_max, lat_max)
BBOX_NORTE = (-81.5, -9.0, -77.6, -3.3)

# Cortes temporales SBS descargados
SBS_ANIOS_PANEL = list(range(2017, 2026))   # diciembre de cada año
SBS_CORTE_RECIENTE_CAJEROS = "ma2026"        # último corte trimestral de cajeros
SBS_CORTE_RECIENTE_OFICINAS = "di2025"       # último cierre anual de créditos/depósitos por oficina
