try {
  if (sessionStorage.getItem("vk-seen-intro") === "1") {
    document.documentElement.classList.add("skip-intro");
  }
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.documentElement.classList.add("reduce-motion", "skip-intro");
  }
} catch (e) {
  /* private mode */
}
