// mp-client — thin WebSocket client for CirqlCade online multiplayer (/ws/mp).
// The server is authoritative: we send inputs, receive snapshots, and surface
// lifecycle events to the React host. See server/multiplayer.ts for the protocol.

export interface MpHandlers {
  onWaiting?: () => void;
  onStart?: (m: { side: 0 | 1; opponent: string; game: string }) => void;
  onState?: (s: any) => void;
  onOver?: (m: { winner: 0 | 1; s?: number[] } & any) => void;
  onRematchWanted?: () => void;
  onOpponentLeft?: () => void;
  onClose?: () => void;
  onError?: (msg: string) => void;
}

export class MpClient {
  private ws: WebSocket;
  private closed = false;
  constructor(game: string, name: string, private h: MpHandlers) {
    const proto = location.protocol === "https:" ? "wss" : "ws";
    this.ws = new WebSocket(`${proto}://${location.host}/ws/mp`);
    this.ws.onopen = () => this.send({ t: "join", game, name });
    this.ws.onmessage = (ev) => {
      let m: any; try { m = JSON.parse(ev.data); } catch { return; }
      switch (m.t) {
        case "waiting": h.onWaiting?.(); break;
        case "start": h.onStart?.(m); break;
        case "state": h.onState?.(m); break;
        case "over": h.onOver?.(m); break;
        case "rematchWanted": h.onRematchWanted?.(); break;
        case "opponentLeft": h.onOpponentLeft?.(); break;
        case "error": h.onError?.(m.msg || "error"); break;
      }
    };
    this.ws.onclose = () => { if (!this.closed) h.onClose?.(); };
    this.ws.onerror = () => { if (!this.closed) h.onError?.("connection error"); };
  }
  private send(o: any) { if (this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(o)); }
  input(msg: any) { this.send({ t: "input", ...msg }); }
  rematch() { this.send({ t: "rematch" }); }
  close() { this.closed = true; try { this.send({ t: "leave" }); this.ws.close(); } catch { /* ignore */ } }
}
