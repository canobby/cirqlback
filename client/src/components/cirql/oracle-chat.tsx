import { useEffect, useRef, useState } from "react";

// The in-world talk panel for the CIRQL Fountain Oracle + ring NPCs.
// Public (no auth) — talks to /api/cirql/oracle/chat, which is rate-limited and
// returns a graceful message if the world's Oracle isn't configured (no OpenAI key).

// Who the player is talking to (mirrors the engine + server speaker shapes).
export type Speaker =
  | { kind: "oracle"; name: string }
  | { kind: "npc"; ring: string; name: string; role: string };

// The server accepts a bare { kind: "oracle" } — strip our display-only name.
function toWire(s: Speaker) {
  return s.kind === "oracle" ? { kind: "oracle" } : { kind: "npc", ring: s.ring, name: s.name, role: s.role };
}

type Msg = { role: "user" | "assistant"; content: string };

// Greeting + a few starter questions, themed to who's speaking.
function intro(s: Speaker): { hi: string; suggestions: string[] } {
  if (s.kind === "oracle") {
    return {
      hi: "The water stills, and a warm voice rises from the Fountain. Ask, traveller — of this world, its story, or how to find your way.",
      suggestions: [
        "What is CIRQLSPHERE?",
        "What's that turning sign above the fountain?",
        "What am I supposed to do here?",
        "Tell me about the grey.",
      ],
    };
  }
  return {
    hi: `${s.name} looks up with a friendly nod. "Welcome, traveller. Ask me about our island — I'll tell you what I know."`,
    suggestions: ["Where am I?", "What's there to see here?", "Who lives on this island?", "Any news from elsewhere?"],
  };
}

// Tiny inline markdown: **bold**, *italic*, and paragraph breaks. The replies are
// short in-character lines, so this is all we need.
function render(text: string) {
  return text.split(/\n{2,}/).map((para, pi) => {
    const parts: (string | JSX.Element)[] = [];
    const re = /\*\*([^*]+)\*\*|\*([^*]+)\*/g;
    let last = 0, m: RegExpExecArray | null, k = 0;
    while ((m = re.exec(para)) !== null) {
      if (m.index > last) parts.push(para.slice(last, m.index));
      if (m[1] !== undefined) parts.push(<strong key={k++}>{m[1]}</strong>);
      else parts.push(<em key={k++}>{m[2]}</em>);
      last = m.index + m[0].length;
    }
    if (last < para.length) parts.push(para.slice(last));
    return <p key={pi} className="my-1 leading-relaxed">{parts}</p>;
  });
}

export default function OracleChat({ speaker, onClose }: { speaker: Speaker; onClose: () => void }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isOracle = speaker.kind === "oracle";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || loading) return;
    setError(null);
    const next = [...messages, { role: "user" as const, content: q }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/cirql/oracle/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ speaker: toWire(speaker), messages: next, stream: true }),
      });
      const ct = res.headers.get("content-type") || "";
      if (!res.ok || !res.body || !ct.includes("text/event-stream")) {
        let msg = "The water is quiet. Please try again.";
        try { msg = (await res.json()).error || msg; } catch {}
        setError(msg);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "", acc = "", started = false, streamErr: string | null = null;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const events = buf.split("\n\n");
        buf = events.pop() || "";
        for (const evt of events) {
          const dataLine = evt.split("\n").find((l) => l.startsWith("data:"));
          if (!dataLine) continue;
          const payload = dataLine.slice(5).trim();
          if (!payload) continue;
          let obj: any;
          try { obj = JSON.parse(payload); } catch { continue; }
          if (obj.delta) {
            acc += obj.delta;
            if (!started) { started = true; setMessages((m) => [...m, { role: "assistant", content: acc }]); }
            else setMessages((m) => { const c = m.slice(); c[c.length - 1] = { role: "assistant", content: acc }; return c; });
          } else if (obj.error) streamErr = obj.error;
        }
      }
      if (streamErr && !acc) setError(streamErr);
    } catch {
      setError("The water clouds over. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const greet = intro(speaker);
  const title = isOracle ? speaker.name : speaker.name;
  const subtitle = isOracle ? "Oracle of the Everturn" : (speaker as any).role;
  // Oracle = deep mystic teal/violet; NPC = warm earthy amber.
  const accent = isOracle
    ? { from: "from-cyan-700", to: "to-violet-700", chip: "text-cyan-200", ring: "border-cyan-500/40", btn: "bg-cyan-600 hover:bg-cyan-500", sug: "border-cyan-500/30 text-cyan-100 hover:border-cyan-400 hover:bg-cyan-500/10", ico: "◎" }
    : { from: "from-amber-700", to: "to-orange-800", chip: "text-amber-100", ring: "border-amber-500/40", btn: "bg-amber-600 hover:bg-amber-500", sug: "border-amber-500/30 text-amber-100 hover:border-amber-400 hover:bg-amber-500/10", ico: "❉" };

  return (
    <div className="pointer-events-auto fixed inset-x-0 bottom-0 z-[60] flex justify-center px-3 pb-3 sm:inset-auto sm:bottom-5 sm:right-5">
      <div className={`flex h-[min(460px,72vh)] w-full max-w-[440px] flex-col overflow-hidden rounded-2xl border ${accent.ring} bg-[#0b1120]/95 shadow-2xl backdrop-blur`}>
        {/* Header */}
        <div className={`flex items-center justify-between bg-gradient-to-r ${accent.from} ${accent.to} px-4 py-3 text-white`}>
          <div className="flex items-center gap-2">
            <span className="text-lg">{accent.ico}</span>
            <div>
              <div className="text-sm font-bold leading-tight">{title}</div>
              <div className="text-[11px] opacity-90">{subtitle}</div>
            </div>
          </div>
          <button onClick={onClose} aria-label="Leave" data-testid="button-oracle-close" className="rounded-full px-2 py-0.5 text-sm hover:bg-white/20">✕</button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-4 text-sm text-slate-100">
          {messages.length === 0 && (
            <div className="space-y-3">
              <div className="rounded-xl rounded-tl-sm bg-white/5 px-3 py-2 text-slate-200">{greet.hi}</div>
              <div className="space-y-2">
                <div className={`px-1 text-[11px] font-semibold uppercase tracking-wide ${accent.chip} opacity-70`}>Try asking</div>
                {greet.suggestions.map((s) => (
                  <button key={s} onClick={() => send(s)} className={`block w-full rounded-lg border ${accent.sug} bg-white/5 px-3 py-2 text-left transition`}>{s}</button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-xl px-3 py-2 shadow-sm ${m.role === "user" ? "rounded-br-sm bg-white/15 text-white" : "rounded-tl-sm bg-white/5 text-slate-100"}`}>
                {m.role === "assistant" ? <div>{render(m.content)}</div> : m.content}
              </div>
            </div>
          ))}
          {loading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex justify-start"><div className="rounded-xl rounded-tl-sm bg-white/5 px-3 py-2 text-slate-400">…</div></div>
          )}
          {error && <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div>}
        </div>

        {/* Composer */}
        <div className="border-t border-white/10 bg-black/20 p-2">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
              placeholder={isOracle ? "Ask the Fountain…" : `Ask ${speaker.name}…`}
              data-testid="input-oracle-message"
              rows={1}
              className="max-h-24 min-h-[40px] flex-1 resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-white/30 focus:outline-none"
            />
            <button onClick={() => send(input)} disabled={loading || !input.trim()} data-testid="button-oracle-send" className={`h-10 shrink-0 rounded-lg px-4 text-sm font-semibold text-white transition disabled:opacity-40 ${accent.btn}`}>Ask</button>
          </div>
        </div>
      </div>
    </div>
  );
}
