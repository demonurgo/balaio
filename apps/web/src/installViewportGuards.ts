export function installViewportGuards() {
  if (typeof window === "undefined") {
    return;
  }

  const preventZoom = (event: Event) => {
    event.preventDefault();
  };

  document.addEventListener("gesturestart", preventZoom, { passive: false });
  document.addEventListener("gesturechange", preventZoom, { passive: false });
  document.addEventListener("gestureend", preventZoom, { passive: false });
  document.addEventListener("dblclick", preventZoom, { passive: false });
}
