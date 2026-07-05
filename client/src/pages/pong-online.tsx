import OnlineMatch, { type Dims, type Send } from "./mp/online-match";

// Cirql Pong — online 1v1. Server-authoritative (see server/multiplayer.ts); this
// only renders the snapshot and sends the paddle angle. The field is rotated 180°
// for player 1 so both players always defend the bottom.

const RPAD = 0.9, HW = 0.42, BALLR = 0.032;

function draw(ctx: CanvasRenderingContext2D, d: Dims, s: any, side: 0 | 1, _now: number) {
  const { cx, cy, R } = d;
  const flip = side === 1 ? -1 : 1;
  const px = (x: number) => cx + x * flip * R;
  const py = (y: number) => cy + y * flip * R;

  // field rim
  ctx.strokeStyle = "rgba(150,130,255,.16)"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();

  // paddles
  const drawPaddle = (i: 0 | 1, color: string) => {
    let a = s.p[i]; if (flip === -1) a += Math.PI;
    ctx.strokeStyle = color; ctx.lineWidth = R * 0.055; ctx.lineCap = "round";
    ctx.shadowBlur = 14; ctx.shadowColor = color;
    ctx.beginPath(); ctx.arc(cx, cy, RPAD * R, a - HW, a + HW); ctx.stroke();
    ctx.shadowBlur = 0;
  };
  drawPaddle((side ^ 1) as 0 | 1, "rgba(251,113,133,.85)"); // opponent
  drawPaddle(side, "#67e8f9");                                // you

  // ball
  const bx = px(s.b[0]), by = py(s.b[1]);
  ctx.fillStyle = s.srv ? "rgba(255,255,255,.5)" : "#fff";
  ctx.shadowBlur = 16; ctx.shadowColor = "#a78bfa";
  ctx.beginPath(); ctx.arc(bx, by, BALLR * R, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
}

function onPointer(_t: "down" | "move" | "up", p: { x: number; y: number }, d: Dims, _s: any, side: 0 | 1, send: Send) {
  const flip = side === 1 ? -1 : 1;
  const wx = ((p.x - d.cx) / d.R) * flip, wy = ((p.y - d.cy) / d.R) * flip;
  send({ angle: Math.atan2(wy, wx) });
}

export default function PongOnline() {
  return (
    <OnlineMatch
      game="pong"
      title="Cirql Pong · Online"
      accent="#67e8f9" accent2="#a78bfa"
      bg="radial-gradient(120% 90% at 50% 8%, #06202a 0%, #05040f 60%, #030208 100%)"
      backHref="/play/pong"
      howto="Slide your finger along the rim to move your paddle and return the ball. First to 7 wins."
      draw={draw}
      onPointer={onPointer}
      score={(s, side) => ({ you: s.s[side], them: s.s[side ^ 1] })}
    />
  );
}
