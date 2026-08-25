// Render the combined beta test plan (docs/cirql/Cirqlback-Beta-Test-Plan.md) to a
// branded, print-ready PDF in docs/cirql/pdf/. Same self-contained md->HTML +
// headless-Chromium print as gen-legal.mjs, extended with GitHub-style task-list
// checkboxes (- [ ] / - [x]) and page-breaks before each top-level section.
//   npm run beta
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from "fs";
import { execFileSync } from "child_process";
import { tmpdir } from "os";
import { join, resolve } from "path";

const SRC = "docs/cirql/Cirqlback-Beta-Test-Plan.md";
const OUT_DIR = "docs/cirql/pdf";
const OUT_NAME = "Cirqlback-Beta-Test-Plan";

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const inline = (s) =>
  esc(s)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");

const splitRow = (line) => line.replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());

function li(item) {
  const m = item.match(/^\[([ xX])\]\s+(.*)$/);
  if (m) { const done = m[1].toLowerCase() === "x"; return `<li class="task"><span class="box">${done ? "☑" : "☐"}</span>${inline(m[2])}</li>`; }
  return `<li>${inline(item)}</li>`;
}

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
      const hasTask = items.some((it) => /^\[[ xX]\]\s+/.test(it));
      html += `<${tag}${hasTask ? ' class="tasklist"' : ""}>${items.map(li).join("")}</${tag}>`;
      continue;
    }
    html += `<p>${inline(t)}</p>`;
    i++;
  }
  return html;
}

function template(body) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  @page { size:A4; margin:15mm; }
  :root { --p:#7c3aed; --neon:#ec4899; }
  * { box-sizing:border-box; }
  body { font-family:-apple-system,"Segoe UI",Roboto,Arial,sans-serif; color:#22252e; font-size:11px; line-height:1.5; }
  h1 { font-size:20px; color:#0f1220; border-bottom:3px solid var(--neon); padding-bottom:7px; margin:0 0 12px; page-break-before:always; page-break-after:avoid; }
  h1:first-of-type { page-break-before:avoid; }
  h2 { font-size:14px; color:#4c1d95; margin:18px 0 5px; page-break-after:avoid; }
  h3 { font-size:12.5px; color:#0e7490; margin:13px 0 4px; page-break-after:avoid; }
  h4 { font-size:12px; margin:10px 0 4px; }
  p { margin:6px 0; }
  ul,ol { margin:6px 0 6px 20px; padding:0; } li { margin:3px 0; }
  ul.tasklist { margin-left:6px; } li.task { list-style:none; margin:4px 0; }
  .box { display:inline-block; width:1.15em; color:var(--p); font-size:1.15em; line-height:1; vertical-align:-1px; }
  hr { border:none; border-top:1px solid #e5e7eb; margin:14px 0; }
  a { color:var(--p); text-decoration:none; }
  code { background:#f3f0fb; color:#5b21b6; padding:1px 4px; border-radius:4px; font-size:0.9em; }
  blockquote { border-left:4px solid #38bdf8; background:#eff8ff; color:#0c4a6e; margin:10px 0; padding:7px 13px; border-radius:0 8px 8px 0; }
  blockquote p { margin:3px 0; }
  table { width:100%; border-collapse:collapse; margin:9px 0; font-size:10.5px; }
  th,td { border:1px solid #e5e7eb; padding:6px 8px; text-align:left; vertical-align:top; }
  th { background:#f6f4fc; color:#5b21b6; }
  strong { color:#0f1220; }
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

const htmlPath = process.env.BETA_HTML_OUT ? resolve(process.env.BETA_HTML_OUT) : join(tmp, `cirq-beta-${Date.now()}.html`);
writeFileSync(htmlPath, template(md2html(readFileSync(SRC, "utf8"))));
const pdf = resolve(OUT_DIR, OUT_NAME + ".pdf").replace(/\\/g, "/");
const profile = join(tmp, `cirq-chrome-${Date.now()}-${Math.random().toString(36).slice(2)}`);
execFileSync(browser, [
  "--headless", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
  `--user-data-dir=${profile}`, "--no-pdf-header-footer",
  `--print-to-pdf=${pdf}`, "file:///" + htmlPath.replace(/\\/g, "/"),
], { stdio: "ignore" });
if (!process.env.BETA_HTML_OUT) rmSync(htmlPath, { force: true }); else console.log("html", htmlPath);
if (!existsSync(pdf)) throw new Error("Chrome did not write " + pdf);
console.log("rendered", pdf);
