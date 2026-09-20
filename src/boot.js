import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);

export const reduceMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

export const isDesktop = () => window.matchMedia("(min-width: 769px)").matches;

export function createLenis() {
  const lenis = new Lenis({
    duration: reduceMotion ? 0 : 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    autoRaf: false,
  });

  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);

  return lenis;
}

export function initCursor() {
  const cursorDot = document.querySelector(".cursor-dot");
  if (!cursorDot) return null;

  const enable =
    !reduceMotion && isDesktop() && window.matchMedia("(pointer: fine)").matches;

  if (!enable) {
    cursorDot.remove();
    document.body.classList.remove("has-custom-cursor");
    return null;
  }

  document.body.classList.add("has-custom-cursor");

  const hoverTargets = document.querySelectorAll(".hover-target");
  window.addEventListener("mousemove", (e) => {
    gsap.to(cursorDot, {
      x: e.clientX,
      y: e.clientY,
      duration: 0.15,
      ease: "power2.out",
    });
  });

  hoverTargets.forEach((target) => {
    target.addEventListener("mouseenter", () => {
      cursorDot.classList.add("hovered");
    });
    target.addEventListener("mouseleave", () => {
      cursorDot.classList.remove("hovered");
    });
  });

  document
    .querySelectorAll(".navbar, .navbar-mini, .cv-takeover")
    .forEach((nav) => {
      nav.addEventListener("mouseenter", () => {
        cursorDot.style.opacity = "0";
      });
      nav.addEventListener("mouseleave", () => {
        cursorDot.style.opacity = "1";
      });
    });

  return cursorDot;
}

export function initHashScroll(lenis) {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    if (anchor.hasAttribute("data-cv")) return;

    anchor.addEventListener("click", (e) => {
      const targetId = anchor.getAttribute("href");
      e.preventDefault();
      if (!targetId || targetId === "#") {
        lenis.scrollTo(0, { duration: reduceMotion ? 0 : 1.5 });
        return;
      }
      const el = document.querySelector(targetId);
      if (el) lenis.scrollTo(el, { duration: reduceMotion ? 0 : 1.5, offset: 0 });
    });
  });
}

export function initMiniNavbar(lenis) {
  const miniNavbar = document.querySelector(".navbar-mini");
  if (!miniNavbar) return miniNavbar;

  miniNavbar.addEventListener("click", (e) => {
    if (e.target.closest("#mobile-menu-open")) return;
    if (!isDesktop()) return;
    lenis.scrollTo(0, { duration: reduceMotion ? 0 : 1.5 });
  });

  return miniNavbar;
}

export function initMobileNav() {
  const openBtn = document.getElementById("mobile-menu-open");
  const closeBtn = document.getElementById("mobile-menu-close");
  const panel = document.getElementById("mobile-nav-panel");
  const mini = document.getElementById("navbar-mini");
  if (!openBtn || !panel || !closeBtn) return;

  const focusables = () =>
    panel.querySelectorAll("a, button, textarea, input, select");

  const close = () => {
    panel.classList.remove("active");
    openBtn.setAttribute("aria-expanded", "false");
    panel.setAttribute("aria-hidden", "true");
    if (mini) mini.style.opacity = "1";
    openBtn.focus();
  };

  const open = () => {
    panel.classList.add("active");
    openBtn.setAttribute("aria-expanded", "true");
    panel.setAttribute("aria-hidden", "false");
    if (mini) mini.style.opacity = "0";
    const first = focusables()[0];
    if (first) first.focus();
  };

  openBtn.setAttribute("aria-expanded", "false");
  openBtn.setAttribute("aria-controls", "mobile-nav-panel");
  panel.setAttribute("aria-hidden", "true");
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Menü");

  openBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    open();
  });
  closeBtn.addEventListener("click", close);

  panel.querySelectorAll(".mobile-link").forEach((link) => {
    link.addEventListener("click", close);
  });

  document.addEventListener("keydown", (e) => {
    if (!panel.classList.contains("active")) return;
    if (e.key === "Escape") {
      close();
      return;
    }
    if (e.key !== "Tab") return;
    const items = [...focusables()];
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });
}

export function initMusic() {
  const musicBtn = document.getElementById("music-btn");
  const bgMusic = document.getElementById("bg-music");
  if (!musicBtn || !bgMusic) return;

  let isPlaying = false;
  musicBtn.setAttribute("role", "button");
  musicBtn.setAttribute("aria-label", "Müzik");
  musicBtn.tabIndex = 0;

  const toggle = () => {
    if (isPlaying) {
      bgMusic.pause();
      musicBtn.classList.remove("playing");
      musicBtn.setAttribute("aria-pressed", "false");
    } else {
      bgMusic.play().catch(() => {});
      musicBtn.classList.add("playing");
      musicBtn.setAttribute("aria-pressed", "true");
    }
    isPlaying = !isPlaying;
  };

  musicBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggle();
  });
  musicBtn.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle();
    }
  });
}

export function initNavbarHide(lenis, miniNavbar) {
  const fullNavbar = document.querySelector(".full-navbar");
  if (!fullNavbar || !miniNavbar) return;

  let lastScrollY = 0;
  lenis.on("scroll", ({ scroll }) => {
    if (!isDesktop()) return;
    if (scroll < 100) {
      fullNavbar.classList.remove("hidden");
      miniNavbar.classList.remove("visible");
    } else if (scroll > lastScrollY) {
      fullNavbar.classList.add("hidden");
      miniNavbar.classList.remove("visible");
    } else {
      fullNavbar.classList.add("hidden");
      miniNavbar.classList.add("visible");
    }
    lastScrollY = scroll;
  });
}

export function initCV(lenis, cursorDot) {
  const cvTakeover = document.querySelector(".cv-takeover");
  const cvClose = document.querySelector(".cv-close");
  if (!cvTakeover || !cvClose) return;

  const triggers = document.querySelectorAll("[data-cv]");
  const cvAnimItems = gsap.utils.toArray(".cv-anim-item");

  const handleTakeoverScroll = (e) => {
    cvTakeover.scrollTop += e.deltaY;
  };

  const openCV = (e) => {
    if (e) e.preventDefault();
    cvTakeover.scrollTop = 0;
    cvTakeover.classList.add("active");
    cvTakeover.setAttribute("aria-hidden", "false");
    if (cursorDot) cursorDot.style.opacity = "0";

    if (reduceMotion) {
      gsap.set(cvTakeover, { y: "0%" });
      gsap.set(cvAnimItems, { y: 0, opacity: 1 });
    } else {
      gsap.to(cvTakeover, { y: "0%", duration: 1, ease: "power4.inOut" });
      gsap.fromTo(
        cvAnimItems,
        { y: 60, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.1,
          delay: 0.5,
          ease: "power3.out",
        },
      );
    }

    document.body.style.overflow = "hidden";
    lenis.stop();
    cvTakeover.addEventListener("wheel", handleTakeoverScroll);
    cvClose.focus();
  };

  const closeCV = () => {
    cvTakeover.removeEventListener("wheel", handleTakeoverScroll);
    const finish = () => {
      cvTakeover.classList.remove("active");
      cvTakeover.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      if (cursorDot && isDesktop()) cursorDot.style.opacity = "1";
      lenis.start();
    };

    if (reduceMotion) {
      gsap.set(cvTakeover, { y: "100%" });
      finish();
      return;
    }

    gsap.to(cvTakeover, {
      y: "100%",
      duration: 0.8,
      ease: "power4.inOut",
      onComplete: finish,
    });
  };

  triggers.forEach((trigger) => trigger.addEventListener("click", openCV));
  cvClose.addEventListener("click", closeCV);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && cvTakeover.classList.contains("active")) closeCV();
  });

}

export function initContactForm() {
  const form = document.getElementById("contact-form");
  if (!form) return;

  const status = document.getElementById("contact-status");
  const started = Date.now();
  let busy = false;

  const setStatus = (text, kind) => {
    if (!status) return;
    status.textContent = text;
    status.classList.remove("is-ok", "is-err");
    if (kind) status.classList.add(kind);
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (busy) return;

    const data = new FormData(form);
    const payload = {
      name: String(data.get("name") || "").trim(),
      email: String(data.get("email") || "").trim(),
      message: String(data.get("message") || "").trim(),
      company: String(data.get("company") || "").trim(),
      t: started,
    };

    busy = true;
    const button = form.querySelector("button[type='submit']");
    if (button) button.disabled = true;
    setStatus("Gönderiliyor…");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(8000),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json && json.ok === true) {
        form.reset();
        setStatus("Mesajın alındı.", "is-ok");
        return;
      }
      if (res.status === 429) {
        setStatus("Biraz yavaş. Az sonra tekrar dene.", "is-err");
        return;
      }
      setStatus("Gönderilemedi. Metni kontrol et veya e-posta kullan.", "is-err");
    } catch {
      setStatus("Bağlantı yok. vedatline@gmail.com", "is-err");
    } finally {
      busy = false;
      if (button) button.disabled = false;
    }
  });
}

export function bootChrome() {
  const lenis = createLenis();
  const cursorDot = initCursor();
  initHashScroll(lenis);
  const miniNavbar = initMiniNavbar(lenis);
  initMobileNav();
  initMusic();
  initNavbarHide(lenis, miniNavbar);
  initCV(lenis, cursorDot);
  initContactForm();
  return { lenis, cursorDot };
}
