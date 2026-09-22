import { useEffect, useRef, useState } from "react";

import { COPY_FEEDBACK_MS } from "../../../../shared/constants";
import { Button } from "../../../components/ui/Button";
import { CheckIcon } from "../../../components/ui/icons/CheckIcon";
import { LinkIcon } from "../../../components/ui/icons/LinkIcon";

interface CopyLinkButtonProps {
  onCopy: () => Promise<boolean>;
  /** Primary while the room lacks players, soft otherwise (docs/design-system.md, §11.2). */
  highlighted: boolean;
}

const IDLE_LABEL = "Copier le lien";
const COPIED_LABEL = "Lien copié";

/** The label swaps for two seconds, without the button ever changing size (§11.1, §11.2). */
export function CopyLinkButton({ onCopy, highlighted }: CopyLinkButtonProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) {
        clearTimeout(timer.current);
      }
    },
    [],
  );

  async function handleClick(): Promise<void> {
    const done = await onCopy();
    if (!done) {
      return;
    }

    setCopied(true);
    if (timer.current !== null) {
      clearTimeout(timer.current);
    }
    timer.current = setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
  }

  return (
    <Button
      variant={highlighted ? "primary" : "soft"}
      icon={copied ? <CheckIcon /> : <LinkIcon />}
      onClick={() => void handleClick()}
    >
      {/* Both labels share one cell, so the widest one fixes the width (§11.1). */}
      <span className="grid">
        <span className="invisible col-start-1 row-start-1">{IDLE_LABEL}</span>
        <span className="invisible col-start-1 row-start-1">{COPIED_LABEL}</span>
        <span className="col-start-1 row-start-1">{copied ? COPIED_LABEL : IDLE_LABEL}</span>
      </span>
    </Button>
  );
}
