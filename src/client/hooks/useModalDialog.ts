import { useEffect, useRef } from "react";

/**
 * Keeps a native `<dialog>` in sync with an `open` flag. `showModal` gives the focus trap, the
 * Escape key and the `::backdrop` layer for free, so no modal library is needed.
 */
export function useModalDialog(open: boolean) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog === null) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return ref;
}
