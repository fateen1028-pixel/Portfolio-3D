"use client";

// ─────────────────────────────────────────────────────────────────────────────
// THE PLATE → THE WAFER
//
// Real geometry, in the same canvas, at the same world scale as the existing
// optical instrument, driven by the existing journey (lib/journey.ts). It adds
// no second camera, no second scroll system and no second object: the aperture
// above it is the SAME instrument throughout, and this file only builds the
// surface it is placed on.
//
// Nothing here fades in or out. The plate physically travels in and back out,
// its material physically changes, and the die array physically grows out of
// the surface — every frame in between is a real intermediate state, so there
// is no cut and no cross-dissolve anywhere in the chapter.
//
// Light: none of its own, on purpose - see the frame loop.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { scrollState } from "@/lib/scroll";
import { sampleJourney } from "@/lib/journey";
import { PLATE, INSTRUMENT, WAFER_SYSTEM, polar } from "@/lib/wafer";

const ACCENT = "#c8ff2e";
const DISPLAY = '"Archivo", system-ui, sans-serif';

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

// Where the plate is BEFORE it arrives (plate = 0) and AFTER it leaves.
//
// The entry offset is deliberately SMALL and the entry roll deliberately
// SHALLOW. The discovery beat of this chapter is the camera retreating and a
// far edge of a surface arriving at the bottom of the frame, so the plate has
// to be just outside the viewport at camZ 15 and just inside it at camZ 22 — not
// thirty units away, and not rolled so far that half the disc swings below the
// frame instead of crossing it. Rolled 0.7 rad the disc's own radius throws its
// near edge 6.8 units DOWN and the discovery beat simply never happens; at 0.3
// it enters tipped and rolling, travels in from the lower left, and seats.
//
// OUT_* is the plate's exit diagonal, reached when `out` rises 0 → 1. It is
// no longer on the timeline: the wafer is the footer's visual now, so `out`
// stays 0 from the systems hold to the last key and the disc never leaves the
// scene. The pair is kept wired because `out` still gates `hold` below (the
// contact shadow, the accent sheen and the four region labels all scale by it),
// and because it is the one number that would move this geometry if the exit
// were ever re-choreographed. Nothing in the current journey can reach it.
const IN_POS: [number, number, number] = [-11, -2.2, 6];
const IN_ROT: [number, number] = [0.12, -0.3];
const OUT_POS: [number, number, number] = [-10, -16, 10];
const OUT_ROT: [number, number] = [-0.3, 0.42];

// ── The chamfered disc ──────────────────────────────────────────────────────
// One lathe, bottom to top: underside, the AS-GROUND back radius, the rim, the
// polished front chamfer, top face. That order is what makes three's lathe
// normals point OUT of the solid. The top face sits at local y 0, so every
// child can be placed at a small positive local Y and still read as sitting ON
// the surface.
//
// The two bevels are different sizes because they are two different edges on a
// real wafer: the face the dies are cut into is chamfered at ~50µm on a 300mm
// wafer, and the back is left with the several-millimetre radius the saw leaves.
// One uniform bevel is what made the previous profile read as a turned metal
// puck — a lathed CG edge has no two-scale story in it, and the eye takes a
// single-sweep lathe silhouette as "manufactured object", never as "slice".
function makeDisc(r: number, t: number, bev: number, back: number) {
  return new THREE.LatheGeometry(
    [
      new THREE.Vector2(0, -t),
      new THREE.Vector2(r - back, -t),
      new THREE.Vector2(r, -t + back),
      new THREE.Vector2(r, -bev),
      new THREE.Vector2(r - bev, 0),
      new THREE.Vector2(0, 0),
    ],
    168
  );
}

// ── Scribe marks: real wafer orientation marks, drawn once into a texture ──
function makeScribeTexture() {
  const S = 1024;
  const cv = document.createElement("canvas");
  cv.width = cv.height = S;
  const g = cv.getContext("2d")!;
  g.translate(S / 2, S / 2);
  g.lineCap = "butt";
  // Primary + secondary scribe: the notched flats every wafer carries.
  g.strokeStyle = "rgba(9,10,12,0.62)";
  g.lineWidth = 2.6;
  for (let i = 0; i < 2; i++) {
    const a = i * Math.PI * 0.5 + Math.PI * 0.25;
    g.beginPath();
    g.moveTo(Math.cos(a) * S * 0.055, Math.sin(a) * S * 0.055);
    g.lineTo(Math.cos(a) * S * 0.472, Math.sin(a) * S * 0.472);
    g.stroke();
  }
  // Rim index band.
  g.strokeStyle = "rgba(206,212,222,0.11)";
  g.lineWidth = 2;
  for (const rr of [0.44, 0.452]) {
    g.beginPath();
    g.arc(0, 0, S * rr, 0, Math.PI * 2);
    g.stroke();
  }
  // Short radial ticks.
  g.strokeStyle = "rgba(9,10,12,0.5)";
  g.lineWidth = 2;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    g.beginPath();
    g.moveTo(Math.cos(a) * S * 0.406, Math.sin(a) * S * 0.406);
    g.lineTo(Math.cos(a) * S * 0.432, Math.sin(a) * S * 0.432);
    g.stroke();
  }
  // The orientation notch, sitting on the rim.
  g.fillStyle = "rgba(9,10,12,0.78)";
  g.fillRect(-S * 0.011, -S * 0.4745, S * 0.022, S * 0.026);
  const tex = new THREE.CanvasTexture(cv);
  tex.anisotropy = 8;
  return tex;
}

// ── Contact shadow: one soft radial pool under the landed instrument ───────
// The falloff is deliberately long-tailed. A pool that reaches zero at its edge
// has no value where the object actually ends, and the object covers the middle
// — so at footer scale the one cue that says "these two things touch" was being
// drawn entirely underneath the thing casting it. Holding most of the alpha out
// to ~40% of the radius puts a ring of shadow on the silicon beyond the barrel
// in every direction. It is still only a ~13% darkening at the barrel's own
// edge, which is what a contact shadow on polished silicon actually is: the
// earlier 3.3-unit pool at 0.66 was drawing nothing at all out there, and the
// first attempt at a long tail at 4.4 units was drawing a smudge across a third
// of the wafer.
function makeShadowTexture() {
  const S = 256;
  const cv = document.createElement("canvas");
  cv.width = cv.height = S;
  const g = cv.getContext("2d")!;
  const grd = g.createRadialGradient(S / 2, S / 2, S * 0.05, S / 2, S / 2, S * 0.5);
  grd.addColorStop(0, "rgba(0,0,0,0.95)");
  grd.addColorStop(0.42, "rgba(0,0,0,0.66)");
  grd.addColorStop(0.72, "rgba(0,0,0,0.22)");
  grd.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, S, S);
  return new THREE.CanvasTexture(cv);
}

// ── Region label ───────────────────────────────────────────────────────────
// Name only, on purpose. The label lies flat on a surface the camera sees at
// ~33°, so anything small enough to carry a second line of type is compressed
// to about 7px and unreadable — and the technology stack it would carry is
// already stated once, in the previous chapter and in this chapter's sr-only
// list. A big name inside a thin ring is the whole idea; the rest is noise.
function makeLabelTexture(name: string) {
  const W = 640;
  const H = 192;
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const g = cv.getContext("2d")!;
  g.textAlign = "center";
  g.textBaseline = "middle";
  let px = 116;
  g.font = `900 ${px}px ${DISPLAY}`;
  const max = W - 40;
  const w = g.measureText(name).width;
  if (w > max) px = Math.max(26, Math.floor((px * max) / w));
  g.font = `900 ${px}px ${DISPLAY}`;
  g.fillStyle = "#dedacf";
  g.fillText(name, W / 2, H / 2);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

// ── The die array ───────────────────────────────────────────────────────────
// ONE mesh, one draw call, ~170 sites, and every one of them FABRICATED INTO the
// substrate rather than stacked on it. The pitch, the site size and the field's
// extent are unchanged — those are part of the frozen chapter — so what changed
// is everything about how a site reads.
//
// Three things decide whether a field of sites reads as MICROFABRICATION or as a
// GRID OF BOXES, and none of them is how tall a die is:
//
//  1. THE DIE FACE AND THE BARE ANNULUS MUST BE THE SAME SILICON. They were not.
//     The array ran at metalness 0.34 / roughness 0.46 against the plate's
//     0.56 / 0.32, so the plate surrendered 56% of its response to metalness
//     while a die surrendered 34%, and the measured result on the real footer
//     frame was die faces at lum 66 over lanes at lum 41 — a 1.6x step in linear
//     light. No amount of shallow geometry survives a value step like that: it is
//     the value step that says "tile", and it is why a field of 0.02-unit relief
//     still read as a grid of boxes. The array's material now matches the
//     plate's, so a die face is worth exactly what the bare silicon beyond the
//     field is worth, and the lattice is drawn by the LANES alone.
//
//  2. THE LANES MUST BE MATTE, NOT DARK. A scribe lane on a real wafer is sawn,
//     so it is frosted where the die faces are mirror-polished — and under this
//     scene's deliberately dim studio environment, frosted silicon returns
//     almost nothing while polished silicon returns the environment's band. So
//     the lanes are separated by ROUGHNESS (the plate's shader lifts it to 0.94
//     inside the field — see `uLane`), which is both the honest mechanism and
//     the one that actually survives at this size: an albedo cut alone would have
//     moved the lanes by about 15%, because this surface is environment-
//     dominated rather than diffuse-dominated, so the value lives in the
//     specular lobe and not in the base colour.
//
//  3. EVERY SITE HAS TO BE TILTED BY A DIFFERENT WHISPER. A diced wafer is not
//     a plane: each site stands a few tens of µm proud and bows slightly, so the
//     polished faces catch the environment at slightly different angles. ±0.6°
//     about X and Z is two rotations applied at build time and costs nothing,
//     and it turns a flat printed grid into a mosaic of 170 slightly different
//     mirrors — which is the entire optical signature of a real die shot.
// Inside a site: interconnect bars at 30µm scale, contact-via fields, a bond-pad
// row, a raised memory array with its reticle cross, and — out past r 8.5 — a
// perimeter band of small alignment and test structures with wider lanes around
// them, which is what a real wafer's edge is and what stops the field reading as
// a circle pasted onto a disc. Every piece is merged into the same geometry and
// shares the same `aLit`, so the ONE → MANY reveal is still one mesh, one write.
type Die = { x: number; z: number; variant: number; rim: boolean; yaw: number; tilt: number; spin: number; tone: number; layout: number };

// Every builder returns flat pieces in XZ with y centred on 0; the caller
// lifts the whole site so its TOP face sits `DIE_TOP` above the substrate.
//
// DIE 1.255 ON A 1.3 PITCH, and that ratio is the single most important number
// in this file. At 1.19 the lane was 0.11 — 8.5% of the pitch, 3.5px on the
// footer frame — and a 3.5px near-black gap around each of 170 plates is what
// makes a wafer read as a floor: a dark gap says "these are separate objects
// with space between them", however shallow the relief. At 3.5% the lane is
// 1.4px, which is a hairline — an engraved grid ON a surface rather than
// 170 cells with gaps. The lattice still draws; the objects stop existing.
const DIE = 1.255;
const DIE_H = 0.024;
const DIE_TOP = 0.012;
const PITCH = 1.3;
const FIELD = 9.55;   // outer radius of the site centres
const RIM = 8.5;      // past here the field becomes test structure, not logic
// 30µm-class conductors standing 2µm off the site face: 0.01% of the wafer's
// diameter. These are drawn, not modelled.
const BAR = 0.03;
const FINE = 0.0022;

// THREE NUMBERS PER PIECE, and the third one is why any of this is visible.
//
//   t — albedo multiplier. FINE LINE work takes 2.3x: at 0.9px it reads as
//       metal and, being that thin, cannot read as a block however bright.
//       Functional areas take only ±8%, because on this scene an albedo step
//       barely moves the value: the surface is specular-dominated, so ±16%
//       measured as 6 lum out of 67 and vanished.
//
//   f — SURFACE FINISH, multiplied into roughness in the shader. This is the
//       lever that can make 10px internal structure legible, and it is the
//       physically honest one: a deposited metal area and bare-oxide area on a
//       real die are the same silicon at different polish, not different
//       colours. It needs a WIDE range to work at all here, and that is worth
//       recording: at 0.7/1.4 it measured as 2 lum out of 65 and was invisible,
//       because this scene's studio environment is a 64×32 gradient with
//       essentially no high-frequency detail, and roughness only blurs — so
//       against a smooth env, 0.28 and 0.56 reflect the same thing. 0.4 and 2.6
//       span near-mirror to fully diffuse and do read.
//
// The hierarchy that comes out of it, measured on the footer frame: lane 53,
// darker area 56, site face 65, brighter area 72. The lane stays the darkest
//       thing on the wafer, so the LATTICE is still the primary structure and
//       the areas are texture inside it — the difference between a patterned
//       substrate and a tiled floor.
const T_LINE = 2.3;
const T_AREA_LO = 0.94;
const T_AREA_HI = 1.08;
const F_AREA_LO = 2.6;   // matte — passivated / bare oxide
const F_AREA_HI = 0.4;   // near-mirror — deposited metal

type Piece = { g: THREE.BufferGeometry; t: number; f: number };

function dieVariant(v: number, rim: boolean, h: number): Piece[] {
  const box = (
    w: number, d: number, x = 0, z = 0, h = DIE_H, y = 0, t = 1, f = 1
  ) => {
    const g = new THREE.BoxGeometry(w, h, d);
    g.translate(x, y, z);
    return { g, t, f };
  };
  // The site face is at +DIE_H/2 in the site's own space; `ty` puts a detail
  // piece's BASE exactly on it, so nothing on a site floats above its silicon.
  const ty = DIE_H / 2 + FINE / 2;
  const line = (w: number, d: number, x: number, z: number): Piece =>
    box(w, d, x, z, FINE, ty, T_LINE);
  const traces = (w: number, d: number, n: number) => {
    const out: Piece[] = [];
    for (let i = 0; i < n; i++)
      out.push(line(w, BAR, (i % 2 ? 1 : -1) * w * 0.05, ((i + 0.5) / n - 0.5) * d));
    return out;
  };
  // Contact vias. 0.05 units is 0.24% of the wafer's diameter — a pixel or two,
  // which is the right order of magnitude for something meant to be texture
  // rather than an object.
  const vias = (n: number, step: number) => {
    const out: Piece[] = [];
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++)
        out.push(line(0.05, 0.05, (i - (n - 1) / 2) * step, (j - (n - 1) / 2) * step));
    return out;
  };
  // Bond-pad row: the I/O edge of a driver site.
  const pads = (d: number) => {
    const out: Piece[] = [];
    for (let i = 0; i < 9; i++)
      out.push(line(0.12, 0.05, DIE * 0.38, ((i + 0.5) / 9 - 0.5) * d * 0.9));
    return out;
  };
  const cross = (s: number): Piece[] => [line(s, 0.011, 0, 0), line(0.011, s, 0, 0)];
  // FUNCTIONAL AREAS. A die is not a blank plate; it is a few large blocks at
  // different polish, divided by macro lanes far wider than the scribe grid.
  // Two decisions here are what stop 170 sites reading as 170 keys: the areas
  // fill 94% of the face, so they are a PARTITION of the site rather than an
  // insert dropped into it — one 0.4-unit square per face was the single thing
  // that most looked like a button; and the LAYOUT comes from the site's own
  // hash, so neighbours differ and the field cannot read as one stamp.
  const LAYOUTS: [number, number][] = [[1, 2], [2, 1], [2, 2], [1, 3], [3, 1], [2, 3], [3, 2], [1, 4]];
  const block = (
    w: number, d: number, cols: number, rows: number, cx: number, cz: number, seed: number
  ): Piece[] => {
    const cw = w / cols, cd = d / rows;
    const out: Piece[] = [];
    for (let i = 0; i < cols; i++)
      for (let j = 0; j < rows; j++) {
        const n = ((i * rows + j) * 3 + seed) % 5;
        const hi = n < 2;
        out.push(
          box(cw - 0.05, cd - 0.05,
            cx - w / 2 + cw * (i + 0.5), cz - d / 2 + cd * (j + 0.5),
            FINE * 1.5, ty, hi ? T_AREA_HI : T_AREA_LO, hi ? F_AREA_HI : F_AREA_LO)
        );
      }
    return out;
  };

  if (rim) {
    // PERIMETER TEST STRUCTURE. Half-size sites with wide lanes around them and
    // an alignment cross or a probe comb — the band a real wafer carries between
    // the last logic site and the edge, and the reason the field's circular
    // boundary stops being legible as "pasted on".
    const s = DIE * 0.42;
    if (v & 1) return [box(s, s), ...cross(s * 0.62), line(s * 1.7, 0.016, 0, 0)];
    return [box(s, s), ...vias(3, 0.08), line(s * 1.2, 0.02, 0, 0)];
  }

  const L = LAYOUTS[Math.floor(h * LAYOUTS.length) % LAYOUTS.length];
  const F = DIE * 0.94;
  switch (v) {
    case 0: return [box(DIE, DIE), ...block(F, F, L[0], L[1], 0, 0, 0), ...traces(DIE * 0.62, DIE, 2)];
    // The two rectangular sites are what made the field read as scattered
    // rectangles; there are now two of eight, and only some of those are
    // quarter-turned, so the lattice reads as a lattice.
    case 1: return [box(DIE * 0.82, DIE), ...block(F * 0.68, F, L[0], L[1], 0, 0, 2), ...traces(DIE * 0.6, DIE * 0.86, 2)];
    case 2: return [box(DIE, DIE * 0.82), ...block(F, F * 0.68, L[0], L[1], 0, 0, 4), ...traces(DIE * 0.86, DIE * 0.6, 2)];
    // Two chiplets on one site, each with its own partition.
    case 3:
      return [
        box(DIE * 0.42, DIE, -DIE * 0.29),
        box(DIE * 0.42, DIE, DIE * 0.29),
        ...block(DIE * 0.38, F, 1, 2, -DIE * 0.29, 0, 1),
        ...block(DIE * 0.38, F, 2, 1, DIE * 0.29, 0, 3),
        ...traces(DIE * 0.3, DIE * 0.5, 2),
      ];
    // MEMORY BANK: a 3×3 array of small areas, always the same layout because a
    // memory die really is regular. The most legible face in the field and the
    // one that says "semiconductor" loudest.
    case 4:
      return [
        box(DIE, DIE),
        ...block(DIE * 0.88, DIE * 0.88, 3, 3, 0, 0, 2),
        ...cross(0.34),
      ];
    // Dense logic — the only site carrying a full via array.
    case 5:
      return [
        box(DIE, DIE),
        ...block(F * 0.42, F, 1, 2, -DIE * 0.23, 0, 4),
        ...traces(DIE * 0.28, DIE * 0.5, 2),
        ...vias(4, 0.15),
      ];
    // I/O driver: a bond-pad row along the outer edge, areas inside it.
    case 6:
      return [
        box(DIE, DIE),
        ...pads(DIE),
        ...block(F * 0.6, F, 2, 1, -DIE * 0.14, 0, 1),
        ...traces(DIE * 0.42, DIE * 0.6, 2),
      ];
    // SPARSE SITE. One in eight carries a single large area and one mark, which
    // is the density variation the field needs so it does not read as one stamp.
    default:
      return [
        box(DIE, DIE),
        ...block(DIE * 0.6, DIE * 0.6, 1, 1, 0, 0, 2),
        line(0.13, 0.13, -DIE * 0.38, -DIE * 0.38),
      ];
  }
}

// A 32-bit integer hash of the lattice coordinate, with a real avalanche step
// (murmur3's fmix32). This is not a refinement — it is the bug that made the
// whole field look like a stamped floor. The previous form was
// `(Math.imul(i, 73856093) ^ Math.imul(j, 19349663) ^ 0) >>> 13`, which has no
// avalanche: XORing two products that each step by a constant leaves the high
// bits highly structured, so after the shift and the /2^32 the value collapsed
// to almost nothing or almost one. Measured over the real 177 sites it produced
// variants {0: 89, 7: 88} — a checkerboard of two site types and nothing else —
// and a per-site tone of {0: 140, 7: 37}. Every complaint that the wafer read
// as a repetitive grid of identical tiles traces back to this one line. With
// the avalanche it is {24, 19, 24, 19, 20, 25, 25, 21}.
const h2 = (i: number, j: number): number => {
  let h = Math.imul(i, 73856093) ^ Math.imul(j, 19349663);
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

function buildDies(): Die[] {
  const n = 8;
  const out: Die[] = [];
  for (let i = -n; i <= n; i++) {
    for (let j = -n; j <= n; j++) {
      const x = i * PITCH;
      const z = j * PITCH;
      // Dies stop short of the rim by a fixed lane, so the outer row reads as
      // the partial dies a real wafer is diced with, not as a clipped grid.
      const rad = Math.hypot(x, z);
      if (rad > FIELD) continue;
      const rim = rad > RIM;
      const v = Math.floor(h2(i, j) * (rim ? 2 : 8));
      out.push({
        x,
        z,
        variant: v,
        rim,
        // Quarter-turn only the rectangular sites, and only about half of them.
        yaw: !rim && (v === 1 || v === 2) && h2(i, j + 57) > 0.55 ? Math.PI / 2 : 0,
        // ±0.34° of bow per axis. Worst-case corner lift is 0.0036, and the site
        // stands 0.012 proud, so a tilted site can never sink into its lane. It
        // is deliberately this small: at ±1.1° every site picked up a lit edge
        // on one side and a shadowed one on the other, and 170 of those read as
        // 170 raised keys rather than as one patterned plane. All the variation
        // this needs is a slight change in which part of the environment each
        // polished face catches.
        tilt: (h2(i + 3, j) - 0.5) * 0.012,
        spin: (h2(j, i + 11) - 0.5) * 0.012,
        tone: h2(i - 9, j + 41),
        layout: h2(i * 5 + 2, j * 7 - 3),
      });
    }
  }
  return out;
}

function buildDieMesh(dies: Die[]) {
  const geos: THREE.BufferGeometry[] = [];
  const radii: number[] = [];
  const col = new THREE.Color();
  for (const d of dies) {
    const r = Math.hypot(d.x, d.z) / FIELD;
    const pieces = dieVariant(d.variant, d.rim, d.layout);
    for (const piece of pieces) {
      const g = piece.g;
      // Bow first, then the quarter-turn, then the site is placed. Three cheap
      // rotations; no extra vertices and no extra draw.
      if (d.tilt) g.rotateX(d.tilt);
      if (d.spin) g.rotateZ(d.spin);
      if (d.yaw) g.rotateY(d.yaw);
      // The substrate's top face is local y 0. Dropping the site by half its own
      // thickness puts it HALF-BURIED: 0.013 below the surface and 0.013 above,
      // so the pattern is relief in the substrate rather than blocks resting on
      // it — 0.12% of the wafer's diameter, an order of magnitude under what
      // the camera can resolve as a step. The fine detail is built at +DIE_H/2
      // in the site's own space and lands exactly on the site's top face.
      g.translate(d.x, DIE_TOP - DIE_H / 2, d.z);
      const n = g.attributes.position.count;
      // THE INTEGRATION, IN ALBEDO. A site and the lane beside it are the same
      // silicon, so the face is set to the SUBSTRATE's own value — the wafer
      // shader in `uLane` is what draws the lattice, by frosting the lanes
      // rather than by darkening one thing and not the other. `piece.t` is the
      // per-piece multiplier: 1 on the face itself, T_LINE on the fine-line work
      // and T_BLOCK on the one large raised array. Per-site tone spans ±3.6% —
      // enough to keep the field from being one flat sheet, far too little to
      // read as the patchwork the old `(k*7+i*3+j*5) % 11` seed printed.
      const base = 0.055 + d.tone * 0.008;
      col.setHSL(0.578, 0.045, base * piece.t);
      const colors = new Float32Array(n * 3);
      const aLit = new Float32Array(n);
      const aFin = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        colors[i * 3] = col.r;
        colors[i * 3 + 1] = col.g;
        colors[i * 3 + 2] = col.b;
        aFin[i] = piece.f;
        radii.push(r);
      }
      g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      g.setAttribute("aLit", new THREE.BufferAttribute(aLit, 1));
      g.setAttribute("aFin", new THREE.BufferAttribute(aFin, 1));
      geos.push(g);
    }
  }
  const geo = mergeGeometries(geos, false)!;
  geos.forEach((g) => g.dispose());
  return { geo, radii: new Float32Array(radii) };
}

// ── Roughness break-up ──────────────────────────────────────────────────────
// Without this the disc is one perfectly uniform specular lobe and reads as
// painted plastic rather than a machined surface. A few dozen soft blotches
// plus faint concentric turning marks are enough: it multiplies the material's
// roughness, so the whole thing stays in the same dark value range and only the
// sheen varies.
function makeRoughnessTexture() {
  const S = 512;
  const cv = document.createElement("canvas");
  cv.width = cv.height = S;
  const g = cv.getContext("2d")!;
  g.fillStyle = "#9a9a9a";
  g.fillRect(0, 0, S, S);
  let seed = 7;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (let i = 0; i < 90; i++) {
    const x = rnd() * S;
    const y = rnd() * S;
    const r = 24 + rnd() * 110;
    const v = 0.5 + rnd() * 0.5;
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, `rgba(255,255,255,${v * 0.5})`);
    grd.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grd;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // Turning marks: the concentric evidence of a lapped face.
  g.strokeStyle = "rgba(0,0,0,0.1)";
  g.lineWidth = 1.5;
  for (let rr = 26; rr < S * 0.72; rr += 9) {
    g.beginPath();
    g.arc(S / 2, S / 2, rr, 0, Math.PI * 2);
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.anisotropy = 8;
  return tex;
}

// ── A small procedural studio environment ───────────────────────────────────
// A PMREM'd 64×32 equirect gradient assigned ONLY to the wafer's own
// materials. Without it a dark metallic surface reflects nothing at all and
// the wafer reads as flat grey paint; with it the chamfer, the die bevels and
// the rim pick up real reflections. scene.environment is deliberately NOT
// touched — that would relight the existing instrument.
function makeStudioEnv(gl: THREE.WebGLRenderer): THREE.Texture {
  const W = 64;
  const H = 32;
  const data = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) {
    const v = y / (H - 1);
    for (let x = 0; x < W; x++) {
      const u = x / (W - 1);
      const band = Math.exp(-Math.pow((v - 0.22) / 0.16, 2));
      const side =
        Math.exp(-Math.pow((v - 0.42) / 0.3, 2)) *
        (0.4 + 0.6 * Math.pow(Math.abs(Math.cos(u * Math.PI * 2)), 3));
      // Deliberately dim. This is a graphite wafer in a dark room; a bright
      // environment here is what turns dark metal into pale blue plastic.
      const l = 0.018 + band * 0.175 + side * 0.045;
      // The site's one accent lives here rather than in a light: the main
      // reflection band carries a restrained lime response, which is the only
      // thing that gives the silicon a colour of its own without touching the
      // page's palette. It is +0.05 on green against a base luma that peaks at
      // 0.19 — a few percent of the wafer's own value, not a green light.
      const i = (y * W + x) * 4;
      data[i] = Math.round(255 * Math.min(1, l * 0.98 + band * 0.01));
      data[i + 1] = Math.round(255 * Math.min(1, l * 1.02 + band * 0.05));
      data[i + 2] = Math.round(255 * Math.min(1, l * 1.12 + band * 0.004));
      data[i + 3] = 255;
    }
  }
  const src = new THREE.DataTexture(data, W, H, THREE.RGBAFormat);
  src.mapping = THREE.EquirectangularReflectionMapping;
  src.needsUpdate = true;
  const pmrem = new THREE.PMREMGenerator(gl);
  const rt = pmrem.fromEquirectangular(src);
  pmrem.dispose();
  src.dispose();
  return rt.texture;
}

export function Wafer() {
  const { gl } = useThree();
  const group = useRef<THREE.Group>(null);
  const dieGroup = useRef<THREE.Group>(null);
  const dieMat = useRef<THREE.MeshStandardMaterial>(null);
  const plateMat = useRef<THREE.MeshPhysicalMaterial>(null);
  const scribeMat = useRef<THREE.MeshBasicMaterial>(null);
  const shadowMat = useRef<THREE.MeshBasicMaterial>(null);
  const sheenMat = useRef<THREE.MeshBasicMaterial>(null);
  const seat = useRef<THREE.Group>(null);
  const ringMats = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const labelMats = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const traceMats = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const heads = useRef<(THREE.Mesh | null)[]>([]);
  const headMats = useRef<(THREE.MeshBasicMaterial | null)[]>([]);

  const [env, setEnv] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    const t = makeStudioEnv(gl);
    setEnv(t);
    return () => t.dispose();
  }, [gl]);

  const disc = useMemo(() => makeDisc(PLATE.r, PLATE.thickness, PLATE.bevel, PLATE.backBevel), []);
  const scribeTex = useMemo(() => makeScribeTexture(), []);
  const roughTex = useMemo(() => makeRoughnessTexture(), []);
  const shadowTex = useMemo(() => makeShadowTexture(), []);
  const dieField = useMemo(() => {
    const dies = buildDies();
    const { geo, radii } = buildDieMesh(dies);
    return { geo, radii, lit: geo.attributes.aLit as THREE.BufferAttribute };
  }, []);

  // Label textures live in state, not a memo: they are redrawn once the real
  // faces are resident, and a memo array mutated in place would never reach
  // the meshes that already captured the fallback draw.
  const [labelTex, setLabelTex] = useState<THREE.CanvasTexture[]>([]);
  useEffect(() => {
    let live = true;
    const draw = () => {
      if (live) setLabelTex(WAFER_SYSTEM.map((r) => makeLabelTexture(r.name)));
    };
    if (typeof document === "undefined" || !document.fonts) {
      draw();
      return;
    }
    Promise.all([document.fonts.load('900 116px "Archivo"')])
      .catch(() => {})
      .then(draw);
    return () => {
      live = false;
    };
  }, []);

  const traces = useMemo(
    () =>
      WAFER_SYSTEM.map((r, i) => {
        const n = WAFER_SYSTEM[(i + 1) % WAFER_SYSTEM.length];
        // Straight out of one ring and into the next, bowed only slightly
        // outward. The mid-angle takes the SHORT way round: INFRASTRUCTURE
        // (325°) to APPLICATION (55°) is 90° forward through 360°, and taking
        // the arithmetic mean instead sends that one path across the far side
        // of the wafer and straight through the middle.
        const p0 = polar(r.a, r.r + r.ring + 0.16);
        const p1 = polar(n.a, n.r + n.ring + 0.16);
        let da = n.a - r.a;
        if (da > 180) da -= 360;
        if (da < -180) da += 360;
        const pm = polar(r.a + da / 2, (r.r + r.ring + n.r + n.ring) / 2 + 0.35);
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(p0[0], 0.062, p0[1]),
          new THREE.Vector3(pm[0], 0.062, pm[1]),
          new THREE.Vector3(p1[0], 0.062, p1[1]),
        ]);
        const geo = new THREE.TubeGeometry(curve, 96, 0.019, 5, false);
        const tan = curve.getTangent(1);
        const headGeo = new THREE.ConeGeometry(0.1, 0.3, 8);
        headGeo.translate(0, 0.15, 0);
        headGeo.applyQuaternion(
          new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tan)
        );
        headGeo.translate(p1[0] - tan.x * 0.2, 0.062, p1[1] - tan.z * 0.2);
        return { geo, headGeo, total: geo.index ? geo.index.count : 0 };
      }),
    []
  );

  useEffect(() => {
    if (!env) return;
    for (const m of [plateMat.current, dieMat.current]) {
      if (!m) continue;
      m.envMap = env;
      m.envMapIntensity = 1;
      m.needsUpdate = true;
    }
  }, [env]);

  // The material transformation itself: a conversion band of lime sweeps
  // outward across the disc as `wafer` climbs, so the change reads as something
  // happening TO the surface rather than a colour swap.
  const plateU = useRef<Record<string, { value: number | THREE.Color }> | null>(null);
  useEffect(() => {
    const m = plateMat.current;
    if (!m) return;
    const u: Record<string, { value: number | THREE.Color }> = {
      uAccent: { value: new THREE.Color(ACCENT) },
      uBand: { value: 0 },
      uBandAmt: { value: 0 },
      uLane: { value: 0 },
    };
    plateU.current = u;
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uAccent = u.uAccent;
      sh.uniforms.uBand = u.uBand;
      sh.uniforms.uBandAmt = u.uBandAmt;
      sh.uniforms.uLane = u.uLane;
      sh.vertexShader =
        "varying vec3 vLocalPos;\n" +
        sh.vertexShader.replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\n vLocalPos = position;"
        );
      // THE SCRIBE LANES. Everything inside the diced field is lifted to a matte
      // finish, and the site array is sitting ON TOP of it — so what this shader
      // actually frosts is the 0.08-unit lanes between the sites, and nothing
      // else is touched. The mask is a plain radius from the disc centre, which
      // is exact because `vLocalPos` is the lathe's own object-space position
      // and the field is a circle on the same plane.
      //
      // Roughness, not albedo, is the lever, and it has to be: under this scene's
      // dim studio environment the surface is specular-dominated, so an albedo
      // cut in the lanes moves them by about 15% while a roughness of 0.66 drops
      // the same lanes by about a fifth — the polished faces keep the
      // environment's band, the frosted lanes scatter it. That is also what a
      // sawn lane physically is. And it has to be a FIFTH, not a half: at 0.90
      // the lanes measured lum 37 against faces at 50, and a 3px near-black gap
      // around each of 170 plates is a keyboard, not a wafer. 0.66 puts them at
      // ~44 — an engraved hairline that still draws the lattice without turning
      // the field into 170 separate objects. uLane rides `wafer`, so the field is
      // mirror-polished until the conversion band reaches it and frosted after,
      // and it is 0 for the whole document above this chapter.
      //
      // The mask radius tracks the site field's own outer envelope — centres out
      // to 9.55, corners reaching ~10.4 — rather than a smaller circle inside
      // it: at 9.95 the fade ended mid-field and drew a visible ring across the
      // wafer that read as the rim of a pasted-on disc.
      //
      // `_lane` is declared in the colour injection because <color_fragment> is
      // the earliest of the four hooks it is needed in — roughness and
      // clearcoat roughness are both resolved after it, and putting the
      // declaration in the roughness hook fails to compile.
      sh.fragmentShader =
        "varying vec3 vLocalPos;\nuniform vec3 uAccent;\nuniform float uBand;\nuniform float uBandAmt;\nuniform float uLane;\n" +
        sh.fragmentShader
          .replace(
            "#include <color_fragment>",
            `#include <color_fragment>
             float _lane = smoothstep(${PLATE.fieldR.toFixed(2)}, ${(PLATE.fieldR - 0.4).toFixed(2)}, length(vLocalPos.xz)) * uLane;
             diffuseColor.rgb *= mix(1.0, 0.68, _lane);`
          )
          .replace(
            "#include <roughnessmap_fragment>",
            `#include <roughnessmap_fragment>
             roughnessFactor = mix(roughnessFactor, 0.66, _lane);`
          )
          .replace(
            "#include <clearcoat_roughnessmap_fragment>",
            `#include <clearcoat_roughnessmap_fragment>
             clearcoatRoughnessFactor = mix(clearcoatRoughnessFactor, 0.6, _lane);`
          )
          .replace(
            "#include <emissivemap_fragment>",
            `#include <emissivemap_fragment>
           float _bd = (length(vLocalPos.xz) - uBand) / 1.35;
           totalEmissiveRadiance += uAccent * uBandAmt * exp(-_bd * _bd) * 1.6;`
          );
    };
    m.customProgramCacheKey = () => "wafer-plate";
    m.needsUpdate = true;
  }, []);

  // One `aLit` per vertex, so each site can be lit on its own. vColor carries
  // the array's per-site value drift; vLit carries the reveal; vFin carries the
  // per-piece SURFACE FINISH, which is the only channel that can make 10px
  // internal structure legible on an environment-dominated surface — see the
  // T_AREA/F_AREA note above. A deposited metal area and bare oxide on a real
  // die are the same silicon at different polish, not different colours.
  //
  // The emissive is a NEUTRAL COOL sheen at a whisper, not the lime accent. It
  // used to be `vec3(0.72, 0.88, 0.34)` — the accent green — at 0.085, which
  // was invisible while the reveal left the field dark and then tinted the whole
  // array olive once the wavefront filled. Silicon's own sheen is cool and
  // near-neutral; the lime belongs to the etched region outlines, and this
  // surface should not compete with them.
  useEffect(() => {
    const m = dieMat.current;
    if (!m) return;
    m.onBeforeCompile = (sh) => {
      sh.vertexShader =
        "attribute float aLit;\nattribute float aFin;\nvarying float vLit;\nvarying float vFin;\n" +
        sh.vertexShader.replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\n vLit = aLit;\n vFin = aFin;"
        );
      sh.fragmentShader =
        "varying float vLit;\nvarying float vFin;\n" +
        sh.fragmentShader
          .replace(
            "#include <color_fragment>",
            "#include <color_fragment>\n diffuseColor.rgb *= (0.4 + 0.62 * vLit);"
          )
          .replace(
            "#include <roughnessmap_fragment>",
            `#include <roughnessmap_fragment>
             roughnessFactor = clamp(roughnessFactor * vFin, 0.035, 1.0);`
          )
          .replace(
            "#include <emissivemap_fragment>",
            `#include <emissivemap_fragment>
             totalEmissiveRadiance += vec3(0.66, 0.78, 0.84) * vLit * 0.01;`
          );
    };
    m.customProgramCacheKey = () => "wafer-die";
    m.needsUpdate = true;
  }, []);

  // Smoothed chapter state — the same k the aperture uses, from the same
  // sampler, so the plate cannot drift out of step with the camera.
  const cur = useRef({ plate: 0, out: 0, wafer: 0, units: 0, sweep: 0, sys: 0, land: 0, fcap: 0, fscl: 0, camZ: 11 });

  useFrame((_state, delta) => {
    const d = Math.min(delta, 0.05);
    const k = 1 - Math.exp(-d * 4.5);
    const c = cur.current;
    // The composition's own transform is NOT read here. It is sampled once, by
    // the assembly group in Aperture.tsx, and inherited through the parent.
    const t = sampleJourney(scrollState.progress);
    const rm = scrollState.reducedMotion;
    c.plate += ((rm ? 0 : t.plate) - c.plate) * k;
    c.out += ((rm ? 1 : t.out) - c.out) * k;
    c.wafer += ((rm ? 0 : t.wafer) - c.wafer) * k;
    c.units += ((rm ? 0 : t.units) - c.units) * k;
    c.sweep += ((rm ? 0 : t.sweep) - c.sweep) * k;
    c.sys += ((rm ? 0 : t.sys) - c.sys) * k;
    c.land += ((rm ? 0 : t.land) - c.land) * k;
    c.fcap += ((rm ? 1 : t.fcap) - c.fcap) * k;
    c.fscl += ((rm ? 0 : (t.fscl ?? 0)) - c.fscl) * k;
    c.camZ += ((rm ? 9.2 : t.camZ) - c.camZ) * k;

    const g = group.current;
    // Visible for the whole chapter, not only while it is travelling IN. The
    // gate used to be `plate > 0.004`, which kept the plate out of the world
    // for the entire retreat — and the retreat is exactly the beat where the
    // viewer is supposed to discover that there is a surface down there. `plate`
    // leaves zero on the first pixel of the chapter and `out` only reaches one
    // on the last, so this is true everywhere in between. At scrollY 16560 the
    // plate is far outside a level camera at camZ 11, so becoming visible there
    // is not something the viewer can see happen.
    if (!g || (c.plate <= 0 && c.out <= 0)) {
      if (g) g.visible = false;
      return;
    }
    g.visible = true;

    // 1. THE PLATE — travels in from the lower left, seats, and STAYS SEATED
    //    for the rest of the chapter including the reframe into the footer.
    //    `away` covers the entry, `outs` the exit; through the exit both are
    //    zero, so the group keeps exactly the position and rotation it held
    //    through the systems chapter.
    //
    //    LOCAL SPACE ONLY, and that is the point. This group is a CHILD of the
    //    assembly (Scene/Aperture.tsx) and writes NO world transform: no
    //    journey `x`, no yaw, no camera value. Its position is the fixed seat
    //    at PLATE.topY plus the entry/exit diagonals, and its rotation is the
    //    entry/exit roll alone. The composition's travel and its mirrored turn
    //    are applied ONCE to the parent, so the surface and the optical object
    //    resting on it are rigidly locked — they cannot drift, cannot clip
    //    through each other, and cannot be damped at different rates. Before
    //    this group was parented, it re-read the RAW sampled `x` while the
    //    instrument used a smoothed copy of the same value: on a 12.5 units/s
    //    reframe that is a 4.5/s damping lag, i.e. up to ~2.8 world units of
    //    permanent separation — 13% of the wafer's diameter. That was the drift.
    const away = 1 - clamp01(c.plate);
    const outs = clamp01(c.out);
    const hold = 1 - outs;
    g.position.set(
      IN_POS[0] * away * hold + OUT_POS[0] * outs,
      PLATE.topY + IN_POS[1] * away * hold + OUT_POS[1] * outs,
      IN_POS[2] * away * hold + OUT_POS[2] * outs
    );
    // No Y term: the turn belongs to the assembly. faceYaw() was 0 for the
    // entire wafer chapter anyway, so removing it changes no upstream frame.
    g.rotation.set(
      IN_ROT[0] * away * hold + OUT_ROT[0] * outs,
      0,
      IN_ROT[1] * away * hold + OUT_ROT[1] * outs
    );

    // 2. MATERIAL — graphite plate → silicon. Colour, roughness, metalness,
    //    clearcoat and a restrained iridescence all travel together.
    //
    //    SILICON, NOT A PLATTER. Metalness is the load-bearing number and it
    //    stops at 0.34. At 0.94 the substrate had almost no diffuse response and
    //    the lanes measured lum 6.7 — pure black voids between the dies, which
    //    is what made the array read as tiles dropped on a plate. At 0.56 it was
    //    better but still a metal: a mirror with a blue cast and a single hot
    //    specular, i.e. a turned platter. 0.34 keeps a diffuse term worth
    //    0.038 — the largest single contributor to how the face reads — while
    //    leaving the specular lobe as the thin oxide sheen it should be. The
    //    albedo is near-neutral with only a whisper of cool in it, because the
    //    disc was reading as navy plastic at 0.056/0.063/0.076.
    //
    //    envMapIntensity is the other half. It is 1.11 here against 0.50 before,
    //    because at that level a polished wafer face returns this deliberately
    //    dim studio environment and nothing else, and the whole surface
    //    collapses to a dark void with a bright rim round it. The environment is
    //    not brightened — the wafer is simply allowed to hear all of it.
    //
    //    The oxide is the clearcoat, not the base: clearcoat carries its own
    //    dielectric Fresnel and its own roughness, which is what gives a silicon
    //    wafer the sharp thin sheen on the chamfer and the rim that bare metal
    //    cannot produce. iridescence is the thin-film in that oxide —
    //    IOR 1.42 (SiO₂ is 1.46; the previous 1.9 was a chrome stand-in) over a
    //    deliberately narrow 300–470nm band, so it is a restrained violet-green
    //    drift across the face rather than a rainbow. The lime in it is the
    //    studio environment's, not a light.
    const w = c.wafer;
    if (plateMat.current) {
      const m = plateMat.current;
      m.color.setRGB(0.028 + w * 0.027, 0.031 + w * 0.026, 0.036 + w * 0.024);
      m.roughness = 0.46 - w * 0.16;
      m.metalness = 0.3 + w * 0.04;
      m.clearcoat = w * 0.5;
      m.iridescence = w * 0.26;
      m.envMapIntensity = 0.16 + w * 0.95;
    }
    if (plateU.current) {
      plateU.current.uBand.value = Math.min(1.1, w * 1.18) * PLATE.r;
      plateU.current.uBandAmt.value = Math.sin(Math.min(1, w) * Math.PI) * 0.9;
      // The lanes stay mirror-polished until the conversion band has actually
      // reached the field, so the graphite→silicon beat is unchanged: a dark
      // plate, then silicon, then the pattern's own matte cuts into it.
      plateU.current.uLane.value = Math.max(0, Math.min(1, (w - 0.55) / 0.35));
    }

    // 3. SCRIBE MARKS — the first thing the material change leaves behind.
    if (scribeMat.current) scribeMat.current.opacity = w * 0.72;

    // 4. DIE ARRAY — one merged mesh. The reveal is a wavefront: `sweep` is the
    //    normalised radius it has reached, `units` how far the field has come
    //    up. One die, then a cluster, then the array, from two numbers.
    if (dieGroup.current) {
      dieGroup.current.position.y = -(1 - Math.min(1, w * 1.5)) * 0.05;
      dieGroup.current.visible = w > 0.12;
    }
// The array's own material is now the SUBSTRATE's material. That is the whole
    // integration: at 0.86 metalness / 0.30 roughness the array was a mirror that
    // flared at grazing angles, so the outer two rows caught the studio
    // environment and read as loose bright tiles round the rim; at 0.34 / 0.46
    // the array was a dielectric that out-lit the plate by 1.6x in linear light,
    // which is the "blocks on a plate" failure wearing a different hat. The array
    // now carries the plate's metalness, so the only difference left is roughness
    // - held at 0.40, a satin that returns a broad slice of the environment
    // rather than the single specular a 0.17 mirror gives. Too low and the sites
    // go black, because a polished face aimed at this deliberately dim studio
    // returns nothing but the one band it happens to hit. The lattice is drawn by
    // the frosted lanes underneath, not by a value step between a site and the
    // silicon it was cut from.
    if (dieMat.current) dieMat.current.envMapIntensity = 0.16 + w * 0.95;
    const arr = dieField.lit.array as Float32Array;
    const radii = dieField.radii;
    const lvl = c.units;
    const width = 0.1 + 0.06 * (1 - lvl);
    const sw = c.sweep;
    // ONE-SIDED WAVEFRONT. The front FILLS behind it: once the wavefront has
    // passed a die it is fully lit and only the leading edge is soft. The old
    // form was a two-sided gaussian ring centred on `sweep`, which froze at
    // sweep 1 with the middle of the finished wafer at exp(−100) ≈ 0 and the
    // outer rows at full — measured at lum 53 in the centre against 131 at the
    // rim, i.e. a bright ring of loose tiles round a black hole, which is the
    // single biggest reason the array never read as one patterned substrate.
    // A filled front is also the honest reveal: a wavefront sweeping across an
    // already-present field, never a dissolve.
    for (let i = 0; i < arr.length; i++) {
      const dd = (radii[i] - sw) / width;
      arr[i] = dd <= 0 ? lvl : lvl * Math.exp(-dd * dd);
    }
    dieField.lit.needsUpdate = true;

    // 5. LANDING — a contact shadow, plus one faint ring of the instrument's
    //    own accent caught in the surface. Both are physical consequences of an
    //    object resting on silicon: no burst, no shockwave, no particles.
    //    The shadow pool is scaled with the object, not left at the chapter's
    //    own size: at footer scale the lens is 4.78 units across and a 3.3-unit
    //    pool would sit entirely underneath it, i.e. the one cue that says
    //    "this thing is touching this thing" would disappear at exactly the
    //    moment the object is most visible.
    //
// The pool is drawn at the disc's own centre, which is where the instrument
    // sits: its contact shadow has to be under the thing casting it, and both
    // are at local (0, 0, 0) of the assembly by construction.
    const touch = clamp01((c.land - 0.5) / 0.5) * hold;
    if (shadowMat.current) shadowMat.current.opacity = 0.72 * touch;
    if (sheenMat.current) sheenMat.current.opacity = 0.34 * touch;
    if (seat.current) seat.current.scale.setScalar(1 + c.fscl / 0.58);

    // 6. THE SYSTEM — four regions and the three etched paths between them, in
    //    strict sequence from ONE fractional index: region i lights as `sys`
    //    passes i, and the trace to the next region draws in the gap after it.
    //
    //    `quiet` is the footer's gate, and it is the SAME value that resolves the
    //    contact copy: the technical layer is the wafer chapter's subject, not
    //    the closing frame's. It dissolves on the last beat so the final image is
    //    a wafer and a contact block — no data visualisation, no second idea.
    //    The die array, the scribe marks, the chamfer and the object seated on
    //    it all stay: the wafer itself is the closing image, only its
    //    annotation is not. Zero for the entire document above the footer, so
    //    every upstream frame is untouched.
    const quiet = 1 - c.fcap;
    for (let i = 0; i < WAFER_SYSTEM.length; i++) {
      const reg = clamp01(c.sys - i) * hold;
      const m = ringMats.current[i];
      if (m) m.opacity = reg * 0.6 * quiet;
      const lm = labelMats.current[i];
      if (lm) lm.opacity = clamp01((reg - 0.45) / 0.55) * 0.9 * quiet;
    }
    for (let i = 0; i < traces.length; i++) {
      const tr = clamp01(c.sys - (i + 0.45));
      traces[i].geo.setDrawRange(0, Math.floor((traces[i].total * tr) / 5) * 5);
      const m = traceMats.current[i];
      if (m) m.opacity = Math.min(1, tr * 3) * 0.36 * hold * quiet;
      // The arrowhead stays once its path has landed: without it the finished
      // system reads as a closed ring rather than a chain, and the direction
      // APPLICATION → COMPUTE → DATA → INFRASTRUCTURE is the whole point.
      const h = heads.current[i];
      if (h) h.visible = tr > 0.8 && hold > 0.96 && quiet > 0.02;
      const hm = headMats.current[i];
      if (hm) hm.opacity = clamp01((tr - 0.8) / 0.2) * 0.55 * hold * quiet;
    }

    // 7. LIGHT — none of its own. The wafer rides the studio rig the instrument
    //    already uses. Two zero-intensity directionals would still change
    //    NUM_DIR_LIGHTS, which recompiles every material in the scene and puts
    //    a few percent of pixel noise into chapters that must stay untouched.
  });

  return (
    <group
      ref={group}
      position={[IN_POS[0], PLATE.topY + IN_POS[1], IN_POS[2]]}
        visible={false}
      >
        {/* THE BODY — chamfered disc, real thickness, real edge. */}
        <mesh>
          <primitive object={disc} attach="geometry" />
          <meshPhysicalMaterial
            ref={plateMat}
            color="#121317"
            roughness={0.34}
            metalness={0.52}
            roughnessMap={roughTex}
            clearcoat={0}
            clearcoatRoughness={0.12}
            clearcoatRoughnessMap={roughTex}
            iridescence={0}
            iridescenceIOR={1.42}
            iridescenceThicknessRange={[300, 470]}
            envMapIntensity={1}
          />
        </mesh>

        {/* SCRIBE MARKS — orientation flats, rim band, ticks, notch. */}
        <mesh position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[PLATE.r * 0.99, 96]} />
          <meshBasicMaterial ref={scribeMat} map={scribeTex} transparent opacity={0} depthWrite={false} />
        </mesh>

        {/* DIE ARRAY — one mesh, ~177 sites, per-site aLit and aFin. The material is
            the substrate's own metalness, and the roughness is set so a site
            face returns the SAME energy as the bare silicon in the
            edge-exclusion annulus beyond the field — the plate's nominal 0.46
            times the mean of its roughness map, i.e. ~0.28. At 0.40 the faces
            measured lum 62 against the annulus's 51, and a lighter disc of sites
            sitting on a darker base is exactly the "plate with tiles on it"
            read. The lattice is drawn by the frosted lanes underneath. */}
        <group ref={dieGroup} position={[0, -0.08, 0]}>
          <mesh>
            <primitive object={dieField.geo} attach="geometry" />
            <meshStandardMaterial
              ref={dieMat}
              vertexColors
              color="#ffffff"
              metalness={0.34}
              roughness={0.28}
            />
          </mesh>
        </group>

        {/* REGIONS — one etched outline per system layer. Tone-mapped like the
            rest of the scene so a lime hairline on silicon reads as an etched
            path rather than as a light source floating over it. */}
        {WAFER_SYSTEM.map((r, i) => {
          const [x, z] = polar(r.a, r.r);
          return (
            <group key={r.id} position={[x, 0, z]}>
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.058, 0]}>
                <ringGeometry args={[r.ring - 0.06, r.ring, 96]} />
                <meshBasicMaterial
                  ref={(el) => { ringMats.current[i] = el; }}
                  color={ACCENT}
                  transparent
                  opacity={0}
                  depthWrite={false}
                  toneMapped={false}
                />
              </mesh>
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.078, 0]}>
                <planeGeometry args={[3.5, 1.05]} />
                <meshBasicMaterial
                  ref={(el) => { labelMats.current[i] = el; }}
                  map={labelTex[i]}
                  transparent
                  opacity={0}
                  depthWrite={false}
                  toneMapped={false}
                />
              </mesh>
            </group>
          );
        })}

        {/* TRACES — etched pathways across the surface, drawn in sequence. */}
        {traces.map((t, i) => (
          <group key={i}>
            <mesh>
              <primitive object={t.geo} attach="geometry" />
              <meshBasicMaterial
                ref={(el) => { traceMats.current[i] = el; }}
                color={ACCENT}
                transparent
                opacity={0}
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>
            <mesh ref={(el) => { heads.current[i] = el; }} geometry={t.headGeo} visible={false}>
              <meshBasicMaterial
                ref={(el) => { headMats.current[i] = el; }}
                color={ACCENT}
                transparent
                opacity={0}
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>
          </group>
        ))}

        {/* CONTACT — the instrument really is on this surface. Both meshes are
            scaled as one with the object above them, so the pool stays a pool
            around it rather than vanishing under it at footer size. The 3.6
            plane is 19% wider than the object at footer scale (3.6 × 1.655 vs
            a 4.78-unit barrel), which is where a contact shadow belongs: at
            3.3 it was barely wider than the barrel and every part of it with
            any value on it was hidden underneath it. */}
        <group ref={seat}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.094, 0]}>
            <planeGeometry args={[3.6, 3.6]} />
            <meshBasicMaterial ref={shadowMat} map={shadowTex} transparent opacity={0} depthWrite={false} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.09, 0]}>
            <ringGeometry
              args={[INSTRUMENT.s * INSTRUMENT.outerRadius - 0.03, INSTRUMENT.s * INSTRUMENT.outerRadius + 0.02, 96]}
            />
            <meshBasicMaterial
              ref={sheenMat}
              color={ACCENT}
              transparent
              opacity={0}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        </group>
      </group>
  );
}
