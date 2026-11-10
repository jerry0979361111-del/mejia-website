"""物件地圖的「大學／高中」標記資料：從 OpenStreetMap（Overpass API）抓雪梨、墨爾本、布里斯本、黃金海岸的大學與中學，
整理後寫到 public/data/schools.json（地圖載入時才下載）。

用法：python3 scripts/schools/build_schools.py            # 線上抓取（Overpass 偶爾逾時，會自動分塊重試）
      python3 scripts/schools/build_schools.py --from DIR  # 用已下載的 {city}_uni.json / {city}_sch.json 整理
資料來源：© OpenStreetMap contributors（ODbL），地圖右下角已標示。
"""
import json
import math
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public/data/schools.json"
ENDPOINTS = ["https://overpass-api.de/api/interpreter", "https://maps.mail.ru/osm/tools/overpass/api/interpreter"]
CITIES = {  # S, W, N, E
    "sydney": (-34.2, 150.6, -33.5, 151.4),
    "melbourne": (-38.2, 144.6, -37.5, 145.4),
    "brisbane": (-27.75, 152.75, -27.2, 153.25),
    "goldcoast": (-28.25, 153.15, -27.75, 153.55),
}
SCHOOL_NAME = "High School|Secondary College|Grammar|State High|College|Academy|Secondary"

# 大學：名稱要像大學，並排除神學院、宿舍學院、研究站、辦公室等非校區
UNI_KEEP = re.compile(r"Universit|UNSW|QUT|RMIT|Monash|Deakin|Swinburne|La Trobe|Griffith|Bond|Macquarie|Torrens", re.I)
UNI_DROP = re.compile(r"Theolog|Divinity|Archives|Paddock|Seismic|Mine|Field Station|Office|Association|Robert Menzies|Dunmore Lang|"
                      r"Art & Design|Architecture|Experimental|Medical School|Avalon|Long Pocket|Australian National University|"
                      r"Werrington South|Victoria Law School", re.I)
# 高中：排除小學部、幼兒園、技職與特殊用途
SCH_DROP = re.compile(r"Primary|Junior|Prep|Kinder|Early Learning|Childcare|Child Care|TAFE|Institute|English Language|"
                      r"Specific Purpose|Special School|Dance|Music|Drama|Driving|Flight|Beauty|Hair|Business College|"
                      r"Language|Coaching|Tutor|Community College|Adult|Vocational|Bible|Theolog", re.I)
UNI_ZH = [  # (正規表示式, 中文名)；依序比對，先比較特定的名稱
    (r"Western Sydney|\bWSU\b", "西雪梨大學"), (r"Technology Sydney", "雪梨科技大學"),
    (r"University of Sydney|Sydney University", "雪梨大學"), (r"New South Wales|\bUNSW\b", "新南威爾斯大學"),
    (r"Macquarie", "麥覺理大學"), (r"Australian Catholic", "澳洲天主教大學"), (r"Notre Dame", "聖母大學"), (r"Curtin", "科廷大學"),
    (r"University of Canberra", "坎培拉大學"), (r"University of Melbourne", "墨爾本大學"), (r"Monash", "蒙納許大學"),
    (r"\bRMIT\b", "皇家墨爾本理工大學"), (r"Deakin", "迪肯大學"), (r"La Trobe", "拉籌伯大學"), (r"Swinburne", "斯威本科技大學"),
    (r"Victoria University", "維多利亞大學"), (r"Federation", "澳洲聯邦大學"), (r"Torrens", "托倫斯大學"), (r"Southern Cross", "南十字星大學"),
    (r"Southern Queensland|\bUSQ\b", "南昆士蘭大學"), (r"Sunshine Coast", "陽光海岸大學"),
    (r"Queensland University of Technology|\bQUT\b", "昆士蘭科技大學"), (r"University of Queensland|\bUQ\b", "昆士蘭大學"),
    (r"Griffith", "格里菲斯大學"), (r"\bBond\b", "邦德大學"), (r"James Cook", "詹姆斯庫克大學"),
]


def overpass(query: str) -> list:
    for attempt in range(6):
        for ep in ENDPOINTS:
            try:
                data = urllib.parse.urlencode({"data": query}).encode()
                with urllib.request.urlopen(urllib.request.Request(ep, data=data, headers={"User-Agent": "MejiaWebsite/1.0"}), timeout=150) as r:
                    return json.load(r)["elements"]
            except Exception as e:  # noqa: BLE001
                print("  重試：", ep, e)
        time.sleep(8 * (attempt + 1))
    raise RuntimeError("Overpass 多次失敗")


def fetch(city: str, kind: str) -> list:
    s, w, n, e = CITIES[city]
    out = []
    # 切成四塊查，避免單次查詢逾時
    for (a, b, c, d) in [(s, w, (s + n) / 2, (w + e) / 2), (s, (w + e) / 2, (s + n) / 2, e), ((s + n) / 2, w, n, (w + e) / 2), ((s + n) / 2, (w + e) / 2, n, e)]:
        bbox = f"{a},{b},{c},{d}"
        q = (f'[out:json][timeout:60];wr["amenity"="university"]["name"]({bbox});out center tags;' if kind == "uni" else
             f'[out:json][timeout:60];wr["amenity"="school"]["name"~"{SCHOOL_NAME}"]({bbox});out center tags;')
        out += overpass(q)
    return out


def coord(el):
    c = el.get("center") or el
    return round(c["lat"], 5), round(c["lon"], 5)


def dist_km(p, q):
    return 111 * math.hypot(p[0] - q[0], (p[1] - q[1]) * math.cos(math.radians(p[0])))


def dedupe(items, key, km):
    kept = []
    for it in items:
        if not any(key(it) == key(k) and dist_km(it["geo"], k["geo"]) < km for k in kept):
            kept.append(it)
    return kept


def zh_name(name):
    for pat, v in UNI_ZH:
        if re.search(pat, name):
            return v
    return ""


def main():
    src = sys.argv[sys.argv.index("--from") + 1] if "--from" in sys.argv else None
    result = []
    for city in CITIES:
        load = (lambda k: json.load(open(f"{src}/{city}_{k}.json"))["elements"]) if src else (lambda k: fetch(city, k))
        unis = []
        for el in load("uni"):
            name = el.get("tags", {}).get("name", "").strip()
            if city == "brisbane" and "Bond" in name:  # 邦德大學只有黃金海岸校區，布里斯本那筆是辦公室
                continue
            if UNI_KEEP.search(name) and not UNI_DROP.search(name):
                name = re.sub(r"\s*Building \w+$", "", name)
                unis.append({"t": "u", "name": name, "zh": zh_name(name), "geo": coord(el), "city": city})
        # 同一所大學 1.5 公里內只留一個標記
        unis = dedupe(sorted(unis, key=lambda x: len(x["name"])), lambda x: x["zh"] or x["name"], 1.5)
        schools = []
        for el in load("sch"):
            name = el.get("tags", {}).get("name", "").strip()
            if name and not SCH_DROP.search(name):
                schools.append({"t": "h", "name": name, "geo": coord(el), "city": city})
        schools = dedupe(schools, lambda x: x["name"].lower(), 1.0)
        print(f"{city}: 大學 {len(unis)}、高中 {len(schools)}")
        result += unis + schools
    # 跨城市邊界重複的大學只留一個
    result = [r for r in result if r["t"] == "h"] + dedupe([r for r in result if r["t"] == "u"], lambda x: x["zh"] or x["name"], 1.5)
    for r in result:
        if not r.get("zh"):
            r.pop("zh", None)
        r.pop("city")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print("寫入", OUT.relative_to(ROOT), len(result), "筆，", OUT.stat().st_size // 1024, "KB")


if __name__ == "__main__":
    main()
