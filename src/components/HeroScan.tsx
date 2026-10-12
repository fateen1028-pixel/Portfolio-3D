"use client";

// ──────────────────────────────────────────────────────────────────────────────
// HERO OPTICAL FIELD
// ──────────────────────────────────────────────────────────────────────────────
// Four elements. One optical system.
//
//  1. AXIS       — the instrument's line of sight through the negative space.
//                  One pixel high, extremely low contrast, always present.
//  2. FOCAL POINT — one tiny lime dot in the center of the axis. Optical target.
//  3. SCAN STREAK — the actual beam. Originates from the aperture, travels
//                   RIGHT → LEFT along the axis. Only during scroll 0.03→0.15.
//  4. IDENTITY GLOW — feather-soft illumination as the beam crosses the text.
//
// All four share the same Y coordinate: --lens-y (the aperture's screen-space
// vertical center, written per-frame by Aperture.tsx). The horizontal axis is
// therefore genuinely co-planar with the instrument's optical center — not a
// floating UI decoration.
//
// The axis and focal point are visible at rest (very low opacity).
// The streak and glow are invisible at rest and only fire during the scan.
// ──────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { scrollState } from "@/lib/scroll";
import { aboutState } from "@/lib/about";

function smoothstep(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c * c * c * (c * (c * 6 - 15) + 10);
}

export function HeroScan() {
  const axisRef   = useRef<HTMLDivElement>(null);
  const focalRef  = useRef<HTMLDivElement>(null);
  const streakRef = useRef<HTMLDivElement>(null);
  const glowRef   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const axis   = axisRef.current;
    const focal  = focalRef.current;
    const streak = streakRef.current;
    const glow   = glowRef.current;
    if (!axis || !focal || !streak || !glow) return;

    const root = document.documentElement;

    const tick = () => {
      const p = scrollState.progress;

      // THE SCAN BELONGS TO THE HERO. scrollState.progress is HELD across the
      // About chapter (see scroll.ts), which means the hero's final scan frame —
      // axis, focal point, half-crossed beam — would sit frozen on the chapter's
      // face for its whole length. So the beam is scoped to the hero: `gate` is
      // 1 until the chapter's top reaches the top of the frame and falls to 0
      // over the first tenth of the chapter, which is continuous at the boundary
      // and touches nothing at all in the hero itself.
      const gate = 1 - Math.min(1, Math.max(0, aboutState.t / 0.1));
      if (gate <= 0) {
        axis.style.opacity = "0";
        focal.style.opacity = "0";
        streak.style.opacity = "0";
        glow.style.opacity = "0";
        return;
      }

      // Read aperture screen position from Aperture.tsx per-frame CSS vars.
      // Fallbacks keep the axis visible while the 3D scene initialises.
      const lensX = parseFloat(root.style.getPropertyValue("--lens-x")) || window.innerWidth  * 0.76;
      const lensY = parseFloat(root.style.getPropertyValue("--lens-y")) || window.innerHeight * 0.50;

      // Hero window: 0 → 0.16 (gives a little tail for settling).
      const heroT = Math.min(1, Math.max(0, p / 0.16));

      // ── 1. OPTICAL AXIS ──────────────────────────────────────────────────
      // The axis spans from the identity's right edge (~37% vw) to just
      // before the lens centre (40 px gap so it terminates AT the aperture).
      // It is visible at rest (opacity 0.13) and brightens during the scan.
      const axisLeft  = window.innerWidth * 0.37;
      const axisWidth = Math.max(0, lensX - axisLeft - 36);

      // Wake: rises as soon as the user starts scrolling, fades after 0.12.
      const axisWake  = smoothstep(Math.min(1, heroT * 6));          // 0→1 over first ~2.7%
      const axisFade  = smoothstep(Math.min(1, Math.max(0, (p - 0.12) / 0.04)));
      const axisBoost = axisWake * (1 - axisFade) * 0.38;            // max boost +0.38
      const axisAlpha = 0.13 + axisBoost;                             // rest 0.13 → peak 0.51

      axis.style.top    = `${lensY.toFixed(1)}px`;
      axis.style.left   = `${axisLeft.toFixed(1)}px`;
      axis.style.width  = `${axisWidth.toFixed(1)}px`;
      axis.style.opacity = (axisAlpha * gate).toFixed(3);

      // ── 2. FOCAL POINT ───────────────────────────────────────────────────
      // Positioned ~55 % into the axis, well into the negative space.
      // Offset by −1.5 px to visually centre the 3 × 3 dot on the axis.
      const focalX = axisLeft + axisWidth * 0.55;
      const focalY = lensY - 1.5;

      const focalWake  = smoothstep(Math.min(1, Math.max(0, (p - 0.03) / 0.05)));
      const focalFade  = smoothstep(Math.min(1, Math.max(0, (p - 0.13) / 0.03)));
      const focalAlpha = 0.18 + focalWake * (1 - focalFade) * 0.60;  // rest 0.18 → peak 0.78

      // Extra flare when the scan streak's bright centre passes over the dot.
      // The streak's right-edge starts at lensX and travels to -280 px.
      const STREAK_W      = 280;
      const scanT         = Math.min(1, Math.max(0, (p - 0.03) / 0.12));
      const streakRight   = lensX + (-STREAK_W - lensX) * smoothstep(scanT);
      const streakCentre  = streakRight - STREAK_W * 0.40;           // hot centre of gradient
      const focalDist     = Math.abs(streakCentre - focalX);
      const focalFlare    = scanT > 0 && scanT < 1
        ? Math.max(0, 1 - focalDist / 80) * 0.28
        : 0;

      focal.style.transform = `translate(${focalX.toFixed(1)}px,${focalY.toFixed(1)}px)`;
      focal.style.opacity = (Math.min(1, focalAlpha + focalFlare) * gate).toFixed(3);

      // ── 3. SCAN STREAK ───────────────────────────────────────────────────
      // Travels RIGHT → LEFT along the axis. Invisible outside 0.03–0.15.
      if (scanT <= 0 || scanT >= 1) {
        streak.style.opacity = "0";
        glow.style.opacity   = "0";
        return;
      }

      const streakLeft = streakRight - STREAK_W;

      let alpha = 1.0;
      if (scanT < 0.15) alpha = smoothstep(scanT / 0.15);
      if (scanT > 0.82) alpha = smoothstep((1 - scanT) / 0.18);
      // Photographic dip crossing the identity: absorption, not glare.
      if (scanT > 0.48 && scanT < 0.72) {
        const dip = smoothstep((scanT - 0.48) / 0.12) * (1 - smoothstep((scanT - 0.60) / 0.12));
        alpha *= 1 - dip * 0.18;
      }

      streak.style.opacity   = (alpha * 0.88 * gate).toFixed(3);
      streak.style.top       = `${lensY.toFixed(1)}px`;
      streak.style.transform = `translateX(${streakLeft.toFixed(1)}px)`;

      // ── 4. IDENTITY GLOW ─────────────────────────────────────────────────
      // A soft radial bloom over the left identity column, activated as the
      // streak leading edge sweeps through x = 3 % → 42 % of viewport width.
      const idLeft  = window.innerWidth * 0.03;
      const idRight = window.innerWidth * 0.42;
      let glowAlpha = 0;
      if (streakLeft >= idLeft && streakLeft <= idRight) {
        const band = (streakLeft - idLeft) / (idRight - idLeft);
        glowAlpha  = Math.sin(band * Math.PI) * 0.26;
      }
      glow.style.opacity = (glowAlpha * alpha).toFixed(3);
    };

    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);

  // ── DOM LAYER ─────────────────────────────────────────────────────────────
  // z-index ladder:
  //   44 — axis (below everything else)
  //   45 — focal point + identity glow
  //   46 — streak (above axis so it reads as travelling ON the axis)
  return (
    <>
      {/* ── OPTICAL AXIS ─────────────────────────────────────────────────
          Extremely thin, low-contrast gradient line. Not a UI divider.
          Position and width set every frame so it stays anchored to the
          lens (which moves during the hero entry animation). */}
      <div
        ref={axisRef}
        aria-hidden
        style={{
          position:      "fixed",
          height:        "1px",
          pointerEvents: "none",
          zIndex:        44,
          // Gradient: fades in from text side, fades out before lens
          background:
            "linear-gradient(to right, transparent 0%, rgba(200,255,46,0.10) 8%, rgba(200,255,46,0.20) 40%, rgba(200,255,46,0.16) 78%, transparent 100%)",
        }}
      />

      {/* ── FOCAL POINT ──────────────────────────────────────────────────
          3 × 3 px. Positioned 55 % into the axis. Barely a dot — the
          smallest visible presence of the lime accent. */}
      <div
        ref={focalRef}
        aria-hidden
        style={{
          position:      "fixed",
          top:           0,
          left:          0,
          width:         "3px",
          height:        "3px",
          borderRadius:  "50%",
          background:    "rgba(200,255,46,1.0)",
          pointerEvents: "none",
          zIndex:        45,
          // Minimal halo — this must not become a glow explosion
          boxShadow:     "0 0 5px 1px rgba(200,255,46,0.20)",
        }}
      />

      {/* ── SCAN STREAK ──────────────────────────────────────────────────
          Travels along the axis. Invisible at rest. 280 px wide, 1 px tall.
          Gradient: transparent tail → lime tint → white hot → lime dissolve. */}
      <div
        ref={streakRef}
        aria-hidden
        style={{
          position:      "fixed",
          left:          0,
          width:         "280px",
          height:        "1px",
          pointerEvents: "none",
          zIndex:        46,
          opacity:       0,
          willChange:    "transform, opacity",
          background:
            "linear-gradient(to right, transparent 0%, rgba(200,255,46,0.16) 12%, rgba(255,255,255,0.65) 36%, rgba(220,255,120,0.50) 54%, rgba(200,255,46,0.10) 76%, transparent 100%)",
          filter: "blur(0.4px)",
        }}
      />

      {/* ── IDENTITY ILLUMINATION ────────────────────────────────────────
          A feather-soft radial bloom, barely perceptible. Peaks when the
          streak's leading edge is centred over the identity column. */}
      <div
        ref={glowRef}
        aria-hidden
        style={{
          position:      "fixed",
          top:           "26vh",
          left:          "2vw",
          width:         "44vw",
          height:        "46vh",
          pointerEvents: "none",
          zIndex:        45,
          opacity:       0,
          willChange:    "opacity",
          background:
            "radial-gradient(ellipse 58% 52% at 32% 44%, rgba(220,255,180,0.11) 0%, rgba(200,255,46,0.04) 46%, transparent 70%)",
        }}
      />
    </>
  );
}
