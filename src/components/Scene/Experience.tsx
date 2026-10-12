"use client";

import { Canvas } from "@react-three/fiber";
import { Aperture } from "./Aperture";
import { ShootingStars } from "./ShootingStars";

const CAMERA = { position: [0, 0, 9], fov: 42, near: 0.1, far: 60 } as const;

// Two persistent WebGL canvases, split by depth. The machine's canvas is
// fixed ABOVE the DOM content layer and transparent except for the
// instrument, so the aperture physically occludes whatever sits behind it:
// closed, it covers; open, the bore reveals the DOM through glass. Content
// is composed around (and inside) the machine, never beside it as
// decoration.
//
// The sky rides its own canvas UNDER the content layer (z-0, main is z-10).
// Sharing the machine's canvas would put the meteors above the typography
// and the housing, which reads as a bug, not depth.
export function Experience() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{ contain: "strict" }}
      >
        <Canvas
          dpr={[1, 1.75]}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          camera={CAMERA}
        >
          <ShootingStars />
        </Canvas>
      </div>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-30"
        style={{ contain: "strict" }}
      >
        <Canvas
          dpr={[1, 1.75]}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          camera={CAMERA}
        >
          <Aperture />
        </Canvas>
      </div>
    </>
  );
}