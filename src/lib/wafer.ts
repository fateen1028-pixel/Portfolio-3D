// ─────────────────────────────────────────────────────────────────────────────
// THE WAFER CHAPTER — shared constants.
//
// One object → one unit → many units → die array → silicon wafer → system.
// The chapter owns no timing: every phase scalar is carried by the existing
// journey keyframe list (lib/journey.ts) so the camera, the instrument and the
// wafer are all driven by ONE scroll timeline. This file only holds the
// numbers that must agree across three files: the plate's world placement, the
// instrument's fixed chapter scale, the contact height it settles at, and the
// four system regions it reveals (also stated as text for assistive tech).
//
// Geometry notes (why these values and not others):
//   • PLATE.topY is the plate's TOP surface in world units. The plate group is
//     parked at exactly this Y, so every child that "sits on the wafer" can be
//     placed at a small positive local Y.
//   • INSTRUMENT.s is held CONSTANT for the whole chapter (0.55). Nothing about
//     the instrument getting smaller is faked with scale: the camera travels
//     from camZ 11 to camZ 34, and perspective does the rest.
//   • INSTRUMENT.landY is where the instrument's root sits when it has come to
//     rest. Laid flat (tip = 1) the barrel's outer torus — the widest part —
//     sits at local z 0, and its tube radius is 0.14 × 0.55 = 0.077, so the
//     rim rests 0.077 above the root. Everything else on the instrument is
//     recessed BEHIND that rim (iris −0.52, core −0.75), so it ends up under
//     the opaque plate rather than intersecting it.
// ─────────────────────────────────────────────────────────────────────────────

export const PLATE = {
  r: 10.6,        // world radius — a 21.2-unit disc
  topY: -9.55,    // world Y of the top surface
  // Real thickness, and now a real GROUND EDGE. A wafer is not a lathed puck:
  // it is sawn from a boule with a large radius on the unpolished back face and
  // a small polished chamfer on the face the die field is cut into. Two distinct
  // edges at two distinct radii is what stops the disc reading as a turned metal
  // platter — at one uniform bevel the silhouette is a smooth CG lathe edge, and
  // the eye reads "object" where it should read "slice". The values are held thin
  // on purpose: at 0.44 the edge started to look like a platter's rim, and a
  // wafer is 775µm on 300mm. This is 0.36 on 21.2 — thick enough that the near
  // rim reads as an edge with two facets, thin enough to stay a slice.
  thickness: 0.36,
  bevel: 0.075,     // the polished front chamfer
  backBevel: 0.16,  // the as-ground back radius
  fieldR: 10.2,     // outer radius of the frosted lane field
} as const;

export const INSTRUMENT = {
  s: 0.55,
  outerRadius: 2.35,                // = APERTURE.outerRadius (Scene/Aperture.tsx)
  rim: 0.077,                       // 0.14 barrel tube × s
  landY: PLATE.topY + 0.08,         // the rim rests on the surface
} as const;

// THE INSTRUMENT SITS ON THE WAFER'S AXIS, so there is nothing to configure
// here and there never was.
//
// There was a footer's own seat offset — a forward/outboard nudge applied to
// both the instrument and its contact shadow — on the reading that a machine
// "placed" on a wafer must be off its centre. It was wrong: on a disc this
// large, read at 37 degrees, an offset reads as a mistake rather than as
// placement, and the inspection head's own contact shadow and accent ring form
// a target that the eye reads the die field's centre against. Centred is also
// what the wafer chapter has always done — the descent is choreographed onto
// the disc's exact centre — so removing it restores one position for the whole
// chapter instead of two.
//
// Centring needs no compensation for the instrument's pivot, and that is
// checked rather than assumed: every mesh inside Scene/Aperture.tsx's `root`
// group (outer barrel, mid ring, iris seat, both glass elements, the iris
// blades, the accent torus, the core) sits at x 0, y 0, differing only in its
// z depth along the optical axis. The origin IS the visible centre. With
// `tip 1` the root lays the axis flat, so the visible centre lands on the
// disc's own (0, PLATE.topY, 0) — the wafer's exact surface centre — and the
// rim continues to rest on y −9.5512 via the existing `+ fscl · 0.14` seam.

// THE OPTICAL COMPOSITION'S FACING — one expression, two callers.
//
// The instrument (Scene/Aperture.tsx) and the wafer it is seated on
// (Scene/Wafer.tsx) are siblings in the scene, not parent and child, so the only
// thing that welds them into a single composition is that they are driven from
// the SAME three journey terms. Aperture uses it for `root.rotation.y`; the
// wafer uses it for its own `rotation.y`, which is what lets the two arrive at
// the footer as one object that has turned as one object. Written once, here,
// because the numbers must agree across files and a copied literal is how they
// would stop agreeing.
//
// The base +0.13 rad (≈7.5°) is the resting yaw the face always carries; `face`
// unwinds it for the systems interlude; `yaw` is the per-chapter term. Through
// the entire wafer chapter all three are at their defaults, so the wafer's own
// rotation.y is 0 until the footer reframe — every upstream frame unchanged.
export const faceYaw = (tilt: number, face: number, yaw: number): number =>
  -tilt * 0.42 + 0.13 * (1 - face) + yaw;

// The four system regions, revealed one at a time. `a` is degrees measured
// from +Z (the camera side) rotating toward +X, so 0° is the near edge of the
// wafer and 180° the far edge. `r` is the region centre radius, `ring` its
// outline radius — they differ per region on purpose: four identical circles
// would read as decoration, four measured ones read as a die map.
//
// Every ring's INNER radius stays clear of 1.9 so none of them runs under the
// instrument parked at the centre, and every OUTER radius stays inside 9.4 so
// no region spills off the die field (which ends at 9.55).
export type WaferRegion = {
  id: string;
  name: string;
  tech: string;
  note: string;
  a: number;
  r: number;
  ring: number;
};

export const WAFER_SYSTEM: WaferRegion[] = [
  { id: "application", name: "APPLICATION", tech: "NEXT.JS · REACT · TYPESCRIPT", note: "What the person touches.", a: 55, r: 5.2, ring: 3.0 },
  { id: "compute", name: "COMPUTE", tech: "SPRING BOOT · FASTAPI", note: "Where the work actually happens.", a: 145, r: 5.6, ring: 3.3 },
  { id: "data", name: "DATA", tech: "POSTGRESQL", note: "What is kept, and for how long.", a: 235, r: 4.8, ring: 2.9 },
  { id: "infrastructure", name: "INFRASTRUCTURE", tech: "DOCKER", note: "Where it runs, and how it survives.", a: 325, r: 5.8, ring: 3.5 },
];

const D2R = Math.PI / 180;
export const polar = (deg: number, r: number): [number, number] => [
  Math.sin(deg * D2R) * r,
  Math.cos(deg * D2R) * r,
];
