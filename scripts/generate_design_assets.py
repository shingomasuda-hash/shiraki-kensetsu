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
    from PIL import Image
except ImportError:
    print("Pillow がインストールされていません。")
    print("  pip install pillow")
    sys.exit(1)

Image.MAX_IMAGE_PIXELS = None

ROOT = Path(__file__).resolve().parent.parent
SOURCE_DIR = ROOT / "source"
PC_SRC = SOURCE_DIR / "トレースPC版.png"
SP_SRC = SOURCE_DIR / "トレースSP版.png"

OUT_PC_DIR = ROOT / "public" / "design" / "pc"
OUT_SP_DIR = ROOT / "public" / "design" / "sp"
OUT_ROOT = ROOT / "public"
MANIFEST_TS = ROOT / "src" / "config" / "generatedImageSizes.ts"
MANIFEST_JSON = ROOT / "public" / "design" / "manifest.json"

TMP_DIR = ROOT / ".design_build_tmp"

# 元PNGの想定サイズ（等倍）。異なる場合は警告して継続する。
EXPECTED_PC_SIZE = (1024, 9140)
EXPECTED_SP_SIZE = (375, 12580)

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

# セクション境界（px）。背景色の切り替わり位置、および
# 文字・写真・カード・動画枠を分断しない余白帯の中央を実測して決定している。
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


def log(msg: str) -> None:
    print(f"[generate_design_assets] {msg}")


def check_sources() -> tuple[Image.Image, Image.Image]:
    for path in (PC_SRC, SP_SRC):
        if not path.exists():
            log(f"ERROR: 元データが見つかりません: {path}")
            sys.exit(1)

    pc = Image.open(PC_SRC).convert("RGB")
    sp = Image.open(SP_SRC).convert("RGB")

    log(f"PC版: {PC_SRC.name} / {pc.width} x {pc.height} px")
    log(f"SP版: {SP_SRC.name} / {sp.width} x {sp.height} px")

    if (pc.width, pc.height) != EXPECTED_PC_SIZE:
        log("WARNING: PC版のサイズが想定と異なります。PC_BOUNDARIES を再確認してください。")
    if (sp.width, sp.height) != EXPECTED_SP_SIZE:
        log("WARNING: SP版のサイズが想定と異なります。SP_BOUNDARIES を再確認してください。")

    if pc.height != PC_BOUNDARIES[-1]:
        log(f"WARNING: PC_BOUNDARIES の末尾({PC_BOUNDARIES[-1]})が画像高さ({pc.height})と一致しません。")
    if sp.height != SP_BOUNDARIES[-1]:
        log(f"WARNING: SP_BOUNDARIES の末尾({SP_BOUNDARIES[-1]})が画像高さ({sp.height})と一致しません。")

    return pc, sp


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
            )
        )

        log(
            f"{device.upper()} {section['file']:<16} "
            f"y={top:>6}-{bottom:<6} {crop.width}x{crop.height}px  "
            f"PNG={src_bytes/1024:8.1f}KB -> WebP={webp_bytes/1024:8.1f}KB"
        )

    return results


def generate_ogp(pc: Image.Image) -> tuple[int, int, int]:
    """PC版ファーストビューから1200x630のOGP画像を生成する（デザインは変形しない）。"""
    target_w, target_h = 1200, 630
    target_ratio = target_w / target_h

    hero_top, hero_bottom = 0, PC_BOUNDARIES[1]
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
    icon = pc.crop((26, 16, 60, 52))
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
        lines.append(f'    pc: {{ file: "{pc["file"]}", width: {pc["width"]}, height: {pc["height"]} }},')
        lines.append(f'    sp: {{ file: "{sp["file"]}", width: {sp["width"]}, height: {sp["height"]} }},')
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
    pc, sp = check_sources()

    all_results: list[SectionResult] = []

    log("--- PC版セクション画像を生成 ---")
    all_results += generate_device("pc", pc, OUT_PC_DIR, PC_BOUNDARIES)

    log("--- SP版セクション画像を生成 ---")
    all_results += generate_device("sp", sp, OUT_SP_DIR, SP_BOUNDARIES)

    prune_stale(all_results)

    log("--- OGP画像・アイコンを生成 ---")
    w, h, b = generate_ogp(pc)
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
