#!/usr/bin/env python3
"""確認用プレビュー（単一HTML）を生成する。

public/design 配下の実画像と、src/config の実座標をそのまま埋め込み、
PC/SP の切り替えと、クリック領域・動画枠・フォーム位置の可視化を行う。
成果物そのものではなく、共有して見た目を確認するためのプレビュー。
"""

from __future__ import annotations

import base64
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "preview" / "index.html"

SECTIONS = [
    ("hero", "01-hero", "ヘッダー・ファーストビュー"),
    ("job", "02-job", "現場監督の仕事とは？"),
    ("career", "03-career", "キャリアプラン"),
    ("advantage", "04-advantage", "白木建設の魅力"),
    ("for-you", "05-for-you", "こんな人に向いています"),
    ("numbers", "06-numbers", "数字で見る白木建設"),
    ("routine", "07-routine", "先輩社員の1日"),
    ("message", "08-message", "社長からのメッセージ"),
    ("requirements", "09-requirements", "募集要項"),
    ("flow", "10-flow", "応募の流れ"),
    ("faq", "11-faq", "よくある質問"),
    ("contact", "12-contact", "お問い合わせ"),
    ("footer", "13-footer", "フッター"),
]

# src/config/clickAreas.ts と同じ値
CLICK_AREAS = [
    ("header-logo", "hero", "白木建設株式会社", "external", None,
     dict(left=2.441, top=2.08, width=17.383, height=5.944),
     dict(left=4.267, top=1.601, width=38.4, height=5.872)),
    ("nav-company", "hero", "企業情報", "internal", "numbers",
     dict(left=54.199, top=2.377, width=7.227, height=5.498), None),
    ("nav-business", "hero", "事業紹介", "internal", "job",
     dict(left=62.012, top=2.377, width=6.934, height=5.498), None),
    ("nav-works", "hero", "施工実績", "internal", "advantage",
     dict(left=69.824, top=2.377, width=7.227, height=5.498), None),
    ("nav-recruit", "hero", "採用情報", "internal", "requirements",
     dict(left=77.637, top=2.377, width=7.227, height=5.498), None),
    ("nav-contact-btn", "hero", "お問い合わせ", "internal", "contact",
     dict(left=86.328, top=2.675, width=11.328, height=4.755),
     dict(left=65.333, top=2.313, width=22.933, height=4.448)),
    ("cta-numbers", "job", "仕事を数字で知る", "internal", "numbers",
     dict(left=50.586, top=58.906, width=11.719, height=4.488),
     dict(left=3.733, top=68.574, width=34.4, height=3.514)),
    ("cta-requirements", "for-you", "募集要項を見てみる", "internal", "requirements",
     dict(left=74.902, top=24.372, width=17.871, height=6.942),
     dict(left=5.333, top=13.663, width=47.733, height=2.634)),
    ("footer-logo", "footer", "白木建設株式会社", "external", None,
     dict(left=2.148, top=10.5, width=14.062, height=13.5),
     dict(left=4.8, top=9.542, width=31.467, height=8.779)),
    ("footer-president", "footer", "代表者メッセージ", "internal", "message",
     dict(left=73.926, top=22.5, width=9.863, height=11.5),
     dict(left=4.533, top=44.275, width=24.8, height=8.015)),
    ("footer-about", "footer", "会社概要", "internal", "numbers",
     dict(left=74.023, top=34.0, width=5.078, height=11.0),
     dict(left=4.533, top=53.053, width=13.333, height=8.015)),
    ("footer-offices", "footer", "事業所一覧", "external", None,
     dict(left=74.023, top=45.0, width=6.348, height=10.5),
     dict(left=4.533, top=61.45, width=16.0, height=8.397)),
    ("footer-jobs", "footer", "募集職種一覧", "internal", "requirements",
     dict(left=87.988, top=22.5, width=7.617, height=11.5),
     dict(left=40.8, top=44.275, width=18.933, height=8.015)),
    ("footer-benefits", "footer", "福利厚生", "external", None,
     dict(left=87.988, top=34.0, width=5.176, height=11.0),
     dict(left=40.8, top=53.053, width=13.333, height=8.015)),
    ("footer-interview", "footer", "先輩インタビュー", "internal", "routine",
     dict(left=87.988, top=45.0, width=9.961, height=10.5),
     dict(left=40.8, top=61.45, width=21.6, height=8.397)),
    ("footer-privacy", "footer", "プライバシーポリシー", "external", None,
     dict(left=79.395, top=88.5, width=10.938, height=11.5),
     dict(left=5.6, top=86.26, width=26.667, height=7.252)),
    ("footer-sitemap", "footer", "サイトマップ", "external", None,
     dict(left=91.016, top=88.5, width=6.738, height=11.5),
     dict(left=34.4, top=86.26, width=15.733, height=7.252)),
]

# src/config/videos.ts と同じ値
VIDEOS = [
    ("video-company", "job", "会社紹介動画<br>白木建設の好きなところ（縦型）",
     dict(left=0.879, top=68.583, width=92.871, height=27.209, boxWidth=951, boxHeight=194),
     dict(left=5.333, top=76.506, width=89.333, height=19.076, boxWidth=335, boxHeight=190)),
    ("video-employee", "career", "社員インタビュー<br>社員インタビュー（未経験）（縦型）",
     dict(left=7.617, top=66.459, width=84.961, height=31.495, boxWidth=870, boxHeight=354),
     dict(left=5.333, top=89.203, width=89.333, height=8.758, boxWidth=335, boxHeight=189)),
    ("video-daily", "routine", "実際の現場一日紹介<br>施工管理の1日（縦型）",
     dict(left=60.742, top=22.073, width=33.301, height=63.731, boxWidth=341, boxHeight=615),
     dict(left=5.333, top=78.774, width=89.333, height=16.785, boxWidth=335, boxHeight=189)),
    ("video-president", "message", "社長からのメッセージ枠<br>会社全体紹介（縦型）",
     dict(left=11.719, top=54.942, width=75.586, height=33.66, boxWidth=774, boxHeight=378),
     dict(left=5.333, top=79.809, width=89.333, height=16.378, boxWidth=335, boxHeight=189)),
]

# src/config/contactForm.ts と同じ値
FORM_FIELDS = [
    ("name", "名前", "text", False, "例：山田 太郎",
     dict(left=20.052, top=28.205, width=28.971, height=5.876),
     dict(left=5.329, top=18.750, width=89.165, height=4.500)),
    ("kana", "フリガナ", "text", False, "例：ヤマダ　タロウ",
     dict(left=50.911, top=28.205, width=28.646, height=5.876),
     dict(left=5.329, top=27.667, width=89.165, height=4.417)),
    ("tel", "電話番号", "tel", False, "例：090-1234-5678",
     dict(left=20.443, top=42.201, width=28.581, height=5.983),
     dict(left=5.329, top=36.500, width=89.165, height=4.500)),
    ("email", "メールアドレス", "email", False, "例：example@shiraki-const.jp",
     dict(left=50.911, top=42.201, width=28.971, height=5.983),
     dict(left=5.329, top=45.417, width=89.165, height=4.417)),
    ("birthday", "生年月日", "text", False, "例：1998年4月1日",
     dict(left=20.052, top=55.983, width=28.971, height=5.876),
     dict(left=5.329, top=54.167, width=89.165, height=4.417)),
    ("gender", "性別", "select", False, "選択してください",
     dict(left=50.911, top=55.983, width=28.971, height=5.876),
     dict(left=5.329, top=62.917, width=89.165, height=4.417)),
    ("message", "メッセージ", "text", True, "気になることをご自由にお書きください",
     dict(left=20.052, top=68.803, width=59.896, height=17.094),
     dict(left=5.329, top=71.750, width=89.165, height=12.500)),
]
GENDER_OPTIONS = ["男性", "女性", "その他"]
SUBMIT_RECT = (
    dict(left=38.607, top=87.821, width=23.112, height=6.410),
    dict(left=26.110, top=86.000, width=47.780, height=5.083),
)

# src/config/mobileNav.ts と同じ値
MOBILE_NAV_ITEMS = [
    ("job", "現場監督の仕事とは？"), ("career", "キャリアプラン"),
    ("advantage", "白木建設の魅力"), ("for-you", "こんな人に向いています"),
    ("numbers", "数字で見る白木建設"), ("routine", "先輩社員の1日"),
    ("message", "社長からのメッセージ"), ("requirements", "募集要項"),
    ("flow", "応募の流れ"), ("faq", "よくある質問"), ("contact", "お問い合わせ"),
]
MOBILE_NAV_TRIGGER = dict(left=89.333, top=1.246, width=8.0, height=6.584)


# 割り当てた4本はすべてYouTube Shorts（縦型9:16）。
VIDEO_ASPECT = 9 / 16
# src/lib/videoSource.ts の COVER_MAX_SCALE と同じ
COVER_MAX_SCALE = 1.5


def fit_in_box(box_w: int, box_h: int) -> dict:
    """src/lib/videoSource.ts の fitSize() と同じ計算。枠に対する動画の占有率(%)を返す。"""
    box_aspect = box_w / box_h
    box_is_wider = box_aspect > VIDEO_ASPECT
    ratio = box_aspect / VIDEO_ASPECT if box_is_wider else VIDEO_ASPECT / box_aspect
    mode = "cover" if ratio <= COVER_MAX_SCALE else "contain"

    if mode == "cover":
        w, h = (100, ratio * 100) if box_is_wider else (ratio * 100, 100)
    else:
        w, h = (100 / ratio, 100) if box_is_wider else (100, 100 / ratio)
    return {"mode": mode, "w": round(w, 3), "h": round(h, 3)}


# src/config/videos.ts の pcEnlargedVideoHeight と同じ
PC_ENLARGED_VIDEO_HEIGHT = 615 / 1024


def height_fraction(device: str, rect: dict) -> float | None:
    """枠の高さ（デザイン幅に対する割合）。デザイン値のままなら None。"""
    design_w = rect["boxWidth"] / (rect["width"] / 100)
    design_h = rect["boxHeight"] / design_w

    if device == "sp":
        return rect["width"] / 100 / VIDEO_ASPECT

    fits_already = fit_in_box(rect["boxWidth"], rect["boxHeight"])["mode"] == "cover"
    if fits_already or PC_ENLARGED_VIDEO_HEIGHT <= design_h:
        return None
    return PC_ENLARGED_VIDEO_HEIGHT


def section_tail(device: str, section_id: str, img_w: int, img_h: int) -> float:
    """広げた枠が画像の下端をはみ出す量（画像表示幅を1とした割合）。"""
    tail = 0.0
    for (_i, sid, _l, pc, sp) in VIDEOS:
        if sid != section_id:
            continue
        rect = pc if device == "pc" else sp
        fraction = height_fraction(device, rect)
        if fraction is None:
            continue
        image_ratio = img_h / img_w
        tail = max(tail, image_ratio * (rect["top"] / 100 - 1) + fraction)
    return round(max(0.0, tail), 5)


def video_rect(device: str, rect: dict) -> dict:
    """枠の描画情報。枠を広げる場合は、広げた後の寸法で収まり方を計算する。"""
    fraction = height_fraction(device, rect)
    if fraction is None:
        return {**rect, "fit": fit_in_box(rect["boxWidth"], rect["boxHeight"])}

    design_w = rect["boxWidth"] / (rect["width"] / 100)
    box_h = fraction * design_w
    return {
        **rect,
        "fit": fit_in_box(rect["boxWidth"], box_h),
        "boxAspect": round(rect["width"] / 100 / fraction, 5),
    }


def data_uri(path: Path) -> str:
    return "data:image/webp;base64," + base64.b64encode(path.read_bytes()).decode("ascii")


def main() -> None:
    manifest = json.loads((ROOT / "public" / "design" / "manifest.json").read_text(encoding="utf-8"))
    dims = {s["id"]: s for s in manifest["sections"]}

    payload = []
    for sid, fname, label in SECTIONS:
        pc = ROOT / "public" / "design" / "pc" / f"{fname}.webp"
        sp = ROOT / "public" / "design" / "sp" / f"{fname}.webp"
        pc_w, pc_h = dims[sid]["pc"]["width"], dims[sid]["pc"]["height"]
        sp_w, sp_h = dims[sid]["sp"]["width"], dims[sid]["sp"]["height"]
        payload.append({
            "id": sid,
            "label": label,
            "pc": {
                "src": data_uri(pc), "w": pc_w, "h": pc_h,
                "tail": section_tail("pc", sid, pc_w, pc_h),
                "bottomColor": dims[sid]["pc"]["bottomColor"],
            },
            "sp": {
                "src": data_uri(sp), "w": sp_w, "h": sp_h,
                "tail": section_tail("sp", sid, sp_w, sp_h),
                "bottomColor": dims[sid]["sp"]["bottomColor"],
            },
        })

    areas = [
        {"id": i, "section": s, "label": l, "kind": k, "target": tg, "pc": pc, "sp": sp}
        for (i, s, l, k, tg, pc, sp) in CLICK_AREAS
    ]
    vids = [
        {
            "id": i,
            "section": s,
            "label": l,
            "pc": video_rect("pc", pc),
            "sp": video_rect("sp", sp),
        }
        for (i, s, l, pc, sp) in VIDEOS
    ]
    fields = [
        {"name": n, "label": l, "type": t, "multiline": m, "placeholder": p, "pc": pc, "sp": sp}
        for (n, l, t, m, p, pc, sp) in FORM_FIELDS
    ]

    data = {
        "sections": payload,
        "areas": areas,
        "videos": vids,
        "fields": fields,
        "submit": {"pc": SUBMIT_RECT[0], "sp": SUBMIT_RECT[1]},
        "navItems": [{"target": t, "label": l} for t, l in MOBILE_NAV_ITEMS],
        "genderOptions": GENDER_OPTIONS,
        "navTrigger": MOBILE_NAV_TRIGGER,
    }

    html = TEMPLATE.replace("__DATA__", json.dumps(data, ensure_ascii=False))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(html, encoding="utf-8")
    size = OUT.stat().st_size
    print(f"wrote {OUT} ({size/1024/1024:.2f} MB)")


TEMPLATE = r"""<title>白木建設 採用LP 実装プレビュー</title>
<style>
  :root {
    --brand: #0f7a3d;
    --brand-bright: #22a55b;
    --ink: #10201a;
    --ink-soft: #5b6f65;
    --paper: #f6f8f6;
    --surface: #ffffff;
    --rule: #d9e3dc;
    --stage: #e8ece9;
    --focus: #22a55b;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --brand: #3fbe77;
      --brand-bright: #5fd694;
      --ink: #e7efe9;
      --ink-soft: #9ab0a4;
      --paper: #0c1411;
      --surface: #142019;
      --rule: #26362d;
      --stage: #080e0b;
      --focus: #5fd694;
    }
  }
  :root[data-theme="dark"] {
    --brand: #3fbe77;
    --brand-bright: #5fd694;
    --ink: #e7efe9;
    --ink-soft: #9ab0a4;
    --paper: #0c1411;
    --surface: #142019;
    --rule: #26362d;
    --stage: #080e0b;
    --focus: #5fd694;
  }
  :root[data-theme="light"] {
    --brand: #0f7a3d;
    --brand-bright: #22a55b;
    --ink: #10201a;
    --ink-soft: #5b6f65;
    --paper: #f6f8f6;
    --surface: #ffffff;
    --rule: #d9e3dc;
    --stage: #e8ece9;
    --focus: #22a55b;
  }

  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--paper);
    color: var(--ink);
    font-family: "Hiragino Kaku Gothic ProN", "Hiragino Sans", "Yu Gothic",
      "Noto Sans JP", system-ui, -apple-system, "Segoe UI", sans-serif;
    line-height: 1.6;
  }

  .bar {
    position: sticky;
    top: 0;
    z-index: 50;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px 18px;
    padding: 10px 18px;
    background: var(--surface);
    border-bottom: 1px solid var(--rule);
  }
  .bar__title {
    display: flex;
    flex-direction: column;
    margin-right: auto;
    gap: 1px;
  }
  .bar__eyebrow {
    font-size: 10px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--brand);
    font-weight: 700;
  }
  .bar__name { font-size: 14px; font-weight: 700; letter-spacing: 0.01em; }

  .group { display: flex; align-items: center; gap: 6px; }
  .group__label {
    font-size: 10px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--ink-soft);
    font-weight: 700;
  }
  .seg { display: flex; border: 1px solid var(--rule); border-radius: 999px; overflow: hidden; }
  .seg button {
    appearance: none;
    border: 0;
    background: transparent;
    color: var(--ink-soft);
    font: inherit;
    font-size: 13px;
    font-weight: 600;
    padding: 5px 14px;
    cursor: pointer;
    font-variant-numeric: tabular-nums;
  }
  .seg button[aria-pressed="true"] { background: var(--brand); color: #fff; }
  .seg button:focus-visible { outline: 2px solid var(--focus); outline-offset: -2px; }

  .note {
    padding: 10px 18px;
    font-size: 12.5px;
    color: var(--ink-soft);
    border-bottom: 1px solid var(--rule);
    background: var(--surface);
  }
  .note b { color: var(--ink); font-weight: 700; }

  .stage {
    display: flex;
    justify-content: center;
    padding: 22px 12px 60px;
    background: var(--stage);
  }
  .frame {
    width: 100%;
    max-width: 1024px;
    margin: 0 auto;
  }
  .stage[data-device="sp"] .frame { max-width: 375px; }
  .stage { display: block; padding: 0 0 60px; }
  .band { position: relative; overflow: hidden; }

  .sec { position: relative; line-height: 0; font-size: 0; }
  /*
   * 画像に z-index を持たせると、後ろに並ぶ重ね要素（クリック領域・動画枠・
   * 入力欄）より前面に来てしまう。ぼかし背景(::before)は z-index:0 なので、
   * 画像は position だけ指定してDOM順で上に載せる。
   */
  .sec img { display: block; width: 100%; height: auto; position: relative; }
  /* 余白側は、そのセクション画像をぼかしたものを敷いて埋める（本体は拡大しない） */
  .sec::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 0;
    background-image: var(--bleed);
    background-repeat: no-repeat;
    background-size: 100% 100%;
    filter: blur(36px);
    transform: scaleX(1.08);
    pointer-events: none;
  }
  .bleedwrap { position: relative; overflow: hidden; }
  /* 動画を等倍表示したときのはみ出しを受け止める余白 */
  .tail { width: 100%; }

  .hot {
    position: absolute;
    display: block;
    background: transparent;
    border: 0;
    padding: 0;
  }
  body.show-map .hot--internal { background: rgba(34,110,255,.30); outline: 2px solid #2266ff; }
  body.show-map .hot--external { background: rgba(255,138,0,.32); outline: 2px solid #ff8a00; }
  /* 広げた枠は、デザインのグレー枠を縦に伸ばした面として見せる（実装と同じ） */
  .hot--video[data-enlarged="true"] { background: #696262; border-radius: 6px; }
  body.show-map .hot--video { background: rgba(150,60,255,.28); outline: 2px solid #963cff; }
  /* 実際に動画が映る範囲（縦型9:16を枠へ収めた結果） */
  .hot__fit {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(90, 20, 190, .55);
    outline: 1px solid rgba(255, 255, 255, .5);
    pointer-events: none;
  }

  /* 実装側の拡大ボタン（全画面表示への導線）の位置を再現 */
  .hot__expand {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 32px;
    height: 32px;
    display: grid;
    place-items: center;
    border-radius: 8px;
    background: rgba(0, 0, 0, .55);
    color: #fff;
    font-size: 15px;
    line-height: 1;
    pointer-events: none;
  }
  .hot__tag { display: none; }
  .show-map .hot__tag {
    display: block;
    position: absolute;
    inset: 0;
    font: 700 9px/1.25 ui-monospace, SFMono-Regular, Menlo, monospace;
    color: #fff;
    text-shadow: 0 0 2px #000, 0 0 3px #000;
    padding: 2px;
    overflow: hidden;
    text-align: center;
    align-content: center;
    pointer-events: none;
  }

  .fld--select { -webkit-appearance: none; appearance: none; cursor: pointer; }
  .fld {
    position: absolute;
    margin: 0;
    padding: 0 12px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: #1f2937;
    font-family: inherit;
    font-size: 15px;
    line-height: 1.4;
    resize: none;
  }
  textarea.fld { padding-top: 10px; }
  .fld:focus-visible { outline: 2px solid var(--focus); outline-offset: 1px; }
  .show-map .fld { background: rgba(0,200,120,.26); outline: 2px solid #00a86b; }

  .sbmt {
    position: absolute;
    margin: 0;
    padding: 0;
    border: 0;
    border-radius: 999px;
    background: transparent;
    cursor: not-allowed;
  }
  .show-map .sbmt { background: rgba(255,0,190,.26); outline: 2px solid #d600aa; }

  .navtrigger {
    position: absolute;
    z-index: 30;
    border: 0;
    background: transparent;
    cursor: pointer;
  }
  .show-map .navtrigger { background: rgba(0,200,255,.35); outline: 2px solid #00a0c8; }
  .navpanel {
    position: fixed; inset: 0; z-index: 100;
    display: flex; flex-direction: column;
    background: #1b3b2a; color: #fff;
    font-size: 16px; line-height: 1.5; overflow-y: auto;
  }
  .navpanel[hidden] { display: none; }
  .navpanel__bar {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 16px; border-bottom: 1px solid rgba(255,255,255,.16);
  }
  .navpanel__title { font-size: 12px; font-weight: 700; letter-spacing: .16em; color: #30ac5f; }
  .navpanel__close {
    width: 40px; height: 40px; border: 0; border-radius: 999px;
    background: transparent; color: #fff; font-size: 20px; cursor: pointer;
  }
  .navpanel__item {
    display: flex; align-items: center; min-height: 56px; padding: 12px 16px;
    border-bottom: 1px solid rgba(255,255,255,.12);
    color: #fff; font-size: 15px; font-weight: 500; text-decoration: none;
  }
  .navpanel__item::after {
    content: ""; width: 7px; height: 7px; margin-left: auto;
    border-right: 2px solid #30ac5f; border-bottom: 2px solid #30ac5f;
    transform: rotate(-45deg);
  }

  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 16px;
    padding: 10px 18px;
    background: var(--surface);
    border-bottom: 1px solid var(--rule);
    font-size: 11.5px;
    color: var(--ink-soft);
  }
  .legend[hidden] { display: none; }
  .legend span { display: inline-flex; align-items: center; gap: 6px; }
  .legend i { width: 11px; height: 11px; border-radius: 3px; display: inline-block; }

  @media (prefers-reduced-motion: reduce) {
    * { animation: none !important; transition: none !important; }
  }
</style>

<header class="bar">
  <div class="bar__title">
    <span class="bar__eyebrow">実装プレビュー</span>
    <span class="bar__name">白木建設株式会社 現場監督採用LP</span>
  </div>

  <div class="group">
    <span class="group__label">表示</span>
    <div class="seg" role="group" aria-label="表示デバイス">
      <button type="button" data-device-btn="pc" aria-pressed="true">PC 1024</button>
      <button type="button" data-device-btn="sp" aria-pressed="false">SP 375</button>
    </div>
  </div>

  <div class="group">
    <span class="group__label">領域</span>
    <div class="seg" role="group" aria-label="操作領域の表示">
      <button type="button" data-map-btn="off" aria-pressed="true">通常</button>
      <button type="button" data-map-btn="on" aria-pressed="false">可視化</button>
    </div>
  </div>
</header>

<p class="note">
  実際に生成した画像と座標をそのまま表示しています。
  <b>外部URL・フォーム送信先は未設定</b>のため、その分のリンクは張られていません（設定すると有効になります）。
  入力欄は実際に入力できます。
  動画4本は<b>YouTube限定公開のShorts（縦型9:16）</b>を割り当て済みです。
  <b>SPでは動画を等倍（9:16そのまま）で再生</b>するため、枠をデザイン値より広げ、
  その分セクション下に余白を足しています。PCはデザインの枠のままです。
  このプレビューは共有用の単一HTMLのため再生はせず、枠の位置と実際に動画が入る範囲（濃い紫）を再現しています。
</p>

<div class="legend" id="legend" hidden>
  <span><i style="background:#2266ff"></i>ページ内リンク</span>
  <span><i style="background:#ff8a00"></i>外部リンク（URL未設定）</span>
  <span><i style="background:#963cff"></i>動画枠</span>
  <span><i style="background:#00a86b"></i>入力欄</span>
  <span><i style="background:#d600aa"></i>送信ボタン</span>
</div>

<div class="navpanel" id="navpanel" role="dialog" aria-modal="true" aria-label="メニュー" hidden></div>

<main class="stage" id="stage" data-device="pc">
  <div id="frame"></div>
</main>

<script>
const DATA = __DATA__;
const VIDEO_ASPECT = 9 / 16;

const frame = document.getElementById('frame');
const stage = document.getElementById('stage');
const legend = document.getElementById('legend');
let device = 'pc';

const pct = (r) => `left:${r.left}%;top:${r.top}%;width:${r.width}%;height:${r.height}%`;

function render() {
  frame.textContent = '';

  for (const sec of DATA.sections) {
    const band = document.createElement('div');
    band.className = 'band';

    const el = document.createElement('section');
    el.className = 'sec';
    el.id = sec.id;

    const img = document.createElement('img');
    const d = sec[device];
    el.style.setProperty('--bleed', `url("${d.src}")`);
    img.src = d.src;
    img.width = d.w;
    img.height = d.h;
    img.alt = '';
    img.decoding = 'async';
    if (sec.id !== 'hero') img.loading = 'lazy';
    el.appendChild(img);

    for (const v of DATA.videos.filter((x) => x.section === sec.id)) {
      const r = v[device];
      const box = document.createElement('span');
      box.className = 'hot hot--video';
      if (r.boxAspect) box.dataset.enlarged = 'true';
      box.style.cssText = pct(r);
      const f = r.fit;
      if (r.boxAspect) {
        // 枠を広げる場合、高さは幅と比率から決まる（枠は画像の下端をはみ出す）
        box.style.cssText =
          `left:${r.left}%;top:${r.top}%;width:${r.width}%;height:auto;aspect-ratio:${r.boxAspect}`;
      }
      const note = f.mode === 'cover' ? '枠いっぱいに再生' : '枠内へ収める（左右は余白）';
      box.innerHTML =
        `<span class="hot__fit" data-fit="${f.mode}" style="width:${f.w}%;height:${f.h}%"></span>` +
        (f.mode === 'contain' ? `<span class="hot__expand" aria-hidden="true">⤢</span>` : '') +
        `<span class="hot__tag">${v.id}<br>${v.label}<br>${note}</span>`;
      el.appendChild(box);
    }

    // 動画枠を広げた分だけ、セクションの下に余白を足す。
    // 画像の上に重ねた要素の座標は画像の高さを基準にしているため、
    // 余白は .sec の中ではなく外（画像と同じ幅の .frame の中）へ置く。
    const tail = d.tail || 0;
    let tailEl = null;
    if (tail > 0) {
      band.style.background = d.bottomColor;
      tailEl = document.createElement('div');
      tailEl.className = 'tail';
      tailEl.style.paddingBottom = (tail * 100).toFixed(4) + '%';
    }

    if (sec.id === 'hero' && device === 'sp') {
      const t = DATA.navTrigger;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'navtrigger';
      btn.style.cssText = pct(t);
      btn.setAttribute('aria-label', 'メニューを開く');
      btn.addEventListener('click', () => openNav());
      el.appendChild(btn);
    }

    if (sec.id === 'contact') {
      for (const f of DATA.fields) {
        const r = f[device];
        const isSelect = f.type === 'select';
        const input = document.createElement(isSelect ? 'select' : f.multiline ? 'textarea' : 'input');
        if (isSelect) {
          // 未選択のうちはデザイン画像の「選択してください」を見せる
          input.appendChild(new Option('', ''));
          for (const option of (DATA.genderOptions || [])) input.appendChild(new Option(option, option));
          input.classList.add('fld--select');
        } else if (!f.multiline) {
          input.type = f.type;
        }
        input.className = 'fld';
        input.style.cssText = pct(r);
        input.setAttribute('aria-label', f.label);
        input.placeholder = '';
        el.appendChild(input);
      }
      const sr = DATA.submit[device];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sbmt';
      btn.disabled = true;
      btn.style.cssText = pct(sr);
      btn.setAttribute('aria-label', '送信する（送信先未設定のため無効）');
      el.appendChild(btn);
    }

    for (const a of DATA.areas.filter((x) => x.section === sec.id)) {
      const r = a[device];
      if (!r) continue;
      const isInternal = a.kind === 'internal';
      const node = document.createElement(isInternal ? 'a' : 'span');
      node.className = `hot hot--${a.kind}`;
      node.style.cssText = pct(r);
      if (isInternal && a.target) {
        node.setAttribute('href', '#' + a.target);
        node.setAttribute('aria-label', a.label);
      }
      node.innerHTML = `<span class="hot__tag">${a.id}<br>${a.label}${isInternal ? '' : '<br>URL未設定'}</span>`;
      el.appendChild(node);
    }

    const inner = document.createElement('div');
    inner.className = 'frame';
    inner.appendChild(el);
    if (tailEl) inner.appendChild(tailEl);
    band.appendChild(inner);
    frame.appendChild(band);
  }
}

const navpanel = document.getElementById('navpanel');

function closeNav() {
  navpanel.hidden = true;
  document.body.style.overflow = '';
}

function openNav() {
  navpanel.textContent = '';

  const bar = document.createElement('div');
  bar.className = 'navpanel__bar';
  const title = document.createElement('span');
  title.className = 'navpanel__title';
  title.textContent = 'MENU';
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'navpanel__close';
  close.setAttribute('aria-label', 'メニューを閉じる');
  close.textContent = '✕';
  close.addEventListener('click', closeNav);
  bar.append(title, close);
  navpanel.appendChild(bar);

  for (const item of DATA.navItems) {
    const a = document.createElement('a');
    a.className = 'navpanel__item';
    a.href = '#' + item.target;
    a.textContent = item.label;
    a.addEventListener('click', closeNav);
    navpanel.appendChild(a);
  }

  navpanel.hidden = false;
  document.body.style.overflow = 'hidden';
}

document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeNav(); });

document.querySelectorAll('[data-device-btn]').forEach((btn) => {
  btn.addEventListener('click', () => {
    device = btn.dataset.deviceBtn;
    stage.dataset.device = device;
    closeNav();
    document.querySelectorAll('[data-device-btn]').forEach((b) =>
      b.setAttribute('aria-pressed', String(b === btn)));
    render();
  });
});

document.querySelectorAll('[data-map-btn]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const on = btn.dataset.mapBtn === 'on';
    document.body.classList.toggle('show-map', on);
    legend.hidden = !on;
    document.querySelectorAll('[data-map-btn]').forEach((b) =>
      b.setAttribute('aria-pressed', String(b === btn)));
  });
});

render();
</script>
"""


if __name__ == "__main__":
    main()
