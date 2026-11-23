const INVITE_PATH = /^\/convite\/([A-Za-z0-9_-]{8,32})\/?$/;

/** Invite code of a `/convite/:code` link (also opened as a Universal Link by the iOS app). */
export function getInviteCodeFromPath(pathname = window.location.pathname) {
  return INVITE_PATH.exec(pathname)?.[1] ?? null;
}

/** Leaves the invite URL without reloading the PWA. */
export function leaveInvitePath(hash = "feiras") {
  window.history.replaceState(null, "", `/#${hash}`);
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}
