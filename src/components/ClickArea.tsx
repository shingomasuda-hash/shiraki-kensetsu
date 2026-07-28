import { DebugLinkLabel } from "@/components/DebugLinkLabel";
import type { RelativeRect } from "@/types/design";

type ClickAreaProps = {
  id: string;
  label: string;
  href: string | null;
  rect: RelativeRect;
  device: "pc" | "sp";
  external: boolean;
  linkType: string;
  debug: boolean;
};

export function ClickArea({
  id,
  label,
  href,
  rect,
  device,
  external,
  linkType,
  debug,
}: ClickAreaProps) {
  const style = {
    left: `${rect.left}%`,
    top: `${rect.top}%`,
    width: `${rect.width}%`,
    height: `${rect.height}%`,
  };

  if (!href) {
    if (!debug) {
      return null;
    }

    return (
      <span
        className={`click-area click-area--${device} click-area--unset`}
        data-link-id={id}
        data-link-type={linkType}
        data-url-configured="false"
        style={style}
      >
        <DebugLinkLabel
          id={id}
          linkType={linkType}
          label={label}
          device={device}
          urlConfigured={false}
        />
      </span>
    );
  }

  return (
    <a
      id={`${id}-${device}`}
      href={href}
      aria-label={label}
      className={`click-area click-area--${device}`}
      data-link-id={id}
      data-link-type={linkType}
      data-url-configured="true"
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      style={style}
    >
      {debug ? (
        <DebugLinkLabel
          id={id}
          linkType={linkType}
          label={label}
          device={device}
          urlConfigured
        />
      ) : null}
    </a>
  );
}
