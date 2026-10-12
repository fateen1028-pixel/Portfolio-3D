"use client";

import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const COUNT = 4;
// Camera-local distance. The whole field rides the camera, so this stays the
// apparent distance no matter where the choreography parks camZ (-12 .. 34).
const DEPTH = 10;

function canvas(w: number, h: number, paint: (ctx: CanvasRenderingContext2D) => void) {
  const el = document.createElement("canvas");
  el.width = w;
  el.height = h;
  paint(el.getContext("2d")!);
  const tex = new THREE.CanvasTexture(el);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Tail: alpha 0 at the far end, 1 at the head (right edge), then masked
// vertically so the streak is a soft filament, not a hard rectangle.
const makeStreak = () =>
  canvas(256, 32, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 256, 0);
    g.addColorStop(0, "rgba(255,255,255,0)");
    g.addColorStop(0.5, "rgba(186,212,255,0.2)");
    g.addColorStop(0.86, "rgba(212,232,255,0.9)");
    g.addColorStop(1, "rgba(255,255,255,1)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 32);
    ctx.globalCompositeOperation = "destination-in";
    const v = ctx.createLinearGradient(0, 0, 0, 32);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(0.5, "rgba(0,0,0,1)");
    v.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, 256, 32);
  });

const makeHead = () =>
  canvas(64, 64, (ctx) => {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.25, "rgba(226,240,255,0.5)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  });

type Meteor = {
  group: THREE.Group;
  streak: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  head: THREE.Sprite;
  vel: THREE.Vector3;
  age: number;
  ttl: number;
  len: number;
  width: number;
  power: number;
};

// Meteors, not confetti: one population with randomised speed and entry
// angle, a trail proportional to speed, and a life that burns in and out.
export function ShootingStars() {
  const reduced = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  const respawn = (m: Meteor, first = false) => {
    const speed = 5 + Math.random() * 8;
    // Mostly steep entries, the occasional shallow one - a real shower is one
    // population seen at random angles, so the spread IS the realism.
    const drift = (Math.random() * 2 - 1) * (Math.random() < 0.75 ? 0.45 : 1.15);
    m.vel.set(drift, -Math.sqrt(Math.max(0.04, 1 - drift * drift)), 0).multiplyScalar(speed);
    m.group.position.set((Math.random() * 2 - 1) * 9, 0, -DEPTH);
    m.group.rotation.z = Math.atan2(m.vel.y, m.vel.x);
    m.age = 0;
    m.ttl = 1.3 + Math.random() * 2.1;
    m.len = speed * (0.1 + Math.random() * 0.07);
    m.width = 0.02 + Math.random() * 0.035;
    m.power = 0.35 + Math.random() * 0.45;
    if (first) {
      // Scatter the first pass so the page never opens on a synchronised burst.
      m.group.position.y = -6 + Math.random() * 10;
      m.age = Math.random() * m.ttl;
    } else {
      m.group.position.y = 4 + Math.random() * 3;
    }
    m.streak.material.opacity = 0;
    m.head.material.opacity = 0;
  };

  const sky = useMemo(() => {
    const streakMap = makeStreak();
    const headMap = makeHead();
    const geo = new THREE.PlaneGeometry(1, 1);
    const group = new THREE.Group();
    const meteors: Meteor[] = [];

    for (let i = 0; i < COUNT; i++) {
      const g = new THREE.Group();
      const streak = new THREE.Mesh(
        geo,
        new THREE.MeshBasicMaterial({
          map: streakMap,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          opacity: 0,
        })
      );
      const head = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: headMap,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          opacity: 0,
        })
      );
      g.add(streak, head);
      group.add(g);
      meteors.push({
        group: g,
        streak,
        head,
        vel: new THREE.Vector3(),
        age: 0,
        ttl: 1,
        len: 1,
        width: 1,
        power: 1,
      });
    }
    meteors.forEach((m) => respawn(m, true));
    return { group, meteors };
  }, []);

  useFrame(({ camera }, delta) => {
    if (reduced) return;
    const d = Math.min(delta, 0.05);
    sky.group.position.copy(camera.position);
    sky.group.quaternion.copy(camera.quaternion);
    for (const m of sky.meteors) {
      m.age += d;
      if (m.age >= m.ttl || m.group.position.y < -9) {
        respawn(m);
        continue;
      }
      m.group.position.addScaledVector(m.vel, d);
      const k = m.age / m.ttl;
      const a = m.power * Math.min(1, k / 0.15) * Math.min(1, (1 - k) / 0.4);
      m.streak.scale.set(m.len, m.width, 1);
      m.streak.position.set(-m.len / 2, 0, 0);
      m.streak.material.opacity = a;
      m.head.scale.setScalar(m.width * 3.5);
      m.head.material.opacity = a * 0.45;
    }
  });

  if (reduced) return null;
  return <primitive object={sky.group} />;
}