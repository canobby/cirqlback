// CIRQL — Milestone F: your Home interior (enter & decorate).
//
// A cozy cottage stands on your CIRQLSPACE. Walk into it (quick fade) to enter a warm
// personal room you furnish with décor — a SEPARATE indoor set from your outdoor build.
// The interior is a sub-map (like the shops) at a dedicated index; the décor system is
// generalised so placing/rendering works "on ring 0 OR in the home", keyed to the home's
// own furniture list (engine `homeDecor`, persisted alongside the outdoor `decor`).

import type { Ring, Prop } from "./cirql-world";

export const HOME_INDEX = 500000;           // parentOf() = 0 (your CIRQLSPACE)
export const isHome = (index: number): boolean => index === HOME_INDEX;

/** The authored home interior — a warm walkable room with an exit door + a few cozy fixtures. */
export function homeInterior(): Ring {
  const radius = 200;
  const props: Prop[] = [
    // the way back out to your CIRQLSPACE (south)
    { t: "portal", x: 0, y: radius * 0.62, to: 0, sub: "up", label: "↩ leave home" },
    // wall sconces + a potted plant for warmth (fixed fixtures; you add the rest as décor)
    { t: "lantern", x: -radius * 0.55, y: -radius * 0.3, id: "home-l0", accent: "#ffc46b" },
    { t: "lantern", x: radius * 0.55, y: -radius * 0.3, id: "home-l1", accent: "#ffc46b" },
    { t: "flower", x: -radius * 0.62, y: radius * 0.14, accent: "#8fd0ff" },
    { t: "flower", x: radius * 0.62, y: radius * 0.14, accent: "#ff8fbf" },
  ];
  return {
    index: HOME_INDEX, name: "Your Home", sub: "make it yours", radius, explorable: true,
    palette: { sky: ["#241610", "#160f0a"], sea: "#14100b", land: "#3a2c1e", grass: "#4a3a26", sand: "#6b4e30", accent: "#ffc46b", mote: "#ffe9b0" },
    spawn: { x: 0, y: radius * 0.42 }, props, ambient: "firefly",
  };
}
