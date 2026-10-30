// OBJECT STATE SYSTEM — the single source of truth for where the machine is.
//
// Section heights at 1440x900 (max scroll 18540):
//   Hero          DOM     0 – 1620 (sticky 180vh) → HERO keys 0.000 – 0.092
//   Orbital       DOM  1620 – 5220 → core holds 0.131 – 0.227,
//                                     DOM nodes orbit exactly 360° over 0.161–0.227
//   ProjectsIntro DOM  5220 – 7200 → intro keys 0.250 – 0.389
//   Work          DOM  7200 – 10980 → DF lock 0.381–0.418 … SF lock 0.517–0.552
//   UNDER THE SURFACE  10980 – 16560 (620vh) → UTS keys 0.563 – 0.891
//   Wafer         DOM 16560 – 28440 (1320vh) → wafer keys 0.582 – 1.000,
//                                     including the whole wafer→footer exit
//   Final         DOM 28440 – 29340 (100vh) → the last key, scrollY 28440
//
// (2026, fourth pass.) The separate `#systems` resolution chapter that used to
// sit between the wafer and the contact (DOM 26460 – 28440, 220vh) is gone: it
// was a centred headline that interrupted the wafer's exit and then handed off
// to a reset object. Its 1980px were given to the WAFER chapter (1100vh →
// 1320vh) so the wafer's exit now owns the whole run to the end of the
// document, and the FINAL section still starts at exactly 28440. Total document
// height is unchanged at 29340, so max scroll is still 28440 and EVERY key
// above this one keeps its exact pixel position — nothing was re-anchored and
// no value upstream changed.
//
// RE-ANCHORING (2026, second pass). The UNDER THE SURFACE chapter grew
// 400vh → 620vh so the camera journey has room for four genuinely readable
// depth stages, which raised max scroll 16560 → 18540 and rescaled document
// progress for every anchor ABOVE the insertion by one uniform factor:
// p' = p × (16560/18540) = p × 0.892987. Every upstream key below is that
// pure re-timing — no value changed, only the anchor. The same factor is
// applied to the two downstream hardcoded windows in Sections.tsx
// (OrbitalSystem) and Aperture.tsx (--orbit, --vig) so the DOM chapters stay
// locked to the same page positions they always had. The first pass, when
// the chapter was introduced at 400vh, used the same procedure ×18/23.
//
// RE-ANCHORING (2026, third pass). THE WAFER CHAPTER was appended at scrollY
// 16560 — immediately after UNDER THE SURFACE completes and immediately
// before the Systems chapter — at a height of 9900px (1100vh). Max scroll
// therefore goes 18540 → 28440, and every upstream key below keeps its EXACT
// pixel position: p' = p × (18540/28440) = p × 0.651899. Same uniform factor
// applied to the two hardcoded windows in Sections.tsx (OrbitalSystem) and
// Aperture.tsx (--orbit, --vig). Nothing above the insertion changed except
// the number its progress is divided by; no camera value, object value or
// ScrollTrigger was touched. (Note the factor is old_max / new_max, NOT
// insert_top / new_max — the two coincide in the second pass only because the
// chapter was appended at the then-end of the document.)
import { scrollState } from "./scroll";
import {
  aboutState,
  aboutCalm,
  aboutTravel,
  aboutPunct,
  aboutVanish,
} from "./about";

export type Journey = {
  x: number; y: number; s: number; iris: number; focus: number;
  rot: number; spread: number; camZ: number; camX: number;
  camY: number; tilt: number; key: number; glow: number; yaw: number;
  still: number; lookZ: number; cap: number; tunnel: number; hold: number;
  face: number;
  // THE WAFER CHAPTER (post-SkillForge, post-UNDER-THE-SURFACE). All optional
  // and all zero everywhere upstream, so every chapter above this one samples
  // exactly the values it always did.
  lookY: number;   // vertical look-at offset — the only reason the camera
                   // system needed extending at all: a plate lying flat 9.5
                   // units below the instrument cannot be framed by camY alone.
  tip: number;     // 0 → 1 rolls the instrument from facing the lens to lying
                   // flat on the surface. Additive on tilt, so it is a no-op
                   // upstream.
  dropY: number;   // world Y of the instrument during the descent.
  land: number;    // 0 → 1 descent / seated, and back to 0 on the hand-off.
  plate: number;   // 0 = the plate is off-frame, 1 = seated. Monotonic.
  out: number;     // 0 → 1 the hand-off: the stage lowers and carries the plate
                   // down out of the frame. Separate from `plate` because
                   // "off-frame before it arrives" and "off-frame after it
                   // leaves" are two different places in the world.
  wafer: number;   // plate material → silicon.
  units: number;   // how far the die field has come up.
  sweep: number;   // the reveal wavefront's normalised radius.
  sys: number;     // fractional index into the four system regions.
  wcap: number;    // this chapter's DOM caption (independent of --syscap).
fcap: number;    // the FINAL FOOTER's DOM reveal. Rides the same keys as the
                   // camera so the contact block resolves while the instrument
                   // is still crossing to the left, and arrives with it.
                   // Also the footer's "the frame is closed" term: the wafer's
                   // own system map — four rings, four labels, three etched
                   // paths — fades out on exactly this value, so the last frame
                   // is the wafer and the contact and nothing else.
  // THE FOOTER ASSEMBLY. Zero for the whole document except the four exit
  // keys below, which is what makes it an exact identity upstream.
  ayaw: number;    // THE ASSEMBLY's Y rotation — the mirrored hero orientation.
                   // It lives on the parent group, not on either child, so the
                   // object↔wafer relative transform is provably CONSTANT while
                   // the pair turns. Never added to `yaw`: that one stays on the
                   // instrument's own root, where the lay-down makes it
                   // act pre-rotation, and it is 0 through the whole exit.
  fscl: number;    // THE OBJECT'S FOOTER SIZE. Added to `s`, not multiplied, so
                   // the chapter's 0.58 still carries the wafer chapter and only
                   // the footer's own keys move it: the object has to read as an
                   // inspection device ON the wafer rather than as a speck, but
                   // it must stay far smaller than the surface it sits on. At
                   // 0.38 the whole barrel is 4.78 units across on a 21.2-unit
                   // wafer — 22.5% of its diameter, against 13% in the chapter
                   // and 26% at the projects chapter's own scale. Large enough
                   // to read as a machine with a body and a rim, still an
                   // object ON a surface rather than the subject of the frame.
  fq: number;      // THE FOOTER'S FINISHED LOOK. Zero for every chapter above
                   // the exit, including the whole wafer chapter and the
                   // landing — so it is an exact identity upstream. It is the
                   // one term allowed to touch the OPTICAL OBJECT's own material
                   // and its seat on the wafer (see lib/wafer.ts seatX/seatZ),
                   // because both of those are the closing frame's business and
                   // neither exists anywhere else on the page. Unlike `fcap` it
                   // is NOT forced to 1 under reduced motion: that path renders
                   // one static hero frame, which is not the footer.
};

type ObjectState = {
  x: number; y: number; s: number; iris: number; focus: number;
  spread: number; camZ: number; glow: number;
  camY?: number; tilt?: number; key?: number; yaw?: number; still?: number;
  lookZ?: number; cap?: number; tunnel?: number; hold?: number; face?: number;
  lookY?: number; tip?: number; dropY?: number; land?: number; plate?: number;
  out?: number;
  wafer?: number; units?: number; sweep?: number; sys?: number; wcap?: number;
  fcap?: number; ayaw?: number; fscl?: number; fq?: number;
};

export const OBJECT_STATES = {
  STATE_HERO:    { x: 0.0, y:-1.0, s:0.6,  iris:0.3,  focus:0.0, spread:0.0, camZ:11.0, glow:0.5  },
  STATE_ORBITAL: { x: 0.0, y: 0.0, s:0.36, iris:0.65, focus:1.0, spread:0.0, camZ:13.5, glow:0.4  },
  STATE_CLOSE:   { x: 0.0, y:-0.3, s:1.05, iris:0.45, focus:0.35,spread:0.05,camZ: 9.0, glow:0.7  },
  STATE_RIGHT:   { x: 1.8, y: 0.0, s:0.72, iris:0.7,  focus:1.0, spread:0.0, camZ:10.0, glow:0.6  },
  STATE_LEFT:    { x:-1.8, y: 0.0, s:0.72, iris:0.7,  focus:1.0, spread:0.0, camZ:10.0, glow:0.65 },
  STATE_WOW:     { x: 1.8, y: 0.0, s:0.9,  iris:1.0,  focus:1.0, spread:0.35,camZ: 9.0, glow:1.0  },
  STATE_SYSTEMS: { x: 0.0, y: 0.0, s:0.62, iris:0.6,  focus:0.85,spread:0.0, camZ:11.0, glow:0.6  },
  STATE_FINAL:   { x: 0.0, y: 0.0, s:0.5,  iris:0.32, focus:0.95,spread:0.0, camZ:11.0, glow:0.45 },
} satisfies Record<string, ObjectState>;

type Key = { p: number; state: ObjectState; rot: number };

// One immutable base for the whole WAFER CHAPTER (the keyframe block at the
// foot of this table). Each of its keys states only what MOVES at that beat and
// inherits everything else from the one before it, so a phase that is holding
// the camera still says so exactly once — which is what keeps a 40-key camera
// table readable instead of 40 near-identical rows. `wk` has to live out here
// because a keyframe array cannot hold statements.
const W: ObjectState = {
  x: 0, y: 0, s: 0.58, iris: 0.52, focus: 0.95, spread: 0, camZ: 11, glow: 0.6,
  camY: 0, tilt: 0, key: 2.2, yaw: 0, face: 1, lookZ: -0.5,
  cap: 0, tunnel: 0, hold: 0, still: 0,
  lookY: 0, tip: 0, dropY: 0, land: 0, plate: 0, out: 0,
  wafer: 0, units: 0, sweep: 0, sys: 0, wcap: 0, fcap: 0, ayaw: 0, fscl: 0, fq: 0,
};
let wcur: ObjectState | null = null;
const wk = (p: number, o: Partial<ObjectState>, rot: number): Key => {
  wcur = { ...(wcur ?? W), ...o };
  return { p, state: wcur, rot };
};

const KEYS: Key[] = [
  // ── HERO: 4-PHASE AWAKENING (0.000 – 0.092) ─────────────────────────────
  // Phase 1 FROZEN 0.000-0.011 | Phase 2 STIR 0.011-0.034
  // Phase 3 ENTER  0.034-0.067 | Phase 4 SETTLE 0.067-0.092
  // spread=0 throughout; iris leads position by one phase.
  //
  // THE OBJECT IS IN THE FIRST FRAME. It used to open at x 8.80 with the
  // camera at z 10.80 / fov 42 — half-width there is only ~6.4 units, so the
  // instrument sat entirely off the right edge and the load screen was a
  // black poster with a name on it. x 4.60 puts it in the right-hand third
  // with its rim cropped by the frame, which is what "monumental" needs: the
  // subject is too big for the frame rather than merely absent from it.
  // HeroScan's axis already reads --lens-x per frame, so bringing the lens on
  // screen is what gives the axis a real run from the identity's edge to a
  // real target.
  { p:0.0, state:{x:4.60,y:-0.05,s:1.28,iris:0.72,focus:1.0,spread:0.0,camZ:10.80,glow:0.50,camY:0.35,tilt:-0.10,key:3.20}, rot:0.000 },
  { p:0.007291, state:{x:4.58,y:-0.05,s:1.28,iris:0.73,focus:1.0,spread:0.0,camZ:10.80,glow:0.51,camY:0.35,tilt:-0.10,key:3.20}, rot:0.016 },
  { p:0.014582, state:{x:4.53,y:-0.05,s:1.28,iris:0.76,focus:1.0,spread:0.0,camZ:10.78,glow:0.52,camY:0.35,tilt:-0.10,key:3.25}, rot:0.050 },
  { p:0.021873, state:{x:4.44,y:-0.05,s:1.28,iris:0.79,focus:1.0,spread:0.0,camZ:10.74,glow:0.54,camY:0.36,tilt:-0.10,key:3.28}, rot:0.090 },
  { p:0.029165, state:{x:4.30,y:-0.05,s:1.29,iris:0.82,focus:1.0,spread:0.0,camZ:10.62,glow:0.56,camY:0.36,tilt:-0.10,key:3.32}, rot:0.158 },
  { p:0.036456, state:{x:4.16,y:-0.05,s:1.29,iris:0.85,focus:1.0,spread:0.0,camZ:10.50,glow:0.58,camY:0.37,tilt:-0.11,key:3.38}, rot:0.216 },
  { p:0.043746, state:{x:4.05,y:-0.05,s:1.28,iris:0.87,focus:1.0,spread:0.0,camZ:10.38,glow:0.59,camY:0.37,tilt:-0.11,key:3.42}, rot:0.266 },
  { p:0.047392, state:{x:3.99,y:-0.05,s:1.28,iris:0.88,focus:1.0,spread:0.0,camZ:10.32,glow:0.60,camY:0.38,tilt:-0.11,key:3.45}, rot:0.288 },
  { p:0.054683, state:{x:3.85,y:-0.05,s:1.27,iris:0.90,focus:1.0,spread:0.0,camZ:10.22,glow:0.60,camY:0.38,tilt:-0.11,key:3.48}, rot:0.324 },
  { p:0.056324, state:{x:3.72,y:-0.03,s:1.10,iris:0.85,focus:0.92,spread:0.0,camZ:10.20,glow:0.55,camY:0.39,tilt:-0.11,key:3.30}, rot:0.468 },
  { p:0.059969, state:{x:3.55,y:-0.02,s:0.98,iris:0.80,focus:0.85,spread:0.0,camZ:10.20,glow:0.50,camY:0.40,tilt:-0.11,key:3.15}, rot:0.648 },

  // ── ORBITAL CHAPTER: PINNED CORE SYSTEM (0.099 – 0.227) ──────────────
  // SCENE 2 is a long sticky chapter (~400vh section → ~300vh of pinned
  // scroll ≈ 3 viewports). The 3D core MUST stay perfectly still here:
  // the ONE 360° orbit is performed by the DOM nodes (Sections.tsx),
  // driven by the same scroll progress — never by the 3D rig spinning.
  // TRAVEL  0.099-0.131: object moves right→center, scale 0.98→0.36.
  //   Camera pulls back camZ 10.2→13.5. Iris settles to resting state.
  // HOLD    0.131-0.158: system established; nodes readable; NO motion.
  // ORBIT   0.158-0.227: DOM nodes complete exactly one 360° cycle.
  //   Core holds x=0,y=0,s=0.36 — only whisper rot drift (mechanism idle).
  // The core holds its rest through the release window, then the intro
  // (its own DOM section, scroll 5220–7200) takes over.
  { p:0.0648, state:{x:2.80,y: 0.0, s:0.82,iris:0.78,focus:0.90,spread:0.0,camZ:10.80,glow:0.48,camY:0.30,tilt:-0.08,key:3.00}, rot:0.900 },
  { p:0.070906, state:{x:0.80,y: 0.0, s:0.60,iris:0.72,focus:1.00,spread:0.0,camZ:11.80,glow:0.45,camY:0.15,tilt:-0.04,key:2.80}, rot:1.100 },
  { p:0.077787, state:{x:0.05,y: 0.0, s:0.42,iris:0.67,focus:1.00,spread:0.0,camZ:12.80,glow:0.42,camY:0.05,tilt:-0.01,key:2.60}, rot:1.220 },
  { p:0.085079, state:{x:0.00,y: 0.0, s:0.36,iris:0.65,focus:1.00,spread:0.0,camZ:13.50,glow:0.40,camY:0.00,tilt: 0.00,key:2.50}, rot:1.300 },
  { p:0.103306, state:{x:0.00,y: 0.0, s:0.36,iris:0.65,focus:1.00,spread:0.0,camZ:13.50,glow:0.40,camY:0.00,tilt: 0.00,key:2.50}, rot:1.360 },
  { p:0.121534, state:{x:0.00,y: 0.0, s:0.36,iris:0.65,focus:1.00,spread:0.0,camZ:13.50,glow:0.40,camY:0.00,tilt: 0.00,key:2.50}, rot:1.420 },
  { p:0.137711, state:{x:0.00,y: 0.0, s:0.36,iris:0.65,focus:1.00,spread:0.0,camZ:13.50,glow:0.40,camY:0.00,tilt: 0.00,key:2.50}, rot:1.470 },
  { p:0.147828, state:{x:0.00,y: 0.0, s:0.36,iris:0.65,focus:1.00,spread:0.0,camZ:13.50,glow:0.40,camY:0.00,tilt: 0.00,key:2.50}, rot:1.500 },

  // ── ABOUT REMOVED — orbit releases directly into the intro (2026). ────

  // ── PROJECTS INTRO: THE OBJECT BECOMES THE "O" (0.250 – 0.370) ────────
  // k0: core rest — object waits centered while the orbit DOM releases.
  // k1: glyph — center, glyph scale, front-facing (yaw 0, tilt 0).
  // k2: glyph hold — stillness so the PR[O]JECTS trick reads.
  // k3: breakout — pulls left, grows, turns toward DeployForge.
  { p:0.16314, state:{x: 0.0,y:0.0,s:0.36,iris:0.65,focus:1.00,spread:0.0,camZ:13.5,glow:0.40,camY:0.00,tilt: 0.00,key:2.5,yaw:0}, rot:1.520 },
  { p:0.181732, state:{x:-3.5,y:-0.31,s:0.34,iris:0.75,focus:1.00,spread:0.0,camZ:11.0,glow:0.60,camY:0.00,tilt: 0.00,key:2.6,yaw:0,still:1}, rot:1.880 },
  { p:0.197225, state:{x:-3.5,y:-0.31,s:0.34,iris:0.75,focus:1.00,spread:0.0,camZ:11.0,glow:0.60,camY:0.00,tilt: 0.00,key:2.6,yaw:0,still:1}, rot:1.910 },
  { p:0.212673, state:{x:-3.0,y:0.0,s:0.70,iris:0.68,focus:1.00,spread:0.0,camZ:10.8,glow:0.70,camY:0.15,tilt:-0.03,key:3.0,yaw:0.10}, rot:1.940 },

  // ── PROJECTS CHAPTER (0.370 – 0.563) ────────────────────────────────
  // ONE object reframing THREE subjects. ONE optical axis throughout:
  // identical base orientation (tilt, camY, zero yaw — the face stays
  // upright and circular like the DeployForge reference). Only position
  // (x, y), distance (s, camZ) and iris vary per resting state; the side
  // alternation comes from translation, never from camera rotation.
  // The enter no longer approaches from About — it continues the intro
  // breakout (glyph center → left), so it carries breakout values.
  //
  // KEY `p` VALUES ARE ANCHORED TO THE SECTIONS' REAL DOM HOLDS, NOT TO THE
  // OLD PAGE HEIGHT. Each [data-present] scene (140vh = 1260px) is fully
  // opaque only across scrollY [top−252, top+655] (see choreography.ts
  // enter 0→0.30, hold to 0.72, exit to 1.0 over "top bottom"→"bottom top"),
  // and each lock below sits INSIDE its own scene's band, so the object is
  // already parked on its side while the scene is readable.
  // DeployForge: enter 0.370 → LOCK LEFT 0.381–0.418 → cross 0.433.
  // Chaty:       cross 0.433 → LOCK RIGHT 0.447–0.484 → cross 0.500.
  // SkillForge:  cross 0.500 → LOCK LEFT 0.517–0.552 → release 0.563.
  { p:0.241519, state:{x:-4.2,y:0.0,s:1.02,iris:0.66,focus:1.00,spread:0.0,camZ:10.8,glow:0.70,camY:0.15,tilt:-0.03,key:3.0,yaw:0.22}, rot:1.960 },
  // DeployForge HOLD: the face turns LEFT ~10°. Aperture.tsx composes the
  // final rotation.y as −tilt·0.42 + 0.13·(1−face) + yaw, so with face=0
  // the base is +0.1426 rad here and yaw −0.3171 lands the net at −0.1745 rad
  // (−10.0°). Negative rotation.y swings the face normal toward −X, i.e.
  // screen-left.
  { p:0.248355, state:{x:-6.2,y:0.0,s:1.18,iris:0.62,focus:1.00,spread:0.0,camZ:10.8,glow:0.70,camY:0.15,tilt:-0.03,key:3.0,yaw:-0.3171}, rot:2.020 },
  { p:0.272481, state:{x:-6.2,y:0.0,s:1.18,iris:0.62,focus:1.00,spread:0.0,camZ:10.8,glow:0.70,camY:0.15,tilt:-0.03,key:3.0,yaw:-0.3171}, rot:2.100 },
  { p:0.282532, state:{x: 0.0,y:0.0,s:0.48,iris:0.68,focus:1.00,spread:0.0,camZ:11.2,glow:0.70,camY:0.15,tilt:-0.03,key:3.0,yaw:0}, rot:2.220 },
  // ChatY HOLD: exact mirror of the DeployForge hold. Net rotation.y is
  // +0.1745 rad (+10.0°) against DeployForge's −0.1745 rad, so the base
  // +0.1426 puts yaw at +0.0319. Same magnitude, opposite sign — one
  // machine facing whichever side the framed project sits on.
  { p:0.291646, state:{x: 6.2,y:0.0,s:1.18,iris:0.70,focus:1.00,spread:0.0,camZ:10.6,glow:0.70,camY:0.15,tilt:-0.03,key:3.0,yaw:0.0319}, rot:2.340 },
  { p:0.315797, state:{x: 6.2,y:0.0,s:1.18,iris:0.70,focus:1.00,spread:0.0,camZ:10.6,glow:0.70,camY:0.15,tilt:-0.03,key:3.0,yaw:0.0319}, rot:2.440 },
  { p:0.325823, state:{x: 0.0,y:0.0,s:0.48,iris:0.68,focus:1.00,spread:0.0,camZ:11.2,glow:0.70,camY:0.15,tilt:-0.03,key:3.0,yaw:0}, rot:2.560 },
  // SkillForge HOLD: same optical baseline as DeployForge — yaw −0.3171,
  // net rotation.y −0.1745 rad (−10.0°), face toward screen-left, beside a
  // right-hand project. Release below stays a clone of it.
  { p:0.337215, state:{x:-6.2,y: 0.0,s:1.18,iris:0.62,focus:1.00,spread:0.0,camZ:10.8,glow:0.70,camY:0.15,tilt:-0.03,key:3.0,yaw:-0.3171}, rot:2.680 },
  { p:0.36, state:{x:-6.2,y: 0.0,s:1.18,iris:0.62,focus:1.00,spread:0.0,camZ:10.8,glow:0.70,camY:0.15,tilt:-0.03,key:3.0,yaw:-0.3171}, rot:2.760 },

  // ── UNDER THE SURFACE: THE CAMERA GOES INSIDE THE MACHINE ─────────────
  //   (0.563 – 0.891, scroll 10443 – 16520)                               ──
  // The machine stops examining external work and becomes the ENVIRONMENT
  // the architecture lives inside. Nothing here scales the object to fake a
  // zoom: `s` is held at ~1.06 for the whole approach and dive, so every
  // apparent change in size is the R3F camera actually travelling
  // (camZ 10.7 → −12.0), and the housing passes AROUND the camera rather
  // than in front of it. `face` unwinds the resting 7.5° yaw to zero so the
  // bore axis is parallel to the camera's path and the four station planes
  // stay coaxial with the instrument.
  //
  // The four layers sit at REAL world Z inside the bore (CLIENT −5.6 /
  // SERVICES −9.0 / DATA −12.4 / INFRASTRUCTURE −15.8 — see LAYER_DEPTHS
  // in Aperture.tsx, which owns the matching planes, station rings and the
  // ribbed passage wall). The camera parks 3.8 units in front of the active
  // plane, which is 0.4 units BEHIND the previous layer: passing a station
  // puts the layer you just read literally behind your head. That is the
  // depth proof, and the ribs between stations are the second one.
  //
  // Every beat below is a scroll position, and the two things that must never
  // happen are checked against them: SkillForge's content is at opacity 0 by
  // 10680 (its exit runs 10375 → 10980), and the object is centred by 10680
  // too — the two overlap on purpose, so the frame is never project-leaving
  // + object-somewhere-else + nothing.
  //
  // beat      scrollY   camZ    note
  // release   10443     10.8    clone of the SkillForge lock
  //           10605    10.75   travelling while SF is still fading
  // centre    10680     10.7    SF content is gone; machine is on its axis
  //           10980     10.5    first pixel with no project content at all
  // settle    11272    10.25   sole subject, label only — NO architecture
  //           11495    10.05   the setup frame holds
  // iris      11737    10.0    the machine opens while you are outside it
  // approach  12136      8.6    the camera dollies; outer ring grows past
  //           12452      5.6    inner ring dominant; housing leaving frame
  //           12690      3.0    lens elements gone; throat takes over
  //           12892      1.6    the passage walls close in from the edges
  // mouth     13050      0.6    at the mouth, still looking down the bore
  // crossing  13180     −0.7    THROUGH the optical threshold
  // CLIENT    13300–13580 −1.8  3.8 in front of the −5.6 plate; read + hold
  //           13700     −5.2    travelling deeper (CLIENT 0.4 behind the lens)
  // SERVICES  13830–14050 −5.2  read + hold
  //           14170     −8.6    travelling deeper
  // DATA      14290–14510 −8.6  read + hold
  //           14630    −12.0    travelling deeper
  // INFRA     14750–15050 −12.0 the deepest layer, so it holds longest
  //           15250     −0.9    withdraw inside the bore; every station you
  //                              passed is still lit, so the whole system is
  //                              now in one frame
  // hold      15800     −0.9    complete architecture, one held moment
  // exit      16100      2.2    the camera reverses out through the bore
  //           16360      7.0    housing reassembles, iris closes
  //           16520     11.0    reassembled instrument; Systems takes over
  //
  // The tail is timed so the interlude is FINISHED before the Systems chapter
  // begins at 16560 — its own "03 — Systems" label enters the viewport at
  // 15660, so a complete beat that ran later would have the next chapter's
  // title sitting on top of the wordmark. The instrument Systems now receives
  // is the reassembled one, which is what the exit is for.
  //
  // `cap` is the DOM chapter label (gated by --syscap, and held at 0 until
  // 10680 so it can never appear over SkillForge); `tunnel` gates the
  // interior; `hold` lifts the nearest plate for the single complete beat —
  // the other three layers are carried by their lit station rings, which is
  // the journey's own record rather than four plates printed on one point.

  // RELEASE — clone of the SkillForge lock (departure only). The SkillForge
  // scene is still releasing its copy here, so the object departs underneath
  // it rather than after it. yaw unwinds to 0 and face starts to square the
  // bore: the face stops addressing the project and starts facing the
  // visitor, because from here it is a door, not a lens. y 10443.
  { p:0.367194, state:{x:-6.2,y:0.0,s:1.18,iris:0.62,focus:1.00,spread:0.0,camZ:10.80,glow:0.70,camY:0.15,tilt:-0.03,key:3.0,yaw:-0.3171,face:0,cap:0,tunnel:0,hold:0}, rot:2.820 },
  // LEAVING LEFT — mid-travel, still carrying the project with it.
  { p:0.372886, state:{x:-3.0,y:0.0,s:1.20,iris:0.615,focus:1.00,spread:0.0,camZ:10.75,glow:0.72,camY:0.14,tilt:-0.03,key:2.98,yaw:-0.16,face:0.18,cap:0,tunnel:0,hold:0}, rot:2.880 },
  // ON ITS AXIS — SkillForge's inner content reaches opacity 0 at 10678, so
  // this is the first pixel where the machine is the only subject on screen,
  // and it is already centred and still large. There is no gap between the
  // project leaving and the machine taking over.
  { p:0.375559, state:{x:0.0,y:0.0,s:1.18,iris:0.61,focus:0.99,spread:0.0,camZ:10.70,glow:0.73,camY:0.13,tilt:-0.025,key:2.95,yaw:-0.04,face:0.55,cap:0,tunnel:0,hold:0}, rot:2.940 },
  { p:0.386076, state:{x:0.0,y:0.0,s:1.14,iris:0.58,focus:0.98,spread:0.0,camZ:10.50,glow:0.74,camY:0.12,tilt:-0.02,key:2.92,yaw:0,face:0.82,cap:0,tunnel:0,hold:0}, rot:2.990 },
  // SETTLE — sole monumental subject. The chapter label arrives; the
  // architecture does not exist yet and the camera has barely moved.
  { p:0.396354, state:{x:0.0,y:0.0,s:1.10,iris:0.56,focus:0.97,spread:0.0,camZ:10.25,glow:0.76,camY:0.10,tilt:-0.02,key:2.86,yaw:0,face:0.95,cap:1,tunnel:0,hold:0}, rot:3.040 },
  { p:0.404177, state:{x:0.0,y:0.0,s:1.08,iris:0.545,focus:0.96,spread:0.0,camZ:10.05,glow:0.77,camY:0.09,tilt:-0.02,key:2.84,yaw:0,face:1,cap:1,tunnel:0,hold:0}, rot:3.070 },
  // IRIS OPENS — the machine opens while you are still outside it. camZ
  // barely moves: the change is mechanical, not a zoom.
  { p:0.412652, state:{x:0.0,y:0.0,s:1.06,iris:0.76,focus:0.95,spread:0.0,camZ:10.00,glow:0.80,camY:0.08,tilt:-0.01,key:2.80,yaw:0,face:1,lookZ:-1.0,cap:0.9,tunnel:0.14,hold:0}, rot:3.100 },
  // APPROACH — the camera dollies. Outer housing grows past the viewport.
  { p:0.426668, state:{x:0.0,y:0.0,s:1.06,iris:0.86,focus:0.94,spread:0.0,camZ:8.60,glow:0.86,camY:0.06,tilt:-0.01,key:2.72,yaw:0,face:1,lookZ:-1.6,cap:0.45,tunnel:0.30,hold:0}, rot:3.170 },
  // INNER RING dominant; the housing is leaving the frame.
  { p:0.437815, state:{x:0.0,y:0.0,s:1.06,iris:0.93,focus:0.93,spread:0.0,camZ:5.60,glow:0.92,camY:0.03,tilt:-0.01,key:2.60,yaw:0,face:1,lookZ:-2.4,cap:0.10,tunnel:0.52,hold:0}, rot:3.240 },
  // The lens elements are behind us now, so the throat reads as an opening
  // rather than as glass: the far station glows down the bore as the target.
  { p:0.446225, state:{x:0.0,y:0.0,s:1.06,iris:0.98,focus:0.92,spread:0.0,camZ:3.00,glow:0.97,camY:0.01,tilt:0,key:2.50,yaw:0,face:1,lookZ:-3.0,cap:0,tunnel:0.76,hold:0}, rot:3.300 },
  // The passage walls close in from the frame edges.
  { p:0.45333, state:{x:0.0,y:0.0,s:1.06,iris:1.00,focus:0.92,spread:0.0,camZ:1.60,glow:1.00,camY:0,tilt:0,key:2.46,yaw:0,face:1,lookZ:-3.6,cap:0,tunnel:0.92,hold:0}, rot:3.340 },
  // AT THE MOUTH — petals behind the lens, the corridor ahead.
  { p:0.458872, state:{x:0.0,y:0.0,s:1.06,iris:1.00,focus:0.92,spread:0.0,camZ:0.60,glow:1.00,camY:0,tilt:0,key:2.42,yaw:0,face:1,lookZ:-4.4,cap:0,tunnel:1,hold:0}, rot:3.380 },
  // CROSSING — camZ is between the front glass (+0.37) and the secondary
  // element (−0.53): the housing is around the camera, not in front of it.
  { p:0.463565, state:{x:0.0,y:0.0,s:1.06,iris:1.00,focus:0.92,spread:0.0,camZ:-0.70,glow:1.00,camY:0,tilt:0,key:2.38,yaw:0,face:1,lookZ:-5.6,cap:0,tunnel:1,hold:0}, rot:3.430 },
  // INSIDE — STATION 01, CLIENT. 3.8 in front of the −5.6 plate.
  { p:0.467672, state:{x:0.0,y:0.0,s:1.06,iris:1.00,focus:0.92,spread:0.0,camZ:-1.80,glow:1.00,camY:0,tilt:0,key:2.36,yaw:0,face:1,lookZ:-5.6,cap:0,tunnel:1,hold:0}, rot:3.480 },
  { p:0.477516, state:{x:0.0,y:0.0,s:1.06,iris:1.00,focus:0.92,spread:0.0,camZ:-1.80,glow:1.00,camY:0,tilt:0,key:2.36,yaw:0,face:1,lookZ:-5.6,cap:0,tunnel:1,hold:0}, rot:3.570 },
  // TRAVEL DEEPER — CLIENT is left 0.4 behind the lens; its ribs sweep past.
  { p:0.481688, state:{x:0.0,y:0.0,s:1.06,iris:1.00,focus:0.92,spread:0.0,camZ:-5.20,glow:1.00,camY:0,tilt:0,key:2.36,yaw:0,face:1,lookZ:-9.0,cap:0,tunnel:1,hold:0}, rot:3.660 },
  // STATION 02 — SERVICES.
  { p:0.486382, state:{x:0.0,y:0.0,s:1.06,iris:1.00,focus:0.92,spread:0.0,camZ:-5.20,glow:1.00,camY:0,tilt:0,key:2.36,yaw:0,face:1,lookZ:-9.0,cap:0,tunnel:1,hold:0}, rot:3.750 },
  { p:0.494009, state:{x:0.0,y:0.0,s:1.06,iris:1.00,focus:0.92,spread:0.0,camZ:-5.20,glow:1.00,camY:0,tilt:0,key:2.36,yaw:0,face:1,lookZ:-9.0,cap:0,tunnel:1,hold:0}, rot:3.840 },
  { p:0.498246, state:{x:0.0,y:0.0,s:1.06,iris:1.00,focus:0.92,spread:0.0,camZ:-8.60,glow:1.00,camY:0,tilt:0,key:2.36,yaw:0,face:1,lookZ:-12.4,cap:0,tunnel:1,hold:0}, rot:3.900 },
  // STATION 03 — DATA.
  { p:0.502484, state:{x:0.0,y:0.0,s:1.06,iris:1.00,focus:0.92,spread:0.0,camZ:-8.60,glow:1.00,camY:0,tilt:0,key:2.36,yaw:0,face:1,lookZ:-12.4,cap:0,tunnel:1,hold:0}, rot:3.960 },
  { p:0.510176, state:{x:0.0,y:0.0,s:1.06,iris:1.00,focus:0.92,spread:0.0,camZ:-8.60,glow:1.00,camY:0,tilt:0,key:2.36,yaw:0,face:1,lookZ:-12.4,cap:0,tunnel:1,hold:0}, rot:4.040 },
  { p:0.514413, state:{x:0.0,y:0.0,s:1.06,iris:1.00,focus:0.92,spread:0.0,camZ:-12.00,glow:1.00,camY:0,tilt:0,key:2.36,yaw:0,face:1,lookZ:-15.8,cap:0,tunnel:1,hold:0}, rot:4.100 },
  // STATION 04 — INFRASTRUCTURE. The deepest layer, so it holds longest.
  { p:0.518651, state:{x:0.0,y:0.0,s:1.06,iris:1.00,focus:0.92,spread:0.0,camZ:-12.00,glow:1.00,camY:0,tilt:0,key:2.36,yaw:0,face:1,lookZ:-15.8,cap:0,tunnel:1,hold:0}, rot:4.160 },
  { p:0.529211, state:{x:0.0,y:0.0,s:1.06,iris:1.00,focus:0.92,spread:0.0,camZ:-12.00,glow:1.00,camY:0,tilt:0,key:2.36,yaw:0,face:1,lookZ:-15.8,cap:0,tunnel:1,hold:0}, rot:4.240 },
  // WITHDRAW INSIDE THE BORE — still short of the housing, so all four
  // stations stack ahead as a receding funnel instead of being behind the
  // lens. Every ring you passed is still lit, so the complete system is the
  // sum of the journey rather than a new idea arriving.
  { p:0.536122, state:{x:0.0,y:0.0,s:1.06,iris:1.00,focus:0.94,spread:0.0,camZ:-0.90,glow:1.00,camY:0,tilt:0,key:2.40,yaw:0,face:1,lookZ:-6.2,cap:0,tunnel:1,hold:1}, rot:4.300 },
  // COMPLETE HOLD — every station present, nearest plate dominant.
  { p:0.555548, state:{x:0.0,y:0.0,s:1.06,iris:1.00,focus:0.94,spread:0.0,camZ:-0.90,glow:1.00,camY:0,tilt:0,key:2.40,yaw:0,face:1,lookZ:-6.2,cap:0,tunnel:1,hold:1}, rot:4.360 },
  // EXIT — architecture recedes; the camera withdraws out through the bore,
  // passing the iris from behind and re-entering the housing from inside.
  // iris/s/key end on the RESOLVE values so the handoff into Systems is one
  // continuous move rather than a state change at a key boundary.
  { p:0.565978, state:{x:0.0,y:0.0,s:1.06,iris:0.98,focus:0.92,spread:0.0,camZ:2.20,glow:0.90,camY:0,tilt:0,key:2.54,yaw:0,face:1,lookZ:-1.8,cap:0,tunnel:0.30,hold:0.35}, rot:4.440 },
  { p:0.575235, state:{x:0.0,y:0.0,s:0.90,iris:0.82,focus:0.90,spread:0.0,camZ:7.00,glow:0.80,camY:0,tilt:0,key:2.30,yaw:0,face:1,lookZ:-0.9,cap:0,tunnel:0,hold:0}, rot:4.500 },
  // REASSEMBLED — small calm instrument, fully settled, complexity gone.
  { p:0.580842, state:{x:0.0,y:0.0,s:0.58,iris:0.50,focus:0.95,spread:0.0,camZ:11.0,glow:0.55,camY:0,tilt:0,key:2.0,yaw:0,face:0.6,lookZ:-0.5,cap:0,tunnel:0,hold:0}, rot:4.560 },

  // ── RESOLVE + FINAL (0.570 – 1.000) ────────────────────────────────────
  // Systems owns this window untouched: its DOM is unchanged and the
  // instrument it receives is already reassembled and calm. (The RESOLVE key
  // sits BELOW the REASSEMBLED key in scroll order — it did before this pass
  // too, and both carry the same state, so the out-of-order pair is inert.
  // It stays where it is: this pass re-anchored numbers, it did not retime.)
  { p:0.569726, state:{x:0.0,y:0.0,s:0.58,iris:0.50,focus:0.95,spread:0.0,camZ:11.0,glow:0.55,camY:0.00,tilt:0.00,key:2.0}, rot:5.050 },

  // ── THE WAFER CHAPTER (0.582 – 0.930, scroll 16560 – 26460) ─────────────
  // ONE OBJECT → ONE UNIT → MANY UNITS → DIE ARRAY → SILICON WAFER → SYSTEM.
  // The camera goes on retreating from the machine UNDER THE SURFACE left it,
  // discovers a large circular surface below, watches the machine lay itself
  // down on it, then pulls back far enough to see that the plate is enormous —
  // at which point the plate turns out to be silicon, the instrument's unit has
  // been multiplied across it, and the four architecture layers are die regions
  // on its surface. One continuous physical event: every beat below is another
  // frame of the SAME shot, never a swap — and the exit carries that same shot
  // into the footer, because the surface the chapter built IS the footer's
  // visual. Nothing is torn down on the way out.
  //
  // The instrument's scale `s` is CONSTANT (0.58) for the entire chapter.
  // Nothing about it getting smaller is faked with scale — the camera travels
  // camZ 11 → 33.8 and perspective does all of it, which is why the retreat can
  // be as long as it is without ever touching the object.
  //
  //   beat            scrollY  camZ    what the frame says
  //   hand-off         16560    11.0   clone of the RESOLVE key, at rest
  //   retreat          16770    16.2   leaving the machine; the dark field
  //                    17010    21.4   below it is starting to have a horizon
  //                    17280    26.4   a surface is down there
  //   plate enters     17640    27.8   it comes in from the lower left
  //                    18000    29.4   tipped and rolling, crossing the field
  //                    18360    30.4   seated flat; the instrument is tiny
  //   approach         18600    26.2   the camera goes to the plate
  //                    18960    20.6   the instrument rolls flat as it nears
  //   landed framing   19320    15.2   it is above the surface, tipped, ready
  //   descent          19680    15.2   32% down, mechanical, no easing tricks
  //                    20040    15.2   68%
  //                    20340    15.2   90% — contact, one settling motion
  //   contact          20460    15.2   seated; a shadow, a reflection, nothing else
  //   hold             21090    15.2   0.7 viewport of stillness on the landing
  //   pull back        21390    17.4   the camera stands up off the surface
  //                    21690    20.6   the plate's far edge clears the horizon
  //                    21960    23.2   and its left and right edges with it
  //   conversion       22230    24.4   the plate surface starts to change
  //                    22500    25.2   scribe marks, semiconductor texture
  //                    22680    25.6   the die structures come up out of it
  //                    22770    25.8   silicon
  //   one → many       22950    25.8   ONE die, at the centre
  //                    23280    25.8   a cluster
  //                    23580    25.8   most of the array
  //                    23730    25.8   and the rest
  //                    23820    25.8   the complete array, all of it lit
  //   system reveal    23940    25.8   APPLICATION
  //                    24150    25.8   the etched path travels to COMPUTE
  //                    24330    25.8   COMPUTE
  //                    24510    25.8   path to DATA
  //                    24660    25.8   DATA
  //                    24840    25.8   path to INFRASTRUCTURE
  //                    24900    25.8   INFRASTRUCTURE — the whole system
  //   hold             25380    25.8   complete wafer, one held moment
  //                                     ↓ and from here the exit to the footer
  //   hold             25800    25.8   stillness; the map is legible, the
  //                                 instrument is still seated on it
  //   camera settles   26390    30.6   ONE move to the footer's final camera.
  //                                 A 19% retreat, not the 31% it used to be —
  //                                 and it stops here for good.
  //   wafer at rest    26960    30.6   the ENTIRE wafer, centred, at the scale
  //                                 it will keep in the footer: ~45% of the
  //                                 width and ~46% of the height at 1440×900
  //   reframe left     27640    30.6   the whole composition starts travelling
  //                                 left and the face begins to turn. The camera
  //                                 has been stopped since 26390.
  //   seating          28180    30.6   all but seated; the contact starts
  //                                 resolving against a settled composition
  //   FOOTER           28440    30.6   whole wafer + object on the LEFT,
  //                                 mirrored against the hero, contact RIGHT.
  //                                 STOP.
  //
  // The exit is the entry run backwards ON PURPOSE, and nothing is destroyed on
  // the way out: `out` never leaves 0, so the plate leaves by neither the
  // entry diagonal nor anything else. It is parked, the instrument stays seated
  // on it, and the pair crosses the frame as one object. The chapter can be
  // scrubbed in either direction without a jump or a missing surface.
  //
  // One immutable base for the whole wafer chapter, and each key overrides only
  // what is actually moving at that beat (see `wk` above).
  wk(0.582278, {}, 5.060),                                              // 16560
  wk(0.589662, { camZ: 15, camY: 0.7, lookY: -1.4, wcap: 0.55 }, 5.062),
  wk(0.598101, { camZ: 21.5, camY: 1.9, lookY: -3.6, wcap: 1 }, 5.066),
  wk(0.607595, { camZ: 27, camY: 2.9, lookY: -5 }, 5.070),
  wk(0.620253, { camZ: 30, camY: 3.3, lookY: -5.4, plate: 0.3, wcap: 0 }, 5.074),
  wk(0.632911, { camZ: 30.6, camY: 3.35, lookY: -5.45, plate: 0.68 }, 5.078),
  wk(0.645570, { camZ: 30.8, camY: 3.4, lookY: -5.5, plate: 1 }, 5.082),
  wk(0.654008, { camZ: 26, camY: 3.2, lookY: -5.35, tip: 0.16 }, 5.086),
  wk(0.666667, { camZ: 20.5, camY: 2.9, lookY: -5.15, tip: 0.62 }, 5.090),
  wk(0.679325, { camZ: 15.2, camY: 2.6, lookY: -5, tip: 1 }, 5.094),
  wk(0.691983, { land: 0.32, dropY: -3.03 }, 5.098),
  wk(0.704641, { land: 0.68, dropY: -6.44 }, 5.102),
  wk(0.715190, { land: 0.9, dropY: -8.52 }, 5.104),
  wk(0.719409, { land: 1, dropY: -9.47 }, 5.106),
  wk(0.741561, {}, 5.108),
  wk(0.752110, { camZ: 17.4, camY: 2.7, lookY: -5.3 }, 5.110),
  wk(0.762658, { camZ: 20.6, camY: 3.6, lookY: -7.4 }, 5.112),
  wk(0.772152, { camZ: 23.2, camY: 4.6, lookY: -9.4 }, 5.114),
  wk(0.781646, { camZ: 24.4, camY: 5, lookY: -10.2, wafer: 0.2 }, 5.116),
  wk(0.791139, { camZ: 25.2, camY: 5.3, lookY: -10.5, wafer: 0.58 }, 5.118),
  wk(0.797468, { camZ: 25.6, camY: 5.45, lookY: -10.58, wafer: 0.88 }, 5.120),
  wk(0.800633, { camZ: 25.8, camY: 5.5, lookY: -10.6, wafer: 1 }, 5.122),
  wk(0.806962, { units: 0.06, sweep: 0 }, 5.124),
  wk(0.818565, { units: 0.34, sweep: 0.24 }, 5.126),
  wk(0.829114, { units: 0.68, sweep: 0.54 }, 5.128),
  wk(0.834388, { units: 0.92, sweep: 0.8 }, 5.130),
  wk(0.837553, { units: 1, sweep: 1 }, 5.132),
  wk(0.841772, { sys: 1 }, 5.134),
  wk(0.849156, { sys: 1.45 }, 5.136),
  wk(0.855485, { sys: 2 }, 5.138),
  wk(0.861814, { sys: 2.45 }, 5.140),
  wk(0.867089, { sys: 3 }, 5.142),
  wk(0.873418, { sys: 3.45 }, 5.144),
  wk(0.875527, { sys: 4 }, 5.146),
  wk(0.892405, {}, 5.148),
  // ── THE EXIT: WAFER → FOOTER (0.892 – 1.000, scroll 25380 – 28440) ────────
  // THE WAFER IS THE FOOTER. There is no reset, no hand-off and no lift-off.
  // The wafer never stops existing and the instrument never stops sitting on
  // it: `plate` stays 1, `out` stays 0, `land` stays 1, `tip` stays 1 and
  // `dropY` stays −9.47, because the object that reaches the footer is the
  // wafer WITH the instrument on it. What changes is only where the camera
  // stands and where the whole composition sits in the frame.
  //
  //   beat      scrollY  camZ   what the frame says
  //   HOLD       25800   25.8   nothing moves; the map is legible
  //   CAMERA     26390   29.76  one move to the footer's camera, and then the
  //   SETTLES                      camera is finished for the rest of the page
  //              26960   29.76  the ENTIRE wafer, centred, already at the scale
  //                              it keeps in the footer. One held beat.
  //   REFRAME    27640   29.76  the composition travels left, the face turns,
  //   LEFT       28070   29.76  the object gains its presence. The contact is
  //                              STILL at zero — it may not arrive on a moving
  //                              frame.
  //   FOOTER     28440   29.76  the last 370px: the wafer completes its settle,
  //                              the system map dissolves and the contact
  //                              resolves over the top of it. STOP.
  //
  // WHY THE CAMERA STOPS AT 29.76 AND NOT 33.8. The exit used to retreat 31%
  // (camZ 25.8 → 33.8) at the systems chapter's 30° pitch, which measured — on
  // the real page at 1440×900 — as a wafer 46% of the viewport WIDE but only
  // 37% TALL, floating 321px below the top edge and 250px above the bottom one.
  // That vertical deficit, not the width, is what read as a zoomed-out shot
  // stranded in black: for a disc, height_frac = 1.6·sin(pitch)·width_frac, so
  // at a 30° pitch the wafer can never be taller than it is wide by much no
  // matter how far the camera goes. Retreating further only shrinks it.
  //
  // So the fix is the PITCH, not the distance. camY 15.2 at camZ 29.76 puts the
  // camera-to-plate axis at 37° instead of 30° — a real camera height, still far
  // from the 90° that would make the disc a flat top-down circle — while the
  // retreat drops to 15% and the disc keeps its width. Measured result at
  // 1440×900: 45.9% wide, 47.2% tall, so the surface, the near rim and the
  // 0.3-unit thickness all read at once. The four region labels are flat on that
  // surface, so the steeper axis also un-squashes them from 0.50 to 0.64 of their
  // true height.
  //
  // lookY is solved, not dialled: camY·0.15 + lookY = 15.2·0.15 − 13.892 = −11.61,
  // which is 2.06 units BELOW PLATE.topY. That deliberate overshoot is what
  // lifts the disc off the vertical centre of the frame and seats it level with
  // the contact column beside it — measured, it takes the disc's centre from 0.517
  // of the frame height to 0.498, i.e. the wafer and the contact block now share
  // one optical centreline instead of the wafer hanging 59px below the copy.
  //
  // `x` is the ONE thing that moves the composition, and it now moves it as a
  // RIGID BODY: Aperture applies the sampled `x` to the assembly group — the
  // single parent of BOTH the instrument root and the wafer group — instead of
  // to each of them separately. Neither child writes a world x at all, so the
  // object cannot slide off the wafer: there is one transform, applied once,
  // and the camera still reads the same `c.x` it always did, so its follow and
  // its parallax are unchanged.
  //
  // `ayaw` is the same idea for the turn. It is the ASSEMBLY's rotation.y, and
  // it is deliberately NOT the instrument's own `yaw`: the instrument lies flat
  // (rotation.x −π/2), and on a flat-lying object Euler y acts BEFORE the
  // lay-down, so putting the mirror there would let the object drift azimuthally
  // relative to the disc as it turns. On the parent it turns both at once and
  // the relative transform stays exactly Rx(−π/2) for every value of it.
  //
  // `out` stays 0 for the whole exit, which is what keeps the plate parked:
  // with OUT_POS never engaged the wafer group holds the seated position it
  // had at the systems hold, and `hold = 1 - out = 1` keeps its contact
  // shadow and its accent sheen lit at full value.
  //
  // `fcap` does double duty on the last key, and that is deliberate: the ONE
  // number that resolves the contact copy also closes the wafer's own system
  // map. Four rings, four flat labels and three etched paths are the chapter's
  // subject, not the footer's — the final frame is a wafer and a contact block,
  // and a data visualisation is neither. Reading one gate for both means the
  // technical layer dissolves exactly as the editorial one arrives, on exactly
  // the same frame, with no second term to keep in step. The die array, the
  // scribe marks, the chamfer and the object all stay: the wafer itself is the
  // closing image.
  //
  // The exit is reversible frame for frame — no beat here is one-way, there is
  // no point where the plate can be absent, so scrubbing back up the chapter
  // runs the reframe backwards.
  wk(0.907173, {}, 5.150),
  // CAMERA SETTLES — the last camera move on the page. camZ 25.8 → 29.76 with
  // camY 5.5 → 15.2 and lookY following the axis, so the aim stays welded to
  // the plate and the disc rises into its three-quarter view as it recedes.
  // `s` is untouched for the entire exit: nothing about the wafer getting
  // smaller is faked with scale, and the instrument rides it because it is still
  // physically seated on the surface.
  //
  // THE FOOTER'S THREE NUMBERS, SOLVED AGAINST THE REAL PAGE. The vertical FOV
  // is fixed at 42°, so a disc's size and its silhouette aspect are both pure
  // functions of where the camera stands — camZ and camY together fix both, and
  // lookY then slides the whole silhouette up or down the frame without
  // changing it. Projecting the real 21.2-unit disc (top face at y −9.55, both
  // rims, at the actual aspect ratios) gives, at 1440×900:
  //
  //   camZ 30.60  camY 16.15  →  44.5% w × 45.7% h, centre y 0.517  (was)
  //   camZ 29.76  camY 15.20  →  45.9% w × 47.2% h, centre y 0.498  (now)
  //
  // and the aspect ratio of the silhouette is unchanged, because the disc still
  // reads at ~37° of elevation: a wafer, seen from a camera standing on the
  // floor, not a diagram seen from above. The extra 1.4% of width and 1.5% of
  // height is the whole size change — the wafer was never going to become
  // enormous at a fixed vertical FOV, and the honest way to give it the frame is
  // the 2% of depth it was sitting too far away in.
  wk(0.927568, { camZ: 29.76, camY: 15.2, lookY: -13.892 }, 5.152),
  // THE WHOLE WAFER, AT REST. Nothing overrides: the wafer holds, centred, at
  // exactly the scale and pitch it will keep through the footer. The composition
  // settles BEFORE it is asked to travel, which is what lets the move that
  // follows read as one deliberate reframe rather than as a zoom-out with a
  // slide glued to it.
  wk(0.947961, {}, 5.154),
  // REFRAME LEFT — the composition begins travelling, and `still` 1 stops the
  // mechanism's idle drift so it crosses as a settled object. camZ, camY and
  // lookY are all HELD: the camera has not moved since 26390, so every pixel of
  // movement from here to the last key is the wafer itself crossing the frame.
  // `x` moves the assembly; `ayaw` turns it. The instrument's own `yaw` stays
  // 0 through here — it is the assembly that faces, so the two cannot disagree.
  // `fscl` climbs WITH the crossing and not after it: the object gains its
  // presence as the pair travels, exactly as a real one would, and there is no
  // frame in which it is seated at one size and then pops to another.
  wk(0.971871, { x: -11.2, ayaw: -0.115, fscl: 0.13, still: 1, fcap: 0, fq: 0.34 }, 5.156),
  // SEATED — 97% of the way across, and `fcap` is still 0. The copy is not
  // allowed to arrive on a frame that is still travelling: the wafer finishes
  // its crossing first, and the contact resolves over the settle after it.
  wk(0.986990, { x: -16.5, ayaw: -0.165, fscl: 0.31, still: 1, fcap: 0, fq: 0.76 }, 5.158),
  // FOOTER — the document's last key, scrollY 28440 = the final frame.
  //
  // THE MIRROR, READ OFF THE HERO KEY RATHER THAN GUESSED. The hero key (p 0)
  // is tilt −0.10, face 0, yaw 0, so its net instrument rotation.y is
  // −(−0.10)·0.42 + 0.13·(1−0) + 0 = +0.042 + 0.130 = **+0.172 rad (+9.9°)**.
  // `ayaw` here is −0.172: same magnitude, opposite sign, on the assembly's own
  // Y axis. Not a camera flip, not a Z roll, not a mirror post-effect — the
  // wafer and the object seated on it have genuinely turned together.
  //
  // The mirror is carried on Y alone, as asked. The instrument's X rotation is
  // untouched at the wafer chapter's lay-down (−π/2) and its Z stays 0: `tilt`
  // 0 is deliberate, because the hero's −0.10 belongs to an instrument FACING
  // THE LENS, and tilting this one 5.7° off its seat would bury one edge of the
  // rim in the silicon. Y is also the only axis a flat disc can turn about
  // without leaving the surface.
  //
  // At 9.9° the object stays fully readable: it is a lens lying face-up, so
  // this rotation rolls the bore and its iris about its own axis rather than
  // swinging it side-on — the optical aperture is never turned away.
  //
  // x −17.32 seats it. Nothing else is touched: `s` is still the chapter's
  // 0.58, `iris`/`glow`/`key` are still the chapter's values, and `still` 1
  // has frozen the mechanism's idle drift since the shift began, so the last
  // frame is genuinely the last frame.
  //
  // x −17.32 is SOLVED, not dialled. The camera follows the assembly at 0.3 of
  // its offset and aims at 0.4 of it, so moving the wafer in world X moves it
  // ~0.7× on screen; projecting the disc at the new camera puts its LEFT edge
  // on 4.5% of the frame at both 1440×900 and 1728×1080, with its right tip at
  // 50.4%. That is the number that matters: the wafer is now held a fixed,
  // deliberate distance off the left edge rather than by eye, which is what
  // lets the contact column start at a fixed 62% and leaves a 144px channel of
  // clean black between the two.
  wk(1.000000, { x: -17.32, ayaw: -0.172, fscl: 0.38, still: 1, fcap: 1, fq: 1 }, 5.160),
];

function smootherstep(t: number): number {
  t = Math.min(1, Math.max(0, t));
  return t * t * t * (t * (t * 6 - 15) + 10);
}

/* ────────────────────────────────────────────────────────────────────────
   THE ABOUT CHAPTER — "WHO AM I?" — the machine as punctuation.

   scroll.ts holds progress at `p0` for the whole chapter, so the journey
   samples ONE frame throughout it and nothing in the keyframe table can
   express the machine leaving the hero frame and arriving as the dot of a
   question mark. That is what the block at the foot of this function is for:
   one blended term, driven from the chapter's own scroll window, applied
   after every other term in the table has been sampled. There is still exactly
   one writer of `x`, `y` and `s`.

   It is ONE number, `stage`, and everything the chapter owns rides it —
   the machine's position, the machine's size, and (through aboutState.onStage,
   read by Scene/Aperture.tsx) the camera's coupling to the machine. The
   chapter's beats and the curves for the type live in lib/about.ts.

   `aboutHandOff` is the other half: past the chapter the machine has to go
   back to being the journey's, and the only place that can happen slowly
   enough to read is the orbit's own opening travel. It reaches zero exactly
   at that chapter's core lock, so from there down the orbit is the table it
   always was, byte for byte.
   ──────────────────────────────────────────────────────────────────────── */

// The journey key at which the orbital chapter's core is seated — where the
// hand-off is complete and the orbit must be exactly itself again.
const ORBIT_LOCK_P = 0.085079;

function aboutHandOff(p: number): number {
  if (p <= aboutState.p0) return 1;
  if (p >= ORBIT_LOCK_P) return 0;
  return 1 - smootherstep((p - aboutState.p0) / (ORBIT_LOCK_P - aboutState.p0));
}

export function sampleJourney(progress: number): Journey {
  const p = Math.min(1, Math.max(0, progress));
  // ── MOBILE RETIMING OF THE PROJECTS INTRO (narrow only) ─────────────
  // The glyph keys were calibrated against the DESKTOP word-hold (native
  // hold 0.1817–0.1972). On a 390px frame the intro section's own q leaves
  // the word holding later in this timeline: the letters slide in from its
  // q 0.25 (p ≈ 0.201), hold across q 0.45–0.68 (p ≈ 0.215–0.231) and have
  // dissolved by q 0.85 (p ≈ 0.243) — a window the native hold never
  // overlaps, so the machine and the word never held together on mobile.
  // This remap samples the table so the machine rests until the letters
  // appear, approaches as they assemble, holds across the word's whole
  // on-screen span, then breaks out while the word dissolves. Identity
  // below 0.16314 and above 0.2508 (which lands inside the DeployForge
  // lock's flat, so pose continuity is exact); `narrow` is false at every
  // width ≥768, so desktop samples the table byte for byte.
  //
  // Calibration (390×844, measured): intro top 8271px, height 1857px,
  // docH 30891, about 3376 — tighter or taller frames drift by ~1% of p,
  // which the slot solve in Aperture.tsx absorbs.
  let pw = p;
  if (scrollState.narrow && p > 0.16314) {
    if (p <= 0.2010) pw = 0.16314;
    else if (p <= 0.2148) pw = 0.16314 + (p - 0.2010) * (0.018592 / 0.0138);
    else if (p <= 0.2308) pw = 0.181732 + (p - 0.2148) * (0.015493 / 0.0160);
    else if (p <= 0.2508) pw = 0.197225 + (p - 0.2308) * (0.051130 / 0.0200);
  }
  let i = 0;
  while (i < KEYS.length - 2 && pw > KEYS[i + 1].p) i++;
  const a = KEYS[i];
  const b = KEYS[i + 1];
  const t = smootherstep((pw - a.p) / Math.max(1e-5, b.p - a.p));
  const lerp = (u: number, v: number) => u + (v - u) * t;
  const narrow = scrollState.narrow;
  // NARROW FRAMES. This is a pure scale on `x`, so it is EXACTLY zero-effect on
  // every chapter whose object is centred (the orbit core, Under The Surface,
  // the wafer, the whole interior sequence — all x = 0) and only pulls the
  // chapters that deliberately sit off-centre inboard, which is what a 390px
  // frame needs: desktop's hero parks the machine at 93% of the width, which
  // on a 1440 frame still reads as a lens entering from the right but on a
  // narrow one pushes most of it off the edge. `s` comes down with it so the
  // instrument stays a readable object rather than a full-bleed smear, and the
  // camera comes in a little to keep the 21-unit wafer framed.
  const xScale = narrow ? 0.14 : 1;
  const sScale = narrow ? 0.70 : 1;
  // lookZ falls back to the classic look-ahead so upstream keys (which
  // never set it) behave exactly as before.
  const lzA = a.state.lookZ ?? (-0.5 - a.state.spread * 2);
  const lzB = b.state.lookZ ?? (-0.5 - b.state.spread * 2);
  // ── NARROW-FRAME FRAMING ────────────────────────────────────────────
  //
  // Two chapters need the object framed differently on a portrait frame, and
  // both are the same single fact: the object's apparent size is a function of
  // viewport HEIGHT (the vertical FOV is fixed at 42 degrees), so it does NOT
  // shrink when the frame gets narrower — while the copy it shares the frame
  // with does. On a 1440 frame the two sit side by side; on a 390 one they
  // cannot, so each of these two chapters gets the object framed against the
  // copy instead of beside it.
  //
  // Each is keyed to the exact keyframe band that chapter occupies and is
  // exactly 1 / exactly 0 everywhere else — so every other chapter samples
  // the table byte for byte, and `narrow` is false at every width from 768 up.
  //
  // PROJECTS INTRO: the "O" of PROJECTS is an empty DOM slot the object
  // parks in (Sections.tsx), and that slot cannot be more than about a fifth
  // of a 390px line once PR and JECTS have taken the rest of it. Narrow frames
  // bring the object down to the size of the slot it is standing in.
  const introBand = narrow && p > 0.17 && p < 0.27 ? 0.42 : 1;
  //
  // PORTRAIT HERO. The copy is seated below the header (globals.css) and the
  // machine owns the lower half, but the hero controller parks the object's
  // centre on the frame's vertical middle — its rim reached up into the
  // proof line ("ChatY · SkillForge · DeployForge"). One world-Y sink, gated
  // on `narrow` and faded out across the hero's own scroll, so the machine
  // settles downward on load and is gone by the orbital core lock (p 0.085),
  // where the table still wants y 0 exactly. --lens-y follows the object
  // automatically, so the scan axis sinks with it.
  const heroNarrow = narrow ? 1 - smootherstep(Math.min(1, p / 0.085)) : 0;
  // Hero on mobile: perfectly balanced scale and sink in the lower half, clear of all text
  const heroScaleMod = narrow ? 1 + heroNarrow * 0.18 : 1;
  const heroTiltNarrow = narrow ? heroNarrow * -0.26 : 0;
  const heroSinkY = narrow ? heroNarrow * 3.85 : 0;
  const heroXMod = narrow ? 1 - heroNarrow * 0.70 : 1;
  //
  // PROJECTS: three scenes, each a full column of copy on desktop with the
  // object reframing from the opposite side. On a phone the copy takes the
  // width, so the object is lifted into the top of the frame instead and the
  // two meet at one clean horizontal line rather than the copy sitting under
  // the instrument. camY is NEGATIVE to lift it — the aim point rides at
  // camY*0.15, so lowering the camera is what raises the object in frame — and
  // the object comes down a little with it, because the copy it has to clear is
  // a full-width column on this frame rather than the 38% column it is on a
  // desktop one.
  //
  // The envelope is a ramp at both ends rather than a step, and it is released
  // BEFORE p 0.355 on purpose: the Under The Surface keys begin at p 0.367 and
  // the journey deliberately leads its own section, so a step here would pop
  // the object downward on the frame the camera starts its dive. It is exactly
  // 1 outside the band, and `narrow` is false at every width from 768 up.
  // Note the `: 0`. This term is BOTH a lift (additive, wants 0) and a
  // size reduction (multiplicative as 1 - 0.25*x, which wants 1), so it has to
  // be 0 off a narrow frame for both to come out as identity.
  const projectsFrame = narrow
    ? Math.max(
        0,
        Math.min(1, (p - 0.245) / 0.02, 1 - (p - 0.355) / 0.05)
      )
    : 0;
  // -12, not -9: the scene copy is bottom-anchored, so its top edge floats
  // with each scene's content height. ChatY is the tallest of the three (it
  // leads with its title and carries a metadata band) and therefore sits
  // ~40px higher than the two that open on a kicker, and at -9 its title ran
  // under the instrument's lower-left arc. This clears the TALLEST scene, which
  // is the only one that has to be clear for all three to be.
  const projectsLift = 0;
  const projectLiftY = narrow ? projectsFrame * 2.65 : 0;
  // During projects on mobile, allow the object to move left-to-right (xScale 0.14)
  // toward the empty spaces with dynamic rotation and inspection yaw
  const xNarrowMod = heroXMod;

  // The narrow camera pulls back a little so a portrait frame can hold a 3-unit
  // instrument and a 21-unit wafer. That offset has to be GONE by the time the
  // camera is inside the machine: the interior sequence is authored as real
  // depths (camZ -1.8 / -5.2 / -8.6 / -12.0 against plates at -5.6 / -9.0 /
  // -12.4 / -15.8), and 1.8 units of extra pull-back walks the camera straight
  // back out of the throat — the visitor would see the mouth of the bore and
  // none of the layers. `tunnel` is exactly 1 for the whole interior and
  // exactly 0 everywhere else, so it gates this and nothing else.
  const tunnelT = lerp(a.state.tunnel ?? 0, b.state.tunnel ?? 0);
  const camBack = narrow ? 1.8 * (1 - tunnelT) : 0;

  // THE WAFER CHAPTER, ON A PORTRAIT FRAME. Its camera is SOLVED, not dialled:
  // camZ 29.76 with camY 15.2 and lookY -13.892 together produce a disc that is
  // 45.9% of the WIDTH and 47.2% of the HEIGHT of a 1440x900 frame, which is
  // why that disc still reads as a surface rather than a diagram. Every one of
  // those numbers is a function of the frame's aspect, so on a 390-wide frame
  // the identical rig produces a wafer more than twice the width of the
  // viewport.
  //
  // Retreat is NOT the fix, and the keyframe table already says why: for a disc,
  // height_frac = 1.6 * sin(pitch) * width_frac, so pulling the camera back
  // shrinks the width and takes the height with it — a zoomed-out shot stranded
  // in black. Scaling camZ, camY AND lookY by the SAME factor is: it preserves
  // the pitch, the silhouette and the aim relation exactly (the aim is
  // camY*0.15 + lookY, so all three scale together), and simply stands the
  // whole solved composition far enough back to fit. Gated on the same
  // lookY signal Aperture.tsx uses to recognise this chapter, so it is exactly
  // 1 everywhere else and at every width from 768 up.
  const lY = lerp(a.state.lookY ?? 0, b.state.lookY ?? 0);
  const waferFrame = narrow
    ? Math.min(1, Math.max(0, (Math.abs(lY) - 0.5) / 1.2))
    : 0;
  const fitK = 1 + waferFrame * (narrow ? scrollState.fit * 0.46 - 1 : scrollState.fit - 1);
  const footerWaferLift = narrow ? Math.max(0, Math.min(1, (p - 0.93) / 0.07)) * 2.2 : 0;

  const j: Journey = {
    x:      lerp(a.state.x, b.state.x) * xScale * xNarrowMod,
    y:      lerp(a.state.y, b.state.y) - heroSinkY + projectLiftY + footerWaferLift,
    s:      lerp(a.state.s, b.state.s) * sScale * heroScaleMod * introBand * (1 - 0.35 * projectsFrame),
    iris:   lerp(a.state.iris, b.state.iris),
    focus:  lerp(a.state.focus, b.state.focus),
    rot:    lerp(a.rot, b.rot),
    spread: lerp(a.state.spread, b.state.spread) * (narrow ? 0.5 : 1),
    camZ:   (lerp(a.state.camZ, b.state.camZ) + camBack) * fitK,
    camX:   lerp(a.state.x, b.state.x) * xScale * xNarrowMod * 0.3,
    camY:   (lerp(a.state.camY ?? 0, b.state.camY ?? 0) + projectsLift) * fitK,
    tilt:   lerp(a.state.tilt ?? 0, b.state.tilt ?? 0) + heroTiltNarrow,
    key:    lerp(a.state.key ?? 2.8, b.state.key ?? 2.8),
    glow:   lerp(a.state.glow, b.state.glow),
    yaw:    lerp(a.state.yaw ?? 0, b.state.yaw ?? 0),
    still:  lerp(a.state.still ?? 0, b.state.still ?? 0),
    lookZ:  lerp(lzA, lzB),
    cap:    lerp(a.state.cap ?? 0, b.state.cap ?? 0),
    tunnel: tunnelT,
    hold:   lerp(a.state.hold ?? 0, b.state.hold ?? 0),
    face:   lerp(a.state.face ?? 0, b.state.face ?? 0),
    lookY:  lY * fitK,
    tip:    lerp(a.state.tip ?? 0, b.state.tip ?? 0),
    dropY:  lerp(a.state.dropY ?? 0, b.state.dropY ?? 0),
    land:   lerp(a.state.land ?? 0, b.state.land ?? 0),
    plate:  lerp(a.state.plate ?? 0, b.state.plate ?? 0),
    out:    lerp(a.state.out ?? 0, b.state.out ?? 0),
    wafer:  lerp(a.state.wafer ?? 0, b.state.wafer ?? 0),
    units:  lerp(a.state.units ?? 0, b.state.units ?? 0),
    sweep:  lerp(a.state.sweep ?? 0, b.state.sweep ?? 0),
    sys:    lerp(a.state.sys ?? 0, b.state.sys ?? 0),
    wcap:   lerp(a.state.wcap ?? 0, b.state.wcap ?? 0),
    fcap:   lerp(a.state.fcap ?? 0, b.state.fcap ?? 0),
    ayaw:   lerp(a.state.ayaw ?? 0, b.state.ayaw ?? 0),
    fscl:   lerp(a.state.fscl ?? 0, b.state.fscl ?? 0),
    fq:     lerp(a.state.fq ?? 0, b.state.fq ?? 0),
  };

  // THE ABOUT CHAPTER. Three blends, all pure functions of the chapter's own
  // clock, all multiplied by the hand-off — so this is an EXACT IDENTITY for
  // every anchor above and below the chapter, and the orbit receives the
  // machine the table has always described.
  //
  // Position and size are blends toward values the chapter measures off the
  // live glyph (lib/about.ts): the world point under the "?"'s punctuation dot,
  // and the world scale at which the machine's own housing swallows that dot
  // whole. Nothing here is a percentage, and nothing is guessed about where a
  // glyph's dot lands — it is read off the rendered face every frame.
  //
  // They are SEPARATE blends on purpose. The machine has to be punctuation-
  // sized before it moves (see the states block in lib/about.ts), so the size
  // curve completes a third of a chapter ahead of the travel.
  //
  // Iris, glow, focus, rotation and the whole camera are deliberately NOT
  // touched: the observer stands still while the machine becomes punctuation.
  const hOff = aboutHandOff(p);
  aboutState.calm = aboutCalm(aboutState.t) * hOff;
  if (aboutState.dotS > 0) {
    // `aboutVanish` is the same band as the question's own exit (lib/about.ts),
    // so the machine leaves on the frame the question's last ink leaves. It is
    // applied to the TARGET scale rather than as a post-multiply on `j.s`,
    // because the hand-off below multiplies by `hOff` and has to interpolate
    // between a size of zero and the orbit's own — not between the punctuation
    // size and a post-scaled ghost of it.
    const heroS = j.s;
    const travel = aboutTravel(aboutState.t) * hOff;
    const dotS = aboutState.dotS * (1 - aboutVanish(aboutState.t));
    j.x += (aboutState.dotWX - j.x) * travel;
    j.y += (aboutState.dotWY - j.y) * travel;
    j.s = heroS + (dotS - heroS) * aboutPunct(aboutState.t) * hOff;
    // The machine ends the answer phase at exactly zero, which is the point of
    // aboutVanish — but a zero scale is a degenerate matrix, so the floor keeps
    // the group transformable while being four orders of magnitude below a
    // pixel. Nothing is drawn either way.
    if (j.s < 1e-4) j.s = 1e-4;
  }
  return j;
}
