// Render the legal/compliance Markdown in docs/legal/ to branded, print-ready
// PDFs in docs/legal/pdf/.
//   npm run legal
// Self-contained Markdown->HTML (headings, lists, tables, blockquotes, rules,
// bold/italic/code/links) + the same headless-Chromium print as gen-manuals.
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from "fs";
import { execFileSync } from "child_process";
import { tmpdir } from "os";
import { join, resolve } from "path";

const DOCS = [
  "README.md",
  "terms-of-service.md",
  "privacy-policy.md",
  "merchant-agreement.md",
  "coordinator-independent-contractor-agreement.md",
  "coordinator-1099-guide.md",
  "insurance-and-security-safeguards.md",
  "faq.md",
];
const SRC_DIR = "docs/legal";
const OUT_DIR = "docs/legal/pdf";

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const inline = (s) =>
  esc(s)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");

const splitRow = (line) => line.replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());

function md2html(md) {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  let html = "";
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const t = line.trim();
    if (t === "") { i++; continue; }
    if (/^---+$/.test(t)) { html += "<hr/>"; i++; continue; }
    const h = t.match(/^(#{1,4})\s+(.*)$/);
    if (h) { const l = h[1].length; html += `<h${l}>${inline(h[2])}</h${l}>`; i++; continue; }
    if (t.startsWith(">")) {
      const buf = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) { buf.push(lines[i].trim().replace(/^>\s?/, "")); i++; }
      html += `<blockquote>${buf.map((b) => `<p>${inline(b)}</p>`).join("")}</blockquote>`;
      continue;
    }
    if (t.startsWith("|") && i + 1 < lines.length && /^\|?[\s:|-]+\|?$/.test(lines[i + 1].trim()) && lines[i + 1].includes("-")) {
      const header = splitRow(t);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) { rows.push(splitRow(lines[i].trim())); i++; }
      html += `<table><thead><tr>${header.map((c) => `<th>${inline(c)}</th>`).join("")}</tr></thead><tbody>${rows
        .map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`)
        .join("")}</tbody></table>`;
      continue;
    }
    if (/^\s*([-*]|\d+[.)])\s+/.test(line)) {
      const ordered = /^\s*\d+[.)]\s+/.test(line);
      const items = [];
      while (i < lines.length && /^\s*([-*]|\d+[.)])\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*([-*]|\d+[.)])\s+/, "")); i++; }
      const tag = ordered ? "ol" : "ul";
      html += `<${tag}>${items.map((it) => `<li>${inline(it)}</li>`).join("")}</${tag}>`;
      continue;
    }
    html += `<p>${inline(t)}</p>`;
    i++;
  }
  return html;
}

function template(body) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  @page { size:A4; margin:16mm; }
  :root { --p:#7c3aed; }
  * { box-sizing:border-box; }
  body { font-family:-apple-system,"Segoe UI",Roboto,Arial,sans-serif; color:#2b2f3a; font-size:11.5px; line-height:1.55; }
  h1 { font-size:22px; color:#1b1e28; border-bottom:3px solid var(--p); padding-bottom:8px; margin:0 0 16px; }
  h2 { font-size:15px; color:#4c1d95; margin:20px 0 6px; }
  h3 { font-size:13px; color:#1b1e28; margin:14px 0 4px; }
  h4 { font-size:12px; margin:10px 0 4px; }
  p { margin:7px 0; }
  ul,ol { margin:7px 0 7px 20px; padding:0; } li { margin:3px 0; }
  hr { border:none; border-top:1px solid #e5e7eb; margin:16px 0; }
  a { color:var(--p); text-decoration:underline; }
  code { background:#f3f0fb; color:#5b21b6; padding:1px 4px; border-radius:4px; font-size:0.9em; }
  blockquote { border-left:4px solid #f59e0b; background:#fffbeb; color:#92400e; margin:12px 0; padding:8px 14px; border-radius:0 8px 8px 0; }
  table { width:100%; border-collapse:collapse; margin:10px 0; font-size:10.5px; }
  th,td { border:1px solid #e5e7eb; padding:6px 8px; text-align:left; vertical-align:top; }
  th { background:#f6f4fc; color:#5b21b6; }
  strong { color:#1b1e28; }
  </style></head><body>${body}</body></html>`;
}

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
if (!browser) { console.error("No Chrome/Edge found. Set CHROME_PATH."); process.exit(1); }
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
const tmp = tmpdir();

for (const doc of DOCS) {
  const src = resolve(SRC_DIR, doc);
  if (!existsSync(src)) { console.warn("skip (missing)", doc); continue; }
  const html = join(tmp, `cirq-legal-${Date.now()}-${Math.random().toString(36).slice(2)}.html`);
  writeFileSync(html, template(md2html(readFileSync(src, "utf8"))));
  const pdf = resolve(OUT_DIR, doc.replace(/\.md$/, ".pdf")).replace(/\\/g, "/");
  const profile = join(tmp, `cirq-chrome-${Date.now()}-${Math.random().toString(36).slice(2)}`);
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
