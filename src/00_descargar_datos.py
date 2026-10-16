"""
00_descargar_datos.py

Descarga (o vuelve a descargar) todas las fuentes del proyecto en data/raw/.
Pensado para correr en tu PC con internet normal: algunas fuentes oficiales bloquean
servidores en la nube.

Uso:
    python src/00_descargar_datos.py              # fuentes base (GitHub, SBS, OSM, catálogo SENAMHI)
    python src/00_descargar_datos.py --chirps     # + precipitación CHIRPS (meses El Niño, ~14 MB c/u)
    python src/00_descargar_datos.py --dem        # + modelo de elevación Copernicus GLO-90 (~30 teselas)
    python src/00_descargar_datos.py --forzar     # vuelve a bajar aunque el archivo exista
    python src/00_descargar_datos.py --osm-actualizar  # consulta OSM de nuevo (por defecto usa la copia del repo)

No descarga datos diarios de estaciones SENAMHI: ese portal exige registro o captcha.
Ver docs/guia_senamhi.md.
"""
import argparse
import gzip
import json
import re
import shutil
import sys
import time
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).parent))
from config import DATA_RAW, SBS_ANIOS_PANEL

UA = {"User-Agent": "Mozilla/5.0 (proyecto academico UNMSM - Estadistica Espacial)"}
GH = "https://raw.githubusercontent.com"

# Versiones fijas (commit) de cada repositorio, para que cualquiera obtenga exactamente los mismos
# archivos usados en el análisis (verificados el 16/10/2026). Para usar la última versión, cambiar por "HEAD".
VERSION = {
    "Rodasluis/Peru-maps": "f2553240055092daa16ace1eb4ba614d09f1ca56",                       # 21/09/2026
    "jmcastagnetto/ubigeo-peru-aumentado": "a783fa66effb16fa8f3321b49a3d5e71cab15a5c",       # 24/01/2022
    "AlejandroPerezPortocarrero/mapadepobreza2018_peru": "ee681cb724f752531f1fd292c7940e3c3a0d8edc",  # 20/04/2021
    "carlosperez100/censo-peru-2025": "92aa6006bc283829e5acb77fa274a62038be98df",            # 11/07/2026
}


def gh(repo: str, ruta: str) -> str:
    return f"{GH}/{repo}/{VERSION[repo]}/{ruta}"


FUENTES_GITHUB = {
    # Límites INEI 2026 (pipeline reproducible sobre el WFS del INEI)
    "limites/distrito.geojson": gh("Rodasluis/Peru-maps", f"salida/distrito.geojson"),
    "limites/distrito_simplificado.geojson": gh("Rodasluis/Peru-maps", f"salida/distrito_simplificado.geojson"),
    "limites/provincia_simplificado.geojson": gh("Rodasluis/Peru-maps", f"salida/provincia_simplificado.geojson"),
    "limites/departamento_simplificado.geojson": gh("Rodasluis/Peru-maps", f"salida/departamento_simplificado.geojson"),
    "limites/ubigeos_2026.csv": gh("Rodasluis/Peru-maps", f"salida/ubigeos_2026.csv"),
    # Ubigeo aumentado y centros poblados con coordenadas
    "ubigeo/ubigeo_distrito.csv": gh("jmcastagnetto/ubigeo-peru-aumentado", f"ubigeo_distrito.csv"),
    "ubigeo/ubigeo_ccpp.csv": gh("jmcastagnetto/ubigeo-peru-aumentado", f"ubigeo_ccpp.csv"),
    # Mapa de pobreza monetaria 2018 (anexos oficiales del INEI)
    "pobreza2018/INEI_mapa_pobreza_2018_anexo_estadistico.xlsx":
        gh("AlejandroPerezPortocarrero/mapadepobreza2018_peru", f"2_Anexo%20Estadistico.xlsx"),
    "pobreza2018/INEI_mapa_pobreza_2018_diccionario.xlsx":
        gh("AlejandroPerezPortocarrero/mapadepobreza2018_peru", f"3_Anexo%20Metodologico%201%20-%20Diccionario.xlsx"),
    "pobreza2018/INEI_mapa_pobreza_2018_informe.pdf":
        gh("AlejandroPerezPortocarrero/mapadepobreza2018_peru", f"Informe%20de%20pobreza%202018%20-%20INEI.pdf"),
}
# Tabulados oficiales del Censo 2025 (copia de censos2025.inei.gob.pe)
for _f in ["01_indicadores_demograficos", "02_fecundidad", "03_migracion", "04_estado_civil_identidad_seguro",
           "05_educacion", "06_discapacidad", "07_etnicidad", "08_poblacion_edad_trabajar",
           "09_vivienda_caracteristicas", "10_vivienda_servicios"]:
    FUENTES_GITHUB[f"censo2025/INEI_censo2025_{_f}.xlsx"] = gh("carlosperez100/censo-peru-2025", f"raw/{_f}.xlsx")

# SBS: código de cuadro -> descripción. Cajeros: trimestral; oficinas: mensual.
SBS_CAJEROS = {"B-2364": "banca múltiple", "B-3261": "financieras", "C-1236": "cajas municipales",
               "C-2241": "cajas rurales", "C-4230": "edpymes", "B-5216": "Banco de la Nación"}
SBS_OFICINAS_ZONA = {"B-2303": "banca múltiple, oficinas por departamento"}
SBS_POR_OFICINA = {"B-2358": "banca múltiple", "B-3241": "financieras", "C-1234": "cajas municipales",
                   "C-2234": "cajas rurales", "C-4228": "edpymes", "B-5215": "Banco de la Nación"}
SBS_BASE = "https://intranet2.sbs.gob.pe/estadistica/financiera"
MESES = {"di": "Diciembre", "ma": "Marzo", "ag": "Agosto", "jn": "Junio", "se": "Setiembre"}


def bajar(url: str, destino: Path, forzar: bool = False, intentos: int = 3) -> bool:
    destino.parent.mkdir(parents=True, exist_ok=True)
    if destino.exists() and destino.stat().st_size > 0 and not forzar:
        print(f"  ya existe  {destino.relative_to(DATA_RAW)}")
        return True
    for k in range(intentos):
        try:
            with requests.get(url, headers=UA, stream=True, timeout=120) as r:
                r.raise_for_status()
                tmp = destino.with_suffix(destino.suffix + ".part")
                with open(tmp, "wb") as f:
                    shutil.copyfileobj(r.raw, f)
                tmp.replace(destino)
            print(f"  OK        {destino.relative_to(DATA_RAW)}  ({destino.stat().st_size/1e6:.2f} MB)")
            return True
        except Exception as e:  # noqa: BLE001
            print(f"  intento {k+1} falló: {url} -> {e}")
            time.sleep(3 * (k + 1))
    return False


def sbs_url(codigo: str, corte: str) -> str:
    mes, anio = corte[:2], corte[2:]
    return f"{SBS_BASE}/{anio}/{MESES[mes]}/{codigo}-{corte}.XLS"


def descargar_sbs(forzar: bool) -> None:
    print("\n[SBS]")
    cortes_panel = [f"di{a}" for a in SBS_ANIOS_PANEL]
    for codigo in SBS_CAJEROS:
        for corte in cortes_panel + ["ma2026"]:
            bajar(sbs_url(codigo, corte), DATA_RAW / "sbs" / f"{codigo}-{corte}.XLS", forzar)
    for codigo in SBS_OFICINAS_ZONA:
        for corte in cortes_panel + ["ag2026"]:
            bajar(sbs_url(codigo, corte), DATA_RAW / "sbs" / f"{codigo}-{corte}.XLS", forzar)
    for codigo in SBS_POR_OFICINA:
        for corte in ["di2023", "di2024", "di2025"]:
            bajar(sbs_url(codigo, corte), DATA_RAW / "sbs" / f"{codigo}-{corte}.XLS", forzar)


def descargar_osm(forzar: bool) -> None:
    print("\n[OpenStreetMap / Overpass]")
    existentes = sorted((DATA_RAW / "osm").glob("overpass_bancos_atm_norte_*.json"))
    if existentes and not forzar:
        print(f"  se usa la copia versionada {existentes[-1].name} (para actualizar: --osm-actualizar)")
        return
    destino = DATA_RAW / "osm" / f"overpass_bancos_atm_norte_{time.strftime('%Y-%m-%d')}.json"
    q = """[out:json][timeout:180];
(area["ISO3166-2"="PE-TUM"];area["ISO3166-2"="PE-PIU"];area["ISO3166-2"="PE-LAM"];
 area["ISO3166-2"="PE-LAL"];area["ISO3166-2"="PE-CAJ"];)->.a;
(nwr["amenity"~"^(bank|atm|bureau_de_change|money_transfer|payment_centre)$"](area.a);
 nwr["atm"="yes"](area.a););
out center tags;"""
    for espera in (0, 20, 60):
        time.sleep(espera)
        r = requests.post("https://overpass-api.de/api/interpreter", data={"data": q}, headers=UA, timeout=240)
        if r.ok:
            destino.parent.mkdir(parents=True, exist_ok=True)
            destino.write_text(r.text, encoding="utf-8")
            print(f"  OK  {destino.name}  ({len(r.json()['elements'])} elementos)")
            return
        print(f"  Overpass respondió {r.status_code}, reintentando...")


def descargar_catalogo_senamhi(forzar: bool) -> None:
    """Coordenadas y códigos de estaciones, tomados de los mapas públicos de SENAMHI."""
    print("\n[SENAMHI - catálogo de estaciones]")
    import pandas as pd
    d = DATA_RAW / "senamhi"
    d.mkdir(parents=True, exist_ok=True)
    if not (d / "estaciones_red_actual.csv").exists() or forzar:
        h = requests.get("https://www.senamhi.gob.pe/mapas/mapa-estaciones-2/", headers=UA, timeout=60).text
        bloque = h[h.index("PruebaTest = [") + 13: h.index("];", h.index("PruebaTest")) + 1]
        est = pd.DataFrame(json.loads(bloque))
        est = est.rename(columns={"cod": "codigo", "cod_old": "codigo_antiguo", "nom": "nombre",
                                  "cate": "categoria", "ico": "tipo"})
        est[["codigo", "codigo_antiguo", "nombre", "categoria", "tipo", "estado", "lat", "lon"]].to_csv(
            d / "estaciones_red_actual.csv", index=False, encoding="utf-8-sig")
        print(f"  OK  estaciones_red_actual.csv ({len(est)})")
    if not (d / "estaciones_descarga_historica.csv").exists() or forzar:
        h = requests.get("https://www.senamhi.gob.pe/site/descarga-datos/map_hist_data.php", headers=UA, timeout=60).text
        bloque = h[h.index("stationList = [") + 14: h.index("];", h.index("stationList")) + 1]
        bloque = re.sub(r"(\b[a-z]\w*)\s*:", r'"\1":', bloque)      # JS -> JSON
        est = pd.DataFrame(json.loads(bloque))
        est["lat"] = est["latlng"].str[0]
        est["lon"] = est["latlng"].str[1]
        est.rename(columns={"name": "nombre", "dep": "departamento"})[
            ["codigo", "nombre", "departamento", "lat", "lon"]].to_csv(
            d / "estaciones_descarga_historica.csv", index=False, encoding="utf-8-sig")
        print(f"  OK  estaciones_descarga_historica.csv ({len(est)})")


def descargar_chirps(forzar: bool) -> None:
    """CHIRPS v2.0 mensual global: meses de El Niño 1998, 2017 y 2023 (Ciclón Yaku)."""
    print("\n[CHIRPS]")
    base = "https://data.chc.ucsb.edu/products/CHIRPS-2.0/global_monthly/tifs"
    for ym in ["1998.02", "1998.03", "2017.02", "2017.03", "2023.02", "2023.03"]:
        gz = DATA_RAW / "chirps" / f"chirps-v2.0.{ym}.tif.gz"
        if bajar(f"{base}/chirps-v2.0.{ym}.tif.gz", gz, forzar):
            tif = gz.with_suffix("")
            if not tif.exists():
                with gzip.open(gz, "rb") as fi, open(tif, "wb") as fo:
                    shutil.copyfileobj(fi, fo)


def descargar_dem(forzar: bool) -> None:
    """Copernicus DEM GLO-90 (90 m), teselas de 1°x1° que cubren el ámbito. Las de mar no existen (404)."""
    print("\n[DEM Copernicus GLO-90]")
    base = "https://copernicus-dem-90m.s3.amazonaws.com"
    for lat in range(4, 10):          # S04 ... S09  (borde sur de cada tesela)
        for lon in range(78, 83):     # W078 ... W082
            nombre = f"Copernicus_DSM_COG_30_S{lat:02d}_00_W{lon:03d}_00_DEM"
            bajar(f"{base}/{nombre}/{nombre}.tif", DATA_RAW / "dem" / f"{nombre}.tif", forzar, intentos=1)
    print("  Para unir las teselas:  gdalbuildvrt dem_norte.vrt *.tif   (o rasterio.merge en Python)")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--chirps", action="store_true")
    ap.add_argument("--dem", action="store_true")
    ap.add_argument("--forzar", action="store_true")
    ap.add_argument("--osm-actualizar", action="store_true", help="vuelve a consultar Overpass (cambia los resultados)")
    a = ap.parse_args()

    print("[GitHub: límites, ubigeo, pobreza 2018, censo 2025]")
    for rel, url in FUENTES_GITHUB.items():
        bajar(url, DATA_RAW / rel, a.forzar)
    descargar_sbs(a.forzar)
    descargar_osm(a.osm_actualizar)
    descargar_catalogo_senamhi(a.forzar)
    if a.chirps:
        descargar_chirps(a.forzar)
    if a.dem:
        descargar_dem(a.forzar)
    print("\nListo. Siguiente paso: python src/01_construir_base_distrital.py")


if __name__ == "__main__":
    main()
