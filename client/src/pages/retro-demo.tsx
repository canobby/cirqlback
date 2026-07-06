import { useEffect, useRef } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { RetroEngine, mix } from "@/game/retro-engine";
import { MusicKit, MAIN_STREET_THEME } from "@/game/musickit";

// A tiny RetroEngine subclass that exercises the whole 16-bit stack — pixel buffer,
// nearest-neighbor upscale, CRT, gradient backdrop, the bundled pixel font, and a
// spherically-lit bouncing "round hero" — as the first proof of Phase 0. It doubles
// as an early attract / boot screen for CIRQLBACK · MAIN STREET ARCADE.
class BootDemo extends RetroEngine {
  private bx = 120; private by = 90;
  private bvx = 46; private bvy = 34;
  private t = 0;
  private heroes = ["#ffa300", "#ff4d6d", "#29adff", "#00e436", "#ff77a8", "#ffec27"];
  private hi = 0;

  constructor(canvas: HTMLCanvasElement) {
    super(canvas, {}, 240, 180);
    this.music = new MusicKit({ volume: 0.5 });
    this.start();
  }

  // audio unlocks on the first tap/key — kick off the Main Street theme, then let
  // it thicken (dynamic layering) as the attract loop plays.
  protected onGesture() { this.music?.play(MAIN_STREET_THEME); }

  protected update(dt: number) {
    this.t += dt;
    this.music?.setIntensity(Math.min(1, this.t / 6));
    this.bx += this.bvx * dt;
    this.by += this.bvy * dt;
    const r = 12;
    if (this.bx < r + 6) { this.bx = r + 6; this.bvx = Math.abs(this.bvx); this.bounce(); }
    if (this.bx > this.LW - r - 6) { this.bx = this.LW - r - 6; this.bvx = -Math.abs(this.bvx); this.bounce(); }
    if (this.by < 64 + r) { this.by = 64 + r; this.bvy = Math.abs(this.bvy); this.bounce(); }
    if (this.by > 150 - r) { this.by = 150 - r; this.bvy = -Math.abs(this.bvy); this.bounce(); }
  }

  private bounce() { this.hi = (this.hi + 1) % this.heroes.length; this.tone(220 + this.hi * 90, 0.06, "square", 0.04); }

  protected render() {
    // backdrop + starfield
    this.vgrad(0, 0, this.LW, this.LH, "#1c1348", "#0a0714");
    for (let i = 0; i < 40; i++) {
      const x = (i * 53) % this.LW, y = (i * 29) % 60;
      this.px(x, y, i % 4 === 0 ? "#fff1e8" : "#4a3f7a");
    }
    // floor
    this.shelf(0, 152, this.LW, 8, "#2c2350");
    this.rect(0, 160, this.LW, 20, "#160f2e");

    // bouncing round hero + shadow
    const sh = Math.max(2, 12 - (150 - this.by) * 0.08);
    this.b.globalAlpha = 0.35; this.disc(this.bx | 0, 154, sh | 0, "#0a0714"); this.b.globalAlpha = 1;
    this.ball(this.bx | 0, this.by | 0, 12, this.heroes[this.hi]);

    // marquee
    this.textCenter(30, "CIRQLBACK", "#7be0ff", 2);
    const sub = "MAIN STREET ARCADE";
    this.textCenter(50, sub, "#ff77a8", 1);

    // blinking prompt + phase label
    if (Math.floor(this.t * 2) % 2 === 0) this.textCenter(this.LH - 16, "PRESS START", "#ffec27", 1);
    if (!this.music?.playing) this.textCenter(this.LH - 8, "TAP FOR SOUND", "#83769c", 1);
    this.text(4, 4, "PHASE 0", mix("#83769c", "#29adff", 0.5), 1, false);
    this.text(this.LW - this.textWidth("RETROENGINE", 1) - 4, 4, "RETROENGINE", "#5f574f", 1, false);
  }
}

export default function RetroDemo() {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvas.current) return;
    const eng = new BootDemo(canvas.current);
    if (import.meta.env.DEV) { (window as any).__retro = eng; (window as any).__music = (eng as any).music; }
    return () => eng.destroy();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center" style={{ background: "#05040f", touchAction: "none" }}>
      <div className="absolute left-4 top-4 z-10">
        <Link href="/" className="flex items-center gap-1 text-xs text-violet-300/70 hover:text-violet-200" data-testid="link-back">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
      </div>
      <div ref={wrap} className="flex h-full w-full items-center justify-center p-4">
        <canvas ref={canvas} data-testid="retro-canvas" className="block" style={{ imageRendering: "pixelated", boxShadow: "0 0 60px rgba(124,58,237,.25)", borderRadius: 6 }} />
      </div>
      <div className="absolute bottom-3 text-[11px] uppercase tracking-[0.2em] text-violet-300/40">RetroEngine · 16-bit foundation</div>
    </div>
  );
}
