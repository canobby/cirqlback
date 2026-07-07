import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Zap, Pencil, ScrollText, Users, X, MessageCircle, Send, Compass, Flag, MapPin } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { CirqlWorldEngine, type QuestLogRow } from "@/game/cirql-world-engine";
import type { Btn } from "@/game/retro-engine";
import { loadAvatarLS, saveAvatarLS, DEFAULT_AVATAR, type AvatarConfig } from "@/game/avatar";
import { Joystick } from "@/components/joystick";
import { CharacterCreator } from "@/components/cirql/character-creator";
import { ARCADE_GAMES } from "@/game/registry";
import { CAMPAIGNS, campaignById, MATCH_TAGS, difficultyMeta } from "@/game/cirql-campaigns";
import { dailyForDate, activeEvent, todayStr, type DailyTask, type CirqlEvent } from "@/game/cirql-daily";
import { ringName } from "@/game/cirql-ring-gen";

const SPARK_PER_PLAY = 2;
const CADE_GAMES = ARCADE_GAMES.filter((g) => g.status === "live");

// CIRQL — the flagship world (M1 world + M2 identity/persistence).
// Walk The Hearth; your character + position resume across sessions. New players
// get a character-creation step first; everyone can re-edit their look.
const INTRO_LS = "cirql_intro_v1";

interface CirqlState { ring: number; maxRing?: number; x: number; y: number; quests?: any; lit?: string[]; litForQuest?: string[]; doneOnce?: string[]; doneCampaigns?: string[]; avatar: AvatarConfig; name: string; seenIntro: boolean; sparks: number; cirqlMembers?: number; worldEnergy?: number; playsToday?: number; playDay?: string; owned?: string[]; daily?: { day: string; done: boolean; streak: number; lastDone: string }; }
const todayUTC = () => new Date().toISOString().slice(0, 10);

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
  const energyRef = useRef<number>(0);           // World Energy 0..1
  const membersRef = useRef<number>(0);          // your Cirql size (lanterns lit)
  const playsRef = useRef<{ day: string; n: number }>({ day: "", n: 0 }); // daily play count (anti-farm)
  const posRef = useRef<{ ring: number; x: number; y: number }>({ ring: 0, x: 0, y: 150 });
  const loadedRef = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showCreator, setShowCreator] = useState(false);
  const [creatorMode, setCreatorMode] = useState<"create" | "edit">("create");
  const [showQuests, setShowQuests] = useState(false);
  const [questRows, setQuestRows] = useState<QuestLogRow[]>([]);
  const [hallOpen, setHallOpen] = useState(false);         // CirqlCade hall (the in-world arcade)
  const [playRoute, setPlayRoute] = useState<string | null>(null); // a cabinet embedded over the world
  const [showCirql, setShowCirql] = useState(false);       // your Cirql / invite panel
  const [members, setMembers] = useState(0);               // mirror of membersRef for the panel
  const [sparksUi, setSparksUi] = useState(0);             // reactive spark balance (for the shop)
  const [owned, setOwned] = useState<string[]>([]);        // purchased cosmetics
  const ownedRef = useRef<string[]>([]);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // M8 — live presence + chat
  const wsRef = useRef<WebSocket | null>(null);
  const myIdRef = useRef<string>("");
  const presenceReadyRef = useRef(false);   // identity loaded + past character creation
  const joinedRef = useRef(false);
  const sharedLightsRef = useRef<Set<string>>(new Set());   // travellers you've shared a light with this session
  const [connected, setConnected] = useState(false);
  const [online, setOnline] = useState(1);
  const [showChat, setShowChat] = useState(false);
  const [chatDraft, setChatDraft] = useState("");
  const [chatScope, setChatScope] = useState<"global" | "party">("global");
  const [feed, setFeed] = useState<{ key: number; name: string; text: string; me: boolean; party: boolean }[]>([]);
  const feedKey = useRef(0);

  // M9 — campaigns, board, parties
  interface Party { id: string; campaignId: string; hostId: string; step: number; steps: number; max: number; members: { id: string; name: string }[]; }
  const [party, setParty] = useState<Party | null>(null);
  const partyRef = useRef<Party | null>(null);
  const [curRingUi, setCurRingUi] = useState(0);   // current ring index, for off-ring party UI
  const [board, setBoard] = useState<any[]>([]);
  const [showBoard, setShowBoard] = useState(false);
  const [showParty, setShowParty] = useState(false);
  const [asks, setAsks] = useState<{ fromId: string; fromName: string }[]>([]);       // join requests to me (host)
  const [invites, setInvites] = useState<{ fromId: string; fromName: string; partyId: string; campaignId: string }[]>([]);
  const blockedRef = useRef<Set<string>>(new Set());
  const doneCampaignsRef = useRef<Set<string>>(new Set());   // campaigns finished once (repeats pay less)
  // post form
  const [postDir, setPostDir] = useState<"host" | "seeker">("host");
  const [postCampaign, setPostCampaign] = useState<string>(CAMPAIGNS[0].id);
  const [postTags, setPostTags] = useState<string[]>([]);
  const [postNewbie, setPostNewbie] = useState(true);

  // M10 — daily task + seasonal event
  const dailyRef = useRef<{ day: string; done: boolean; streak: number; lastDone: string }>({ day: "", done: false, streak: 0, lastDone: "" });
  const maxRingRef = useRef(0);
  const [dailyUi, setDailyUi] = useState<{ day: string; done: boolean; streak: number }>({ day: "", done: false, streak: 0 });
  const [event, setEvent] = useState<CirqlEvent | null>(null);
  const [showDaily, setShowDaily] = useState(false);
  const [eventDismissed, setEventDismissed] = useState(false);

  const loggedIn = !!(user as any)?.id;

  const myId = () => myIdRef.current;

  const yesterdayOf = (day: string) => { const d = new Date(day + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10); };
  // Roll the daily to today (resetting done + breaking a lapsed streak) and refresh the event.
  const refreshDaily = () => {
    const day = todayStr();
    const dr = dailyRef.current;
    if (dr.day !== day) {
      const streak = dr.lastDone === yesterdayOf(day) ? dr.streak : 0;   // missed a day → streak broken
      dailyRef.current = { day, done: false, streak, lastDone: dr.lastDone };
    }
    setDailyUi({ day: dailyRef.current.day, done: dailyRef.current.done, streak: dailyRef.current.streak });
    setEvent(activeEvent());
  };
  // Credit the daily if `task` matches today's and it isn't already done.
  const progressDaily = (task: DailyTask) => {
    const dr = dailyRef.current;
    if (dr.done || dr.day !== todayStr()) return;
    const def = dailyForDate(dr.day);
    if (def.task !== task) return;
    const ev = activeEvent();
    const reward = def.reward * (ev?.sparkMult ?? 1);
    dr.streak = dr.streak + 1; dr.done = true; dr.lastDone = dr.day;
    sparksRef.current += reward; energyRef.current = Math.min(1, energyRef.current + reward * 0.01);
    engineRef.current?.setStats({ sparks: sparksRef.current, energy: energyRef.current });
    setSparksUi(sparksRef.current);
    setDailyUi({ day: dr.day, done: true, streak: dr.streak });
    engineRef.current?.toast(`✦ Daily done — +${reward} sparks${ev ? " (festival!)" : ""} · ${dr.streak}-day streak`);
    persist();
  };
  // Reflect the current party into the engine (ring-aware shared target + member highlight).
  const syncPartyToEngine = (p: Party | null) => {
    const eng = engineRef.current; if (!eng) return;
    if (!p) { eng.setPartyTarget(null); eng.setPartyMembers([]); return; }
    const camp = campaignById(p.campaignId); const step = camp?.steps[p.step];
    eng.setPartyTarget(step ? { ring: step.ring ?? 0, at: step.at, x: step.tx, y: step.ty } : null);
    eng.setPartyMembers(p.members.map((m) => m.id).filter((id) => id !== myId()));
  };
  const applyParty = (p: Party | null) => { partyRef.current = p; setParty(p); syncPartyToEngine(p); if (p) setShowParty(true); else { setShowParty(false); setChatScope("global"); } };

  const pushFeed = (name: string, text: string, me = false, isParty = false) => setFeed((f) => [...f.slice(-6), { key: feedKey.current++, name, text, me, party: isParty }]);
  const wsSend = (msg: any) => { const ws = wsRef.current; if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg)); };

  // Attempt the presence join — fires once the socket is open AND identity is ready
  // (returning players join immediately; first-run players join after they finish the
  // character creator, so other travellers see the avatar they actually chose).
  const tryJoin = () => {
    const ws = wsRef.current, eng = engineRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN || !presenceReadyRef.current || joinedRef.current || !eng) return;
    const st = eng.getState();
    ws.send(JSON.stringify({ t: "join", name: nameRef.current, avatar: avatarRef.current, ring: st.ring, x: st.x, y: st.y, dir: "down" }));
    joinedRef.current = true;
  };
  const sendChat = () => { const t = chatDraft.trim(); if (!t) return; wsSend({ t: "chat", text: t, scope: party && chatScope === "party" ? "party" : "global" }); setChatDraft(""); };
  const shareLight = (id: string) => wsSend({ t: "light", to: id });

  // M9 board + party actions
  const postRequest = () => {
    const camp = campaignById(postCampaign);
    wsSend({ t: "board:post", dir: postDir, campaignId: postDir === "host" ? postCampaign : "", steps: camp?.steps.length ?? 1, max: camp?.maxParty ?? 4, tags: postTags, newbie: postNewbie });
    engineRef.current?.toast(postDir === "host" ? "Posted — travellers can join your run" : "Posted — hosts can invite you along");
  };
  const cancelPost = () => wsSend({ t: "board:cancel" });
  const askToJoin = (postId: string) => { wsSend({ t: "party:ask", postId }); engineRef.current?.toast("Asked to join — waiting for the host"); };
  const inviteSeeker = (postId: string) => { wsSend({ t: "party:invite", postId }); engineRef.current?.toast("Invite sent"); };
  const respondAsk = (askerId: string, accept: boolean) => { wsSend({ t: accept ? "party:accept" : "party:decline", askerId }); setAsks((a) => a.filter((x) => x.fromId !== askerId)); };
  const acceptInvite = (partyId: string) => { wsSend({ t: "party:acceptInvite", partyId }); setInvites((v) => v.filter((x) => x.partyId !== partyId)); };
  const leaveParty = () => { wsSend({ t: "party:leave" }); applyParty(null); };
  const advanceStep = () => { const p = partyRef.current; if (p) wsSend({ t: "party:advance", step: p.step }); };
  const blockPlayer = (id: string) => { blockedRef.current.add(id); wsSend({ t: "party:report", targetId: id }); setBoard((b) => b.filter((x) => x.byId !== id)); setAsks((a) => a.filter((x) => x.fromId !== id)); setInvites((v) => v.filter((x) => x.fromId !== id)); engineRef.current?.toast("Player hidden & reported"); };
  // A "share a light" landed (from someone near you): light a lantern on your Hearth,
  // once per distinct traveller, capped at your Cirql's 12.
  const receiveLight = (id: string, name: string) => {
    const eng = engineRef.current; if (!eng) return;
    if (sharedLightsRef.current.has(id)) { eng.toast(`${name}'s light already shines on your Hearth`); return; }
    sharedLightsRef.current.add(id);
    if (membersRef.current < 12) { membersRef.current += 1; setMembers(membersRef.current); eng.setStats({ cirqlLit: membersRef.current }); }
    eng.toast(`✦ You and ${name} shared a light`);
    persist();
  };

  const buildState = (): CirqlState => {
    const s = engineRef.current?.getState() ?? posRef.current;
    return { ring: s.ring, maxRing: (s as any).maxRing ?? 0, x: s.x, y: s.y, quests: (s as any).quests, lit: (s as any).lit, litForQuest: (s as any).litForQuest, doneOnce: (s as any).doneOnce, doneCampaigns: Array.from(doneCampaignsRef.current), avatar: avatarRef.current, name: nameRef.current, seenIntro: seenIntroRef.current, sparks: sparksRef.current, cirqlMembers: membersRef.current, worldEnergy: energyRef.current, playsToday: playsRef.current.n, playDay: playsRef.current.day, owned: ownedRef.current, daily: dailyRef.current };
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
    eng.onInteract = (kind) => { if (kind === "wonders") setHallOpen(true); };   // step into CirqlCade
    eng.onLocalMove = (ring, x, y) => { posRef.current = { ring, x, y }; scheduleSave(); };
    eng.onSail = (ring, maxRing) => { const st = eng.getState(); posRef.current = { ring, x: st.x, y: st.y }; setCurRingUi(ring); if (maxRing > maxRingRef.current) { maxRingRef.current = maxRing; progressDaily("voyage"); } persist(); };   // reaching a new ring is a big save point
    // quests: grant the sparks reward on completion, persist progress on any change
    eng.onQuestComplete = (q, first) => {
      const reward = first ? q.reward.sparks : Math.max(1, Math.round(q.reward.sparks * 0.25));   // repeats pay ~a quarter
      sparksRef.current += reward; eng.setStats({ sparks: sparksRef.current }); setSparksUi(sparksRef.current);
      eng.toast(first ? `✦ ${q.name} — +${reward} sparks` : `✦ ${q.name} again — +${reward} sparks`);
      if (first && q.id.startsWith("ring-")) progressDaily("explore");   // only the first counts toward the daily
      persist();
    };
    eng.onQuestChange = () => { setQuestRows(eng.getQuestLog()); scheduleSave(); };

    // M8 — live presence socket: broadcast our position + share-a-light, and render
    // every other traveller sharing the ring (adapted from the /ws/town prototype).
    const proto = location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${proto}://${location.host}/ws/cirql`);
    wsRef.current = ws;
    eng.onPresence = (ring, x, y, facing) => { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ t: "move", ring, x, y, dir: facing })); };
    eng.onShareLight = (id) => shareLight(id);
    eng.onPartyArrive = () => { const p = partyRef.current; if (p) wsSend({ t: "party:advance", step: p.step }); };
    const refreshCount = () => { const n = eng.remoteCount() + 1; setOnline(n); eng.setStats({ online: n }); };
    ws.onopen = () => { setConnected(true); tryJoin(); };
    ws.onclose = () => { setConnected(false); joinedRef.current = false; };
    ws.onmessage = (e) => {
      let m: any; try { m = JSON.parse(e.data); } catch { return; }
      if (m.t === "welcome") { myIdRef.current = m.id; eng.clearRemotes(); (m.players || []).forEach((p: any) => eng.addRemote(p)); refreshCount(); }
      else if (m.t === "join") { eng.addRemote(m); refreshCount(); pushFeed("", `${m.name} arrived`); }
      else if (m.t === "move") { eng.moveRemote(m.id, m.x, m.y, m.dir); }
      else if (m.t === "leave") { eng.removeRemote(m.id); refreshCount(); }
      else if (m.t === "chat") { if (blockedRef.current.has(m.id) && m.id !== myIdRef.current) return; const isP = m.channel === "party"; if (m.id === myIdRef.current) { eng.sayLocal(m.text); pushFeed(m.name, m.text, true, isP); } else { eng.chatRemote(m.id, m.text); pushFeed(m.name, m.text, false, isP); } }
      else if (m.t === "lit") { receiveLight(m.id, m.name); }
      // M9 board + party
      else if (m.t === "board:list") { setBoard((m.posts || []).filter((p: any) => !blockedRef.current.has(p.byId))); }
      else if (m.t === "party:state") { applyParty({ id: m.id, campaignId: m.campaignId, hostId: m.hostId, step: m.step, steps: m.steps, max: m.max, members: m.members || [] }); }
      else if (m.t === "party:ask") { if (!blockedRef.current.has(m.fromId)) { setAsks((a) => a.some((x) => x.fromId === m.fromId) ? a : [...a, { fromId: m.fromId, fromName: m.fromName }]); eng.toast(`${m.fromName} wants to join your party`); } }
      else if (m.t === "party:invite") { if (!blockedRef.current.has(m.fromId)) { setInvites((v) => v.some((x) => x.partyId === m.partyId) ? v : [...v, { fromId: m.fromId, fromName: m.fromName, partyId: m.partyId, campaignId: m.campaignId }]); eng.toast(`${m.fromName} invited you to a campaign`); } }
      else if (m.t === "party:declined") { eng.toast(`${m.byName} can't take you right now`); }
      else if (m.t === "party:disband") { applyParty(null); eng.toast(m.reason || "The party disbanded"); }
      else if (m.t === "party:complete") {
        const camp = campaignById(m.campaignId); const base = camp?.reward ?? 0;
        const first = !doneCampaignsRef.current.has(m.campaignId);
        const rw = first ? base : Math.max(2, Math.round(base * 0.25));   // repeat campaigns pay ~a quarter
        doneCampaignsRef.current.add(m.campaignId);
        sparksRef.current += rw; energyRef.current = Math.min(1, energyRef.current + rw * 0.01);
        eng.setStats({ sparks: sparksRef.current, energy: energyRef.current }); setSparksUi(sparksRef.current);
        applyParty(null);
        eng.toast(first ? `✦ ${camp?.title || "Campaign"} complete — +${rw} sparks!` : `✦ ${camp?.title || "Campaign"} again — +${rw} sparks!`);
        persist();
      }
    };

    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); persist(); try { ws.close(); } catch { /* ignore */ } eng.destroy(); engineRef.current = null; };
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
      energyRef.current = st?.worldEnergy ?? 0; membersRef.current = st?.cirqlMembers ?? 0; setMembers(membersRef.current);
      playsRef.current = { day: st?.playDay ?? "", n: st?.playsToday ?? 0 };
      ownedRef.current = Array.isArray(st?.owned) ? st!.owned! : []; setOwned(ownedRef.current); setSparksUi(sparksRef.current);
      maxRingRef.current = st?.maxRing ?? 0; setCurRingUi(st?.ring ?? 0);
      doneCampaignsRef.current = new Set(Array.isArray(st?.doneCampaigns) ? st!.doneCampaigns! : []);
      if (st?.daily && typeof st.daily.day === "string") dailyRef.current = { day: st.daily.day, done: !!st.daily.done, streak: +st.daily.streak || 0, lastDone: st.daily.lastDone || "" };
      refreshDaily();
      eng.setLocal(name, avatar); eng.setStats({ sparks: sparksRef.current, cirqlLit: membersRef.current, cirqlTotal: 12, online: 1, energy: energyRef.current });
      eng.applyState({ ring: st?.ring ?? 0, maxRing: st?.maxRing ?? 0, x: st?.x, y: st?.y, quests: st?.quests, lit: st?.lit, litForQuest: st?.litForQuest, doneOnce: st?.doneOnce });
      if (st && typeof st.x === "number") posRef.current = { ring: st.ring ?? 0, x: st.x, y: st.y ?? 0 };
      setQuestRows(eng.getQuestLog());
      if (!seen) { setCreatorMode("create"); setShowCreator(true); }
      // returning players can appear to others immediately; first-run players wait
      // until they've finished the creator (see onConfirm) so their avatar is real.
      presenceReadyRef.current = !!seen; tryJoin();
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
    presenceReadyRef.current = true; tryJoin();   // now safe to appear to other travellers
  };

  // Leaving a cabinet → back to the CirqlCade hall + a spark a play (CHR-235; full
  // score→sparks normalization is M6). Also fires if the game's own back-button
  // navigates the iframe away from /play.
  const closeGame = () => {
    if (playRoute) {
      // spark a play, with a daily taper so it can't be farmed (CHR-244)
      const today = todayUTC();
      if (playsRef.current.day !== today) playsRef.current = { day: today, n: 0 };
      playsRef.current.n += 1;
      const n = playsRef.current.n;
      const earned = n <= 12 ? SPARK_PER_PLAY : n <= 20 ? 1 : 0;
      if (earned > 0) {
        sparksRef.current += earned;
        energyRef.current += earned * 0.015;                 // sparks feed the World Energy meter
        let msg = `+${earned} spark${earned > 1 ? "s" : ""}`;
        if (energyRef.current >= 1) { energyRef.current = 0.06; msg = "✦ You've fed the world — it stirs."; }
        engineRef.current?.setStats({ sparks: sparksRef.current, energy: energyRef.current });
        setSparksUi(sparksRef.current);
        engineRef.current?.toast(msg);
      } else {
        engineRef.current?.toast("Rest a while — more sparks tomorrow.");
      }
      progressDaily("attune");   // playing a Wonder can satisfy today's daily
      persist();
    }
    setPlayRoute(null);
  };

  // Spend sparks to unlock a cosmetic (CHR-246). Returns false if you can't afford it.
  const buyCosmetic = (id: string, cost: number): boolean => {
    if (ownedRef.current.includes(id)) return true;
    if (sparksRef.current < cost) return false;
    sparksRef.current -= cost; setSparksUi(sparksRef.current);
    ownedRef.current = [...ownedRef.current, id]; setOwned(ownedRef.current);
    engineRef.current?.setStats({ sparks: sparksRef.current });
    persist();
    return true;
  };

  // Invite a friend to your Cirql (reuses the platform referral idea; lantern lights on real join, later).
  const invite = async () => {
    const link = `${location.origin}/cirql${(user as any)?.id ? `?ref=${(user as any).id}` : ""}`;
    try {
      if (navigator.share) await navigator.share({ title: "CIRQLVERSE", text: "Come light the world with me in CIRQLVERSE ✦", url: link });
      else { await navigator.clipboard.writeText(link); engineRef.current?.toast("Invite link copied"); }
    } catch { /* user cancelled / unsupported */ }
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
          <span className="tracking-[0.35em]" style={{ fontSize: "1.05rem", color: "#fff", textShadow: "0 0 10px rgba(53,224,208,.6), 0 0 22px rgba(178,108,255,.35)" }}>CIRQL</span>
          <span className="tracking-[0.15em]" style={{ fontSize: "0.63rem", color: "#b26cff", textShadow: "0 0 9px rgba(178,108,255,.8)" }}>VERSE</span>
        </div>
        <button onClick={() => { setShowBoard((v) => { if (!v) wsSend({ t: "board:get" }); return !v; }); }} data-testid="btn-board" title="Campaign Board"
          className="pointer-events-auto relative ml-auto flex h-7 w-7 items-center justify-center rounded-full border text-teal-200/90" style={{ borderColor: party ? "rgba(53,224,208,.7)" : "rgba(53,224,208,.3)", background: "rgba(10,18,38,.5)" }}>
          <Compass className="h-3.5 w-3.5" />
          {(asks.length + invites.length) > 0 && <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] font-black text-slate-900" style={{ background: "#ffc46b" }}>{asks.length + invites.length}</span>}
        </button>
        {party && (
          <button onClick={() => setShowParty((v) => !v)} data-testid="btn-party" title="Your party"
            className="pointer-events-auto flex h-7 items-center gap-1 rounded-full border px-2 text-[11px] font-bold text-teal-200/90" style={{ borderColor: "rgba(53,224,208,.55)", background: "rgba(10,18,38,.5)" }}>
            <Flag className="h-3 w-3" /> {party.members.length}
          </button>
        )}
        <button onClick={() => setShowChat((v) => !v)} data-testid="btn-chat" title="Chat"
          className="pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full border" style={{ borderColor: showChat ? "rgba(53,224,208,.65)" : "rgba(53,224,208,.3)", background: "rgba(10,18,38,.5)", color: connected ? "#7be0ff" : "#7a8bb0" }}>
          <MessageCircle className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => { setQuestRows(engineRef.current?.getQuestLog() ?? []); refreshDaily(); setShowQuests((v) => !v); }} data-testid="btn-quests" title="Quests & Daily"
          className="pointer-events-auto relative flex h-7 w-7 items-center justify-center rounded-full border text-amber-200/90" style={{ borderColor: "rgba(255,196,107,.3)", background: "rgba(10,18,38,.5)" }}>
          <ScrollText className="h-3.5 w-3.5" />
          {!dailyUi.done && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full" style={{ background: "#ffc46b", boxShadow: "0 0 6px #ffc46b" }} />}
        </button>
        <button onClick={() => { setCreatorMode("edit"); setShowCreator(true); }} data-testid="btn-edit-look" title="Edit look"
          className="pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full border text-cyan-200/90" style={{ borderColor: "rgba(53,224,208,.3)", background: "rgba(10,18,38,.5)" }}>
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => setShowCirql((v) => !v)} data-testid="btn-cirql" title="Your Cirql"
          className="pointer-events-auto flex h-7 items-center gap-1 rounded-full border px-2 text-[11px] font-bold text-amber-200/90" style={{ borderColor: "rgba(255,196,107,.3)", background: "rgba(10,18,38,.5)" }}>
          <Users className="h-3.5 w-3.5" /> {members}
        </button>
      </div>

      {/* live chat — a slim bar below the header + a short feed (in-world speech bubbles
          render regardless; this is the "open chat" mode). */}
      {showChat && (
        <>
          <div className="pointer-events-auto absolute inset-x-0 top-12 z-[14] mx-auto flex max-w-[520px] items-center gap-2 px-4">
            {party && (
              <button onClick={() => setChatScope((s) => (s === "party" ? "global" : "party"))} data-testid="cirql-chat-scope"
                className="flex h-10 shrink-0 items-center rounded-xl border px-2.5 text-[10px] font-extrabold uppercase tracking-wide"
                style={chatScope === "party" ? { borderColor: "#35e0d0", color: "#7ff5e8", background: "rgba(53,224,208,.12)" } : { borderColor: "#3a2a72", color: "#c9b8ff", background: "rgba(178,108,255,.08)" }}>
                {chatScope === "party" ? "Party" : "Global"}
              </button>
            )}
            <input value={chatDraft} onChange={(e) => setChatDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") sendChat(); }} maxLength={120}
              placeholder={connected ? (party && chatScope === "party" ? "Message your party…" : "Say something to the ring…") : "connecting…"} data-testid="cirql-chat-input"
              className="min-w-0 flex-1 rounded-xl border px-3 py-2 text-[13px] outline-none" style={{ borderColor: "#2a3a66", background: "rgba(6,11,26,.92)", color: "#fff", touchAction: "auto" }} />
            <button onClick={sendChat} data-testid="cirql-chat-send" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-[1.5px] active:scale-90" style={{ borderColor: "#35e0d0", color: "#35e0d0", background: "rgba(53,224,208,.08)" }}><Send className="h-5 w-5" /></button>
          </div>
          {feed.length > 0 && (
            <div className="pointer-events-none absolute left-3 top-[86px] z-[12] flex max-w-[62%] flex-col gap-1">
              {feed.slice(-5).map((mm) => (
                <div key={mm.key} className="w-fit rounded-md px-2 py-1 text-[11px] leading-tight" style={{ background: "rgba(6,11,26,.72)", border: `1px solid ${mm.party ? "#35e0d066" : mm.me ? "#ffc46b55" : mm.name ? "#b26cff44" : "#35e0d044"}` }}>
                  {mm.party && <span className="mr-1 text-[8px] font-black uppercase tracking-wider text-teal-300/80">party</span>}
                  {mm.name ? <><span className="font-bold" style={{ color: mm.me ? "#ffd98a" : mm.party ? "#7ff5e8" : "#c9b8ff" }}>{mm.name}:</span> <span className="text-cyan-50/90">{mm.text}</span></> : <span className="italic text-cyan-300/80">{mm.text}</span>}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* seasonal / weekend event banner (M10) — a dismissible ribbon under the header */}
      {event && !eventDismissed && !showChat && (
        <div className="pointer-events-auto absolute inset-x-0 top-12 z-[13] mx-auto flex max-w-[420px] items-center gap-2 rounded-full border px-3 py-1.5" data-testid="event-banner"
          style={{ borderColor: event.accent + "80", background: "rgba(10,18,38,.92)", boxShadow: `0 0 18px ${event.accent}44` }}>
          <span className="text-[13px]" style={{ filter: `drop-shadow(0 0 5px ${event.accent})` }}>✦</span>
          <span className="min-w-0 flex-1 truncate text-[11.5px]"><b style={{ color: event.accent }}>{event.name}</b> <span className="text-slate-300">— {event.blurb}</span></span>
          <button onClick={() => setEventDismissed(true)} className="shrink-0 text-slate-400 hover:text-slate-200"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

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

      {/* CirqlCade — the in-world arcade hall: pick a cosmic cabinet to play */}
      {hallOpen && (
        <div className="absolute inset-0 z-[58] flex flex-col" data-testid="cirqlcade-hall"
          style={{ background: "radial-gradient(130% 80% at 50% -10%, rgba(40,20,74,.98), rgba(6,8,20,.99))" }}>
          <div className="flex items-center gap-3 px-4 pb-1 pt-3">
            <button onClick={() => setHallOpen(false)} data-testid="cade-leave" className="flex items-center gap-1 text-xs text-cyan-300/80 hover:text-cyan-200"><ArrowLeft className="h-4 w-4" /> Leave</button>
            <div className="ml-1 flex items-baseline font-extrabold uppercase" data-testid="cade-wordmark">
              <span className="tracking-[0.35em]" style={{ fontSize: "1.05rem", color: "#fff", textShadow: "0 0 10px rgba(53,224,208,.6), 0 0 22px rgba(178,108,255,.35)" }}>CIRQL</span>
              <span className="tracking-[0.15em]" style={{ fontSize: "0.63rem", color: "#b26cff", textShadow: "0 0 9px rgba(178,108,255,.8)" }}>CADE</span>
            </div>
            <span className="ml-auto text-[10px] uppercase tracking-widest text-violet-300/60">{CADE_GAMES.length} wonders</span>
          </div>
          <p className="px-4 pb-2 text-[12px] leading-snug text-violet-200/60">Attune to a Wonder — every run earns you <span className="text-amber-300">sparks</span>.</p>
          <div className="grid min-h-0 flex-1 grid-cols-3 gap-2 overflow-y-auto px-3 pb-[calc(16px+env(safe-area-inset-bottom))] sm:grid-cols-4">
            {CADE_GAMES.map((g) => (
              <button key={g.id} onClick={() => setPlayRoute(g.route)} data-testid={`cade-${g.id}`}
                className="flex flex-col items-center justify-center gap-1 rounded-xl border p-2 transition active:scale-95"
                style={{ borderColor: g.accent + "55", background: "linear-gradient(180deg, rgba(22,15,44,.75), rgba(10,8,24,.75))", minHeight: 86 }}>
                <span className="text-[26px] leading-none" style={{ filter: `drop-shadow(0 0 6px ${g.accent})` }}>{g.glyph}</span>
                <span className="text-center text-[11px] font-bold leading-tight text-white">{g.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* an embedded cabinet — plays over the world, no leaving CIRQLVERSE */}
      {playRoute && (
        <div className="absolute inset-0 z-[59] flex flex-col bg-black" data-testid="cirqlcade-game">
          <div className="flex items-center gap-3 px-4 py-2" style={{ background: "rgba(6,8,20,.96)" }}>
            <button onClick={closeGame} data-testid="cade-back" className="flex items-center gap-1 text-xs font-bold text-cyan-300/90 hover:text-cyan-200"><ArrowLeft className="h-4 w-4" /> CirqlCade</button>
            <span className="ml-auto text-[10px] uppercase tracking-widest text-violet-300/50">playing in-world</span>
          </div>
          <iframe ref={iframeRef} src={playRoute} title="CirqlCade cabinet" className="w-full min-h-0 flex-1 border-0"
            onLoad={() => { try { const p = iframeRef.current?.contentWindow?.location?.pathname; if (p && !p.startsWith("/play")) closeGame(); } catch { /* cross-origin: ignore */ } }} />
        </div>
      )}

      {showQuests && (
        <div className="absolute right-3 top-14 z-[55] w-[240px] rounded-xl border p-3" style={{ borderColor: "rgba(255,196,107,.3)", background: "rgba(10,18,38,.94)", boxShadow: "0 10px 30px rgba(0,0,0,.5)" }} data-testid="quest-log">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-widest text-amber-300">Quests</span>
            <button onClick={() => setShowQuests(false)} className="text-xs text-slate-400 hover:text-slate-200">✕</button>
          </div>
          {/* today's daily task (M10) */}
          {(() => { const d = dailyForDate(dailyUi.day || todayStr()); return (
            <div className="mb-2 rounded-lg border p-2.5" data-testid="daily-card" style={{ borderColor: dailyUi.done ? "rgba(91,232,154,.4)" : "rgba(255,196,107,.5)", background: "rgba(255,196,107,.06)" }}>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: dailyUi.done ? "#5be89a" : "#ffc46b" }}>Daily</span>
                {dailyUi.streak > 0 && <span className="text-[10px] font-bold text-amber-300">🔥 {dailyUi.streak}</span>}
                {event && <span className="ml-auto text-[9px] font-bold uppercase" style={{ color: event.accent }}>✦ {event.name}</span>}
              </div>
              <div className="mt-0.5 text-[13px] font-semibold text-white">{d.title}</div>
              <p className="text-[11px] leading-snug text-slate-300">{d.blurb}</p>
              <div className="mt-1 text-[11px] font-bold" style={{ color: dailyUi.done ? "#5be89a" : "#ffd98a" }}>
                {dailyUi.done ? "✓ Done today — come back tomorrow" : `Reward: ${d.reward * (event?.sparkMult ?? 1)} sparks${event ? " (doubled!)" : ""}`}
              </div>
            </div>
          ); })()}
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

      {showCirql && (
        <div className="absolute right-3 top-14 z-[55] w-[252px] rounded-xl border p-3" style={{ borderColor: "rgba(255,196,107,.3)", background: "rgba(10,18,38,.96)", boxShadow: "0 10px 30px rgba(0,0,0,.5)" }} data-testid="cirql-panel">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-widest text-amber-300">Your Cirql</span>
            <button onClick={() => setShowCirql(false)} className="text-slate-400 hover:text-slate-200"><X className="h-4 w-4" /></button>
          </div>
          <p className="text-[12px] leading-snug text-slate-300"><b className="text-white">{members}</b> of 12 lanterns lit — friends light your Hearth.</p>
          <div className="my-2 flex flex-wrap gap-1.5">
            {Array.from({ length: 12 }).map((_, i) => (
              <span key={i} className="h-3 w-3 rounded-full" style={{ background: i < members ? "#ffc46b" : "rgba(255,255,255,.12)", boxShadow: i < members ? "0 0 7px #ffc46b" : "none" }} />
            ))}
          </div>
          <button onClick={invite} data-testid="cirql-invite" className="mt-1 w-full rounded-lg py-2.5 text-[13px] font-extrabold text-slate-900" style={{ background: "linear-gradient(90deg,#ffc46b,#ffd98a)" }}>Invite a friend ✦</button>
          <p className="mt-2 text-[10.5px] leading-snug text-slate-400">
            Or walk up to a traveller and press <b className="text-cyan-200">E</b> to <span className="text-cyan-300">share a light</span> — it lights a lantern for you both.
            {online > 1 ? <> <span className="text-emerald-300">{online} here now.</span></> : <> <span className="text-slate-500">No one else here right now.</span></>}
          </p>
        </div>
      )}

      {/* pending matchmaking prompts — accept/decline cards, top-centre; above the board
          so a host can act on an ask even with the board open */}
      {(asks.length > 0 || invites.length > 0) && (
        <div className="pointer-events-auto absolute inset-x-0 top-12 z-[60] mx-auto flex max-w-[360px] flex-col gap-2 px-4">
          {asks.map((a) => (
            <div key={"ask" + a.fromId} data-testid={`ask-${a.fromId}`} className="flex items-center gap-2 rounded-xl border px-3 py-2" style={{ borderColor: "rgba(53,224,208,.5)", background: "rgba(8,14,30,.97)", boxShadow: "0 10px 30px rgba(0,0,0,.5)" }}>
              <span className="min-w-0 flex-1 text-[12px] text-slate-200"><b className="text-teal-200">{a.fromName}</b> wants to join your party</span>
              <button onClick={() => respondAsk(a.fromId, true)} data-testid={`ask-accept-${a.fromId}`} className="rounded-lg px-2.5 py-1.5 text-[12px] font-bold text-slate-900" style={{ background: "#35e0d0" }}>Accept</button>
              <button onClick={() => respondAsk(a.fromId, false)} className="rounded-lg border px-2 py-1.5 text-[12px] text-slate-300" style={{ borderColor: "#3a2a72" }}>No</button>
            </div>
          ))}
          {invites.map((v) => (
            <div key={"inv" + v.partyId} data-testid={`invite-${v.partyId}`} className="flex items-center gap-2 rounded-xl border px-3 py-2" style={{ borderColor: "rgba(255,196,107,.5)", background: "rgba(8,14,30,.97)", boxShadow: "0 10px 30px rgba(0,0,0,.5)" }}>
              <span className="min-w-0 flex-1 text-[12px] text-slate-200"><b className="text-amber-200">{v.fromName}</b> invites you to <b className="text-white">{campaignById(v.campaignId)?.title || "a campaign"}</b></span>
              <button onClick={() => acceptInvite(v.partyId)} data-testid={`invite-accept-${v.partyId}`} className="rounded-lg px-2.5 py-1.5 text-[12px] font-bold text-slate-900" style={{ background: "#ffc46b" }}>Join</button>
              <button onClick={() => setInvites((x) => x.filter((i) => i.partyId !== v.partyId))} className="rounded-lg border px-2 py-1.5 text-[12px] text-slate-300" style={{ borderColor: "#3a2a72" }}>No</button>
            </div>
          ))}
        </div>
      )}

      {/* Campaign Board — post / browse / join co-op campaigns (structured, PII-free) */}
      {showBoard && (
        <div className="absolute inset-0 z-[57] flex flex-col" data-testid="campaign-board"
          style={{ background: "radial-gradient(130% 80% at 50% -10%, rgba(12,34,54,.98), rgba(6,8,20,.99))" }}>
          <div className="flex items-center gap-2 px-4 pb-1 pt-3">
            <button onClick={() => setShowBoard(false)} data-testid="board-close" className="flex items-center gap-1 text-xs text-cyan-300/80 hover:text-cyan-200"><ArrowLeft className="h-4 w-4" /> Back</button>
            <div className="ml-1 flex items-center gap-1.5 text-sm font-extrabold uppercase tracking-wide text-teal-200"><Compass className="h-4 w-4" /> Campaign Board</div>
            <span className="ml-auto text-[10px] uppercase tracking-widest text-teal-300/50">{board.length} open</span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(16px+env(safe-area-inset-bottom))]">
            {/* post form (hidden while you're already on a campaign) */}
            {!party ? (
              <div className="mb-4 rounded-2xl border p-3" style={{ borderColor: "rgba(53,224,208,.25)", background: "rgba(8,16,32,.7)" }}>
                <div className="mb-2 flex gap-2">
                  {(["host", "seeker"] as const).map((d) => (
                    <button key={d} onClick={() => setPostDir(d)} data-testid={`post-dir-${d}`} className="flex-1 rounded-lg border py-1.5 text-[12px] font-bold"
                      style={postDir === d ? { borderColor: "#35e0d0", color: "#0a1220", background: "#7ff5e8" } : { borderColor: "#2a3a66", color: "#a9c2e6", background: "transparent" }}>
                      {d === "host" ? "Host a run" : "Looking to join"}
                    </button>
                  ))}
                </div>
                {postDir === "host" && (
                  <div className="mb-2 flex flex-col gap-1.5">
                    {CAMPAIGNS.map((c) => {
                      const dm = difficultyMeta[c.difficulty];
                      return (
                        <button key={c.id} onClick={() => setPostCampaign(c.id)} data-testid={`post-campaign-${c.id}`} className="rounded-lg border p-2 text-left"
                          style={postCampaign === c.id ? { borderColor: "#35e0d0", background: "rgba(53,224,208,.08)" } : { borderColor: "#233152", background: "transparent" }}>
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-bold text-white">{c.title}</span>
                            <span className="rounded px-1.5 py-0.5 text-[9px] font-black uppercase" style={{ color: dm.color, background: dm.color + "22" }}>{dm.label}</span>
                            {c.newbie && <span className="rounded px-1.5 py-0.5 text-[9px] font-black uppercase text-emerald-300" style={{ background: "rgba(91,232,154,.14)" }}>New-friendly</span>}
                            <span className="ml-auto text-[10px] text-slate-400">{c.minParty}-{c.maxParty} · {c.steps.length} steps</span>
                          </div>
                          <p className="mt-0.5 text-[11px] leading-snug text-slate-400">{c.blurb}</p>
                        </button>
                      );
                    })}
                  </div>
                )}
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {MATCH_TAGS.map((tg) => {
                    const on = postTags.includes(tg);
                    return <button key={tg} onClick={() => setPostTags((t) => on ? t.filter((x) => x !== tg) : [...t, tg])} data-testid={`post-tag-${tg}`}
                      className="rounded-full border px-2.5 py-1 text-[10px] font-bold" style={on ? { borderColor: "#b26cff", color: "#e6d8ff", background: "rgba(178,108,255,.15)" } : { borderColor: "#2a3a66", color: "#8ba0c4" }}>{tg}</button>;
                  })}
                </div>
                <label className="mb-2 flex items-center gap-2 text-[12px] text-slate-300">
                  <input type="checkbox" checked={postNewbie} onChange={(e) => setPostNewbie(e.target.checked)} data-testid="post-newbie" /> New players welcome
                </label>
                <button onClick={postRequest} data-testid="board-post" className="w-full rounded-xl py-2.5 text-[13px] font-extrabold text-slate-900" style={{ background: "linear-gradient(90deg,#35e0d0,#7ff5e8)" }}>
                  Post to the board
                </button>
              </div>
            ) : (
              <div className="mb-4 flex items-center gap-2 rounded-2xl border p-3 text-[12px]" style={{ borderColor: "rgba(53,224,208,.35)", background: "rgba(8,16,32,.7)" }}>
                <Flag className="h-4 w-4 text-teal-300" />
                <span className="flex-1 text-slate-200">You're on <b className="text-white">{campaignById(party.campaignId)?.title}</b> with {party.members.length}.</span>
                <button onClick={() => { setShowBoard(false); setShowParty(true); }} className="rounded-lg px-2.5 py-1.5 text-[12px] font-bold text-slate-900" style={{ background: "#35e0d0" }}>Open party</button>
              </div>
            )}

            {/* open requests */}
            <div className="mb-1 text-[11px] font-bold uppercase tracking-widest text-teal-300/70">Open requests</div>
            {board.length === 0 && <p className="py-6 text-center text-[12px] text-slate-500">No open requests yet. Post one above and a traveller can join you.</p>}
            <div className="flex flex-col gap-2">
              {board.map((b) => {
                const mine = b.byId === myId();
                const camp = b.dir === "host" ? campaignById(b.campaignId) : null;
                const dm = camp ? difficultyMeta[camp.difficulty] : null;
                const full = b.size >= b.max;
                return (
                  <div key={b.id} data-testid={`post-${b.id}`} className="rounded-xl border p-2.5" style={{ borderColor: mine ? "rgba(255,196,107,.5)" : "rgba(53,224,208,.22)", background: "rgba(8,16,32,.6)" }}>
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-bold text-white">{b.byName}</span>
                      {mine && <span className="rounded px-1.5 py-0.5 text-[9px] font-black uppercase text-amber-300" style={{ background: "rgba(255,196,107,.14)" }}>You</span>}
                      <span className="ml-auto text-[10px] text-slate-400">{b.dir === "host" ? `${b.size}/${b.max}` : "seeking"}</span>
                    </div>
                    <p className="mt-0.5 text-[12px] text-teal-100/90">
                      {b.dir === "host"
                        ? <>Hosting <b className="text-white">{camp?.title || "a campaign"}</b>{dm && <span className="ml-1.5 rounded px-1.5 py-0.5 text-[9px] font-black uppercase" style={{ color: dm.color, background: dm.color + "22" }}>{dm.label}</span>}</>
                        : <span className="text-slate-300">Looking to join any campaign</span>}
                    </p>
                    {(b.newbie || (b.tags && b.tags.length > 0)) && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {b.newbie && <span className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase text-emerald-300" style={{ background: "rgba(91,232,154,.14)" }}>New-friendly</span>}
                        {(b.tags || []).map((tg: string) => <span key={tg} className="rounded-full px-2 py-0.5 text-[9px] font-semibold text-violet-200/90" style={{ background: "rgba(178,108,255,.13)" }}>{tg}</span>)}
                      </div>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      {mine ? (
                        <button onClick={cancelPost} data-testid={`post-cancel-${b.id}`} className="rounded-lg border px-3 py-1.5 text-[12px] font-bold text-rose-300" style={{ borderColor: "rgba(255,93,125,.4)" }}>Cancel post</button>
                      ) : b.dir === "host" ? (
                        <button onClick={() => askToJoin(b.id)} disabled={full} data-testid={`post-ask-${b.id}`} className="rounded-lg px-3 py-1.5 text-[12px] font-bold text-slate-900 disabled:opacity-40" style={{ background: "#35e0d0" }}>{full ? "Full" : "Ask to join"}</button>
                      ) : (
                        <button onClick={() => inviteSeeker(b.id)} disabled={!party || (party as any)?.hostId !== myId()} data-testid={`post-invite-${b.id}`} className="rounded-lg px-3 py-1.5 text-[12px] font-bold text-slate-900 disabled:opacity-40" style={{ background: "#ffc46b" }} title={!party ? "Host a run first, then you can invite" : ""}>Invite along</button>
                      )}
                      {!mine && <button onClick={() => blockPlayer(b.byId)} data-testid={`post-block-${b.id}`} className="ml-auto text-[10px] text-slate-500 hover:text-rose-300">Hide</button>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Party panel — shared campaign progress + members + advance/leave */}
      {showParty && party && (() => {
        const camp = campaignById(party.campaignId);
        const step = camp?.steps[party.step];
        const stepLabel = step?.label ?? "Wrapping up";
        const stepRing = step?.ring ?? 0;
        const offRing = stepRing !== curRingUi;
        return (
          <div className="absolute right-3 top-14 z-[55] w-[260px] rounded-xl border p-3" style={{ borderColor: "rgba(53,224,208,.4)", background: "rgba(8,16,32,.97)", boxShadow: "0 10px 30px rgba(0,0,0,.5)" }} data-testid="party-panel">
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-teal-300"><Flag className="h-3.5 w-3.5" /> Party</span>
              <button onClick={() => setShowParty(false)} className="text-slate-400 hover:text-slate-200"><X className="h-4 w-4" /></button>
            </div>
            <div className="text-[13px] font-bold text-white">{camp?.title || "Campaign"}</div>
            <div className="mt-1 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,.1)" }}>
                <div className="h-full rounded-full" style={{ width: `${Math.round((party.step / party.steps) * 100)}%`, background: "linear-gradient(90deg,#35e0d0,#7ff5e8)" }} />
              </div>
              <span className="text-[10px] font-bold text-teal-200">{party.step}/{party.steps}</span>
            </div>
            <div className="mt-2 flex items-start gap-1.5 rounded-lg px-2 py-1.5 text-[12px] text-teal-100" style={{ background: "rgba(53,224,208,.08)" }}>
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-300" /> <span>{stepLabel}</span>
            </div>
            {offRing && <div className="mt-1.5 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-amber-200" style={{ background: "rgba(255,196,107,.1)" }}>⛵ This step is on <b className="text-white">{ringName(stepRing)}</b> — sail there with your crew.</div>}
            <button onClick={advanceStep} disabled={offRing} data-testid="party-advance" className="mt-2 w-full rounded-lg py-2 text-[12px] font-extrabold text-slate-900 disabled:opacity-40" style={{ background: "linear-gradient(90deg,#35e0d0,#7ff5e8)" }}>{offRing ? `Sail to ${ringName(stepRing)} first` : "We're here → next step"}</button>
            <div className="mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Crew ({party.members.length})</div>
            <div className="mt-1 flex flex-col gap-1">
              {party.members.map((mm) => (
                <div key={mm.id} className="flex items-center gap-1.5 text-[12px] text-slate-200">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#35e0d0" }} />
                  {mm.name}{mm.id === party.hostId && <span className="text-[9px] font-bold uppercase text-amber-300">host</span>}{mm.id === myId() && <span className="text-[9px] text-slate-500">(you)</span>}
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <button onClick={() => { setShowChat(true); setChatScope("party"); setShowParty(false); }} className="flex-1 rounded-lg border py-1.5 text-[11px] font-bold text-teal-200" style={{ borderColor: "rgba(53,224,208,.4)" }}>Party chat</button>
              <button onClick={leaveParty} data-testid="party-leave" className="flex-1 rounded-lg border py-1.5 text-[11px] font-bold text-rose-300" style={{ borderColor: "rgba(255,93,125,.4)" }}>Leave</button>
            </div>
          </div>
        );
      })()}

      {showCreator && (
        <CharacterCreator
          mode={creatorMode}
          initial={avatarRef.current}
          initialName={nameRef.current === "Traveller" ? "" : nameRef.current}
          sparks={sparksUi}
          owned={owned}
          onBuy={buyCosmetic}
          onConfirm={onConfirm}
          onCancel={creatorMode === "edit" ? () => setShowCreator(false) : undefined}
        />
      )}
    </div>
  );
}
