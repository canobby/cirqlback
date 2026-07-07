// CIRQLVERSE — M8 live presence + chat (the flagship's social layer).
//
// A ring-aware broadcast room at /ws/cirql: every connected traveller shares their
// avatar, name, ring and position, and the server relays moves + chat to everyone
// ELSE ON THE SAME RING in real time. Grown from the proven /ws/town prototype
// (server/town.ts) but scoped per ring so the concentric world can scale — you only
// see + hear the people sharing your island. Also carries "share a light": a chat-free
// beacon two nearby travellers exchange to light a lantern on each other's Hearth
// (the locked social payoff — "your Cirql = lanterns lighting your home").
//
// Deliberately tiny + stateless (roster in memory) — presence, not an authoritative
// sim (see multiplayer.ts for that). Chat is rendered on the pixel canvas / as smooth
// overlay text, never as HTML, so trim + length-clip is enough: no markup can inject.
import { WebSocketServer, WebSocket } from "ws";

interface Traveller { ws: WebSocket; id: string; name: string; avatar: unknown; ring: number; x: number; y: number; dir: string }

const DIRS = new Set(["up", "down", "left", "right"]);

export function setupCirqlPresence() {
  const wss = new WebSocketServer({ noServer: true });
  const players = new Map<string, Traveller>();
  let nextId = 1;

  const serialize = (p: Traveller) => ({ id: p.id, name: p.name, avatar: p.avatar, ring: p.ring, x: p.x, y: p.y, dir: p.dir });
  const send = (ws: WebSocket, msg: unknown) => { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg)); };
  // relay to everyone else sharing `ring` (the sender is skipped unless includeSelf)
  const toRing = (ring: number, msg: unknown, exceptId?: string) => { for (const p of Array.from(players.values())) if (p.ring === ring && p.id !== exceptId) send(p.ws, msg); };
  const peersOn = (ring: number, selfId: string) => Array.from(players.values()).filter((p) => p.ring === ring && p.id !== selfId).map(serialize);
  const clip = (s: unknown, n: number) => String(s ?? "").replace(/\s+/g, " ").slice(0, n).trim();
  const dir = (d: unknown) => (typeof d === "string" && DIRS.has(d) ? d : "down");

  wss.on("connection", (ws: WebSocket) => {
    const id = "c" + (nextId++);
    let me: Traveller | null = null;

    ws.on("message", (data: Buffer) => {
      let m: any; try { m = JSON.parse(data.toString()); } catch { return; }
      if (m.t === "join") {
        if (me) return;
        me = { ws, id, name: clip(m.name, 16) || "Traveller", avatar: m.avatar ?? null, ring: +m.ring || 0, x: +m.x || 0, y: +m.y || 0, dir: dir(m.dir) };
        players.set(id, me);
        // give the newcomer their id + everyone already on their ring
        send(ws, { t: "welcome", id, players: peersOn(me.ring, id) });
        // announce them to the rest of the ring
        toRing(me.ring, { t: "join", ...serialize(me) }, id);
      } else if (!me) { return; }
      else if (m.t === "move") {
        const nr = +m.ring || 0;
        if (nr !== me.ring) {   // sailed to another ring — leave the old view, enter the new
          toRing(me.ring, { t: "leave", id }, id);
          me.ring = nr;
          send(ws, { t: "welcome", id, players: peersOn(me.ring, id) });
          toRing(me.ring, { t: "join", ...serialize(me) }, id);
        }
        me.x = +m.x; me.y = +m.y; me.dir = dir(m.dir);
        toRing(me.ring, { t: "move", id, x: me.x, y: me.y, dir: me.dir }, id);
      }
      else if (m.t === "chat") { const text = clip(m.text, 120); if (text) toRing(me.ring, { t: "chat", id, name: me.name, text }); }   // to the ring incl. sender
      else if (m.t === "light") {   // share a light — both travellers light a lantern for each other
        const other = players.get(String(m.to));
        if (other && other.id !== me.id && other.ring === me.ring) {
          send(me.ws, { t: "lit", id: other.id, name: other.name });
          send(other.ws, { t: "lit", id: me.id, name: me.name });
        }
      }
    });

    const leave = () => { if (me) { players.delete(me.id); toRing(me.ring, { t: "leave", id: me.id }); me = null; } };
    ws.on("close", leave);
    ws.on("error", leave);
  });

  return wss;
}
