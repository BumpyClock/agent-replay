import type { RefObject } from "react";

interface PreviewPaneProps {
  previewUrl: string | null;
  refreshing: boolean;
  iframeRef: RefObject<HTMLIFrameElement | null>;
}

export function PreviewPane({
  previewUrl,
  refreshing,
  iframeRef,
}: PreviewPaneProps) {
  return (
    <div className="preview-panel">
      <div className="preview-header">
        <div className="preview-header-copy">
          <span className="preview-eyebrow">render</span>
          <span className="preview-title">Preview</span>
        </div>
        <span
          className={`refresh-indicator ${refreshing ? "active" : ""}`}
          id="refreshIndicator"
        >
          Refreshing...
        </span>
      </div>
      <iframe
        className={`preview-iframe ${refreshing ? "refreshing" : ""}`}
        id="previewIframe"
        ref={iframeRef}
        src={previewUrl || undefined}
        title="Replay preview"
      />
    </div>
  );
}
