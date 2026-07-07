// CIRQL CITY — live "shared town" prototype (the flagship-social proof of concept).
//
// A single broadcast room at /ws/town: every connected player shares their avatar,
// name and position, and the server relays moves + chat to everyone else in real time.
// No authoritative sim (unlike multiplayer.ts's game rooms) — this is presence + social,
// the seed of the persistent world we're brainstorming. Deliberately tiny + stateless
// (roster lives in memory); it just proves the "walk around and see other real people"
// feel before we invest in the bigger build. Chat renders on the pixel canvas (not HTML),
// so trim+slice is enough — no markup can be injected.
import { WebSocketServer, WebSocket } from "ws";

interface Player { ws: WebSocket; id: string; name: string; avatar: unknown; x: number; y: number; dir: number }

export function setupTown() {
  const wss = new WebSocketServer({ noServer: true });
  const players = new Map<string, Player>();
  let nextId = 1;

  const serialize = (p: Player) => ({ id: p.id, name: p.name, avatar: p.avatar, x: p.x, y: p.y, dir: p.dir });
  const send = (ws: WebSocket, msg: unknown) => { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg)); };
  const broadcast = (msg: unknown, exceptId?: string) => { for (const p of Array.from(players.values())) if (p.id !== exceptId) send(p.ws, msg); };
  const clip = (s: unknown, n: number) => String(s ?? "").replace(/\s+/g, " ").slice(0, n).trim();

  wss.on("connection", (ws: WebSocket) => {
    const id = "p" + (nextId++);
    let me: Player | null = null;

    ws.on("message", (data: Buffer) => {
      let m: any; try { m = JSON.parse(data.toString()); } catch { return; }
      if (m.t === "join") {
        if (me) return;
        me = { ws, id, name: clip(m.name, 16) || "Cirqler", avatar: m.avatar ?? null, x: +m.x || 120, y: +m.y || 100, dir: m.dir === -1 ? -1 : 1 };
        players.set(id, me);
        // give the newcomer their id + everyone already here
        send(ws, { t: "welcome", id, players: Array.from(players.values()).filter((p) => p.id !== id).map(serialize), count: players.size });
        // announce them to everyone else
        broadcast({ t: "join", ...serialize(me) }, id);
      } else if (!me) { return; }
      else if (m.t === "move") { me.x = +m.x; me.y = +m.y; me.dir = m.dir === -1 ? -1 : 1; broadcast({ t: "move", id, x: me.x, y: me.y, dir: me.dir }, id); }
      else if (m.t === "chat") { const text = clip(m.text, 120); if (text) broadcast({ t: "chat", id, name: me.name, text }); }   // to everyone incl. sender
      else if (m.t === "emote") { broadcast({ t: "emote", id, emote: clip(m.emote, 16) }); }
    });

    const leave = () => { if (me) { players.delete(me.id); broadcast({ t: "leave", id: me.id, count: players.size }); me = null; } };
    ws.on("close", leave);
    ws.on("error", leave);
  });

  return wss;
}
