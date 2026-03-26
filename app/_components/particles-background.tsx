"use client";

import { useCallback } from "react";
import Particles from "react-tsparticles";
import type { Engine } from "tsparticles-engine";
import { loadSlim } from "tsparticles-slim";

export default function ParticlesBackground() {
  const init = useCallback(async (engine: Engine) => {
    await loadSlim(engine);
  }, []);

  return (
    <Particles
      id="tsparticles"
      init={init}
      className="pointer-events-none absolute inset-0 z-0"
      options={{
        background: { color: "#121826" },
        fpsLimit: 60,
        particles: {
          number: { value: 35, density: { enable: true, area: 800 } },
          color: { value: "#ffffff" },
          opacity: { value: 0.2 },
          size: { value: 2 },
          links: {
            enable: true,
            distance: 150,
            color: "#ffffff",
            opacity: 0.25,
            width: 1,
          },
          move: {
            enable: true,
            speed: 1,
            outModes: { default: "out" },
          },
        },
        detectRetina: true,
      }}
    />
  );
}
