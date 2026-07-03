import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { Sparkles, X, Send, Loader2 } from "lucide-react";

type Role = "business" | "coordinator" | "admin";
type Msg = { role: "user" | "assistant"; content: string };

// Role-specific opening line + starter questions. These seed the empty state so
// users know what the assistant can do.
const INTRO: Record<Role, { hi: string; suggestions: string[] }> = {
  business: {
    hi: "Hi! I'm your Cirqlback guide. Ask me how anything works — campaigns, your hosted page, rewards, add-ons, payouts, badges…",
    suggestions: [
      "How do I set up my first loyalty campaign?",
      "Where do I turn on my hosted business page?",
      "How do point perks and badges work?",
      "How do multi-store campaigns split the reward cost?",
    ],
  },
  coordinator: {
    hi: "Hi! I'm your Cirqlback coordinator guide. Ask me about onboarding shops, campaigns, revenue share, payouts, or your territory tools.",
    suggestions: [
      "How do I onboard and verify a business?",
      "How is my revenue share calculated and paid?",
      "How do I run a region-wide multi-store campaign?",
      "Where do I fix a customer's points or rewards?",
    ],
  },
  admin: {
    hi: "Hi! I'm your Cirqlback admin guide. Ask me about any dashboard tab — revenue, trust & safety, territories, support, settlements, or platform settings.",
    suggestions: [
      "How do I change a coordinator's revenue share?",
      "How do coordinator payouts work?",
      "Where do I run shared-campaign settlements?",
      "How do I award a badge or impersonate a user?",
    ],
  },
};

// Very small Markdown-ish renderer: **bold**, `code`, bullet & numbered lists,
// and paragraphs. Enough to render the assistant's replies cleanly without a
// heavy dependency.
function renderMarkdown(text: string) {
  const inline = (s: string) => {
    const parts: (string | JSX.Element)[] = [];
    const re = /\*\*([^*]+)\*\*|`([^`]+)`/g;
    let last = 0;
    let m: RegExpExecArray | null;
    let k = 0;
    while ((m = re.exec(s)) !== null) {
      if (m.index > last) parts.push(s.slice(last, m.index));
      if (m[1] !== undefined) parts.push(<strong key={k++}>{m[1]}</strong>);
      else parts.push(<code key={k++} className="rounded bg-purple-100 px-1 py-0.5 text-[0.85em] text-purple-800">{m[2]}</code>);
      last = m.index + m[0].length;
    }
    if (last < s.length) parts.push(s.slice(last));
    return parts;
  };

  const blocks: JSX.Element[] = [];
  const lines = text.split("\n");
  let list: { ordered: boolean; items: string[] } | null = null;
  const flush = () => {
    if (!list) return;
    const items = list.items.map((it, i) => <li key={i}>{inline(it)}</li>);
    blocks.push(
      list.ordered
        ? <ol key={blocks.length} className="my-1 ml-4 list-decimal space-y-1">{items}</ol>
        : <ul key={blocks.length} className="my-1 ml-4 list-disc space-y-1">{items}</ul>,
    );
    list = null;
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    const ol = line.match(/^\s*\d+[.)]\s+(.*)/);
    const ul = line.match(/^\s*[-*•]\s+(.*)/);
    if (ol) {
      if (!list || !list.ordered) { flush(); list = { ordered: true, items: [] }; }
      list.items.push(ol[1]);
    } else if (ul) {
      if (!list || list.ordered) { flush(); list = { ordered: false, items: [] }; }
      list.items.push(ul[1]);
    } else if (line.trim() === "") {
      flush();
    } else {
      flush();
      blocks.push(<p key={blocks.length} className="my-1">{inline(line)}</p>);
    }
  }
  flush();
  return blocks;
}

export default function HelpAssistant({ role }: { role: Role }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, open]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || loading) return;
    setError(null);
    const next = [...messages, { role: "user" as const, content: q }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/assistant/chat", { role, messages: next });
      const data = await res.json();
      setMessages((m) => [...m, { role: "assistant", content: data.reply as string }]);
    } catch (e: any) {
      let msg = "Something went wrong. Please try again.";
      try { msg = JSON.parse(e.message.replace(/^\d+:\s*/, "")).error || msg; } catch {}
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const intro = INTRO[role];

  return (
    <>
      {/* Launcher */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          data-testid="button-help-assistant"
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-gradient-to-br from-purple-600 to-fuchsia-600 px-4 py-3 text-white shadow-lg shadow-purple-500/30 transition hover:scale-105 hover:shadow-xl"
          aria-label="Open help assistant"
        >
          <Sparkles className="h-5 w-5" />
          <span className="text-sm font-semibold">Need help?</span>
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed bottom-5 right-5 z-50 flex h-[min(600px,80vh)] w-[min(400px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-purple-200 bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between bg-gradient-to-r from-purple-600 to-fuchsia-600 px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              <div>
                <div className="text-sm font-bold leading-tight">Cirqlback Guide</div>
                <div className="text-[11px] opacity-90">How-to help, right here</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close" data-testid="button-help-close" className="rounded-full p-1 hover:bg-white/20">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-3 py-4">
            {messages.length === 0 && (
              <div className="space-y-3">
                <div className="rounded-xl rounded-tl-sm bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
                  {intro.hi}
                </div>
                <div className="space-y-2">
                  <div className="px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Try asking</div>
                  {intro.suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="block w-full rounded-lg border border-purple-100 bg-white px-3 py-2 text-left text-sm text-purple-700 transition hover:border-purple-300 hover:bg-purple-50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-xl px-3 py-2 text-sm shadow-sm",
                    m.role === "user"
                      ? "rounded-br-sm bg-purple-600 text-white"
                      : "rounded-tl-sm bg-white text-slate-700",
                  )}
                >
                  {m.role === "assistant" ? <div className="leading-relaxed">{renderMarkdown(m.content)}</div> : m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-xl rounded-tl-sm bg-white px-3 py-2 text-sm text-slate-500 shadow-sm">
                  <Loader2 className="h-4 w-4 animate-spin" /> Thinking…
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</div>
            )}
          </div>

          {/* Composer */}
          <div className="border-t border-slate-200 bg-white p-2">
            <div className="flex items-end gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
                }}
                placeholder="Ask how anything works…"
                data-testid="input-help-message"
                rows={1}
                className="max-h-28 min-h-[40px] flex-1 resize-none text-sm"
              />
              <Button
                size="icon"
                onClick={() => send(input)}
                disabled={loading || !input.trim()}
                data-testid="button-help-send"
                className="h-10 w-10 shrink-0 bg-purple-600 hover:bg-purple-700"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <div className="px-1 pt-1 text-[10px] text-slate-400">AI guide — grounded in your Cirqlback manual. Double-check anything important.</div>
          </div>
        </div>
      )}
    </>
  );
}
