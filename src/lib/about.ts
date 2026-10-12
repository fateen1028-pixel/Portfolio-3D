// THE ABOUT CHAPTER — "WHO AM I?" — and its nine states.
//
// This file is the chapter's ONLY clock. lib/scroll.ts measures `t` across the
// pinned range of the section; lib/journey.ts reads the curves below to place
// the optical object; lib/choreography.ts reads the same curves to write the
// type. One input, one set of beats, and the machine and the words can never
// disagree about which moment of the chapter this is.
//
//   t        0..1 across the PINNED part of the chapter (measured, never dialled)
//   onStage  how completely the chapter owns the machine AND the camera right
//            now: 0 in the hero, 1 from the moment the machine is seated in
//            the dot until the orbit chapter's own travel takes it back. Both
//            the object's transform and the camera's coupling ride this ONE
//            number, which is why they can never disagree — and why the
//            camera is provably still while the alignment is being read.
//   dotX/Y/R where the "?" glyph's punctuation dot is on screen, and the
//            radius of the smallest circle that swallows it whole
//   dotWX/WY the world point under that pixel, on the machine's own plane
//   dotS     the world scale at which the machine covers that dot
//
// Nothing here is a percentage of a guessed position. The dot is a font
// artefact at an unknown place in an unknown face at an unknown viewport size,
// so it is rasterised once in the site's own display face and re-measured
// every frame the chapter is on screen — the chapter scales the question down
// to its marker, and the machine has to stay welded to it through that.

export const aboutState = {
  t: 0, // 0..1 across the pinned chapter; 0 everywhere else on the page
  p0: 0, // the progress the chapter holds — where the journey resumes below it
  calm: 0, // how completely the chapter owns the CAMERA right now: 0 in the
  // hero, 1 from the moment the observer re-centres until the orbit chapter's
  // own travel has finished reclaiming it. Read by Scene/Aperture.tsx.
  dotX: 0, // viewport px: the centre of the "?" glyph's punctuation dot
  dotY: 0,
  dotR: 0, // the radius of the circle that covers that dot's ink
  dotWX: 0, // world x/y the instrument must occupy to land on that pixel
  dotWY: 0,
  dotS: 0, // the world scale at which it covers that dot
};

/* ────────────────────────────────────────────────────────────────────────
   THE NINE STATES, as fractions of the pinned chapter.

   THE MACHINE BECOMES THE QUESTION. It does not get put ON one.

     1 OBJECT_TO_DOT       0.00 – 0.20   shrink AND travel, OVERLAPPING —
                                         one continuous movement, not two
                                         beats with a pause between them
     2 DOT_SETTLED         0.20 – 0.26   it has arrived. A fifth of a
                                         viewport, not a held silence.
     3 QUESTION_MARK_REVEAL0.26 – 0.35   the hook wipes up out of the dot
     4 WHO_AM_I_REVEAL     0.35 – 0.43   the words arrive around it
     5 QUESTION_HOLD       0.43 – 0.53   nothing moves. it IS the dot.
     6 QUESTION_EXIT       0.53 – 0.62   question AND machine both go to
                                         ZERO. No ghost left behind, and no
                                         machine parked over the answer.
     7 ANSWER_REVEAL       0.62 – 0.76   the answer resolves, alone
     8 ANSWER_HOLD         0.76 – 1.00   still. readable. ~0.72 viewport of
                                         pinned scroll with nothing else on
                                         the page, plus the stage's own
                                         one-viewport release below it.
     9 (no ABOUT_EXIT)               —   the sticky stage's release IS the
                                         exit; see the note under aboutAnswer

   WHAT CHANGED, AND WHY (the previous pass). Three things were wrong and all
   three were the same mistake — beats that were too long, in the wrong place.

   · The machine used to shrink (0.02–0.16), travel (0.18–0.32) and then sit
     ALONE at the dot for 0.16 of the chapter — about 430px of scroll in which
     the entire page was a 46px object on black. That is a dead frame, and it
     read as a bug rather than as restraint. Shrink and travel now OVERLAP
     (0.00–0.12 and 0.05–0.20), so the machine is one continuous movement of
     0.20 of the chapter, and the only stillness at the dot is the 0.06 it
     takes to arrive.

   · The question receded to 34% opacity rather than to nothing, so a giant
     grey "WHO AM I?" hung over the answer for the whole of it — two
     competing compositions at once. It now goes to ZERO and finishes at 0.62,
     and the answer does not begin until 0.62. They never overlap. The
     machine leaves on the SAME band (`aboutVanish`), which is the clean of
     the two options: the object that was the punctuation goes out with the
     punctuation and never becomes a second hero over the copy.

   · The answer's own hold was 0.05 of the chapter — roughly 135px of scroll
     to read four lines of type. It is 0.24 now.

   · The answer's TYPE was also too small (see the block comment in
     Sections.tsx): ~52px / ~58px for the statement at 1440 / 1728, barely a
     quarter the height of the question it was answering. It is ~63px / ~70px
     now, and the supporting sentence moves with it.

   Shrinking before travelling is still load-bearing, for a different reason
   than it was: the machine arrives in the hero's composition as a 600px
   lens on the right of the frame, and a machine that is still large while it
   crosses the frame lands on nothing legible and reads as debris. By the
   time it has travelled half its path it is already punctuation-sized, and
   the words have not been written yet, so there is nothing to collide with.

   Every curve below is C1-continuous and clamped, so the chapter can be
   scrubbed in either direction and lands on the identical frame.
   ──────────────────────────────────────────────────────────────────────── */

function smootherstep(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c * c * c * (c * (c * 6 - 15) + 10);
}

const band = (t: number, a: number, b: number) => smootherstep((t - a) / (b - a));

// THE MACHINE'S SIZE. Overlaps the travel rather than preceding it, so the
// machine is never a large object crossing the frame and never a small object
// sitting still — it is one gesture from hero-sized to punctuation-sized.
export const aboutPunct = (t: number) => band(t, 0, 0.12);

// THE MACHINE'S POSITION — and only its position. The travel is one clean
// path from the hero's own x onto the dot's own pixel; there is no second
// leg, no drift through the middle of the frame and no pass over the answer.
// It is SATURATED at 0.20, the frame it arrives on, and from there to the end
// of the chapter `x` and `y` are the dot, unchanged.
export const aboutTravel = (t: number) => band(t, 0.05, 0.2);

// THE CHAPTER'S CLAIM ON THE CAMERA, published for Scene/Aperture.tsx. It
// completes at 0.045 — before the travel starts at 0.05, and while the
// machine is still far too large to be anything but a lens — because the
// camera follows the machine at x·0.3 and aims at x·0.4, so a moving machine
// drags the camera and the pixel it was solved against slides out from under
// it. Released first, the solve is exact before the travel even starts, and it
// is taken back on the hand-off below the chapter so the orbit receives the
// observer it has always had.
export const aboutCalm = (t: number) => band(t, 0, 0.045);

// THE HOOK. It resolves out of the machine it is standing on — the reveal's
// front travels UP from the dot, not down onto it, and there is no transform
// here at all: a transform would move the glyph's own dot, and the machine is
// welded to that dot pixel.
export const aboutMark = (t: number) => band(t, 0.26, 0.35);

// THE WORDS. Last, and separately, because they are a different claim: the
// punctuation is already an established fact before anything is asserted
// about what it is punctuating.
export const aboutWords = (t: number) => band(t, 0.35, 0.43);

// The question giving up the frame to its own answer — COMPLETELY. It reaches
// zero opacity at 0.62, which is the frame the answer starts on, so there is
// no interval in which both are on screen: the question scene is over before
// the answer scene begins, rather than the two being cross-faded on top of one
// another.
export const aboutRecede = (t: number) => band(t, 0.53, 0.62);

// The machine leaving WITH the question, on the same band. Multiplied into the
// scale the chapter hands the journey, so it does not drift, does not park
// beside the copy and is not reused as a decoration: it simply shrinks to
// nothing on the frame the question's last ink leaves, and the hand-off to the
// orbit grows it back as the orbit's own diagram fades up.
export const aboutVanish = (t: number) => band(t, 0.53, 0.62);

// The answer resolving, line by line, into a frame that is already empty.
export const aboutAnswer = (t: number) => band(t, 0.62, 0.76);

/* THERE IS NO ABOUT_EXIT TERM, and that is deliberate.

   The sticky stage of this section is exactly one viewport tall, so it always
   releases over exactly one viewport of scroll — that travel IS the chapter's
   exit, and it carries the answer out of frame with real movement on screen.
   A JS exit fade on top of it (the 0.94–1.00 term this pass deleted) reached
   zero one viewport BEFORE the stage began to move, so the last full viewport
   of the chapter was a black screen with nothing on it: precisely the dead
   transition the pass was asked to remove. The answer now holds at full
   strength to t = 1.00 and leaves by riding the stage out. */

// The chapter's own focus gate — one term, read by .about-stage and nothing
// else (see globals.css). It is clear well before the machine travels.
export const aboutFocus = (t: number) => band(t, 0, 0.05);

/* ────────────────────────────────────────────────────────────────────────
   THE MEASUREMENT — where the dot is, and how big the machine has to be.

   `r` is the dot's own visual RADIUS: half the width of its ink, which is what
   a punctuation mark is measured against and what DOT_COVER is tuned in units
   of. It is emphatically NOT the radius of the smallest circle that swallows
   the blob, which is what this used to measure and which is the entire bug.

   That earlier number was the half-DIAGONAL, and Archivo's "?" dot is a
   rounded SQUARE (its ink runs the full 0.197em width for a dozen rows), so
   diagonal-over-half-width is 1.37x — not a rounding difference but a whole
   different shape. Sized against that, the machine's outer barrel came out
   66px across on a dot that measures 39.8px on the display at 1440x900: 1.63x
   the dot, reaching 13px below the row the typographic dot actually ended on.
   That is the "question mark with a circular object parked underneath it" the
   chapter was failing on, and no amount of centring arithmetic could fix it —
   the object was simply the wrong size to be punctuation. It is centred on the
   dot to within 0.2px even now; it just needed to be a third smaller.

   `top` is the dot's own topmost INKED ROW, as a height above the baseline,
   and it is what the glyph clip deletes the punctuation at (see --q-top in
   globals.css). Cutting there rather than at centre-plus-diagonal is what
   keeps a clipped question mark from leaving a half-covered antialiased ghost
   of a dot behind the machine.

   How much wider than the dot it swallows the machine's SILHOUETTE has to be.
   The dot of a "?" is the lowest blob of ink in the glyph, and in this site's
   display face at weight 900 the numbers are: the dot is 0.197em across, and
   the underside of the hook above it is 0.0618em above the dot's own top — so
   a circle centred on the dot can be anything between 0.098em (touching the
   dot) and 0.153em (touching the hook) and still sit IN the dot without
   colliding with the letter it belongs to. That window is the whole reason a
   machine can be punctuation.

   1.22 takes 0.0986em to 0.120em: the dot covered with 22% to spare for the
   difference between a 200px canvas raster and the browser's own hinting at
   200px on screen, and about 6px of clean black left between the machine's
   rim and the hook above it at 1440x900 — less than half the air the typeface
   itself puts between its own hook and its own dot, so the seam reads as a
   question mark rather than as two marks. It is measured against the machine's
   OUTER HOUSING, not its bore — the old 3.2 was against the bore, which is
   2.49/1.5 = 1.66x narrower than the housing, so the machine arrived 66%
   oversized and swallowed the hook instead of standing in the dot.
   ──────────────────────────────────────────────────────────────────────── */
export const DOT_COVER = 1.22;

// The one face this measurement is ever taken in: the site's own display face,
// at the weight the chapter sets the question in. Never a substitute — if the
// face has not loaded, the fallback below is the same face's measured
// proportions, so a late webfont cannot silently move the dot.
const QUESTION_FONT = '900 200px "Archivo", system-ui, sans-serif';

// Rasterise the glyph once and read its dot out of the ink. Walk up from the
// last inked row while the rows stay inked and take that run — the dot is the
// lowest contiguous blob in a "?", and everything above the gap is the hook.
// Result is in em, so one measurement serves every viewport size and every
// scale the chapter puts the glyph through.
let metrics: { dx: number; dy: number; r: number; top: number } | null = null;

function scanQuestionDot(): { dx: number; dy: number; r: number; top: number } {
  // The fallback is the same face's measured proportions, half-WIDTH for r and
  // the topmost inked row for top — the two numbers DOT_COVER and --q-top are
  // read in, so a fallback that disagreed with the scan would put the machine
  // at a different size than the same machine on the next frame.
  const fallback = { dx: 0.3099, dy: 0.0941, r: 0.1971 / 2, top: 0.1853 };
  const S = 200;
  const cv = document.createElement("canvas");
  cv.width = S;
  cv.height = S;
  const g = cv.getContext("2d");
  if (!g) return fallback;
  g.font = QUESTION_FONT;
  g.textBaseline = "alphabetic";
  g.fillStyle = "#fff";
  const penX = (S - g.measureText("?").width) / 2;
  const penY = S - 6;
  g.fillText("?", penX, penY);

  const d = g.getImageData(0, 0, S, S).data;
  const left = new Int32Array(S).fill(-1);
  const right = new Int32Array(S).fill(-1);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      if (d[(y * S + x) * 4 + 3] > 48) {
        if (left[y] < 0) left[y] = x;
        right[y] = x;
      }
    }
  }
  let bot = -1;
  for (let y = S - 1; y >= 0 && bot < 0; y--) if (right[y] >= 0) bot = y;
  if (bot < 0) return fallback;
  let top = bot;
  while (top > 0 && right[top - 1] >= 0) top--;

  // A face whose hook runs into its dot has no gap to find; fall back to the
  // whole glyph's ink rather than reporting the hook's centre as the dot.
  let y0 = top;
  let y1 = bot;
  if (bot - top > S * 0.35) {
    y1 = 0;
    for (let y = 0; y < S; y++) if (right[y] >= 0) y1 = y;
    y0 = y1;
    for (let y = y1; y >= 0; y--) if (right[y] >= 0) { y0 = y; break; }
  }
  let x0 = S;
  let x1 = -1;
  for (let y = y0; y <= y1; y++) {
    if (left[y] < 0) continue;
    if (left[y] < x0) x0 = left[y];
    if (right[y] > x1) x1 = right[y];
  }

  // The dot's centre, its VISUAL radius and its topmost inked row.
  //
  // `r` is half the width of the ink, NOT the circumscribing radius. This face's
  // dot is a rounded square — it holds its full width across a dozen rows — so
  // the circle that swallows it is 1.37x the half-width, and DOT_COVER is
  // calibrated in half-widths. Measuring the circumscribing circle here (which
  // is what this used to do) oversizes the machine by that whole factor: 66px of
  // barrel on a 39.8px dot at 1440x900, which is the parked-ring failure this
  // replaced, not a rounding error.
  //
  // `top` is `y0` straight off the scan, i.e. the first row with any ink in it,
  // because that is the row the glyph clip has to cut at to delete the
  // punctuation without leaving the antialiased top of it showing through the
  // machine. Deriving it from the centre and a radius would cut a second circle
  // into the answer to a question that has already been measured.
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  return {
    dx: (cx - penX) / S,
    dy: (penY - cy) / S,
    r: (x1 - x0) / 2 / S,
    top: (penY - y0) / S,
  };
}

// Read the dot EVERY frame the chapter is on screen, not once: the chapter
// scales the question down to its own marker and the machine has to stay
// welded to it through that. A zero-size inline-block on the glyph's own
// baseline reports where that baseline actually landed, which is the only
// font-metric-free way to find it — every ascent table disagrees with layout
// by a few px and this cannot. `.about-q-mark` is an inline-block, so its
// border box IS the glyph's pen origin and nothing has to be guessed about
// where the browser put the glyph inside it.
//
// It also publishes `--q-top`: the dot's own TOP edge as a fraction of the
// mark's border box. That one number is what makes the machine the dot rather
// than a lid on it — globals.css clips the glyph's punctuation away with it
// and opens the reveal up out of it, so the hook can never show a second dot
// and the wipe has somewhere real to start from. It is `m.top`, measured
// straight off the ink rather than derived from the centre and a radius, so the
// cut lands on the first row of the dot's own antialiased top and nothing of it
// survives beside the machine. The whole ratio is read off the transformed
// layout, so it is correct at any scale the chapter puts the question through.
export function trackQuestionDot(): void {
  const mark = document.querySelector<HTMLElement>(".about-q-mark");
  const base = document.querySelector<HTMLElement>(".about-q-base");
  if (!mark || !base) return;
  if (!metrics) metrics = scanQuestionDot();
  const fs = parseFloat(getComputedStyle(mark).fontSize) || 0;
  if (!fs) return;
  const m = metrics;
  const box = mark.getBoundingClientRect();
  const s = box.width / (mark.offsetWidth || 1);
  const baseTop = base.getBoundingClientRect().top;
  const dy = m.dy * fs * s;
  aboutState.dotX = box.left + m.dx * fs * s;
  aboutState.dotY = baseTop - dy;
  aboutState.dotR = m.r * fs * s;
  // The cut, at the dot's own topmost inked row. `m.top` is already a height
  // above the baseline, so it needs no radius added to it — and adding one is
  // what used to push this cut ABOVE the hook's underside and take a couple of
  // px of the stem with it.
  const cut = (baseTop - m.top * fs * s - box.top) / (box.height || 1);
  mark.style.setProperty("--q-top", (cut < 0.01 ? 0.01 : cut > 0.97 ? 0.97 : cut).toFixed(4));
}
