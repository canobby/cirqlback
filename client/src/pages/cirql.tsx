import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Zap, Pencil, ScrollText } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { CirqlWorldEngine, type QuestLogRow } from "@/game/cirql-world-engine";
import type { Btn } from "@/game/retro-engine";
import { loadAvatarLS, saveAvatarLS, DEFAULT_AVATAR, type AvatarConfig } from "@/game/avatar";
import { Joystick } from "@/components/joystick";
import { CharacterCreator } from "@/components/cirql/character-creator";

// CIRQL — the flagship world (M1 world + M2 identity/persistence).
// Walk The Hearth; your character + position resume across sessions. New players
// get a character-creation step first; everyone can re-edit their look.
const INTRO_LS = "cirql_intro_v1";

interface CirqlState { ring: number; x: number; y: number; quests?: any; avatar: AvatarConfig; name: string; seenIntro: boolean; sparks: number; }

export default function Cirql() {
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<CirqlWorldEngine | null>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);

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
  const [showQuests, setShowQuests] = useState(false);
  const [questRows, setQuestRows] = useState<QuestLogRow[]>([]);

  const loggedIn = !!(user as any)?.id;

  const buildState = (): CirqlState => {
    const s = engineRef.current?.getState() ?? posRef.current;
    return { ring: s.ring, x: s.x, y: s.y, quests: (s as any).quests, avatar: avatarRef.current, name: nameRef.current, seenIntro: seenIntroRef.current, sparks: sparksRef.current };
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
    // quests: grant the sparks reward on completion, persist progress on any change
    eng.onQuestComplete = (q) => { sparksRef.current += q.reward.sparks; eng.setStats({ sparks: sparksRef.current }); persist(); };
    eng.onQuestChange = () => { setQuestRows(eng.getQuestLog()); scheduleSave(); };
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
      eng.applyState({ ring: st?.ring ?? 0, x: st?.x, y: st?.y, quests: st?.quests });
      if (st && typeof st.x === "number") posRef.current = { ring: st.ring ?? 0, x: st.x, y: st.y ?? 0 };
      setQuestRows(eng.getQuestLog());
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

  // Full-screen: keep the in-engine HUD clear of the floating header + controls.
  useEffect(() => {
    const update = () => {
      const eng = engineRef.current; if (!eng) return;
      eng.setHudInsets(headerRef.current?.offsetHeight ?? 0, controlsRef.current?.offsetHeight ?? 0);
    };
    const id = requestAnimationFrame(update);
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => { cancelAnimationFrame(id); window.removeEventListener("resize", update); window.removeEventListener("orientationchange", update); };
  }, []);

  const onConfirm = (cfg: AvatarConfig, name: string) => {
    const firstRun = !seenIntroRef.current;
    avatarRef.current = cfg; nameRef.current = name || nameRef.current || "Traveller"; seenIntroRef.current = true;
    engineRef.current?.setAvatar(cfg); engineRef.current?.setLocal(nameRef.current, cfg);
    // first-run onboarding: auto-start the quest chain so a waypoint guides them (CHR-231)
    if (firstRun) engineRef.current?.acceptQuest("find-your-feet");
    setShowCreator(false); persist();
  };

  const hold = (b: Btn) => ({
    onPointerDown: (e: React.PointerEvent) => { e.preventDefault(); try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ } engineRef.current?.press(b); },
    onPointerUp: () => engineRef.current?.release(b),
    onPointerCancel: () => engineRef.current?.release(b),
    style: { touchAction: "none" as const },
  });

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" style={{ background: "#060b1a", color: "#eaf6ff", touchAction: "none", userSelect: "none" }}>
      {/* full-screen world — extends under the header and controls */}
      <div className="absolute inset-0 overflow-hidden">
        <canvas ref={canvasRef} data-testid="cirql-canvas" className="block" style={{ imageRendering: "pixelated" }} />
      </div>

      {/* floating header — taps pass through to the world except on the buttons */}
      <div ref={headerRef} className="pointer-events-none absolute inset-x-0 top-0 z-10 mx-auto flex max-w-[680px] items-center gap-3 px-4 pb-2 pt-3"
        style={{ background: "linear-gradient(180deg, rgba(6,11,26,.72), rgba(6,11,26,0))" }}>
        <Link href="/arcade" className="pointer-events-auto flex items-center gap-1 text-xs text-cyan-300/80 hover:text-cyan-200" data-testid="link-back"><ArrowLeft className="h-4 w-4" /> Back</Link>
        <div className="ml-1 flex items-baseline font-extrabold uppercase" data-testid="wordmark">
          <span className="text-sm tracking-[0.35em]" style={{ color: "#fff", textShadow: "0 0 10px rgba(53,224,208,.6), 0 0 22px rgba(178,108,255,.35)" }}>CIRQL</span>
          <span className="tracking-[0.15em]" style={{ fontSize: "0.44rem", color: "#b26cff", textShadow: "0 0 8px rgba(178,108,255,.75)" }}>VERSE</span>
        </div>
        <button onClick={() => { setQuestRows(engineRef.current?.getQuestLog() ?? []); setShowQuests((v) => !v); }} data-testid="btn-quests"
          className="pointer-events-auto ml-auto flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-200/90" style={{ borderColor: "rgba(255,196,107,.3)", background: "rgba(10,18,38,.5)" }}>
          <ScrollText className="h-3 w-3" /> Quests
        </button>
        <button onClick={() => { setCreatorMode("edit"); setShowCreator(true); }} data-testid="btn-edit-look"
          className="pointer-events-auto flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-cyan-200/90" style={{ borderColor: "rgba(53,224,208,.3)", background: "rgba(10,18,38,.5)" }}>
          <Pencil className="h-3 w-3" /> Look
        </button>
      </div>

      {/* controls tray — captures all taps in this band so only the controls move the character */}
      <div ref={controlsRef} className="absolute inset-x-0 bottom-0 z-10 mx-auto flex max-w-[680px] items-end justify-between gap-4 px-5 pb-[calc(14px+env(safe-area-inset-bottom))] pt-6"
        style={{ background: "linear-gradient(0deg, rgba(6,11,26,.78) 40%, rgba(6,11,26,0))", touchAction: "none" }}>
        <Joystick press={(b) => engineRef.current?.press(b)} release={(b) => engineRef.current?.release(b)} color="#35e0d0" size={128} />
        <div className="mb-1 flex items-end gap-3">
          <button onPointerDown={(e) => { e.preventDefault(); engineRef.current?.interact(); }} data-testid="btn-interact"
            className="flex h-16 w-16 flex-col items-center justify-center rounded-full border-[1.5px] text-[9px] font-extrabold active:scale-90"
            style={{ borderColor: "#ffc46b", color: "#ffd98a", background: "rgba(255,196,107,.12)", boxShadow: "0 0 16px rgba(255,196,107,.2) inset", touchAction: "none" }}>
            <span className="text-lg leading-none">E</span><span className="mt-0.5">TALK / ENTER</span>
          </button>
          <button {...hold("b")} data-testid="btn-run" className="flex h-14 w-14 flex-col items-center justify-center rounded-full border-[1.5px] text-[9px] font-extrabold active:scale-90" style={{ borderColor: "#3bb6ff", color: "#7be0ff", background: "rgba(10,18,38,.4)", boxShadow: "0 0 16px rgba(59,182,255,.2) inset", touchAction: "none" }}>
            <Zap className="h-5 w-5" /> RUN
          </button>
        </div>
      </div>

      {showQuests && (
        <div className="absolute right-3 top-14 z-[55] w-[240px] rounded-xl border p-3" style={{ borderColor: "rgba(255,196,107,.3)", background: "rgba(10,18,38,.94)", boxShadow: "0 10px 30px rgba(0,0,0,.5)" }} data-testid="quest-log">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-widest text-amber-300">Quests</span>
            <button onClick={() => setShowQuests(false)} className="text-xs text-slate-400 hover:text-slate-200">✕</button>
          </div>
          {questRows.length === 0 && <p className="text-xs text-slate-400">No quests yet. Talk to Ferra at The Hearth.</p>}
          <div className="flex flex-col gap-2">
            {questRows.map((q) => (
              <div key={q.id} className="rounded-lg px-2.5 py-2" style={{ background: "rgba(255,255,255,.03)" }}>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: q.status === "done" ? "#5be89a" : q.status === "active" ? "#ffc46b" : "#4a5c7e" }} />
                  <span className="text-[13px] font-semibold text-white">{q.name}</span>
                  <span className="ml-auto text-[9px] uppercase tracking-wider text-slate-400">{q.status}</span>
                </div>
                <p className="mt-0.5 pl-4 text-[11px] text-slate-300">{q.objective}</p>
              </div>
            ))}
          </div>
        </div>
      )}

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
