// coin-scene — the reusable "Insert Coin" cutscene for CIRQLBACK · MAIN STREET
// ARCADE. A short RetroEngine timeline: your toy hand lifts a quarter to the slot →
// CLINK + CREDIT → the CRT boots → the cabinet marquee lights and your avatar hops
// in → PRESS START. Pure flavour (always free). Tap to skip; on repeat visits it
// runs in fast mode. A cabinet plays it on launch via the <InsertCoinCutscene> host.

import { RetroEngine } from "./retro-engine";
import { DEFAULT_AVATAR, type AvatarConfig } from "./avatar";

export interface CoinSceneOpts {
  title: string;
  accent?: string;
  avatar?: AvatarConfig;
  fast?: boolean;      // repeat visit — play at ~2× speed
  onDone: () => void;
}

export class CoinInsertScene extends RetroEngine {
  private t = 0;
  private finished = false;
  private opts: CoinSceneOpts;
  private title: string;
  private accent: string;
  private av: AvatarConfig;
  private phase: number[];   // durations: insert, clink, boot, marquee
  private total: number;
  private clinked = false;
  private booted = false;

  constructor(canvas: HTMLCanvasElement, opts: CoinSceneOpts) {
    super(canvas, { sound: true }, 240, 180);
    this.opts = opts;
    this.title = opts.title.toUpperCase();
    this.accent = opts.accent || "#ffd24a";
    this.av = opts.avatar || DEFAULT_AVATAR;
    const s = opts.fast ? 0.55 : 1;
    this.phase = [1.1 * s, 0.7 * s, 1.0 * s, 1.4 * s];
    this.total = this.phase.reduce((a, b) => a + b, 0);
    this.start();
  }

  /** End the cutscene now (tap-to-skip or timeline complete). */
  skip() { if (!this.finished) { this.finished = true; this.opts.onDone(); } }

  protected update(dt: number) {
    if (this.finished) return;
    this.t += dt;
    const [a, b] = this.phase;
    if (!this.clinked && this.t >= a) { this.clinked = true; this.noise(0.06, 0.06); this.tone(1040, 0.05, "square", 0.05); this.tone(720, 0.09, "square", 0.04); this.buzz(20); }
    if (!this.booted && this.t >= a + b) { this.booted = true; this.tone(330, 0.09, "square", 0.05); this.tone(494, 0.09, "square", 0.05); this.tone(740, 0.14, "square", 0.05); }
    if (this.t >= this.total) this.skip();
  }

  protected render() {
    const [a, b, c, d] = this.phase; const t = this.t;
    if (t < a) this.frameInsert(t / a);
    else if (t < a + b) this.frameClink((t - a) / b);
    else if (t < a + b + c) this.frameBoot((t - a - b) / c);
    else this.frameMarquee(Math.min(1, (t - a - b - c) / d));
    this.text(this.LW - this.textWidth("SKIP", 1) - 4, this.LH - 8, "SKIP", "#6b5e8f", 1, false);
  }

  private cabinet() {
    this.shelf(162, 0, 78, this.LH, "#241a40");
    this.rect(162, 0, 3, this.LH, "#4a3f7a");
    this.rect(178, 70, 34, 5, "#0a0714"); this.rect(178, 70, 34, 1, "#5a5a6a"); // slot
    this.text(184, 60, "COIN", "#ffd24a", 1);
  }

  private frameInsert(p: number) {
    this.vgrad(0, 0, this.LW, this.LH, "#181030", "#08060f");
    this.cabinet();
    const qx = Math.round(86 + p * 109), qy = Math.round(160 - p * 88);
    this.rect(qx - 16, qy, 14, this.LH - qy, "#c98f5a"); // forearm
    this.rect(qx - 16, qy, 14, 2, "#e0a878");
    this.disc(qx - 5, qy + 3, 6, "#f4c79a"); // hand
    this.ball(qx, qy - 1, 5, "#ffd24a"); // quarter
    if (Math.floor(this.t * 2.5) % 2 === 0) this.textCenter(26, "INSERT COIN", "#fff4ea", 2);
  }

  private frameClink(p: number) {
    this.vgrad(0, 0, this.LW, this.LH, "#181030", "#08060f");
    this.cabinet();
    this.rect(178, 70, 34, 5, "#ffd24a"); // lit slot
    const r = Math.round(3 + p * 15);
    this.ring(195, 72, r, "#fff0a0", 2);
    for (let i = 0; i < 8; i++) { const ang = i / 8 * 6.283; this.px(195 + Math.round(Math.cos(ang) * (r + 2)), 72 + Math.round(Math.sin(ang) * (r + 2)), "#ffec27"); }
    this.textCenter(40, "CLINK", "#ffd24a", 2);
    this.text(168, 120, "CREDIT 1", "#33e650", 1);
  }

  private frameBoot(p: number) {
    this.cls("#050409");
    const sy = Math.round(p * this.LH);
    this.rect(0, sy, this.LW, 2, "#182038");
    this.b.globalAlpha = Math.min(1, p * 2.2);
    this.textCenter(60, "CIRQLBACK", "#3bb6ff", 3);
    this.textCenter(88, "MAIN STREET ARCADE", "#ff5d7d", 1);
    this.b.globalAlpha = 1;
    if (p > 0.55) this.textCenter(122, "BOOT OK", "#33e650", 1);
  }

  private frameMarquee(p: number) {
    this.vgrad(0, 0, this.LW, this.LH, "#241528", "#0c0712");
    // marquee
    this.shelf(14, 12, this.LW - 28, 26, this.accent);
    this.textCenter(20, this.title, "#0a0714", 2, false);
    // floor + avatar hopping in
    this.shelf(18, 122, this.LW - 36, 6, "#3a2416");
    const ax = Math.round(34 + p * (this.LW / 2 - 34));
    const hop = Math.round(-Math.abs(Math.sin(p * Math.PI * 3)) * 9);
    this.b.globalAlpha = 0.3; this.disc(ax, 124, 5, "#0a0714"); this.b.globalAlpha = 1;
    this.avatar(ax, 122 + hop, this.av);
    if (Math.floor(this.t * 3) % 2 === 0) this.textCenter(this.LH - 22, "PRESS START", "#ffec27", 1);
  }
}
