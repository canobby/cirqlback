// Real-time multiplayer for CirqlCade — the online pilot (Pong + Sumo).
//
// A single authoritative WebSocket game server at /ws/mp. Clients join a per-game
// matchmaking queue; two players are paired into a Room that runs the game sim
// SERVER-SIDE at 60 Hz and broadcasts snapshots at ~30 Hz. Clients only send input
// (a paddle angle / a thrust vector) and render the snapshots — so the server is
// the single source of truth (no client can cheat the physics, no peer-to-peer
// sync problem). If no human turns up within ~9 s, the waiting player is matched
// with a server-side bot so it's never a dead-end.
//
// Adding a game = implement the `Sim` interface + register it in GAMES. Everything
// else (matchmaking, rooms, ticking, broadcast, rematch, disconnect) is generic.
import { WebSocketServer, WebSocket } from "ws";

// ---------- shared math ----------
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const TAU = Math.PI * 2;
const norm = (a: number) => { a %= TAU; if (a < -Math.PI) a += TAU; if (a > Math.PI) a -= TAU; return a; };

type Side = 0 | 1;

// A server-authoritative game. Positions are normalised: the play-field is a unit
// circle (radius 1) centred at the origin; the client scales it to the canvas.
interface Sim {
  input(side: Side, msg: any): void;   // apply a player's input
  step(dt: number): void;              // advance the world by dt seconds
  botStep(side: Side, dt: number): void; // drive `side` as a bot for one tick
  snapshot(): any;                     // serialisable state for {t:'state'}
  over(): { winner: Side } | null;     // non-null once the match is decided
  reset(): void;                       // new match (rematch)
}

// ======================= Pong =======================
// Circular Pong. Two paddles are arcs on the rim; player 0 defends the bottom half
// (y>0), player 1 the top half (y<0). The ball reflects off a paddle it hits; if it
// crosses the rim where the defender's paddle isn't, the other player scores.
const P = { RPAD: 0.9, HW: 0.42, SPEED0: 0.85, SPEEDMAX: 2.0, WIN: 7 };
class PongSim implements Sim {
  private b = { x: 0, y: 0, vx: 0, vy: 0 };
  private a: [number, number] = [Math.PI / 2, -Math.PI / 2]; // paddle centre angles
  private s: [number, number] = [0, 0];
  private serving = 0.8;
  private done: { winner: Side } | null = null;
  constructor() { this.serve(Math.random() < 0.5 ? 1 : -1); }

  private serve(dir: number) {
    this.b.x = 0; this.b.y = 0;
    const base = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    const ang = base + (Math.random() * 0.7 - 0.35);
    this.b.vx = Math.cos(ang) * P.SPEED0; this.b.vy = Math.sin(ang) * P.SPEED0;
    this.serving = 0.7;
  }
  input(side: Side, msg: any) {
    if (typeof msg.angle !== "number") return;
    const ang = msg.angle;
    // clamp the paddle centre to the player's own half so it stays defendable
    this.a[side] = side === 0 ? clamp(ang, P.HW, Math.PI - P.HW) : clamp(ang, -Math.PI + P.HW, -P.HW);
  }
  botStep(side: Side, dt: number) {
    // track the ball's angle, clamped to my half, ease toward it
    let want = Math.atan2(this.b.y, this.b.x);
    want = side === 0 ? clamp(want, P.HW, Math.PI - P.HW) : clamp(want, -Math.PI + P.HW, -P.HW);
    const cur = this.a[side];
    const step = clamp(want - cur, -3.2 * dt, 3.2 * dt);
    this.a[side] = cur + step;
  }
  step(dt: number) {
    if (this.done) return;
    if (this.serving > 0) { this.serving -= dt; return; }
    this.b.x += this.b.vx * dt; this.b.y += this.b.vy * dt;
    const r = Math.hypot(this.b.x, this.b.y);
    if (r >= P.RPAD) {
      const th = Math.atan2(this.b.y, this.b.x);
      const side: Side = this.b.y > 0 ? 0 : 1;
      const off = norm(th - this.a[side]);
      if (Math.abs(off) <= P.HW) {
        // reflect across the radial normal + a little tangential english
        const nx = this.b.x / r, ny = this.b.y / r;
        const dot = this.b.vx * nx + this.b.vy * ny;
        this.b.vx -= 2 * dot * nx; this.b.vy -= 2 * dot * ny;
        const tx = -ny, ty = nx, e = (off / P.HW) * 0.6;
        this.b.vx += tx * e; this.b.vy += ty * e;
        const sp = Math.min(Math.hypot(this.b.vx, this.b.vy) * 1.04, P.SPEEDMAX) || P.SPEED0;
        const cs = Math.hypot(this.b.vx, this.b.vy) || 1;
        this.b.vx = (this.b.vx / cs) * sp; this.b.vy = (this.b.vy / cs) * sp;
        const pull = P.RPAD - 0.005; this.b.x = nx * pull; this.b.y = ny * pull;
      } else {
        const other: Side = side === 0 ? 1 : 0;
        this.s[other]++;
        if (this.s[other] >= P.WIN) this.done = { winner: other };
        else this.serve(side === 0 ? 1 : -1);
      }
    }
  }
  snapshot() { return { b: [this.b.x, this.b.y], p: [this.a[0], this.a[1]], s: [this.s[0], this.s[1]], srv: this.serving > 0 }; }
  over() { return this.done; }
  reset() { this.s = [0, 0]; this.done = null; this.a = [Math.PI / 2, -Math.PI / 2]; this.serve(Math.random() < 0.5 ? 1 : -1); }
}

// ======================= Sumo =======================
// Two disks in a wall-less ring. Thrust (a drag vector) accelerates your disk;
// barge the rival's centre past the rim to score a ring-out. First to WIN wins.
const S = { RD: 0.14, ACC: 3.4, FRIC: 1.5, REST: 0.6, KNOCK: 0.5, WIN: 5 };
class SumoSim implements Sim {
  private p = [
    { x: -0.45, y: 0, vx: 0, vy: 0 },
    { x: 0.45, y: 0, vx: 0, vy: 0 },
  ];
  private thr: [{ x: number; y: number }, { x: number; y: number }] = [{ x: 0, y: 0 }, { x: 0, y: 0 }];
  private s: [number, number] = [0, 0];
  private resetT = 0.6;
  private done: { winner: Side } | null = null;

  private place() {
    this.p = [{ x: -0.45, y: 0, vx: 0, vy: 0 }, { x: 0.45, y: 0, vx: 0, vy: 0 }];
    this.thr = [{ x: 0, y: 0 }, { x: 0, y: 0 }];
  }
  input(side: Side, msg: any) {
    const ax = typeof msg.ax === "number" ? clamp(msg.ax, -1, 1) : 0;
    const ay = typeof msg.ay === "number" ? clamp(msg.ay, -1, 1) : 0;
    this.thr[side] = { x: ax, y: ay };
  }
  botStep(side: Side, _dt: number) {
    const me = this.p[side], op = this.p[side ^ 1];
    const er = Math.hypot(me.x, me.y);
    let tx: number, ty: number;
    if (er > 0.68) { tx = -me.x; ty = -me.y; }              // near the edge → recover to centre
    else { tx = op.x - me.x; ty = op.y - me.y; }            // else charge the rival
    const m = Math.hypot(tx, ty) || 1;
    this.thr[side] = { x: tx / m, y: ty / m };
  }
  step(dt: number) {
    if (this.done) return;
    if (this.resetT > 0) { this.resetT -= dt; if (this.resetT <= 0) this.place(); return; }
    for (let i = 0; i < 2; i++) {
      const d = this.p[i];
      d.vx += this.thr[i].x * S.ACC * dt; d.vy += this.thr[i].y * S.ACC * dt;
      const damp = Math.exp(-S.FRIC * dt); d.vx *= damp; d.vy *= damp;
      d.x += d.vx * dt; d.y += d.vy * dt;
    }
    const a = this.p[0], b = this.p[1];
    const dx = b.x - a.x, dy = b.y - a.y; const dist = Math.hypot(dx, dy) || 1e-6;
    if (dist < 2 * S.RD) {
      const nx = dx / dist, ny = dy / dist, overlap = 2 * S.RD - dist;
      a.x -= nx * overlap / 2; a.y -= ny * overlap / 2; b.x += nx * overlap / 2; b.y += ny * overlap / 2;
      const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (rel < 0) { const imp = (-(1 + S.REST) * rel) / 2; a.vx -= imp * nx; a.vy -= imp * ny; b.vx += imp * nx; b.vy += imp * ny; }
      a.vx -= nx * S.KNOCK; a.vy -= ny * S.KNOCK; b.vx += nx * S.KNOCK; b.vy += ny * S.KNOCK;
    }
    for (let i = 0; i < 2; i++) {
      if (Math.hypot(this.p[i].x, this.p[i].y) > 1.0) {
        const other = (i === 0 ? 1 : 0) as Side;
        this.s[other]++;
        if (this.s[other] >= S.WIN) this.done = { winner: other };
        else this.resetT = 0.8;
      }
    }
  }
  snapshot() { return { p: [[this.p[0].x, this.p[0].y], [this.p[1].x, this.p[1].y]], s: [this.s[0], this.s[1]], rst: this.resetT > 0 }; }
  over() { return this.done; }
  reset() { this.s = [0, 0]; this.done = null; this.resetT = 0.6; this.place(); }
}

const GAMES: Record<string, () => Sim> = { pong: () => new PongSim(), sumo: () => new SumoSim() };

// ---------- connections / rooms ----------
interface Conn { ws: WebSocket; name: string; game: string; room?: Room; side?: Side; }

class Room {
  private sim: Sim;
  private loop: NodeJS.Timeout | null = null;
  private last = Date.now();
  private acc = 0;
  private phase: "play" | "over" = "play";
  private rematchReq: [boolean, boolean] = [false, false];
  constructor(private game: string, private a: Conn | null, private b: Conn | null, private botSide: Side | null) {
    this.sim = GAMES[game]();
    if (a) { a.room = this; a.side = 0; }
    if (b) { b.room = this; b.side = 1; }
    this.begin();
  }
  private begin() {
    this.phase = "play"; this.last = Date.now(); this.acc = 0;
    this.sendStart();
    this.broadcast({ t: "state", ...this.sim.snapshot() });
    this.loop = setInterval(() => this.tick(), 1000 / 60);
  }
  private sendStart() {
    const oppFor = (side: Side) => (this.botSide != null ? "CPU" : (side === 0 ? this.b?.name : this.a?.name) || "Rival");
    if (this.a) this.send(0, { t: "start", side: 0, opponent: oppFor(0), game: this.game });
    if (this.b) this.send(1, { t: "start", side: 1, opponent: oppFor(1), game: this.game });
  }
  private send(side: Side, msg: any) {
    const c = side === 0 ? this.a : this.b;
    if (c && c.ws.readyState === WebSocket.OPEN) c.ws.send(JSON.stringify(msg));
  }
  private broadcast(msg: any) { this.send(0, msg); this.send(1, msg); }
  private tick() {
    const now = Date.now(); let dt = (now - this.last) / 1000; this.last = now; dt = Math.min(dt, 0.05);
    if (this.phase === "play") {
      if (this.botSide != null) this.sim.botStep(this.botSide, dt);
      this.sim.step(dt);
      const o = this.sim.over();
      if (o) { this.phase = "over"; this.broadcast({ t: "over", winner: o.winner, ...this.sim.snapshot() }); }
    }
    this.acc += dt;
    if (this.acc >= 1 / 30) { this.acc = 0; this.broadcast({ t: "state", ...this.sim.snapshot() }); }
  }
  input(side: Side, msg: any) { if (this.phase === "play") this.sim.input(side, msg); }
  rematch(side: Side) {
    this.rematchReq[side] = true;
    const ready = this.botSide != null || (this.rematchReq[0] && this.rematchReq[1]);
    if (!ready) { this.send((side ^ 1) as Side, { t: "rematchWanted" }); return; }
    this.sim.reset(); this.rematchReq = [false, false];
    this.begin();
  }
  leave(side: Side) {
    if (this.loop) { clearInterval(this.loop); this.loop = null; }
    this.send((side ^ 1) as Side, { t: "opponentLeft" });
    if (this.a) this.a.room = undefined; if (this.b) this.b.room = undefined;
    this.a = this.b = null;
  }
}

// Returns a `noServer` WebSocketServer. The caller routes the "/ws/mp" upgrade to
// it via a single shared upgrade handler (multiple {server,path} WSS instances on
// one http server abort each other's upgrades in ws 8.x — see routes.ts).
export function setupMultiplayer() {
  const wss = new WebSocketServer({ noServer: true });
  const queue: Record<string, Conn[]> = {};
  const botTimers = new Map<Conn, NodeJS.Timeout>();

  const clearBot = (c: Conn) => { const t = botTimers.get(c); if (t) { clearTimeout(t); botTimers.delete(c); } };

  const cleanup = (conn: Conn) => {
    clearBot(conn);
    for (const g of Object.keys(queue)) { const i = queue[g].indexOf(conn); if (i >= 0) queue[g].splice(i, 1); }
    if (conn.room) { conn.room.leave(conn.side!); conn.room = undefined; }
  };

  const enqueue = (conn: Conn) => {
    if (conn.room) return; // already in a match
    const q = queue[conn.game] || (queue[conn.game] = []);
    if (q.includes(conn)) return;
    const idx = q.findIndex((c) => c !== conn && c.ws.readyState === WebSocket.OPEN && !c.room);
    if (idx >= 0) {
      const other = q.splice(idx, 1)[0]; clearBot(other);
      new Room(conn.game, other, conn, null);
    } else {
      q.push(conn);
      if (conn.ws.readyState === WebSocket.OPEN) conn.ws.send(JSON.stringify({ t: "waiting" }));
      const t = setTimeout(() => {
        const i = q.indexOf(conn); if (i >= 0 && conn.ws.readyState === WebSocket.OPEN) { q.splice(i, 1); new Room(conn.game, conn, null, 1); }
      }, 9000);
      botTimers.set(conn, t);
    }
  };

  wss.on("connection", (ws: WebSocket) => {
    const conn: Conn = { ws, name: "Guest", game: "" };
    ws.on("message", (data: Buffer) => {
      let m: any; try { m = JSON.parse(data.toString()); } catch { return; }
      if (m.t === "join") {
        conn.name = String(m.name || "Guest").slice(0, 20);
        conn.game = String(m.game || "");
        if (!GAMES[conn.game]) { ws.send(JSON.stringify({ t: "error", msg: "unknown game" })); return; }
        enqueue(conn);
      } else if (m.t === "input") { conn.room?.input(conn.side!, m); }
      else if (m.t === "rematch") { conn.room?.rematch(conn.side!); }
      else if (m.t === "leave") { cleanup(conn); }
    });
    ws.on("close", () => cleanup(conn));
    ws.on("error", () => cleanup(conn));
  });

  return wss;
}
