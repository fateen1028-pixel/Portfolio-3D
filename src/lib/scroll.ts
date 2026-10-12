// Central scroll source of truth. Mutable singleton — never React state
// (high-frequency scroll data must not re-render React).
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { aboutState } from "./about";

export const scrollState = {
  progress: 0, // 0..1 in the page's OWN timeline — see mapProgress below
  scrollY: 0, // true document pixels, for anything that measures the DOM
  velocity: 0,
  reducedMotion: false,
  narrow: false, // mobile composition flag
};

// The About chapter's scroll box, in document pixels. Measured, never
// hardcoded, so it is correct at every viewport height.
export const aboutBox = { top: 0, height: 0 };

// THE CHAPTER'S OWN CLOCK, as a function of the document — the single
// definition of "how far through the About chapter are we". The master trigger
// below stores it on aboutState for the 3D side; lib/choreography.ts calls this
// for the type. Two readers of one function rather than two implementations
// that can drift, and no dependency on which ScrollTrigger updates first.
export function aboutProgress(): number {
  const pinned = aboutBox.height - window.innerHeight;
  if (pinned <= 0) return 0;
  return Math.min(1, Math.max(0, (scrollState.scrollY - aboutBox.top) / pinned));
}

let lenis: Lenis | null = null;

/* ────────────────────────────────────────────────────────────────────────
   ABOUT — AND THE TIMELINE THE REST OF THE PAGE IS WRITTEN IN.

   Every scroll anchor on this site (the whole keyframe list in journey.ts,
   the orbit's fade and rotation windows, the chapter caption gates, the
   navbar's active ranges) is authored in the document-progress timeline that
   existed BEFORE the About chapter. The chapter inserts its own scroll
   distance between the hero and the orbit, so raw document progress would
   slide every one of those anchors and re-time the entire site.

   mapProgress keeps speaking the old timeline instead:

     above the chapter   unchanged
     inside the chapter  HOLD — the hero's last frame, held still
     below the chapter   the chapter's distance subtracted

   Two consequences, both the point:
     · below About, mapProgress(y) === (y - aboutBox.height) / oldMax, which
       is exactly what the page computed before About existed — so the orbit,
       projects, UnderThe Surface, wafer and footer keep their precise
       positions and sample the identical camera state, beat for beat;
     · About itself holds the hero's final frame, so the machine simply
       settles beside the operator instead of replaying the hero's entry.
   It is continuous at both boundaries, so nothing can jump.
   ──────────────────────────────────────────────────────────────────────── */

function measureAbout() {
  const el = document.getElementById("about");
  aboutBox.top = el ? el.offsetTop : 0;
  aboutBox.height = el ? el.offsetHeight : 0;
}

function mapProgress(y: number, max: number): number {
  const { top, height } = aboutBox;
  if (!height) return y / max;
  const legacy = y <= top ? y : y <= top + height ? top : y - height;
  return legacy / (max - height);
}

export function initSmoothScroll(): () => void {
  gsap.registerPlugin(ScrollTrigger);
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  scrollState.reducedMotion = mq.matches;
  const onMq = (e: MediaQueryListEvent) => {
    scrollState.reducedMotion = e.matches;
  };
  mq.addEventListener?.("change", onMq);

  const onResize = () => {
    scrollState.narrow = window.innerWidth < 768;
  };
  onResize();
  window.addEventListener("resize", onResize);
  measureAbout();

  // Master scrub trigger: whole document progress drives the 3D journey.
  const master = ScrollTrigger.create({
    trigger: document.body,
    start: 0,
    end: "max",
    scrub: true,
    onUpdate: (self) => {
      scrollState.scrollY = self.scroll();
      const max = self.end - self.start;
      scrollState.progress = mapProgress(scrollState.scrollY, max);
      scrollState.velocity = self.getVelocity();
      // The chapter's own window, normalised over the PINNED range — the same
      // "top top" → "bottom bottom" the About DOM timeline uses, so one number
      // describes both the type and the machine at every viewport height.
      // `p0` is the progress the hold parks on, which is also where the journey
      // resumes below the chapter: both are pure functions of the box, so
      // changing how tall the chapter is moves neither.
      aboutState.t = aboutProgress();
      aboutState.p0 = aboutBox.height ? aboutBox.top / (max - aboutBox.height) : 0;
    },
  });

  if (scrollState.reducedMotion) {
    return () => {
      master.kill();
      mq.removeEventListener?.("change", onMq);
      window.removeEventListener("resize", onResize);
    };
  }

  lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
  lenis.on("scroll", ScrollTrigger.update);
  const tick = (time: number) => lenis?.raf(time * 1000);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);

  return () => {
    master.kill();
    gsap.ticker.remove(tick);
    lenis?.destroy();
    lenis = null;
    mq.removeEventListener?.("change", onMq);
    window.removeEventListener("resize", onResize);
  };
}

// Re-sync Lenis limits + ScrollTrigger bounds after layout shifts
// (lazy images, fonts). Without this, Lenis clamps scrolling to a stale
// page height and far jumps silently land short.
export function refreshScroll() {
  measureAbout();
  lenis?.resize();
  ScrollTrigger.refresh();
}

export function scrollToTarget(href: string) {
  const el = document.querySelector(href);
  if (!el) return;
  if (lenis) lenis.scrollTo(el as HTMLElement, { offset: 0 });
  else el.scrollIntoView({ behavior: "smooth" });
}
