// CIRQLVERSE — M8 live presence + chat, M9 parties + campaign board.
//
// A ring-aware broadcast room at /ws/cirql: travellers share their avatar, name, ring
// and position; the server relays moves + chat to everyone ELSE ON THE SAME RING in
// real time. Grown from the /ws/town prototype but scoped per ring so the concentric
// world scales — you only see + hear the people sharing your island.
//
// M8 also carries "share a light" (a chat-free beacon two nearby travellers exchange to
// light a lantern on each other's Hearth). M9 adds the co-op layer, all authoritative
// in-memory (no DB): a **campaign board** of structured, PII-free matchmaking posts, an
// accept/decline **matchmaking handshake**, **parties** with shared step progress + a
// shared waypoint, and a **party chat channel** routed only to party members.
//
// Deliberately tiny + stateless (roster in memory) — presence, not an authoritative sim
// (see multiplayer.ts for that). Chat renders on the canvas / as overlay text, never as
// HTML, so trim + length-clip is enough; matchmaking posts are structured (tag ids, no
// freeform text) for safety (possible minors — CHR-254).
import { WebSocketServer, WebSocket } from "ws";
import { maskProfanity } from "./chat-filter";

interface Traveller { ws: WebSocket; id: string; name: string; avatar: unknown; ring: number; x: number; y: number; dir: string; pose?: string; partyId?: string; lastAsk?: number; lastPost?: number; lastEmote?: number; lastChat?: number; lastDmReq?: number; lastDm?: number;
  // CIRQLSPACE live-party state (Phase E): your build cache + where you are + who can visit
  decor?: { item: string; x: number; y: number }[]; terrain?: Record<string, string>; landTier?: number;
  spaceHost?: string;              // if set, you're visiting this host's CIRQLSPACE (else your own)
  spaceOpen?: boolean;             // your space: open to anyone (true) or invite-only (false)
  invited?: Set<string>;           // ids you've invited to your space
}
interface Party { id: string; campaignId: string; steps: number; max: number; hostId: string; members: string[]; step: number; }
interface Post { id: string; dir: "host" | "seeker"; byId: string; byName: string; campaignId: string; steps: number; max: number; tags: string[]; newbie: boolean; partyId: string | null; }

const DIRS = new Set(["up", "down", "left", "right"]);

export function setupCirqlPresence() {
  const wss = new WebSocketServer({ noServer: true });
  const players = new Map<string, Traveller>();
  const parties = new Map<string, Party>();
  const board = new Map<string, Post>();
  const dmPairs = new Set<string>();   // accepted 1:1 DM threads, key "idA|idB" (sorted) — request/accept gated (CHR-248)
  const dmKey = (a: string, b: string) => (a < b ? a + "|" + b : b + "|" + a);
  let nextId = 1, nextParty = 1, nextPost = 1;

  const serialize = (p: Traveller) => ({ id: p.id, name: p.name, avatar: p.avatar, ring: p.ring, x: p.x, y: p.y, dir: p.dir, pose: p.pose ?? "stand" });
  const send = (ws: WebSocket, msg: unknown) => { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg)); };
  // ---- Rooms (Phase E) ----
  // Ring 0 is personal: each traveller sits in their OWN space room ("s:"+id) — you're alone on your
  // CIRQLSPACE unless friends visit. Visiting sets spaceHost, moving you into that host's room. Rings
  // ≥1 (Town, wilds) stay shared ("r:"+ring). One helper decides the room; every broadcast keys off it.
  const roomKey = (p: Traveller) => (p.spaceHost ? "s:" + p.spaceHost : p.ring === 0 ? "s:" + p.id : "r:" + p.ring);
  const toRoom = (room: string, msg: unknown, exceptId?: string) => { for (const p of Array.from(players.values())) if (roomKey(p) === room && p.id !== exceptId) send(p.ws, msg); };
  const toAll = (msg: unknown) => { for (const p of Array.from(players.values())) send(p.ws, msg); };
  const peersInRoom = (room: string, selfId: string) => Array.from(players.values()).filter((p) => roomKey(p) === room && p.id !== selfId).map(serialize);
  const roomCount = (room: string) => Array.from(players.values()).filter((p) => roomKey(p) === room).length;
  // Move a traveller to a new ring/space, announcing leave→welcome→join across the room boundary.
  const enterRoom = (t: Traveller, ring: number, spaceHost: string | undefined) => {
    const oldRoom = roomKey(t);
    t.ring = ring; t.spaceHost = spaceHost;
    const newRoom = roomKey(t);
    if (newRoom === oldRoom) return;
    toRoom(oldRoom, { t: "leave", id: t.id }, t.id);
    send(t.ws, { t: "welcome", id: t.id, players: peersInRoom(newRoom, t.id) });
    toRoom(newRoom, { t: "join", ...serialize(t) }, t.id);
  };
  // Build cache → the snapshot a visitor gets (and live updates while they watch).
  const buildOf = (p: Traveller) => ({ decor: p.decor ?? [], terrain: p.terrain ?? {}, landTier: p.landTier ?? 0 });
  const clip = (s: unknown, n: number) => String(s ?? "").replace(/\s+/g, " ").slice(0, n).trim();
  const dir = (d: unknown) => (typeof d === "string" && DIRS.has(d) ? d : "down");
  const clipTags = (arr: unknown) => Array.isArray(arr) ? arr.filter((x) => typeof x === "string").slice(0, 4).map((x) => clip(x, 20)).filter(Boolean) : [];

  // ---- parties + board helpers (M9) ----
  const partyMembers = (p: Party) => p.members.filter((id) => players.has(id)).map((id) => ({ id, name: players.get(id)!.name }));
  const partyState = (p: Party) => ({ t: "party:state", id: p.id, campaignId: p.campaignId, steps: p.steps, max: p.max, hostId: p.hostId, step: p.step, members: partyMembers(p) });
  const sendParty = (p: Party) => { const st = partyState(p); for (const id of p.members) { const pl = players.get(id); if (pl) send(pl.ws, st); } };
  const boardList = () => Array.from(board.values()).map((b) => ({ id: b.id, dir: b.dir, byId: b.byId, byName: b.byName, campaignId: b.campaignId, tags: b.tags, newbie: b.newbie, size: b.partyId ? (parties.get(b.partyId)?.members.length ?? 1) : 1, max: b.max }));
  const broadcastBoard = () => toAll({ t: "board:list", posts: boardList() });

  // Remove a player's own open board post (and disband its party if they were the lone host).
  const dropPost = (ownerId: string) => {
    for (const b of Array.from(board.values())) if (b.byId === ownerId) board.delete(b.id);
  };
  // A member leaves / disconnects: update or disband their party.
  const leaveParty = (t: Traveller, disbandMsg = "A traveller left the party.") => {
    const pid = t.partyId; if (!pid) return;
    t.partyId = undefined;
    const p = parties.get(pid); if (!p) return;
    p.members = p.members.filter((id) => id !== t.id);
    if (p.hostId === t.id || p.members.length === 0) {
      // host left (or party empty) → disband
      for (const id of p.members) { const pl = players.get(id); if (pl) { pl.partyId = undefined; send(pl.ws, { t: "party:disband", reason: disbandMsg }); } }
      parties.delete(pid);
      dropPost(p.hostId);
    } else {
      sendParty(p);
    }
  };

  wss.on("connection", (ws: WebSocket) => {
    const id = "c" + (nextId++);
    let me: Traveller | null = null;

    ws.on("message", (data: Buffer) => {
      let m: any; try { m = JSON.parse(data.toString()); } catch { return; }
      if (m.t === "join") {
        if (me) return;
        me = { ws, id, name: clip(m.name, 16) || "Traveller", avatar: m.avatar ?? null, ring: +m.ring || 0, x: +m.x || 0, y: +m.y || 0, dir: dir(m.dir), spaceOpen: true };
        players.set(id, me);
        send(ws, { t: "welcome", id, players: peersInRoom(roomKey(me), id) });
        send(ws, { t: "board:list", posts: boardList() });     // hand the newcomer the current board
        toRoom(roomKey(me), { t: "join", ...serialize(me) }, id);
      } else if (!me) { return; }
      else if (m.t === "move") {
        const nr = +m.ring || 0;
        // Changing ring leaves any space you were visiting (you can only visit from your own ring 0).
        if (nr !== me.ring) enterRoom(me, nr, nr === 0 ? me.spaceHost : undefined);
        me.x = +m.x; me.y = +m.y; me.dir = dir(m.dir); me.pose = m.pose === "sit" ? "sit" : "stand";
        toRoom(roomKey(me), { t: "move", id, x: me.x, y: me.y, dir: me.dir, pose: me.pose }, id);
      }
      else if (m.t === "chat") {
        const now = Date.now(); if (me.lastChat && now - me.lastChat < 700) return; me.lastChat = now;   // anti-spam rate limit
        const text = maskProfanity(clip(m.text, 120)); if (!text) return;   // server-authoritative moderation (CHR-249)
        if (m.scope === "party" && me.partyId) {   // party channel — only fellow members
          const p = parties.get(me.partyId);
          if (p) for (const mid of p.members) { const pl = players.get(mid); if (pl) send(pl.ws, { t: "chat", id: me.id, name: me.name, text, channel: "party" }); }
        } else {
          toRoom(roomKey(me), { t: "chat", id: me.id, name: me.name, text, channel: "global" });   // to everyone in the room incl. sender
        }
      }
      // ---- CIRQLSPACE build cache: your décor + terrain + land tier, so friends can visit (Phase E) ----
      else if (m.t === "build") {
        me.decor = Array.isArray(m.decor)
          ? m.decor.filter((d: any) => d && typeof d.item === "string").slice(0, 130).map((d: any) => ({ item: clip(d.item, 24), x: Math.round(+d.x) || 0, y: Math.round(+d.y) || 0 }))
          : [];
        // terrain is a compact { "gx,gy": "s|t|w|p" } map; clip to a sane size
        const terr: Record<string, string> = {};
        if (m.terrain && typeof m.terrain === "object") { let n = 0; for (const k in m.terrain) { if (n++ > 4000) break; const v = m.terrain[k]; if (typeof v === "string" && v.length <= 2 && /^-?\d+(,-?\d+)?$/.test(k)) terr[k] = v; } }
        me.terrain = terr;
        me.landTier = Math.max(0, Math.min(6, +m.landTier || 0));
        // If friends are watching your space right now, push the live update.
        toRoom("s:" + me.id, { t: "visit:build", ...buildOf(me) }, me.id);
      }
      else if (m.t === "visit") {   // drop into a traveller's CIRQLSPACE (join their live space room)
        const host = players.get(String(m.toId));
        if (!host || host.id === me.id) return;
        if (!host.spaceOpen && !(host.invited && host.invited.has(me.id))) { send(me.ws, { t: "visit:denied", name: host.name }); return; }
        if (roomCount("s:" + host.id) >= 8) { send(me.ws, { t: "visit:full", name: host.name }); return; }   // cap 8
        enterRoom(me, 0, host.id);   // join the host's live space room (leaves your own)
        send(me.ws, { t: "visit:data", withId: host.id, withName: host.name, ...buildOf(host) });
      }
      else if (m.t === "space:home") { enterRoom(me, 0, undefined); }   // leave a space, back to your own
      else if (m.t === "space:mode") { me.spaceOpen = !!m.open; send(me.ws, { t: "space:mode", open: me.spaceOpen }); }
      else if (m.t === "space:invite") {
        const g = players.get(String(m.toId));
        if (g && g.id !== me.id) { (me.invited ||= new Set()).add(g.id); send(g.ws, { t: "space:invited", fromId: me.id, fromName: me.name }); send(me.ws, { t: "space:invite:ok", toName: g.name }); }
      }
      else if (m.t === "emote") {   // chat-free expression relayed to the room (CHR-260)
        const now = Date.now(); if (me.lastEmote && now - me.lastEmote < 450) return; me.lastEmote = now;
        const emote = clip(m.emote, 24); if (!emote) return;
        toRoom(roomKey(me), { t: "emote", id: me.id, emote }, me.id);   // to others in the room (sender shows it locally)
      }
      else if (m.t === "light") {
        const other = players.get(String(m.to));
        if (other && other.id !== me.id && roomKey(other) === roomKey(me)) {
          send(me.ws, { t: "lit", id: other.id, name: other.name });
          send(other.ws, { t: "lit", id: me.id, name: me.name });
        }
      }
      else if (m.t === "pair") {   // a synced paired social gesture — relay to BOTH so they play it together (I4)
        const other = players.get(String(m.to));
        if (other && other.id !== me.id && roomKey(other) === roomKey(me)) {
          const g = clip(m.g, 16); if (!g) return;
          send(me.ws, { t: "paired", withId: other.id, g });
          send(other.ws, { t: "paired", withId: me.id, g });
        }
      }
      // ---- M9 campaign board + matchmaking ----
      else if (m.t === "board:get") { send(ws, { t: "board:list", posts: boardList() }); }
      else if (m.t === "board:post") {
        const now = Date.now();
        if (me.lastPost && now - me.lastPost < 2500) return;    // rate-limit posting
        me.lastPost = now;
        dropPost(me.id);                                        // one open post per player
        const d = m.dir === "seeker" ? "seeker" : "host";
        const steps = Math.max(1, Math.min(12, +m.steps || 1));
        const max = Math.max(2, Math.min(6, +m.max || 4));
        const post: Post = { id: "b" + (nextPost++), dir: d, byId: me.id, byName: me.name, campaignId: clip(m.campaignId, 40), steps, max, tags: clipTags(m.tags), newbie: !!m.newbie, partyId: null };
        if (d === "host") {   // hosting forms a party immediately (you're the host, party of 1 → up to max)
          leaveParty(me, "You started a new party.");
          const party: Party = { id: "p" + (nextParty++), campaignId: post.campaignId, steps, max, hostId: me.id, members: [me.id], step: 0 };
          parties.set(party.id, party); me.partyId = party.id; post.partyId = party.id;
          sendParty(party);
        }
        board.set(post.id, post);
        broadcastBoard();
      }
      else if (m.t === "board:cancel") { dropPost(me.id); if (me.partyId) { const p = parties.get(me.partyId); if (p && p.hostId === me.id && p.members.length === 1) leaveParty(me, "Party closed."); } broadcastBoard(); }
      else if (m.t === "party:ask") {   // a seeker asks to join a host's posted campaign
        const now = Date.now(); if (me.lastAsk && now - me.lastAsk < 1500) return; me.lastAsk = now;
        const post = board.get(String(m.postId));
        if (post && post.dir === "host" && post.partyId) {
          const p = parties.get(post.partyId);
          const host = players.get(post.byId);
          if (p && host && p.members.length < p.max && !p.members.includes(me.id)) send(host.ws, { t: "party:ask", fromId: me.id, fromName: me.name });
        }
      }
      else if (m.t === "party:accept" || m.t === "party:decline") {   // host answers an ask
        const asker = players.get(String(m.askerId));
        const p = me.partyId ? parties.get(me.partyId) : null;
        if (!asker) return;
        if (m.t === "party:decline") { send(asker.ws, { t: "party:declined", byName: me.name }); return; }
        if (p && p.hostId === me.id && p.members.length < p.max && !p.members.includes(asker.id)) {
          leaveParty(asker, "You joined a new party.");   // drop any prior party first
          asker.partyId = p.id; p.members.push(asker.id);
          sendParty(p); broadcastBoard();
        }
      }
      else if (m.t === "party:invite") {   // a host invites a seeker's post into their party
        const post = board.get(String(m.postId));
        const p = me.partyId ? parties.get(me.partyId) : null;
        const seeker = post ? players.get(post.byId) : null;
        if (post && post.dir === "seeker" && p && p.hostId === me.id && seeker && p.members.length < p.max) {
          send(seeker.ws, { t: "party:invite", fromId: me.id, fromName: me.name, partyId: p.id, campaignId: p.campaignId, steps: p.steps });
        }
      }
      else if (m.t === "party:acceptInvite") {   // seeker accepts an invite → joins that party
        const p = parties.get(String(m.partyId));
        if (p && p.members.length < p.max && !p.members.includes(me.id)) {
          leaveParty(me, "You joined a new party."); dropPost(me.id);
          me.partyId = p.id; p.members.push(me.id);
          sendParty(p); broadcastBoard();
        }
      }
      else if (m.t === "party:advance") {   // any member marks the current step done
        const p = me.partyId ? parties.get(me.partyId) : null;
        if (!p || !p.members.includes(me.id)) return;
        if (typeof m.step === "number" && m.step !== p.step) return;   // idempotent: only the current step advances
        p.step = Math.min(p.steps, p.step + 1);
        if (p.step >= p.steps) {   // campaign complete → reward client-side, then disband
          for (const mid of p.members) { const pl = players.get(mid); if (pl) { pl.partyId = undefined; send(pl.ws, { t: "party:complete", campaignId: p.campaignId }); } }
          parties.delete(p.id); dropPost(p.hostId); broadcastBoard();
        } else { sendParty(p); }
      }
      else if (m.t === "party:leave") { leaveParty(me, "A traveller left the party."); broadcastBoard(); }
      else if (m.t === "party:report") { /* minimal: block is client-side; log for moderation */ console.log(`[cirql] report by ${me.id} of ${String(m.targetId)}`); }
      // ---- 1:1 Direct Messages — request/accept gated, session-scoped (CHR-248) ----
      else if (m.t === "dm:request") {   // ask to open a private thread; recipient must accept
        const now = Date.now(); if (me.lastDmReq && now - me.lastDmReq < 2000) return; me.lastDmReq = now;
        const other = players.get(String(m.toId));
        if (other && other.id !== me.id && !dmPairs.has(dmKey(me.id, other.id))) send(other.ws, { t: "dm:request", fromId: me.id, fromName: me.name });
      }
      else if (m.t === "dm:accept") {   // recipient opens the thread → notify both sides
        const other = players.get(String(m.fromId));
        if (other && other.id !== me.id) {
          dmPairs.add(dmKey(me.id, other.id));
          send(me.ws, { t: "dm:open", withId: other.id, withName: other.name });
          send(other.ws, { t: "dm:open", withId: me.id, withName: me.name });
        }
      }
      else if (m.t === "dm:decline") { const other = players.get(String(m.fromId)); if (other) send(other.ws, { t: "dm:declined", byName: me.name }); }
      else if (m.t === "dm") {   // a message on an accepted thread — masked + rate-limited, to both parties
        const now = Date.now(); if (me.lastDm && now - me.lastDm < 700) return; me.lastDm = now;
        const other = players.get(String(m.toId));
        if (!other || !dmPairs.has(dmKey(me.id, other.id))) return;   // only within an accepted thread
        const text = maskProfanity(clip(m.text, 120)); if (!text) return;
        const msg = { t: "dm", from: me.id, fromName: me.name, to: other.id, text };
        send(other.ws, msg); send(me.ws, msg);   // both see it (sender echo attributes to the same thread)
      }
    });

    const leave = () => {
      if (!me) return;
      leaveParty(me, "A traveller left the party.");
      dropPost(me.id);
      for (const k of Array.from(dmPairs)) if (k.split("|").includes(me.id)) dmPairs.delete(k);   // end their DM threads
      // If a host vanishes, evict anyone visiting their CIRQLSPACE back to their own.
      const hostRoom = "s:" + me.id;
      for (const p of Array.from(players.values())) if (p.id !== me.id && p.spaceHost === me.id) { send(p.ws, { t: "space:closed", name: me.name }); enterRoom(p, 0, undefined); }
      const room = roomKey(me);
      players.delete(me.id);
      toRoom(room, { t: "leave", id: me.id });
      broadcastBoard();
      me = null;
    };
    ws.on("close", leave);
    ws.on("error", leave);
  });

  return wss;
}
