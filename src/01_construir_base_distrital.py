"""
01_construir_base_distrital.py

Construye la base distrital de la Macro Región Norte (Tumbes, Piura, Lambayeque,
La Libertad y Cajamarca) uniendo todas las fuentes por UBIGEO INEI, y deja las capas
puntuales listas para geoestadística y patrones puntuales.

Entradas : data/raw/*  (ver docs/catalogo_datos.md)
Salidas  : data/processed/*  y  outputs/tablas/reporte_verificacion.txt

Uso:  python src/01_construir_base_distrital.py
"""
import json
import shutil
import tempfile
import re
import sys
import warnings

import geopandas as gpd
import numpy as np
import pandas as pd

sys.path.insert(0, str(__import__("pathlib").Path(__file__).parent))
from config import (BBOX_NORTE, CRS_GEOGRAFICO, CRS_METRICO, DATA_INTERIM, DATA_PROCESSED,
                    DATA_RAW, DEPARTAMENTOS_NORTE, OUTPUTS, SBS_CORTE_RECIENTE_CAJEROS,
                    SBS_CORTE_RECIENTE_OFICINAS)
from utils_ubigeo import asignar_ubigeo, cargar_ubigeos, leer_excel_sbs, normalizar

warnings.filterwarnings("ignore")
for d in (DATA_INTERIM, DATA_PROCESSED, OUTPUTS / "tablas"):
    d.mkdir(parents=True, exist_ok=True)

REPORTE: list[str] = []


def log(msg: str) -> None:
    print(msg)
    REPORTE.append(msg)


def es_norte(ubigeo) -> bool:
    return isinstance(ubigeo, str) and ubigeo[:2] in DEPARTAMENTOS_NORTE


def a_numero(v):
    return pd.to_numeric(v, errors="coerce")


# ---------------------------------------------------------------------------
# 1. Límites distritales (INEI vía Peru-maps, 2026)
# ---------------------------------------------------------------------------
def cargar_limites() -> gpd.GeoDataFrame:
    g = gpd.read_file(DATA_RAW / "limites" / "distrito.geojson")
    g = g[g["ubigeo_departamento"].isin(DEPARTAMENTOS_NORTE)].copy()
    g = g[["ubigeo", "nombre", "nombre_provincia", "nombre_departamento", "fuente", "confianza", "geometry"]]
    g = g.rename(columns={"nombre": "distrito", "nombre_provincia": "provincia", "nombre_departamento": "departamento"})
    g["area_km2"] = g.to_crs(CRS_METRICO).area / 1e6
    log(f"[límites] distritos en el ámbito: {len(g)}  "
        f"({g.groupby('departamento').size().to_dict()})")
    return g


# ---------------------------------------------------------------------------
# 2. Censo 2025 (INEI): población por distrito, área urbana/rural y edad
# ---------------------------------------------------------------------------
DEP_NOMBRES = {normalizar(x) for x in [
    "AMAZONAS", "ANCASH", "APURIMAC", "AREQUIPA", "AYACUCHO", "CAJAMARCA", "CALLAO", "CUSCO",
    "HUANCAVELICA", "HUANUCO", "ICA", "JUNIN", "LA LIBERTAD", "LAMBAYEQUE", "LIMA", "LORETO",
    "MADRE DE DIOS", "MOQUEGUA", "PASCO", "PIURA", "PUNO", "SAN MARTIN", "TACNA", "TUMBES", "UCAYALI",
    "LIMA METROPOLITANA", "REGION LIMA", "PROVINCIA CONSTITUCIONAL DEL CALLAO"]}


def _jerarquia_censo(hoja: pd.DataFrame):
    """Recorre un cuadro del censo y devuelve (dep, prov, dist, fila) para cada fila de distrito y sus filas hijas."""
    dep = prov = dist = None
    for idx, row in hoja.iterrows():
        etiqueta = row[0]
        if not isinstance(etiqueta, str):
            continue
        etq = etiqueta.strip()
        n = normalizar(etq)
        if n.startswith("PROV CONSTITUCIONAL") or n.startswith("PROVINCIA CONSTITUCIONAL"):
            dep, prov, dist = "CALLAO", "CALLAO", None
            yield ("prov", dep, prov, dist, row)
        elif n == "LIMA METROPOLITANA" or n.startswith("REGION LIMA"):
            dep, prov, dist = "LIMA", None, None
            yield ("dep", dep, prov, dist, row)
        elif n.startswith("DEPARTAMENTO "):
            dep, prov, dist = n.replace("DEPARTAMENTO ", ""), None, None
            yield ("dep", dep, prov, dist, row)
        elif n in DEP_NOMBRES and etq.isupper():
            dep, prov, dist = n, None, None
            yield ("dep", dep, prov, dist, row)
        elif n.startswith("PROVINCIA "):
            prov, dist = n.replace("PROVINCIA ", ""), None
            yield ("prov", dep, prov, dist, row)
        elif n.startswith("DISTRITO "):
            dist = n.replace("DISTRITO ", "")
            yield ("dist", dep, prov, dist, row)
        else:
            yield ("fila", dep, prov, dist, row)


def cargar_censo(ubigeos: pd.DataFrame) -> pd.DataFrame:
    ruta = DATA_RAW / "censo2025" / "INEI_censo2025_01_indicadores_demograficos.xlsx"

    # INDDEM01: población censada total/urbana/rural por distrito.
    # La estructura de edad solo se publica hasta provincia: la proporción de menores de 18
    # y de 60+ de cada provincia se aplica a sus distritos (estimación, ver catálogo).
    h1 = pd.read_excel(ruta, sheet_name="INDDEM01", header=None)
    regs, edad_prov, actual_prov = [], {}, None
    for tipo, dep, prov, dist, row in _jerarquia_censo(h1):
        if tipo == "dist":
            actual_prov = None
            regs.append({"dep": dep, "prov": prov, "dist": dist, "pob_censada": a_numero(row[1]),
                         "pob_urbana": a_numero(row[4]), "pob_rural": a_numero(row[7])})
        elif tipo == "prov":
            actual_prov = (dep, prov)
            edad_prov[actual_prov] = {"total": a_numero(row[1]), "menor18": 0.0, "mas60": 0.0}
        elif tipo == "dep":
            actual_prov = None
        elif tipo == "fila" and actual_prov is not None:
            etq = str(row[0]).strip()
            v = a_numero(row[1])
            if pd.isna(v):
                continue
            m = re.match(r"^De (\d+) a (\d+) años", etq)
            if etq == "Menores de 1 año" or etq in ("15 años", "16 años", "17 años") or (m and int(m.group(2)) <= 14):
                edad_prov[actual_prov]["menor18"] += v
            if (m and int(m.group(1)) >= 60) or etq.startswith("De 100"):
                edad_prov[actual_prov]["mas60"] += v
    c1 = pd.DataFrame(regs)
    ep = pd.DataFrame([{"dep": k[0], "prov": k[1], "sh_menor18_prov": v["menor18"] / v["total"],
                        "sh_60mas_prov": v["mas60"] / v["total"]} for k, v in edad_prov.items() if v["total"]])
    c1 = c1.merge(ep, on=["dep", "prov"], how="left")

    # INDDEM06: población total (censada + omitida estimada)
    h6 = pd.read_excel(ruta, sheet_name="INDDEM06", header=None)
    regs6 = [{"dep": dep, "prov": prov, "dist": dist, "pob_total_2025": a_numero(row[1]),
              "pob_omitida": a_numero(row[7])}
             for tipo, dep, prov, dist, row in _jerarquia_censo(h6) if tipo == "dist"]
    c6 = pd.DataFrame(regs6)

    c = c1.merge(c6, on=["dep", "prov", "dist"], how="outer")
    c = asignar_ubigeo(c, "dep", "prov", "dist", ubigeos)
    sin = c[c["ubigeo"].isna()]
    sin.to_csv(DATA_INTERIM / "no_emparejados_censo2025.csv", index=False)
    c = c[c["ubigeo"].map(es_norte)]
    c["pob_18mas"] = c["pob_total_2025"] * (1 - c["sh_menor18_prov"])   # estimada con la estructura provincial
    c["pob_60mas"] = c["pob_total_2025"] * c["sh_60mas_prov"]
    c["pct_urbana"] = 100 * c["pob_urbana"] / c["pob_censada"]
    c["pct_60mas_prov"] = 100 * c["sh_60mas_prov"]
    log(f"[censo 2025] distritos leídos en el país: {len(c1)} | sin ubigeo: {len(sin)} | en el ámbito: {len(c)}")
    return c[["ubigeo", "pob_total_2025", "pob_censada", "pob_omitida", "pob_urbana", "pob_rural",
              "pob_18mas", "pob_60mas", "pct_urbana", "pct_60mas_prov"]]


# ---------------------------------------------------------------------------
# 3. Mapa de pobreza monetaria 2018 (INEI) + IDH 2019 y altitud (ubigeo aumentado)
# ---------------------------------------------------------------------------
def cargar_pobreza() -> pd.DataFrame:
    p = pd.read_excel(DATA_RAW / "pobreza2018" / "INEI_mapa_pobreza_2018_anexo_estadistico.xlsx",
                      sheet_name="Anexo1", header=None, skiprows=6, dtype={0: str})
    p = p.iloc[:, :9]
    p.columns = ["ubigeo", "dep", "prov", "dist", "pob_proy_2020", "pobreza_ic_inf", "pobreza_ic_sup",
                 "grupo_robusto", "ranking_pobreza"]
    p = p[p["ubigeo"].astype(str).str.fullmatch(r"\d{6}")].copy()
    for col in ["pobreza_ic_inf", "pobreza_ic_sup", "grupo_robusto", "ranking_pobreza"]:
        p[col] = a_numero(p[col])
    # El INEI publica el intervalo de confianza al 95%; usamos el punto medio como estimación puntual
    p["pobreza_2018"] = (p["pobreza_ic_inf"] + p["pobreza_ic_sup"]) / 2
    p = p[p["ubigeo"].map(es_norte)]
    log(f"[pobreza 2018] distritos en el ámbito: {len(p)}")
    return p[["ubigeo", "pobreza_2018", "pobreza_ic_inf", "pobreza_ic_sup", "grupo_robusto"]]


def cargar_ubigeo_aumentado() -> pd.DataFrame:
    u = pd.read_csv(DATA_RAW / "ubigeo" / "ubigeo_distrito.csv", dtype={"inei": str})
    u = u.rename(columns={"inei": "ubigeo", "altitude": "altitud_capital_m", "idh_2019": "idh_2019",
                          "indice_vulnerabilidad_alimentaria": "ivia",
                          "latitude": "lat_capital", "longitude": "lon_capital"})
    u = u[u["ubigeo"].map(es_norte)]
    return u[["ubigeo", "altitud_capital_m", "idh_2019", "ivia", "lat_capital", "lon_capital"]]


# ---------------------------------------------------------------------------
# 4. SBS: cajeros automáticos, cajeros corresponsales y EOB por distrito (todas las entidades)
# ---------------------------------------------------------------------------
TIPO_ENTIDAD = {"B-2364": "banca_multiple", "B-3261": "financieras", "C-1236": "cajas_municipales",
                "C-2241": "cajas_rurales", "C-4230": "edpymes", "B-5216": "banco_de_la_nacion"}


def _tabla_sbs(hoja: pd.DataFrame):
    """Devuelve (encabezado, subencabezado, datos con empresa/dep/prov/dist rellenados)."""
    col0 = hoja[0].astype(str).str.strip()
    filas = hoja.index[col0 == "Empresa"]
    if len(filas) == 0:
        return None
    r = filas[0]
    enc = [str(v) if pd.notna(v) else "" for v in hoja.iloc[r].tolist()]
    sub = [str(v) if pd.notna(v) else "" for v in hoja.iloc[r + 1].tolist()]
    datos = hoja.iloc[r + 2:].copy()
    datos = datos[~datos[0].astype(str).str.contains("Total|Nota|Fuente|\\*", case=False, na=False)]
    datos[[0, 1, 2]] = datos[[0, 1, 2]].ffill()
    datos = datos[datos[3].notna()]
    return enc, sub, datos


def cargar_sbs_cajeros(ubigeos: pd.DataFrame) -> pd.DataFrame:
    regs = []
    for ruta in sorted((DATA_RAW / "sbs").glob("*.XLS")):
        codigo = ruta.stem.rsplit("-", 1)[0]
        corte = ruta.stem.rsplit("-", 1)[1]
        if codigo not in TIPO_ENTIDAD:
            continue
        x = leer_excel_sbs(ruta)
        for hoja_nombre in x.sheet_names:
            t = _tabla_sbs(x.parse(hoja_nombre, header=None))
            if t is None:
                continue
            enc, sub, datos = t
            h4 = enc[4].lower() if len(enc) > 4 else ""
            if "eob" in hoja_nombre.lower() or "operaciones" in h4 or ("establecimiento" in h4 and len([e for e in enc[4:] if e]) == 1 and "corresp" not in " ".join(enc).lower()):
                canales = {4: "eob"}
            elif "autom" in h4:
                canales = {4: "atm"}
            else:
                canales = {4: "corresponsal_establecimientos", 5: "corresponsal_cajeros"}
            for col, canal in canales.items():
                if col >= datos.shape[1]:
                    continue
                df = pd.DataFrame({"empresa": datos[0].values, "dep": datos[1].values, "prov": datos[2].values,
                                   "dist": datos[3].values, "n": a_numero(datos[col]).values})
                df["canal"], df["entidad"], df["corte"] = canal, TIPO_ENTIDAD[codigo], corte
                regs.append(df[df["n"].notna()])
    sbs = pd.concat(regs, ignore_index=True)
    sbs = asignar_ubigeo(sbs, "dep", "prov", "dist", ubigeos)
    sin = sbs[sbs["ubigeo"].isna()][["dep", "prov", "dist"]].drop_duplicates()
    sin.to_csv(DATA_INTERIM / "no_emparejados_sbs_cajeros.csv", index=False)
    log(f"[SBS cajeros] registros: {len(sbs)} | combinaciones dep-prov-dist sin ubigeo (todo el país): {len(sin)}")
    sbs.to_csv(DATA_INTERIM / "sbs_cajeros_largo_peru.csv", index=False)
    return sbs[sbs["ubigeo"].map(es_norte)]


def cargar_sbs_oficinas(ubigeos: pd.DataFrame) -> pd.DataFrame:
    """Oficinas, depósitos y créditos directos por distrito (miles de soles), cierre de año."""
    archivos = {"B-2358": "banca_multiple", "B-3241": "financieras", "C-1234": "cajas_municipales",
                "C-2234": "cajas_rurales", "C-4228": "edpymes", "B-5215": "banco_de_la_nacion"}
    regs = []
    for codigo, entidad in archivos.items():
        for ruta in sorted((DATA_RAW / "sbs").glob(f"{codigo}-*.XLS")):
            corte = ruta.stem.rsplit("-", 1)[1]
            x = leer_excel_sbs(ruta)
            t = _tabla_sbs(x.parse(x.sheet_names[0], header=None))
            if t is None:
                continue
            enc, sub, datos = t
            datos = datos[a_numero(datos[4]).notna()]
            i_dep = enc.index("Total Depósitos") if "Total Depósitos" in enc else None
            if "Total Créditos" in enc:
                i_cred = enc.index("Total Créditos")
            else:
                ini = next(i for i, e in enumerate(enc) if e.startswith("Créditos"))
                i_cred = next(i for i in range(ini, len(sub)) if sub[i] == "Total")
            regs.append(pd.DataFrame({
                "entidad": entidad, "corte": corte, "empresa": datos[0].values, "dep": datos[1].values,
                "prov": datos[2].values, "dist": datos[3].values, "codigo_oficina": datos[4].values,
                "depositos_miles": a_numero(datos[i_dep]).values if i_dep is not None else np.nan,
                "creditos_miles": a_numero(datos[i_cred]).values}))
    of = pd.concat(regs, ignore_index=True)
    of = asignar_ubigeo(of, "dep", "prov", "dist", ubigeos)
    of[of["ubigeo"].isna()][["dep", "prov", "dist"]].drop_duplicates().to_csv(
        DATA_INTERIM / "no_emparejados_sbs_oficinas.csv", index=False)
    of.to_csv(DATA_INTERIM / "sbs_oficinas_peru.csv", index=False)
    of = of[of["ubigeo"].map(es_norte)]
    log(f"[SBS oficinas] oficinas en el ámbito por corte: {of.groupby('corte').size().to_dict()}")
    return of


# ---------------------------------------------------------------------------
# 5. Capas puntuales: OSM, estaciones SENAMHI, centros poblados
# ---------------------------------------------------------------------------
def capa_osm() -> gpd.GeoDataFrame:
    js = json.loads((DATA_RAW / "osm" / "overpass_bancos_atm_norte_2026-10-16.json").read_text(encoding="utf-8"))
    filas = []
    for e in js["elements"]:
        lat = e.get("lat", e.get("center", {}).get("lat"))
        lon = e.get("lon", e.get("center", {}).get("lon"))
        tg = e.get("tags", {})
        filas.append({"osm_id": f"{e['type']}/{e['id']}", "amenity": tg.get("amenity", "atm"),
                      "nombre": tg.get("name"), "operador": tg.get("operator"), "marca": tg.get("brand"),
                      "lat": lat, "lon": lon})
    df = pd.DataFrame(filas)
    return gpd.GeoDataFrame(df, geometry=gpd.points_from_xy(df.lon, df.lat), crs=CRS_GEOGRAFICO)


def capa_estaciones() -> gpd.GeoDataFrame:
    e = pd.read_csv(DATA_RAW / "senamhi" / "estaciones_red_actual.csv", dtype=str, encoding="utf-8-sig")
    e["lat"], e["lon"] = e["lat"].astype(float), e["lon"].astype(float)
    g = gpd.GeoDataFrame(e, geometry=gpd.points_from_xy(e.lon, e.lat), crs=CRS_GEOGRAFICO)
    return g[g["tipo"] == "M"]


def capa_ccpp() -> gpd.GeoDataFrame:
    c = pd.read_csv(DATA_RAW / "ubigeo" / "ubigeo_ccpp.csv", dtype={"inei_ccpp": str, "inei_distrito": str})
    c = c[c["inei_distrito"].map(es_norte)].dropna(subset=["latitude", "longitude"])
    return gpd.GeoDataFrame(c, geometry=gpd.points_from_xy(c.longitude, c.latitude), crs=CRS_GEOGRAFICO)


# ---------------------------------------------------------------------------
# Principal
# ---------------------------------------------------------------------------
def main() -> None:
    ubigeos = cargar_ubigeos()
    g = cargar_limites()

    censo = cargar_censo(ubigeos)
    pobreza = cargar_pobreza()
    aum = cargar_ubigeo_aumentado()

    sbs = cargar_sbs_cajeros(ubigeos)
    panel = (sbs.groupby(["ubigeo", "corte", "canal"])["n"].sum()
             .unstack("canal", fill_value=0).reset_index())
    panel.to_csv(DATA_PROCESSED / "sbs_puntos_atencion_panel_distrito.csv", index=False)
    log(f"[SBS cajeros] cortes en el panel: {sorted(panel['corte'].unique())}")
    reciente = panel[panel["corte"] == SBS_CORTE_RECIENTE_CAJEROS].drop(columns="corte")
    reciente = reciente.rename(columns={c: f"n_{c}" for c in reciente.columns if c != "ubigeo"})

    of = cargar_sbs_oficinas(ubigeos)
    of_ult = (of[of["corte"] == SBS_CORTE_RECIENTE_OFICINAS]
              .groupby("ubigeo").agg(n_oficinas=("codigo_oficina", "count"),
                                     depositos_miles=("depositos_miles", "sum"),
                                     creditos_miles=("creditos_miles", "sum")).reset_index())
    of.to_csv(DATA_PROCESSED / "sbs_oficinas_norte.csv", index=False)

    base = (g.merge(censo, on="ubigeo", how="left").merge(pobreza, on="ubigeo", how="left")
             .merge(aum, on="ubigeo", how="left").merge(reciente, on="ubigeo", how="left")
             .merge(of_ult, on="ubigeo", how="left"))
    conteos = [c for c in base.columns if c.startswith("n_")] + ["depositos_miles", "creditos_miles"]
    base[conteos] = base[conteos].fillna(0)
    base["densidad_hab_km2"] = base["pob_total_2025"] / base["area_km2"]
    base["puntos_atencion"] = base[["n_atm", "n_corresponsal_establecimientos", "n_oficinas"]].sum(axis=1) + base.get("n_eob", 0)
    adultos = base["pob_18mas"].replace(0, np.nan)
    base["puntos_x10k_adultos"] = 1e4 * base["puntos_atencion"] / adultos
    base["atm_x10k_adultos"] = 1e4 * base["n_atm"] / adultos
    base["corresp_x10k_adultos"] = 1e4 * base["n_corresponsal_establecimientos"] / adultos
    base["creditos_pc_soles"] = 1e3 * base["creditos_miles"] / base["pob_18mas"]
    base["depositos_pc_soles"] = 1e3 * base["depositos_miles"] / base["pob_18mas"]
    base["sin_punto_atencion"] = (base["puntos_atencion"] == 0).astype(int)

    # El GeoPackage es SQLite: se escribe en una carpeta temporal local y luego se copia
    # (evita errores de bloqueo en carpetas sincronizadas o montadas en red).
    tmp_gpkg = __import__("pathlib").Path(tempfile.mkdtemp()) / "geobanca_norte.gpkg"
    base.to_file(tmp_gpkg, layer="distritos", driver="GPKG")
    base.drop(columns="geometry").to_csv(DATA_PROCESSED / "base_distrital_norte.csv", index=False)

    osm = gpd.sjoin(capa_osm(), g[["ubigeo", "geometry"]], how="inner", predicate="within").drop(columns="index_right")
    est = gpd.sjoin(capa_estaciones(), g[["ubigeo", "geometry"]], how="left", predicate="within").drop(columns="index_right")
    est = est[est.within(g.union_all().buffer(0.3))]
    ccpp = capa_ccpp()
    osm.to_file(tmp_gpkg, layer="osm_bancos_atm", driver="GPKG")
    est.to_file(tmp_gpkg, layer="senamhi_estaciones", driver="GPKG")
    ccpp.to_file(tmp_gpkg, layer="centros_poblados", driver="GPKG")

    shutil.copy(tmp_gpkg, DATA_PROCESSED / "geobanca_norte.gpkg")
    tmp_geojson = tmp_gpkg.with_name("distritos_norte.geojson")
    base.to_crs(CRS_GEOGRAFICO).to_file(tmp_geojson, driver="GeoJSON")
    shutil.copy(tmp_geojson, DATA_PROCESSED / "distritos_norte.geojson")

    # Verificación
    log("")
    log("=== VERIFICACIÓN ===")
    log(f"Distritos en la base: {len(base)}")
    for col in ["pob_total_2025", "pob_18mas", "pobreza_2018", "idh_2019", "n_atm",
                "n_corresponsal_establecimientos", "n_oficinas"]:
        log(f"  {col:34s} faltantes: {base[col].isna().sum():4d}   suma/media: "
            f"{base[col].sum():,.0f} / {base[col].mean():,.2f}")
    log(f"  Distritos sin ningún punto de atención: {base['sin_punto_atencion'].sum()}")
    log(f"  Población total 2025 del ámbito: {base['pob_total_2025'].sum():,.0f}")
    log(f"Capas puntuales -> OSM: {len(osm)} | estaciones SENAMHI (meteo): {len(est)} | centros poblados: {len(ccpp)}")
    (OUTPUTS / "tablas" / "reporte_verificacion.txt").write_text("\n".join(REPORTE), encoding="utf-8")


if __name__ == "__main__":
    main()
