import type { PropsWithChildren, ReactNode } from "react";

interface ModalProps extends PropsWithChildren {
  id: string;
  open: boolean;
  title: ReactNode;
  onClose(): void;
  closeButtonId?: string;
  width?: string;
  footer?: ReactNode;
}

export function Modal({
  id,
  open,
  title,
  onClose,
  closeButtonId,
  width,
  children,
  footer,
}: ModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-overlay open" id={id}>
      <button
        aria-label="Close modal"
        className="modal-backdrop"
        onClick={onClose}
        type="button"
      />
      <div
        className="modal"
        style={width ? { width } : undefined}
        role="dialog"
        tabIndex={-1}
      >
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          {closeButtonId ? (
            <button
              className="modal-close"
              id={closeButtonId}
              onClick={onClose}
              type="button"
            >
              &times;
            </button>
          ) : null}
        </div>
        <div className="modal-body">{children}</div>
        {footer}
      </div>
    </div>
  );
}
