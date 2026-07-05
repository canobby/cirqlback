import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { MpClient } from "@/game/mp-client";

// OnlineMatch — the shared host for a CirqlCade online 1v1. It owns the WebSocket
// lifecycle (connect → waiting → playing → over), a square canvas + RAF render
// loop fed by server snapshots, pointer input forwarding, and the matchmaking /
// game-over overlays. A game supplies only how to DRAW a snapshot and how to turn
// a pointer into an input message; everything networked is handled here.

export interface Dims { cx: number; cy: number; R: number; size: number; }
export type Send = (msg: any) => void;
export interface OnlineMatchProps {
  game: string;                 // matchmaking key (must exist server-side)
  title: string;
  accent: string;
  accent2?: string;
  bg: string;
  backHref: string;
  howto: string;                // one-line "how to play online"
  draw: (ctx: CanvasRenderingContext2D, d: Dims, state: any, side: 0 | 1, now: number) => void;
  onPointer: (type: "down" | "move" | "up", p: { x: number; y: number }, d: Dims, state: any, side: 0 | 1, send: Send) => void;
  score?: (state: any, side: 0 | 1) => { you: number; them: number };
}

type Phase = "connecting" | "waiting" | "playing" | "over" | "left";

export default function OnlineMatch(props: OnlineMatchProps) {
  const { game, title, accent, accent2 = "#a78bfa", bg, backHref, howto, draw, onPointer, score } = props;
  const grad = `linear-gradient(90deg, ${accent}, ${accent2})`;
  const { user } = useAuth();
  const name = String((user as any)?.firstName || (user as any)?.name || (user as any)?.email || "Guest").split("@")[0].slice(0, 16);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dimsRef = useRef<Dims>({ cx: 150, cy: 150, R: 138, size: 300 });
  const stateRef = useRef<any>(null);
  const sideRef = useRef<0 | 1>(0);
  const clientRef = useRef<MpClient | null>(null);

  const [phase, setPhase] = useState<Phase>("connecting");
  const [oppName, setOppName] = useState("Rival");
  const [winner, setWinner] = useState<0 | 1 | null>(null);
  const [scores, setScores] = useState<{ you: number; them: number }>({ you: 0, them: 0 });
  const [oppRematch, setOppRematch] = useState(false);
  const [rematchPending, setRematchPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const connect = useCallback(() => {
    clientRef.current?.close();
    stateRef.current = null; setWinner(null); setOppRematch(false); setRematchPending(false); setErr(null);
    setScores({ you: 0, them: 0 }); setPhase("connecting");
    clientRef.current = new MpClient(game, name, {
      onWaiting: () => setPhase("waiting"),
      onStart: (m) => { sideRef.current = m.side; setOppName(m.opponent); setOppRematch(false); setRematchPending(false); setScores({ you: 0, them: 0 }); setPhase("playing"); },
      onState: (s) => {
        stateRef.current = s;
        if (score) { const sc = score(s, sideRef.current); setScores((p) => (p.you === sc.you && p.them === sc.them ? p : sc)); }
      },
      onOver: (m) => { setWinner(m.winner); stateRef.current = m; setPhase("over"); },
      onRematchWanted: () => setOppRematch(true),
      onOpponentLeft: () => setPhase("left"),
      onError: (msg) => setErr(msg),
    });
  }, [game, name, score]);

  useEffect(() => { connect(); return () => clientRef.current?.close(); }, [connect]);

  // canvas sizing (square, DPR-scaled)
  useEffect(() => {
    const resize = () => {
      const cv = canvasRef.current; if (!cv) return; const host = cv.parentElement; if (!host) return;
      const size = Math.max(240, Math.min(host.clientWidth, host.clientHeight, 640));
      const dpr = Math.min(devicePixelRatio || 1, 2.5);
      cv.width = size * dpr; cv.height = size * dpr; cv.style.width = size + "px"; cv.style.height = size + "px";
      cv.getContext("2d")?.setTransform(dpr, 0, 0, dpr, 0, 0);
      dimsRef.current = { cx: size / 2, cy: size / 2, R: size * 0.46, size };
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // render loop
  useEffect(() => {
    let raf = 0;
    const loop = (now: number) => {
      const cv = canvasRef.current; const ctx = cv?.getContext("2d"); const d = dimsRef.current;
      if (ctx && d) { ctx.clearRect(0, 0, d.size, d.size); if (stateRef.current) draw(ctx, d, stateRef.current, sideRef.current, now); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [draw]);

  const toLocal = (e: React.PointerEvent) => { const cv = canvasRef.current!; const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const send: Send = (msg) => clientRef.current?.input(msg);
  const pointer = (type: "down" | "move" | "up") => (e: React.PointerEvent) => {
    if (phase !== "playing") return;
    if (type === "down") { try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ } }
    onPointer(type, toLocal(e), dimsRef.current, stateRef.current, sideRef.current, send);
  };

  const doRematch = () => { clientRef.current?.rematch(); setRematchPending(true); };
  const youWon = winner != null && winner === sideRef.current;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center" style={{ background: bg, color: "#e6e9ff", touchAction: "none", userSelect: "none" }}>
      <div className="flex w-full max-w-[560px] items-center gap-3 px-4 pb-1 pt-3">
        <Link href={backHref} className="flex items-center gap-1 text-xs text-violet-300/70 hover:text-violet-200" data-testid="link-back"><ArrowLeft className="h-4 w-4" /> Back</Link>
        <div className="ml-1 text-sm font-extrabold tracking-wide" style={{ background: grad, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>{title}</div>
        <div className="ml-auto rounded-full border border-violet-400/25 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-violet-200/70">Online</div>
      </div>

      {/* score HUD */}
      {phase === "playing" && (
        <div className="flex w-full max-w-[560px] items-center justify-center gap-6 px-4 pb-1 pt-1">
          <div className="text-center leading-none"><div className="text-2xl font-extrabold tabular-nums" style={{ color: accent }}>{scores.you}</div><div className="text-[9px] uppercase tracking-[0.18em] text-violet-300/50">You</div></div>
          <div className="text-violet-300/40">vs</div>
          <div className="text-center leading-none"><div className="text-2xl font-extrabold tabular-nums text-rose-300">{scores.them}</div><div className="text-[9px] uppercase tracking-[0.18em] text-violet-300/50">{oppName}</div></div>
        </div>
      )}

      <div className="relative flex min-h-0 w-full flex-1 items-center justify-center">
        <canvas ref={canvasRef} className="block touch-none" onPointerDown={pointer("down")} onPointerMove={pointer("move")} onPointerUp={pointer("up")} onPointerCancel={pointer("up")} style={{ touchAction: "none" }} />

        {(phase === "connecting" || phase === "waiting") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center" style={{ background: "radial-gradient(60% 50% at 50% 45%, rgba(8,6,22,.85), rgba(5,4,15,.96))" }}>
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: accent }} />
            <h1 className="text-2xl font-extrabold text-white">{phase === "connecting" ? "Connecting…" : "Finding an opponent…"}</h1>
            <p className="max-w-[30ch] text-sm text-violet-100/60">{phase === "waiting" ? "You'll be matched with another player — or a bot in a moment so you never wait long." : "Reaching the game server."}</p>
            <p className="max-w-[32ch] text-[12px] text-violet-300/50">{howto}</p>
            {err && <p className="text-xs text-rose-300/80">{err}</p>}
            <Link href={backHref} className="rounded-full border border-violet-400/30 px-6 py-2.5 text-sm font-bold text-violet-200 active:scale-95" data-testid="button-cancel">Cancel</Link>
          </div>
        )}

        {phase === "over" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center" style={{ background: "radial-gradient(60% 50% at 50% 45%, rgba(8,6,22,.86), rgba(5,4,15,.96))" }}>
            <div className="text-[10px] uppercase tracking-[0.3em]" style={{ color: youWon ? accent : "#fb7185" }}>{youWon ? "Winner" : "Defeated"}</div>
            <h1 className="text-4xl font-extrabold text-white">{youWon ? "You win!" : "You lost"}</h1>
            <div className="text-lg text-violet-100/70">{scores.you} <span className="text-violet-300/40">–</span> {scores.them} <span className="text-sm text-violet-300/50">vs {oppName}</span></div>
            {oppRematch && !rematchPending && <div className="text-xs text-cyan-300/80">{oppName} wants a rematch</div>}
            <div className="flex gap-3">
              <button onClick={doRematch} disabled={rematchPending} data-testid="button-rematch" className="rounded-full px-8 py-3 text-[15px] font-extrabold tracking-wide active:scale-95 disabled:opacity-60" style={{ color: "#0a0714", background: grad, boxShadow: `0 8px 30px ${accent}80` }}>{rematchPending ? "Waiting…" : "Rematch"}</button>
              <Link href={backHref} className="rounded-full border border-violet-400/30 px-6 py-3 text-[15px] font-extrabold tracking-wide text-violet-200 active:scale-95" data-testid="button-leave">Leave</Link>
            </div>
          </div>
        )}

        {phase === "left" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center" style={{ background: "radial-gradient(60% 50% at 50% 45%, rgba(8,6,22,.86), rgba(5,4,15,.96))" }}>
            <div className="text-[10px] uppercase tracking-[0.3em]" style={{ color: accent }}>Opponent left</div>
            <h1 className="text-3xl font-extrabold text-white">You win by default</h1>
            <div className="flex gap-3">
              <button onClick={connect} data-testid="button-newmatch" className="rounded-full px-8 py-3 text-[15px] font-extrabold tracking-wide active:scale-95" style={{ color: "#0a0714", background: grad, boxShadow: `0 8px 30px ${accent}80` }}>New match</button>
              <Link href={backHref} className="rounded-full border border-violet-400/30 px-6 py-3 text-[15px] font-extrabold tracking-wide text-violet-200 active:scale-95" data-testid="button-leave">Leave</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
