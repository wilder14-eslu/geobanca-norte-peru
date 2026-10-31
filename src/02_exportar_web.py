"""
Exporta los resultados de los notebooks a un único archivo de datos para la web.

Lee solo salidas ya generadas por el pipeline (data/processed y outputs/tablas) y escribe
assets/data/geobanca_web.js, que define window.GEOBANCA. Ninguna cifra de la web se escribe a mano:
si se vuelven a ejecutar los notebooks, basta correr este script para actualizar la página.

Uso:
    python src/02_exportar_web.py
"""
from __future__ import annotations

import json
from datetime import date
from pathlib import Path

import geopandas as gpd
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
PROCESSED = ROOT / "data" / "processed"
TABLES = ROOT / "outputs" / "tablas"
OUT = ROOT / "assets" / "data" / "geobanca_web.js"

CRS_METRIC = "EPSG:32717"
SIMPLIFY_TOLERANCE_M = 350  # tolerancia de simplificación de polígonos para la web
COORD_DECIMALS = 4  # ~11 m, suficiente para escala regional


MINOR_WORDS = {"de", "del", "la", "las", "los", "el", "y", "e"}


def title_es(name: str) -> str:
    """Título en español: 'VEINTISEIS DE OCTUBRE' -> 'Veintiseis de Octubre'."""
    words = str(name).lower().split()
    return " ".join(w if (i > 0 and w in MINOR_WORDS) else w[:1].upper() + w[1:] for i, w in enumerate(words))


def read_csv(name: str, folder: Path = PROCESSED) -> pd.DataFrame:
    return pd.read_csv(folder / name, dtype={"ubigeo": str})


def clean(value):
    """Convierte tipos de numpy y NaN a valores serializables en JSON."""
    if isinstance(value, (np.floating, float)):
        return None if np.isnan(value) else round(float(value), 4)
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.bool_,)):
        return bool(value)
    return value


def records(df: pd.DataFrame) -> list[dict]:
    return [{k: clean(v) for k, v in row.items()} for row in df.to_dict("records")]


def round_coords(geom: dict, nd: int) -> dict:
    def rec(c):
        if isinstance(c[0], (int, float)):
            return [round(c[0], nd), round(c[1], nd)]
        return [rec(x) for x in c]
    return {"type": geom["type"], "coordinates": rec(geom["coordinates"])}


def moran_global(gdf: gpd.GeoDataFrame, column: str) -> dict | None:
    """I de Moran con contigüidad Reina, igual que el notebook 03. Opcional si falta PySAL."""
    try:
        from esda.moran import Moran
        from libpysal.weights import Queen
    except ImportError:
        return None
    w = Queen.from_dataframe(gdf, use_index=False, silence_warnings=True)
    w.transform = "r"
    np.random.seed(42)  # p-valor por permutaciones reproducible
    mi = Moran(gdf[column].values, w, permutations=999)
    return {"I": round(float(mi.I), 3), "p_sim": round(float(mi.p_sim), 3), "variable": column}


def build_districts() -> tuple[gpd.GeoDataFrame, dict, dict]:
    geo = gpd.read_file(PROCESSED / "distritos_norte.geojson")[["ubigeo", "geometry"]]
    base = read_csv("base_aede.csv")
    lisa = read_csv("lisa_acceso.csv")[["ubigeo", "y", "lisa", "lisa_p", "gi_clase", "lisa_bv"]]
    rain = read_csv("lluvia_extrema_distrito.csv")[["ubigeo", "pp_1998", "pp_2017", "pp_2023", "indice_exposicion"]]
    prio = read_csv("priorizacion_distrital.csv")[
        ["ubigeo", "tasa_obs", "tasa_esperada", "brecha", "desatendido", "adultos_desatendidos",
         "canales_faltantes", "riesgo_pct", "oportunidad_pct", "cuadrante", "canales_urbanos_faltantes",
         "adultos_rurales_desatendidos", "sitios_mclp_P25"]]

    df = (geo.merge(base, on="ubigeo", how="left").merge(lisa, on="ubigeo", how="left")
          .merge(rain, on="ubigeo", how="left").merge(prio, on="ubigeo", how="left"))
    # Variable del notebook 03: raíz cuadrada de la tasa suavizada (columna y de lisa_acceso.csv)
    stats = {"moran_acceso": moran_global(df.to_crs(CRS_METRIC), "y")}

    # Nombres cortos para aligerar el archivo; el diccionario se documenta en la web (app.js)
    props = pd.DataFrame({
        "u": df.ubigeo, "n": df.distrito.map(title_es), "p": df.provincia.map(title_es), "d": df.departamento.map(title_es),
        "pob": df.pob_total_2025, "ad": df.pob_18mas.round(0), "urb": df.pct_urbana, "pobr": df.pobreza_2018,
        "alt": df.altitud_capital_m, "atm": df.n_atm, "cnb": df.n_corresponsal_establecimientos,
        "of": df.n_oficinas, "eob": df.n_eob, "pts": df.puntos_atencion, "tasa": df.puntos_x10k_adultos,
        "acc": df.acceso_eb, "dep_pc": df.depositos_pc_soles, "cred_pc": df.creditos_pc_soles,
        "lisa": df.lisa, "lisa_p": df.lisa_p, "gi": df.gi_clase, "bv": df.lisa_bv,
        "obs": df.tasa_obs, "esp": df.tasa_esperada, "brecha": df.brecha,
        "pp98": df.pp_1998, "pp17": df.pp_2017, "pp23": df.pp_2023, "expo": df.indice_exposicion,
        "rpct": df.riesgo_pct, "opct": df.oportunidad_pct, "cuad": df.cuadrante,
        "des": df.desatendido.fillna(False).astype(bool), "ad_des": df.adultos_desatendidos,
        "falt": df.canales_faltantes, "falt_urb": df.canales_urbanos_faltantes,
        "ad_rur": df.adultos_rurales_desatendidos, "sitios": df.sitios_mclp_P25,
    })

    simplified = (df[["geometry"]].to_crs(CRS_METRIC)
                  .simplify(SIMPLIFY_TOLERANCE_M, preserve_topology=True).to_crs(4326))
    features = []
    for geom, row in zip(simplified, records(props)):
        features.append({"type": "Feature", "properties": row,
                         "geometry": round_coords(geom.__geo_interface__, COORD_DECIMALS)})
    return df, {"type": "FeatureCollection", "features": features}, stats


def build_panel() -> list[dict]:
    """Totales por corte SBS. 'canales' = cajeros + establecimientos corresponsales + EOB (como el notebook 08)."""
    panel = read_csv("sbs_puntos_atencion_panel_distrito.csv")
    base = read_csv("base_aede.csv")[["ubigeo", "departamento"]]
    panel = panel.merge(base, on="ubigeo", how="inner")
    panel["canales"] = panel.atm + panel.corresponsal_establecimientos + panel.eob
    total = panel.groupby("corte")[["atm", "corresponsal_establecimientos", "eob", "canales"]].sum()
    by_dep = panel.pivot_table(index="corte", columns="departamento", values="canales", aggfunc="sum")
    out = []
    for corte in total.index:
        label = ("Mar " if corte.startswith("ma") else "Dic ") + corte[2:]
        row = {"corte": corte, "etiqueta": label, **{k: int(v) for k, v in total.loc[corte].items()}}
        row["por_departamento"] = {title_es(d): int(v) for d, v in by_dep.loc[corte].items()}
        out.append(row)
    return out


def build_kpis(df: pd.DataFrame) -> dict:
    adults = df.pob_18mas.sum()
    prio = read_csv("priorizacion_distrital.csv")
    return {
        "distritos": int(len(df)),
        "departamentos": int(df.departamento.nunique()),
        "poblacion": int(df.pob_total_2025.sum()),
        "adultos": int(round(adults)),
        "puntos_atencion": int(df.puntos_atencion.sum()),
        "atm": int(df.n_atm.sum()),
        "corresponsales": int(df.n_corresponsal_establecimientos.sum()),
        "oficinas": int(df.n_oficinas.sum()),
        "eob": int(df.n_eob.sum()),
        "puntos_x10k_adultos": round(1e4 * df.puntos_atencion.sum() / adults, 1),
        "mediana_distrital_x10k": round(float(df.puntos_x10k_adultos.median()), 1),
        "sin_punto_atencion": int(df.sin_punto_atencion.sum()),
        "sin_cajero": int((df.n_atm == 0).sum()),
        "sin_oficina": int((df.n_oficinas == 0).sum()),
        "distritos_desatendidos": int(prio.desatendido.sum()),
        "adultos_desatendidos": int(round(prio.adultos_desatendidos.sum())),
        "canales_faltantes": int(round(prio.canales_faltantes.sum())),
        "canales_urbanos_faltantes": int(round(prio.canales_urbanos_faltantes.sum())),
        "adultos_rurales_desatendidos": int(round(prio.adultos_rurales_desatendidos.sum())),
        "mediana_acceso_eb_departamento": {title_es(d): round(float(v), 1)
                                          for d, v in df.groupby("departamento").acceso_eb.median().items()},
    }


def main() -> None:
    df, districts, stats = build_districts()
    data = {
        "generado": date.today().isoformat(),
        "kpi": build_kpis(df),
        "estadisticos": stats,
        "panel": build_panel(),
        "modelos": records(read_csv("04_comparacion_modelos.csv", TABLES)),
        "interpolacion": records(read_csv("06_validacion_interpolacion.csv", TABLES)),
        "ml_cv": records(read_csv("08_acceso_potencial_cv_espacial.csv", TABLES)),
        "ml_cambio": records(read_csv("08_prediccion_cambio_anual.csv", TABLES)),
        "mclp": records(read_csv("09_mclp_exacto_vs_voraz.csv", TABLES)),
        "sitios": records(read_csv("09_sitios_mclp_P25.csv", TABLES)),
        "distritos": districts,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    OUT.write_text(f"// Generado por src/02_exportar_web.py el {data['generado']}. No editar a mano.\n"
                   f"window.GEOBANCA = {payload};\n", encoding="utf-8")
    print(f"{OUT.relative_to(ROOT)}: {OUT.stat().st_size / 1e3:,.0f} KB | Moran: {stats['moran_acceso']}")


if __name__ == "__main__":
    main()
