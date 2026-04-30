type SoundName = "logo";

const sources: Record<SoundName, string> = {
  logo: "/assets/sounds/logo.mp3"
};

const cache = new Map<SoundName, HTMLAudioElement>();

function getAudio(name: SoundName) {
  if (typeof window === "undefined") return undefined;
  let el = cache.get(name);
  if (!el) {
    el = new Audio(sources[name]);
    el.preload = "auto";
    el.load();
    cache.set(name, el);
  }
  return el;
}

export function primeSound() {
  (Object.keys(sources) as SoundName[]).forEach(getAudio);
}

export function playSound(name: SoundName) {
  const el = getAudio(name);
  if (!el) return;
  el.currentTime = 0;
  void el.play().catch(() => {});
}
