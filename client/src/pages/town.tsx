import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Send, Zap } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { SharedTownEngine } from "@/game/shared-town-engine";
import type { Btn } from "@/game/retro-engine";
import { loadAvatarLS } from "@/game/avatar";
import { Joystick } from "@/components/joystick";

// CIRQL CITY — live "shared town" prototype. Connects to /ws/town, walks your avatar
// around Main Street, and shows every other connected player moving + chatting in real
// time. The proof-of-concept for the persistent social flagship we're brainstorming.
interface Msg { key: number; name: string; text: string; me: boolean }

export default function Town() {
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<SharedTownEngine | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const myId = useRef<string>("");
  const [count, setCount] = useState(1);
  const [connected, setConnected] = useState(false);
  const [feed, setFeed] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const keyN = useRef(0);

  useEffect(() => {
    if (!canvasRef.current) return;
    const eng = new SharedTownEngine(canvasRef.current);
    engineRef.current = eng;
    const name = ((user as any)?.username || (user as any)?.name || (user as any)?.firstName || "").toString().slice(0, 16) || `Cirqler${Math.floor(Math.random() * 900 + 100)}`;
    const avatar = loadAvatarLS();
    eng.setLocal(name, avatar);
    if (import.meta.env.DEV) (window as any).__game = eng;

    const proto = location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${proto}://${location.host}/ws/town`);
    wsRef.current = ws;
    const pushMsg = (name: string, text: string, me: boolean) => setFeed((f) => [...f.slice(-7), { key: keyN.current++, name, text, me }]);

    ws.onopen = () => { setConnected(true); ws.send(JSON.stringify({ t: "join", name, avatar, x: eng.startX(), y: eng.startY(), dir: 1 })); };
    ws.onclose = () => setConnected(false);
    ws.onmessage = (e) => {
      let m: any; try { m = JSON.parse(e.data); } catch { return; }
      if (m.t === "welcome") { myId.current = m.id; (m.players || []).forEach((p: any) => eng.addRemote(p)); setCount(eng.count()); }
      else if (m.t === "join") { eng.addRemote(m); setCount(eng.count()); pushMsg("", `${m.name} arrived`, false); }
      else if (m.t === "move") { eng.moveRemote(m.id, m.x, m.y, m.dir); }
      else if (m.t === "leave") { eng.removeRemote(m.id); setCount(eng.count()); }
      else if (m.t === "chat") { if (m.id === myId.current) { eng.sayLocal(m.text); pushMsg(m.name, m.text, true); } else { eng.chatRemote(m.id, m.text); pushMsg(m.name, m.text, false); } }
    };
    // wire local movement → socket
    eng.onLocalMove = (x, y, dir) => { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ t: "move", x, y, dir })); };

    return () => { try { ws.close(); } catch { /* ignore */ } eng.destroy(); engineRef.current = null; };
  }, []);

  const hold = (b: Btn) => ({
    onPointerDown: (e: React.PointerEvent) => { e.preventDefault(); try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ } engineRef.current?.press(b); },
    onPointerUp: () => engineRef.current?.release(b),
    onPointerCancel: () => engineRef.current?.release(b),
    style: { touchAction: "none" as const },
  });

  const sendChat = () => { const t = draft.trim(); if (!t) return; wsRef.current?.send(JSON.stringify({ t: "chat", text: t })); setDraft(""); };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center" style={{ background: "#0d0a20", color: "#eee6ff", touchAction: "none", userSelect: "none" }}>
      <div className="flex w-full max-w-[640px] items-center gap-3 px-4 pb-1 pt-3">
        <Link href="/arcade" className="flex items-center gap-1 text-xs text-violet-300/70 hover:text-violet-200" data-testid="link-back"><ArrowLeft className="h-4 w-4" /> Arcade</Link>
        <div className="ml-1 text-sm font-extrabold uppercase tracking-wide" style={{ color: "#ffd24a", textShadow: "0 0 10px rgba(255,210,74,.5)" }}>Cirql City · Live</div>
        <span className="ml-auto flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider" style={{ borderColor: connected ? "#33e65066" : "#ff5d7d66", color: connected ? "#33e650" : "#ff5d7d" }}>
          <span style={{ width: 6, height: 6, borderRadius: 99, background: connected ? "#33e650" : "#ff5d7d", boxShadow: connected ? "0 0 8px #33e650" : "none" }} /> {connected ? `${count} online` : "connecting…"}
        </span>
      </div>

      <div className="relative flex min-h-0 w-full flex-1 items-center justify-center p-2">
        <canvas ref={canvasRef} data-testid="town-canvas" className="block" style={{ imageRendering: "pixelated", boxShadow: "0 0 60px rgba(183,155,255,.18)", borderRadius: 6 }} />
        {/* live chat feed overlay */}
        <div className="pointer-events-none absolute left-4 top-3 flex max-w-[62%] flex-col gap-1">
          {feed.slice(-6).map((m) => (
            <div key={m.key} className="w-fit rounded-md px-2 py-1 text-[11px] leading-tight" style={{ background: "rgba(10,7,20,.72)", border: `1px solid ${m.me ? "#ffd24a55" : m.name ? "#b79bff44" : "#33e65044"}` }}>
              {m.name ? <><span className="font-bold" style={{ color: m.me ? "#ffd24a" : "#c9b8ff" }}>{m.name}:</span> <span className="text-violet-100/90">{m.text}</span></> : <span className="italic text-emerald-300/80">{m.text}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* joystick + run · chat bar */}
      <div className="flex w-full max-w-[640px] flex-col gap-2 px-5 pb-[calc(14px+env(safe-area-inset-bottom))] pt-1">
        <div className="flex items-center gap-2">
          <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") sendChat(); }} maxLength={120} placeholder="Say something to the street…" data-testid="chat-input"
            className="min-w-0 flex-1 rounded-xl border px-3 py-2.5 text-[13px] outline-none" style={{ borderColor: "#3a2a72", background: "rgba(255,255,255,.04)", color: "#fff", touchAction: "auto" }} />
          <button onClick={sendChat} data-testid="chat-send" className="flex h-11 w-11 items-center justify-center rounded-xl border-[1.5px] active:scale-90" style={{ borderColor: "#ffd24a", color: "#ffd24a", background: "rgba(255,210,74,.08)" }}><Send className="h-5 w-5" /></button>
        </div>
        <div className="flex items-end justify-between gap-4">
          <Joystick press={(b) => engineRef.current?.press(b)} release={(b) => engineRef.current?.release(b)} color="#b79bff" size={128} />
          <button {...hold("b")} data-testid="btn-run" className="mb-2 flex h-14 w-14 flex-col items-center justify-center rounded-full border-[1.5px] text-[9px] font-extrabold active:scale-90" style={{ borderColor: "#3bb6ff", color: "#7be0ff", background: "rgba(255,255,255,.03)", boxShadow: "0 0 16px rgba(59,182,255,.2) inset", touchAction: "none" }}><Zap className="h-5 w-5" /> RUN</button>
        </div>
      </div>
    </div>
  );
}
