#!/usr/bin/env python3
"""
白木建設 採用LP - トレースPNG -> セクション別WebP画像 生成スクリプト

デザイン元データ（トレースPC版.png / トレースSP版.png）をセクション単位で切り出し、
WebPへ変換する。デザインはPNGの見た目をそのまま画像として使用し、
HTML/CSSでの再現は行わない（フォーム入力欄と動画のみ、後段で実要素を重ねる）。

使い方:
    python -m venv .venv && source .venv/bin/activate
    pip install pillow
    python scripts/generate_design_assets.py
"""

from __future__ import annotations

import json
import math
import shutil
import sys
import time
from dataclasses import dataclass
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageStat
except ImportError:
    print("Pillow がインストールされていません。")
    print("  pip install pillow")
    sys.exit(1)

Image.MAX_IMAGE_PIXELS = None

ROOT = Path(__file__).resolve().parent.parent
SOURCE_DIR = ROOT / "source"

# 元データの候補。同じ名前で複数の形式がある場合は、最も解像度の高いものを自動採用する。
# （2倍書き出しへ差し替えた場合も、ファイルを置くだけで自動的に高精細になる）
PC_SRC_CANDIDATES = ["トレースPC版.jpg", "トレースPC版.png", "トレースPC版.webp"]
SP_SRC_CANDIDATES = ["トレースSP版.jpg", "トレースSP版.png", "トレースSP版.webp"]

OUT_PC_DIR = ROOT / "public" / "design" / "pc"
OUT_SP_DIR = ROOT / "public" / "design" / "sp"
OUT_ROOT = ROOT / "public"
MANIFEST_TS = ROOT / "src" / "config" / "generatedImageSizes.ts"
MANIFEST_JSON = ROOT / "public" / "design" / "manifest.json"

TMP_DIR = ROOT / ".design_build_tmp"

# 座標の基準となる「1倍」のデザインサイズ。
# 下の SECTION 境界はすべてこの座標系で記述する。
# 実際の元データがこれより高解像度（2倍など）の場合は、
# 画像サイズから倍率を求めて境界を自動換算するため、境界値の書き換えは不要。
REF_PC_SIZE = (1024, 9140)
REF_SP_SIZE = (375, 12580)

# セクション定義（PC/SPで同じID・同じファイル番号に対応させる）
SECTIONS = [
    {"id": "hero", "file": "01-hero"},
    {"id": "job", "file": "02-job"},
    {"id": "career", "file": "03-career"},
    {"id": "advantage", "file": "04-advantage"},
    {"id": "for-you", "file": "05-for-you"},
    {"id": "numbers", "file": "06-numbers"},
    {"id": "routine", "file": "07-routine"},
    {"id": "message", "file": "08-message"},
    {"id": "requirements", "file": "09-requirements"},
    {"id": "flow", "file": "10-flow"},
    {"id": "faq", "file": "11-faq"},
    {"id": "contact", "file": "12-contact"},
    {"id": "footer", "file": "13-footer"},
]

# セクション境界（px / 1倍基準）。背景色の切り替わり位置、および
# 文字・写真・カード・動画枠を分断しない余白帯の中央を実測して決定している。
# 高解像度の元データを使う場合も、この値は書き換えない（自動換算される）。
PC_BOUNDARIES = [
    0, 673, 1386, 2510, 3280, 3957, 4565, 5530, 6653, 7400, 7790, 8402, 8940, 9140,
]

SP_BOUNDARIES = [
    0, 562, 1558, 3716, 5036, 6251, 7100, 8226, 9380, 10232, 10856, 11657, 12318, 12580,
]

assert len(PC_BOUNDARIES) == len(SECTIONS) + 1
assert len(SP_BOUNDARIES) == len(SECTIONS) + 1

WEBP_QUALITY = 94
WEBP_METHOD = 6


@dataclass
class SectionResult:
    device: str
    section_id: str
    file: str
    width: int
    height: int
    src_bytes: int
    webp_bytes: int
    bottom_color: str


# ---------------------------------------------------------------------------
# セクション単体の差し替え
#
# デザインの一部だけが更新された場合、全ページのトレースを書き出し直さなくても
# ここに置いたファイルがそのセクションの画像として使われる。
# （キー: セクションID と デバイス / 値: source/ からの相対パス）
# ---------------------------------------------------------------------------
SECTION_OVERRIDES = {
    ("contact", "pc"): "sections/12-contact-pc.jpg",
    ("contact", "sp"): "sections/12-contact-sp.jpg",
}


# ---------------------------------------------------------------------------
# お問い合わせフォームの描き替え
#
# 差し替えたデザインは「年齢」「性別」の2欄が増えたが、依頼内容は
#   ・「年齢」を「生年月日」にする
#   ・「生年月日」「性別」にも必須バッジを付ける
# のため、その2点だけを画像上で直す。
#
# 「年齢」の文字は写真の上に乗っているので、同じ行の文字が無い部分から
# 写真を持ってきて消し込んでから、新しい文字を描いている。
#
# 座標は差し替え元画像の実寸基準（ref_w）。別の解像度で書き出し直された
# 場合も幅から自動換算する。
# 元データ側でラベルと必須バッジが直されたら、この描き替えは不要になる。
# ---------------------------------------------------------------------------
CONTACT_FORM_EDITS = {
    "pc": dict(
        ref_w=1536,
        age_ink=(304, 482, 343, 500),     # 「年齢」の文字の範囲 (x0,y0,x1,y1)
        patch_x=420,                      # 消し込みに使う「写真だけ」の位置(x)
        # 「性別」の文字の右端と中心y（PCは生年月日と同じ行、SPは別の行にある）
        gender_ink=(816, 491),
        label_size=22.0,
        badge=dict(w=46, h=26, radius=6, size=13.5, gap=9),
        age_box=(308, 524, 752, 578),     # 「年齢」の入力欄
        placeholder=dict(x=323, size=21.0),
    ),
    "sp": dict(
        ref_w=563,
        age_ink=(31, 623, 64, 638),
        patch_x=150,
        gender_ink=(63, 735),
        label_size=18.5,
        badge=dict(w=45, h=23, radius=5, size=12.0, gap=9),
        age_box=(30, 650, 531, 702),
        placeholder=dict(x=48, size=19.0),
    ),
}

# ---------------------------------------------------------------------------
# 募集要項（給与）の描き替え
#
# 初任給の2行から「（時間外手当◯万◯,000円含む）」を外し、金額のうしろを
# 「〜」にする。
#
#   高卒：26万1,000円（時間外手当5万1,000円含む）
#        -> 高卒：26万1,000円〜
#
# 座標は書き出された画像の実寸基準（ref_w）。別の解像度で書き出し直された
# 場合も幅から自動換算する。
# 元データ側で文言が直されたら、この描き替えは不要になる。
#
#   money_right … 「円」の右端x（ここのうしろに「〜」を描く）
#   erase_to    … 「）」の右端x（ここまでを消す）
#   band        … その行の文字の上端y・下端y
# ---------------------------------------------------------------------------
REQUIREMENTS_EDITS = {
    "pc": dict(
        ref_w=2048,
        glyph_w=21,
        lines=[
            dict(money_right=794, erase_to=1164, band=(832, 856)),
            dict(money_right=877, erase_to=1208, band=(871, 896)),
        ],
    ),
    "sp": dict(
        ref_w=750,
        glyph_w=15,
        lines=[
            dict(money_right=301, erase_to=623, band=(910, 936)),
            dict(money_right=373, erase_to=658, band=(950, 976)),
        ],
    ),
}

FONT_DIR = ROOT / "scripts" / "fonts"
BIRTHDAY_LABEL = "生年月日"
BIRTHDAY_PLACEHOLDER = "例：1998年4月1日"
BADGE_TEXT = "必須"
BADGE_COLOR = (21, 171, 64)
LABEL_COLOR = (255, 255, 255)
PLACEHOLDER_COLOR = (150, 150, 150)
TEXT_COLOR = (0, 0, 0)


def _font(weight: int, size: float) -> ImageFont.FreeTypeFont:
    path = FONT_DIR / f"NotoSansJP-{weight}.subset.ttf"
    if not path.exists():
        log(f"ERROR: フォントが見つかりません: {path}")
        sys.exit(1)
    return ImageFont.truetype(str(path), max(1, round(size)))


def _erase_onto_photo(image: Image.Image, area: tuple[int, int, int, int], source_x: int) -> None:
    """写真の上に乗った文字を、同じ行の「文字が無い部分」の写真で塗り潰す。

    縦にずらすと写真の内容が変わってしまうため、横方向から持ってくる。
    貼り付けの境目が出ないよう、縁をぼかしたマスクで合成する。
    """
    x0, y0, x1, y1 = area
    width, height = x1 - x0, y1 - y0
    patch = image.crop((source_x, y0, source_x + width, y1))

    feather = max(2, width // 12)
    mask = Image.new("L", (width, height), 0)
    ImageDraw.Draw(mask).rectangle(
        [feather, feather, width - 1 - feather, height - 1 - feather], fill=255
    )
    image.paste(patch, (x0, y0), mask.filter(ImageFilter.GaussianBlur(feather)))


def _draw_badge(draw: ImageDraw.ImageDraw, x: int, cy: int, cfg: dict, scale: float) -> None:
    w, h = round(cfg["w"] * scale), round(cfg["h"] * scale)
    draw.rounded_rectangle(
        [x, cy - h // 2, x + w, cy - h // 2 + h],
        radius=max(1, round(cfg["radius"] * scale)), fill=BADGE_COLOR,
    )
    draw.text((x + w // 2, cy + max(1, round(scale))), BADGE_TEXT,
              font=_font(700, cfg["size"] * scale), fill=LABEL_COLOR, anchor="mm")


def apply_contact_form_edits(image: Image.Image, device: str) -> Image.Image:
    """「年齢」を「生年月日」へ直し、生年月日・性別へ必須バッジを足す。"""
    cfg = CONTACT_FORM_EDITS[device]
    scale = image.width / cfg["ref_w"]
    px = lambda v: round(v * scale)

    out = image.convert("RGB").copy()
    ax0, ay0, ax1, ay1 = (px(v) for v in cfg["age_ink"])
    pad = px(6)

    # 1. 「年齢」を消す
    _erase_onto_photo(out, (ax0 - pad, ay0 - pad, ax1 + pad, ay1 + pad), px(cfg["patch_x"]))

    draw = ImageDraw.Draw(out)
    label_font = _font(700, cfg["label_size"] * scale)
    cy = (ay0 + ay1) // 2
    badge = cfg["badge"]

    # 2. 「生年月日」を描き、必須バッジを付ける
    draw.text((ax0, cy), BIRTHDAY_LABEL, font=label_font, fill=LABEL_COLOR, anchor="lm")
    label_w = round(draw.textlength(BIRTHDAY_LABEL, font=label_font))
    _draw_badge(draw, ax0 + label_w + px(badge["gap"]), cy, badge, scale)

    # 3. 「性別」にも必須バッジを付ける（こちらは消し込み不要）
    gender_right, gender_cy = cfg["gender_ink"]
    _draw_badge(draw, px(gender_right) + px(badge["gap"]), px(gender_cy), badge, scale)

    # 4. 入力欄の「例：30」を書き替える
    bx0, by0, bx1, by1 = (px(v) for v in cfg["age_box"])
    inset = px(9)
    draw.rectangle([bx0 + inset, by0 + inset, bx1 - inset, by1 - inset], fill=(255, 255, 255))
    draw.text((px(cfg["placeholder"]["x"]), (by0 + by1) // 2), BIRTHDAY_PLACEHOLDER,
              font=_font(400, cfg["placeholder"]["size"] * scale),
              fill=PLACEHOLDER_COLOR, anchor="lm")

    log(f"{device.upper()} お問い合わせ: 年齢→生年月日の書き替えと必須バッジを反映しました")
    return out


def _has_ink(image: Image.Image, area: tuple[int, int, int, int]) -> bool:
    """その範囲に文字（地色より暗い点）があるか。

    デザインが差し替わって文字の位置が変わったときに、
    何も無いところを塗り潰してしまわないための確認。
    """
    patch = image.crop(area).convert("L")
    return min(patch.getdata()) < 160


def _paper_color(image: Image.Image, area: tuple[int, int, int, int]) -> tuple[int, int, int]:
    """消し込みに使う地色。範囲のすぐ右の、文字が無いところから採る。"""
    x0, y0, x1, y1 = area
    width = max(2, (x1 - x0) // 10)
    sample = image.crop((x1, y0, min(image.width, x1 + width), y1)).convert("RGB")
    r, g, b = (round(v) for v in ImageStat.Stat(sample).median)
    return (r, g, b)


def _draw_wave_dash(
    draw: ImageDraw.ImageDraw, x: float, cy: float, width: float, stroke: float
) -> None:
    """「〜」を描く。

    同梱しているフォントは必要な字だけのサブセットで「〜」を持たないため、
    波線として直接描く。左で上がり、右で下がる、ふつうの波ダッシュの形。
    """
    steps = 24
    amp = width * 0.15
    points = [
        (x + width * i / steps, cy - amp * math.sin(2 * math.pi * i / steps))
        for i in range(steps + 1)
    ]
    draw.line(points, fill=TEXT_COLOR, width=max(1, round(stroke)), joint="curve")


def apply_requirements_edits(image: Image.Image, device: str) -> Image.Image:
    """初任給の「（時間外手当◯円含む）」を外し、金額のうしろを「〜」にする。"""
    cfg = REQUIREMENTS_EDITS[device]
    scale = image.width / cfg["ref_w"]
    px = lambda v: round(v * scale)

    out = image.convert("RGB").copy()
    draw = ImageDraw.Draw(out)
    glyph_w = cfg["glyph_w"] * scale

    for line in cfg["lines"]:
        top, bottom = px(line["band"][0]), px(line["band"][1])
        money_right, erase_to = px(line["money_right"]), px(line["erase_to"])
        pad = max(1, px(4))
        area = (money_right + pad, top - pad, erase_to + pad, bottom + pad)

        if not _has_ink(out, area):
            log(f"WARNING: {device.upper()} 募集要項: 消す範囲に文字がありません。座標を確認してください")
            continue

        draw.rectangle(area, fill=_paper_color(out, area))
        _draw_wave_dash(
            draw,
            money_right + glyph_w * 0.3,
            (top + bottom) / 2,
            glyph_w * 0.95,
            glyph_w * 0.13,
        )

    log(f"{device.upper()} 募集要項: 初任給の時間外手当の注記を外し、「〜」にしました")
    return out


def bottom_edge_color(image: Image.Image) -> str:
    """画像の最下部の代表色を取り、`#rrggbb` で返す。

    動画枠を下へ伸ばした分の余白を、デザインの背景色と同じ色で埋めるために使う。
    最下行1pxだけだと圧縮ノイズを拾うため、下端の数%を平均する。
    """
    band_h = max(1, round(image.height * 0.01))
    band = image.crop((0, image.height - band_h, image.width, image.height)).convert("RGB")
    r, g, b = (round(v) for v in ImageStat.Stat(band).mean)
    return f"#{r:02x}{g:02x}{b:02x}"


def log(msg: str) -> None:
    print(f"[generate_design_assets] {msg}")



def pick_source(candidates: list[str], label: str) -> Image.Image:
    """候補のうち、最も横幅の大きい（＝最も高精細な）ファイルを採用する。"""
    found: list[tuple[int, Path, Image.Image]] = []
    for name in candidates:
        path = SOURCE_DIR / name
        if not path.exists():
            continue
        img = Image.open(path)
        found.append((img.width, path, img))

    if not found:
        log(f"ERROR: {label}の元データが見つかりません（候補: {', '.join(candidates)}）")
        sys.exit(1)

    found.sort(key=lambda t: t[0], reverse=True)
    width, path, img = found[0]

    for w, p, _ in found[1:]:
        log(f"  （{p.name} は {w}px 幅のため不採用）")

    log(f"{label}: {path.name} / {img.width} x {img.height} px")
    return img.convert("RGB")


def scale_boundaries(boundaries: list[int], ref_height: int, actual_height: int) -> list[int]:
    """1倍基準の境界を、実際の画像高さに合わせて換算する。"""
    if ref_height == actual_height:
        return list(boundaries)

    ratio = actual_height / ref_height
    scaled = [round(b * ratio) for b in boundaries]
    scaled[0] = 0
    scaled[-1] = actual_height
    return scaled


def check_sources() -> tuple[Image.Image, Image.Image, list[int], list[int]]:
    pc = pick_source(PC_SRC_CANDIDATES, "PC版")
    sp = pick_source(SP_SRC_CANDIDATES, "SP版")

    pc_scale = pc.width / REF_PC_SIZE[0]
    sp_scale = sp.width / REF_SP_SIZE[0]
    log(f"解像度倍率: PC={pc_scale:.3g}x / SP={sp_scale:.3g}x（基準 {REF_PC_SIZE[0]}px / {REF_SP_SIZE[0]}px）")

    for name, img, ref in (("PC版", pc, REF_PC_SIZE), ("SP版", sp, REF_SP_SIZE)):
        expected_h = ref[1] * (img.width / ref[0])
        if abs(img.height - expected_h) > max(4.0, expected_h * 0.002):
            log(
                f"WARNING: {name}の縦横比が基準と異なります "
                f"(期待 約{expected_h:.0f}px / 実際 {img.height}px)。境界を再確認してください。"
            )

    pc_bounds = scale_boundaries(PC_BOUNDARIES, REF_PC_SIZE[1], pc.height)
    sp_bounds = scale_boundaries(SP_BOUNDARIES, REF_SP_SIZE[1], sp.height)

    return pc, sp, pc_bounds, sp_bounds


def generate_device(
    device: str,
    image: Image.Image,
    out_dir: Path,
    boundaries: list[int],
) -> list[SectionResult]:
    out_dir.mkdir(parents=True, exist_ok=True)
    tmp_device_dir = TMP_DIR / device
    tmp_device_dir.mkdir(parents=True, exist_ok=True)

    results: list[SectionResult] = []

    for i, section in enumerate(SECTIONS):
        top = boundaries[i]
        bottom = boundaries[i + 1]
        crop = image.crop((0, top, image.width, bottom))

        override = SECTION_OVERRIDES.get((section["id"], device))
        if override:
            crop = Image.open(SOURCE_DIR / override).convert("RGB")
            log(f"{device.upper()} {section['file']:<16} 差し替え元を使用: source/{override}")

        if section["id"] == "contact":
            crop = apply_contact_form_edits(crop, device)

        if section["id"] == "requirements":
            crop = apply_requirements_edits(crop, device)

        png_path = tmp_device_dir / f"{section['file']}.png"
        webp_path = out_dir / f"{section['file']}.webp"

        crop.save(png_path, format="PNG")
        crop.save(webp_path, format="WEBP", quality=WEBP_QUALITY, method=WEBP_METHOD)


        src_bytes = png_path.stat().st_size
        webp_bytes = webp_path.stat().st_size

        results.append(
            SectionResult(
                device=device,
                section_id=section["id"],
                file=section["file"],
                width=crop.width,
                height=crop.height,
                src_bytes=src_bytes,
                webp_bytes=webp_bytes,
                bottom_color=bottom_edge_color(crop),
            )
        )

        log(
            f"{device.upper()} {section['file']:<16} "
            f"y={top:>6}-{bottom:<6} {crop.width}x{crop.height}px  "
            f"PNG={src_bytes/1024:8.1f}KB -> WebP={webp_bytes/1024:8.1f}KB"
        )

    return results


def generate_ogp(pc: Image.Image, pc_bounds: list[int]) -> tuple[int, int, int]:
    """PC版ファーストビューから1200x630のOGP画像を生成する（デザインは変形しない）。"""
    target_w, target_h = 1200, 630
    target_ratio = target_w / target_h

    hero_top, hero_bottom = 0, pc_bounds[1]
    hero_h = hero_bottom - hero_top

    crop_h = min(hero_h, int(pc.width / target_ratio))
    crop_top = hero_top + max(0, (hero_h - crop_h) // 2)
    crop = pc.crop((0, crop_top, pc.width, crop_top + crop_h))
    crop = crop.resize((target_w, target_h), Image.LANCZOS)

    ogp_path = OUT_ROOT / "ogp.jpg"
    crop.save(ogp_path, format="JPEG", quality=88)
    return crop.width, crop.height, ogp_path.stat().st_size


def generate_icons(pc: Image.Image) -> None:
    """ヘッダーのロゴマークからfavicon等を生成する（新規デザインは作らない）。"""
    # 切り出し位置は1倍基準。実データの解像度に合わせて換算する。
    s = pc.width / REF_PC_SIZE[0]
    icon = pc.crop((round(26 * s), round(16 * s), round(60 * s), round(52 * s)))
    size = max(icon.width, icon.height)
    canvas = Image.new("RGB", (size, size), (255, 255, 255))
    canvas.paste(icon, ((size - icon.width) // 2, (size - icon.height) // 2))
    canvas = canvas.resize((512, 512), Image.LANCZOS)

    canvas.save(OUT_ROOT / "icon-512.png")
    canvas.resize((180, 180), Image.LANCZOS).save(OUT_ROOT / "apple-touch-icon.png")

    ico_path = ROOT / "src" / "app" / "favicon.ico"
    canvas.convert("RGBA").resize((16, 16), Image.LANCZOS).save(
        ico_path, format="ICO", sizes=[(16, 16), (32, 32), (48, 48)]
    )
    log(f"favicon / apple-touch-icon / icon-512 を更新しました")


def write_manifest(all_results: list[SectionResult]) -> None:
    manifest = {"generatedAt": time.strftime("%Y-%m-%dT%H:%M:%S%z"), "sections": []}

    by_section: dict[str, dict] = {}
    for r in all_results:
        entry = by_section.setdefault(r.section_id, {"id": r.section_id, "pc": None, "sp": None})
        entry[r.device] = {
            "file": f"/design/{r.device}/{r.file}.webp",
            "width": r.width,
            "height": r.height,
            "bytes": r.webp_bytes,
            "bottomColor": r.bottom_color,
        }

    for section in SECTIONS:
        manifest["sections"].append(by_section[section["id"]])

    MANIFEST_JSON.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST_JSON.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    log(f"manifest.json を出力しました: {MANIFEST_JSON}")

    lines = [
        "// このファイルは scripts/generate_design_assets.py により自動生成されます。",
        "// 手動編集しないでください。",
        "",
        "export type GeneratedImageInfo = {",
        "  file: string;",
        "  width: number;",
        "  height: number;",
        "  /** 画像下端の代表色。動画枠を下へ伸ばした余白を埋めるのに使う。 */",
        "  bottomColor: string;",
        "};",
        "",
        "export type GeneratedSectionImages = {",
        "  id: string;",
        "  pc: GeneratedImageInfo;",
        "  sp: GeneratedImageInfo;",
        "};",
        "",
        "export const generatedImageSizes: GeneratedSectionImages[] = [",
    ]
    for section in SECTIONS:
        e = by_section[section["id"]]
        pc, sp = e["pc"], e["sp"]
        lines.append("  {")
        lines.append(f'    id: "{section["id"]}",')
        for dev, info in (("pc", pc), ("sp", sp)):
            lines.append(f"    {dev}: {{")
            lines.append(f'      file: "{info["file"]}",')
            lines.append(f'      width: {info["width"]},')
            lines.append(f'      height: {info["height"]},')
            lines.append(f'      bottomColor: "{info["bottomColor"]}",')
            lines.append("    },")
        lines.append("  },")
    lines.append("];")
    lines.append("")

    MANIFEST_TS.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST_TS.write_text("\n".join(lines), encoding="utf-8")
    log(f"generatedImageSizes.ts を出力しました: {MANIFEST_TS}")


def cleanup() -> None:
    if TMP_DIR.exists():
        shutil.rmtree(TMP_DIR)
        log("中間ファイル(PNG作業ディレクトリ)を削除しました。")


def prune_stale(results: list[SectionResult]) -> None:
    """過去の生成物で今回出力していないファイルを削除する。"""
    keep = {f"{s['file']}.webp" for s in SECTIONS}
    for d in (OUT_PC_DIR, OUT_SP_DIR):
        if not d.exists():
            continue
        for f in d.iterdir():
            if f.name not in keep:
                f.unlink()
                log(f"不要な生成物を削除しました: {f}")


def main() -> None:
    log("=== 白木建設 採用LP アセット生成を開始します ===")
    pc, sp, pc_bounds, sp_bounds = check_sources()

    all_results: list[SectionResult] = []

    log("--- PC版セクション画像を生成 ---")
    all_results += generate_device("pc", pc, OUT_PC_DIR, pc_bounds)

    log("--- SP版セクション画像を生成 ---")
    all_results += generate_device("sp", sp, OUT_SP_DIR, sp_bounds)

    prune_stale(all_results)

    log("--- OGP画像・アイコンを生成 ---")
    w, h, b = generate_ogp(pc, pc_bounds)
    log(f"OGP画像: {w}x{h}px {b/1024:.1f}KB -> {OUT_ROOT / 'ogp.jpg'}")
    generate_icons(pc)

    write_manifest(all_results)

    total_src = sum(r.src_bytes for r in all_results)
    total_webp = sum(r.webp_bytes for r in all_results)
    log(
        f"合計サイズ: PNG(中間) {total_src/1024/1024:.2f}MB -> "
        f"WebP(公開分) {total_webp/1024/1024:.2f}MB "
        f"(削減率 {100*(1-total_webp/total_src):.1f}%)"
    )

    cleanup()
    log("=== 完了しました ===")


if __name__ == "__main__":
    main()
