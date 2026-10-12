"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { initSmoothScroll, refreshScroll } from "@/lib/scroll";
import { initChoreography } from "@/lib/choreography";
import {
  Hud,
  Hero,
  AboutSection,
  OrbitalSystem,
  ProjectsIntro,
  Projects,
  UnderTheSurface,
  WaferChapter,
  TechPlanes,
  Final,
} from "@/components/Sections";
import { HeroScan } from "@/components/HeroScan";

// WebGL must not touch SSR — single persistent canvas, client only.
const Experience = dynamic(
  () => import("@/components/Scene/Experience").then((m) => m.Experience),
  { ssr: false }
);

export default function Page() {
  useEffect(() => {
    const cleanupScroll = initSmoothScroll();
    const cleanupChoreo = initChoreography();
    // Layout shifts after init (lazy images, webfonts) change page height:
    // re-sync Lenis limits + trigger bounds so far scrolls land exactly.
    window.addEventListener("load", refreshScroll);
    document.fonts?.ready.then(() => refreshScroll()).catch(() => {});
    const ro = new ResizeObserver(() => refreshScroll());
    ro.observe(document.body);
    return () => {
      window.removeEventListener("load", refreshScroll);
      ro.disconnect();
      cleanupChoreo();
      cleanupScroll();
    };
  }, []);

  return (
    <>
      <a
        href="#work"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-[#c8ff2e] focus:px-4 focus:py-2 focus:text-black"
      >
        Skip to work
      </a>
      <Hud />
      <Experience />
      <HeroScan />
      <div aria-hidden className="vignette pointer-events-none fixed inset-0 z-40" />
      <TechPlanes />
      <main className="relative z-10">
        <Hero />
        <AboutSection />
        <OrbitalSystem />
        <ProjectsIntro />
        <Projects />
        <UnderTheSurface />
        <WaferChapter />
        <Final />
      </main>
    </>
  );
}
