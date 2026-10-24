import { internalLinkMap } from "@/config/linkMap";
import type { InternalLinkKey } from "@/types/design";

/**
 * 画面の下に出しっぱなしにする応募導線。
 *
 * デザイン画像の中のボタンは、そこまで読み進めた人しか押せない。
 * どこを見ているときでも応募できるよう、常に見えるボタンを重ねておく。
 *
 * 行き先は実在するセクションからしか選べない（internalLinkMap）。
 */
const buttons: { id: string; label: string; target: InternalLinkKey; variant: string }[] = [
  { id: "sticky-cta-consult", label: "相談してみる", target: "contact", variant: "primary" },
  { id: "sticky-cta-visit", label: "見学してみる", target: "contact", variant: "secondary" },
];

export function StickyCta() {
  return (
    <aside className="sticky-cta" aria-label="応募・問い合わせ" data-testid="sticky-cta">
      <div className="sticky-cta__inner">
        {buttons.map((button) => (
          <a
            key={button.id}
            id={button.id}
            className={`sticky-cta__button sticky-cta__button--${button.variant}`}
            href={internalLinkMap[button.target]}
          >
            {button.label}
          </a>
        ))}
      </div>
    </aside>
  );
}
