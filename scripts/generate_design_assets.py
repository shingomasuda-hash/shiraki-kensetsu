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
# お問い合わせフォームへの「生年月日」欄の差し込み
#
# デザイン画像にはこの欄が無く、メッセージ欄と送信ボタンの間に空きも無いため、
# セクション画像を分割して1行ぶんの帯を差し込み、その上へ
# ラベル・必須バッジ・入力欄をデザインと同じ体裁で描く。
#
# 座標は1倍(PC 1024px / SP 375px)基準。実データの解像度に合わせて自動換算する。
# 元データ（トレース画像）に生年月日欄が追加されたら、この差し込みは不要になる。
# ---------------------------------------------------------------------------
FONT_DIR = ROOT / "scripts" / "fonts"
BIRTHDAY_LABEL = "生年月日"
BIRTHDAY_BADGE = "必須"
BIRTHDAY_PLACEHOLDER = "例：1998年4月1日"

BIRTHDAY_ROW = {
    "pc": dict(
        # 分割位置（メッセージ欄の下端のすぐ下）と、差し込む帯の高さ
        split=452.5, band=88.0,
        # 帯を埋める写真として使う「UIの無い行」の範囲
        clean=(451.0, 461.5),
        # 入力欄（他の欄と同じ左カラム幅）
        box_x=(205.0, 501.5), box_top=50.5, box_h=36.5, radius=6.5,
        # ラベル行
        label_cy=25.0, label_size=16.0,
        badge_w=31.0, badge_h=22.5, badge_size=11.5, badge_radius=5.0,
        placeholder_size=15.5, placeholder_x=220.5,
    ),
    "sp": dict(
        split=536.5, band=69.0,
        clean=(535.0, 548.0),
        box_x=(20.0, 354.5), box_top=33.5, box_h=35.0, radius=3.5,
        label_cy=18.0, label_size=13.5,
        badge_w=26.0, badge_h=19.0, badge_size=9.5, badge_radius=4.0,
        placeholder_size=15.0, placeholder_x=30.0,
    ),
}

LABEL_COLOR = (255, 255, 255)
BADGE_COLOR = (22, 171, 64)
BOX_COLOR = (255, 255, 255)
PLACEHOLDER_COLOR = (150, 150, 150)


def _font(weight: int, size: float) -> ImageFont.FreeTypeFont:
    path = FONT_DIR / f"NotoSansJP-{weight}.subset.ttf"
    if not path.exists():
        log(f"ERROR: フォントが見つかりません: {path}")
        sys.exit(1)
    return ImageFont.truetype(str(path), max(1, round(size)))


def _photo_band(image: Image.Image, split: int, band: int, clean: tuple[int, int]) -> Image.Image:
    """差し込む帯の背景を作る。

    分割位置の近くにある「UIが写っていない写真だけの行」を縦に引き伸ばし、
    ぼかして写真の続きに見せる。さらに上下の端を元画像の行へなじませ、
    継ぎ目に線が出ないようにする。
    """
    width = image.width
    strip = image.crop((0, clean[0], width, clean[1]))
    fill = strip.resize((width, band), Image.BICUBIC).filter(ImageFilter.GaussianBlur(band // 25 + 4))

    fade = max(6, band // 6)
    for src_y, from_top in ((split - 1, True), (split, False)):
        row = image.crop((0, src_y, width, src_y + 1)).resize((width, band), Image.NEAREST)
        mask = Image.new("L", (width, band), 0)
        draw = ImageDraw.Draw(mask)
        for i in range(fade):
            y = i if from_top else band - 1 - i
            draw.line([(0, y), (width, y)], fill=int(255 * (1 - i / fade)))
        fill = Image.composite(row, fill, mask)

    return fill


def insert_birthday_field(image: Image.Image, device: str) -> tuple[Image.Image, dict]:
    """お問い合わせセクションへ生年月日欄を差し込み、その入力欄の矩形(%)を返す。"""
    scale = image.width / (REF_PC_SIZE[0] if device == "pc" else REF_SP_SIZE[0])
    cfg = BIRTHDAY_ROW[device]
    px = lambda key: round(cfg[key] * scale)

    split, band = px("split"), px("band")
    clean = (round(cfg["clean"][0] * scale), round(cfg["clean"][1] * scale))
    width, height = image.width, image.height

    out = Image.new("RGB", (width, height + band))
    out.paste(image.crop((0, 0, width, split)), (0, 0))
    out.paste(_photo_band(image, split, band, clean), (0, split))
    out.paste(image.crop((0, split, width, height)), (0, split + band))

    box_x0, box_x1 = round(cfg["box_x"][0] * scale), round(cfg["box_x"][1] * scale)
    box_y0 = split + px("box_top")
    box_y1 = box_y0 + px("box_h")
    radius = max(1, px("radius"))

    # 他の入力欄と同じく、わずかな影を落とす
    shadow = Image.new("RGBA", out.size, (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle(
        [box_x0, box_y0 + round(3 * scale), box_x1, box_y1 + round(4 * scale)],
        radius=radius, fill=(0, 0, 0, 38),
    )
    out = Image.alpha_composite(
        out.convert("RGBA"), shadow.filter(ImageFilter.GaussianBlur(round(3.5 * scale)))
    ).convert("RGB")

    draw = ImageDraw.Draw(out)
    draw.rounded_rectangle([box_x0, box_y0, box_x1, box_y1], radius=radius, fill=BOX_COLOR)
    draw.text(
        (round(cfg["placeholder_x"] * scale), (box_y0 + box_y1) // 2),
        BIRTHDAY_PLACEHOLDER, font=_font(400, cfg["placeholder_size"] * scale),
        fill=PLACEHOLDER_COLOR, anchor="lm",
    )

    label_font = _font(700, cfg["label_size"] * scale)
    label_cy = split + px("label_cy")
    draw.text((box_x0 + round(2 * scale), label_cy), BIRTHDAY_LABEL,
              font=label_font, fill=LABEL_COLOR, anchor="lm")

    badge_x0 = box_x0 + round(2 * scale) + round(draw.textlength(BIRTHDAY_LABEL, font=label_font)) + round(6.5 * scale)
    badge_h, badge_w = px("badge_h"), px("badge_w")
    draw.rounded_rectangle(
        [badge_x0, label_cy - badge_h // 2, badge_x0 + badge_w, label_cy + badge_h // 2],
        radius=max(1, px("badge_radius")), fill=BADGE_COLOR,
    )
    draw.text((badge_x0 + badge_w // 2, label_cy + round(0.5 * scale)), BIRTHDAY_BADGE,
              font=_font(700, cfg["badge_size"] * scale), fill=LABEL_COLOR, anchor="mm")

    rect = {
        "left": round(box_x0 / width * 100, 3),
        "top": round(box_y0 / out.height * 100, 3),
        "width": round((box_x1 - box_x0 + 1) / width * 100, 3),
        "height": round((box_y1 - box_y0 + 1) / out.height * 100, 3),
    }
    log(f"{device.upper()} お問い合わせ: 生年月日欄を差し込みました（+{band}px）")
    return out, rect


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


# 差し込んだ生年月日入力欄の矩形(%)。デバイスごとに1件ずつ入る。
birthday_rects: dict[str, dict] = {}


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

        # デザインに無い「生年月日」欄をここで差し込む（詳細は上の定数を参照）
        if section["id"] == "contact":
            crop, birthday_rects[device] = insert_birthday_field(crop, device)

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
        "/** 画像生成時に差し込んだ入力欄の矩形（セクション画像に対する%） */",
        "export type GeneratedRect = {",
        "  left: number;",
        "  top: number;",
        "  width: number;",
        "  height: number;",
        "};",
        "",
        "/**",
        " * お問い合わせフォームへ差し込んだ生年月日欄の座標。",
        " * デザイン画像を分割して描き込んでいるため、ここは自動生成で管理する。",
        " */",
        "export const generatedBirthdayRect: { pc: GeneratedRect; sp: GeneratedRect } = {",
    ] + [
        f'  {dev}: {{ left: {r["left"]}, top: {r["top"]}, width: {r["width"]}, height: {r["height"]} }},'
        for dev, r in sorted(birthday_rects.items())
    ] + [
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
