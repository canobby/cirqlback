import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Zap, Pencil, ScrollText, Users, X, MessageCircle, Send, Compass, Flag, MapPin, Smile, ChevronsUp, Backpack, Hammer, Armchair, ZoomIn, ZoomOut, Camera, Share2, SlidersHorizontal, Sun, Music, Volume2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { CirqlWorldEngine, LAND_TIERS, type QuestLogRow } from "@/game/cirql-world-engine";
import type { Btn } from "@/game/retro-engine";
import { loadAvatarLS, saveAvatarLS, DEFAULT_AVATAR, type AvatarConfig } from "@/game/avatar";
import { Joystick } from "@/components/joystick";
import { CharacterCreator } from "@/components/cirql/character-creator";
import { ARCADE_GAMES } from "@/game/registry";
import { CAMPAIGNS, campaignById, MATCH_TAGS, difficultyMeta } from "@/game/cirql-campaigns";
import { dailyForDate, activeEvent, todayStr, type DailyTask, type CirqlEvent } from "@/game/cirql-daily";
import { ringName } from "@/game/cirql-ring-gen";
import { EMOTES, PAIR_GESTURES } from "@/game/cirql-emotes";
import { WAKE_CUTSCENE, campaignCutscene, worldEnergyCutscene } from "@/game/cirql-cutscenes";
import { DECOR, decorById, decorPriceKey, CATEGORIES, type DecorCategory } from "@/game/cirql-decor";

const SPARK_PER_PLAY = 2;
// CIRQLSPACE land-growth tiers (Phase D) — cozy → estate. First two are free (a gift + a
// build milestone); the rest are an escalating SPARQS sink up to the estate cap.
const LAND_META: { label: string; cost: number; milestone?: "gift" | "build10" }[] = [
  { label: "Cozy Plot", cost: 0 },                     // 0 — start
  { label: "Garden", cost: 0, milestone: "gift" },     // 1 — free gift
  { label: "Yard", cost: 0, milestone: "build10" },    // 2 — free after placing 10 things
  { label: "Grounds", cost: 30 },
  { label: "Meadow", cost: 70 },
  { label: "Estate", cost: 140 },
  { label: "Domain", cost: 260 },                      // 6 — estate cap
];
const CADE_GAMES = ARCADE_GAMES.filter((g) => g.status === "live");

// CIRQL — the flagship world (M1 world + M2 identity/persistence).
// Walk The Hearth; your character + position resume across sessions. New players
// get a character-creation step first; everyone can re-edit their look.
const INTRO_LS = "cirql_intro_v1";

type StartDest = "home" | "last" | "arcade";
interface CirqlState { ring: number; maxRing?: number; x: number; y: number; quests?: any; lit?: string[]; litForQuest?: string[]; doneOnce?: string[]; doneCampaigns?: string[]; avatar: AvatarConfig; name: string; seenIntro: boolean; sparks: number; cirqlMembers?: number; worldEnergy?: number; playsToday?: number; playDay?: string; owned?: string[]; decor?: { item: string; x: number; y: number }[]; terrain?: Record<string, string>; landTier?: number; daily?: { day: string; done: boolean; streak: number; lastDone: string }; arcadeVisited?: boolean; startPref?: StartDest | "ask"; settings?: GameSettings; }
interface GameSettings { brightness: number; music: number; sfx: number; reduce: boolean; smooth: boolean; pixel: number; }
const DEFAULT_SETTINGS: GameSettings = { brightness: 1, music: 0.7, sfx: 0.8, reduce: false, smooth: false, pixel: 1.5 };
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
  const [startPick, setStartPick] = useState<{ canArcade: boolean } | null>(null);   // startup location picker
  const [showPeers, setShowPeers] = useState(false);                                  // "who's here" popup (online badge tap)
  const [showSettings, setShowSettings] = useState(false);                            // game settings panel
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const settingsRef = useRef<GameSettings>(DEFAULT_SETTINGS);
  const [startRemember, setStartRemember] = useState(true);
  const arcadeVisitedRef = useRef(false);                  // has the player reached CirqlCade before? (gates the arcade shortcut)
  const startPrefRef = useRef<StartDest | "ask">("ask");   // remembered startup default
  const [showCirql, setShowCirql] = useState(false);       // your Cirql / invite panel
  const [showInventory, setShowInventory] = useState(false);  // Inventory: stock + SPARQS + how-to (CHR-270)
  const [showDecor, setShowDecor] = useState(false);       // CIRQLSPACE build palette (CHR-259)
  const [decorTool, setDecorTool] = useState<string>("");  // selected décor id, "remove", or ""
  const [decorCat, setDecorCat] = useState<DecorCategory>("nature");   // active build category (CHR-272)
  const [snapOn, setSnapOn] = useState(false);             // grid-snap placement (CHR-273)
  const [buildMode, setBuildMode] = useState<"place" | "paint">("place");   // Phase C terrain paint
  const [paintTile, setPaintTile] = useState("s");
  const [brushSize, setBrushSize] = useState(1);
  const [decorCount, setDecorCount] = useState(0);         // placed-piece count (reactive)
  const landTierRef = useRef(0);                           // CIRQLSPACE land tier (Phase D)
  const [landTierUi, setLandTierUi] = useState(0);
  const [visiting, setVisiting] = useState<string | null>(null);   // name of the CIRQLSPACE you're visiting (Phase E)
  const [seated, setSeated] = useState(false);                     // free-sit pose (Phase H1) — mirrors engine for the button
  const [zoomUi, setZoomUi] = useState(1);                         // live zoom level (Phase H2) — mirrors engine for the control
  const [dioramaOn, setDioramaOn] = useState(false);               // tilted-3/4 beauty shot open (Phase H3)
  const [spaceOpen, setSpaceOpen] = useState(true);                // your space: open to anyone (true) or invite-only
  const [spaceInvites, setSpaceInvites] = useState<{ fromId: string; fromName: string }[]>([]);   // pending invites to visit
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
  const [showEmotes, setShowEmotes] = useState(false);      // emote wheel (CHR-260)
  const [nearPlayer, setNearPlayer] = useState<{ id: string; name: string } | null>(null);   // nearby traveller → "Together" panel (I4)
  const [chatDraft, setChatDraft] = useState("");
  const [chatScope, setChatScope] = useState<"global" | "party" | "dm">("global");
  const [feed, setFeed] = useState<{ key: number; name: string; text: string; me: boolean; party: boolean }[]>([]);
  const [unread, setUnread] = useState<{ global: number; party: number; dm: number }>({ global: 0, party: 0, dm: 0 });   // per-channel unread (CHR-249)
  const showChatRef = useRef(false);        // live mirrors so the ws handler reads current UI focus
  const chatScopeRef = useRef<"global" | "party" | "dm">("global");
  const feedKey = useRef(0);

  // M8 CHR-248 — 1:1 Direct Messages (request/accept gated, session-scoped)
  const [peers, setPeers] = useState<{ id: string; name: string }[]>([]);          // travellers online on my ring
  const [dmReqs, setDmReqs] = useState<{ fromId: string; fromName: string }[]>([]); // incoming DM requests
  const [dmThreads, setDmThreads] = useState<Record<string, { name: string; msgs: { key: number; mine: boolean; text: string }[] }>>({});
  const [activeDm, setActiveDm] = useState<string | null>(null);                    // partner id whose thread is open
  const activeDmRef = useRef<string | null>(null);

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

  // keep live mirrors of the chat focus so the (once-created) ws handler can tell whether
  // an incoming message is "seen" (chat open on its channel) or should mark unread.
  useEffect(() => { showChatRef.current = showChat; if (showChat) setUnread((u) => ({ ...u, [chatScope]: 0 })); }, [showChat, chatScope]);
  useEffect(() => { chatScopeRef.current = chatScope; }, [chatScope]);
  useEffect(() => { activeDmRef.current = activeDm; }, [activeDm]);

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
    engineRef.current?.toast(`✦ Daily done — +${reward} sparqs${ev ? " (festival!)" : ""} · ${dr.streak}-day streak`);
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
    broadcastBuild();   // share your CIRQLSPACE build so travellers can drop in (Phase E)
  };
  // send routes to the active channel (Global / Party / a DM thread)
  const sendMsg = () => {
    const t = chatDraft.trim(); if (!t) return;
    if (chatScope === "dm" && activeDm) wsSend({ t: "dm", toId: activeDm, text: t });
    else wsSend({ t: "chat", text: t, scope: party && chatScope === "party" ? "party" : "global" });
    setChatDraft("");
  };
  const shareLight = (id: string) => wsSend({ t: "light", to: id });
  const playEmote = (id: string) => { engineRef.current?.playEmote(id); setShowEmotes(false); };
  const playPair = (id: string) => engineRef.current?.requestPair(id);   // offer a paired social gesture (I4)

  // Claim sparqs earned by playing arcade Dailies (banked in the server sparq wallet).
  // Called on load + when returning from a cabinet, so arcade play feeds your CIRQL world.
  const claimArcadeSparqs = () => {
    if (!loggedIn) return;
    fetch("/api/game/sparqs/claim", { method: "POST", credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const n = Number(d?.claimed) || 0; if (n <= 0) return;
        sparksRef.current += n; energyRef.current = Math.min(1, energyRef.current + n * 0.01);
        engineRef.current?.setStats({ sparks: sparksRef.current, energy: energyRef.current });
        setSparksUi(sparksRef.current);
        engineRef.current?.toast(`✦ +${n} sparq${n > 1 ? "s" : ""} earned in the arcade`);
        persist();
      })
      .catch(() => { /* best-effort */ });
  };

  // DM request/accept handshake (CHR-248)
  const requestDm = (id: string) => { wsSend({ t: "dm:request", toId: id }); engineRef.current?.toast("DM request sent"); };
  const acceptDmReq = (fromId: string) => { wsSend({ t: "dm:accept", fromId }); setDmReqs((r) => r.filter((x) => x.fromId !== fromId)); };
  const declineDmReq = (fromId: string) => { wsSend({ t: "dm:decline", fromId }); setDmReqs((r) => r.filter((x) => x.fromId !== fromId)); };
  const openDm = (id: string) => { setChatScope("dm"); setActiveDm(id); setShowChat(true); };

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
  const blockPlayer = (id: string) => { blockedRef.current.add(id); wsSend({ t: "party:report", targetId: id }); setBoard((b) => b.filter((x) => x.byId !== id)); setAsks((a) => a.filter((x) => x.fromId !== id)); setInvites((v) => v.filter((x) => x.fromId !== id)); setPeers((p) => p.filter((x) => x.id !== id)); setDmReqs((r) => r.filter((x) => x.fromId !== id)); setActiveDm((a) => (a === id ? null : a)); engineRef.current?.toast("Player hidden & reported"); };
  // A "share a light" landed (from someone near you): light a lantern on your Hearth,
  // once per distinct traveller, capped at your Cirql's 12.
  const receiveLight = (id: string, name: string) => {
    const eng = engineRef.current; if (!eng) return;
    if (sharedLightsRef.current.has(id)) { eng.toast(`${name}'s light already shines on your CIRQLSPACE`); return; }
    sharedLightsRef.current.add(id);
    if (membersRef.current < 12) { membersRef.current += 1; setMembers(membersRef.current); eng.setStats({ cirqlLit: membersRef.current }); }
    eng.toast(`✦ You and ${name} shared a light`);
    persist();
  };

  const buildState = (): CirqlState => {
    const s = engineRef.current?.getState() ?? posRef.current;
    return { ring: s.ring, maxRing: (s as any).maxRing ?? 0, x: s.x, y: s.y, quests: (s as any).quests, lit: (s as any).lit, litForQuest: (s as any).litForQuest, doneOnce: (s as any).doneOnce, doneCampaigns: Array.from(doneCampaignsRef.current), avatar: avatarRef.current, name: nameRef.current, seenIntro: seenIntroRef.current, sparks: sparksRef.current, cirqlMembers: membersRef.current, worldEnergy: energyRef.current, playsToday: playsRef.current.n, playDay: playsRef.current.day, owned: ownedRef.current, decor: (s as any).decor ?? [], terrain: (s as any).terrain ?? {}, landTier: landTierRef.current, daily: dailyRef.current, arcadeVisited: arcadeVisitedRef.current, startPref: startPrefRef.current, settings: settingsRef.current };
  };
  // Apply game settings to the engine (brightness + reduced motion) and remember them.
  const applySettings = (s: GameSettings, persistNow = false) => {
    settingsRef.current = s; setSettings(s);
    engineRef.current?.setBrightness(s.brightness);
    engineRef.current?.setReduceMotion(s.reduce);
    engineRef.current?.setSmoothScale(s.smooth);
    engineRef.current?.setPixelSize(s.pixel);
    if (persistNow) persist();
  };
  // Apply a startup destination (from the picker) + sync the ring-dependent UI.
  const applyStart = (dest: StartDest) => {
    const eng = engineRef.current; if (!eng) return;
    eng.startAt(dest);
    const s = eng.getState();
    setCurRingUi(s.ring); maxRingRef.current = Math.max(maxRingRef.current, (s as any).maxRing ?? 0);
    posRef.current = { ring: s.ring, x: s.x, y: s.y }; setQuestRows(eng.getQuestLog());
  };
  // The player chose a start location. Relocate, optionally remember it, and (re)join presence there.
  const pickStart = (dest: StartDest) => {
    if (startRemember) startPrefRef.current = dest; else startPrefRef.current = "ask";
    applyStart(dest); setStartPick(null);
    presenceReadyRef.current = true;
    if (joinedRef.current) { const st = engineRef.current!.getState(); wsSend({ t: "move", ring: st.ring, x: st.x, y: st.y, dir: "down", pose: "stand" }); }
    else tryJoin();
    persist();
  };
  // Open the CirqlCade hall + record the first visit (unlocks the arcade startup shortcut).
  const openHall = () => { setHallOpen(true); if (!arcadeVisitedRef.current) { arcadeVisitedRef.current = true; persist(); } };
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
    eng.onInteract = (kind) => { if (kind === "wonders") openHall(); };   // step into CirqlCade
    eng.onLocalMove = (ring, x, y) => { posRef.current = { ring, x, y }; scheduleSave(); };
    eng.onSail = (ring, maxRing) => { const st = eng.getState(); posRef.current = { ring, x: st.x, y: st.y }; setCurRingUi(ring); if (maxRing > maxRingRef.current) { maxRingRef.current = maxRing; progressDaily("voyage"); } persist(); };   // reaching a new ring is a big save point
    // quests: grant the sparks reward on completion, persist progress on any change
    eng.onQuestComplete = (q, first) => {
      const reward = first ? q.reward.sparks : Math.max(1, Math.round(q.reward.sparks * 0.25));   // repeats pay ~a quarter
      sparksRef.current += reward; eng.setStats({ sparks: sparksRef.current }); setSparksUi(sparksRef.current);
      eng.toast(first ? `✦ ${q.name} — +${reward} sparqs` : `✦ ${q.name} again — +${reward} sparqs`);
      if (first && q.id.startsWith("ring-")) progressDaily("explore");   // only the first counts toward the daily
      persist();
    };
    eng.onQuestChange = () => { setQuestRows(eng.getQuestLog()); scheduleSave(); };
    eng.onDecorChange = () => { setDecorCount(eng.getDecor().length); broadcastBuild(); persist(); };   // place/paint/expand → live to visitors (Phase E)

    // M8 — live presence socket: broadcast our position + share-a-light, and render
    // every other traveller sharing the ring (adapted from the /ws/town prototype).
    const proto = location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${proto}://${location.host}/ws/cirql`);
    wsRef.current = ws;
    eng.onPresence = (ring, x, y, facing, pose) => { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ t: "move", ring, x, y, dir: facing, pose })); };
    eng.onShareLight = (id) => shareLight(id);
    eng.onEmote = (emote) => wsSend({ t: "emote", emote });
    eng.onNearPlayer = (p) => setNearPlayer(p);                        // show/hide the "Together" panel (I4)
    eng.onOnlineTap = () => { setShowPeers((v) => !v); setShowSettings(false); };   // tap online badge → who's here
    eng.onPairGesture = (id, g) => wsSend({ t: "pair", to: id, g });   // offer a paired social gesture
    // light gathered while sailing → sparqs (CHR-262), capped small so it can't be farmed
    eng.onVoyageReward = (light) => {
      const gain = Math.max(0, Math.min(6, Math.round(light)));
      if (gain <= 0) return;
      sparksRef.current += gain; energyRef.current = Math.min(1, energyRef.current + gain * 0.01);
      eng.setStats({ sparks: sparksRef.current, energy: energyRef.current }); setSparksUi(sparksRef.current);
      eng.toast(`✦ +${gain} sparq${gain > 1 ? "s" : ""} — light gathered at sea`);
      persist();
    };
    eng.onPartyArrive = () => { const p = partyRef.current; if (p) wsSend({ t: "party:advance", step: p.step }); };
    eng.onSeatChange = (s) => setSeated(s);   // keep the Sit button in sync (auto-stand on walk) — Phase H1
    eng.onZoomChange = (z) => setZoomUi(z);   // keep the zoom % readout in sync (wheel/pinch/reset) — Phase H2
    eng.onDioramaChange = (on) => setDioramaOn(on);   // sync the beauty-shot overlay (tap-to-close) — Phase H3
    const refreshCount = () => { const n = eng.remoteCount() + 1; setOnline(n); eng.setStats({ online: n }); };
    ws.onopen = () => { setConnected(true); tryJoin(); };
    ws.onclose = () => { setConnected(false); joinedRef.current = false; };
    ws.onmessage = (e) => {
      let m: any; try { m = JSON.parse(e.data); } catch { return; }
      if (m.t === "welcome") { myIdRef.current = m.id; eng.clearRemotes(); (m.players || []).forEach((p: any) => eng.addRemote(p)); setPeers((m.players || []).map((p: any) => ({ id: p.id, name: p.name })).filter((p: any) => !blockedRef.current.has(p.id))); refreshCount(); }
      else if (m.t === "join") { eng.addRemote(m); refreshCount(); if (!blockedRef.current.has(m.id)) { setPeers((ps) => ps.some((x) => x.id === m.id) ? ps : [...ps, { id: m.id, name: m.name }]); pushFeed("", `${m.name} arrived`); } }
      else if (m.t === "move") { eng.moveRemote(m.id, m.x, m.y, m.dir, m.pose); }
      else if (m.t === "leave") { eng.removeRemote(m.id); setPeers((ps) => ps.filter((x) => x.id !== m.id)); refreshCount(); }
      else if (m.t === "chat") {
        if (blockedRef.current.has(m.id) && m.id !== myIdRef.current) return;
        const isP = m.channel === "party"; const mine = m.id === myIdRef.current;
        if (mine) { eng.sayLocal(m.text); pushFeed(m.name, m.text, true, isP); }
        else { eng.chatRemote(m.id, m.text); pushFeed(m.name, m.text, false, isP); }
        // unread: count messages not currently in view (chat closed, or on the other channel) — never your own
        const ch: "global" | "party" = isP ? "party" : "global";
        if (!mine && !(showChatRef.current && chatScopeRef.current === ch)) setUnread((u) => ({ ...u, [ch]: u[ch] + 1 }));
      }
      else if (m.t === "lit") { receiveLight(m.id, m.name); }
      else if (m.t === "emote") { if (!blockedRef.current.has(m.id)) eng.emoteRemote(m.id, m.emote); }
      else if (m.t === "paired") { if (!blockedRef.current.has(m.withId)) eng.startPair(m.withId, m.g); }   // synced paired gesture (I4)
      // ---- CIRQLSPACE live parties (Phase E) ----
      else if (m.t === "visit:data") { if (!blockedRef.current.has(m.withId)) { eng.startVisit(m.withName, m); setVisiting(m.withName || "Traveller"); setShowDecor(false); setShowChat(false); setShowCirql(false); setShowInventory(false); } }
      else if (m.t === "visit:build") { eng.updateVisit(m); }   // host edited while you watch
      else if (m.t === "visit:denied") { eng.toast(`${m.name || "That traveller"}'s space is invite-only`); }
      else if (m.t === "visit:full") { eng.toast(`${m.name || "That"} space is full (8 max)`); }
      else if (m.t === "space:closed") { eng.endVisit(); setVisiting(null); eng.toast(`${m.name || "The host"} closed the space`); }
      else if (m.t === "space:invited") { if (!blockedRef.current.has(m.fromId)) { setSpaceInvites((v) => v.some((x) => x.fromId === m.fromId) ? v : [...v, { fromId: m.fromId, fromName: m.fromName }]); eng.toast(`${m.fromName} invited you to their CIRQLSPACE`); } }
      else if (m.t === "space:invite:ok") { eng.toast(`Invited ${m.toName}`); }
      else if (m.t === "space:mode") { setSpaceOpen(!!m.open); }
      // ---- Direct Messages (CHR-248) ----
      else if (m.t === "dm:request") { if (!blockedRef.current.has(m.fromId)) { setDmReqs((r) => r.some((x) => x.fromId === m.fromId) ? r : [...r, { fromId: m.fromId, fromName: m.fromName }]); if (!(showChatRef.current && chatScopeRef.current === "dm")) setUnread((u) => ({ ...u, dm: u.dm + 1 })); eng.toast(`${m.fromName} wants to message you`); } }
      else if (m.t === "dm:open") { setDmThreads((th) => th[m.withId] ? th : { ...th, [m.withId]: { name: m.withName, msgs: [] } }); openDm(m.withId); }
      else if (m.t === "dm:declined") { eng.toast(`${m.byName} isn't available to chat`); }
      else if (m.t === "dm") {
        const partner = m.from === myIdRef.current ? m.to : m.from; const mine = m.from === myIdRef.current;
        if (blockedRef.current.has(partner)) return;
        setDmThreads((th) => { const cur = th[partner] || { name: m.fromName, msgs: [] }; return { ...th, [partner]: { name: cur.name || m.fromName, msgs: [...cur.msgs.slice(-40), { key: feedKey.current++, mine, text: m.text }] } }; });
        if (!mine && !(showChatRef.current && chatScopeRef.current === "dm" && activeDmRef.current === partner)) setUnread((u) => ({ ...u, dm: u.dm + 1 }));
      }
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
        eng.playCutscene(campaignCutscene(camp?.title || "Campaign", rw));   // celebration sting (CHR-264)
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
      arcadeVisitedRef.current = !!st?.arcadeVisited; startPrefRef.current = st?.startPref ?? "ask";
      applySettings({ ...DEFAULT_SETTINGS, ...(st?.settings || {}) });   // brightness + reduced-motion prefs
      ownedRef.current = Array.isArray(st?.owned) ? st!.owned! : []; setOwned(ownedRef.current); setSparksUi(sparksRef.current);
      maxRingRef.current = st?.maxRing ?? 0; setCurRingUi(st?.ring ?? 0);
      doneCampaignsRef.current = new Set(Array.isArray(st?.doneCampaigns) ? st!.doneCampaigns! : []);
      if (st?.daily && typeof st.daily.day === "string") dailyRef.current = { day: st.daily.day, done: !!st.daily.done, streak: +st.daily.streak || 0, lastDone: st.daily.lastDone || "" };
      refreshDaily();
      eng.setLocal(name, avatar); eng.setStats({ sparks: sparksRef.current, cirqlLit: membersRef.current, cirqlTotal: 12, online: 1, energy: energyRef.current });
      eng.applyState({ ring: st?.ring ?? 0, maxRing: st?.maxRing ?? 0, x: st?.x, y: st?.y, quests: st?.quests, lit: st?.lit, litForQuest: st?.litForQuest, doneOnce: st?.doneOnce, decor: st?.decor, terrain: st?.terrain, landTier: st?.landTier });
      landTierRef.current = eng.getLandTier(); setLandTierUi(landTierRef.current);
      setDecorCount(eng.getDecor().length);
      if (st && typeof st.x === "number") posRef.current = { ring: st.ring ?? 0, x: st.x, y: st.y ?? 0 };
      setQuestRows(eng.getQuestLog());
      if (!seen) {
        // first run → creator + onboarding; presence waits until they finish (onConfirm)
        setCreatorMode("create"); setShowCreator(true); presenceReadyRef.current = false; tryJoin();
      } else {
        // returning player → the startup location picker (unless they've saved a default).
        // The arcade shortcut needs onboarding done + a prior CirqlCade visit.
        const canArcade = arcadeVisitedRef.current && (st?.maxRing ?? 0) >= 1;
        const hasSave = !!st && typeof st.x === "number";
        const pref = startPrefRef.current;
        if (pref !== "ask" && (pref !== "arcade" || canArcade)) {
          presenceReadyRef.current = true; applyStart(pref); tryJoin();     // saved default → jump straight in
        } else if (hasSave || canArcade) {
          presenceReadyRef.current = false;                                 // hold presence until they pick
          setStartRemember(true); setStartPick({ canArcade });
        } else {
          presenceReadyRef.current = true; tryJoin();                       // nothing to choose → just start
        }
      }
    };
    if (loggedIn) {
      loadedRef.current = true;
      fetch("/api/game/progress?gameId=cirql", { credentials: "include" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { applyIdentity(d?.state || null); claimArcadeSparqs(); })   // sweep up arcade-earned sparqs
        .catch(() => applyIdentity(null));
    } else if (!loadedRef.current) {
      loadedRef.current = true;
      applyIdentity(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn]);

  // Desktop hop key (CHR-263). Base engine keys are all taken (E/Space=interact,
  // X=run), so bind a free key here on the CIRQL page only.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.code === "KeyC" || e.code === "KeyH") && !e.repeat) engineRef.current?.jump();
      if (e.code === "KeyG" && !e.repeat) { engineRef.current?.toggleSit(); }   // G = sit/stand (Phase H1)
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Live zoom (Phase H2): mouse wheel + two-finger pinch on the canvas → engine zoom.
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const onWheel = (e: WheelEvent) => { e.preventDefault(); engineRef.current?.zoomBy(e.deltaY < 0 ? 1.12 : 0.89); setZoomUi(engineRef.current?.getZoom() ?? 1); };
    let pinchBase = 0, pinchZoom = 1;
    const dist = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const onTS = (e: TouchEvent) => { if (e.touches.length === 2) { pinchBase = dist(e.touches); pinchZoom = engineRef.current?.getZoom() ?? 1; } };
    const onTM = (e: TouchEvent) => { if (e.touches.length === 2 && pinchBase > 0) { e.preventDefault(); const r = dist(e.touches) / pinchBase; engineRef.current?.setZoomTarget(pinchZoom * r); setZoomUi(engineRef.current?.getZoom() ?? 1); } };
    const onTE = (e: TouchEvent) => { if (e.touches.length < 2) pinchBase = 0; };
    cv.addEventListener("wheel", onWheel, { passive: false });
    cv.addEventListener("touchstart", onTS, { passive: false });
    cv.addEventListener("touchmove", onTM, { passive: false });
    cv.addEventListener("touchend", onTE);
    return () => { cv.removeEventListener("wheel", onWheel); cv.removeEventListener("touchstart", onTS); cv.removeEventListener("touchmove", onTM); cv.removeEventListener("touchend", onTE); };
  }, []);

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
    // first-run onboarding (CHR-269): a short "welcome to your CIRQLSPACE" cutscene. The
    // guide NPC (Cirqla) teaches building; the world tutorials wait for Ferra in the Town.
    if (firstRun) engineRef.current?.playCutscene(WAKE_CUTSCENE);
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
        const filled = energyRef.current >= 1;
        if (filled) energyRef.current = 0.06;
        engineRef.current?.setStats({ sparks: sparksRef.current, energy: energyRef.current });
        setSparksUi(sparksRef.current);
        if (filled) engineRef.current?.playCutscene(worldEnergyCutscene());   // milestone cinematic (CHR-264)
        else engineRef.current?.toast(`+${earned} sparq${earned > 1 ? "s" : ""}`);
      } else {
        engineRef.current?.toast("Rest a while — more sparqs tomorrow.");
      }
      progressDaily("attune");   // playing a Wonder can satisfy today's daily
      persist();
      claimArcadeSparqs();        // sweep up any sparqs that cabinet's Daily just banked
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
    engineRef.current?.present("🎁", "#b26cff");   // item-get: raise your new unlock overhead (I6)
    persist();
    return true;
  };

  // ---- Hearth décor (CHR-259) ----
  const decorOwned = (id: string) => { const def = decorById[id]; return !!def && (def.price === 0 || ownedRef.current.includes(decorPriceKey(id))); };
  // Share your whole CIRQLSPACE build (décor + terrain + land tier) so friends can drop in live (Phase E).
  const broadcastBuild = () => { const e = engineRef.current; if (e) wsSend({ t: "build", decor: e.getDecor(), terrain: e.getTerrain(), landTier: e.getLandTier() }); };
  const openDecorate = () => {
    if (curRingUi !== 0) { engineRef.current?.toast("Sail home to CIRQLSPACE to decorate"); return; }
    setShowDecor(true); setDecorTool(""); engineRef.current?.beginDecorEdit("");
  };
  const closeDecorate = () => { setShowDecor(false); setDecorTool(""); setBuildMode("place"); engineRef.current?.endDecorEdit(); engineRef.current?.endPaint(); };
  // Phase C terrain paint mode
  const switchToPaint = () => { setBuildMode("paint"); engineRef.current?.beginPaint(paintTile); };
  const switchToPlace = () => { setBuildMode("place"); engineRef.current?.endPaint(); engineRef.current?.beginDecorEdit(decorTool && decorTool !== "remove" ? decorTool : ""); };
  const pickPaintTile = (t: string) => { setPaintTile(t); setBuildMode("paint"); engineRef.current?.beginPaint(t); };
  const pickBrush = (n: number) => { setBrushSize(n); engineRef.current?.setBrush(n); };
  const pickDecor = (id: string) => {
    const def = decorById[id]; if (!def) return;
    if (!decorOwned(id)) { if (!buyCosmetic(decorPriceKey(id), def.price)) { engineRef.current?.toast(`Need ${def.price} sparqs for the ${def.name}`); return; } engineRef.current?.toast(`✦ ${def.name} unlocked`); }
    setDecorTool(id); engineRef.current?.setDecorTool(id);
  };
  const pickRemove = () => { setDecorTool("remove"); engineRef.current?.setDecorTool(""); };
  // Expand your CIRQLSPACE to the next land tier (Phase D) — free gift / build milestone / SPARQS.
  const expandLand = () => {
    const eng = engineRef.current; if (!eng) return;
    const next = landTierRef.current + 1;
    if (next >= LAND_META.length) { eng.toast("Your CIRQLSPACE is at its full size ✦"); return; }
    const m = LAND_META[next];
    if (m.milestone === "build10" && (eng.getDecor().length < 10)) { eng.toast("Place 10 things first to earn this expansion"); return; }
    if (m.cost > 0) {
      if (sparksRef.current < m.cost) { eng.toast(`Need ${m.cost} sparqs to expand to ${m.label}`); return; }
      sparksRef.current -= m.cost; setSparksUi(sparksRef.current); eng.setStats({ sparks: sparksRef.current });
    }
    landTierRef.current = next; setLandTierUi(next); eng.setLandTier(next);
    eng.toast(`✦ Your CIRQLSPACE grew — ${m.label}!`);
    persist();
  };
  const requestVisit = (id: string) => { wsSend({ t: "visit", toId: id }); engineRef.current?.toast("Knocking…"); };
  const leaveVisit = () => { wsSend({ t: "space:home" }); engineRef.current?.endVisit(); setVisiting(null); };
  // Capture the diorama frame → a shareable postcard (Phase H4). The label is composited onto
  // the same canvas, so a straight capture is the finished card. Share sheet on mobile; download else.
  const sharePostcard = async () => {
    const cv = canvasRef.current; if (!cv) return;
    try {
      const blob: Blob | null = await new Promise((res) => cv.toBlob((b) => res(b), "image/png"));
      if (!blob) throw new Error("no blob");
      const file = new File([blob], "my-cirqlspace.png", { type: "image/png" });
      const nav = navigator as any;
      if (nav.canShare && nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], title: "My CIRQLSPACE", text: "Come visit my CIRQLSPACE in CIRQLVERSE ✦" });
        engineRef.current?.toast("Postcard shared ✦");
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = "my-cirqlspace.png"; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
        engineRef.current?.toast("Postcard saved ✦");
      }
    } catch { engineRef.current?.toast("Couldn't make the postcard"); }
  };
  const toggleSpaceOpen = () => wsSend({ t: "space:mode", open: !spaceOpen });
  const inviteToSpace = (id: string) => wsSend({ t: "space:invite", toId: id });
  const acceptSpaceInvite = (hostId: string) => { setSpaceInvites((v) => v.filter((x) => x.fromId !== hostId)); requestVisit(hostId); };

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
          className="pointer-events-auto relative flex h-7 w-7 items-center justify-center rounded-full border" style={{ borderColor: showChat ? "rgba(53,224,208,.65)" : "rgba(53,224,208,.3)", background: "rgba(10,18,38,.5)", color: connected ? "#7be0ff" : "#7a8bb0" }}>
          <MessageCircle className="h-3.5 w-3.5" />
          {(unread.global + unread.party + unread.dm) > 0 && !showChat && <span className="absolute -right-1 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-0.5 text-[8px] font-black text-slate-900" style={{ background: "#35e0d0" }} data-testid="chat-unread">{Math.min(9, unread.global + unread.party + unread.dm)}</span>}
        </button>
        <button onClick={() => { setQuestRows(engineRef.current?.getQuestLog() ?? []); refreshDaily(); setShowQuests((v) => !v); }} data-testid="btn-quests" title="Quests & Daily"
          className="pointer-events-auto relative flex h-7 w-7 items-center justify-center rounded-full border text-amber-200/90" style={{ borderColor: "rgba(255,196,107,.3)", background: "rgba(10,18,38,.5)" }}>
          <ScrollText className="h-3.5 w-3.5" />
          {!dailyUi.done && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full" style={{ background: "#ffc46b", boxShadow: "0 0 6px #ffc46b" }} />}
        </button>
        <button onClick={() => setShowInventory((v) => !v)} data-testid="btn-inventory" title="Inventory"
          className="pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full border text-amber-200/90" style={{ borderColor: showInventory ? "rgba(255,196,107,.65)" : "rgba(255,196,107,.3)", background: "rgba(10,18,38,.5)" }}>
          <Backpack className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => { setStartRemember(startPrefRef.current !== "ask"); setStartPick({ canArcade: arcadeVisitedRef.current && maxRingRef.current >= 1 }); }} data-testid="btn-startloc" title="Start location"
          className="pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full border text-cyan-200/90" style={{ borderColor: "rgba(53,224,208,.3)", background: "rgba(10,18,38,.5)" }}>
          <MapPin className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => { setShowSettings((v) => !v); setShowPeers(false); }} data-testid="btn-settings" title="Settings"
          className="pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full border text-cyan-200/90" style={{ borderColor: showSettings ? "rgba(53,224,208,.65)" : "rgba(53,224,208,.3)", background: "rgba(10,18,38,.5)" }}>
          <SlidersHorizontal className="h-3.5 w-3.5" />
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
          <div className="pointer-events-auto absolute inset-x-0 top-12 z-[14] mx-auto flex max-w-[520px] flex-col gap-1.5 px-4">
            {/* channel switcher (CHR-249/248) — Global · Party · DM, with per-channel unread dots */}
            <div className="flex items-center gap-1.5" data-testid="chat-channels">
              {(["global", "party", "dm"] as const).map((ch) => {
                const active = chatScope === ch; const disabled = ch === "party" && !party; const dot = unread[ch] > 0 && !active;
                return (
                  <button key={ch} disabled={disabled} onClick={() => { setChatScope(ch); if (ch === "dm") setActiveDm(null); }} data-testid={`chat-tab-${ch}`}
                    className="relative flex h-8 items-center rounded-lg border px-3 text-[11px] font-extrabold uppercase tracking-wide disabled:opacity-35"
                    style={active ? { borderColor: "#35e0d0", color: "#0a1220", background: "#7ff5e8" } : { borderColor: "#2a3a66", color: "#a9c2e6", background: "rgba(10,18,38,.6)" }}>
                    {ch === "global" ? "Global" : ch === "party" ? "Party" : "DM"}
                    {dot && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full" style={{ background: "#ffc46b", boxShadow: "0 0 6px #ffc46b" }} />}
                  </button>
                );
              })}
            </div>
            {chatScope !== "dm" ? (
              <div className="flex items-center gap-2">
                <input value={chatDraft} onChange={(e) => setChatDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") sendMsg(); }} maxLength={120}
                  placeholder={connected ? (chatScope === "party" ? "Message your party…" : "Say something to the ring…") : "connecting…"} data-testid="cirql-chat-input"
                  className="min-w-0 flex-1 rounded-xl border px-3 py-2 text-[13px] outline-none" style={{ borderColor: "#2a3a66", background: "rgba(6,11,26,.92)", color: "#fff", touchAction: "auto" }} />
                <button onClick={sendMsg} data-testid="cirql-chat-send" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-[1.5px] active:scale-90" style={{ borderColor: "#35e0d0", color: "#35e0d0", background: "rgba(53,224,208,.08)" }}><Send className="h-5 w-5" /></button>
              </div>
            ) : activeDm ? (
              /* an open DM thread */
              <div className="flex items-center gap-2">
                <button onClick={() => setActiveDm(null)} data-testid="dm-back" className="flex h-10 shrink-0 items-center rounded-xl border px-2 text-cyan-200" style={{ borderColor: "#2a3a66", background: "rgba(10,18,38,.6)" }}><ArrowLeft className="h-4 w-4" /></button>
                <input value={chatDraft} onChange={(e) => setChatDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") sendMsg(); }} maxLength={120}
                  placeholder={`Message ${dmThreads[activeDm]?.name || "traveller"}…`} data-testid="dm-input"
                  className="min-w-0 flex-1 rounded-xl border px-3 py-2 text-[13px] outline-none" style={{ borderColor: "#3a2a72", background: "rgba(6,11,26,.92)", color: "#fff", touchAction: "auto" }} />
                <button onClick={sendMsg} data-testid="dm-send" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-[1.5px] active:scale-90" style={{ borderColor: "#b26cff", color: "#c9b8ff", background: "rgba(178,108,255,.1)" }}><Send className="h-5 w-5" /></button>
              </div>
            ) : null}
          </div>

          {/* DM directory (requests + open threads + travellers here) when no thread is open */}
          {chatScope === "dm" && !activeDm && (
            <div className="pointer-events-auto absolute inset-x-0 top-[104px] z-[13] mx-auto max-w-[520px] px-4">
              <div className="max-h-[52vh] overflow-y-auto rounded-2xl border p-2.5" data-testid="dm-directory" style={{ borderColor: "rgba(178,108,255,.3)", background: "rgba(8,10,24,.96)" }}>
                {dmReqs.length > 0 && <>
                  <div className="mb-1 px-1 text-[10px] font-black uppercase tracking-widest text-violet-300/70">Requests</div>
                  {dmReqs.map((r) => (
                    <div key={r.fromId} data-testid={`dm-req-${r.fromId}`} className="mb-1 flex items-center gap-2 rounded-lg border px-2.5 py-1.5" style={{ borderColor: "rgba(178,108,255,.4)", background: "rgba(178,108,255,.07)" }}>
                      <span className="min-w-0 flex-1 truncate text-[12px] text-slate-200"><b className="text-violet-200">{r.fromName}</b> wants to message you</span>
                      <button onClick={() => acceptDmReq(r.fromId)} data-testid={`dm-accept-${r.fromId}`} className="rounded-lg px-2.5 py-1 text-[12px] font-bold text-slate-900" style={{ background: "#b26cff" }}>Accept</button>
                      <button onClick={() => declineDmReq(r.fromId)} className="rounded-lg border px-2 py-1 text-[12px] text-slate-300" style={{ borderColor: "#3a2a72" }}>No</button>
                    </div>
                  ))}
                </>}
                {Object.keys(dmThreads).length > 0 && <>
                  <div className="mb-1 mt-1.5 px-1 text-[10px] font-black uppercase tracking-widest text-teal-300/70">Conversations</div>
                  {Object.entries(dmThreads).map(([id, th]) => (
                    <button key={id} onClick={() => openDm(id)} data-testid={`dm-thread-${id}`} className="mb-1 flex w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left" style={{ borderColor: "#233152", background: "rgba(10,18,38,.5)" }}>
                      <MessageCircle className="h-3.5 w-3.5 text-teal-300" />
                      <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-white">{th.name}</span>
                      {!peers.some((p) => p.id === id) && <span className="text-[9px] uppercase text-slate-500">offline</span>}
                      <span className="truncate text-[11px] text-slate-400">{th.msgs.at(-1)?.text ?? ""}</span>
                    </button>
                  ))}
                </>}
                {/* Your CIRQLSPACE: who may drop in (Phase E) */}
                <div className="mb-1 mt-1.5 flex items-center gap-2 rounded-lg border px-2.5 py-1.5" style={{ borderColor: "#233152", background: "rgba(10,18,38,.5)" }}>
                  <span className="min-w-0 flex-1 truncate text-[11px] text-slate-300">Your CIRQLSPACE is <b className={spaceOpen ? "text-emerald-300" : "text-amber-200"}>{spaceOpen ? "open to all" : "invite-only"}</b></span>
                  <button onClick={toggleSpaceOpen} data-testid="space-toggle" className="rounded-lg border px-2 py-1 text-[11px] font-bold text-teal-200" style={{ borderColor: "rgba(53,224,208,.5)" }}>{spaceOpen ? "Make invite-only" : "Open it up"}</button>
                </div>
                {spaceInvites.length > 0 && (
                  <div className="mb-1">
                    {spaceInvites.map((v) => (
                      <div key={v.fromId} className="mb-1 flex items-center gap-2 rounded-lg border px-2.5 py-1.5" style={{ borderColor: "rgba(255,196,107,.4)", background: "rgba(40,28,8,.4)" }}>
                        <span className="min-w-0 flex-1 truncate text-[11.5px] text-amber-100"><b>{v.fromName}</b> invited you over</span>
                        <button onClick={() => { acceptSpaceInvite(v.fromId); setShowChat(false); }} data-testid={`space-invite-accept-${v.fromId}`} className="rounded-lg px-2.5 py-1 text-[11px] font-bold text-slate-900" style={{ background: "linear-gradient(90deg,#ffc46b,#ffd98a)" }}>Visit</button>
                        <button onClick={() => setSpaceInvites((s) => s.filter((x) => x.fromId !== v.fromId))} className="text-[10px] text-slate-500 hover:text-rose-300">Dismiss</button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mb-1 mt-1.5 px-1 text-[10px] font-black uppercase tracking-widest text-slate-400/70">Travellers here</div>
                {peers.filter((p) => !dmThreads[p.id]).length === 0 && <p className="px-1 py-2 text-[11.5px] text-slate-500">No one else is on this island right now.</p>}
                {peers.filter((p) => !dmThreads[p.id]).map((p) => (
                  <div key={p.id} data-testid={`dm-peer-${p.id}`} className="mb-1 flex items-center gap-2 rounded-lg px-2.5 py-1.5" style={{ background: "rgba(255,255,255,.03)" }}>
                    <span className="min-w-0 flex-1 truncate text-[12.5px] text-slate-200">{p.name}</span>
                    <button onClick={() => { requestVisit(p.id); setShowChat(false); }} data-testid={`dm-visit-${p.id}`} className="rounded-lg border px-2 py-1 text-[11px] font-bold text-amber-200" style={{ borderColor: "rgba(255,196,107,.5)" }}>Visit</button>
                    <button onClick={() => inviteToSpace(p.id)} data-testid={`dm-invite-${p.id}`} className="rounded-lg border px-2 py-1 text-[11px] font-bold text-emerald-200" style={{ borderColor: "rgba(52,211,153,.5)" }}>Invite</button>
                    <button onClick={() => requestDm(p.id)} data-testid={`dm-ask-${p.id}`} className="rounded-lg border px-2 py-1 text-[11px] font-bold text-violet-200" style={{ borderColor: "rgba(178,108,255,.5)" }}>DM</button>
                    <button onClick={() => blockPlayer(p.id)} className="text-[10px] text-slate-500 hover:text-rose-300">Hide</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* the message feed — Global/Party (channel-filtered) or the open DM thread */}
          {chatScope !== "dm" ? (() => { const shown = feed.filter((mm) => (chatScope === "party") === mm.party).slice(-5); return shown.length > 0 && (
            <div className="pointer-events-none absolute left-3 top-[132px] z-[12] flex max-w-[62%] flex-col gap-1" data-testid="chat-feed">
              {shown.map((mm) => (
                <div key={mm.key} className="w-fit rounded-md px-2 py-1 text-[11px] leading-tight" style={{ background: "rgba(6,11,26,.72)", border: `1px solid ${mm.party ? "#35e0d066" : mm.me ? "#ffc46b55" : mm.name ? "#b26cff44" : "#35e0d044"}` }}>
                  {mm.party && <span className="mr-1 text-[8px] font-black uppercase tracking-wider text-teal-300/80">party</span>}
                  {mm.name ? <><span className="font-bold" style={{ color: mm.me ? "#ffd98a" : mm.party ? "#7ff5e8" : "#c9b8ff" }}>{mm.name}:</span> <span className="text-cyan-50/90">{mm.text}</span></> : <span className="italic text-cyan-300/80">{mm.text}</span>}
                </div>
              ))}
            </div>
          ); })() : activeDm && dmThreads[activeDm] ? (
            <div className="pointer-events-none absolute left-3 right-3 top-[104px] z-[12] mx-auto flex max-w-[520px] flex-col gap-1" data-testid="dm-feed">
              <div className="px-1 text-[10px] font-bold uppercase tracking-widest text-violet-300/70">{dmThreads[activeDm].name}{!peers.some((p) => p.id === activeDm) && <span className="ml-1 text-slate-500">· offline</span>}</div>
              {dmThreads[activeDm].msgs.slice(-6).map((mm) => (
                <div key={mm.key} className={`w-fit max-w-[80%] rounded-md px-2 py-1 text-[11.5px] leading-tight ${mm.mine ? "self-end" : ""}`} style={{ background: mm.mine ? "rgba(178,108,255,.18)" : "rgba(6,11,26,.78)", border: `1px solid ${mm.mine ? "#b26cff66" : "#35e0d044"}` }}>
                  <span className="text-cyan-50/95">{mm.text}</span>
                </div>
              ))}
            </div>
          ) : null}
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

      {/* emote wheel (CHR-260) — a grid of chat-free expressions; tap to play + broadcast */}

      {/* visiting a friend's Hearth (CHR-259) — a banner with a way back home */}
      {visiting && (
        <div className="pointer-events-auto absolute inset-x-0 top-12 z-[16] mx-auto flex max-w-[380px] items-center gap-2 rounded-full border px-3 py-1.5" data-testid="visiting-banner"
          style={{ borderColor: "rgba(255,196,107,.6)", background: "rgba(10,18,38,.95)", boxShadow: "0 0 18px rgba(255,196,107,.3)" }}>
          <span className="text-[14px]">🏡</span>
          <span className="min-w-0 flex-1 truncate text-[12px] text-slate-200">Visiting <b className="text-amber-200">{visiting}</b>'s CIRQLSPACE</span>
          <button onClick={leaveVisit} data-testid="visit-leave" className="rounded-full px-3 py-1 text-[12px] font-bold text-slate-900" style={{ background: "linear-gradient(90deg,#ffc46b,#ffd98a)" }}>Go home</button>
        </div>
      )}

      {/* Inventory (CHR-270) — your SPARQS, owned stock, and the how-to (always available) */}
      {showInventory && (() => {
        const ownedCount = DECOR.filter((d) => decorOwned(d.id)).length;
        return (
          <div className="absolute right-3 top-14 z-[55] w-[264px] rounded-xl border p-3" data-testid="inventory-panel" style={{ borderColor: "rgba(255,196,107,.35)", background: "rgba(10,18,38,.96)", boxShadow: "0 10px 30px rgba(0,0,0,.5)" }}>
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-amber-300"><Backpack className="h-3.5 w-3.5" /> Inventory</span>
              <button onClick={() => setShowInventory(false)} className="text-slate-400 hover:text-slate-200"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex items-center gap-2 rounded-lg px-2.5 py-2" style={{ background: "rgba(255,196,107,.08)" }}>
              <span className="text-[18px]">✦</span>
              <div><div className="text-[17px] font-black text-white" data-testid="inv-sparqs">{sparksUi.toLocaleString()}</div><div className="text-[9px] uppercase tracking-wider text-amber-200/70">sparqs</div></div>
              <div className="ml-auto text-right"><div className="text-[17px] font-black text-white">{ownedCount}</div><div className="text-[9px] uppercase tracking-wider text-slate-400">item kinds</div></div>
            </div>
            <button onClick={() => { setShowInventory(false); openDecorate(); }} data-testid="inv-build" className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg py-2.5 text-[13px] font-extrabold text-slate-900" style={{ background: "linear-gradient(90deg,#ffc46b,#ffd98a)" }}>
              <Hammer className="h-4 w-4" /> Build your CIRQLSPACE
            </button>
            {/* Your Land — grow your CIRQLSPACE (Phase D) */}
            {(() => {
              const cur = LAND_META[landTierUi], next = LAND_META[landTierUi + 1];
              const canBuild10 = next?.milestone !== "build10" || decorCount >= 10;
              const label = !next ? "Full size ✦" : next.milestone === "gift" ? "Claim (free gift)" : next.milestone === "build10" ? (canBuild10 ? "Claim (free)" : `Place 10 first (${decorCount}/10)`) : `Expand · ✦${next.cost}`;
              return (
                <div className="mt-2 rounded-lg border px-2.5 py-2" data-testid="inv-land" style={{ borderColor: "rgba(126,231,135,.3)", background: "rgba(126,231,135,.06)" }}>
                  <div className="flex items-center gap-1.5 text-[11px]"><span className="text-emerald-300">🏝️ Land:</span> <b className="text-white">{cur.label}</b> <span className="ml-auto text-[10px] text-slate-400">tier {landTierUi}/{LAND_META.length - 1}</span></div>
                  <div className="mt-1 flex gap-0.5">{LAND_TIERS.map((_, i) => <span key={i} className="h-1.5 flex-1 rounded-full" style={{ background: i <= landTierUi ? "#7ee787" : "rgba(255,255,255,.12)" }} />)}</div>
                  {next && <button onClick={expandLand} data-testid="inv-expand" disabled={!canBuild10 && next.milestone === "build10"} className="mt-1.5 w-full rounded-lg py-1.5 text-[11.5px] font-bold text-slate-900 disabled:opacity-50" style={{ background: "linear-gradient(90deg,#7ee787,#a6f0ac)" }}>{label} → {next.label}</button>}
                </div>
              );
            })()}
            <div className="mt-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">How it works</div>
            <ul className="mt-1 flex flex-col gap-1 text-[11.5px] leading-snug text-slate-300">
              <li>🏝️ This island is <b className="text-white">yours</b>. Tap <b className="text-amber-200">Build</b> to place things &amp; make it your own.</li>
              <li>✦ Earn <b className="text-amber-200">sparqs</b> from games, quests &amp; campaigns, then spend them on décor.</li>
              <li>⛵ Sail south to the <b className="text-white">Town</b> for quests, the arcade &amp; the shops.</li>
              <li>👋 Friends can <b className="text-white">visit</b> your CIRQLSPACE — press Visit on a traveller in chat.</li>
            </ul>
            {curRingUi !== 0 && <p className="mt-2 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-amber-200" style={{ background: "rgba(255,196,107,.1)" }}>⛵ Sail home to CIRQLSPACE to build.</p>}
          </div>
        );
      })()}

      {/* CIRQLSPACE build palette (CHR-259/272/273) — category tabs + grid snap; tap to place */}
      {showDecor && !visiting && (
        <div className="pointer-events-auto absolute inset-x-0 top-12 z-[15] mx-auto max-w-[580px] px-3" data-testid="decor-palette">
          <div className="rounded-2xl border p-2" style={{ borderColor: "rgba(255,196,107,.4)", background: "rgba(10,12,28,.96)", boxShadow: "0 10px 34px rgba(0,0,0,.55)" }}>
            <div className="mb-1.5 flex items-center gap-2 px-1">
              {/* Place ▸ Paint mode toggle */}
              <div className="flex overflow-hidden rounded-lg border" style={{ borderColor: "#2a3a66" }}>
                <button onClick={switchToPlace} data-testid="build-place" className="px-2 py-0.5 text-[10px] font-bold" style={buildMode === "place" ? { color: "#0a1220", background: "#ffd98a" } : { color: "#a9c2e6" }}>Place</button>
                <button onClick={switchToPaint} data-testid="build-paint" className="px-2 py-0.5 text-[10px] font-bold" style={buildMode === "paint" ? { color: "#0a1220", background: "#7ff5e8" } : { color: "#a9c2e6" }}>Paint</button>
              </div>
              <button onClick={() => { const on = !snapOn; setSnapOn(on); engineRef.current?.setSnap(on); }} data-testid="decor-grid"
                className="rounded-lg border px-2 py-0.5 text-[10px] font-bold" style={snapOn ? { borderColor: "#35e0d0", color: "#0a1220", background: "#7ff5e8" } : { borderColor: "#2a3a66", color: "#9fb0d0" }}># Grid</button>
              <span className="ml-auto text-[11px] font-bold text-amber-200" data-testid="decor-sparqs">✦ {sparksUi}</span>
              <button onClick={closeDecorate} data-testid="decor-done" className="rounded-lg px-2.5 py-1 text-[12px] font-bold text-slate-900" style={{ background: "linear-gradient(90deg,#ffc46b,#ffd98a)" }}>Done</button>
            </div>

            {buildMode === "place" ? (<>
              {/* category tabs + remove tool */}
              <div className="mb-1.5 flex gap-1 overflow-x-auto pb-0.5">
                {CATEGORIES.map((c) => (
                  <button key={c.key} onClick={() => setDecorCat(c.key)} data-testid={`decor-cat-${c.key}`}
                    className="flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-bold"
                    style={decorCat === c.key ? { borderColor: "#ffc46b", color: "#0a1220", background: "#ffd98a" } : { borderColor: "#2a3a66", color: "#a9c2e6" }}>
                    <span>{c.icon}</span> {c.label}
                  </button>
                ))}
                <button onClick={pickRemove} data-testid="decor-remove" className="flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-bold"
                  style={decorTool === "remove" ? { borderColor: "#ff5d7d", color: "#ffb3c3", background: "rgba(255,93,125,.14)" } : { borderColor: "#3a2a72", color: "#c9a0d0" }}>🗑 Remove</button>
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {DECOR.filter((d) => d.category === decorCat).map((d) => {
                  const owned = decorOwned(d.id); const sel = decorTool === d.id;
                  return (
                    <button key={d.id} onClick={() => pickDecor(d.id)} data-testid={`decor-${d.id}`} title={d.name}
                      className="flex h-16 w-14 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border text-[9px] font-semibold"
                      style={sel ? { borderColor: "#ffc46b", color: "#0a1220", background: "#ffd98a" } : { borderColor: owned ? "rgba(255,196,107,.35)" : "rgba(150,130,255,.2)", color: owned ? "#ffd98a" : "#b9a8e6", background: "rgba(255,255,255,.03)" }}>
                      <span className="text-[22px] leading-none">{d.glyph}</span>
                      {owned ? <span className={`truncate max-w-[52px] ${sel ? "text-slate-900" : ""}`}>{d.name.split(" ")[0]}</span> : <span>✦{d.price}</span>}
                    </button>
                  );
                })}
              </div>
            </>) : (<>
              {/* terrain paint (Phase C): tile swatches (Grass = erase) + brush size */}
              <div className="flex items-center gap-1.5 pb-1">
                {[{ t: "g", n: "Grass", c: "#3a6a44" }, { t: "s", n: "Sand", c: "#c9ad74" }, { t: "t", n: "Stone", c: "#565663" }, { t: "w", n: "Water", c: "#183a58" }, { t: "p", n: "Path", c: "#6a4a2a" }].map((tl) => (
                  <button key={tl.t} onClick={() => pickPaintTile(tl.t)} data-testid={`paint-${tl.t}`} title={tl.n}
                    className="flex h-14 w-14 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border text-[9px] font-bold"
                    style={paintTile === tl.t ? { borderColor: "#35e0d0", color: "#eaf6ff", background: "rgba(53,224,208,.12)" } : { borderColor: "#2a3a66", color: "#a9c2e6" }}>
                    <span className="h-6 w-6 rounded-md border" style={{ background: tl.c, borderColor: "rgba(255,255,255,.15)" }} />{tl.t === "g" ? "Erase" : tl.n}
                  </button>
                ))}
                <div className="ml-1 flex flex-col items-center gap-0.5">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400">Brush</span>
                  <div className="flex gap-1">
                    {[1, 2, 3].map((n) => (
                      <button key={n} onClick={() => pickBrush(n)} data-testid={`brush-${n}`}
                        className="h-7 w-7 rounded-lg border text-[11px] font-bold" style={brushSize === n ? { borderColor: "#35e0d0", color: "#0a1220", background: "#7ff5e8" } : { borderColor: "#2a3a66", color: "#a9c2e6" }}>{n}</button>
                    ))}
                  </div>
                </div>
              </div>
              <p className="px-1 text-[10px] text-slate-400">Drag on your CIRQLSPACE to paint the ground. Water blocks walking.</p>
            </>)}
          </div>
        </div>
      )}

      {showEmotes && (
        <div className="pointer-events-auto absolute inset-x-0 bottom-[128px] z-[15] mx-auto max-w-[340px] px-4" data-testid="emote-wheel">
          <div className="rounded-2xl border p-2.5" style={{ borderColor: "rgba(178,108,255,.4)", background: "rgba(10,12,28,.96)", boxShadow: "0 10px 34px rgba(0,0,0,.55)" }}>
            <div className="mb-1.5 flex items-center px-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-violet-300/80">Emotes</span>
              <button onClick={() => setShowEmotes(false)} className="ml-auto text-slate-400 hover:text-slate-200"><X className="h-3.5 w-3.5" /></button>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {EMOTES.map((e) => (
                <button key={e.id} onClick={() => playEmote(e.id)} data-testid={`emote-${e.id}`}
                  className="flex flex-col items-center justify-center gap-0.5 rounded-xl border py-2 transition active:scale-90"
                  style={{ borderColor: "rgba(178,108,255,.25)", background: "rgba(178,108,255,.06)" }}>
                  <span className="text-[22px] leading-none">{e.glyph}</span>
                  <span className="text-[9px] font-semibold text-violet-200/80">{e.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* "Together" panel (Phase I4) — appears when you're next to a traveller; paired social gestures */}
      {nearPlayer && !showDecor && !showInventory && !dioramaOn && !visiting && !showEmotes && (
        <div className="pointer-events-auto absolute inset-x-0 bottom-[128px] z-[15] mx-auto max-w-[320px] px-4" data-testid="together-panel">
          <div className="rounded-2xl border p-2.5" style={{ borderColor: "rgba(255,196,107,.45)", background: "rgba(10,12,28,.96)", boxShadow: "0 10px 34px rgba(0,0,0,.55)" }}>
            <div className="mb-1.5 px-1 text-[10px] font-black uppercase tracking-widest text-amber-200/80">Together with {nearPlayer.name}</div>
            <div className="grid grid-cols-4 gap-1.5">
              {PAIR_GESTURES.map((g) => (
                <button key={g.id} onClick={() => playPair(g.id)} data-testid={`pair-${g.id}`}
                  className="flex flex-col items-center justify-center gap-0.5 rounded-xl border py-2 transition active:scale-90"
                  style={{ borderColor: "rgba(255,196,107,.28)", background: "rgba(255,196,107,.06)" }}>
                  <span className="text-[22px] leading-none">{g.glyph}</span>
                  <span className="text-[9px] font-semibold text-amber-100/80">{g.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* live zoom control (Phase H2) — a floating +/- on the right; hidden while building/diorama */}
      {!showDecor && !showInventory && !dioramaOn && (
        <div className="pointer-events-auto absolute right-3 top-1/2 z-[16] flex -translate-y-1/2 flex-col items-center gap-1.5" data-testid="zoom-control">
          <button onPointerDown={(e) => { e.preventDefault(); engineRef.current?.zoomBy(1.15); setZoomUi(engineRef.current?.getZoom() ?? 1); }} data-testid="btn-zoom-in" title="Zoom in"
            className="flex h-10 w-10 items-center justify-center rounded-full border-[1.5px] active:scale-90" style={{ borderColor: "rgba(53,224,208,.5)", color: "#7be0ff", background: "rgba(10,18,38,.55)" }}>
            <ZoomIn className="h-4 w-4" />
          </button>
          <button onPointerDown={(e) => { e.preventDefault(); engineRef.current?.setZoomTarget(1); setZoomUi(1); }} data-testid="btn-zoom-reset" title="Reset zoom"
            className="rounded-full border px-2 py-0.5 text-[9px] font-bold tabular-nums active:scale-90" style={{ borderColor: zoomUi !== 1 ? "rgba(255,196,107,.5)" : "rgba(120,140,180,.3)", color: zoomUi !== 1 ? "#ffd98a" : "#8ea0c0", background: "rgba(10,18,38,.5)" }}>
            {Math.round(zoomUi * 100)}%
          </button>
          <button onPointerDown={(e) => { e.preventDefault(); engineRef.current?.zoomBy(0.87); setZoomUi(engineRef.current?.getZoom() ?? 1); }} data-testid="btn-zoom-out" title="Zoom out"
            className="flex h-10 w-10 items-center justify-center rounded-full border-[1.5px] active:scale-90" style={{ borderColor: "rgba(53,224,208,.5)", color: "#7be0ff", background: "rgba(10,18,38,.55)" }}>
            <ZoomOut className="h-4 w-4" />
          </button>
          {curRingUi === 0 && !visiting && (
            <button onPointerDown={(e) => { e.preventDefault(); engineRef.current?.openDiorama(); }} data-testid="btn-diorama" title="Diorama view"
              className="mt-1 flex h-11 w-11 items-center justify-center rounded-full border-[1.5px] active:scale-90" style={{ borderColor: "rgba(255,206,140,.6)", color: "#ffce8c", background: "rgba(40,28,8,.5)", boxShadow: "0 0 14px rgba(255,206,140,.2) inset" }}>
              <Camera className="h-5 w-5" />
            </button>
          )}
        </div>
      )}

      {/* diorama beauty shot (Phase H3) — the canvas owns the screen; this is just the exit + share bar */}
      {dioramaOn && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[40] flex items-center justify-center gap-3 px-5 pb-[calc(20px+env(safe-area-inset-bottom))]" data-testid="diorama-bar">
          <button onClick={() => { engineRef.current?.closeDiorama(); }} data-testid="diorama-close" className="pointer-events-auto rounded-full border px-5 py-2 text-[13px] font-bold text-slate-200" style={{ borderColor: "rgba(120,140,180,.4)", background: "rgba(10,18,38,.7)" }}>Close</button>
          <button onClick={sharePostcard} data-testid="diorama-share" className="pointer-events-auto flex items-center gap-2 rounded-full px-5 py-2 text-[13px] font-extrabold text-slate-900" style={{ background: "linear-gradient(90deg,#ffce8c,#ffd98a)" }}><Share2 className="h-4 w-4" /> Share postcard</button>
        </div>
      )}

      {/* controls tray — captures all taps in this band so only the controls move the character */}
      <div ref={controlsRef} className="absolute inset-x-0 bottom-0 z-10 mx-auto flex max-w-[680px] items-end justify-between gap-4 px-5 pb-[calc(14px+env(safe-area-inset-bottom))] pt-6"
        style={{ background: "linear-gradient(0deg, rgba(6,11,26,.78) 40%, rgba(6,11,26,0))", touchAction: "none", display: dioramaOn ? "none" : undefined }}>
        <Joystick press={(b) => engineRef.current?.press(b)} release={(b) => engineRef.current?.release(b)} color="#35e0d0" size={128} />
        <div className="mb-1 flex items-end gap-3">
          <button onPointerDown={(e) => { e.preventDefault(); setShowEmotes((v) => !v); }} data-testid="btn-emotes" title="Emotes"
            className="flex h-12 w-12 flex-col items-center justify-center rounded-full border-[1.5px] text-[8px] font-extrabold active:scale-90"
            style={{ borderColor: showEmotes ? "#b26cff" : "rgba(178,108,255,.55)", color: "#d9c2ff", background: "rgba(178,108,255,.12)", boxShadow: "0 0 14px rgba(178,108,255,.18) inset", touchAction: "none" }}>
            <Smile className="h-5 w-5" />
          </button>
          <button onPointerDown={(e) => { e.preventDefault(); engineRef.current?.interact(); }} data-testid="btn-interact"
            className="flex h-16 w-16 flex-col items-center justify-center rounded-full border-[1.5px] text-[9px] font-extrabold active:scale-90"
            style={{ borderColor: "#ffc46b", color: "#ffd98a", background: "rgba(255,196,107,.12)", boxShadow: "0 0 16px rgba(255,196,107,.2) inset", touchAction: "none" }}>
            <span className="text-lg leading-none">E</span><span className="mt-0.5">TALK / ENTER</span>
          </button>
          <button {...hold("b")} data-testid="btn-run" className="flex h-14 w-14 flex-col items-center justify-center rounded-full border-[1.5px] text-[9px] font-extrabold active:scale-90" style={{ borderColor: "#3bb6ff", color: "#7be0ff", background: "rgba(10,18,38,.4)", boxShadow: "0 0 16px rgba(59,182,255,.2) inset", touchAction: "none" }}>
            <Zap className="h-5 w-5" /> RUN
          </button>
          <button onPointerDown={(e) => { e.preventDefault(); engineRef.current?.jump(); }} data-testid="btn-jump" title="Hop"
            className="flex h-12 w-12 flex-col items-center justify-center rounded-full border-[1.5px] text-[8px] font-extrabold active:scale-90"
            style={{ borderColor: "#7ee787", color: "#a6f0ac", background: "rgba(126,231,135,.1)", boxShadow: "0 0 14px rgba(126,231,135,.15) inset", touchAction: "none" }}>
            <ChevronsUp className="h-5 w-5" /> HOP
          </button>
          <button onPointerDown={(e) => { e.preventDefault(); engineRef.current?.toggleSit(); setSeated(!!engineRef.current?.isSeated()); }} data-testid="btn-sit" title="Sit"
            className="flex h-12 w-12 flex-col items-center justify-center rounded-full border-[1.5px] text-[8px] font-extrabold active:scale-90"
            style={{ borderColor: seated ? "#ffd24a" : "rgba(255,210,74,.5)", color: "#ffe08a", background: seated ? "rgba(255,210,74,.2)" : "rgba(255,210,74,.08)", boxShadow: "0 0 14px rgba(255,210,74,.15) inset", touchAction: "none" }}>
            <Armchair className="h-5 w-5" /> {seated ? "STAND" : "SIT"}
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
          <p className="px-4 pb-2 text-[12px] leading-snug text-violet-200/60">Attune to a Wonder — every run earns you <span className="text-amber-300">sparqs</span>.</p>
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
                {dailyUi.done ? "✓ Done today — come back tomorrow" : `Reward: ${d.reward * (event?.sparkMult ?? 1)} sparqs${event ? " (doubled!)" : ""}`}
              </div>
            </div>
          ); })()}
          {questRows.length === 0 && <p className="text-xs text-slate-400">No quests yet. Talk to Ferra at CIRQLSPACE.</p>}
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
          <p className="text-[12px] leading-snug text-slate-300"><b className="text-white">{members}</b> of 12 lanterns lit — friends light your CIRQLSPACE.</p>
          <div className="my-2 flex flex-wrap gap-1.5">
            {Array.from({ length: 12 }).map((_, i) => (
              <span key={i} className="h-3 w-3 rounded-full" style={{ background: i < members ? "#ffc46b" : "rgba(255,255,255,.12)", boxShadow: i < members ? "0 0 7px #ffc46b" : "none" }} />
            ))}
          </div>
          <button onClick={invite} data-testid="cirql-invite" className="mt-1 w-full rounded-lg py-2.5 text-[13px] font-extrabold text-slate-900" style={{ background: "linear-gradient(90deg,#ffc46b,#ffd98a)" }}>Invite a friend ✦</button>
          <button onClick={() => { setShowCirql(false); openDecorate(); }} data-testid="cirql-decorate" className="mt-2 w-full rounded-lg border py-2 text-[12px] font-bold text-amber-200" style={{ borderColor: "rgba(255,196,107,.4)" }}>🌷 Decorate CIRQLSPACE{decorCount > 0 ? ` · ${decorCount}` : ""}</button>
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

      {/* "who's here" — tap the online badge (top-left) to see who's on this ring */}
      {showPeers && (
        <div className="pointer-events-auto absolute left-3 top-12 z-[17] w-[188px] rounded-xl border p-2.5" data-testid="peers-popup"
          style={{ borderColor: "rgba(53,224,208,.4)", background: "rgba(10,14,30,.97)", boxShadow: "0 10px 30px rgba(0,0,0,.5)" }}>
          <div className="mb-1.5 flex items-center px-0.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-teal-300/80">Here now · {online}</span>
            <button onClick={() => setShowPeers(false)} className="ml-auto text-slate-400 hover:text-slate-200"><X className="h-3 w-3" /></button>
          </div>
          <div className="flex max-h-[220px] flex-col gap-1 overflow-y-auto">
            <div className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] font-bold text-amber-200" style={{ background: "rgba(255,196,107,.08)" }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#ffd24a" }} /> {nameRef.current || "You"} <span className="text-[9px] font-normal text-slate-500">(you)</span>
            </div>
            {peers.map((p) => (
              <div key={p.id} className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] text-slate-200">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#35e0d0" }} /> {p.name}
              </div>
            ))}
            {peers.length === 0 && <div className="px-2 py-1 text-[11px] italic text-slate-500">No other travellers here yet.</div>}
          </div>
        </div>
      )}

      {/* game settings — brightness, music/SFX mix, reduced motion */}
      {showSettings && (
        <div className="pointer-events-auto absolute inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(5,6,15,.8)" }} data-testid="settings-panel"
          onClick={(e) => { if (e.target === e.currentTarget) setShowSettings(false); }}>
          <div className="w-full max-w-[360px] rounded-2xl border p-4" style={{ borderColor: "rgba(53,224,208,.35)", background: "rgba(10,14,30,.98)", boxShadow: "0 18px 52px rgba(0,0,0,.6)" }}>
            <div className="mb-3 flex items-center">
              <span className="text-[14px] font-black tracking-wide text-cyan-100">Settings</span>
              <button onClick={() => setShowSettings(false)} className="ml-auto text-slate-400 hover:text-slate-200"><X className="h-4 w-4" /></button>
            </div>
            {([
              { key: "brightness", icon: <Sun className="h-3.5 w-3.5" />, label: "Brightness", min: 0.5, max: 1.5, step: 0.05, fmt: (v: number) => `${Math.round(v * 100)}%` },
              { key: "music", icon: <Music className="h-3.5 w-3.5" />, label: "Music", min: 0, max: 1, step: 0.05, fmt: (v: number) => `${Math.round(v * 100)}%`, soon: true },
              { key: "sfx", icon: <Volume2 className="h-3.5 w-3.5" />, label: "Sound FX", min: 0, max: 1, step: 0.05, fmt: (v: number) => `${Math.round(v * 100)}%`, soon: true },
            ] as const).map((row) => (
              <div key={row.key} className="mb-3">
                <div className="mb-1 flex items-center gap-1.5 text-[11px] font-bold text-slate-200">
                  <span className="text-cyan-300/80">{row.icon}</span> {row.label}
                  {(row as any).soon && <span className="rounded bg-slate-700/60 px-1 text-[8px] font-normal uppercase tracking-wide text-slate-400">soon</span>}
                  <span className="ml-auto tabular-nums text-slate-400">{row.fmt(settings[row.key])}</span>
                </div>
                <input type="range" min={row.min} max={row.max} step={row.step} value={settings[row.key]} data-testid={`set-${row.key}`}
                  onChange={(e) => applySettings({ ...settingsRef.current, [row.key]: parseFloat(e.target.value) }, true)}
                  className="h-1.5 w-full cursor-pointer accent-cyan-400" />
              </div>
            ))}
            <div className="mb-3">
              <div className="mb-1 flex items-center gap-1.5 text-[11px] font-bold text-slate-200">
                <span className="text-cyan-300/80"><Hammer className="h-3.5 w-3.5" /></span> Pixel size
                <span className="ml-auto tabular-nums text-slate-400">{settings.pixel <= 1.3 ? "Fine" : settings.pixel >= 1.9 ? "Chunky" : "Medium"}</span>
              </div>
              <input type="range" min={1.15} max={2.2} step={0.05} value={settings.pixel} data-testid="set-pixel"
                onChange={(e) => applySettings({ ...settingsRef.current, pixel: parseFloat(e.target.value) }, true)}
                className="h-1.5 w-full cursor-pointer accent-cyan-400" />
            </div>
            <label className="flex items-center gap-2 rounded-lg px-1 py-1.5 text-[12px] text-slate-200">
              <input type="checkbox" checked={settings.smooth} data-testid="set-smooth" className="h-3.5 w-3.5 accent-cyan-400"
                onChange={(e) => applySettings({ ...settingsRef.current, smooth: e.target.checked }, true)} />
              Smoother animation <span className="text-[10px] text-slate-500">(soften the pixels)</span>
            </label>
            <label className="flex items-center gap-2 rounded-lg px-1 py-1.5 text-[12px] text-slate-200">
              <input type="checkbox" checked={settings.reduce} data-testid="set-reduce" className="h-3.5 w-3.5 accent-cyan-400"
                onChange={(e) => applySettings({ ...settingsRef.current, reduce: e.target.checked }, true)} />
              Reduced motion <span className="text-[10px] text-slate-500">(calmer animation)</span>
            </label>
            <p className="mt-2 text-[9.5px] leading-snug text-slate-500">Music &amp; Sound FX levels are saved now and take effect once the world's soundtrack ships.</p>
          </div>
        </div>
      )}

      {/* startup location picker — Home / Last spot / Arcade (Phase-I polish) */}
      {startPick && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(5,6,15,.86)" }} data-testid="start-picker">
          <div className="w-full max-w-[380px] rounded-2xl border p-4" style={{ borderColor: "rgba(53,224,208,.35)", background: "rgba(10,14,30,.98)", boxShadow: "0 18px 52px rgba(0,0,0,.6)" }}>
            <div className="text-center text-[15px] font-black tracking-wide text-cyan-100">Where to?</div>
            <div className="mb-3 mt-0.5 text-center text-[11px] text-slate-400">Pick where to begin{nameRef.current && nameRef.current !== "Traveller" ? `, ${nameRef.current}` : ""}.</div>
            <div className="flex flex-col gap-2">
              {[
                { d: "home" as StartDest, glyph: "🏠", title: "CIRQLSPACE", sub: "Your home island", show: true, ac: "rgba(255,196,107,.4)" },
                { d: "last" as StartDest, glyph: "📍", title: "Last spot", sub: "Pick up where you left off", show: true, ac: "rgba(53,224,208,.4)" },
                { d: "arcade" as StartDest, glyph: "🕹️", title: "CirqlCade", sub: "Straight to the arcade doors", show: startPick.canArcade, ac: "rgba(178,108,255,.45)" },
              ].filter((o) => o.show).map((o) => (
                <button key={o.d} onClick={() => pickStart(o.d)} data-testid={`start-${o.d}`}
                  className="flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition active:scale-[.98]"
                  style={{ borderColor: o.ac, background: "rgba(255,255,255,.03)" }}>
                  <span className="text-[24px] leading-none">{o.glyph}</span>
                  <span className="flex flex-col"><span className="text-[13px] font-bold text-slate-100">{o.title}</span><span className="text-[10.5px] text-slate-400">{o.sub}</span></span>
                </button>
              ))}
            </div>
            <label className="mt-3 flex items-center gap-2 text-[11px] text-slate-300">
              <input type="checkbox" checked={startRemember} onChange={(e) => setStartRemember(e.target.checked)} data-testid="start-remember" className="h-3.5 w-3.5 accent-cyan-400" />
              Start here every time <span className="text-slate-500">(change from the <MapPin className="inline h-3 w-3" /> button)</span>
            </label>
          </div>
        </div>
      )}

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
