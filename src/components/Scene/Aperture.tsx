import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { scrollState } from "@/lib/scroll";
import { sampleJourney } from "@/lib/journey";
import { aboutState, trackQuestionDot, DOT_COVER } from "@/lib/about";
import { Wafer } from "./Wafer";
import { faceYaw } from "@/lib/wafer";

// THE APERTURE — a precision optical instrument, not decoration.
export const APERTURE = {
  blades: 9,
  outerRadius: 2.35,
  metal: "#6e737b",
  bladeMetal: "#0e0f12",
  ceramic: "#141416",
  glass: "#cfd6dd",
  accent: "#c8ff2e",
} as const;

// The housing's alloy tone, at rest and in the footer's own satin finish. Both
// are hex-built Colors because Color.setRGB writes the WORKING colour space
// (linear): #707682 means 0.162 linear, not the 0.439 its byte value suggests.
// Only the footer's `fq` term ever moves between them.
const BARREL_REST = new THREE.Color("#707682");
const BARREL_FOOT = new THREE.Color("#99a1ae");
const MID_REST = new THREE.Color("#2d323c");
const MID_FOOT = new THREE.Color("#454c59");

// ---------------------------------------------------------------------------
// Curved iris blade shape — tapered petal with curved inner & outer edge.
// ---------------------------------------------------------------------------
function createBladePath(): THREE.Shape {
  const shape = new THREE.Shape();
  const outerR = 0.92;
  const innerR = 0.27;
  const arcSpan = (Math.PI * 2) / APERTURE.blades;
  const overlap = arcSpan * 0.95;
  const pivotAngle = -overlap * 0.5;
  const tipAngle = overlap * 0.5;

  const outerStartX = Math.cos(pivotAngle) * outerR;
  const outerStartY = Math.sin(pivotAngle) * outerR;
  shape.moveTo(outerStartX, outerStartY);
  shape.absarc(0, 0, outerR, pivotAngle, tipAngle, false);

  const innerTipX = Math.cos(tipAngle * 0.7) * innerR;
  const innerTipY = Math.sin(tipAngle * 0.7) * innerR;
  const controlX = Math.cos(tipAngle * 0.3) * (outerR * 0.45 + innerR * 0.55);
  const controlY = Math.sin(tipAngle * 0.3) * (outerR * 0.45 + innerR * 0.55);
  shape.quadraticCurveTo(controlX, controlY, innerTipX, innerTipY);

  shape.absarc(0, 0, innerR, tipAngle * 0.7, pivotAngle * 0.7, true);

  const returnControlX = Math.cos(pivotAngle * 0.3) * (outerR * 0.45 + innerR * 0.55);
  const returnControlY = Math.sin(pivotAngle * 0.3) * (outerR * 0.45 + innerR * 0.55);
  shape.quadraticCurveTo(returnControlX, returnControlY, outerStartX, outerStartY);

  return shape;
}

const BLADE_SHAPE = createBladePath();
const BLADE_EXTRUDE_SETTINGS: THREE.ExtrudeGeometryOptions = {
  depth: 0.018,
  bevelEnabled: true,
  bevelThickness: 0.004,
  bevelSize: 0.003,
  bevelSegments: 2,
};
const BLADE_GEO = new THREE.ExtrudeGeometry(BLADE_SHAPE, BLADE_EXTRUDE_SETTINGS);
BLADE_GEO.rotateX(-Math.PI / 2);

const projV = new THREE.Vector3();
const HALF_FOV_TAN = Math.tan(THREE.MathUtils.degToRad(21));

// ── THE ABOUT CHAPTER'S SOLVE ──────────────────────────────────────────────
// Put the machine on the "?" glyph's punctuation dot. That dot is a DOM pixel,
// so the question is never "set x to this" — it is "set x to wherever the live
// camera puts that pixel", i.e. the world point under it on the machine's own
// plane. That is why the solve intersects z = 0 and not the front element: the
// assembly sits at z 0, so a solve at any other depth would land the machine
// short by however much parallax the depth difference is worth.
//
// AND THE CAMERA IS STILL, WHICH IS WHAT MAKES THE SOLVE LAND. The camera
// follows the machine at x·0.3 and aims at x·0.4, so a machine that moves also
// drags the camera — and the pixel it was measured against moves under it at
// the same time. That loop has a screen gain of about 1.7, i.e. above 1, so a
// solve that answers "where would this machine land on that pixel" using the
// camera as it is now is answered for a camera that no longer exists, and the
// machine arrives a machine-width beside the dot. Measured on the page before
// this pass: 24px at 1440x900, on a dot 33px across. Releasing the camera's
// coupling for the duration of the chapter (see `follow` in the frame loop)
// removes the loop, and the solve becomes exact in one step — the fixed point
// and the answer are the same number.
//
// One extra term: dotS is the scale at which the machine's own housing swallows
// the glyph's dot whole. The canvas is painted ABOVE main, so the machine IS
// the mask — nothing in the DOM is clipped to make room for it. Measured
// against the housing's OUTER BARREL, not its bore: the bore is 1.5 units and
// the barrel is 2.49, and sizing the machine to cover the dot with the bore
// left 66% of the housing sticking out past it — a disc parked on top of the
// "?" instead of standing in its dot.
const MACHINE_DIAM = 2 * (APERTURE.outerRadius + 0.14); // the widest part, in units
const dotV = new THREE.Vector3();
const dotDir = new THREE.Vector3();

function solveAboutDot(camera: THREE.Camera): void {
  trackQuestionDot();
  const w = window.innerWidth;
  const h = window.innerHeight;
  if (w < 1 || h < 1) return;
  dotV
    .set((aboutState.dotX / w) * 2 - 1, -((aboutState.dotY / h) * 2 - 1), 0.5)
    .unproject(camera);
  dotDir.subVectors(dotV, camera.position);
  if (dotDir.z > -1e-4) return;
  const hit = -camera.position.z / dotDir.z;
  aboutState.dotWX = camera.position.x + dotDir.x * hit;
  aboutState.dotWY = camera.position.y + dotDir.y * hit;
  const pxPerUnit = h / (2 * Math.max(1, camera.position.z) * HALF_FOV_TAN);
  aboutState.dotS = (DOT_COVER * 2 * aboutState.dotR) / (MACHINE_DIAM * pxPerUnit);
  // Where the dot is, published like the existing --lens-* pair so the chapter
  // can be measured from outside instead of eyeballed. --ab-sil-r is the
  // machine's own silhouette radius at that scale, and it is the number that
  // decides whether there is exactly ONE dot on screen: it has to be at least
  // --abdot-r, and at most the gap to the underside of the hook above it.
  const root = document.documentElement.style;
  root.setProperty("--abdot-x", `${aboutState.dotX.toFixed(1)}px`);
  root.setProperty("--abdot-y", `${aboutState.dotY.toFixed(1)}px`);
  root.setProperty("--abdot-r", `${aboutState.dotR.toFixed(1)}px`);
  root.setProperty("--ab-sil-r", `${((MACHINE_DIAM / 2) * aboutState.dotS * pxPerUnit).toFixed(1)}px`);
}

const BLADE_COUNT = APERTURE.blades;
const PIVOT_RADIUS = 0.88;
const BASE_PIVOT_ANGLES = Array.from({ length: BLADE_COUNT }, (_, i) =>
  (i / BLADE_COUNT) * Math.PI * 2
);

// ── THE ARCHITECTURE INSIDE THE MACHINE ────────────────────────────────────
// Four station rings and four content planes at REAL world Z along the bore
// axis, CLIENT nearest the optical threshold, INFRASTRUCTURE deepest. These
// are genuine positions in the 3D scene, not four DOM labels at one depth:
// the camera flies −1.8 → −12.0 through them, so perspective alone shrinks
// and separates the layers, and passing a station puts the layer you just
// read 0.4 units BEHIND the lens.
//
// They are children of `interior` (a SIBLING of the scaled `root`), so they
// keep true world Z while the housing is scaled around them. The journey's
// `face` term unwinds the housing's resting 7.5° yaw to zero over the
// approach so the bore axis is parallel to the camera path — otherwise the
// camera would fly straight while the instrument is turned away and the deep
// planes would leave the bore entirely.
export const LAYER_DEPTHS = [-5.6, -9.0, -12.4, -15.8];
// Distance the camera parks in front of the active plane. Larger than the
// 3.4 layer spacing by 0.4, which is what puts the previous layer behind.
const LAYER_PARK = 3.8;
// THE PASSAGE. A wall radius, a mouth and a length — the bore is a real tube
// on the Z axis, and the camera flies down it. Two numbers make that work:
// the mouth sits BEHIND the machine's last optical element (z −0.9), so the
// camera crosses into the tube rather than seeing its rim; and the tube is
// only drawn below WALL_OPEN, the camera Z at which its mouth stops covering
// the frame. Above that the machine's own housing is the environment, so the
// wall can never pop into view as a disc hanging in black.
const BORE_R = 1.7;
const BORE_NEAR = -0.9;
const BORE_FAR = -20.4;
const BORE_LEN = BORE_NEAR - BORE_FAR;
const BORE_MID = (BORE_NEAR + BORE_FAR) / 2;
// WALL_OPEN = BORE_R / tan(halfFov) − |BORE_NEAR| = 1.7/0.384 − 0.9 ≈ 3.5:
// closer than this and the mouth's silhouette is outside the viewport.
const WALL_OPEN = 3.4;
// Station rings hang just inside the wall; ribs stand slightly prouder, so
// the passage reads as ribbed structure rather than a smooth pipe.
const RIB_R = 1.66;
const RIB_GAP = 1.7;
const LAYER_RADIUS = 1.6;
// Ribs at a uniform pitch, skipping any that would double up against a
// station ring. They are the depth proof between layers: they sweep past the
// lens, so "the camera moved deeper" is geometry, not a crossfade.
const RIBS = Array.from({ length: 12 }, (_, i) => -1.1 - i * RIB_GAP).filter((z) =>
  !LAYER_DEPTHS.some((d) => Math.abs(z - d) < 0.9)
);
// Content plate size in world units. Sized so the type reads as the subject
// at the 3.8-unit reading distance (≈67% of the frame width) while the plate
// still fits inside the passage: half-width 1.58 against a 1.7 wall.
const PLANE_W = 3.16;
const PLANE_H = 0.99;
// How far the complete beat lifts each plate, CLIENT → INFRASTRUCTURE.
// Only the nearest: see the frame loop.
// How far the complete beat lifts each plate, CLIENT → INFRASTRUCTURE.
// Only the nearest: see the frame loop.
const HOLD_LIFT = [0.95, 0, 0, 0];
// How far the complete beat lights each station RING. Depth-weighted for the
// same reason HOLD_LIFT is: at the complete beat the camera has withdrawn back
// to HOLD_CAM_Z, so all four stations are ahead of it and in frame, and they
// are the record of the journey — but the nearest must still dominate, or the
// frame becomes four competing circles instead of one system with depth.
const HOLD_RING = [1, 0.72, 0.55, 0.45];

// Layer content. Technologies are the ones actually present in this
// repository (src/config/site.ts project stacks + this site's own stack) —
// nothing invented.
const LAYERS = [
  {
    z: "Z −5.6",
    name: "CLIENT",
    tech: "REACT · NEXT.JS · TYPESCRIPT",
    note: "Renders the interface. Holds no business rules.",
  },
  {
    z: "Z −9.0",
    name: "SERVICES",
    tech: "SPRING BOOT · FASTAPI · WEBSOCKETS",
    note: "Auth, orchestration and transport. All the logic lives here.",
  },
  {
    z: "Z −12.4",
    name: "DATA",
    tech: "POSTGRESQL",
    note: "Durable state. The schema is the contract.",
  },
  {
    z: "Z −15.8",
    name: "INFRASTRUCTURE",
    tech: "DOCKER",
    note: "Where it runs, and how it survives failure.",
  },
] as const;

// Canvas is authored at 500 px per world unit on both axes, so one number
// (PLANE_W / PLANE_H) governs how large a layer reads at its park distance.
const TEX_W = 1150;
const TEX_H = 360;
const MONO = '"Menlo", "Consolas", "DejaVu Sans Mono", monospace';
// letterSpacing is a Chrome canvas extension. Typed as optional so the
// feature check stays a plain value test instead of an `in` narrowing.
type Ctx2D = CanvasRenderingContext2D & { letterSpacing?: string };

function drawTracked(g: Ctx2D, text: string, x: number, y: number, trackPx: number) {
  if (g.letterSpacing !== undefined) {
    g.letterSpacing = `${trackPx}px`;
    g.fillText(text, x, y);
    g.letterSpacing = "0px";
    return;
  }
  let cx = x;
  for (const ch of text) {
    g.fillText(ch, cx, y);
    cx += g.measureText(ch).width + trackPx;
  }
}

// One layer, one texture. Type is drawn here rather than in DOM so it can
// live at a real Z inside the bore and be occluded by the housing on the way
// out — four overlaid DOM labels could never do either. Every plate is the
// same size (it has to be: the perspective is the message), so the block is
// centred on the plate rather than hung off its left edge — otherwise a short
// name like CLIENT reads as a left-drifting fragment.
function makeLayerTexture(layer: (typeof LAYERS)[number]): THREE.CanvasTexture {
  const cv = document.createElement("canvas");
  cv.width = TEX_W;
  cv.height = TEX_H;
  const g = cv.getContext("2d") as Ctx2D;
  g.textBaseline = "alphabetic";

  // A long name is set smaller rather than allowed to run off the plate:
  // INFRASTRUCTURE at the full 88px is wider than the canvas, and a clipped
  // wordmark is worse than a slightly smaller one. Measured, not guessed —
  // the real face is resident (see the font load above).
  const PAD = 48;
  const NAME_PX = 88;
  g.font = `900 ${NAME_PX}px "Archivo", system-ui, sans-serif`;
  const nameSize = Math.min(
    NAME_PX,
    ((TEX_W - PAD * 2) / g.measureText(layer.name).width) * NAME_PX
  );

  g.font = `500 22px ${MONO}`;
  const techW = g.measureText(layer.tech).width + 6 * (layer.tech.length - 1);
  g.font = `900 ${nameSize}px "Archivo", system-ui, sans-serif`;
  const nameW = g.measureText(layer.name).width;
  g.font = `300 29px "Space Grotesk", system-ui, sans-serif`;
  const noteW = g.measureText(layer.note).width;
  const left = Math.round((TEX_W - Math.max(techW, nameW, noteW)) / 2);

  g.fillStyle = "#8b877f";
  g.font = `500 22px ${MONO}`;
  drawTracked(g, layer.z, left, 42, 4);

  g.fillStyle = "#f1eee6";
  g.font = `900 ${nameSize}px "Archivo", system-ui, sans-serif`;
  g.fillText(layer.name, left, 158);

  g.fillStyle = "rgba(244,241,234,0.16)";
  g.fillRect(left, 186, 132, 2);

  g.fillStyle = "#b3afa7";
  g.font = `500 24px ${MONO}`;
  drawTracked(g, layer.tech, left, 226, 6);

  g.fillStyle = "rgba(244,241,234,0.52)";
  g.font = `300 29px "Space Grotesk", system-ui, sans-serif`;
  g.fillText(layer.note, left, 282);

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

export function Aperture() {
  // THE FOOTER ASSEMBLY — the single parent of the instrument and the wafer it
  // is seated on. It exists so the two can never be positioned by two different
  // numbers: `x` and `ayaw` are written HERE and nowhere else, both children
  // hold constant local offsets, and the object therefore cannot slide off the
  // wafer or clip through it at any point in the move. Identity for the whole
  // document except the exit keys (both scalars are 0 until scrollY 27640).
  const assembly = useRef<THREE.Group>(null);
  const root = useRef<THREE.Group>(null);
  const outer = useRef<THREE.Mesh>(null);
  const outerMat = useRef<THREE.MeshStandardMaterial>(null);
  const midMat = useRef<THREE.MeshPhysicalMaterial>(null);
  const mid = useRef<THREE.Mesh>(null);
  const inner = useRef<THREE.Mesh>(null);
  const glass = useRef<THREE.Mesh>(null);
  const core = useRef<THREE.Mesh>(null);
  const irisGroup = useRef<THREE.Group>(null);
  const bladeRefs = useRef<THREE.Mesh[]>([]);
  const lamp = useRef<THREE.PointLight>(null);
  const interior = useRef<THREE.Group>(null);
  const boreMat = useRef<THREE.MeshStandardMaterial>(null);
  const glass2 = useRef<THREE.Mesh>(null);
  const head = useRef<THREE.PointLight>(null);
  const ringMats = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const accentMats = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const planeMats = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const signal = useRef<THREE.Group>(null);
  const signalMat = useRef<THREE.MeshBasicMaterial>(null);
  const signalGlow = useRef<THREE.PointLight>(null);
  const { pointer } = useThree();

  // Type is rasterised into the scene, so the real faces must be resident
  // before the textures are drawn — otherwise the first pass bakes in the
  // fallback and the layers stay wrong until the next reload.
  const [planeTex, setPlaneTex] = useState<THREE.CanvasTexture[]>([]);
  useEffect(() => {
    let live = true;
    const build = () => {
      if (live) setPlaneTex(LAYERS.map(makeLayerTexture));
    };
    if (typeof document === "undefined" || !document.fonts) {
      build();
      return;
    }
    Promise.all([
      document.fonts.load('900 100px "Archivo"'),
      document.fonts.load('300 29px "Space Grotesk"'),
    ])
      .catch(() => {})
      .then(build);
    return () => {
      live = false;
    };
  }, []);

  const cur = useRef({
    iris: 0.12, rot: 0, spread: 0, camZ: 9.2, glow: 0.4,
    scl: 1.1, x: 0, y: 0, focus: 0, spin: 0, spinAngle: 0, tilt: 0, camY: 0, yaw: 0,
    still: 0, look: -0.5, cap: 0, tunnel: 0, hold: 0, face: 0, reqZ: 0,
    // The wafer chapter. Every one of these is 0 until the chapter begins and
    // the look-at target (vx, vy, vz) reproduces the exact previous expression
    // while lookY is 0 — so every earlier chapter is pixel-identical.
    lookY: 0, tip: 0, dropY: 0, land: 0, plate: 0,
    wafer: 0, units: 0, sweep: 0, sys: 0, wcap: 0, fcap: 0, ayaw: 0, fscl: 0, fq: 0,
    vx: 0, vy: 0, vz: -0.5,
  });
  const frame = useRef(0);

  const bladeBaseAngles = useMemo(() => BASE_PIVOT_ANGLES, []);
  // One shared rib material: eleven ribs, one opacity write per frame.
  const ribMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#39414b",
        roughness: 0.7,
        metalness: 0.4,
        emissive: "#0a0d11",
        emissiveIntensity: 1,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    []
  );

  useFrame((state, delta) => {
    const d = Math.min(delta, 0.05);
    const k = 1 - Math.exp(-d * 4.5);
    frame.current++;

    // ONE solve, only while the chapter is PINNED on screen (0 < t < 1, which
    // is exactly the window its sticky stage fills the frame with). It reads the
    // DOM for where the "?"'s dot is this frame and publishes the world point
    // and scale that put the machine on it — before the journey is sampled, so
    // the sample and the hand-off both see the same numbers. Outside that
    // window the last solved value simply stands: past the chapter the DOM dot
    // is thousands of pixels off-screen, and a solve that kept chasing it would
    // drag the machine out of frame with it. Under reduced motion the window
    // never scrubs but the chapter still has a dot to be, so it runs whenever
    // that is the state being rendered.
    if (aboutState.t > 0 && aboutState.t < 1) solveAboutDot(state.camera);

    if (scrollState.reducedMotion) {
      // Under reduced motion the chapter never scrubs, so the machine is placed
      // on the dot directly for as long as the chapter is on screen — the same
      // statement, held. Everywhere else the hero frame stands.
      const onDot = aboutState.t > 0 && aboutState.t < 1 && aboutState.dotS > 0;
      Object.assign(cur.current, {
        iris: 0.5, rot: 0.2, spread: 0, camZ: 9.2, glow: 0.4,
        scl: onDot ? aboutState.dotS : 0.68,
        x: onDot ? aboutState.dotWX : 0,
        y: onDot ? aboutState.dotWY : 0,
        focus: 1, spin: 0, spinAngle: 0, tilt: 0, camY: 0, yaw: 0,
        look: -0.5, cap: 0, tunnel: 0, hold: 0, face: 0, reqZ: 4,
        lookY: 0, tip: 0, dropY: 0, land: 0, plate: 0,
        wafer: 0, units: 0, sweep: 0, sys: 0, wcap: 0, fcap: 1, ayaw: 0, fscl: 0, fq: 0,
      });
    } else {
      const t = sampleJourney(scrollState.progress);
      const c = cur.current;
      c.iris += (t.iris - c.iris) * k;
      c.rot += (t.rot - c.rot) * k;
      c.spread += (t.spread - c.spread) * k;
      c.camZ += (t.camZ - c.camZ) * k;
      c.glow += (t.glow - c.glow) * k;
      c.scl += (t.s - c.scl) * k;
      c.focus += (t.focus - c.focus) * k;
      c.tilt += ((t.tilt ?? 0) - c.tilt) * k;
      c.camY += ((t.camY ?? 0) - c.camY) * k;
      c.yaw += ((t.yaw ?? 0) - c.yaw) * k;
      c.still += ((t.still ?? 0) - c.still) * k;
      c.look += (t.lookZ - c.look) * k;
      c.cap += (t.cap - c.cap) * k;
      c.tunnel += (t.tunnel - c.tunnel) * k;
      c.hold += (t.hold - c.hold) * k;
      c.face += ((t.face ?? 0) - c.face) * k;
      c.lookY += (t.lookY - c.lookY) * k;
      c.tip += (t.tip - c.tip) * k;
      c.dropY += (t.dropY - c.dropY) * k;
      c.land += (t.land - c.land) * k;
      c.plate += (t.plate - c.plate) * k;
      c.wafer += (t.wafer - c.wafer) * k;
      c.units += (t.units - c.units) * k;
      c.sweep += (t.sweep - c.sweep) * k;
      c.sys += (t.sys - c.sys) * k;
      c.wcap += (t.wcap - c.wcap) * k;
    c.fcap += (t.fcap - c.fcap) * k;
      c.ayaw += (t.ayaw - c.ayaw) * k;
      c.fscl += ((t.fscl ?? 0) - c.fscl) * k;
      c.fq += ((t.fq ?? 0) - c.fq) * k;
      const prevX = c.x;
      c.x += (t.x - c.x) * k;
      c.y += (t.y - c.y) * k;
      const vx = d > 0 ? (c.x - prevX) / d : 0;
      c.spin += (Math.abs(vx) * 0.55 - c.spin) * k;
    }
    const c = cur.current;
    c.spinAngle += c.spin * d;
    const t = state.clock.elapsedTime;
    // Glyph stillness: the idle mechanism drift freezes while the object
    // serves as the "O" (still → 1), so the trick reads instantly calm.
    const idle = (scrollState.reducedMotion ? 0 : t * 0.03) * (1 - Math.min(1, Math.max(0, c.still)));

    if (assembly.current) {
      // THE ONE WRITER OF THE COMPOSITION'S TRANSFORM. `x` and `ayaw` are the
      // only two numbers that decide where the wafer-and-object pair sits and
      // which way it faces, and they are applied HERE — to the parent of both.
      // The instrument's own root and the wafer group below each hold a
      // constant local offset and nothing else, which is the whole guarantee:
      // there is no second number for the object and no second number for the
      // surface, so they cannot drift apart, cannot arrive at different times
      // and cannot be smoothed at different rates.
      assembly.current.position.x = c.x;

      // THE MIRROR (see journey.ts, last key): the hero instrument's net
      // rotation.y is +0.172 rad, so the assembly carries −0.172 — same
      // magnitude, opposite sign, on the composition's own Y axis. It is here
      // rather than on the instrument because the instrument lies FLAT: Euler y
      // on a flat child acts before the lay-down and would let the object drift
      // azimuthally against the disc as it turns. On the parent, both turn at
      // once and their relative transform stays exactly Rx(−π/2).
      assembly.current.rotation.y = c.ayaw;
    }

    if (root.current) {
      // The footer's size is ADDED to the chapter's own `s`, never multiplied by
      // it: `s` is 0.58 for the whole wafer chapter and 1.28 in the hero, so a
      // multiplier would silently restate the entire document and `fscl` has to
      // be a plain addition to stay an exact identity everywhere upstream.
      // 0.58 → 0.88 is what turns a speck into an inspection device sitting on
      // the surface: 4.14 units across on a 21.2-unit wafer, a fifth of its
      // diameter, against 13% in the chapter and 26% at the projects chapter's
      // own scale.
      root.current.scale.setScalar(c.scl + c.fscl);


      // ON THE WAFER'S AXIS. World x is the assembly's, so the local x offset is 0 —
      // including on every upstream chapter, whose `x` values land on the parent
      // unchanged — and so is the local z: the instrument's visible centre sits
      // on the disc's own (0, PLATE.topY, 0), because every mesh inside this
      // group is at x 0, y 0 and differs only in depth along the optical axis.
      // There is no pivot to compensate for; see lib/wafer.ts.
      root.current.position.x = 0;
      root.current.position.z = 0;
      // The wafer chapter's descent is ADDITIVE on y: dropY is 0 everywhere
      // upstream, so every earlier chapter sees exactly c.y as before. The
      // settle term is the only easing in the whole descent — 2cm of travel over
      // the last tenth of the fall, which is what makes contact read as a thing
      // arriving rather than a tween ending.
      //
      // `+ fscl · 0.14` is the seam. Laid flat, the widest part of the object is
      // its outer barrel — a torus of tube radius 0.14 — so its rim sits exactly
      // 0.14·scl BELOW the root. Scaling the root without lifting it by the same
      // 0.14 would drive that rim INTO the silicon in exact proportion to the
      // growth, so the two terms cancel and the rim rests on y −9.5512 whatever
      // the object measures. That is the whole guarantee, stated as arithmetic:
      // the object can grow in the footer and still not sink, float or slide,
      // because its height is a function of the same number as its size.
      root.current.position.y =
        c.y +
        c.dropY +
        c.fscl * 0.14 -
        (c.land > 0.8 && c.land < 1 ? Math.sin((1 - c.land) * Math.PI) * 0.022 : 0);

      root.current.rotation.x = c.tilt - c.tip * (Math.PI / 2);
      // +0.13 rad ≈ 7.5° at rest: the instrument faces slightly left at all
      // times, so its optical axis points toward the identity — physical
      // presence, not a flat front-facing disc. `yaw` (projects chapter only)
      // turns the face toward whichever side holds the framed subject, and
      // `face` (the systems interlude only) unwinds the 7.5° so the bore
      // axis becomes parallel to the camera's path into the machine.
      //
      // faceYaw() is shared with Scene/Wafer.tsx, which is SEATED on this
      // object for the wafer chapter and the footer. Numerically identical to
      // the expression it replaced — the two are siblings in the scene, not
      // parent and child, so this is the only thing that makes them arrive at
      // the footer having turned as one object.
      root.current.rotation.y = faceYaw(c.tilt, c.face, c.yaw);
    }
// THE FOOTER'S FINISH ON THE HOUSING, AND NOWHERE ELSE. Laid flat on a black
    // wafer at a fifth of its diameter, the housing's own material reads wrong at
    // both ends of its range: at metalness 0.88 / roughness 0.22 it is a
    // near-mirror that returns one hot specular arc and a black interior — a dot;
//    opened all the way up it becomes a white roll of tape, which is a louder
    // version of the same mistake. The footer's own finish is therefore a satin:
//    roughness up enough to spread the key into a continuous rim instead of one
    // hot spot, and the alloy tone up about a third, so the housing sits at
    // roughly twice the wafer's value rather than three times it.
    //
    // Both endpoints come from BARREL_REST/BARREL_FOOT, never setRGB literals:
    // Color.setRGB writes the WORKING colour space, i.e. linear, so #707682's
    // 0.439 would have been stored as 0.439 linear against the 0.162 linear the
    // hex actually means — a 2.7x over-bright housing on EVERY chapter, hero and
    // interior included, dressed up as a footer-only change.
    const fq = c.fq;
    if (outerMat.current) {
      outerMat.current.color.lerpColors(BARREL_REST, BARREL_FOOT, fq);
      outerMat.current.roughness = 0.22 + fq * 0.1;
      outerMat.current.metalness = 0.88 - fq * 0.12;
    }
    if (midMat.current) midMat.current.color.lerpColors(MID_REST, MID_FOOT, fq);
    if (outer.current) outer.current.rotation.z = c.rot * 0.5 + idle + c.spinAngle;
    if (mid.current) mid.current.rotation.z = -c.rot * 0.8 - idle * 1.5 - c.spinAngle * 1.4;
    if (inner.current) inner.current.rotation.z = c.rot * 1.3 + idle * 2 + c.spinAngle * 2;

    // Real aperture diaphragm mechanics.
    if (irisGroup.current) {
      const open = c.iris;
      irisGroup.current.rotation.z = c.rot * 0.35 + idle * 0.4 + c.spinAngle * 0.5;
      irisGroup.current.position.z = -0.52 - c.spread * 0.5;

      bladeRefs.current.forEach((blade, i) => {
        if (!blade) return;
        const baseAngle = bladeBaseAngles[i];
        blade.position.x = Math.cos(baseAngle) * PIVOT_RADIUS;
        blade.position.y = Math.sin(baseAngle) * PIVOT_RADIUS;
        blade.position.z = 0;
        blade.rotation.z = baseAngle + (1 - open) * 0.72;
      });
    }

    if (outer.current) outer.current.position.z = -c.spread * 1.4;
    if (mid.current) mid.current.position.z = -c.spread * 0.7;
    // The lens elements are polished discs facing the lens, so within a couple
    // of units their clearcoat highlight washes the whole frame to a flat grey
    // plate — exactly the frame where the crossing has to read as entry. Fade
    // each one out as the camera reaches it; both sit on the bore axis, so
    // camZ alone says when they are about to sweep past. 1 everywhere else, so
    // every other chapter sees exactly the same glass.
    const lensT = Math.min(1, Math.max(0, (c.camZ - 0.6) / 2.6));
    const lens2T = Math.min(1, Math.max(0, (c.camZ + 0.2) / 1.6));
    if (glass.current) {
      glass.current.position.z = 0.35 + c.spread * 1.0;
      (glass.current.material as THREE.MeshPhysicalMaterial).opacity =
        (0.06 + (1 - Math.min(1, Math.max(0, c.iris))) * 0.04) * lensT;
    }
    if (glass2.current) {
      (glass2.current.material as THREE.MeshPhysicalMaterial).opacity = 0.1 * lens2T;
    }
    if (inner.current) inner.current.position.z = 0.1 + c.spread * 0.4;

    if (core.current) {
      const openT = Math.min(1, Math.max(0, (c.iris - 0.8) / 0.15));
      const openS = openT * openT * (3 - 2 * openT);
      core.current.scale.setScalar(Math.max(0.001, 1.45 - c.iris * 1.45));
      (core.current.material as THREE.MeshPhysicalMaterial).opacity = 0.94 * (1 - openS);
      core.current.visible = openS < 1;
    }

    if (lamp.current) {
      lamp.current.intensity = 1.2 + c.glow * 2.5;
      lamp.current.position.x +=
        (pointer.x * 1.2 - lamp.current.position.x) * (1 - Math.exp(-d * 3));
      lamp.current.position.y +=
        (pointer.y * 0.8 - lamp.current.position.y) * (1 - Math.exp(-d * 3));
    }

    // Narrow viewports see ~40% less width, so every camera distance this page
    // uses has to come in a little. The wafer chapter is the only chapter whose
    // subject is a 21-unit disc rather than a 3-unit instrument, so it needs a
    // distance correction of its own — gated on how far the aim has dropped,
    // which is zero everywhere above this chapter.
const wide = scrollState.narrow ? Math.min(1, Math.max(0, (Math.abs(c.lookY) - 0.5) / 1.2)) : 0;
    state.camera.position.z += (c.camZ + wide * 7 - state.camera.position.z) * k;
    state.camera.position.y += (c.camY - state.camera.position.y) * k;
    // THE ABOUT CHAPTER HOLDS THE OBSERVER STILL. `aboutState.calm` is the
    // chapter's own claim on the camera — it completes at t 0.045, before the
    // machine's travel starts at 0.05 — and multiplying it into the camera's follow and
    // aim is what makes the alignment in solveAboutDot exact: both of those
    // are functions of the machine's own x, so leaving them live means the
    // machine keeps dragging the camera and the pixel it was solved against
    // slides out from under it. Released first, they are taken back on the
    // chapter's hand-off, so the orbit receives the observer it has always
    // had — and in the hero, where calm is 0, this is byte-for-byte the
    // expression it always was.
    const follow = 1 - aboutState.calm;
    state.camera.position.x +=
      ((c.x * 0.3 + (scrollState.reducedMotion ? 0 : pointer.x * 0.2)) * follow -
        state.camera.position.x) *
      (1 - Math.exp(-d * 2));

    // Inside the machine the gaze leads the camera into the tunnel
    // (lookZ keys); everywhere else this converges to the classic
    // look-ahead, so upstream chapters are pixel-identical.
    //
    // lookY is the ONE addition the wafer chapter needed: a plate lying flat 9.5
    // units below the instrument cannot be framed by camY alone, because camY
    // also moves the camera and the aim point is welded to it. The smoothed
    // target is only used while lookY is actually non-zero — every chapter
    // above this one takes the original expression verbatim, on the original
    // values, with no extra damping lag. c.v starts at exactly (0, 0, −0.5),
    // which is what this chapter's first keyframe asks for, so engaging the
    // smoothed path costs one frame and no jump.
    if (c.lookY === 0) {
      state.camera.lookAt(c.x * 0.4 * follow, c.camY * 0.15, c.look);
    } else {
      c.vx += (c.x * 0.4 - c.vx) * (1 - Math.exp(-d * 3));
      c.vy += (c.camY * 0.15 + c.lookY - c.vy) * (1 - Math.exp(-d * 3));
      c.vz += (c.look - c.vz) * (1 - Math.exp(-d * 3));
      state.camera.lookAt(c.vx, c.vy, c.vz);
    }

    const root_el = document.documentElement;
    root_el.style.setProperty("--focus", c.focus.toFixed(3));
    root_el.style.setProperty("--spread", c.spread.toFixed(3));
    root_el.style.setProperty("--syscap", c.cap.toFixed(3));
    root_el.style.setProperty("--tunnel", c.tunnel.toFixed(3));
    root_el.style.setProperty("--syshold", c.hold.toFixed(3));
    // This chapter's own caption gate. Separate from --syscap on purpose: the
    // wafer chapter is a different DOM chapter, and one chapter's label must
    // never be able to ghost over another's.
    root_el.style.setProperty("--wfcap", c.wcap.toFixed(3));
    // The footer block's own reveal gate, published from the same smoothed
    // value that carries the instrument across to the left — so the contact
    // copy resolves WHILE the machine is arriving, not after it.
    root_el.style.setProperty("--fcap", c.fcap.toFixed(3));
    // Normalized depth INSIDE the bore: 0 at the CLIENT park (camZ −1.8) →
    // 1 at the INFRASTRUCTURE park (camZ −12.0). Published so the chapter's
    // DOM (the sr-only layer list, the QA harness) reads the same single
    // depth number the geometry is driven from.
    root_el.style.setProperty(
      "--sysz",
      Math.min(1, Math.max(0, (LAYER_DEPTHS[0] + LAYER_PARK - c.camZ) / 10.2)).toFixed(4)
    );

    // ONE sharp plane at a time. Each layer peaks as the smoothed camera
    // parks LAYER_PARK in front of it, with a wide enough shoulder that the
    // two neighbours mid-move sit at ~0.3 (subdued, never competing) and
    // nothing outside its own depth has any presence at all. tunnel gates
    // the whole interior, so no layer can exist before the camera is inside
    // the bore. Same smoothed source drives geometry, DOM and CSS, so
    // reversing scroll reverses all of them exactly.
    //
    // A station RING is much cheaper than a plate here, so it does not follow
    // the same rule. `v` marks the station you are reading. The complete beat
    // lights every ring, weighted by depth (HOLD_RING), because that beat is
    // the CONSEQUENCE of the journey: at HOLD_CAM_Z all four stations are ahead
    // of the lens and in frame, and each ring is one you just read your way
    // down to. `dest` keeps the first station glowing faintly while the camera
    // is still outside the machine, so the approach has a subject at the far
    // end of the bore instead of a black hole. Plates follow `v` and nothing
    // else: four plates on one optical axis project to one point, and even a
    // ghost of the next wordmark reads as a smudge across the live one.
    root_el.style.setProperty("--syscam", c.camZ.toFixed(3));
    const tun = Math.min(1, Math.max(0, c.tunnel * 1.25));
    const clientPark = LAYER_DEPTHS[0] + LAYER_PARK;
    for (let i = 0; i < LAYER_DEPTHS.length; i++) {
      // Asymmetric shoulder: 1.6 units of approach, 0.7 of departure. On the
      // way IN the type grows over the last 1.6; on the way OUT it is gone
      // within 0.7 — which is what stops a layer you have already read (or
      // one the camera passes while withdrawing to the complete beat) from
      // ghosting back in as a second wordmark.
      const past = c.camZ < LAYER_DEPTHS[i] + LAYER_PARK;
      let v = 1 - Math.abs(c.camZ - (LAYER_DEPTHS[i] + LAYER_PARK)) / (past ? 0.7 : 1.6);
      v = Math.min(1, Math.max(0, v));
      v = v * v * (3 - 2 * v);
      const dest =
        i === 0
          ? Math.min(1, Math.max(0, (c.camZ - clientPark) / 1.5)) * 0.55
          : 0;
      const lit = Math.min(1, Math.max(v, c.hold * HOLD_RING[i], dest));
      const pv = Math.min(1, v + c.hold * HOLD_LIFT[i]) * tun;
      root_el.style.setProperty(`--sys${i}`, pv.toFixed(3));
      root_el.style.setProperty(`--sysr${i}`, lit.toFixed(3));
      const ring = ringMats.current[i];
      if (ring) ring.opacity = 0.32 * lit * tun;
      const acc = accentMats.current[i];
      if (acc) acc.opacity = lit * tun;
      const plane = planeMats.current[i];
      if (plane) {
        plane.opacity = pv;
        // Recede the inactive layers by VALUE, not just opacity: an
        // unlit layer is dark, so it reads as further down the tunnel even
        // where geometry alone cannot tell.
        const tone = 0.4 + 0.6 * pv;
        plane.color.setRGB(tone, tone, tone);
      }
    }

    // THE PASSAGE. Drawn only while its mouth still covers the frame
    // (WALL_OPEN): above that the machine's own housing is the environment and
    // a tube would read as a disc floating in black, below it the walls close
    // in around the lens from the frame edges — which is the crossing.
    const wallT = Math.min(1, Math.max(0, (WALL_OPEN - c.camZ) / 0.8));
    if (boreMat.current) boreMat.current.opacity = 0.94 * wallT;
    // The ribs step back for the complete beat: they are the depth proof
    // BETWEEN stations, and at that one moment the four station rings are the
    // subject — nine concentric circles at equal weight is noise, not depth.
    ribMat.opacity = 0.72 * wallT * (1 - 0.55 * c.hold);
    // The camera's own presence in a dark passage: a pool of light travelling
    // 2.8 units ahead, so the wall brightens and dims as the lens moves. It is
    // off everywhere except inside the bore, and it is kept well under the
    // housing's own key light — the passage must read darker than the machine.
    if (head.current) {
      head.current.position.set(0, 0.22, c.camZ - 2.8);
      head.current.intensity = 4 * wallT;
    }

    // REQUEST FLOW — one point of light and a short tail, riding the bore axis
    // below the reading position so it never sits on the type. Its Z LEADS the
    // camera by 4.2, which is 0.2 past the plane being read: it is always
    // arriving at the layer you are looking at, so the light can never disagree
    // with the type. Clamped to the first station while the camera is still
    // outside, so it reads as a light waiting down the bore, and parked at the
    // far end for the complete beat (depth alone would run it backwards). One
    // point, no particle field.
    const REQ_Y = -0.62;
    const reqTarget =
      c.hold > 0.4
        ? LAYER_DEPTHS[LAYER_DEPTHS.length - 1] - 0.8
        : Math.min(c.camZ - 4.2, LAYER_DEPTHS[0] + 0.6);
    c.reqZ += (reqTarget - c.reqZ) * (1 - Math.exp(-d * 5));
    if (signal.current) {
      signal.current.position.set(0, REQ_Y, c.reqZ);
      signal.current.visible = tun > 0.05;
    }
    if (signalMat.current) signalMat.current.opacity = tun;
    if (signalGlow.current) {
      signalGlow.current.intensity = 2.4 * tun;
      signalGlow.current.position.set(0, REQ_Y, c.reqZ);
    }
    if (interior.current) interior.current.visible = c.tunnel > 0.02;

    // --orbit: 0→1 as object travels to center core, holds at 1 through
    // the long pinned chapter, then fades back to 0 on release.
    // (Values ×0.651899 — the uniform factor applied to every upstream
    // anchor when the WAFER CHAPTER was appended at scrollY 16560. See
    // journey.ts.)
    const orbIn  = Math.min(1, Math.max(0, (scrollState.progress - 0.067443) / 0.028253));
    const orbOut = Math.min(1, Math.max(0, (scrollState.progress - 0.166329) / 0.013671));
    const orbitT = orbIn * (1 - orbOut);
    root_el.style.setProperty("--orbit", orbitT.toFixed(3));

    // Vignette: fades in only after the orbital chapter has settled and
    // released (0.360 × 0.651899 = 0.234684).
    const vigT = Math.min(1, Math.max(0, (scrollState.progress - 0.209620) / 0.027342));
    root_el.style.setProperty("--vig", (vigT * vigT * (3 - 2 * vigT)).toFixed(3));

    // +c.dropY so the shared optical axis stays welded to the instrument while
    // the wafer chapter has it lowered onto a plate. Zero everywhere upstream.
    projV.set(c.x, c.y + c.dropY, 0.35).project(state.camera);
    const sx = (projV.x * 0.5 + 0.5) * window.innerWidth;
    const sy = (-projV.y * 0.5 + 0.5) * window.innerHeight;
    const distZ = Math.max(1, state.camera.position.z - 0.35);
    const pxPerUnit = window.innerHeight / (2 * distZ * HALF_FOV_TAN);
    root_el.style.setProperty("--lens-x", `${sx.toFixed(1)}px`);
    root_el.style.setProperty("--lens-y", `${sy.toFixed(1)}px`);
    root_el.style.setProperty("--lens-r", `${(1.5 * c.scl * pxPerUnit).toFixed(1)}px`);

    // THE ABOUT CHAPTER'S OWN ALIGNMENT READOUT, on the machine's own plane.
    // --lens-* above is measured at z 0.35 — the front lens element, which is
    // the hero's focal window and must not be restated — while the About solve
    // intersects z 0, the plane the assembly actually sits in. Comparing the
    // dot against --lens-* therefore carries a depth bias of a few px that has
    // nothing to do with the alignment. This pair projects the machine at the
    // depth it lives at, so "the machine is exactly where the glyph's dot is"
    // is a number on screen rather than an opinion.
    if (aboutState.calm > 0) {
      projV.set(c.x, c.y, 0).project(state.camera);
      root_el.style.setProperty(
        "--ab-obj-x",
        `${((projV.x * 0.5 + 0.5) * window.innerWidth).toFixed(1)}px`
      );
      root_el.style.setProperty(
        "--ab-obj-y",
        `${((-projV.y * 0.5 + 0.5) * window.innerHeight).toFixed(1)}px`
      );
    }
  });

  return (
    <>
      <ambientLight intensity={0.40} />
      <directionalLight position={[6, 7, 7]} intensity={4.2} color="#ffffff" />
      <directionalLight position={[-6, 3, 5]} intensity={1.9} color="#9cb0c8" />
      <directionalLight position={[1.2, 4.0, 4.8]} intensity={2.4} color="#dce8f8" />
      <directionalLight position={[2, -6, 4]} intensity={0.8} color="#606876" />
      <pointLight ref={lamp} position={[0, 0, 2.2]} color={APERTURE.accent} distance={8} intensity={0.9} />

      {/* THE FOOTER ASSEMBLY — the single parent of the instrument and the
          wafer. Its transform is written once per frame above and nowhere
          else. The bore below and its lens light are deliberately OUTSIDE it:
          they are world-space architecture the camera flies through, not part of
          the wafer composition. */}
      <group ref={assembly}>
        <group ref={root}>
        {/* OUTER HOUSING: Machined satin-titanium barrel */}
        <mesh ref={outer}>
          <torusGeometry args={[APERTURE.outerRadius, 0.14, 32, 128]} />
          <meshStandardMaterial
            ref={outerMat}
            color="#707682"
            metalness={0.88}
            roughness={0.22}
          />
        </mesh>

        {/* INNER HOUSING RING */}
        <mesh ref={mid} position={[0, 0, 0]}>
          <torusGeometry args={[1.95, 0.1, 24, 96]} />
          <meshPhysicalMaterial
            ref={midMat}
            color="#2d323c"
            metalness={0.68}
            roughness={0.32}
            clearcoat={0.7}
            clearcoatRoughness={0.18}
          />
        </mesh>

        {/* IRIS SEATING RING: separates iris from front glass */}
        <mesh position={[0, 0, -0.28]}>
          <torusGeometry args={[0.96, 0.045, 16, 64]} />
          <meshStandardMaterial color="#1e2028" metalness={0.75} roughness={0.28} />
        </mesh>

        {/* FRONT GLASS: optical lens element. depthWrite off so the
            interlude's camera can fly THROUGH it — a transparent material
            still writes depth by default, which turned both lens elements
            into opaque plates the moment the lens filled the frame and
            blacked out the bore behind them. Blending is unchanged, so every
            other chapter sees exactly the same glass. */}
        <mesh ref={glass}>
          <circleGeometry args={[1.62, 64]} />
          <meshPhysicalMaterial
            color="#9fb0c2" metalness={0.12} roughness={0.03}
            transparent opacity={0.08} clearcoat={1.0} clearcoatRoughness={0.05}
            side={THREE.DoubleSide} depthWrite={false}
          />
        </mesh>

        {/* IRIS DIAPHRAGM: 9 curved petal blades with real pivot mechanics */}
        <group ref={irisGroup}>
          {bladeBaseAngles.map((baseAngle, i) => (
            <mesh
              key={i}
              ref={(el) => { bladeRefs.current[i] = el!; }}
              geometry={BLADE_GEO}
              position={[
                Math.cos(baseAngle) * PIVOT_RADIUS,
                Math.sin(baseAngle) * PIVOT_RADIUS,
                0,
              ]}
              rotation={[0, 0, baseAngle]}
            >
              <meshStandardMaterial
                color="#191c22" metalness={0.6} roughness={0.38}
                side={THREE.DoubleSide}
              />
            </mesh>
          ))}
        </group>

        {/* GREEN OPTICAL ACCENT */}
        <mesh ref={inner} position={[0, 0, -0.08]}>
          <torusGeometry args={[1.28, 0.013, 12, 96]} />
          <meshStandardMaterial
            color={APERTURE.accent} metalness={0.3} roughness={0.2}
            emissive={APERTURE.accent} emissiveIntensity={0.65}
          />
        </mesh>

        {/* SECONDARY GLASS: deeper optical element behind iris. Faded out
            as the camera reaches it (see the frame loop) so it cannot wash
            the crossing to a flat plate. */}
        <mesh ref={glass2} position={[0, 0, -0.5]}>
          <circleGeometry args={[0.88, 48]} />
          <meshPhysicalMaterial
            color="#8fa2b8" metalness={0.05} roughness={0.06}
            transparent opacity={0.1} clearcoat={1.0} clearcoatRoughness={0.06}
            side={THREE.DoubleSide} depthWrite={false}
          />
        </mesh>

        {/* DEEP OPTICAL CORE */}
        <mesh ref={core} position={[0, 0, -0.75]}>
          <circleGeometry args={[0.8, 64]} />
          <meshPhysicalMaterial
            color="#050608" roughness={0.12} metalness={0.1}
            clearcoat={1.0} clearcoatRoughness={0.06}
            transparent opacity={0.98}
          />
        </mesh>
        </group>

        {/* THE WAFER CHAPTER — a CHILD of the assembly now, not a sibling of the
            instrument. It writes no world transform at all: its position is the
            fixed seat (PLATE.topY) and its rotation is identity, so the surface
            and the object resting on it are carried by one parent transform and
            cannot be separated by a frame, a damped channel or a rounding
            difference. */}
        <Wafer />
      </group>

      {/* INTERIOR — the passage and the architecture inside it, at real
          depths. Same graphite as the housing, one restrained lime accent per
          station, and one content plane per layer carrying that layer's type.
          All opacities are driven per-frame above (never React state). Sibling
          of `root`, so these depths are true world units the camera actually
          flies through. */}
      <group ref={interior} visible={false}>
        {/* PASSAGE WALL — the bore, laid on the Z axis (a cylinder's own axis
            is Y, hence the rotation; without it the tube stands upright and
            reads as a vertical band, not a corridor). Open-ended and BackSide,
            so it is invisible from outside the machine and only encloses once
            the camera is inside it. Mouth at BORE_NEAR, behind the last lens
            element, so the camera crosses in rather than onto a visible rim.
            renderOrder −1 because transparent meshes are sorted by the
            DISTANCE OF THEIR CENTRE, and this mesh's centre (z −10.65) is
            nearer than the plates once the camera passes it — left to the
            default sort the wall was composited over the deep layers and
            veiled the whole INFRASTRUCTURE station. */}
        <mesh position={[0, 0, BORE_MID]} rotation={[Math.PI / 2, 0, 0]} renderOrder={-1}>
          <cylinderGeometry args={[BORE_R, BORE_R, BORE_LEN, 56, 1, true]} />
          <meshStandardMaterial
            ref={boreMat}
            color="#121619" roughness={0.95} metalness={0.2}
            emissive="#05070a" emissiveIntensity={1}
            side={THREE.BackSide} transparent opacity={0} depthWrite={false}
          />
        </mesh>
        {/* RIBS — the depth proof. They sweep past the lens between stations,
            which is what makes "the camera moved deeper" legible without a
            single word of explanation. */}
        {RIBS.map((z, i) => (
          <mesh key={i} position={[0, 0, z]}>
            <torusGeometry args={[RIB_R, 0.022, 8, 64]} />
            <primitive object={ribMat} attach="material" />
          </mesh>
        ))}
        {LAYER_DEPTHS.map((z, i) => (
          <group key={i} position={[0, 0, z]}>
            {/* Station ring */}
            <mesh>
              <torusGeometry args={[LAYER_RADIUS, 0.014, 12, 96]} />
              <meshStandardMaterial
                ref={(el) => { ringMats.current[i] = el; }}
                color="#4a5058" metalness={0.85} roughness={0.3}
                transparent opacity={0} depthWrite={false}
              />
            </mesh>
            {/* Active-layer accent — the only lime inside the machine.
                Tube is FATTER than the station ring's so it encloses it
                rather than hiding inside it. */}
            <mesh>
              <torusGeometry args={[LAYER_RADIUS, 0.022, 8, 96]} />
              <meshBasicMaterial
                ref={(el) => { accentMats.current[i] = el; }}
                color={APERTURE.accent} transparent opacity={0}
                depthWrite={false} toneMapped={false}
              />
            </mesh>
            {/* The layer itself: real type, at this depth, in the scene. */}
            {planeTex[i] && (
              <mesh>
                <planeGeometry args={[PLANE_W, PLANE_H]} />
                <meshBasicMaterial
                  ref={(el) => { planeMats.current[i] = el; }}
                  map={planeTex[i]}
                  transparent opacity={0}
                  depthWrite={false}
                  toneMapped={false}
                />
              </mesh>
            )}
          </group>
        ))}

        {/* REQUEST — one point of light and a short tail, on the bore axis
            below the reading position, leading the camera by 4.2 units
            (see the loop above). */}
        <group ref={signal} visible={false}>
          <mesh>
            <sphereGeometry args={[0.03, 12, 12]} />
            <meshBasicMaterial
              ref={signalMat}
              color={APERTURE.accent} transparent opacity={0}
              depthWrite={false} toneMapped={false}
            />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.7]}>
            <cylinderGeometry args={[0.005, 0.005, 1.4, 6]} />
            <meshBasicMaterial
              color={APERTURE.accent} transparent opacity={0.28}
              depthWrite={false} toneMapped={false}
            />
          </mesh>
          <pointLight ref={signalGlow} color={APERTURE.accent} distance={4.2} intensity={0} />
        </group>
      </group>

      {/* The lens inside the passage. Intensity is zero outside the bore. */}
      <pointLight ref={head} color="#cfe0f5" distance={9} intensity={0} />
    </>
  );
}
