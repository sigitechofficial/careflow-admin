# -*- coding: utf-8 -*-
"""Build clean, print-friendly enterprise HTML from the July 2026 delivery report."""
from __future__ import annotations

import html
import pathlib
import re

ROOT = pathlib.Path(r"E:\careflow-complete-latest\careflow-admin\docs")
MD_PATH = ROOT / "July-2026-Client-Delivery-Report.md"
HTML_PATH = ROOT / "July-2026-Client-Delivery-Report.html"
COPY_PATHS = [
    pathlib.Path(r"E:\careflow-complete-latest\docs\July-2026-Client-Delivery-Report.html"),
]


def esc(s: str) -> str:
    return html.escape(s, quote=True)


def inline(s: str) -> str:
    s = esc(s)
    s = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", s)
    s = re.sub(r"`([^`]+)`", r"<code>\1</code>", s)
    return s


def slugify(text: str) -> str:
    text = re.sub(r"<[^>]+>", "", text).lower()
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    return text[:80] or "section"


def status_class(status: str) -> str:
    lower = status.lower()
    if "started" in lower or "limited" in lower:
        return "st-limited"
    if "usable with gaps" in lower or "gaps" in lower:
        return "st-gaps"
    if "august" in lower:
        return "st-later"
    if "ready" in lower:
        return "st-ready"
    return "st-neutral"


def status_badge(status: str) -> str:
    return f'<span class="status {status_class(status)}">{inline(status.strip())}</span>'


def enhance_meta_table(rows: list[list[str]]) -> str | None:
    if not rows or len(rows[0]) != 2:
        return None
    mapping: dict[str, str] = {}
    for cells in rows:
        if len(cells) < 2:
            continue
        key = re.sub(r"\*+", "", cells[0]).strip().lower()
        val = cells[1].strip()
        if key in {"", "-"}:
            continue
        mapping[key] = val
    if not any(k.startswith("who") or k.startswith("status") or "what" in k for k in mapping):
        return None
    who = mapping.get("who", "")
    what = mapping.get("what they can do", mapping.get("what", ""))
    status = mapping.get("status", "")
    parts = ['<dl class="meta">']
    if who:
        parts.append(f"<div><dt>Who</dt><dd>{inline(who)}</dd></div>")
    if what:
        parts.append(f"<div><dt>What they can do</dt><dd>{inline(what)}</dd></div>")
    if status:
        parts.append(f"<div><dt>Status</dt><dd>{status_badge(status)}</dd></div>")
    parts.append("</dl>")
    return "".join(parts)


CSS = """
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=IBM+Plex+Serif:wght@500;600&display=swap');

:root {
  --ink: #15202b;
  --text: #243447;
  --muted: #5b6b7c;
  --line: #d7dee7;
  --soft: #f5f7fa;
  --brand: #123a56;
  --accent: #0f6e66;
  --ready: #0f6b4c;
  --ready-bg: #eaf7f1;
  --gaps: #9a6700;
  --gaps-bg: #fff8e8;
  --limited: #a12622;
  --limited-bg: #fdeceb;
  --later: #185fa5;
  --later-bg: #eaf2fb;
  --font: "IBM Plex Sans", "Segoe UI", sans-serif;
  --serif: "IBM Plex Serif", Georgia, serif;
  --mono: "IBM Plex Mono", ui-monospace, Consolas, monospace;
  --page: 820px;
}

* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0;
  color: var(--text);
  background: #fff;
  font-family: var(--font);
  font-size: 15px;
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
}
a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }
strong { color: var(--ink); font-weight: 600; }
code {
  font-family: var(--mono);
  font-size: 0.9em;
  background: var(--soft);
  border: 1px solid var(--line);
  border-radius: 3px;
  padding: 0.05em 0.3em;
}
pre {
  background: #102433;
  color: #e8eef4;
  padding: 12px 14px;
  border-radius: 6px;
  overflow: auto;
  font-size: 12.5px;
  line-height: 1.45;
}
pre code { background: none; border: 0; color: inherit; padding: 0; }

.page {
  max-width: var(--page);
  margin: 0 auto;
  padding: 40px 28px 64px;
}

/* Cover — compact, print-friendly */
.cover {
  border-bottom: 2px solid var(--brand);
  padding-bottom: 18px;
  margin-bottom: 28px;
}
.cover-kicker {
  margin: 0 0 8px;
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--accent);
  font-weight: 600;
}
.cover h1 {
  margin: 0 0 8px;
  font-family: var(--serif);
  font-size: 1.85rem;
  line-height: 1.2;
  color: var(--brand);
  font-weight: 600;
  letter-spacing: -0.01em;
}
.cover-sub {
  margin: 0 0 14px;
  color: var(--muted);
  max-width: 62ch;
  font-size: 0.98rem;
}
.cover-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 18px;
  margin: 0;
  padding: 0;
  list-style: none;
  color: var(--muted);
  font-size: 13px;
}
.cover-meta li::before {
  content: "";
  display: inline-block;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--accent);
  margin-right: 8px;
  vertical-align: middle;
}

/* Screen TOC — compact, collapses for print */
.toc {
  margin: 0 0 28px;
  padding: 14px 16px;
  border: 1px solid var(--line);
  background: var(--soft);
  border-radius: 6px;
}
.toc h2 {
  margin: 0 0 8px;
  border: 0;
  padding: 0;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
  font-family: var(--font);
  font-weight: 600;
}
.toc ol {
  margin: 0;
  padding-left: 1.2em;
  columns: 2;
  column-gap: 28px;
}
.toc li { margin: 0.2em 0; break-inside: avoid; }
.toc a { color: var(--text); font-size: 13px; }
.toc .toc-sub { columns: 1; margin: 4px 0 6px; padding-left: 1.1em; }
.toc .toc-sub a { color: var(--muted); font-size: 12px; }

/* Typography — document flow */
h2 {
  margin: 2em 0 0.7em;
  padding-bottom: 6px;
  border-bottom: 1.5px solid var(--brand);
  color: var(--brand);
  font-family: var(--serif);
  font-size: 1.35rem;
  font-weight: 600;
  scroll-margin-top: 16px;
  page-break-after: avoid;
}
h3 {
  margin: 1.6em 0 0.55em;
  color: var(--ink);
  font-family: var(--serif);
  font-size: 1.12rem;
  font-weight: 600;
  scroll-margin-top: 16px;
  page-break-after: avoid;
}
h4 {
  margin: 1.35em 0 0.45em;
  color: var(--ink);
  font-size: 1.02rem;
  font-weight: 650;
  scroll-margin-top: 16px;
  page-break-after: avoid;
}
p { margin: 0.65em 0; }
hr {
  border: 0;
  border-top: 1px solid var(--line);
  margin: 1.4em 0;
}
blockquote {
  margin: 12px 0;
  padding: 8px 14px;
  border-left: 3px solid var(--accent);
  background: var(--soft);
  color: var(--text);
}

.callout {
  margin: 12px 0;
  padding: 10px 14px;
  border: 1px solid var(--line);
  border-left: 3px solid var(--brand);
  background: #f8fafc;
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 10px 0 14px;
}

.status {
  display: inline-block;
  border-radius: 999px;
  padding: 2px 9px;
  font-size: 11.5px;
  font-weight: 600;
  line-height: 1.4;
  border: 1px solid transparent;
  white-space: normal;
}
.st-ready { background: var(--ready-bg); color: var(--ready); border-color: #b7e4cd; }
.st-gaps { background: var(--gaps-bg); color: var(--gaps); border-color: #f0d48a; }
.st-limited { background: var(--limited-bg); color: var(--limited); border-color: #f0b8b5; }
.st-later { background: var(--later-bg); color: var(--later); border-color: #bcd3ef; }
.st-neutral { background: var(--soft); color: var(--muted); border-color: var(--line); }

/* Features — light document blocks, good for print */
.feature {
  margin: 1.1em 0 1.35em;
  padding: 0 0 0.2em;
  border-top: 1px solid var(--line);
  page-break-inside: avoid;
}
.feature-title {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin: 0.85em 0 0.55em;
  page-break-after: avoid;
}
.feature-title h4 {
  margin: 0;
  font-size: 1.05rem;
}
.feature-title .n {
  color: var(--muted);
  font-weight: 500;
  font-size: 0.92rem;
  margin-right: 6px;
}

.meta {
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 6px 14px;
  margin: 0 0 12px;
  padding: 10px 12px;
  background: var(--soft);
  border: 1px solid var(--line);
  border-radius: 4px;
  font-size: 13.5px;
}
.meta > div { display: contents; }
.meta dt {
  margin: 0;
  color: var(--muted);
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding-top: 2px;
}
.meta dd { margin: 0; color: var(--ink); }

.task-label {
  margin: 12px 0 5px;
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--muted);
  page-break-after: avoid;
}
.task-label.fe { color: #0b6e75; }
.task-label.be { color: #1f4e8c; }
.task-label.rem { color: #8a5a00; }

ul.tasks {
  list-style: none;
  margin: 0 0 10px;
  padding: 0;
}
ul.tasks li {
  position: relative;
  padding: 3px 0 3px 1.35em;
  font-size: 13.5px;
  color: var(--text);
  page-break-inside: avoid;
}
ul.tasks li::before {
  position: absolute;
  left: 0;
  top: 3px;
  font-size: 12px;
  font-weight: 700;
}
ul.tasks li.done::before { content: "✓"; color: var(--ready); }
ul.tasks li.todo::before { content: "○"; color: var(--gaps); }
ul.tasks li.todo { color: #6b5420; }

ul.bullets, ol.bullets {
  margin: 0.4em 0 0.8em;
  padding-left: 1.25em;
}
ul.bullets li, ol.bullets li { margin: 0.25em 0; }

table {
  width: 100%;
  border-collapse: collapse;
  margin: 10px 0 16px;
  font-size: 13px;
  page-break-inside: auto;
}
th, td {
  border: 1px solid var(--line);
  padding: 7px 9px;
  text-align: left;
  vertical-align: top;
}
th {
  background: var(--soft);
  color: var(--ink);
  font-weight: 600;
  font-size: 11.5px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
tr { page-break-inside: avoid; }

.footer-note {
  margin-top: 36px;
  padding-top: 12px;
  border-top: 1px solid var(--line);
  color: var(--muted);
  font-size: 12px;
}

@media (max-width: 720px) {
  .page { padding: 24px 16px 48px; }
  .toc ol { columns: 1; }
  .meta { grid-template-columns: 1fr; }
  .meta dt { margin-top: 6px; }
  .feature-title { flex-direction: column; align-items: flex-start; }
}

/* Print: earlier linear format wins — no sidebar chrome, tight A4 flow */
@media print {
  @page {
    size: A4;
    margin: 16mm 14mm 18mm;
  }
  body {
    background: #fff;
    font-size: 10.5pt;
    line-height: 1.45;
    color: #000;
  }
  .page { max-width: none; margin: 0; padding: 0; }
  .toc { display: none !important; }
  .cover {
    border-bottom-width: 1.5pt;
    margin-bottom: 14pt;
    padding-bottom: 10pt;
  }
  .cover h1 { font-size: 18pt; }
  .cover-sub, .cover-meta { font-size: 9.5pt; }
  h2 {
    font-size: 13.5pt;
    margin-top: 16pt;
    border-bottom-width: 1pt;
  }
  h3 { font-size: 11.5pt; margin-top: 12pt; }
  h4, .feature-title h4 { font-size: 11pt; }
  .feature {
    border-top: 0.5pt solid #bbb;
    margin: 8pt 0 10pt;
  }
  .meta {
    background: #f7f7f7 !important;
    border-color: #ccc;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .status, th, ul.tasks li.done::before, ul.tasks li.todo::before {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  a { color: inherit; text-decoration: none; }
  .callout, blockquote { break-inside: avoid; }
  pre { white-space: pre-wrap; font-size: 8.5pt; }
  table { font-size: 9pt; }
  .footer-note { font-size: 8.5pt; }
}
"""


def render_table(rows: list[list[str]]) -> str:
    meta = enhance_meta_table(rows)
    if meta is not None:
        return meta
    if not rows:
        return ""
    parts = ["<table>"]
    for ri, cells in enumerate(rows):
        tag = "th" if ri == 0 else "td"
        if ri > 0 and rows[0] and any("status" in c.lower() for c in rows[0]):
            rendered = []
            for ci, c in enumerate(cells):
                header = rows[0][ci].lower() if ci < len(rows[0]) else ""
                if "status" in header:
                    rendered.append(f"<{tag}>{status_badge(c)}</{tag}>")
                else:
                    rendered.append(f"<{tag}>{inline(c)}</{tag}>")
            parts.append("<tr>" + "".join(rendered) + "</tr>")
        else:
            parts.append("<tr>" + "".join(f"<{tag}>{inline(c)}</{tag}>" for c in cells) + "</tr>")
    parts.append("</table>")
    return "".join(parts)


def classify_task_heading(text: str) -> str:
    t = text.lower()
    if "frontend" in t or "admin" in t:
        return "fe"
    if "backend" in t or "api" in t:
        return "be"
    if "remaining" in t:
        return "rem"
    return ""


def main() -> None:
    md = MD_PATH.read_text(encoding="utf-8-sig")
    lines = md.splitlines()

    toc_h2: list[tuple[str, str]] = []
    toc_h3: dict[str, list[tuple[str, str]]] = {}
    body: list[str] = []

    i = 0
    in_code = False
    feature_count = 0
    current_h2_id = ""
    feature_open = False

    def close_feature_if_open() -> None:
        nonlocal feature_open
        if feature_open:
            body.append("</section>")
            feature_open = False

    while i < len(lines):
        line = lines[i]

        if line.startswith("```"):
            close_feature_if_open()
            if in_code:
                body.append("</code></pre>")
                in_code = False
            else:
                body.append("<pre><code>")
                in_code = True
            i += 1
            continue
        if in_code:
            body.append(esc(line) + "\n")
            i += 1
            continue

        m = re.match(r"^(#{1,4})\s+(.*)$", line)
        if m:
            level = len(m.group(1))
            text = m.group(2).strip()
            sid = slugify(text)

            if level == 1:
                i += 1
                continue

            if level == 2:
                close_feature_if_open()
                current_h2_id = sid
                toc_h2.append((sid, text))
                toc_h3.setdefault(sid, [])
                body.append(f'<h2 id="{sid}">{inline(text)}</h2>')
                i += 1
                continue

            if level == 3:
                close_feature_if_open()
                toc_h3.setdefault(current_h2_id, []).append((sid, text))
                body.append(f'<h3 id="{sid}">{inline(text)}</h3>')
                i += 1
                continue

            if level == 4:
                close_feature_if_open()
                is_feature = text.lower().startswith("feature:")
                if not is_feature:
                    body.append(f'<h4 id="{sid}">{inline(text)}</h4>')
                    i += 1
                    continue

                feature_count += 1
                status = ""
                j = i + 1
                while j < len(lines) and (lines[j].startswith("|") or lines[j].strip() == ""):
                    if "**status**" in lines[j].lower():
                        cells = [c.strip() for c in lines[j].strip("|").split("|")]
                        if len(cells) >= 2:
                            status = cells[-1]
                        break
                    j += 1

                title = re.sub(r"^Feature:\s*", "", text, flags=re.I)
                badge = status_badge(status) if status else ""
                body.append(f'<section class="feature" id="{sid}">')
                body.append('<div class="feature-title">')
                body.append(
                    f'<h4><span class="n">{feature_count}.</span>{inline(title)}</h4>'
                )
                if badge:
                    body.append(badge)
                body.append("</div>")
                feature_open = True
                i += 1
                continue

        if line.strip() == "---":
            close_feature_if_open()
            body.append("<hr>")
            i += 1
            continue

        if line.startswith("> "):
            body.append(f"<blockquote>{inline(line[2:])}</blockquote>")
            i += 1
            continue

        if line.startswith("|"):
            rows: list[list[str]] = []
            while i < len(lines) and lines[i].startswith("|"):
                cells = [c.strip() for c in lines[i].strip("|").split("|")]
                if all(re.fullmatch(r":?-+:?", c or "") for c in cells):
                    i += 1
                    continue
                rows.append(cells)
                i += 1
            body.append(render_table(rows))
            continue

        if re.match(r"^- \[[ xX]\] ", line) or line.startswith("- ") or re.match(r"^\d+\. ", line):
            cls = ""
            label_html = ""
            k = i - 1
            while k >= 0 and lines[k].strip() == "":
                k -= 1
            if k >= 0:
                prev = lines[k].strip()
                pm = re.match(r"^\*\*(.+?)\*\*\s*$", prev)
                if pm:
                    cls = classify_task_heading(pm.group(1))
                    if body and body[-1].startswith("<p><strong>") and body[-1].endswith("</strong></p>"):
                        body.pop()
                        label_html = f'<p class="task-label {cls}">{inline(pm.group(1))}</p>'

            is_checkbox = bool(re.match(r"^- \[[ xX]\] ", line))
            if label_html:
                body.append(label_html)

            ul_class = "tasks" if is_checkbox else "bullets"
            ol = bool(re.match(r"^\d+\. ", line)) and not is_checkbox
            tag = "ol" if ol and ul_class == "bullets" else "ul"
            body.append(f'<{tag} class="{ul_class}">')
            while i < len(lines) and (
                re.match(r"^- \[[ xX]\] ", lines[i])
                or lines[i].startswith("- ")
                or re.match(r"^\d+\. ", lines[i])
            ):
                l = lines[i]
                cm = re.match(r"^- \[([ xX])\] (.*)$", l)
                if cm:
                    done = cm.group(1).lower() == "x"
                    li_cls = "done" if done else "todo"
                    body.append(f'<li class="{li_cls}">{inline(cm.group(2))}</li>')
                elif l.startswith("- "):
                    body.append(f"<li>{inline(l[2:])}</li>")
                else:
                    numbered = re.sub(r"^\d+\. ", "", l)
                    body.append(f"<li>{inline(numbered)}</li>")
                i += 1
            body.append(f"</{tag}>")
            continue

        if line.strip() == "":
            i += 1
            continue

        if line.startswith("**Status legend:**"):
            body.append('<div class="legend">')
            body.append(status_badge("Ready to use"))
            body.append(status_badge("Usable with gaps"))
            body.append(status_badge("Started / limited"))
            body.append("</div>")
            i += 1
            continue

        if line.startswith("**Bottom line") or line.startswith("**Start here") or line.startswith("**Important:**"):
            close_feature_if_open()
            body.append(f'<div class="callout">{inline(line)}</div>')
            i += 1
            continue

        body.append(f"<p>{inline(line)}</p>")
        i += 1

    close_feature_if_open()
    final_body = "\n".join(body)

    toc_parts = ['<nav class="toc" aria-label="Contents"><h2>Contents</h2><ol>']
    for sid, text in toc_h2:
        toc_parts.append(f'<li><a href="#{sid}">{esc(text)}</a>')
        if "functional-features" in sid:
            subs = toc_h3.get(sid, [])
            if subs:
                toc_parts.append('<ol class="toc-sub">')
                for ssid, stext in subs:
                    toc_parts.append(f'<li><a href="#{ssid}">{esc(stext)}</a></li>')
                toc_parts.append("</ol>")
        toc_parts.append("</li>")
    toc_parts.append("</ol></nav>")

    doc = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>CareFlow — July 2026 Client Delivery Report</title>
<meta name="description" content="CareFlow July 2026 client delivery report for stakeholder review.">
<style>{CSS}</style>
</head>
<body>
<div class="page">
  <header class="cover">
    <p class="cover-kicker">CareFlow · Client Delivery Report</p>
    <h1>July 2026 Delivery Report</h1>
    <p class="cover-sub">Functional capabilities with frontend/admin tasks, backend/API tasks, and remaining work — prepared for stakeholder review.</p>
    <ul class="cover-meta">
      <li>Period: 1–31 July 2026</li>
      <li>Repos: careflow-admin · careflow-api</li>
      <li>{feature_count} features detailed</li>
    </ul>
  </header>
  {"".join(toc_parts)}
  <main>
    {final_body}
    <p class="footer-note">Prepared from git history and codebase audit of <code>careflow-admin</code> and <code>careflow-api</code>. Maturity labels are engineering assessments of wiring completeness, not formal UAT sign-off.</p>
  </main>
</div>
</body>
</html>
"""
    HTML_PATH.write_text(doc, encoding="utf-8")
    for p in COPY_PATHS:
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(doc, encoding="utf-8")
    print(f"Wrote {HTML_PATH} ({HTML_PATH.stat().st_size} bytes), features={feature_count}")


if __name__ == "__main__":
    main()
