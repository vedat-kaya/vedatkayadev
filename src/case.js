import "@fontsource/space-grotesk/latin-400.css";
import "@fontsource/space-grotesk/latin-500.css";
import "@fontsource/space-grotesk/latin-700.css";
import "@fontsource/space-grotesk/latin-ext-400.css";
import "@fontsource/space-grotesk/latin-ext-500.css";
import "@fontsource/space-grotesk/latin-ext-700.css";
import "./style.css";
import gsap from "gsap";
import { bootChrome, reduceMotion } from "./boot.js";

bootChrome();

const root = document.querySelector(".case-article");
if (root && !reduceMotion) {
  gsap.from(".case-article > *", {
    y: 40,
    opacity: 0,
    duration: 0.9,
    stagger: 0.08,
    ease: "power3.out",
  });
}
