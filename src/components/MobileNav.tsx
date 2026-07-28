"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { mobileNavItems, mobileNavTriggerRect } from "@/config/mobileNav";

/**
 * SP版ヘッダーの三本線メニュー。
 *
 * デザイン画像の三本線アイコンの位置へ透明なボタンを重ね、
 * タップでページ内遷移用のメニューを開く。
 * （デザインに「開いた状態」がないため、パネルはデザインから採取した色で構成している）
 */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstItemRef = useRef<HTMLAnchorElement>(null);

  const close = useCallback(() => setOpen(false), []);

  // パネルはセクションの overflow に切られないよう body 直下へ描画する
  useEffect(() => setMounted(true), []);

  // 開いている間は背面のスクロールを止める
  useEffect(() => {
    if (!open) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    firstItemRef.current?.focus();

    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  const panel = (
    <div
      id={panelId}
      className={`mobile-nav__panel${open ? " is-open" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="メニュー"
      data-testid="mobile-nav-panel"
      hidden={!open}
    >
      <div className="mobile-nav__bar">
        <span className="mobile-nav__title">MENU</span>
        <button
          type="button"
          className="mobile-nav__close"
          aria-label="メニューを閉じる"
          data-testid="mobile-nav-close"
          onClick={() => {
            close();
            triggerRef.current?.focus();
          }}
        >
          <span aria-hidden="true">✕</span>
        </button>
      </div>

      <nav className="mobile-nav__list" aria-label="ページ内メニュー">
        {mobileNavItems.map((item, index) => (
          <a
            key={item.target}
            ref={index === 0 ? firstItemRef : undefined}
            href={`#${item.target}`}
            className="mobile-nav__item"
            data-nav-target={item.target}
            onClick={close}
          >
            {item.label}
          </a>
        ))}
      </nav>
    </div>
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="mobile-nav__trigger"
        style={{
          left: `${mobileNavTriggerRect.left}%`,
          top: `${mobileNavTriggerRect.top}%`,
          width: `${mobileNavTriggerRect.width}%`,
          height: `${mobileNavTriggerRect.height}%`,
        }}
        aria-label="メニューを開く"
        aria-expanded={open}
        aria-controls={panelId}
        data-testid="mobile-nav-trigger"
        onClick={() => setOpen(true)}
      />

      {mounted ? createPortal(panel, document.body) : null}
    </>
  );
}
