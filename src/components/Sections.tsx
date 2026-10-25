"use client";

import { useRef, useState, useEffect } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { site, projects } from "@/config/site";
import { scrollToTarget, scrollState } from "@/lib/scroll";
import { WAFER_SYSTEM } from "@/lib/wafer";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function Meta({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[11px] tracking-[0.35em] uppercase opacity-60">{children}</p>
  );
}

/** Subtle magnetic hover — physical, not gimmicky. */
export function Magnetic({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    el.style.transform = `translate(${(e.clientX - (r.left + r.width / 2)) * 0.25}px, ${
      (e.clientY - (r.top + r.height / 2)) * 0.25
    }px)`;
  };
  const reset = () => {
    if (ref.current) ref.current.style.transform = "translate(0,0)";
  };
  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={reset}
      className="inline-block transition-transform duration-300 ease-out"
    >
      {children}
    </div>
  );
}

// Progress windows follow the real chapters (measured at 1440x900, max scroll
// 28440). "03 Systems" is the wafer's own system map — APPLICATION → COMPUTE →
// DATA → INFRASTRUCTURE — which is what that beat has always meant; there is no
// separate `#systems` section any more. "04 Contact" takes the last 7% so the
// nav agrees with the frame the site actually ends on.
const navItems = [
  { n: "01", label: "About",   href: "#about",  pMin: 0,      pMax: 0.40 },
  { n: "02", label: "Work",    href: "#work",    pMin: 0.40,   pMax: 0.79 },
  { n: "03", label: "Systems", href: "#wafer",   pMin: 0.79,   pMax: 0.93 },
  { n: "04", label: "Contact", href: "#contact", pMin: 0.93,   pMax: 1.00 },
];

export function Hud() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  // Drive active state from the same scroll source-of-truth.
  // gsap.ticker runs ~60fps in sync with the 3D render loop —
  // no second IntersectionObserver, no lag, no competing tracker.
  useEffect(() => {
    const tick = () => {
      const p = scrollState.progress;
      const next = navItems.findIndex((item, i) => {
        const isLast = i === navItems.length - 1;
        return isLast ? p >= item.pMin : p >= item.pMin && p < item.pMax;
      });
      if (next !== -1) setActiveIdx(next);
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);

  // MOBILE MENU LOCK + ESCAPE. body overflow propagates to the viewport
  // (html has none of its own), so one rule stops the page scrolling behind
  // the open overlay without touching Lenis itself.
  useEffect(() => {
    if (!menuOpen) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const menuGo = (href: string) => {
    setMenuOpen(false);
    scrollToTarget(href);
  };

  return (
    // No backdrop panel — the nav floats over the dark environment.
    // pointer-events-none on the header; individual items re-enable it.
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50">
      {/* ── MOBILE MENU OVERLAY ─────────────────────────────────────────
          Full-screen, under the header bar (so the toggle stays reachable)
          and over everything else. Mounted always; invisible + inert when
          closed so its links can never take focus through either path. */}
      <div
        id="mobile-menu"
        aria-hidden={!menuOpen}
        className={`fixed inset-0 z-0 md:hidden ${menuOpen ? "pointer-events-auto visible opacity-100" : "pointer-events-none invisible opacity-0"}`}
        style={{
          background: "rgba(6,6,7,0.92)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          transition: "opacity 0.28s ease, visibility 0.28s ease",
        }}
      >
        <nav
          aria-label="Chapters"
          className="flex h-full w-full flex-col justify-center gap-6 px-8"
        >
          {navItems.map((item, i) => {
            const isActive = activeIdx === i;
            return (
              <a
                key={item.n}
                href={item.href}
                onClick={(e) => { e.preventDefault(); menuGo(item.href); }}
                style={{
                  transitionDelay: menuOpen ? `${80 + i * 55}ms` : "0ms",
                  opacity: menuOpen ? 1 : 0,
                  transform: menuOpen ? "translateY(0)" : "translateY(14px)",
                }}
                className={[
                  "pointer-events-auto flex items-center gap-4 py-2 transition-all duration-500 ease-out",
                  "text-[#EAE6DC]",
                  isActive && !menuOpen ? "" : "",
                ].join(" ")}
              >
                {/* Lime dot — active chapter only */}
                <span
                  aria-hidden
                  style={{
                    width: "5px",
                    height: "5px",
                    borderRadius: "50%",
                    flexShrink: 0,
                    background: "rgba(200,255,46,1)",
                    opacity: isActive ? 1 : 0,
                    boxShadow: isActive ? "0 0 8px rgba(200,255,46,0.5)" : "none",
                    transition: "opacity 0.25s ease",
                  }}
                />
                <span className="font-mono text-[11px] tracking-[0.32em] text-[#8F8A80]">
                  {item.n}
                </span>
                <span
                  className={`font-display text-[11vw] font-black uppercase leading-none tracking-tight ${
                    isActive ? "text-[#F1EEE6]" : "text-[#EAE6DC]/60"
                  }`}
                >
                  {item.label}
                </span>
              </a>
            );
          })}
        </nav>
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-[1600px] items-center justify-between px-6 py-[18px] md:px-10">

        {/* ── WORDMARK ────────────────────────────────────────────────── */}
        <a
          href="#hero"
          onClick={(e) => { e.preventDefault(); scrollToTarget("#hero"); }}
          className="pointer-events-auto font-mono text-[11px] font-semibold tracking-[0.22em] uppercase text-[#EAE6DC] transition-opacity duration-300 hover:opacity-100 opacity-90"
          style={{ letterSpacing: "0.22em" }}
        >
          Fateen
        </a>

        {/* ── PRIMARY NAVIGATION (desktop) ────────────────────────────── */}
        <nav aria-label="Primary" className="pointer-events-auto hidden md:block">
          <ul className="hud-nav flex items-center gap-8">
            {navItems.map((item, i) => {
              const isActive = activeIdx === i;
              return (
                <li key={item.n}>
                  <NavItem
                    item={item}
                    isActive={isActive}
                  />
                </li>
              );
            })}
          </ul>
        </nav>

        {/* ── HAMBURGER (mobile) ────────────────────────────────────────
            Two bars that open into an X. The button stays above the
            overlay (bar row is z-10 over overlay z-0) so it is also the
            close control — one control, one place, ends the story. */}
        <button
          type="button"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          onClick={() => setMenuOpen((v) => !v)}
          className="pointer-events-auto relative z-10 -mr-2 flex h-10 w-10 items-center justify-center md:hidden"
        >
          <span
            aria-hidden
            style={{
              position: "absolute",
              width: "20px",
              height: "1.5px",
              background: "#EAE6DC",
              transition: "transform 0.3s cubic-bezier(0.22,1,0.36,1)",
              transform: menuOpen ? "translateY(0) rotate(45deg)" : "translateY(-3.5px)",
            }}
          />
          <span
            aria-hidden
            style={{
              position: "absolute",
              width: "20px",
              height: "1.5px",
              background: "#EAE6DC",
              transition: "transform 0.3s cubic-bezier(0.22,1,0.36,1)",
              transform: menuOpen ? "translateY(0) rotate(-45deg)" : "translateY(3.5px)",
            }}
          />
        </button>

      </div>
    </header>
  );
}

// Extracted so hover state stays isolated per-item — no re-render siblings.
function NavItem({
  item,
  isActive,
}: {
  item: (typeof navItems)[number];
  isActive: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <a
      href={item.href}
      onClick={(e) => { e.preventDefault(); scrollToTarget(item.href); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-current={isActive ? "page" : undefined}
      style={{
        // 3px rightward nudge on hover — mechanical, not bouncy
        transform: hovered ? "translateX(3px)" : "translateX(0)",
        transition: "transform 0.22s cubic-bezier(0.22,1,0.36,1), color 0.2s ease, opacity 0.2s ease",
      }}
      className={[
        "group relative flex items-center gap-[7px]",
        "font-mono text-[10px] tracking-[0.20em] uppercase",
        "select-none",
        // Active: warm off-white. Inactive: muted grey. #6E6A62 at 0.80 was
        // ~3.2:1 on near-black — unreadable on the load frame, which is the one
        // place these four words have to do their job.
        isActive
          ? "text-[#EAE6DC] opacity-100"
          : "text-[#8A857C] opacity-90 hover:text-[#EAE6DC] hover:opacity-100",
      ].join(" ")}
    >
      {/* Lime dot — active indicator only */}
      <span
        aria-hidden
        style={{
          width:  "4px",
          height: "4px",
          borderRadius: "50%",
          flexShrink: 0,
          background: "rgba(200,255,46,1)",
          opacity: isActive ? 1 : 0,
          transform: isActive ? "scale(1)" : "scale(0.4)",
          transition: "opacity 0.25s ease, transform 0.25s ease",
          boxShadow: isActive ? "0 0 6px rgba(200,255,46,0.45)" : "none",
        }}
      />

      {/* Index number — dimmer than label */}
      <span
        style={{
          opacity: isActive ? 0.50 : 0.40,
          transition: "opacity 0.2s ease",
        }}
      >
        {item.n}
      </span>

      {/* Label + underline reveal */}
      <span className="link-underline">
        {item.label}
      </span>
    </a>
  );
}


/* ------------------------------------------------------------------ */
/* HERO — reference grammar: architectural frame, identity owns the   */
/* LEFT territory (crisp), monumental machine enters from off-frame   */
/* right. No focus-mask here — the first screen establishes identity  */
/* + machine; interaction is discovered through scroll.               */
/* ------------------------------------------------------------------ */

export function Hero() {
  return (
    <section id="hero" className="relative min-h-[180vh]">
      {/* Dark photographic studio environment */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 70% at 76% 50%, #131417 0%, #09090b 48%, #060607 100%)",
        }}
      />
      <div className="hero-stage sticky top-0 flex h-screen flex-col">
        <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col justify-center px-6 pt-16 md:px-10">
          <div className="hero-field relative flex flex-1 items-center">

            {/* LEFT — identity. The composition anchor. */}
            <div className="relative z-10 ml-0 w-full max-w-[580px] md:ml-[40px] md:-translate-y-[2vh]">
              <p className="font-mono text-[11px] tracking-[0.3em] uppercase text-[#B4AFA5] opacity-80">
                Software Engineer <span className="text-[#c8ff2e]">·</span> Chennai, India
              </p>
              <h1 className="hero-identity mt-4 text-[#F1EEE6]">
                <span className="font-display hero-title block text-left text-[11.5vw] leading-[0.86] font-black uppercase md:text-[5.6vw]">
                  Mohamed
                  <br />
                  Fateen
                </span>
              </h1>
              <p className="mt-7 font-mono text-[10px] tracking-[0.28em] uppercase text-[#8F8A80]">
                I build systems, products &amp; tools.
              </p>
              {/* The proof, on the first screen. These three names used to live
                  only in the <meta description> — the best argument this site
                  has for itself was invisible to anyone standing on it. */}
              <p className="mt-3 font-mono text-[10px] tracking-[0.28em] uppercase text-[#8F8A80] opacity-70">
                ChatY <span className="text-[#c8ff2e]">·</span> SkillForge <span className="text-[#c8ff2e]">·</span> DeployForge
              </p>
            </div>

            {/* CENTER — negative space. The object pulls through this void.
                No content here — the relationship is positional, not verbal. */}
            <div aria-hidden className="hidden flex-1 md:block" />

            {/* RIGHT — 3D canvas territory only. On a phone there is no room
                for two columns, so these collapse and the instrument takes the
                lower half of the frame instead: same two masses, stacked. */}
            <div aria-hidden className="hidden w-[28%] shrink-0 md:block" />

            <div aria-hidden className="min-h-[26svh] w-full md:hidden" />
          </div>
        </div>

        {/* The one affordance the load frame was missing: on a phone the
            machine owns the lower half and the machine canvas is painted
            ABOVE main (z-30), so a bottom cue there would simply be occluded
            — hence desktop only. Fades itself out; a permanent one is clutter. */}
        <div className="hero-cue mx-auto hidden w-full max-w-[1600px] items-center gap-3 px-6 pb-8 md:flex md:px-10 md:pl-[80px]">
          <span aria-hidden className="block h-px w-10 bg-[#c8ff2e] opacity-70" />
          <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-[#8F8A80]">
            Scroll
          </span>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* ABOUT — "WHO AM I?"                                               */
/*                                                                     */
/* THE MACHINE BECOMES THE QUESTION. One question, asked once.          */
/*                                                                     */
/* The ORDER is the whole concept and it is the reverse of what this   */
/* chapter used to do. It is NOT words → "?" → machine lands on the    */
/* dot; that reads as a 3D object being placed on top of typography.   */
/* It IS: the machine shrinks, travels to the exact pixel where the    */
/* punctuation is going to be, and HOLDS THERE ALONE — no "?", no       */
/* words, nothing on the page but a 46px machine in its final          */
/* punctuation position. Only then does the hook wipe up out of it,     */
/* and only then do the words arrive. The hero hands over its last      */
/* frame; the machine leaves that frame, shrinks, and becomes a         */
/* character.                                                          */
/*                                                                     */
/* The glyph's own dot is DELETED (clip-path off the measured ink,     */
/* globals.css), not covered — so there is only ever ONE dot, and it    */
/* is the machine. The canvas is painted ABOVE main, so nothing in the */
/* DOM has to be hidden to make room for it. It holds there long        */
/* enough to be understood, and only then does the question recede to  */
/* its own scale while the answer resolves under it.                   */
/*                                                                     */
/* TWO COLUMNS ARE NOT INVOLVED. Both halves of the chapter sit on the */
/* frame's centre line, because the dot has to be somewhere a whole    */
/* frame's travel can arrive at deliberately — in the page margin it   */
/* is not a punctuation mark, it is debris against the edge, and a      */
/* machine cannot land on it and look intentional. One alignment for    */
/* both halves is also what makes the transition a single move rather  */
/* than a re-layout.                                                   */
/*                                                                     */
/* No name. The hero has already given it, and repeating it is what     */
/* made this chapter a second hero.                                    */
/*                                                                     */
/* The observer never moves. scroll.ts holds progress at the hero's    */
/* last frame for the whole chapter, so camZ, iris, glow and focus are  */
/* that frame's; journey.ts adds ONE blended term for the machine's     */
/* place and size, and Scene/Aperture.tsx lets the camera's coupling    */
/* go on the same number.                                               */
/*                                                                     */
/* The section is h-[400vh] of a pinned h-screen stage: 300vh of pinned */
/* scroll for one question, one hold and one answer. It was 340vh when */
/* the question was written first and the machine dropped on it; the    */
/* reversal needs more room at the front and the same room at the back. */
/* Height is free to change here — scroll.ts subtracts this section's   */
/* height from document progress below it, so max−height, and therefore */
/* every anchor on the rest of the page, is invariant under it.        */
/* ------------------------------------------------------------------ */

const ABOUT_META = [
  { k: "Based in", v: "Chennai / India" },
  { k: "Focus", v: "Systems / Backend / AI" },
];

export function AboutSection() {
  return (
    <section id="about" aria-label="About" className="relative h-[400vh]">
      <div className="about-stage sticky top-0 flex h-screen w-full items-center overflow-hidden">
        <div className="relative mx-auto flex h-full w-full max-w-[1600px] flex-col px-6 pb-[9vh] pt-[13vh] md:px-10">

          {/* RAIL — the chapter's own label. Its left slot is deliberately
              empty: that is where the question ends up once it recedes. */}
          <div className="about-rail flex items-start justify-between">
            <span aria-hidden className="block" />
            <p className="font-mono text-[11px] tracking-[0.32em] uppercase">
              <span className="text-[#c8ff2e]">01</span>
              <span className="text-white/45"> — About</span>
            </p>
          </div>

          {/* THE QUESTION. Centred on the frame's own centre line, in two
              lines, with the "?" alone on the second so its dot is the last
              thing the eye lands on — and so the machine has a single,
              deliberate place to BE that dot. The two lines are separate layers
              because the chapter writes them at separate moments: the machine is
              already parked on the dot before the "?" has any ink, and the words
              only arrive after the punctuation is an established fact.

              It LEAVES rather than fading behind its own answer. Its opacity
              reaches zero at t 0.62 (lib/about.ts, aboutRecede) and the answer
              does not begin until that same frame, so there is no interval in
              which a giant grey "WHO AM I?" is sitting over the copy. Its
              transform-origin is top-centre in globals.css for the same reason:
              the exit travels UP, out of the space the answer rises into.

              `.about-q-mark` is an INLINE-BLOCK, which is the load-bearing
              detail: it shrink-wraps the glyph, so the element's own border box
              is the glyph's pen origin and lib/about.ts can measure the dot off
              that box with nothing guessed about where the browser placed the
              glyph inside a block. It also means the mark keeps hugging the "?"
              through the exit, so the machine and the dot scale together.

              14vw: "WHO AM I" lands at ~72% of the frame width at 1440 and at
              the same fraction at 1728, and the "?"'s dot comes out 39px
              across — a punctuation mark you can see, which the machine then
              has to be the size of rather than a speck. */}
          <div className="about-q absolute inset-x-0 top-[20vh] text-center font-display text-[14vw] font-black uppercase leading-[0.88] text-[#F1EEE6]">
            <span className="about-q-line block">Who am I</span>
            <span className="about-q-mark inline-block">
              ?
              {/* Zero-size, on the glyph's own baseline: the only way to find
                  where the browser actually put it (lib/about.ts). */}
              <i className="about-q-base inline-block h-0 w-0" aria-hidden />
            </span>
          </div>

          {/* THE ANSWER — what he builds, how he thinks, two quiet facts. It
              resolves on the SAME centre line the question left, so the
              chapter's transition is one axis: the question leaves upward and
              the answer rises into the space it made, in a frame that is by
              then completely empty — the machine has gone out with the
              question (lib/about.ts, aboutVanish) and nothing from the hero is
              on screen behind it. It has to be readable on its own, because
              for the whole of its hold there is nothing else there.

              THE SCALE IS WHAT CHANGED IN THIS PASS: the statement read ~52px at
              1440 and ~58px at 1728, which is technically legible and
              practically not — the visitor was being asked to read the chapter's
              entire answer in a font barely a quarter the height of the question
              it was answering. It is now clamp(2.4rem, 4.4vw, 4.4rem): ~63px at
              1440x900 and ~70px at 1728x1080, a clear step in authority and
              still a third the height of the 202px "WHO AM I?", so it never
              reads as a second hero. The supporting sentence moves with it
              (~21px / ~25px) so the hierarchy holds, and the role line and the
              two facts stay mono and small — that is what makes them metadata
              rather than copy. No name: the visitor has read it in the hero. */}
          <div className="about-answer absolute inset-x-0 top-0 flex h-full translate-y-[9vh] flex-col items-center justify-center px-6 text-center md:px-10">
            <p className="about-role font-mono text-[13px] tracking-[0.32em] uppercase text-[#A6A29A]">
              Software Engineer
            </p>

            <p className="about-lede mt-9 font-display text-[clamp(2.4rem,4.4vw,4.4rem)] font-bold uppercase leading-[1.04] text-[#F1EEE6]">
              I build systems,
              <br />
              products, and
              <br />
              AI&#8209;powered tools.
            </p>

            <p className="about-note mt-8 max-w-[38rem] text-[clamp(1.05rem,1.45vw,1.55rem)] leading-[1.55] text-white/55">
              I care about how the pieces work together — not just making the
              pieces work.
            </p>

            <dl className="mt-12 flex flex-col gap-5 sm:flex-row sm:gap-16">
              {ABOUT_META.map((m) => (
                <div key={m.k}>
                  <dt className="font-mono text-[11px] tracking-[0.32em] uppercase text-white/35">
                    {m.k}
                  </dt>
                  <dd className="mt-2 font-mono text-[13px] tracking-[0.22em] uppercase text-[#A6A29A]">
                    {m.v}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* SECTION 2 — ORBITAL CORE SYSTEM                                    */
/* The monumental hero object travels to exact center, shrinks to a   */
/* compact core (~22% vh), and anchors a 4-node orbital apparatus.    */
/* ------------------------------------------------------------------ */

const ORBITAL_NODES = [
  {
    id: "about",
    index: "01",
    tag: "ORIGIN",
    title: "ABOUT",
    subtitle: "IDENTITY & METHODOLOGY",
    href: "#hero",
    baseAngle: -90, // top
    quadrant: "top",
  },
  {
    id: "work",
    index: "02",
    tag: "APPARATUS",
    title: "WORK",
    subtitle: "SYSTEMS & PRODUCTION",
    href: "#work",
    baseAngle: 180, // left
    quadrant: "left",
  },
  {
    id: "systems",
    index: "03",
    tag: "ARCHITECTURE",
    title: "SYSTEMS",
    subtitle: "DISTRIBUTED RUNTIMES",
    href: "#wafer",
    baseAngle: 0, // right
    quadrant: "right",
  },
  {
    id: "contact",
    index: "04",
    tag: "ENGAGEMENT",
    title: "BUILD",
    subtitle: "TECHNICAL COLLABORATION",
    href: "#contact",
    baseAngle: 90, // bottom
    quadrant: "bottom",
  },
];

// The authored desktop ellipse: 340 x 275 on a 780 box, measured at
// 1440x900. Module scope, because it is a constant and the resize effect reads
// it on every frame it is mounted.
const ORBIT_DESKTOP = { rx: 340, ry: 275, box: 780 };

export function OrbitalSystem() {
  const sectionRef = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // THE ELLIPSE IS SIZED TO THE FRAME. Desktop's 340 x 275 is reproduced
  // exactly at every width from 768 up. Below that the SAME ellipse — same
  // proportion, same 360 degrees, same four node offsets — is scaled into the
  // viewport, so this chapter is the same event on a phone rather than a
  // different diagram or a squeezed one. The radius is bounded by the frame
  // rather than by a fixed box because the nodes ride it: the widest node block
  // (a subtitle in tracked mono) has to clear the edge at the horizontal
  // extremes, which is the one place this diagram can actually clip.
  const [orbit, setOrbit] = useState(ORBIT_DESKTOP);

  useEffect(() => {
    const measure = () => {
      if (window.innerWidth >= 768) {
        setOrbit(ORBIT_DESKTOP);
        return;
      }
      const rx = Math.min(ORBIT_DESKTOP.rx, window.innerWidth * 0.5 - 70);
      // The radius is capped by the frame WIDTH, because the two nodes at the
      // horizontal extremes are the ones that can run off an edge. The vertical
      // radius has no such constraint on a portrait frame — it is free, so it
      // is opened up instead, and the orbit simply stands taller in a phone
      // than it does on a desktop. Same ellipse, same centre, same one 360
      // degrees: only its eccentricity adapts to the shape of the frame.
      const ry = rx * 1.3;
      setOrbit({ rx, ry, box: rx * 2 + 200 });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    let prev = -1;
    const tick = () => {
      const p = scrollState.progress;
      if (Math.abs(p - prev) > 0.0005) {
        prev = p;
        setProgress(p);
      }
    };
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
    };
  }, []);

  // Synchronized with journey.ts (Scene 2 is a long pinned chapter).
  // Shown ×18/23 (first re-anchor), ×0.892987 (second) then ×0.651899 (the
  // WAFER CHAPTER appended at scrollY 16560) — the uniform factors applied to
  // every upstream anchor each time a chapter was added below this one, so
  // these windows keep landing on the same PIXELS they always did. Values are
  // otherwise unchanged; only the document-progress anchors moved.
  // HERO ends ~0.048
  // HERO → CENTER travel:      0.060 -> 0.085  (object shrinks to core)
  // ORBIT SYSTEM ENTERS:       0.060 -> 0.085  (container fade, overlaps travel tail)
  // HOLD / ORIENTATION:        0.085 -> 0.105  (stillness, dTheta = 0)
  // ONE 360° ORBIT:            0.105 -> 0.155  (scroll-driven, exactly once)
  // DECELERATE → SETTLE:       0.155 -> 0.167  (stillness at 360° ≡ 0°)
  // RELEASE (exit fade):       0.167 -> 0.188  (next section waits until settle)
  const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
  const smoother = (t: number) => {
    const c = clamp01(t);
    return c * c * c * (c * (c * 6 - 15) + 10);
  };
  const fadeIn = smoother((progress - 0.060152) / 0.024152);
  const fadeOut = smoother((progress - 0.166329) / 0.020506);
  const systemOpacity = fadeIn * (1 - fadeOut);

  // ORBIT MODEL — one shared angular value, four fixed offsets:
  //   theta  = orbitT * 2π   (orbitT = LINEAR scroll progress over 0.230→0.340)
  //   ABOUT   offset = -π/2  → TOP at theta=0
  //   SYSTEMS offset = 0     → RIGHT at theta=0
  //   BUILD   offset = +π/2  → BOTTOM at theta=0
  //   WORK    offset = π     → LEFT at theta=0
  //   x = rx·cos(offset+theta), y = ry·sin(offset+theta) — screen coords.
  // theta runs 0 → -2π: EXACTLY ONE revolution, back to canonical.
  // Linear in scroll (no easing inside the orbit): stopping stops the
  // orbit, reversing reverses it, and equal scroll fractions land on
  // exact degrees (12.5%→45° … 100%→360°). Stillness comes from the hold
  // windows around the orbit, not from easing within it.
  // Cards stay upright: ONLY x/y translation. Never rotate, never scale
  // to zero, never fade out. Opacity floor keeps all four readable.
  // NOTE: the wrapper transform below MUST NOT have a CSS transition —
  // a transition would lag behind scroll updates and cut chords across
  // the ellipse (diving through the core). Direct translate3d only.
  const orbitT = clamp01((progress - 0.104810) / 0.050126);
  const dTheta = -orbitT * 360;

  // Focal node = whichever module is currently nearest the TOP (-90°).
  // Pure function of dTheta: deterministic, reversible, no timers.
  const distToTop = (baseAngle: number) => {
    const cur = baseAngle + dTheta;
    const diff = ((((cur + 90) % 360) + 360) % 360);
    return Math.min(diff, 360 - diff);
  };
  const focalDistances = ORBITAL_NODES.map((n) => distToTop(n.baseAngle));
  let scrollActive = 0;
  let best = Infinity;
  focalDistances.forEach((d, i) => {
    if (d < best) {
      best = d;
      scrollActive = i;
    }
  });

  const activeIndex = hoveredIndex !== null ? hoveredIndex : scrollActive;

  // Ellipse dimensions: authored above, desktop numbers verbatim.
  const rx = orbit.rx;
  const ry = orbit.ry;

  return (
    <section
      id="orbital"
      ref={sectionRef}
      className="relative min-h-[400vh]"
      aria-label="Orbital Architecture Core"
    >
      <div className="sticky top-0 flex h-screen w-full items-center justify-center overflow-hidden">
        {/* Background matching studio tone */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 75% 70% at 50% 50%, #121316 0%, #09090b 50%, #060607 100%)",
          }}
        />

        {/* Orbital System Container */}
        <div
          className="relative flex h-full w-full max-w-[1600px] items-center justify-center transition-opacity duration-300"
          style={{
            opacity: systemOpacity,
            visibility: systemOpacity < 0.01 ? "hidden" : "visible",
          }}
        >
          {/* Single faint orbit path: functional reference for the four
              nodes, not decoration. No telemetry, no labels, no HUD. */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <svg
              className="max-w-none"
              width={orbit.box}
              height={orbit.box}
              viewBox={`0 0 ${orbit.box} ${orbit.box}`}
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <ellipse
                cx={orbit.box / 2}
                cy={orbit.box / 2}
                rx={rx}
                ry={ry}
                stroke="rgba(244, 241, 234, 0.10)"
                strokeWidth="1"
              />
            </svg>
          </div>

          {/* The 4 Orbital Nodes */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            {ORBITAL_NODES.map((node, i) => {
              const currentAngle = node.baseAngle + dTheta;
              const rad = (currentAngle * Math.PI) / 180;
              const xPos = rx * Math.cos(rad);
              const yPos = ry * Math.sin(rad);

              const isActive = activeIndex === i;

              return (
                // OUTER = pure orbital position. translate3d from theta,
                // NO transition (a transition would chase scroll updates and
                // cut chords through the core). Inner handles centering +
                // emphasis on separate elements — one transform each.
                <div
                  key={node.id}
                  className={`absolute top-1/2 left-1/2 pointer-events-auto will-change-transform ${
                    isActive ? "z-20" : "z-10"
                  }`}
                  style={{
                    transform: `translate3d(${xPos.toFixed(1)}px, ${yPos.toFixed(1)}px, 0)`,
                  }}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  {/* INNER = centering + focal emphasis. Static translate
                      (no scroll updates here), opacity floor 0.7 so every
                      node stays readable at every angle. */}
                  <div
                    className={`-translate-x-1/2 -translate-y-1/2 transition-opacity duration-300 ${
                      isActive ? "opacity-100" : "opacity-70 hover:opacity-90"
                    }`}
                  >
                  <a
                    href={node.href}
                    onClick={(e) => {
                      e.preventDefault();
                      scrollToTarget(node.href);
                    }}
                    className="block focus:outline-none"
                  >
                    {/* Typographic node: index + name + spec. No card, no
                        border, no brackets — emphasis is opacity + the lime
                        index of whichever module is nearest the top. */}
                    <div className="orbit-node px-2 py-1 text-center">
                      <div
                        className={`font-mono text-[10px] font-bold tracking-[0.25em] transition-colors duration-200 ${
                          isActive ? "text-[#C8FF2E]" : "text-[#8E8A82]"
                        }`}
                      >
                        {node.index}
                      </div>
                      <div className="mt-1 font-display text-[15px] md:text-[17px] font-bold tracking-[0.16em] uppercase text-[#F1EEE6]">
                        {node.title}
                      </div>
                      <p className="mt-0.5 font-mono text-[9px] tracking-[0.2em] uppercase text-[#A6A29A]/70">
                        {node.subtitle}
                      </p>
                    </div>
                  </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* PROJECTS INTRO — the object becomes a letter. After About releases, */
/* the machine travels to center, shrinks to glyph scale, and the      */
/* chapter word assembles around it: PR [OBJECT] JECTS. No DOM "O" is  */
/* ever rendered — the slot is empty space the machine occupies. The   */
/* word holds, then the object breaks out left toward DeployForge.     */
/* Scroll-driven (pure function of document progress over this        */
/* section's own window, so scrubbing reverses exactly).               */
/* ------------------------------------------------------------------ */

export function ProjectsIntro() {
  const sectionRef = useRef<HTMLElement>(null);
  const [q, setQ] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let prev = -1;
    const tick = () => {
      const el = sectionRef.current;
      if (!el) return;
      // Real document pixels: this section is positioned in the DOM, and
      // scrollState.progress is in the page's own timeline (see scroll.ts).
      const top = el.offsetTop;
      const raw = Math.min(1, Math.max(0, (scrollState.scrollY - top) / el.offsetHeight));
      // Reduced motion holds the assembled poster (q = 0.55) forever, and the
      // word is `fixed`, so it never released and sat on top of every later
      // section. Gate it on this chapter actually being in view. Normal
      // motion is untouched — reduced is false, so `v` is `raw` as before.
      const v = reduced ? (raw > 0 && raw < 1 ? 0.55 : 0) : raw;
      if (Math.abs(v - prev) > 0.0005) {
        prev = v;
        setQ(v);
      }
    };
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
    };
  }, []);

  const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
  const seg = (a: number, b: number) => clamp01((q - a) / (b - a));
  const smoother = (t: number) => {
    const c = clamp01(t);
    return c * c * c * (c * (c * 6 - 15) + 10);
  };
  // Word: assembles 0.25–0.45, holds, breaks apart 0.70–0.90.
  const cont = smoother(seg(0.15, 0.3)) * (1 - smoother(seg(0.68, 0.85)));
  const prX = 8 - 8 * smoother(seg(0.25, 0.45)) - 10 * smoother(seg(0.7, 0.9));
  const jxX = -8 + 8 * smoother(seg(0.25, 0.45)) + 10 * smoother(seg(0.7, 0.9));

  return (
    <section
      id="projects-intro"
      ref={sectionRef}
      aria-label="Projects chapter"
      className="intro-section relative min-h-[220vh]"
    >
      {/* Fixed (not sticky): the word must hold center through the whole
          window, including past the point a sticky would release. Opacity
          alone controls its presence; it never intercepts pointer input. */}
      <div className="pointer-events-none fixed inset-0 flex h-screen w-full items-center justify-center">
        <div
          className="flex w-full flex-col items-center px-6"
          style={{
            opacity: cont,
            visibility: cont < 0.01 ? "hidden" : "visible",
          }}
        >
          <p className="mb-8 font-mono text-[11px] tracking-[0.32em] uppercase">
            <span className="text-[#c8ff2e]">02</span>
            <span className="text-white/45"> — Selected work</span>
          </p>
          <h2
            aria-label="Projects"
            className="intro-word font-display flex items-center justify-center whitespace-nowrap font-black uppercase text-[#F1EEE6]"
          >
            {/* One centered group: PR + slot + JECTS. The GROUP centers at
                50vw (PR is narrower than JECTS, so the slot falls left of
                center) and the object travels to the slot — the layout, not
                an overlay, understands the object replaces the O. */}
            <span
              aria-hidden
              className="inline-block will-change-transform"
              style={{ transform: `translateX(${prX.toFixed(2)}%)` }}
            >
              PR
            </span>
            {/* The O slot: empty space, never a letter. The machine parks here. */}
            <span aria-hidden className="o-slot inline-block shrink-0" />
            <span aria-hidden className="o-fallback">
              O
            </span>
            <span
              aria-hidden
              className="inline-block will-change-transform"
              style={{ transform: `translateX(${jxX.toFixed(2)}%)` }}
            >
              JECTS
            </span>
          </h2>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* STATES 04–05 — PROJECTS CHAPTER. Three full-screen editorial       */
/* scenes reframed by ONE moving physical object. The instrument      */
/* alternates sides (LEFT / RIGHT / LEFT); each scene composes its    */
/* content on the opposite side, leaving the object's territory      */
/* empty. Images are independent subjects — never inside the bore.    */
/* Visibility is scroll-choreographed (see [data-present] in          */
/* choreography.ts); the object travels via journey.ts.               */
/* ------------------------------------------------------------------ */

function ProjectKicker({ index, total }: { index: string; total: string }) {
  return (
    <div className="flex items-center gap-4 font-mono text-[10px] tracking-[0.32em] uppercase text-[#c8ff2e]">
      <span>{index}</span>
      <span aria-hidden className="h-[1px] w-10 bg-[#c8ff2e]/40" />
      <span className="text-white/45">02 — Work · {total}</span>
    </div>
  );
}

function ProjectLinks({ p }: { p: (typeof projects)[number] }) {
  return (
    <div className="project-links mt-6 flex items-center gap-8 text-[12px] tracking-[0.25em] uppercase">
      <Magnetic>
        <a href={p.liveUrl} className="link-underline">
          View ↗
        </a>
      </Magnetic>
      <Magnetic>
        <a href={p.githubUrl} className="link-underline">
          GitHub ↗
        </a>
      </Magnetic>
    </div>
  );
}

function ProjectFigure({
  p,
  aspect,
  sizes,
  align = "object-center",
}: {
  p: (typeof projects)[number];
  aspect: string;
  sizes: string;
  align?: string;
}) {
  return (
    <div className={`relative ${aspect} max-h-[34vh] overflow-hidden border border-white/10 bg-[#101013]`}>
      <Image
        src={p.image}
        alt={`${p.title} project visual`}
        fill
        sizes={sizes}
        loading="lazy"
        className={`object-cover ${align}`}
      />
    </div>
  );
}

/* PROJECT 01 — DEPLOYFORGE. Object LEFT, content RIGHT.
   Text-led hierarchy: kicker → title → desc → prominent 16/10
   figure → quiet tech → links. */
function DeployForgeScene() {
  const p = projects[0];
  return (
    <section
      data-present
      aria-label={`${p.title} — project ${p.index}`}
      className="relative flex min-h-[140vh] items-center"
    >
      <div className="mx-auto grid w-full max-w-[1600px] items-center px-6 md:grid-cols-[38%_1fr] md:gap-8 md:px-10">
        {/* Object territory — intentionally empty. */}
        <div aria-hidden className="hidden md:block" />
        <div data-present-inner className="max-w-[680px] justify-self-end py-8">
          <ProjectKicker index={p.index} total="01 / 03" />
          <h3 className="font-display mt-4 text-[clamp(2.4rem,4vw,3.8rem)] leading-[0.85] font-black uppercase">
            {p.title}
          </h3>
          <p className="mt-4 max-w-[480px] text-[16px] leading-relaxed text-white/75">
            {p.description}
          </p>
          <div className="mt-6">
            <ProjectFigure p={p} aspect="aspect-[16/9]" sizes="680px" />
          </div>
          <p className="mt-5 font-mono text-[10px] leading-relaxed tracking-[0.18em] uppercase text-white/55">
            {p.technologies.join(" / ")}
          </p>
          <p className="mt-2 font-mono text-[10px] tracking-[0.32em] uppercase text-white/35">
            {p.year}
          </p>
          <ProjectLinks p={p} />
        </div>
      </div>
    </section>
  );
}

/* PROJECT 02 — CHATY. Object RIGHT, content LEFT.
   Title-led, image 4/3 with a tighter crop, description + tech in a
   two-column row, metadata band with a top rule at the foot. */
function ChatyScene() {
  const p = projects[1];
  return (
    <section
      data-present
      aria-label={`${p.title} — project ${p.index}`}
      className="relative flex min-h-[140vh] items-center"
    >
      <div className="mx-auto grid w-full max-w-[1600px] items-center px-6 md:grid-cols-[1fr_38%] md:gap-8 md:px-10">
        <div data-present-inner className="max-w-[640px] py-8">
          <h3 className="font-display text-[clamp(2.6rem,4.4vw,4.2rem)] leading-[0.85] font-black uppercase">
            {p.title}
          </h3>
          <div className="mt-6 max-w-[600px]">
            {/* Top-anchored 16/9: keeps the full chat UI, crops the
                asset's own footer title so it never doubles the headline. */}
            <ProjectFigure p={p} aspect="aspect-[16/9]" sizes="600px" align="object-top" />
          </div>
          <div className="mt-6 grid max-w-[600px] gap-8 sm:grid-cols-2">
            <p className="text-[15px] leading-relaxed text-white/75">{p.description}</p>
            <div>
              <p className="font-mono text-[10px] leading-relaxed tracking-[0.18em] uppercase text-white/55">
                {p.technologies.join(" / ")}
              </p>
              <ProjectLinks p={p} />
            </div>
          </div>
          <div className="mt-6 flex items-center gap-4 border-t border-white/10 pt-4 font-mono text-[10px] tracking-[0.32em] uppercase">
            <span className="text-[#c8ff2e]">{p.index}</span>
            <span className="text-white/45">02 — Work · 02 / 03</span>
            <span className="ml-auto text-white/35">{p.year}</span>
          </div>
        </div>
        {/* Object territory — intentionally empty. */}
        <div aria-hidden className="hidden md:block" />
      </div>
    </section>
  );
}

/* PROJECT 03 — SKILLFORGE AI. Object LEFT, content RIGHT.
   Mirrors DeployForge: kicker → title → description → image → tech → year → links. */
function SkillForgeScene() {
  const p = projects[2];
  return (
    <section
      data-present
      aria-label={`${p.title} — project ${p.index}`}
      className="relative flex min-h-[140vh] items-center"
    >
      <div className="mx-auto grid w-full max-w-[1600px] items-center px-6 md:grid-cols-[38%_1fr] md:gap-8 md:px-10">
        {/* Object territory — intentionally empty. */}
        <div aria-hidden className="hidden md:block" />
        <div data-present-inner className="max-w-[680px] justify-self-end py-8">
          <ProjectKicker index={p.index} total="03 / 03" />
          <h3 className="font-display mt-4 text-[clamp(2.4rem,4vw,3.8rem)] leading-[0.85] font-black uppercase">
            {p.title}
          </h3>
          <p className="mt-4 max-w-[480px] text-[16px] leading-relaxed text-white/75">
            {p.description}
          </p>
          <div className="mt-6">
            <ProjectFigure p={p} aspect="aspect-[16/9]" sizes="680px" />
          </div>
          <p className="mt-5 font-mono text-[10px] leading-relaxed tracking-[0.18em] uppercase text-white/55">
            {p.technologies.join(" / ")}
          </p>
          <p className="mt-2 font-mono text-[10px] tracking-[0.32em] uppercase text-white/35">
            {p.year}
          </p>
          <ProjectLinks p={p} />
        </div>
      </div>
    </section>
  );
}

export function Projects() {
  return (
    <div id="work">
      <DeployForgeScene />
      <ChatyScene />
      <SkillForgeScene />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* UNDER THE SURFACE — the isolated interlude between Projects and      */
/* Systems. The optical machine stops examining projects and becomes a  */
/* PORTAL: it travels to exact centre, holds as the sole subject, the   */
/* camera flies on-axis THROUGH the bore, and what lives inside is the  */
/* software architecture.                                              */
/*                                                                      */
/* Isolation: this section contributes ONLY scroll distance (400vh) plus */
/* a fixed, scroll-gated stage. It never touches the sections above it  */
/* or the Systems section below it, and it owns no geometry — the      */
/* machine, its iris, the bore and the four station rings all come from */
/* the existing scene. Every pixel here is a pure function of the vars   */
/* the scene already publishes per frame, so stopping stops it and       */
/* reversing reverses it.                                               */
/*                                                                      */
/* The Z values below MUST stay in step with LAYER_DEPTHS in             */
/* Scene/Aperture.tsx (−1.6 / −4.2 / −6.8 / −9.4): they are the real    */
/* world depths the camera parks in front of, printed here so the       */
/* separation reads as engineering rather than as a stacked list.       */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* UNDER THE SURFACE — the isolated interlude between Projects and      */
/* Systems. The optical machine stops examining projects and becomes    */
/* the ENVIRONMENT the architecture lives inside: the camera travels   */
/* into the bore and discovers four layers at four real depths.        */
/*                                                                      */
/* This section owns NO visible content. Every pixel of the reveal is   */
/* drawn inside the single WebGL canvas (Scene/Aperture.tsx) as real    */
/* geometry at real Z — the four layer planes, their station rings and  */
/* the travelling request signal. That is not a stylistic choice: DOM    */
/* lives in `main` (z-10) UNDER the canvas (z-30), so overlaid DOM     */
/* labels can never be occluded by the housing, can never recede with   */
/* perspective, and always read as four labels printed on one disc.    */
/*                                                                      */
/* So the DOM here does three things only:                                 */
/*   1. supplies the scroll distance the camera journey flies through,   */
/*   2. states the same architecture as one sr-only list for assistive   */
/*      technology (the visible plate is redundant with the 3D),         */
/*   3. carries the single small chapter label, gated by --syscap, which  */
/*      is held at 0 until scrollY 10980 — the exact pixel where        */
/*      SkillForge's tech line reaches opacity 0. That is what keeps the  */
/*      previous chapter from ghosting CLIENT / API / DATA /             */
/*      INFRASTRUCTURE words behind the new one.                          */
/*                                                                      */
/* Height: 620vh. The journey has four depth stages to read plus an      */
/* approach, an entry, a complete beat and an exit; at 400vh the holds   */
/* were ~0.3 viewport each and the composition stalled.                   */
/* ------------------------------------------------------------------ */

// Mirrors LAYER_DEPTHS in Scene/Aperture.tsx — the real world Z each layer
// sits at inside the bore. Kept here as prose for assistive technology and
// so the depths are legible as engineering rather than as decoration.
const ARCH_LAYERS = [
  { z: "Z −5.6", name: "CLIENT", tech: "React · Next.js · TypeScript", note: "Renders the interface. Holds no business rules." },
  { z: "Z −9.0", name: "SERVICES", tech: "Spring Boot · FastAPI · WebSockets", note: "Auth, orchestration and transport. All the logic lives here." },
  { z: "Z −12.4", name: "DATA", tech: "PostgreSQL", note: "Durable state. The schema is the contract." },
  { z: "Z −15.8", name: "INFRASTRUCTURE", tech: "Docker", note: "Where it runs, and how it survives failure." },
];

export function UnderTheSurface() {
  return (
    <section
      id="under-the-surface"
      aria-label="Under the surface — how I build software systems"
      className="relative h-[620vh]"
    >
      {/* Fixed (not sticky): the stage holds through the whole chapter
          including past the point a sticky would release. Presence is
          decided by the per-frame vars alone. */}
      <div className="uts-stage">
        <div className="uts-cap">
          <Meta>Under the surface</Meta>
        </div>
      </div>

      {/* The architecture, stated once in text. sr-only (not hidden): the
          reveal is genuinely three-dimensional, so this is the accessible
          equivalent rather than a duplicate of what is on screen. */}
      <dl className="sr-only">
        {ARCH_LAYERS.map((l) => (
          <div key={l.name}>
            <dt>{l.name}</dt>
            <dd>
              {l.z} — {l.tech}. {l.note}
            </dd>
          </div>
        ))}
      </dl>

      {/* Reduced motion: the scroll choreography never runs, so state the
          same architecture as a static plate (the .rm-only pattern). */}
      <div className="uts-static">
        <Meta>Under the surface</Meta>
        <dl className="mt-10 space-y-6">
          {ARCH_LAYERS.map((l) => (
            <div key={l.name} className="max-w-[520px]">
              <dt className="font-display text-[28px] leading-none font-black uppercase text-[#F1EEE6]">
                {l.name}
              </dt>
              <dd className="mt-2 font-mono text-[10px] tracking-[0.22em] uppercase text-[#A6A29A]">
                {l.tech}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}


/* ------------------------------------------------------------------ */
/* THE WAFER CHAPTER — the isolated coda between UNDER THE SURFACE and  */
/* the final footer. ONE OBJECT → ONE UNIT → MANY UNITS → DIE ARRAY →   */
/* SILICON WAFER → SYSTEM → FOOTER.                                    */
/*                                                                      */
/* Isolation: identical to UnderTheSurface. This section contributes    */
/* ONLY scroll distance (1320vh), one small chapter caption gated by    */
/* --wfcap, and the same architecture stated once as sr-only text. It   */
/* owns no visible layout — the plate, the wafer, the die array and the */
/* four system regions are all real geometry inside the single WebGL    */
/* canvas (Scene/Wafer.tsx + Scene/Aperture.tsx), driven by the same    */
/* journey keyframe list (lib/journey.ts) that flies the camera.         */
/* Removing this section, its keyframes and Scene/Wafer.tsx removes    */
/* the whole chapter and touches nothing above it.                       */
/*                                                                      */
/* 1320vh because the chapter has twelve beats and none of them may be   */
/* rushed: retreat, plate entry, approach, descent, landing hold, pull-  */
/* back, conversion, one→many, sequential system reveal, hold, then the  */
/* exit to the footer (wafer hold → camera pull-back → the whole wafer   */
/* shifting left → mirrored settle). 1100vh covered the chapter up to   */
/* the wafer; the separate `#systems` chapter that used to follow it     */
/* (1980px) was removed and its height given here, so the document is    */
/* still 29340 tall and every upstream document-progress anchor is      */
/* unchanged.                                                            */
/* ------------------------------------------------------------------ */

export function WaferChapter() {
  return (
    <section
      id="wafer"
      aria-label="One instrument becomes one repeatable unit: a silicon wafer of die regions"
      className="relative h-[1320vh]"
    >
      <div className="wf-stage">
        <div className="wf-cap">
          <Meta>One object, many units</Meta>
        </div>
      </div>

      <dl className="sr-only">
        {WAFER_SYSTEM.map((r) => (
          <div key={r.id}>
            <dt>{r.name}</dt>
            <dd>{r.tech}. {r.note}</dd>
          </div>
        ))}
      </dl>

      {/* Reduced motion: the journey never runs, so the same four regions are
          stated as a static plate. Right-hand column, because the forced
          aperture state parks the instrument at dead centre and the canvas is
          painted above `main`. Same split the project scenes already use. */}
      <div className="wf-static">
        <Meta>One object, many units</Meta>
        <dl className="mt-10 space-y-6">
          {WAFER_SYSTEM.map((r) => (
            <div key={r.id} className="max-w-[520px]">
              <dt className="font-display text-[26px] leading-none font-black uppercase text-[#F1EEE6]">
                {r.name}
              </dt>
              <dd className="mt-2 font-mono text-[10px] tracking-[0.22em] uppercase text-[#A6A29A]">
                {r.tech}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}



/* separated mechanism (opacity/scale/blur from --spread). Static list */
/* for reduced-motion (the planes need spread to appear).              */
/* ------------------------------------------------------------------ */

const strata: { depth: number; tag: string; items: string[]; size: string }[] = [
  { depth: 0.15, tag: "Outer — System design", items: ["Distributed systems", "APIs", "Realtime"], size: "md:text-[1.7vw] text-[5vw]" },
  { depth: 0.4, tag: "Inner — Languages", items: ["Java", "TypeScript", "Python"], size: "md:text-[1.5vw] text-[4.6vw]" },
  { depth: 0.65, tag: "Deeper — Frameworks", items: ["React", "Next.js", "Spring Boot", "FastAPI"], size: "md:text-[1.3vw] text-[4.2vw]" },
  { depth: 0.9, tag: "Deepest — Infrastructure", items: ["PostgreSQL", "Docker", "AWS"], size: "md:text-[1.1vw] text-[3.8vw]" },
];

export function TechPlanes() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-40 flex flex-col items-center justify-center gap-4 px-6 pt-[26vh]"
    >
      {strata.map((s) => (
        <div
          key={s.tag}
          className="stratum tech-plane text-center"
          style={{ ["--d" as string]: s.depth }}
        >
          <p className="font-mono text-[10px] tracking-[0.35em] uppercase text-[#c8ff2e]">{s.tag}</p>
          <ul className={`font-display mt-2 font-black uppercase leading-[1.02] ${s.size}`}>
            {s.items.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* STATE 07 — THE FINAL FOOTER.                                         */
/*                                                                      */
/* Not a contact section bolted on after the animation: the last frame   */
/* of the same shot. The COMPLETE WAFER is on the LEFT, still carrying  */
/* the instrument seated on it, turned on its own Y axis into the exact */
/* mirror of the hero orientation (journey.ts, last key: yaw −0.172 with */
/* the chapter's tilt 0 and face 1, so net rotation.y is −0.172 rad    */
/* against the hero's +0.172), and this block sits in the empty RIGHT   */
/* half. Measured at 1440×900 and 1728×1080: the wafer runs 4.5% →      */
/* 50.4% of the width and its silhouette centres on 0.498 of the       */
/* height, and this column's left edge sits on 62% at BOTH those sizes  */
/* — so the two halves are held apart by a fixed 144px channel of black */
/* that does not move when the viewport does. One optical centreline,    */
/* two masses. No card, no border box, no columns, nothing centred —    */
/* an editorial closing frame and the end of the document.              */
/*                                                                      */
/* `md:pl-[12vw]` is that 62%: the right grid column's edge lands on    */
/* half the container, and 12vw of the VIEWPORT lands the copy at the   */
/* same fraction at 1440, 1728 and 1920 — so it holds its distance from */
/* the wafer's tip instead of drifting toward it as the page widens.    */
/* `md:pt-20` is the shared centreline from the other side: the        */
/* footer bar already eats the bottom of the flex column, which was     */
/* pulling the copy 59px ABOVE the wafer's centre; 80px of top padding */
/* takes the block's centre from 0.451 of the frame to 0.494 at        */
/* 1440×900 — level with the disc. It is a FIXED 80px rather than the  */
/* 9vh it was, because 9vh is a viewport-relative measure and the     */
/* offset it was correcting is a layout one: at 1728×1080 the same 9vh  */
/* resolved to 97px and pushed the copy 17px back BELOW the disc's     */
/* centre, so the two halves only lined up at the size it was dialed   */
/* at. Padding on a grid rather than a nudge on the copy, so the block  */
/* stays optically centred at any height.                              */
/*                                                                      */
/* The reveal rides --fcap, published per frame from the same smoothed  */
/* journey value that carries the instrument across, so the copy         */
/* resolves while the machine is still arriving. It replaces the         */
/* `.orbit-stage` enter/exit GSAP tween this block used to carry: a       */
/* scrubbed exit would have faded the contact out again at the last      */
/* frame, which is the one frame that must hold. --fcap also closes the */
/* wafer's own system map on the same beat (Scene/Wafer.tsx), so the     */
/* technical layer dissolves exactly as this one arrives.                */
/* ------------------------------------------------------------------ */

export function Final() {
  return (
    <section id="contact" aria-label="Contact" className="relative min-h-screen">
      <div className="ft-stage mx-auto flex min-h-screen w-full max-w-[1600px] flex-col px-6 pb-8 md:px-10">
        <div className="grid flex-1 grid-cols-1 items-center gap-8 pt-24 md:grid-cols-2 md:gap-0 md:pt-20">
          {/* LEFT: the machine. Deliberately empty — the object is the anchor
              and there is nothing to put beside it. */}
          <div aria-hidden className="hidden md:block" />
          <div className="contact-copy max-w-[460px] pb-[40vh] md:max-w-none md:pb-0 md:pl-[12vw]">
            <Meta>04 &mdash; Contact</Meta>
            <p className="resolve-copy mt-6 font-display text-[13vw] leading-[0.94] font-black uppercase md:text-[3vw]">
              <span className="reveal-line">
                <span>Let&rsquo;s build</span>
              </span>
              <span className="reveal-line">
                <span>Something</span>
              </span>
            </p>
            <div className="mt-9 flex flex-col items-start gap-[14px] font-mono text-[12px] tracking-[0.28em] uppercase">
              <Magnetic>
                <a href={`mailto:${site.email}`} className="link-underline">
                  Email &rarr;
                </a>
              </Magnetic>
              <Magnetic>
                <a href={site.github} className="link-underline">
                  GitHub &rarr;
                </a>
              </Magnetic>
              <Magnetic>
                <a href={site.linkedin} className="link-underline">
                  LinkedIn &rarr;
                </a>
              </Magnetic>
            </div>
          </div>
        </div>
        <div className="flex items-end justify-between gap-6 pt-10 font-mono text-[10px] tracking-[0.25em] uppercase text-[#A6A29A]">
          <p>&copy; 2026 {site.name}</p>
          <p>Chennai / India</p>
        </div>
      </div>
    </section>
  );
}
