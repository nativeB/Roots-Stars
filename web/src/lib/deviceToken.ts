/** Per-family device token storage. The token is the invisible, account-less identity. */
const keyFor = (familyId: string) => `roots:token:${familyId}`;

export function getDeviceToken(familyId: string): string | null {
  try {
    return localStorage.getItem(keyFor(familyId));
  } catch {
    return null;
  }
}

export function setDeviceToken(familyId: string, token: string): void {
  try {
    localStorage.setItem(keyFor(familyId), token);
  } catch {
    /* storage may be unavailable (private mode); token simply won't persist */
  }
}

export function clearDeviceToken(familyId: string): void {
  try {
    localStorage.removeItem(keyFor(familyId));
  } catch {
    /* ignore */
  }
}
