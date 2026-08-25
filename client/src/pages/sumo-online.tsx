import OnlineMatch, { type Dims, type Send } from "./mp/online-match";

// Cirql Sumo — online 1v1. Server-authoritative; this renders the two disks and
// sends a thrust vector (drag from your disk toward where you point). The view is
// rotated 180° for player 1 so your disk always starts on the left.

const RD = 0.14;

function draw(ctx: CanvasRenderingContext2D, d: Dims, s: any, side: 0 | 1, _now: number) {
  const { cx, cy, R } = d;
  const flip = side === 1 ? -1 : 1;
  const px = (x: number) => cx + x * flip * R;
  const py = (y: number) => cy + y * flip * R;

  // ring
  ctx.strokeStyle = "rgba(251,191,36,.28)"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = "rgba(251,191,36,.10)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(cx, cy, R * 0.68, 0, Math.PI * 2); ctx.stroke();

  const disk = (i: 0 | 1, color: string) => {
    const x = px(s.p[i][0]), y = py(s.p[i][1]);
    ctx.fillStyle = color; ctx.shadowBlur = 18; ctx.shadowColor = color;
    ctx.beginPath(); ctx.arc(x, y, RD * R, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255,255,255,.85)";
    ctx.beginPath(); ctx.arc(x - RD * R * 0.28, y - RD * R * 0.28, RD * R * 0.22, 0, Math.PI * 2); ctx.fill();
  };
  disk((side ^ 1) as 0 | 1, "#fb7185"); // opponent
  disk(side, "#fbbf24");                 // you
}

function onPointer(t: "down" | "move" | "up", p: { x: number; y: number }, d: Dims, s: any, side: 0 | 1, send: Send) {
  if (t === "up") { send({ ax: 0, ay: 0 }); return; }
  if (!s) return;
  const flip = side === 1 ? -1 : 1;
  const wx = ((p.x - d.cx) / d.R) * flip, wy = ((p.y - d.cy) / d.R) * flip;
  const mx = s.p[side][0], my = s.p[side][1];
  const dx = wx - mx, dy = wy - my; const mag = Math.hypot(dx, dy);
  if (mag < 0.02) { send({ ax: 0, ay: 0 }); return; }
  const t2 = Math.min(1, mag / 0.45);
  send({ ax: (dx / mag) * t2, ay: (dy / mag) * t2 });
}

export default function SumoOnline() {
  return (
    <OnlineMatch
      game="sumo"
      title="Cirql Sumo · Online"
      accent="#fbbf24" accent2="#fb7185"
      bg="radial-gradient(120% 90% at 50% 8%, #241a06 0%, #05040f 60%, #030208 100%)"
      backHref="/play/sumo"
      howto="Drag from your disk to thrust; barge your rival's centre past the rim. First to 5 ring-outs wins."
      draw={draw}
      onPointer={onPointer}
      score={(s, side) => ({ you: s.s[side], them: s.s[side ^ 1] })}
    />
  );
}
