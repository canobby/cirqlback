import OnlineMatch, { type Dims } from "./mp/online-match";

// Cirql Race — online 1v1. Server-authoritative; this renders the track + cars and
// sends lane/boost inputs via the control band. Inner lane = shorter lap but slower
// boost regen; outer = longer but faster regen. First to 3 laps wins.

const TAU = Math.PI * 2;
const YOU = "#fbbf24", OPP = "#fb7185";

function draw(ctx: CanvasRenderingContext2D, d: Dims, s: any, side: 0 | 1, _now: number) {
  const { cx, cy, R } = d;
  const pos = (a: number, r: number): [number, number] => [cx + Math.cos(a - Math.PI / 2) * r * R, cy + Math.sin(a - Math.PI / 2) * r * R];

  for (const lr of s.lanes) {
    ctx.strokeStyle = "rgba(150,130,255,.14)"; ctx.lineWidth = Math.max(6, R * 0.02);
    ctx.beginPath(); ctx.arc(cx, cy, lr * R, 0, TAU); ctx.stroke();
  }
  // start / finish line at the top
  const inR = s.lanes[0] * R, outR = s.lanes[s.lanes.length - 1] * R;
  ctx.strokeStyle = "rgba(255,255,255,.3)"; ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
  ctx.beginPath(); ctx.moveTo(cx, cy - inR + R * 0.04); ctx.lineTo(cx, cy - outR - R * 0.04); ctx.stroke();
  ctx.setLineDash([]);

  const car = (i: 0 | 1, color: string) => {
    const c = s.cars[i]; const [x, y] = pos(c.a, c.r);
    ctx.save(); ctx.shadowBlur = c.boost ? 24 : 12; ctx.shadowColor = color; ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x, y, R * 0.034, 0, TAU); ctx.fill(); ctx.restore();
  };
  car((side ^ 1) as 0 | 1, OPP);
  car(side, YOU);

  // your boost meter
  const my = s.cars[side];
  const bw = R * 1.2, bh = R * 0.05, bx = cx - bw / 2, by = cy + R * 0.92;
  ctx.fillStyle = "rgba(255,255,255,.08)"; ctx.fillRect(bx, by, bw, bh);
  ctx.fillStyle = my.mtr > 0.05 ? YOU : "#7c3aed"; ctx.fillRect(bx, by, bw * my.mtr, bh);
  ctx.fillStyle = "rgba(230,233,255,.45)"; ctx.textAlign = "center"; ctx.font = `700 ${Math.round(R * 0.04)}px system-ui`;
  ctx.fillText(`BOOST · lap ${my.lap + 1}/${s.laps}`, cx, by - R * 0.03);
}

export default function RaceOnline() {
  return (
    <OnlineMatch
      game="race"
      title="Cirql Race · Online"
      accent="#fbbf24" accent2="#fb7185"
      bg="radial-gradient(120% 90% at 50% 8%, #241a06 0%, #05040f 60%, #030208 100%)"
      backHref="/play/race"
      howto="Tap IN/OUT to switch lanes — inner is a shorter lap but recharges boost slower. Hold BOOST to burn the meter. First to 3 laps wins."
      draw={draw}
      controls={[
        { testid: "race-in", label: "IN", node: "◄", color: "#38bdf8", msg: { dlane: -1 } },
        { testid: "race-boost", label: "BOOST", node: "»", color: "#fbbf24", hold: true, msg: { boost: true }, up: { boost: false } },
        { testid: "race-out", label: "OUT", node: "►", color: "#38bdf8", msg: { dlane: 1 } },
      ]}
      score={(s, side) => ({ you: s.cars[side].lap, them: s.cars[side ^ 1].lap })}
    />
  );
}
