import { useEffect, useRef } from "react";
import { Link } from "wouter";
import { ArrowLeft, Zap } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { CirqlWorldEngine } from "@/game/cirql-world-engine";
import type { Btn } from "@/game/retro-engine";
import { loadAvatarLS } from "@/game/avatar";
import { Joystick } from "@/components/joystick";

// CIRQL — the flagship world. Walk your avatar around The Hearth, light the way
// to the Wonders, and meet the Hearth-keeper. Movement + interaction only for M1;
// persistence, quests, the Wonders arcade and "your Cirql" land in M2–M6.
export default function Cirql() {
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<CirqlWorldEngine | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const eng = new CirqlWorldEngine(canvasRef.current);
    engineRef.current = eng;
    const name = ((user as any)?.username || (user as any)?.name || (user as any)?.firstName || "").toString().slice(0, 16) || "Traveller";
    eng.setLocal(name, loadAvatarLS());
    eng.setStats({ online: 1, sparks: 0, cirqlLit: 3, cirqlTotal: 12 });
    if (import.meta.env.DEV) (window as any).__cirql = eng;

    // Interactions. The Wonders arcade embed lands in M5 — for now, greet it in-world.
    eng.onInteract = (kind) => {
      if (kind === "wonders") eng.toast("The Wonders open here soon — 50 games, in-world.");
    };

    return () => { eng.destroy(); engineRef.current = null; };
  }, []);

  const hold = (b: Btn) => ({
    onPointerDown: (e: React.PointerEvent) => { e.preventDefault(); try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ } engineRef.current?.press(b); },
    onPointerUp: () => engineRef.current?.release(b),
    onPointerCancel: () => engineRef.current?.release(b),
    style: { touchAction: "none" as const },
  });

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center" style={{ background: "#060b1a", color: "#eaf6ff", touchAction: "none", userSelect: "none" }}>
      <div className="flex w-full max-w-[680px] items-center gap-3 px-4 pb-1 pt-3">
        <Link href="/arcade" className="flex items-center gap-1 text-xs text-cyan-300/70 hover:text-cyan-200" data-testid="link-back"><ArrowLeft className="h-4 w-4" /> Back</Link>
        <div className="ml-1 text-sm font-extrabold uppercase tracking-[0.35em]" style={{ color: "#fff", textShadow: "0 0 10px rgba(53,224,208,.6), 0 0 22px rgba(178,108,255,.35)" }}>CIRQL</div>
        <span className="ml-auto text-[10px] uppercase tracking-widest text-cyan-200/60">The Hearth</span>
      </div>

      <div className="relative flex min-h-0 w-full flex-1 items-center justify-center p-2">
        <canvas ref={canvasRef} data-testid="cirql-canvas" className="block" style={{ imageRendering: "pixelated", boxShadow: "0 0 60px rgba(53,224,208,.16)", borderRadius: 6 }} />
      </div>

      {/* controls: joystick · interact (E) · run */}
      <div className="flex w-full max-w-[680px] items-end justify-between gap-4 px-5 pb-[calc(14px+env(safe-area-inset-bottom))] pt-1">
        <Joystick press={(b) => engineRef.current?.press(b)} release={(b) => engineRef.current?.release(b)} color="#35e0d0" size={128} />
        <div className="mb-1 flex items-end gap-3">
          <button
            onPointerDown={(e) => { e.preventDefault(); engineRef.current?.interact(); }}
            data-testid="btn-interact"
            className="flex h-16 w-16 flex-col items-center justify-center rounded-full border-[1.5px] text-[9px] font-extrabold active:scale-90"
            style={{ borderColor: "#ffc46b", color: "#ffd98a", background: "rgba(255,196,107,.08)", boxShadow: "0 0 16px rgba(255,196,107,.2) inset", touchAction: "none" }}
          >
            <span className="text-lg leading-none">E</span>
            <span className="mt-0.5">TALK / ENTER</span>
          </button>
          <button {...hold("b")} data-testid="btn-run" className="flex h-14 w-14 flex-col items-center justify-center rounded-full border-[1.5px] text-[9px] font-extrabold active:scale-90" style={{ borderColor: "#3bb6ff", color: "#7be0ff", background: "rgba(255,255,255,.03)", boxShadow: "0 0 16px rgba(59,182,255,.2) inset", touchAction: "none" }}>
            <Zap className="h-5 w-5" /> RUN
          </button>
        </div>
      </div>
    </div>
  );
}
