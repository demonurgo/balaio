export type HapticTone = "light" | "selection" | "success";

const patterns: Record<HapticTone, number | number[]> = {
  light: 8,
  selection: 12,
  success: [10, 20, 14]
};

export function triggerHaptic(tone: HapticTone = "light") {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) {
    return;
  }

  navigator.vibrate(patterns[tone]);
}
