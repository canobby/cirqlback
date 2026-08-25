import ArcadeGameShell, { type GameConfig } from "./arcade-shell";
import { TrendingUp, TrendingDown } from "lucide-react";
import { MarketEngine } from "@/game/market-engine";

const config: GameConfig = {
  gameId: "market",
  name: "Cirql Market",
  eyebrow: "Buy low, sell high",
  title: "Work the market",
  body: "Three goods orbit the ring, their prices rising and falling. Tap a good to select it, then BUY low and SELL high. Grow your net worth past the rival trader before the closing bell.",
  overEyebrow: "The bell rings",
  overTitle: "Market close",
  accent: "#34d399", accent2: "#fbbf24",
  bg: "radial-gradient(120% 90% at 50% 8%, #06231a 0%, #05040f 60%, #030208 100%)",
  lsKey: "cmarket_best",
  startLabel: "Trade",
  makeEngine: (canvas, hooks) => new MarketEngine(canvas, hooks),
  hudChips: (h) => [{ label: "Net", value: `$${h.net}`, color: "#34d399" }, { label: "Rival", value: `$${h.ai}`, color: "#fb7185" }, { label: "Time", value: `${h.time}s` }],
  endChips: (r) => [{ label: "Result", value: r.won ? "WON" : "Lost", color: r.won ? "#34d399" : "#fb7185" }, { label: "Net", value: `$${r.net}` }, { label: "Best", value: `$${r.best}`, color: "#fbbf24" }],
  bestFrom: (r) => r.best,
  toDaily: (r) => ({ score: r.net, bestCombo: 0 }),
  controls: (eng) => [
    { testid: "button-buy", label: "BUY", node: <TrendingUp className="h-5 w-5" />, color: "#34d399", onPress: () => eng.buy() },
    { testid: "button-sell", label: "SELL", node: <TrendingDown className="h-5 w-5" />, color: "#fb7185", onPress: () => eng.sell() },
  ],
};
export default function Market() { return <ArcadeGameShell config={config} />; }
