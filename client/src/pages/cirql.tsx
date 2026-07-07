import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Zap, Pencil } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { CirqlWorldEngine } from "@/game/cirql-world-engine";
import type { Btn } from "@/game/retro-engine";
import { loadAvatarLS, saveAvatarLS, DEFAULT_AVATAR, type AvatarConfig } from "@/game/avatar";
import { Joystick } from "@/components/joystick";
import { CharacterCreator } from "@/components/cirql/character-creator";

// CIRQL — the flagship world (M1 world + M2 identity/persistence).
// Walk The Hearth; your character + position resume across sessions. New players
// get a character-creation step first; everyone can re-edit their look.
const INTRO_LS = "cirql_intro_v1";

interface CirqlState { ring: number; x: number; y: number; avatar: AvatarConfig; name: string; seenIntro: boolean; sparks: number; }

export default function Cirql() {
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<CirqlWorldEngine | null>(null);

  // identity/persistence held in refs so the engine's autosave callback stays fresh
  const avatarRef = useRef<AvatarConfig>({ ...DEFAULT_AVATAR });
  const nameRef = useRef<string>("Traveller");
  const seenIntroRef = useRef<boolean>(false);
  const sparksRef = useRef<number>(0);
  const posRef = useRef<{ ring: number; x: number; y: number }>({ ring: 0, x: 0, y: 150 });
  const loadedRef = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showCreator, setShowCreator] = useState(false);
  const [creatorMode, setCreatorMode] = useState<"create" | "edit">("create");

  const loggedIn = !!(user as any)?.id;

  const buildState = (): CirqlState => {
    const s = engineRef.current?.getState() ?? posRef.current;
    return { ring: s.ring, x: s.x, y: s.y, avatar: avatarRef.current, name: nameRef.current, seenIntro: seenIntroRef.current, sparks: sparksRef.current };
  };
  const persist = () => {
    const st = buildState();
    saveAvatarLS(st.avatar);
    try { window.localStorage.setItem(INTRO_LS, st.seenIntro ? "1" : ""); } catch { /* ignore */ }
    if (loggedIn) {
      fetch("/api/game/progress?gameId=cirql", {
        method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: st }),
      }).catch(() => { /* best-effort */ });
    }
  };
  const scheduleSave = () => { if (saveTimer.current) clearTimeout(saveTimer.current); saveTimer.current = setTimeout(persist, 1400); };

  // create the engine once
  useEffect(() => {
    if (!canvasRef.current) return;
    const eng = new CirqlWorldEngine(canvasRef.current);
    engineRef.current = eng;
    if (import.meta.env.DEV) (window as any).__cirql = eng;
    eng.onInteract = (kind) => { if (kind === "wonders") eng.toast("The Wonders open here soon — 50 games, in-world."); };
    eng.onLocalMove = (ring, x, y) => { posRef.current = { ring, x, y }; scheduleSave(); };
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); persist(); eng.destroy(); engineRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // load identity once auth resolves (or immediately as guest from localStorage)
  useEffect(() => {
    const eng = engineRef.current; if (!eng) return;
    const applyIdentity = (st: Partial<CirqlState> | null) => {
      const avatar = st?.avatar || loadAvatarLS();
      const acctName = ((user as any)?.username || (user as any)?.name || (user as any)?.firstName || "").toString().slice(0, 16);
      const name = st?.name || acctName || "Traveller";
      const seen = st?.seenIntro ?? (localStorage.getItem(INTRO_LS) === "1");
      avatarRef.current = avatar; nameRef.current = name; seenIntroRef.current = !!seen; sparksRef.current = st?.sparks ?? 0;
      eng.setLocal(name, avatar); eng.setStats({ sparks: sparksRef.current, cirqlLit: 3, cirqlTotal: 12, online: 1 });
      if (st && typeof st.x === "number") { eng.applyState({ ring: st.ring, x: st.x, y: st.y }); posRef.current = { ring: st.ring ?? 0, x: st.x, y: st.y ?? 0 }; }
      if (!seen) { setCreatorMode("create"); setShowCreator(true); }
    };
    if (loggedIn) {
      loadedRef.current = true;
      fetch("/api/game/progress?gameId=cirql", { credentials: "include" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => applyIdentity(d?.state || null))
        .catch(() => applyIdentity(null));
    } else if (!loadedRef.current) {
      loadedRef.current = true;
      applyIdentity(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn]);

  const onConfirm = (cfg: AvatarConfig, name: string) => {
    avatarRef.current = cfg; nameRef.current = name || nameRef.current || "Traveller"; seenIntroRef.current = true;
    engineRef.current?.setAvatar(cfg); engineRef.current?.setLocal(nameRef.current, cfg);
    setShowCreator(false); persist();
  };

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
        <button onClick={() => { setCreatorMode("edit"); setShowCreator(true); }} data-testid="btn-edit-look"
          className="ml-auto flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-cyan-200/80" style={{ borderColor: "rgba(53,224,208,.3)" }}>
          <Pencil className="h-3 w-3" /> Look
        </button>
      </div>

      <div className="relative flex min-h-0 w-full flex-1 items-center justify-center p-2">
        <canvas ref={canvasRef} data-testid="cirql-canvas" className="block" style={{ imageRendering: "pixelated", boxShadow: "0 0 60px rgba(53,224,208,.16)", borderRadius: 6 }} />
      </div>

      <div className="flex w-full max-w-[680px] items-end justify-between gap-4 px-5 pb-[calc(14px+env(safe-area-inset-bottom))] pt-1">
        <Joystick press={(b) => engineRef.current?.press(b)} release={(b) => engineRef.current?.release(b)} color="#35e0d0" size={128} />
        <div className="mb-1 flex items-end gap-3">
          <button onPointerDown={(e) => { e.preventDefault(); engineRef.current?.interact(); }} data-testid="btn-interact"
            className="flex h-16 w-16 flex-col items-center justify-center rounded-full border-[1.5px] text-[9px] font-extrabold active:scale-90"
            style={{ borderColor: "#ffc46b", color: "#ffd98a", background: "rgba(255,196,107,.08)", boxShadow: "0 0 16px rgba(255,196,107,.2) inset", touchAction: "none" }}>
            <span className="text-lg leading-none">E</span><span className="mt-0.5">TALK / ENTER</span>
          </button>
          <button {...hold("b")} data-testid="btn-run" className="flex h-14 w-14 flex-col items-center justify-center rounded-full border-[1.5px] text-[9px] font-extrabold active:scale-90" style={{ borderColor: "#3bb6ff", color: "#7be0ff", background: "rgba(255,255,255,.03)", boxShadow: "0 0 16px rgba(59,182,255,.2) inset", touchAction: "none" }}>
            <Zap className="h-5 w-5" /> RUN
          </button>
        </div>
      </div>

      {showCreator && (
        <CharacterCreator
          mode={creatorMode}
          initial={avatarRef.current}
          initialName={nameRef.current === "Traveller" ? "" : nameRef.current}
          onConfirm={onConfirm}
          onCancel={creatorMode === "edit" ? () => setShowCreator(false) : undefined}
        />
      )}
    </div>
  );
}
