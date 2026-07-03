import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, MessageSquareQuote, Lightbulb, DollarSign, Shield, Package, CheckCircle2 } from "lucide-react";
import { archetypeForCategory, fill, type PitchArchetype } from "@/lib/pitch-playbook";

interface PitchTarget { name: string; category?: string | null }

// Coordinator Pitch Assistant — a tailored, on-screen pitch for a prospect,
// resolved from its category, plus a printable one-page leave-behind.
export default function PitchDialog({ target, onClose }: { target: PitchTarget | null; onClose: () => void }) {
  const open = !!target;
  const name = target?.name || "";
  const a = archetypeForCategory(target?.category);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <MessageSquareQuote className="h-5 w-5 text-purple-600" />
            How to pitch {name || "this business"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 mb-1">
          <Badge className="bg-purple-100 text-purple-700 border-purple-200">
            {a.emoji} {a.label}
          </Badge>
          {target?.category ? (
            <span className="text-xs text-gray-400">from category “{target.category}”</span>
          ) : (
            <span className="text-xs text-gray-400">no category — general pitch</span>
          )}
        </div>

        <div className="space-y-4 text-sm">
          <Section icon={<MessageSquareQuote className="h-4 w-4" />} label="Open with">
            <p className="italic text-gray-700 dark:text-gray-300">“{fill(a.hook, name)}”</p>
          </Section>

          <Section label="Their pain">
            <p className="text-gray-600 dark:text-gray-400">{a.pain}</p>
          </Section>

          <Section icon={<CheckCircle2 className="h-4 w-4" />} label="Lead with">
            <ul className="list-disc pl-5 space-y-1 text-gray-700 dark:text-gray-300">
              {a.leadFeatures.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
          </Section>

          <Section icon={<Lightbulb className="h-4 w-4" />} label="Picture it">
            <p className="italic text-gray-700 dark:text-gray-300">“{fill(a.pictureIt, name)}”</p>
          </Section>

          <Section icon={<DollarSign className="h-4 w-4" />} label="The money">
            <p className="text-gray-700 dark:text-gray-300">{a.roi}</p>
          </Section>

          <Section icon={<Shield className="h-4 w-4" />} label="If they say…">
            <p className="text-gray-600 dark:text-gray-400"><span className="font-medium">{a.objection.q}</span></p>
            <p className="italic text-gray-700 dark:text-gray-300 mt-1">“{a.objection.a}”</p>
          </Section>

          <Section icon={<Package className="h-4 w-4" />} label="Recommend">
            <p className="text-gray-700 dark:text-gray-300">{a.bundle}</p>
          </Section>

          <div className="rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border border-purple-100 dark:border-purple-900 p-3">
            <div className="text-xs font-semibold text-purple-700 dark:text-purple-300 mb-1">Close</div>
            <p className="italic text-gray-800 dark:text-gray-200">“{fill(a.close, name)}”</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => printOnePager(a, name)}>
            <Printer className="h-4 w-4 mr-2" /> Print one-pager
          </Button>
          <Button onClick={onClose} className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({ icon, label, children }: { icon?: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
        {icon}{label}
      </div>
      {children}
    </div>
  );
}

// Open a self-contained, print-styled leave-behind for the prospect.
function printOnePager(a: PitchArchetype, name: string) {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const who = name || "your business";
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Cirqlback — ${esc(who)}</title>
<style>
  @page { size: letter; margin: 18mm; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #232733; line-height: 1.5; }
  .brand { color: #7c3aed; font-weight: 800; font-size: 22px; }
  h1 { font-size: 20px; margin: 6px 0 2px; }
  .sub { color: #6b7280; margin-bottom: 16px; }
  h2 { font-size: 12px; text-transform: uppercase; letter-spacing: .5px; color: #7c3aed; margin: 16px 0 4px; }
  .quote { font-style: italic; background: #faf7ff; border-left: 3px solid #a78bfa; padding: 8px 12px; border-radius: 0 8px 8px 0; }
  ul { margin: 4px 0; padding-left: 20px; }
  li { margin: 3px 0; }
  .close { background: linear-gradient(135deg,#f5f3ff,#fdf2f8); border: 1px solid #e9d5ff; border-radius: 10px; padding: 12px; margin-top: 14px; }
  .foot { margin-top: 20px; color: #9aa1ad; font-size: 10px; border-top: 1px solid #eee; padding-top: 8px; }
</style></head><body>
  <div class="brand">Cirqlback</div>
  <h1>${a.emoji} Pitch: ${esc(who)}</h1>
  <div class="sub">${esc(a.label)} · Coordinator leave-behind</div>
  <h2>Open with</h2><div class="quote">${esc(fill(a.hook, name))}</div>
  <h2>Lead with</h2><ul>${a.leadFeatures.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>
  <h2>Picture it</h2><div class="quote">${esc(fill(a.pictureIt, name))}</div>
  <h2>The money</h2><p>${esc(a.roi)}</p>
  <h2>If they say “${esc(a.objection.q.replace(/[“”]/g, ""))}”</h2><div class="quote">${esc(a.objection.a)}</div>
  <h2>Recommend</h2><p>${esc(a.bundle)}</p>
  <div class="close"><strong>Close:</strong> ${esc(fill(a.close, name))}</div>
  <div class="foot">Cirqlback — tap-to-earn loyalty &amp; local discovery. First six months free.</div>
  <script>window.onload = function(){ window.print(); }</script>
</body></html>`;
  const w = window.open("", "_blank", "width=800,height=900");
  if (w) { w.document.write(html); w.document.close(); }
}
