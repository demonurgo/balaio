import { WebHaptics } from "web-haptics";

export type HapticTone = "light" | "selection" | "success";

const fallbackPatterns: Record<HapticTone, number | number[]> = {
  light: 15,
  selection: 8,
  success: [30, 60, 40]
};

let haptics: WebHaptics | undefined;

function getHaptics() {
  if (typeof window === "undefined") {
    return undefined;
  }

  haptics ??= new WebHaptics();
  return haptics;
}

export function triggerHaptic(tone: HapticTone = "light") {
  const engine = getHaptics();

  if (engine && WebHaptics.isSupported) {
    void engine.trigger(tone);
    return;
  }

  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(fallbackPatterns[tone]);
  }
}
