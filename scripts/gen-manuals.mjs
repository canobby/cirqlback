// Regenerate the branded manual PDFs from the Markdown in docs/manuals/.
//   npm run manuals
// Renders each guide to docs/manuals/pdf/ using a headless Chromium (Chrome or
// Edge). Deliberately avoids color emoji so the output stays compatible with
// older PDF.js viewers (color emoji embed as Type3 tiling patterns that some
// viewers can't resolve).
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from "fs";
import { execFileSync } from "child_process";
import { tmpdir } from "os";
import { join, resolve, dirname } from "path";

// Expand `{{include: partials/name.md}}` directives (one level) so role guides
// can share a single source for identical sections. Paths resolve relative to
// the including manual's directory.
function expandIncludes(md, baseDir) {
  return md.replace(/^\{\{include:\s*([^}]+)\}\}[ \t]*$/gm, (_, rel) =>
    readFileSync(resolve(baseDir, rel.trim()), "utf8").replace(/\s+$/, "")
  );
}

// Embed a screenshot as a data: URI. print-to-pdf from a file:// page can't
// always load sibling file:// images, so we inline them — always reliable.
function imgDataUri(baseDir, rel) {
  const p = resolve(baseDir, rel);
  const ext = p.split(".").pop().toLowerCase();
  const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "gif" ? "image/gif" : "image/png";
  return `data:${mime};base64,${readFileSync(p).toString("base64")}`;
}

const MANUALS = [
  { src: "docs/manuals/customer-guide.md", subtitle: "Customer", out: "Cirqlback-Customer-Guide.pdf" },
  { src: "docs/manuals/business-basic-guide.md", subtitle: "Business — Basic (Core plan)", out: "Cirqlback-Business-Basic-Guide.pdf" },
  { src: "docs/manuals/business-pro-guide.md", subtitle: "Business — Pro plan", out: "Cirqlback-Business-Pro-Guide.pdf" },
  { src: "docs/manuals/coordinator-guide.md", subtitle: "Community Coordinator", out: "Cirqlback-Coordinator-Guide.pdf" },
  { src: "docs/manuals/admin-guide.md", subtitle: "Administrator", out: "Cirqlback-Admin-Guide.pdf" },
];
const OUT_DIR = "docs/manuals/pdf";

const escapeHtml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const inline = (s) =>
  escapeHtml(s)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<span class="lnk">$1</span>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*\n]+)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");

function renderItems(items) {
  const minIndent = Math.min(...items.map((it) => it.indent));
  const type = items.find((it) => it.indent === minIndent).type;
  let html = `<${type}>`;
  let k = 0;
  while (k < items.length) {
    const it = items[k];
    let j = k + 1;
    while (j < items.length && items[j].indent > it.indent) j++;
    const children = items.slice(k + 1, j);
    html += `<li>${inline(it.text)}${children.length ? renderItems(children) : ""}</li>`;
    k = j;
  }
  return html + `</${type}>`;
}

function md2html(md, baseDir) {
  const lines = md.split("\n");
  const out = [];
  let i = 0, para = [];
  const flush = () => { if (para.length) { out.push(`<p>${para.map(inline).join(" ")}</p>`); para = []; } };
  const listRe = /^(\s*)([-*]|\d+\.)\s+(.*)$/;
  while (i < lines.length) {
    const line = lines[i], t = line.trim();
    if (t === "") { flush(); i++; continue; }
    // Block image on its own line: ![Caption](img/shot.png) → embedded figure.
    let im = t.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (im) {
      flush();
      const uri = imgDataUri(baseDir, im[2]);
      out.push(`<figure><img src="${uri}" alt="${escapeHtml(im[1])}"/>${im[1] ? `<figcaption>${escapeHtml(im[1])}</figcaption>` : ""}</figure>`);
      i++; continue;
    }
    let m = t.match(/^(#{1,3})\s+(.*)$/);
    if (m) { flush(); out.push(`<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`); i++; continue; }
    if (/^-{3,}$/.test(t)) { flush(); out.push("<hr>"); i++; continue; }
    if (/^\|.*\|$/.test(t)) {
      flush();
      const rows = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) { rows.push(lines[i].trim()); i++; }
      const cells = (r) => r.slice(1, -1).split("|").map((c) => c.trim());
      let html = "<table><thead><tr>" + cells(rows[0]).map((h) => `<th>${inline(h)}</th>`).join("") + "</tr></thead><tbody>";
      for (const r of rows.slice(2)) html += "<tr>" + cells(r).map((c) => `<td>${inline(c)}</td>`).join("") + "</tr>";
      out.push(html + "</tbody></table>");
      continue;
    }
    if (/^>\s?/.test(t)) {
      flush();
      const buf = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^\s*>\s?/, "")); i++; }
      out.push(`<blockquote>${buf.map(inline).join(" ")}</blockquote>`);
      continue;
    }
    if (listRe.test(line)) {
      flush();
      const items = [];
      while (i < lines.length && listRe.test(lines[i])) {
        const mm = lines[i].match(listRe);
        items.push({ indent: mm[1].length, type: /\d+\./.test(mm[2]) ? "ol" : "ul", text: mm[3] });
        i++;
      }
      out.push(renderItems(items));
      continue;
    }
    para.push(t); i++;
  }
  flush();
  return out.join("\n");
}

const template = (title, subtitle, body) => `<!doctype html><html><head><meta charset="utf-8"><style>
  @page { size: A4; margin: 18mm 16mm 16mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #232733; font-size: 11.5px; line-height: 1.55; margin: 0; }
  .hero { border-bottom: 3px solid #7c3aed; padding-bottom: 16px; margin-bottom: 20px; }
  .brand { font-size: 24px; font-weight: 800; letter-spacing: -.5px; color: #7c3aed; }
  .doctitle { font-size: 22px; font-weight: 800; color: #1b1e28; margin: 10px 0 2px; }
  .docsub { color: #6b7280; font-size: 12px; }
  h1 { font-size: 17px; color: #4c1d95; margin: 22px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #ece9fb; }
  h2 { font-size: 14px; color: #5b21b6; margin: 18px 0 6px; }
  h3 { font-size: 12.5px; color: #374151; margin: 14px 0 4px; }
  p { margin: 7px 0; }
  ul, ol { margin: 6px 0; padding-left: 22px; }
  li { margin: 3px 0; padding-left: 2px; }
  li > ul, li > ol { margin: 4px 0; }
  em { font-style: italic; color: #3f4657; }
  strong { color: #1b1e28; }
  code { background: #f4f2fb; color: #6d28d9; border-radius: 4px; padding: 1px 5px; font-family: "SFMono-Regular", Consolas, monospace; font-size: 10.5px; }
  .lnk { color: #7c3aed; font-weight: 600; }
  hr { border: 0; border-top: 1px solid #eceef3; margin: 16px 0; }
  blockquote { margin: 10px 0; padding: 9px 14px; background: #faf7ff; border-left: 3px solid #a78bfa; border-radius: 0 8px 8px 0; color: #4b3f6b; font-size: 11px; }
  blockquote strong { color: #4c1d95; }
  figure { margin: 14px 0; text-align: center; break-inside: avoid; }
  figure img { max-width: 92%; border: 1px solid #e5e7eb; border-radius: 8px; box-shadow: 0 1px 4px rgba(0,0,0,.10); }
  figcaption { color: #6b7280; font-size: 10px; margin-top: 5px; font-style: italic; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0; break-inside: avoid; }
  th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: .4px; color: #7c6fa8; background: #f6f4fc; border: 1px solid #ece9fb; padding: 6px 8px; }
  td { border: 1px solid #eef0f4; padding: 6px 8px; vertical-align: top; }
  tbody tr:nth-child(even) td { background: #fafafb; }
  h1, h2, h3, table, blockquote { break-after: avoid; }
  .foot { margin-top: 26px; padding-top: 10px; border-top: 1px solid #eceef3; color: #9aa1ad; font-size: 9.5px; }
</style></head><body>
  <div class="hero"><div class="brand">Cirqlback</div><div class="doctitle">${escapeHtml(title)}</div><div class="docsub">${escapeHtml(subtitle)} · User Manual</div></div>
  ${body}
  <div class="foot">Cirqlback — tap-to-earn loyalty & local discovery. This manual reflects the current product.</div>
</body></html>`;

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

for (const m of MANUALS) {
  const lines = expandIncludes(readFileSync(m.src, "utf8"), dirname(m.src)).split("\n");
  const ti = lines.findIndex((l) => /^#\s+/.test(l.trim()));
  const title = ti >= 0 ? lines[ti].replace(/^#\s+/, "").trim() : m.subtitle;
  if (ti >= 0) lines.splice(ti, 1);
  // Unique filename per run so Chrome never serves a stale cached render.
  const html = join(tmp, `cirqlback-manual-${Date.now()}-${Math.random().toString(36).slice(2)}.html`);
  writeFileSync(html, template(title, m.subtitle, md2html(lines.join("\n"), dirname(m.src))));
  // Absolute, forward-slashed path — Chrome's --print-to-pdf silently fails on a
  // relative / backslashed Windows path.
  const pdf = resolve(OUT_DIR, m.out).replace(/\\/g, "/");
  // A UNIQUE --user-data-dir per invocation avoids Chrome's singleton lock,
  // which otherwise makes rapid successive launches silently no-op (exit 0
  // without writing the PDF).
  const profile = join(tmp, `cirqlback-chrome-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  execFileSync(browser, [
    "--headless", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
    `--user-data-dir=${profile}`, "--no-pdf-header-footer",
    `--print-to-pdf=${pdf}`, "file:///" + html.replace(/\\/g, "/"),
  ], { stdio: "ignore" });
  if (process.env.KEEP_HTML) console.log("kept html", html);
  else rmSync(html, { force: true });
  if (!existsSync(pdf)) throw new Error("Chrome did not write " + pdf);
  console.log("rendered", pdf);
}
console.log("Done. PDFs in " + OUT_DIR);
