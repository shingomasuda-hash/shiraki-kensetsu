#!/usr/bin/env python3
"""
白木建設 採用LP - PDF -> セクション別WebP画像 生成スクリプト

PC版・SP版PDFをそれぞれ12セクションに分割し、高解像度でレンダリングして
WebP（必要に応じてPNG）へ変換する。デザインはPDFの見た目をそのまま画像化する
だけで、HTML/CSSでの再現は行わない。

使い方:
    python -m venv .venv && source .venv/bin/activate
    pip install pymupdf pillow
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
    import fitz  # PyMuPDF
except ImportError:
    print("PyMuPDF (fitz) がインストールされていません。")
    print("  pip install pymupdf pillow")
    sys.exit(1)

try:
    from PIL import Image
except ImportError:
    print("Pillow がインストールされていません。")
    print("  pip install pymupdf pillow")
    sys.exit(1)


ROOT = Path(__file__).resolve().parent.parent
SOURCE_DIR = ROOT / "source"
PC_PDF = SOURCE_DIR / "白木建設_採用LP_PC.pdf"
SP_PDF = SOURCE_DIR / "白木建設_採用LP_SP.pdf"

OUT_PC_DIR = ROOT / "public" / "design" / "pc"
OUT_SP_DIR = ROOT / "public" / "design" / "sp"
OUT_OGP_DIR = ROOT / "public"
MANIFEST_TS = ROOT / "src" / "config" / "generatedImageSizes.ts"
MANIFEST_JSON = ROOT / "public" / "design" / "manifest.json"

TMP_DIR = ROOT / ".design_build_tmp"

# PDF上で確認済みのページサイズ（pt）。実測値と異なる場合は警告して処理を続ける。
EXPECTED_PC_SIZE = (1024.5, 8900.25)
EXPECTED_SP_SIZE = (1024.5, 5257.5)

# SP版PDFは横1024.5ptの白いキャンバス中央に実デザイン(約248pt幅)が配置されている。
# 画像・テキスト・図形の実測バウンディングボックス(374.11〜617.86pt)に
# 安全余白を追加してクロップする。
SP_CROP_LEFT = 372.0
SP_CROP_RIGHT = 620.0

# セクション定義: (id, ファイル名プレフィックス, PC上端pt, SP上端pt)
# 下端は次セクションの上端。最後のセクションの下端はページ末尾。
# 境界値は目視確認＋背景色/余白の画素解析により、文字・写真・カード・動画枠が
# 分断されない位置に調整済み（PDFに記載の参考値から一部補正）。
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
    {"id": "entry", "file": "12-entry-footer"},
]

PC_BOUNDARIES = [
    0, 684, 1407, 2564, 3242, 3979, 4596, 5506, 6566, 7249, 7686, 8271, 8900.25,
]

SP_BOUNDARIES = [
    0, 153, 551, 1140, 1657, 1988, 2322, 2798, 3303, 3728, 4167, 4788, 5257.5,
]

assert len(PC_BOUNDARIES) == len(SECTIONS) + 1
assert len(SP_BOUNDARIES) == len(SECTIONS) + 1

# 基準表示幅(CSS px)に対する出力倍率。
# PC: 1024.5pt(=1366px@96dpi) を 2.6667倍 -> 約192dpi相当(2732px)
# SP: クロップ後248pt(=約330px@96dpi) を 4.0倍 -> 約288dpi相当
PC_SCALE = 2.6666667
SP_SCALE = 4.0

WEBP_QUALITY = 92
WEBP_METHOD = 6


@dataclass
class SectionResult:
    device: str
    section_id: str
    file: str
    width: int
    height: int
    png_bytes: int
    webp_bytes: int


def log(msg: str) -> None:
    print(f"[generate_design_assets] {msg}")


def check_source_pdfs() -> None:
    if not PC_PDF.exists():
        log(f"ERROR: PC版PDFが見つかりません: {PC_PDF}")
        sys.exit(1)
    if not SP_PDF.exists():
        log(f"ERROR: SP版PDFが見つかりません: {SP_PDF}")
        sys.exit(1)

    pc_doc = fitz.open(PC_PDF)
    sp_doc = fitz.open(SP_PDF)

    log(f"PC版PDF: {PC_PDF.name} / ページ数={len(pc_doc)}")
    log(f"SP版PDF: {SP_PDF.name} / ページ数={len(sp_doc)}")

    pc_rect = pc_doc[0].rect
    sp_rect = sp_doc[0].rect
    log(f"PC版ページサイズ: {pc_rect.width:.2f} x {pc_rect.height:.2f} pt")
    log(f"SP版ページサイズ: {sp_rect.width:.2f} x {sp_rect.height:.2f} pt")

    def close(a: float, b: float) -> bool:
        return abs(a - b) < 0.5

    if not (close(pc_rect.width, EXPECTED_PC_SIZE[0]) and close(pc_rect.height, EXPECTED_PC_SIZE[1])):
        log("WARNING: PC版PDFのページサイズが想定と異なります。セクション境界を再確認してください。")
    if not (close(sp_rect.width, EXPECTED_SP_SIZE[0]) and close(sp_rect.height, EXPECTED_SP_SIZE[1])):
        log("WARNING: SP版PDFのページサイズが想定と異なります。クロップ範囲を再確認してください。")

    pc_doc.close()
    sp_doc.close()


def render_section(
    page: "fitz.Page",
    clip: "fitz.Rect",
    scale: float,
) -> "fitz.Pixmap":
    matrix = fitz.Matrix(scale, scale)
    return page.get_pixmap(matrix=matrix, clip=clip, alpha=False)


def save_webp(png_path: Path, webp_path: Path) -> tuple[int, int]:
    img = Image.open(png_path).convert("RGB")
    img.save(webp_path, format="WEBP", quality=WEBP_QUALITY, method=WEBP_METHOD)
    return png_path.stat().st_size, webp_path.stat().st_size


def generate_device(
    device: str,
    pdf_path: Path,
    out_dir: Path,
    boundaries: list[float],
    scale: float,
    crop_left: float | None,
    crop_right: float | None,
) -> list[SectionResult]:
    doc = fitz.open(pdf_path)
    page = doc[0]
    page_width = page.rect.width

    left = crop_left if crop_left is not None else 0.0
    right = crop_right if crop_right is not None else page_width

    out_dir.mkdir(parents=True, exist_ok=True)
    tmp_device_dir = TMP_DIR / device
    tmp_device_dir.mkdir(parents=True, exist_ok=True)

    results: list[SectionResult] = []

    for i, section in enumerate(SECTIONS):
        top = boundaries[i]
        bottom = boundaries[i + 1]
        clip = fitz.Rect(left, top, right, bottom)

        pix = render_section(page, clip, scale)

        png_path = tmp_device_dir / f"{section['file']}.png"
        webp_path = out_dir / f"{section['file']}.webp"

        pix.save(png_path)
        png_bytes, webp_bytes = save_webp(png_path, webp_path)

        results.append(
            SectionResult(
                device=device,
                section_id=section["id"],
                file=section["file"],
                width=pix.width,
                height=pix.height,
                png_bytes=png_bytes,
                webp_bytes=webp_bytes,
            )
        )

        log(
            f"{device.upper()} {section['file']:<18} "
            f"{pix.width}x{pix.height}px  "
            f"PNG={png_bytes/1024:8.1f}KB -> WebP={webp_bytes/1024:8.1f}KB"
        )

    doc.close()
    return results


def generate_ogp(pdf_path: Path) -> tuple[int, int, int]:
    """PC版ファーストビューから1200x630のOGP画像を生成する（デザインは変形しない）。"""
    doc = fitz.open(pdf_path)
    page = doc[0]

    target_w, target_h = 1200, 630
    target_ratio = target_w / target_h  # 1.9048

    hero_top, hero_bottom = 0.0, 684.0
    hero_width = page.rect.width  # 1024.5
    hero_height = hero_bottom - hero_top

    # 横幅いっぱいを使い、比率に合わせて高さ方向をトリミング(中央寄せ)。
    crop_height = hero_width / target_ratio
    if crop_height > hero_height:
        crop_height = hero_height
    crop_top = hero_top + max(0.0, (hero_height - crop_height) / 2)
    clip = fitz.Rect(0, crop_top, hero_width, crop_top + crop_height)

    scale = target_w / hero_width
    pix = render_section(page, clip, scale)

    tmp_png = TMP_DIR / "ogp.png"
    tmp_png.parent.mkdir(parents=True, exist_ok=True)
    pix.save(tmp_png)

    img = Image.open(tmp_png).convert("RGB")
    if img.size != (target_w, target_h):
        img = img.resize((target_w, target_h), Image.LANCZOS)
    ogp_path = OUT_OGP_DIR / "ogp.jpg"
    img.save(ogp_path, format="JPEG", quality=88)

    doc.close()
    return img.size[0], img.size[1], ogp_path.stat().st_size


def write_manifest(all_results: list[SectionResult]) -> None:
    manifest = {"generatedAt": time.strftime("%Y-%m-%dT%H:%M:%S%z"), "sections": []}

    by_section: dict[str, dict] = {}
    for r in all_results:
        entry = by_section.setdefault(
            r.section_id,
            {"id": r.section_id, "pc": None, "sp": None},
        )
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

    ts_lines = [
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
        entry = by_section[section["id"]]
        pc = entry["pc"]
        sp = entry["sp"]
        ts_lines.append("  {")
        ts_lines.append(f'    id: "{section["id"]}",')
        ts_lines.append(
            f'    pc: {{ file: "{pc["file"]}", width: {pc["width"]}, height: {pc["height"]} }},'
        )
        ts_lines.append(
            f'    sp: {{ file: "{sp["file"]}", width: {sp["width"]}, height: {sp["height"]} }},'
        )
        ts_lines.append("  },")
    ts_lines.append("];")
    ts_lines.append("")

    MANIFEST_TS.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST_TS.write_text("\n".join(ts_lines), encoding="utf-8")
    log(f"generatedImageSizes.ts を出力しました: {MANIFEST_TS}")


def cleanup() -> None:
    if TMP_DIR.exists():
        shutil.rmtree(TMP_DIR)
        log("中間ファイル(PNG作業ディレクトリ)を削除しました。")


def main() -> None:
    log("=== 白木建設 採用LP アセット生成を開始します ===")
    check_source_pdfs()

    all_results: list[SectionResult] = []

    log("--- PC版セクション画像を生成 ---")
    all_results += generate_device(
        device="pc",
        pdf_path=PC_PDF,
        out_dir=OUT_PC_DIR,
        boundaries=PC_BOUNDARIES,
        scale=PC_SCALE,
        crop_left=None,
        crop_right=None,
    )

    log("--- SP版セクション画像を生成（中央コンテンツのみクロップ）---")
    all_results += generate_device(
        device="sp",
        pdf_path=SP_PDF,
        out_dir=OUT_SP_DIR,
        boundaries=SP_BOUNDARIES,
        scale=SP_SCALE,
        crop_left=SP_CROP_LEFT,
        crop_right=SP_CROP_RIGHT,
    )

    log("--- OGP画像を生成 ---")
    ogp_w, ogp_h, ogp_bytes = generate_ogp(PC_PDF)
    log(f"OGP画像: {ogp_w}x{ogp_h}px  {ogp_bytes/1024:.1f}KB -> {OUT_OGP_DIR / 'ogp.jpg'}")

    write_manifest(all_results)

    total_png = sum(r.png_bytes for r in all_results)
    total_webp = sum(r.webp_bytes for r in all_results)
    log(
        f"合計サイズ: PNG(中間) {total_png/1024/1024:.2f}MB -> "
        f"WebP(公開分) {total_webp/1024/1024:.2f}MB "
        f"(削減率 {100*(1-total_webp/total_png):.1f}%)"
    )

    cleanup()
    log("=== 完了しました ===")


if __name__ == "__main__":
    main()
