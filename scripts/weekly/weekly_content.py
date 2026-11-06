"""每週自動產生兩篇文章，寫進「文章/」：
  1. 澳洲房產週報（取材 realestate.com.au、domain.com.au、SQM Research、Cotality，原創整理）
  2. 熱門話題 SEO 文章（過去 7 天澳洲留學／移民／房地產／財經的熱門第一名；若與週報或近期文章重複則改寫第二名）

用法：python scripts/weekly/weekly_content.py
環境變數（二擇一，兩個都有時用 OpenAI）：
  OPENAI_API_KEY     用 OpenAI 產生（模型預設 gpt-5.5，可用 OPENAI_MODEL 改）
  ANTHROPIC_API_KEY  用 Claude 產生（模型預設 claude-opus-5-5，可用 CLAUDE_MODEL 改）
  ARTICLE_STATUS     文章狀態，預設「草稿」（審稿後改成「已核准」才會上架）；設成「已核准」則自動上架
  ONLY               只產生其中一篇：digest 或 trending（測試用）
"""
import json
import os
import re
import sys
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ART_DIR = ROOT / "文章"
PROVIDER = "openai" if os.getenv("OPENAI_API_KEY", "").strip() else "anthropic" if os.getenv("ANTHROPIC_API_KEY", "").strip() else ""
if not PROVIDER:
    raise SystemExit("缺少 OPENAI_API_KEY 或 ANTHROPIC_API_KEY，至少要設定一個")
if PROVIDER == "openai":
    MODEL = os.getenv("OPENAI_MODEL", "").strip() or "gpt-5.5"
else:
    MODEL = os.getenv("CLAUDE_MODEL", "").strip() or "claude-opus-5-5"
STATUS = os.getenv("ARTICLE_STATUS", "").strip() or "草稿"
CATEGORIES = ["市場觀點", "買家指南", "政策稅務", "建案動態", "城市生活"]
if STATUS not in ("草稿", "需修改", "已核准"):
    raise SystemExit(f"ARTICLE_STATUS 只能是 草稿／需修改／已核准，目前是：{STATUS}")


STYLE_RULES = """寫作規則（違反視為失敗）：
1. 讀者是台灣的海外置產者、留學生家庭與移民申請人。全文用繁體中文、台灣用語、全形標點。
2. 不可翻譯或轉貼任何來源文章：讀懂後用自己的話重新分析，並說明對台灣讀者的實際影響。
3. 引用原文一次最多 15 個中文字或 25 個英文字，必須加引號並緊接著附上來源連結。
4. 表格必須是你依數據自己重新製作的 Markdown 表格，表格下一行註明資料來源。
5. 查不到、無法確認的數字寧可不寫，不可杜撰。
6. SEO／GEO：選一個焦點關鍵字，自然出現在標題、第一句、摘要，以及至少一個 ## 小標；開頭第一句是可被 AI 直接引用的結論句；每個 ## 段落第一句是可摘要的事實陳述。
7. 文末用「## 常見問題」帶 3–5 組「### 問題」＋回答。
8. 內文用 Markdown（## 與 ### 小標、條列、表格、[文字](網址) 連結），不要放 # 一級標題（網站會自動顯示標題）。
9. 文末加一段「資料來源」以外，每個主題段落最後也要有一行「資料來源：[網站｜文章標題](網址)」。"""

OUTPUT_SPEC = """完成後，只輸出一個 JSON 物件（不要有其他文字、不要用程式碼框包住）：
{
  "title": "文章標題，含焦點關鍵字，40 字內，不要放日期，也不要出現「週報」兩字",
  "slug": "url-friendly-english-slug（小寫英文、數字、連字號）",
  "category": "市場觀點／買家指南／政策稅務／建案動態／城市生活 其中一個",
  "summary": "列表頁顯示的摘要，80–120 字，開頭含焦點關鍵字",
  "focus_keyword": "焦點關鍵字",
  "body_markdown": "Markdown 內文",
  "sources": [{"name": "網站｜文章標題", "url": "原文網址"}]
}"""


def parse_json(text: str) -> dict:
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end <= start:
        raise ValueError(f"找不到 JSON：{text[:400]}")
    return json.loads(text[start : end + 1])


def run_openai(system: str, prompt: str) -> dict:
    """OpenAI Responses API＋web_search。"""
    from openai import OpenAI

    client = OpenAI(timeout=1800)
    resp = client.responses.create(
        model=MODEL,
        instructions=system,
        input=prompt,
        tools=[{"type": "web_search", "search_context_size": "high"}],
        reasoning={"effort": "high"},
        max_output_tokens=64000,
    )
    if resp.status != "completed":
        raise RuntimeError(f"OpenAI 回應未完成：{resp.status} {resp.incomplete_details}")
    return parse_json(resp.output_text)


def run_anthropic(system: str, prompt: str) -> dict:
    """Claude Messages API＋web_search（處理 pause_turn）。"""
    import anthropic

    client = anthropic.Anthropic()
    messages = [{"role": "user", "content": prompt}]
    for _ in range(12):
        with client.beta.messages.stream(
            model=MODEL,
            max_tokens=64000,
            system=system,
            tools=[{"type": "web_search_20260209", "name": "web_search", "max_uses": 20}],
            output_config={"effort": "high"},
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
            messages=messages,
        ) as stream:
            resp = stream.get_final_message()
        if resp.stop_reason == "pause_turn":
            messages.append({"role": "assistant", "content": resp.content})
            continue
        if resp.stop_reason == "refusal":
            raise RuntimeError(f"模型拒絕產生內容：{resp.stop_details}")
        if resp.stop_reason == "max_tokens":
            raise RuntimeError("輸出超過長度上限，請重試")
        return parse_json("".join(b.text for b in resp.content if b.type == "text"))
    raise RuntimeError("搜尋迴圈超過上限仍未完成")


def run(system: str, prompt: str) -> dict:
    return run_openai(system, prompt) if PROVIDER == "openai" else run_anthropic(system, prompt)


def recent_titles(days: int = 60) -> list[str]:
    cutoff = date.today() - timedelta(days=days)
    out = []
    for f in sorted(ART_DIR.glob("[0-9]*.md")):
        try:
            d = date.fromisoformat(f.name[:10])
        except ValueError:
            continue
        m = re.search(r"^標題:\s*\"?(.+?)\"?\s*$", f.read_text(encoding="utf-8"), re.M)
        if d >= cutoff and m:
            out.append(m.group(1))
    return out


def yq(s: str) -> str:
    return '"' + s.replace("\\", "\\\\").replace('"', '\\"') + '"'


def write_article(data: dict, note: str) -> Path:
    slug = re.sub(r"[^a-z0-9-]+", "-", data["slug"].lower()).strip("-")[:80] or "article"
    today = date.today().isoformat()
    path = ART_DIR / f"{today}-{slug}.md"
    n = 2
    while path.exists():
        path = ART_DIR / f"{today}-{slug}-{n}.md"
        n += 1
    cat = data.get("category") if data.get("category") in CATEGORIES else "市場觀點"
    lines = ["---", f"標題: {yq(data['title'].strip())}", f"狀態: {STATUS}", f"分類: {cat}",
             f"摘要: {yq(data['summary'].strip())}", f"發布日期: {today}"]
    srcs = [s for s in data.get("sources") or [] if s.get("name")]
    if srcs:
        lines.append("參考來源:")
        for s in srcs[:12]:
            lines.append(f"  - 名稱: {yq(s['name'])}")
            if str(s.get("url", "")).startswith("http"):
                lines.append(f"    網址: {s['url']}")
    lines += [f"審稿意見: {yq(note)}", "---", ""]
    body = re.sub(r"^#\s+.*\n+", "", data["body_markdown"].strip()) + "\n"
    path.write_text("\n".join(lines) + body, encoding="utf-8")
    return path


def digest() -> dict:
    today = date.today()
    label = f"{(today - timedelta(days=7)).isoformat()} ~ {today.isoformat()}"
    prompt = f"""請製作「{label}」這一週的澳洲房產週報。

步驟：
1. 用 web_search 搜尋過去 7 天的報導與數據：realestate.com.au/news、domain.com.au/news、sqmresearch.com.au、Cotality（前 CoreLogic）房價指數。
2. 優先挑有數據、討論度高的主題，整理成 4–6 個 ## 段落，例如：房價與租金趨勢、貸款利率、政策稅務與法規更新、房市專欄評論、熱搜話題。
3. 開頭先寫「## 本週（焦點關鍵字）重點摘要」，3–5 條重點。
4. 內文至少 2000 個中文字。
5. category 填「市場觀點」。

{STYLE_RULES}

{OUTPUT_SPEC}"""
    return run("你是資深澳洲房地產內容編輯，為台灣讀者製作每週澳洲房市週報。", prompt)


def trending(avoid: list[str]) -> dict:
    avoid_txt = "\n".join(f"- {t}" for t in avoid) or "（無）"
    prompt = f"""請找出過去 7 天，與「澳洲留學、澳洲移民、澳洲房地產、澳洲財經」相關、討論度最高的話題，寫成一篇中文 SEO 文章。

步驟：
1. 用 web_search 查過去 7 天澳洲主要新聞與熱搜（例如 ABC News、SBS 中文、The Australian Financial Review、realestate.com.au、domain.com.au、澳洲內政部與移民局公告、各大學與留學簽證新聞、RBA 公告）。
2. 依討論度排出前兩名熱門話題。
3. 原則上寫第一名；如果第一名與下列近期已寫過的文章主題重複，就改寫第二名：
{avoid_txt}
4. 文章要回答台灣讀者最在意的問題：這件事是什麼、影響誰、該怎麼因應；適合時連結到本站頁面，例如 [購房流程](/process/)、[房貸試算](/calculator/)、[常見問題](/faq/)。
5. 內文至少 1500 個中文字，4–6 個 ## 段落。
6. category 依內容選最適合的分類（留學與生活選「城市生活」，簽證、稅務、法規選「政策稅務」，買房流程選「買家指南」，市場與財經選「市場觀點」）。
7. 在 JSON 多加一個欄位 "ranking"：[{{"rank": 1, "topic": "話題", "why": "為何熱門"}}, {{"rank": 2, ...}}]，以及 "picked_rank"：實際寫的是第幾名。

{STYLE_RULES}

{OUTPUT_SPEC}"""
    return run("你是資深內容策略師，熟悉澳洲留學、移民、房地產與財經，專長是為台灣讀者寫可被搜尋引擎與 AI 引用的中文 SEO 文章。", prompt)


def main() -> None:
    only = os.getenv("ONLY", "").strip()
    made = []
    if only in ("", "digest"):
        print(f"產生週報中（{PROVIDER}／{MODEL}，含網路搜尋，約 3–10 分鐘）…")
        d = digest()
        made.append(write_article(d, f"AI 自動產生的週報（焦點關鍵字：{d.get('focus_keyword', '')}），請審核數據與來源後改成「已核准」"))
    if only in ("", "trending"):
        print("產生熱門話題文章中…")
        avoid = recent_titles() + [p.read_text(encoding="utf-8").split("\n")[1] for p in made]
        t = trending(avoid)
        rank = "；".join(f"第{r.get('rank')}名：{r.get('topic')}" for r in t.get("ranking", []))
        made.append(write_article(t, f"AI 自動產生的熱門話題文章（本週排名 {rank}；本篇寫第 {t.get('picked_rank', 1)} 名），請審核後改成「已核准」"))
    for p in made:
        print("已產生：", p.relative_to(ROOT))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:  # noqa: BLE001
        sys.exit(f"產生失敗：{exc}")
