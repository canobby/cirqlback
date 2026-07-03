// Render the branded collateral (sales sheet, price sheet, financial
// projection) from the self-contained HTML in docs/collateral/ to print-ready
// PDFs in docs/collateral/pdf/.
//   npm run collateral
// Uses the same headless Chromium (Chrome or Edge) approach as gen-manuals.mjs.
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from "fs";
import { execFileSync } from "child_process";
import { tmpdir } from "os";
import { join, resolve } from "path";

const SHEETS = [
  { src: "docs/collateral/sales-sheet.html", out: "Cirqlback-Sales-Sheet.pdf" },
  { src: "docs/collateral/price-sheet.html", out: "Cirqlback-Price-Sheet.pdf" },
  { src: "docs/collateral/financial-projection.html", out: "Cirqlback-Financial-Projection.pdf" },
];
const OUT_DIR = "docs/collateral/pdf";

function findBrowser() {
  const cands = [
    process.env.CHROME_PATH,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser",
  ].filter(Boolean);
  return cands.find((p) => existsSync(p));
}

const browser = findBrowser();
if (!browser) { console.error("No Chrome/Edge found. Set CHROME_PATH to a Chromium binary."); process.exit(1); }
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
const tmp = tmpdir();

for (const s of SHEETS) {
  // Copy the source HTML to a unique temp path so Chrome never serves a stale
  // cached render, matching gen-manuals.mjs.
  const html = join(tmp, `cirqlback-collateral-${Date.now()}-${Math.random().toString(36).slice(2)}.html`);
  writeFileSync(html, readFileSync(s.src, "utf8"));
  const pdf = resolve(OUT_DIR, s.out).replace(/\\/g, "/");
  const profile = join(tmp, `cirqlback-chrome-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  execFileSync(browser, [
    "--headless", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
    `--user-data-dir=${profile}`, "--no-pdf-header-footer",
    `--print-to-pdf=${pdf}`, "file:///" + html.replace(/\\/g, "/"),
  ], { stdio: "ignore" });
  rmSync(html, { force: true });
  if (!existsSync(pdf)) throw new Error("Chrome did not write " + pdf);
  console.log("rendered", pdf);
}
console.log("Done. PDFs in " + OUT_DIR);
