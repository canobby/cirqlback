import OnlineMatch, { type Dims, type Send } from "./mp/online-match";

// Cirql Reflex — online reaction duel. Server-authoritative flare timing; the
// client just renders the ring state and sends a tap.

function draw(ctx: CanvasRenderingContext2D, d: Dims, s: any, side: 0 | 1, _now: number) {
  const { cx, cy, R } = d; const rr = R * 0.5;
  let fill: string | null = null, stroke: string | null = null, glow: string | null = null, label = "", sub = "";
  if (s.ph === "flare") { fill = "rgba(52,211,153,.9)"; glow = "#34d399"; label = "TAP!"; }
  else if (s.ph === "wait") { stroke = "rgba(251,113,133,.45)"; label = "Wait…"; sub = "don't jump the gun"; }
  else { const win = s.rw === side; fill = win ? "rgba(52,211,153,.22)" : "rgba(251,113,133,.18)"; stroke = win ? "#34d399" : "#fb7185"; label = s.msg || ""; sub = win ? "Round won" : "Round lost"; }

  ctx.save();
  if (glow) { ctx.shadowBlur = 42; ctx.shadowColor = glow; }
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
  ctx.restore();

  ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = `800 ${Math.round(R * 0.16)}px system-ui`;
  ctx.fillText(label, cx, cy - (sub ? R * 0.03 : 0));
  if (sub) { ctx.fillStyle = "rgba(230,233,255,.6)"; ctx.font = `600 ${Math.round(R * 0.05)}px system-ui`; ctx.fillText(sub, cx, cy + R * 0.12); }
}

function onPointer(t: "down" | "move" | "up", _p: { x: number; y: number }, _d: Dims, _s: any, _side: 0 | 1, send: Send) {
  if (t === "down") send({ tap: true });
}

export default function ReflexOnline() {
  return (
    <OnlineMatch
      game="reflex"
      title="Cirql Reflex · Online"
      accent="#67e8f9" accent2="#34d399"
      bg="radial-gradient(120% 90% at 50% 8%, #06202a 0%, #05040f 60%, #030208 100%)"
      backHref="/play/reflex"
      howto="When the ring flares green, tap first. Jump early and you lose the round. First to 3."
      draw={draw}
      onPointer={onPointer}
      score={(s, side) => ({ you: s.s[side], them: s.s[side ^ 1] })}
    />
  );
}
