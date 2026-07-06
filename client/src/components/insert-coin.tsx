import { useEffect, useRef } from "react";
import { CoinInsertScene } from "@/game/coin-scene";
import { loadAvatarLS, type AvatarConfig } from "@/game/avatar";

// InsertCoinCutscene — the reusable "Insert Coin" overlay. Drop it in when a player
// launches a cabinet; it plays the quarter-drop → boot → marquee sequence with the
// player's avatar, then calls onDone (the parent unmounts it and starts the game).
// Tap anywhere to skip; repeat plays run in fast mode ("skippable after first view").
export function InsertCoinCutscene({
  title, accent, avatar, onDone,
}: { title: string; accent?: string; avatar?: AvatarConfig; onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<CoinInsertScene | null>(null);
  const doneRef = useRef(onDone); doneRef.current = onDone;

  useEffect(() => {
    if (!canvasRef.current) return;
    const seen = (() => { try { return localStorage.getItem("cirql_coin_seen") === "1"; } catch { return false; } })();
    const scene = new CoinInsertScene(canvasRef.current, {
      title, accent, avatar: avatar || loadAvatarLS(), fast: seen,
      onDone: () => doneRef.current(),
    });
    try { localStorage.setItem("cirql_coin_seen", "1"); } catch { /* ignore */ }
    sceneRef.current = scene;
    if (import.meta.env.DEV) (window as any).__coin = scene;
    return () => scene.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center"
      style={{ background: "#04030c", touchAction: "none" }}
      onClick={() => sceneRef.current?.skip()}
      data-testid="insert-coin"
    >
      <canvas ref={canvasRef} data-testid="coin-canvas" className="block" style={{ imageRendering: "pixelated", boxShadow: "0 0 70px rgba(124,58,237,.3)", borderRadius: 6 }} />
      <div className="pointer-events-none absolute bottom-4 text-[11px] uppercase tracking-[0.2em] text-violet-300/40">Tap to skip</div>
    </div>
  );
}
