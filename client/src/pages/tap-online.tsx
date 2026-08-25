import OnlineMatch, { type Dims, type Send } from "./mp/online-match";

// Cirql Tap — online score-duel. Both players get the same server-scheduled dots;
// each taps independently. Higher score after the timer wins.

const DOTR = 0.05, APPROACH = 0.26, TAU = Math.PI * 2;

function draw(ctx: CanvasRenderingContext2D, d: Dims, s: any, side: 0 | 1, _now: number) {
  const { cx, cy, R } = d;
  for (const dot of s.dots) {
    const x = cx + dot.x * R, y = cy + dot.y * R;
    const ar = (DOTR + dot.cl * APPROACH) * R;
    ctx.strokeStyle = `rgba(236,72,153,${0.2 + 0.55 * (1 - dot.cl)})`; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(x, y, ar, 0, TAU); ctx.stroke();
    ctx.fillStyle = "#ec4899"; ctx.shadowBlur = 12; ctx.shadowColor = "#ec4899";
    ctx.beginPath(); ctx.arc(x, y, DOTR * R, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;
  }
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(230,233,255,.45)"; ctx.font = `700 ${Math.round(R * 0.1)}px system-ui`;
  ctx.fillText(`${s.tl}s`, cx, cy - R * 0.8);
  ctx.fillStyle = "rgba(249,168,212,.8)"; ctx.font = `700 ${Math.round(R * 0.06)}px system-ui`;
  ctx.fillText(`×${s.c[side]}`, cx, cy - R * 0.66);
}

function onPointer(t: "down" | "move" | "up", p: { x: number; y: number }, d: Dims, _s: any, _side: 0 | 1, send: Send) {
  if (t !== "down") return;
  send({ tap: true, x: (p.x - d.cx) / d.R, y: (p.y - d.cy) / d.R });
}

export default function TapOnline() {
  return (
    <OnlineMatch
      game="tap"
      title="Cirql Tap · Online"
      accent="#ec4899" accent2="#38bdf8"
      bg="radial-gradient(120% 90% at 50% 8%, #26082a 0%, #05040f 60%, #030208 100%)"
      backHref="/play/tap"
      howto="Tap each dot as its ring closes in. Same dots for both of you — higher score after 40s wins."
      draw={draw}
      onPointer={onPointer}
      score={(s, side) => ({ you: s.s[side], them: s.s[side ^ 1] })}
    />
  );
}
