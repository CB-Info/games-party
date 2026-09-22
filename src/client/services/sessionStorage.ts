const SESSION_TOKEN_KEY = "games-party.session-token";

/**
 * The secret token identifying this browser. It is sent back in the Socket.IO handshake so that a
 * returning player finds their seat (docs/architecture.md, §4).
 */
export function readSessionToken(): string | null {
  try {
    return localStorage.getItem(SESSION_TOKEN_KEY);
  } catch {
    // Private browsing and blocked storage: the player simply gets a new session each time.
    return null;
  }
}

export function writeSessionToken(token: string): void {
  try {
    localStorage.setItem(SESSION_TOKEN_KEY, token);
  } catch {
    // Nothing to do: a session that cannot be stored is a session that cannot be resumed.
  }
}
