import { WebHaptics } from "web-haptics";

export type HapticTone =
  | "light"
  | "medium"
  | "heavy"
  | "soft"
  | "rigid"
  | "selection"
  | "success"
  | "warning"
  | "error"
  | "nudge"
  | "buzz";

let haptics: WebHaptics | undefined;

function getHaptics() {
  if (typeof window === "undefined") {
    return undefined;
  }

  haptics ??= new WebHaptics();
  return haptics;
}

export function primeHaptics() {
  getHaptics();
}

export function triggerHaptic(tone: HapticTone = "light") {
  const engine = getHaptics();
  if (!engine) return;

  void engine.trigger(tone);
}
