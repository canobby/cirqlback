import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Loader2, ShieldCheck, Download } from "lucide-react";

// Map cross-document .md links to their in-app routes so links in the Markdown
// resolve on the website. Anything not mapped renders as plain (non-link) text.
const LINK_MAP: Record<string, string> = {
  "terms-of-service.md": "/terms-of-service",
  "privacy-policy.md": "/privacy-policy",
  "faq.md": "/help-center",
  "merchant-agreement.md": "/legal/merchant",
  "coordinator-independent-contractor-agreement.md": "/legal/coordinator",
  "coordinator-1099-guide.md": "/legal/coordinator-1099",
};

function resolveHref(href: string): string | null {
  if (/^https?:\/\//i.test(href)) return href;
  const file = href.split("/").pop() || href;
  return LINK_MAP[file] || null;
}

// Inline formatting: links, **bold**, *italic*, `code`.
function inline(s: string, keyBase: string): (string | JSX.Element)[] {
  const out: (string | JSX.Element)[] = [];
  const re = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`|\*([^*\n]+)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(s)) !== null) {
    if (m.index > last) out.push(s.slice(last, m.index));
    if (m[1] !== undefined) {
      const href = resolveHref(m[2]);
      out.push(
        href
          ? href.startsWith("/")
            ? <Link key={`${keyBase}-${k}`} href={href} className="text-purple-700 underline hover:text-purple-900">{m[1]}</Link>
            : <a key={`${keyBase}-${k}`} href={href} target="_blank" rel="noreferrer" className="text-purple-700 underline hover:text-purple-900">{m[1]}</a>
          : <span key={`${keyBase}-${k}`} className="font-medium text-slate-800">{m[1]}</span>,
      );
    } else if (m[3] !== undefined) {
      out.push(<strong key={`${keyBase}-${k}`}>{m[3]}</strong>);
    } else if (m[4] !== undefined) {
      out.push(<code key={`${keyBase}-${k}`} className="rounded bg-slate-100 px-1 py-0.5 text-[0.85em] text-purple-800">{m[4]}</code>);
    } else if (m[5] !== undefined) {
      out.push(<em key={`${keyBase}-${k}`}>{m[5]}</em>);
    }
    last = m.index + m[0].length;
    k++;
  }
  if (last < s.length) out.push(s.slice(last));
  return out;
}

function splitRow(line: string): string[] {
  return line.replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
}

// Minimal block-level Markdown → React (headings, hr, blockquote, lists, tables,
// paragraphs). Sufficient for our legal/compliance docs.
function renderMarkdown(md: string): JSX.Element[] {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const blocks: JSX.Element[] = [];
  let i = 0;
  const push = (el: JSX.Element) => blocks.push(el);

  while (i < lines.length) {
    const line = lines[i];
    const t = line.trim();

    if (t === "") { i++; continue; }

    // Horizontal rule
    if (/^---+$/.test(t)) { push(<hr key={i} className="my-6 border-slate-200" />); i++; continue; }

    // Headings
    const h = t.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const cls =
        level === 1 ? "mt-2 mb-4 text-3xl font-bold text-slate-900"
        : level === 2 ? "mt-8 mb-3 text-xl font-bold text-purple-800"
        : level === 3 ? "mt-6 mb-2 text-lg font-semibold text-slate-800"
        : "mt-4 mb-2 text-base font-semibold text-slate-700";
      const content = inline(h[2], `h${i}`);
      push(
        level === 1 ? <h1 key={i} className={cls}>{content}</h1>
        : level === 2 ? <h2 key={i} className={cls}>{content}</h2>
        : level === 3 ? <h3 key={i} className={cls}>{content}</h3>
        : <h4 key={i} className={cls}>{content}</h4>,
      );
      i++; continue;
    }

    // Blockquote (consume consecutive > lines)
    if (t.startsWith(">")) {
      const buf: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        buf.push(lines[i].trim().replace(/^>\s?/, ""));
        i++;
      }
      push(
        <blockquote key={i} className="my-4 rounded-r-lg border-l-4 border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {buf.map((b, j) => <p key={j} className={j ? "mt-1" : ""}>{inline(b, `bq${i}-${j}`)}</p>)}
        </blockquote>,
      );
      continue;
    }

    // Table (header row starts with | and next row is the --- separator)
    if (t.startsWith("|") && i + 1 < lines.length && /^\|?[\s:|-]+\|?$/.test(lines[i + 1].trim()) && lines[i + 1].includes("-")) {
      const header = splitRow(t);
      i += 2; // skip header + separator
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(splitRow(lines[i].trim()));
        i++;
      }
      push(
        <div key={`tbl${i}`} className="my-4 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>{header.map((c, j) => <th key={j} className="border border-slate-200 bg-purple-50 px-3 py-2 text-left font-semibold text-purple-800">{inline(c, `th${i}-${j}`)}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri} className={ri % 2 ? "bg-slate-50/50" : ""}>
                  {r.map((c, ci) => <td key={ci} className="border border-slate-200 px-3 py-2 align-top text-slate-700">{inline(c, `td${i}-${ri}-${ci}`)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    // Lists (consume consecutive list items; simple, non-nested)
    if (/^\s*([-*]|\d+[.)])\s+/.test(line)) {
      const ordered = /^\s*\d+[.)]\s+/.test(line);
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*]|\d+[.)])\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*([-*]|\d+[.)])\s+/, ""));
        i++;
      }
      const lis = items.map((it, j) => <li key={j} className="my-1">{inline(it, `li${i}-${j}`)}</li>);
      push(
        ordered
          ? <ol key={i} className="my-3 ml-6 list-decimal space-y-1 text-slate-700">{lis}</ol>
          : <ul key={i} className="my-3 ml-6 list-disc space-y-1 text-slate-700">{lis}</ul>,
      );
      continue;
    }

    // Paragraph
    push(<p key={i} className="my-3 leading-relaxed text-slate-700">{inline(t, `p${i}`)}</p>);
    i++;
  }
  return blocks;
}

export default function LegalDoc({ slug }: { slug: string }) {
  const { data, isLoading, isError } = useQuery<{ slug: string; markdown: string }>({
    queryKey: [`/api/legal/${slug}`],
    retry: false,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-pink-50/20 py-12">
      <div className="mx-auto max-w-3xl px-4">
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100 sm:p-10">
          {isLoading && (
            <div className="flex items-center gap-2 py-16 text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading…
            </div>
          )}
          {isError && (
            <div className="py-16 text-center text-slate-500">
              <ShieldCheck className="mx-auto mb-3 h-8 w-8 text-slate-300" />
              We couldn't load this document. Please try again later.
            </div>
          )}
          {data && (
            <>
              <div className="mb-4 flex justify-end">
                <a
                  href={`/api/legal/${slug}/pdf`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-sm font-medium text-purple-700 transition hover:border-purple-300 hover:bg-purple-100"
                  data-testid="link-download-pdf"
                >
                  <Download className="h-4 w-4" /> Download PDF
                </a>
              </div>
              <article>{renderMarkdown(data.markdown)}</article>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
