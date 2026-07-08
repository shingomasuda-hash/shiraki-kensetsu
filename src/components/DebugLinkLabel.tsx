type DebugLinkLabelProps = {
  id: string;
  linkType: string;
  label: string;
  device: "pc" | "sp";
  urlConfigured: boolean;
};

export function DebugLinkLabel({ id, linkType, label, device, urlConfigured }: DebugLinkLabelProps) {
  return (
    <span className="debug-link-label" aria-hidden="true">
      <strong>{id}</strong>
      <span>{`[${device}/${linkType}]`}</span>
      <span>{label}</span>
      <span>{urlConfigured ? "URL設定済み" : "URL未設定"}</span>
    </span>
  );
}
