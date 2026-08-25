import { useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { CirqlOrchestra, type OTrack, type Inst } from "@/game/cirql-orchestra";
import {
  CIRQLSPACE_THEME, TOWN_THEME, WILDS_THEME, FROST_THEME,
  EMBER_THEME, SUBMAP_THEME, SHOP_THEME, VOYAGE_THEME,
} from "@/game/cirql-music";

// A master audio bench for the CIRQLVERSE soundtrack (Milestone G). Audition every theme
// and solo/mute each PART (pad, strings, bass, the synth arpeggio, lead, bells, booms) so
// you can hear exactly what each instrument is doing. Uses the real CirqlOrchestra engine.

const THEMES: { key: string; name: string; blurb: string; track: OTrack; accent: string }[] = [
  { key: "home", name: "CIRQLSPACE", blurb: "Home — a gentle synth-pop ballad, warm & hopeful", track: CIRQLSPACE_THEME, accent: "#ffd98a" },
  { key: "town", name: "Town", blurb: "Upbeat, hopeful, driving", track: TOWN_THEME, accent: "#8fe6a0" },
  { key: "wilds", name: "The Wilds", blurb: "The big anthem — sweeping & wide", track: WILDS_THEME, accent: "#6fd8ff" },
  { key: "frost", name: "Frost", blurb: "Winter — bittersweet & wistful", track: FROST_THEME, accent: "#bfe6ff" },
  { key: "ember", name: "Ember", blurb: "Volcanic — driving, tense but hopeful", track: EMBER_THEME, accent: "#ff9d5c" },
  { key: "submap", name: "The Deep", blurb: "Caves / canopy / clouds — atmospheric & glimmering", track: SUBMAP_THEME, accent: "#c79dff" },
  { key: "shop", name: "Shops", blurb: "Bright, bouncy synth-pop", track: SHOP_THEME, accent: "#ff9dd6" },
  { key: "voyage", name: "Voyage", blurb: "The sweeping sailing anthem — the biggest of all", track: VOYAGE_THEME, accent: "#ffc46b" },
];

const PART_LABEL: Record<Inst, string> = {
  pad: "Pad — chord bed", strings: "Strings — swell", bass: "Bass — synth", arp: "Arpeggio — the pulse",
  lead: "Lead — the melody", bell: "Bells — shimmer", boom: "Boom — impact", harp: "Harp",
};

export default function MusicTestPage() {
  const orchRef = useRef<CirqlOrchestra | null>(null);
  const [current, setCurrent] = useState<string | null>(null);
  const [flags, setFlags] = useState<boolean[]>([]);   // per-layer enabled, by index
  const [intensity, setIntensity] = useState(1);
  const [volume, setVolume] = useState(0.7);

  const theme = useMemo(() => THEMES.find((t) => t.key === current) || null, [current]);

  const ensureOrch = () => {
    if (!orchRef.current) orchRef.current = new CirqlOrchestra({ volume });
    return orchRef.current;
  };

  // (Re)play the current theme with only the enabled layers.
  const render = (t: OTrack, f: boolean[]) => {
    const orch = ensureOrch();
    const layers = t.layers.filter((_, i) => f[i] !== false);
    if (!layers.length) { orch.stop(); return; }
    orch.play({ bpm: t.bpm, layers });
    orch.setIntensity(intensity);
    orch.setVolume(volume);
  };

  const playTheme = (key: string) => {
    const t = THEMES.find((x) => x.key === key)!;
    const f = t.track.layers.map(() => true);
    setCurrent(key); setFlags(f);
    render(t.track, f);
  };
  const toggleLayer = (i: number) => {
    if (!theme) return;
    const f = flags.slice(); f[i] = !f[i]; setFlags(f); render(theme.track, f);
  };
  const soloLayer = (i: number) => {
    if (!theme) return;
    const f = theme.track.layers.map((_, j) => j === i); setFlags(f); render(theme.track, f);
  };
  const allLayers = () => {
    if (!theme) return;
    const f = theme.track.layers.map(() => true); setFlags(f); render(theme.track, f);
  };
  const stop = () => { orchRef.current?.stop(); setCurrent(null); };
  const onIntensity = (v: number) => { setIntensity(v); orchRef.current?.setIntensity(v); };
  const onVolume = (v: number) => { setVolume(v); orchRef.current?.setVolume(v); };

  return (
    <div className="min-h-screen px-4 py-8 text-slate-100" style={{ background: "radial-gradient(1200px 600px at 50% -10%, #1a2348, #070a18 60%)" }}>
      <div className="mx-auto max-w-3xl">
        <div className="mb-1 flex items-center gap-3">
          <Link href="/cirql" className="text-sm text-cyan-300/80 hover:text-cyan-200">← CIRQLVERSE</Link>
          <span className="text-slate-600">·</span>
          <span className="text-[11px] uppercase tracking-[0.3em] text-cyan-300/60">Soundtrack bench</span>
        </div>
        <h1 className="text-2xl font-black tracking-wide">CIRQLVERSE — Master Audio Test</h1>
        <p className="mt-1 text-sm text-slate-400">Every theme in the score, plus every part. Tap a theme to play it, then <b className="text-slate-200">solo</b> or <b className="text-slate-200">mute</b> each instrument to hear what it's doing. Original '80s-anthemic synth-pop, rendered by the game's own engine.</p>

        {/* global controls */}
        <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <button onClick={stop} data-testid="audio-stop" className="rounded-lg bg-rose-500/20 px-3 py-1.5 text-sm font-bold text-rose-200 hover:bg-rose-500/30">■ Stop</button>
          <label className="flex flex-1 items-center gap-2 text-xs text-slate-300">
            Volume
            <input type="range" min={0} max={1} step={0.05} value={volume} onChange={(e) => onVolume(parseFloat(e.target.value))} className="w-40 accent-cyan-400" data-testid="audio-volume" />
            <span className="tabular-nums text-slate-500">{Math.round(volume * 100)}%</span>
          </label>
          <label className="flex flex-1 items-center gap-2 text-xs text-slate-300">
            Intensity
            <input type="range" min={0} max={1} step={0.05} value={intensity} onChange={(e) => onIntensity(parseFloat(e.target.value))} className="w-40 accent-amber-400" data-testid="audio-intensity" />
            <span className="tabular-nums text-slate-500">{Math.round(intensity * 100)}%</span>
          </label>
        </div>
        <p className="mt-1 text-[11px] text-slate-500">Intensity is how the game layers the music by place — lower it and the fuller parts (harmony, drums/booms) drop out, just like sailing from the wilds back home.</p>

        {/* theme grid */}
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {THEMES.map((t) => {
            const active = current === t.key;
            return (
              <div key={t.key} className="rounded-xl border p-3 transition" style={{ borderColor: active ? t.accent : "rgba(255,255,255,.1)", background: active ? `${t.accent}12` : "rgba(255,255,255,.02)" }}>
                <div className="flex items-center gap-2">
                  <button onClick={() => playTheme(t.key)} data-testid={`play-${t.key}`} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-900" style={{ background: t.accent }}>
                    {active ? "❚❚" : "▶"}
                  </button>
                  <div className="min-w-0">
                    <div className="truncate text-[15px] font-bold" style={{ color: active ? t.accent : "#e6ecfa" }}>{t.name}</div>
                    <div className="truncate text-[11px] text-slate-400">{t.blurb}</div>
                  </div>
                  <span className="ml-auto text-[10px] tabular-nums text-slate-500">{t.track.bpm} bpm</span>
                </div>

                {/* parts — only for the playing theme */}
                {active && (
                  <div className="mt-3 border-t border-white/10 pt-2">
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-widest text-slate-400">Parts</span>
                      <button onClick={allLayers} data-testid="parts-all" className="text-[10px] font-bold text-cyan-300 hover:text-cyan-200">All on</button>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {t.track.layers.map((l, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <button onClick={() => toggleLayer(i)} data-testid={`mute-${t.key}-${i}`} className="flex-1 rounded-lg border px-2 py-1 text-left text-[12px] font-semibold transition"
                            style={{ borderColor: flags[i] !== false ? `${t.accent}66` : "rgba(255,255,255,.08)", color: flags[i] !== false ? "#e6ecfa" : "#5a6478", background: flags[i] !== false ? `${t.accent}14` : "transparent" }}>
                            {flags[i] !== false ? "🔊" : "🔇"} {PART_LABEL[l.inst] || l.inst}
                          </button>
                          <button onClick={() => soloLayer(i)} data-testid={`solo-${t.key}-${i}`} className="rounded-lg border border-white/15 px-2 py-1 text-[10px] font-bold text-slate-300 hover:bg-white/10">Solo</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="mt-6 text-center text-[11px] text-slate-500">Original compositions in the era's idiom — our own melodies over the classic four-chord pop progressions. No copied songs.</p>
      </div>
    </div>
  );
}
