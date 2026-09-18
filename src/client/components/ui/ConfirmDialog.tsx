import { useModalDialog } from "../../hooks/useModalDialog";
import { Button } from "./Button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  /** Also called on Escape and on a click on the veil (docs/design-system.md, §11.17). */
  onCancel: () => void;
}

/** 520 px box centred on the window veil (docs/design-system.md, §11.17). */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const ref = useModalDialog(open);

  return (
    <dialog
      ref={ref}
      onCancel={onCancel}
      onClick={(event) => {
        // A click on the veil is reported on the dialog element itself; the panel below fills the
        // whole dialog box, so anything inside the box has the panel as its target.
        if (event.target === ref.current) {
          onCancel();
        }
      }}
      className="m-auto w-[520px] rounded-xl bg-surface p-0 text-ink shadow-3 backdrop:bg-window-veil"
    >
      {/* Rendered only while open, so the entrance animation replays on every opening. */}
      {open ? (
        <div className="flex animate-appear flex-col gap-6 p-10">
          <div className="flex flex-col gap-3">
            <h2 className="t-title-2">{title}</h2>
            <p className="t-body text-ink-secondary">{message}</p>
          </div>
          <div className="flex gap-4">
            <Button variant="secondary" className="flex-1" autoFocus onClick={onCancel}>
              {cancelLabel}
            </Button>
            <Button variant="danger" className="flex-1" onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </div>
      ) : null}
    </dialog>
  );
}
