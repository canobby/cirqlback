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

interface Traveller { ws: WebSocket; id: string; name: string; avatar: unknown; ring: number; x: number; y: number; dir: string; partyId?: string; lastAsk?: number; lastPost?: number; lastEmote?: number; lastChat?: number; }
interface Party { id: string; campaignId: string; steps: number; max: number; hostId: string; members: string[]; step: number; }
interface Post { id: string; dir: "host" | "seeker"; byId: string; byName: string; campaignId: string; steps: number; max: number; tags: string[]; newbie: boolean; partyId: string | null; }

const DIRS = new Set(["up", "down", "left", "right"]);

export function setupCirqlPresence() {
  const wss = new WebSocketServer({ noServer: true });
  const players = new Map<string, Traveller>();
  const parties = new Map<string, Party>();
  const board = new Map<string, Post>();
  let nextId = 1, nextParty = 1, nextPost = 1;

  const serialize = (p: Traveller) => ({ id: p.id, name: p.name, avatar: p.avatar, ring: p.ring, x: p.x, y: p.y, dir: p.dir });
  const send = (ws: WebSocket, msg: unknown) => { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg)); };
  const toRing = (ring: number, msg: unknown, exceptId?: string) => { for (const p of Array.from(players.values())) if (p.ring === ring && p.id !== exceptId) send(p.ws, msg); };
  const toAll = (msg: unknown) => { for (const p of Array.from(players.values())) send(p.ws, msg); };
  const peersOn = (ring: number, selfId: string) => Array.from(players.values()).filter((p) => p.ring === ring && p.id !== selfId).map(serialize);
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
        me = { ws, id, name: clip(m.name, 16) || "Traveller", avatar: m.avatar ?? null, ring: +m.ring || 0, x: +m.x || 0, y: +m.y || 0, dir: dir(m.dir) };
        players.set(id, me);
        send(ws, { t: "welcome", id, players: peersOn(me.ring, id) });
        send(ws, { t: "board:list", posts: boardList() });     // hand the newcomer the current board
        toRing(me.ring, { t: "join", ...serialize(me) }, id);
      } else if (!me) { return; }
      else if (m.t === "move") {
        const nr = +m.ring || 0;
        if (nr !== me.ring) {
          toRing(me.ring, { t: "leave", id }, id);
          me.ring = nr;
          send(ws, { t: "welcome", id, players: peersOn(me.ring, id) });
          toRing(me.ring, { t: "join", ...serialize(me) }, id);
        }
        me.x = +m.x; me.y = +m.y; me.dir = dir(m.dir);
        toRing(me.ring, { t: "move", id, x: me.x, y: me.y, dir: me.dir }, id);
      }
      else if (m.t === "chat") {
        const now = Date.now(); if (me.lastChat && now - me.lastChat < 700) return; me.lastChat = now;   // anti-spam rate limit
        const text = maskProfanity(clip(m.text, 120)); if (!text) return;   // server-authoritative moderation (CHR-249)
        if (m.scope === "party" && me.partyId) {   // party channel — only fellow members
          const p = parties.get(me.partyId);
          if (p) for (const mid of p.members) { const pl = players.get(mid); if (pl) send(pl.ws, { t: "chat", id: me.id, name: me.name, text, channel: "party" }); }
        } else {
          toRing(me.ring, { t: "chat", id: me.id, name: me.name, text, channel: "global" });   // to the ring incl. sender
        }
      }
      else if (m.t === "emote") {   // chat-free expression relayed to the ring (CHR-260)
        const now = Date.now(); if (me.lastEmote && now - me.lastEmote < 450) return; me.lastEmote = now;
        const emote = clip(m.emote, 24); if (!emote) return;
        toRing(me.ring, { t: "emote", id: me.id, emote }, me.id);   // to others on the ring (sender shows it locally)
      }
      else if (m.t === "light") {
        const other = players.get(String(m.to));
        if (other && other.id !== me.id && other.ring === me.ring) {
          send(me.ws, { t: "lit", id: other.id, name: other.name });
          send(other.ws, { t: "lit", id: me.id, name: me.name });
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
    });

    const leave = () => {
      if (!me) return;
      leaveParty(me, "A traveller left the party.");
      dropPost(me.id);
      players.delete(me.id);
      toRing(me.ring, { t: "leave", id: me.id });
      broadcastBoard();
      me = null;
    };
    ws.on("close", leave);
    ws.on("error", leave);
  });

  return wss;
}
