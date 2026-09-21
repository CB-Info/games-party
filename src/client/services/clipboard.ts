/**
 * Copies a link to the clipboard. The browser refuses outside a secure context or without a user
 * gesture, so the caller must tell the player when it failed.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
