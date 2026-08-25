import { useCallback, useRef } from "react";
import OnlineMatch, { type Dims, type Send } from "./mp/online-match";

// Cirql Command — online Galcon 1v1. Server-authoritative; the client renders nodes
// + fleets and sends {from,to} moves. Tap one of your nodes to select it, then a
// target to fling half its troops. The selected node is local UI state (a ref).

const TAU = Math.PI * 2;
const nodeR = (n: number) => 0.045 + Math.min(1, n / 60) * 0.06;

export default function CommandOnline() {
  const sel = useRef<number | null>(null);

  const draw = useCallback((ctx: CanvasRenderingContext2D, d: Dims, s: any, side: 0 | 1, _now: number) => {
    const { cx, cy, R } = d; const flip = side === 1 ? -1 : 1;
    const px = (x: number) => cx + x * flip * R, py = (y: number) => cy + y * flip * R;
    for (const f of s.fleets) {
      ctx.fillStyle = f.o === side ? "#34d399" : "#fb7185"; ctx.globalAlpha = 0.85;
      ctx.beginPath(); ctx.arc(px(f.x), py(f.y), R * 0.017, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    }
    s.nodes.forEach((nd: any, i: number) => {
      const x = px(nd.x), y = py(nd.y), rr = nodeR(nd.n) * R;
      const col = nd.o === side ? "#34d399" : nd.o === -1 ? "#64748b" : "#fb7185";
      if (i === sel.current) { ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, rr + 6, 0, TAU); ctx.stroke(); }
      ctx.fillStyle = col + "33"; ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.shadowBlur = 12; ctx.shadowColor = col;
      ctx.beginPath(); ctx.arc(x, y, rr, 0, TAU); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
      ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = `700 ${Math.round(rr * 0.9)}px system-ui`;
      ctx.fillText(String(nd.n), x, y);
    });
  }, []);

  const onPointer = useCallback((t: "down" | "move" | "up", p: { x: number; y: number }, d: Dims, s: any, side: 0 | 1, send: Send) => {
    if (t !== "down" || !s) return;
    const flip = side === 1 ? -1 : 1;
    const wx = ((p.x - d.cx) / d.R) * flip, wy = ((p.y - d.cy) / d.R) * flip;
    let hit = -1;
    s.nodes.forEach((nd: any, i: number) => { if (Math.hypot(nd.x - wx, nd.y - wy) < nodeR(nd.n) + 0.05) hit = i; });
    if (hit < 0) { sel.current = null; return; }
    const nd = s.nodes[hit];
    if (nd.o === side) { sel.current = sel.current === hit ? null : hit; }
    else if (sel.current != null) { send({ from: sel.current, to: hit, ratio: 0.5 }); sel.current = null; }
  }, []);

  return (
    <OnlineMatch
      game="command"
      title="Cirql Command · Online"
      accent="#34d399" accent2="#fb7185"
      bg="radial-gradient(120% 90% at 50% 8%, #06231a 0%, #05040f 60%, #030208 100%)"
      backHref="/play/command"
      howto="Tap one of your nodes, then a target, to send half its troops. Own the whole board to win."
      draw={draw}
      onPointer={onPointer}
      score={(s, side) => ({ you: s.nodes.filter((n: any) => n.o === side).length, them: s.nodes.filter((n: any) => n.o === (side ^ 1)).length })}
    />
  );
}
