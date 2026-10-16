"""
Utilidades para normalizar nombres de lugares y asignar UBIGEO (INEI)
a tablas que solo traen departamento / provincia / distrito por nombre (SBS, Censo).
"""
import re
import unicodedata

import pandas as pd

from config import DATA_RAW


def normalizar(texto) -> str:
    """Mayúsculas, sin tildes, sin signos, espacios simples."""
    if texto is None or (isinstance(texto, float) and pd.isna(texto)):
        return ""
    s = unicodedata.normalize("NFKD", str(texto))
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.upper().replace("´", "").replace("'", "")
    s = re.sub(r"[^A-Z0-9 ]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def cargar_ubigeos() -> pd.DataFrame:
    """Distritos oficiales INEI 2026 con claves normalizadas para cruzar por nombre."""
    u = pd.read_csv(DATA_RAW / "limites" / "ubigeos_2026.csv", dtype=str)
    d = u[u["nivel"] == "distrito"].copy()
    d["dep_n"] = d["nombre_departamento"].map(normalizar)
    d["prov_n"] = d["nombre_provincia"].map(normalizar)
    d["dist_n"] = d["nombre"].map(normalizar)
    return d[["ubigeo", "nombre", "nombre_provincia", "nombre_departamento", "dep_n", "prov_n", "dist_n"]]


# Equivalencias manuales para nombres que difieren entre fuentes.
# Formato: (departamento, provincia, distrito) normalizados de la fuente -> ubigeo INEI.
# Completar a partir de data/interim/no_emparejados_*.csv si aparecen casos nuevos.
EQUIVALENCIAS_MANUALES: dict[tuple[str, str, str], str] = {}


def asignar_ubigeo(df: pd.DataFrame, col_dep: str, col_prov: str, col_dist: str,
                   ubigeos: pd.DataFrame | None = None) -> pd.DataFrame:
    """
    Agrega la columna 'ubigeo' cruzando por nombre normalizado.
    Orden: (dep, prov, dist) exacto -> equivalencia manual -> (dep, dist) si es único.
    """
    if ubigeos is None:
        ubigeos = cargar_ubigeos()
    out = df.copy()
    out["_dep"] = out[col_dep].map(normalizar)
    out["_prov"] = out[col_prov].map(normalizar)
    out["_dist"] = out[col_dist].map(normalizar)

    k3 = {(r.dep_n, r.prov_n, r.dist_n): r.ubigeo for r in ubigeos.itertuples()}
    provs = set(zip(ubigeos.dep_n, ubigeos.prov_n))
    cnt = ubigeos.groupby(["dep_n", "dist_n"])["ubigeo"].agg(list)
    k2 = {k: v[0] for k, v in cnt.items() if len(v) == 1}
    por_prov = ubigeos.groupby(["dep_n", "prov_n"])[["dist_n", "ubigeo"]].apply(
        lambda d: list(zip(d.dist_n, d.ubigeo))).to_dict()

    def _match(r):
        key = (r["_dep"], r["_prov"], r["_dist"])
        if key in k3:
            return k3[key]
        if key in EQUIVALENCIAS_MANUALES:
            return EQUIVALENCIAS_MANUALES[key]
        if (r["_dep"], r["_prov"]) not in provs:
            # la provincia viene escrita distinto: se acepta (dep, dist) solo si es único
            return k2.get((r["_dep"], r["_dist"]))
        # nombres truncados en la fuente (p. ej. "SANTA CRUZ DE TOLED" en el Censo)
        if len(r["_dist"]) >= 8:
            cand = [u for d, u in por_prov.get((r["_dep"], r["_prov"]), []) if d.startswith(r["_dist"])]
            if len(cand) == 1:
                return cand[0]
        return None

    out["ubigeo"] = out.apply(_match, axis=1)
    return out.drop(columns=["_dep", "_prov", "_dist"])


def leer_excel_sbs(ruta) -> pd.ExcelFile:
    """Los .XLS de la SBS mezclan formato xlsx (zip) y xls antiguo (BIFF)."""
    with open(ruta, "rb") as f:
        firma = f.read(2)
    return pd.ExcelFile(ruta, engine="openpyxl" if firma == b"PK" else "xlrd")
