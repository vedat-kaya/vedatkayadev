import "@fontsource/space-grotesk/latin-400.css";
import "@fontsource/space-grotesk/latin-500.css";
import "@fontsource/space-grotesk/latin-700.css";
import "@fontsource/space-grotesk/latin-ext-400.css";
import "@fontsource/space-grotesk/latin-ext-500.css";
import "@fontsource/space-grotesk/latin-ext-700.css";
import "./style.css";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { bootChrome, isDesktop, reduceMotion } from "./boot.js";

gsap.registerPlugin(ScrollTrigger);

if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}
window.scrollTo(0, 0);

const { lenis } = bootChrome();
const INTRO_FLAG = "vk-seen-intro";
const VIDEO_HOLD_MS = 2200;
const LOAD_TIMEOUT_MS = 4000;

const reduceMotionNow = reduceMotion;
const isReturnVisit = document.documentElement.classList.contains("skip-intro");

function setCounter(el, value) {
  if (!el) return;
  el.textContent = `${Math.round(Math.max(0, Math.min(100, value)))}%`;
}

function markIntroSeen() {
  try {
    sessionStorage.setItem(INTRO_FLAG, "1");
  } catch {
    /* private mode */
  }
}

function revealHero() {
  const hero = document.querySelector("#hero-reveal");
  if (!hero) return;
  if (reduceMotionNow) {
    gsap.set(hero, { y: 0, opacity: 1 });
    return;
  }
  gsap.fromTo(
    "#hero-reveal",
    { y: 100, opacity: 0 },
    { y: 0, opacity: 1, duration: 1.2, ease: "power4.out" },
  );
}

function hidePreloader(preloader) {
  if (!preloader) {
    lenis.start();
    revealHero();
    return;
  }

  preloader.setAttribute("aria-hidden", "true");

  const settle = () => {
    preloader.classList.add("is-done");
    preloader.style.visibility = "hidden";
    preloader.style.pointerEvents = "none";
    document.body.style.overflow = "";
    lenis.start();
    window.scrollTo(0, 0);
  };

  if (reduceMotionNow || isReturnVisit) {
    settle();
    revealHero();
    return;
  }

  gsap.to(preloader, {
    y: "-100%",
    duration: 1.2,
    ease: "power4.inOut",
    onComplete: settle,
  });
  revealHero();
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = src;
  });
}

function videoBufferRatio(video) {
  try {
    if (!video.duration || !video.buffered.length) return 0;
    const end = video.buffered.end(video.buffered.length - 1);
    return Math.min(1, end / video.duration);
  } catch {
    return 0;
  }
}

function waitForVideoReady(video, onProgress) {
  return new Promise((resolve) => {
    if (!video) {
      resolve("missing");
      return;
    }
    if (video.readyState >= 4) {
      onProgress(1);
      resolve("ready");
      return;
    }

    let settled = false;
    const finish = (status) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      video.removeEventListener("progress", onBuf);
      video.removeEventListener("canplaythrough", onReady);
      video.removeEventListener("error", onErr);
      resolve(status);
    };

    const onBuf = () => onProgress(videoBufferRatio(video));
    const onReady = () => {
      onProgress(1);
      finish("ready");
    };
    const onErr = () => {
      onProgress(1);
      finish("error");
    };

    video.addEventListener("progress", onBuf);
    video.addEventListener("canplaythrough", onReady, { once: true });
    video.addEventListener("error", onErr, { once: true });
    const timer = window.setTimeout(() => finish("timeout"), LOAD_TIMEOUT_MS);
    try {
      video.load();
    } catch {
      finish("error");
    }
  });
}

function canPlayIntro(video, skipped) {
  return (
    !skipped &&
    !isReturnVisit &&
    !reduceMotionNow &&
    isDesktop() &&
    Boolean(video)
  );
}

async function playIntroReward(video, preloader) {
  if (reduceMotionNow || preloader.dataset.done === "true") return;
  const counterText = document.querySelector(".counter");
  gsap.to(counterText, { opacity: 0, duration: 0.35 });
  gsap.to(video, { opacity: 1, duration: 0.45 });
  try {
    await video.play();
  } catch {
    return;
  }
  const start = Date.now();
  await new Promise((resolve) => {
    const tick = () => {
      if (
        preloader.dataset.done === "true" ||
        Date.now() - start >= VIDEO_HOLD_MS
      ) {
        resolve();
        return;
      }
      requestAnimationFrame(tick);
    };
    tick();
  });
}

async function runPreloader() {
  const preloader = document.querySelector(".preloader");
  const counterText = document.querySelector(".counter");
  const introVideo = document.getElementById("intro-video");
  const skipBtn = document.getElementById("preloader-skip");

  if ("scrollRestoration" in history) {
    history.scrollRestoration = "manual";
  }
  window.scrollTo(0, 0);

  if (!preloader || isReturnVisit || reduceMotionNow) {
    markIntroSeen();
    if (preloader) {
      preloader.dataset.done = "true";
      hidePreloader(preloader);
    } else {
      lenis.start();
      revealHero();
    }
    return;
  }

  document.body.style.overflow = "hidden";
  lenis.stop();

  const heroImages = ["/sorsana.jpg", "/wordi.jpg", "/avatar.webp"];
  const playVideoLater = isDesktop();
  const imageShare = playVideoLater ? 0.35 : 1;
  const videoShare = playVideoLater ? 0.65 : 0;
  const imageUnit = imageShare / heroImages.length;
  let imagesLoaded = 0;
  let videoLoaded = 0;
  let skipped = false;

  const render = () => {
    setCounter(counterText, (imagesLoaded * imageUnit + videoLoaded * videoShare) * 100);
  };
  render();

  const close = () => {
    if (!preloader || preloader.dataset.done === "true") return;
    preloader.dataset.done = "true";
    markIntroSeen();
    if (introVideo) {
      introVideo.pause();
      introVideo.removeAttribute("src");
      introVideo.load();
    }
    hidePreloader(preloader);
  };

  if (skipBtn) {
    skipBtn.addEventListener("click", () => {
      if (preloader.dataset.done === "true") return;
      skipped = true;
      close();
    });
  }

  if (!playVideoLater && introVideo) {
    introVideo.removeAttribute("src");
    introVideo.load();
  }

  const imageJobs = heroImages.map((src) =>
    loadImage(src).then(() => {
      imagesLoaded += 1;
      render();
    }),
  );

  const videoJob = playVideoLater
    ? waitForVideoReady(introVideo, (ratio) => {
        videoLoaded = Math.min(1, ratio);
        render();
      }).then((status) => {
        if (status === "ready" || status === "timeout" || status === "error") {
          if (status !== "ready") videoLoaded = 1;
          render();
        }
        return status;
      })
    : Promise.resolve("skip");

  await Promise.all([...imageJobs, videoJob]);
  setCounter(counterText, 100);

  if (preloader.dataset.done === "true") return;

  if (canPlayIntro(introVideo, skipped)) {
    await playIntroReward(introVideo, preloader);
  }

  close();
}

function initProjectParallax() {
  if (reduceMotion || !isDesktop()) return;

  document.querySelectorAll("[data-parallax]").forEach((wrapper) => {
    const img = wrapper.querySelector(".project-image");
    if (!img) return;

    wrapper.addEventListener("mousemove", (e) => {
      const r = wrapper.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      gsap.to(img, {
        x: x * 24,
        y: y * 18,
        scale: 1.08,
        duration: 0.7,
        ease: "power3.out",
      });
    });

    wrapper.addEventListener("mouseleave", () => {
      gsap.to(img, { x: 0, y: 0, scale: 1, duration: 0.8, ease: "power3.out" });
    });
  });
}

runPreloader();
initProjectParallax();

if (!reduceMotion) {
  gsap.to(".hero-wrapper", {
    scrollTrigger: {
      trigger: ".hero",
      start: "top top",
      end: "bottom top",
      scrub: true,
    },
    y: -150,
    opacity: 0,
    scale: 0.9,
  });
  gsap.to(".scroll-indicator", {
    scrollTrigger: {
      trigger: ".hero",
      start: "top top",
      end: "bottom top",
      scrub: true,
    },
    opacity: 0,
    y: 50,
  });

  gsap.to(".word", {
    scrollTrigger: { trigger: ".manifesto", start: "top 80%" },
    opacity: 1,
    y: 0,
    duration: 0.8,
    stagger: 0.1,
    ease: "power2.out",
    color: "#ffffff",
  });
} else {
  gsap.set(".word", { opacity: 1, y: 0, color: "#ffffff" });
}

if (!reduceMotion) {
  gsap.utils.toArray(".work-piece").forEach((piece) => {
    gsap.from(piece, {
      y: 48,
      opacity: 0.35,
      duration: 1,
      ease: "power3.out",
      scrollTrigger: {
        trigger: piece,
        start: "top 85%",
      },
    });
  });
}
