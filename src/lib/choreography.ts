import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { aboutProgress } from "./scroll";
import {
  aboutAnswer,
  aboutFocus,
  aboutMark,
  aboutRecede,
  aboutWords,
} from "./about";

// Single orchestration layer for FRAMING content (identity/final sides,
// project chapter). Project scenes are NOT gated by the iris: each scene
// enters, holds, and releases on scroll while the object reframes beside
// it (see journey.ts) — the handoff is causal, never an independent fade.

// THE QUESTION'S OWN SCALE AT ITS MARKER. One number, and the machine's size
// follows it for free: lib/about.ts re-measures the dot off the live,
// transformed glyph every frame, so the machine is always the punctuation dot
// of whatever size the question currently is. Nothing has to be told twice.
const ABOUT_MARKER = 0.3;

// The About chapter's type is written from `t` — the chapter's one clock —
// rather than from a GSAP timeline. That is deliberate: the machine's
// transform is a pure function of the same `t` (lib/journey.ts), so a
// timeline of hand-placed keyframes here would be a SECOND clock for the same
// chapter, and the two would agree only while nobody touched either. Written
// this way the words and the machine cannot disagree about which of the
// chapter's seven states this frame is.
function writeAbout(t: number): void {
  const markIn = aboutMark(t); // the hook resolving out of the machine
  const wordsIn = aboutWords(t); // the words, last of all
  const qOut = aboutRecede(t); // the question LEAVING, not fading back
  const aIn = aboutAnswer(t); // the answer resolving

  // The question's LOCKUP: two lines and the exit they share. Its opacity and
  // its transform are inert until qOut — the lockup does not arrive, its two
  // halves do, and the machine is already at the dot while they do. transform-
  // origin is top-centre, so the exit pulls the lockup toward the rail rather
  // than toward the middle of the frame: the question leaves upward, and the
  // space it vacates is where the answer comes up from.
  //
  // qOut REACHES 1, and that is the whole point of the re-timing: the old 0.34
  // floor left a giant grey "WHO AM I?" sitting over the answer for the entire
  // answer phase, so the page was reading QUESTION + ANSWER as one composition.
  // At 1 the last ink is gone on the same frame the first word of the answer
  // begins, and there is no frame in which both are on screen.
  const q = ABOUT.q;
  if (q) {
    const scale = 1 - (1 - ABOUT_MARKER) * qOut;
    const lift = -qOut * 30;
    q.style.opacity = (1 - qOut).toFixed(3);
    q.style.transform = `translate3d(0, ${lift.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
  }

  // THE HOOK — opacity and a clip variable, and NOTHING else. No transform is
  // ever written here: the machine is welded to this glyph's punctuation dot
  // (lib/about.ts), so moving or scaling the mark would drag the machine off
  // the dot it just became. `--q-m` is the reveal front, and globals.css runs
  // the clip up out of the dot with it while cutting the glyph's own dot away.
  const mark = ABOUT.mark;
  if (mark) {
    mark.style.opacity = markIn.toFixed(3);
    mark.style.setProperty("--q-m", markIn.toFixed(3));
  }

  // THE WORDS. The one thing in this chapter that may move: it is not welded
  // to anything, and it arrives after the punctuation is already established.
  const words = ABOUT.words;
  if (words) {
    words.style.opacity = wordsIn.toFixed(3);
    words.style.transform = `translate3d(0, ${((1 - wordsIn) * 16).toFixed(2)}px, 0)`;
  }

  if (ABOUT.stage) ABOUT.stage.style.setProperty("--ab-focus", aboutFocus(t).toFixed(3));

  // THE ANSWER, on a frame that is already empty. One coherent rise, one
  // stagger, no second pass. The role line leads because it is the sentence the
  // question was asking for.
  //
  // There is deliberately no exit term here. The chapter's own clock ends at
  // t 1.00 while the sticky stage is still pinned; the stage then releases over
  // one viewport of scroll and carries this copy out of frame with real
  // movement. A fade written here would have to finish a viewport BEFORE that
  // release to be an exit at all, which put a fully black frame between the
  // answer and the orbit — the exact dead transition this pass removed. So the
  // answer holds at full strength to the end of `t` and leaves by being
  // scrolled away, and the machine is already gone by then (aboutVanish), so
  // nothing is left behind in the frame it vacates.
  const lines = ABOUT.lines;
  for (let i = 0; i < lines.length; i++) {
    const a = ease(clamp01((aIn - i * 0.11) / 0.5));
    lines[i].style.opacity = a.toFixed(3);
    lines[i].style.transform = `translate3d(0, ${((1 - a) * 26).toFixed(2)}px, 0)`;
  }
  const meta = ABOUT.meta;
  for (let i = 0; i < meta.length; i++) {
    const a = ease(clamp01((aIn - 0.42 - i * 0.09) / 0.42));
    meta[i].style.opacity = a.toFixed(3);
    meta[i].style.transform = `translate3d(0, ${((1 - a) * 12).toFixed(2)}px, 0)`;
  }
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const ease = (v: number) => v * v * (3 - 2 * v);

const ABOUT: {
  stage: HTMLElement | null;
  q: HTMLElement | null;
  mark: HTMLElement | null;
  words: HTMLElement | null;
  lines: HTMLElement[];
  meta: HTMLElement[];
} = { stage: null, q: null, mark: null, words: null, lines: [], meta: [] };

export function initChoreography(): () => void {
  gsap.registerPlugin(ScrollTrigger);
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const ctx = gsap.context(() => {
    // Reduced motion is the ONLY case that gets a still frame. Viewport width
    // is deliberately not one of them: the chapters below are written in `vh`
    // and solved against the live layout, so the same nine states of the About
    // clock run identically at 390px — including the beat where the machine is
    // the punctuation dot of the "?", which lib/about.ts solves by
    // unprojecting the glyph's own measured pixel through the real camera.
    if (reduced) {
      gsap.set(".reveal-line > span", { y: 0 });
      gsap.set(".side-l, .side-r", { clearProps: "all", opacity: 1 });
      gsap.set(".rise-stage > *", { clearProps: "all", opacity: 1 });
      gsap.set("[data-present-inner]", { clearProps: "all", opacity: 1 });
      // ONE state, not two. The animated chapter runs QUESTION → ANSWER as two
      // separate compositions; this path can only ever render one static frame,
      // so it renders the QUESTION — at full strength, with the machine welded
      // to its dot by Scene/Aperture.tsx for as long as the chapter is on
      // screen — and takes the answer off entirely. Showing both at once is the
      // exact composition the chapter was re-timed to eliminate.
      gsap.set(".about-role, .about-lede, .about-note, .about-answer dl > *", {
        opacity: 0,
      });
      gsap.set(".about-q", {
        yPercent: 0,
        scale: ABOUT_MARKER,
        opacity: 1,
      });
      return;
    }

    // Hero has no entrance tween: the BLIND frame is static by design —
    // the focus pull on first scroll IS the entrance. (Dead selectors
    // here would only spam GSAP missing-target warnings.)

    // Stillness lines: rise, hold sharp in the bore, release. No
    // lateral drift — centered content must stay centered.
    gsap.utils.toArray<HTMLElement>(".rise-stage").forEach((stage) => {
      const inner = stage.firstElementChild as HTMLElement | null;
      if (!inner) return;
      const tl = gsap.timeline({
        scrollTrigger: { trigger: stage, start: "top bottom", end: "bottom top", scrub: true },
      });
      tl.fromTo(
        inner,
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.3, ease: "none" },
        0.25
      ).to(inner, { y: -40, opacity: 0, duration: 0.2, ease: "none" }, 0.8);
    });
    // Orbit stages: enter → hold → exit outward. Line masks ride the same
    // timeline (separate per-span triggers orphan under Lenis smoothing).
    gsap.utils.toArray<HTMLElement>(".orbit-stage").forEach((stage) => {
      const left = stage.querySelectorAll(".side-l");
      const right = stage.querySelectorAll(".side-r");
      const tl = gsap.timeline({
        scrollTrigger: { trigger: stage, start: "top bottom", end: "bottom top", scrub: true },
      });
      if (left.length) {
        tl.fromTo(
          left,
          { xPercent: -10, opacity: 0 },
          { xPercent: 0, opacity: 1, duration: 0.25, ease: "none" },
          0.25
        ).to(left, { xPercent: -14, opacity: 0, duration: 0.25, ease: "none" }, 0.72);
      }
      if (right.length) {
        tl.fromTo(
          right,
          { xPercent: 10, opacity: 0 },
          { xPercent: 0, opacity: 1, duration: 0.25, ease: "none" },
          0.25
        ).to(right, { xPercent: 14, opacity: 0, duration: 0.25, ease: "none" }, 0.72);
      }
      const masks = stage.querySelectorAll(".reveal-line > span");
      if (masks.length) {
        tl.fromTo(
          masks,
          { yPercent: 110 },
          { yPercent: 0, duration: 0.28, ease: "none" },
          0.2
        );
      }
    });
    // ABOUT — "WHO AM I?" (see lib/about.ts and lib/journey.ts).
    //
    // ONE window, "top top" → "bottom bottom", which is exactly the part of
    // the chapter that is actually on screen and exactly the range lib/scroll.ts
    // normalises `t` over. So a position in here is a position in the machine's
    // journey too — which is the entire point: this section used to drive the
    // type from a GSAP timeline and the machine from a function of `t`, and two
    // clocks for one chapter is how a question ends up sitting in the corner
    // with the machine parked over the answer. There is now only `t`.
    const aboutSection = document.querySelector<HTMLElement>("#about");
    if (aboutSection) {
      ABOUT.stage = aboutSection.querySelector<HTMLElement>(".about-stage");
      ABOUT.q = aboutSection.querySelector<HTMLElement>(".about-q");
      ABOUT.mark = aboutSection.querySelector<HTMLElement>(".about-q-mark");
      ABOUT.words = aboutSection.querySelector<HTMLElement>(".about-q-line");
      ABOUT.lines = gsap.utils.toArray<HTMLElement>(
        ".about-role, .about-lede, .about-note"
      );
      ABOUT.meta = gsap.utils.toArray<HTMLElement>(".about-answer dl > *");
      const write = () => writeAbout(aboutProgress());
      ScrollTrigger.create({
        trigger: aboutSection,
        start: "top top",
        end: "bottom bottom",
        onUpdate: write,
        onRefresh: write,
      });
      write();
    }

    // Project scenes: ENTER → HOLD → TRANSITION. One coherent rise/hold/
    // release per scene (no per-line staggers fighting the reframing
    // object). The enter starts the instant the section touches the
    // viewport and the exit only finishes when the section has fully
    // released — maximum overlap, so a handoff always shows old-leaving
    // + object + new-entering and the object never crosses an empty
    // stage. Gentle ±40px drift keeps content fuller, longer.
    gsap.utils.toArray<HTMLElement>("[data-present]").forEach((stage) => {
      const inner = stage.querySelector("[data-present-inner]") as HTMLElement | null;
      if (!inner) return;
      const tl = gsap.timeline({
        scrollTrigger: { trigger: stage, start: "top bottom", end: "bottom top", scrub: true },
      });
      tl.fromTo(
        inner,
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.30, ease: "none" },
        0.0
      ).to(inner, { y: -40, opacity: 0, duration: 0.28, ease: "none" }, 0.72);
    });
  });

  return () => ctx.revert();
}
