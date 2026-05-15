import { Fragment, type ReactNode } from "react"

// Lightweight markdown renderer for admin-controlled legal text. Not
// CommonMark-complete — only the constructs the docs actually use:
// headings, **bold**, em-dash/dash bullet lists, numbered lists,
// blockquotes, horizontal rules, GitHub-style tables, blank-line
// paragraph separation, and [text](href) links. Renders to React
// elements (no dangerouslySetInnerHTML) so the admin can't accidentally
// inject HTML into /terms, /privacy etc.

interface Props {
  text: string
  className?: string
}

// `[text](url)` parens-in-url is intentionally not supported — legal
// docs don't use Wikipedia-style links, and supporting them would need
// a balanced-parens matcher.
const INLINE_PATTERN = /\*\*([^*\n]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g

// Defence in depth: admin is trusted, but `[click](javascript:alert(1))`
// would otherwise render a real XSS vector. Allow only the few schemes
// the legal docs need; anything else falls back to plain text.
function isSafeHref(href: string): boolean {
  if (href.startsWith("/") || href.startsWith("#")) return true
  return /^(https?|mailto|tel):/i.test(href)
}

function renderInline(text: string): ReactNode {
  const out: ReactNode[] = []
  let lastIndex = 0
  let key = 0
  let match: RegExpExecArray | null
  // Reset lastIndex because the regex is /g.
  INLINE_PATTERN.lastIndex = 0
  while ((match = INLINE_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      out.push(text.slice(lastIndex, match.index))
    }
    if (match[1] !== undefined) {
      out.push(<strong key={key++} className="font-semibold text-gray-900">{match[1]}</strong>)
    } else if (match[2] !== undefined && match[3] !== undefined) {
      if (isSafeHref(match[3])) {
        out.push(
          <a
            key={key++}
            href={match[3]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 hover:underline"
          >
            {match[2]}
          </a>,
        )
      } else {
        // Unsafe scheme (javascript:, data:, etc.) — emit the visible
        // text only, drop the href so it can't be tapped.
        out.push(match[2])
      }
    }
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) out.push(text.slice(lastIndex))
  return out
}

function isTableSeparator(line: string): boolean {
  return /^\|[\s|:\-]+\|$/.test(line.trim())
}

function splitTableRow(line: string): string[] {
  return line.trim().replace(/^\||\|$/g, "").split("|").map((s) => s.trim())
}

export default function MarkdownText({ text, className }: Props) {
  const lines = text.split("\n")
  const blocks: ReactNode[] = []
  let i = 0
  let key = 0

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    // Horizontal rule
    if (trimmed === "---" || trimmed === "***") {
      blocks.push(<hr key={key++} className="my-6 border-gray-200" />)
      i++
      continue
    }

    // Headings (### → ## → #)
    if (line.startsWith("### ")) {
      blocks.push(
        <h3 key={key++} className="text-base font-semibold text-gray-900 mt-6 mb-2">
          {renderInline(line.slice(4))}
        </h3>,
      )
      i++
      continue
    }
    if (line.startsWith("## ")) {
      blocks.push(
        <h2 key={key++} className="text-lg font-bold text-gray-900 mt-8 mb-3">
          {renderInline(line.slice(3))}
        </h2>,
      )
      i++
      continue
    }
    if (line.startsWith("# ")) {
      blocks.push(
        <h1 key={key++} className="text-xl font-bold text-gray-900 mt-2 mb-4">
          {renderInline(line.slice(2))}
        </h1>,
      )
      i++
      continue
    }

    // Blockquote (one or more lines starting with `>`)
    if (line.startsWith(">")) {
      const quoteParas: string[] = []
      let buf: string[] = []
      while (i < lines.length && lines[i].startsWith(">")) {
        const content = lines[i].replace(/^>\s?/, "")
        if (content.trim() === "") {
          if (buf.length > 0) {
            quoteParas.push(buf.join(" "))
            buf = []
          }
        } else {
          buf.push(content)
        }
        i++
      }
      if (buf.length > 0) quoteParas.push(buf.join(" "))
      blocks.push(
        <blockquote
          key={key++}
          className="border-l-4 border-gray-200 pl-4 my-4 text-gray-600 italic"
        >
          {quoteParas.map((p, j) => (
            <p key={j} className="mb-2 last:mb-0">{renderInline(p)}</p>
          ))}
        </blockquote>,
      )
      continue
    }

    // Tables (header row + `|---|` separator + body rows)
    if (
      /^\|.+\|$/.test(trimmed) &&
      i + 1 < lines.length &&
      isTableSeparator(lines[i + 1])
    ) {
      const header = splitTableRow(line)
      i += 2
      const rows: string[][] = []
      while (i < lines.length && /^\|.+\|$/.test(lines[i].trim())) {
        rows.push(splitTableRow(lines[i]))
        i++
      }
      blocks.push(
        <div key={key++} className="overflow-x-auto my-4">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                {header.map((h, j) => (
                  <th key={j} className="text-left font-semibold text-gray-900 py-2 px-3">
                    {renderInline(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, j) => (
                <tr key={j} className="border-b border-gray-100 last:border-b-0">
                  {row.map((cell, k) => (
                    <td key={k} className="py-2 px-3 text-gray-700 align-top">
                      {renderInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      )
      continue
    }

    // Unordered list (- or * or em-dash)
    if (/^[-*—]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^[-*—]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*—]\s+/, ""))
        i++
      }
      blocks.push(
        <ul key={key++} className="list-disc list-outside pl-6 space-y-1 my-3 text-gray-700">
          {items.map((it, j) => (
            <li key={j}>{renderInline(it)}</li>
          ))}
        </ul>,
      )
      continue
    }

    // Ordered list (1. 2. ...)
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ""))
        i++
      }
      blocks.push(
        <ol key={key++} className="list-decimal list-outside pl-6 space-y-1 my-3 text-gray-700">
          {items.map((it, j) => (
            <li key={j}>{renderInline(it)}</li>
          ))}
        </ol>,
      )
      continue
    }

    // Blank line — paragraph separator
    if (trimmed === "") {
      i++
      continue
    }

    // Paragraph (gather consecutive non-special lines)
    const paraLines: string[] = [line]
    i++
    while (i < lines.length) {
      const next = lines[i]
      const nextTrim = next.trim()
      if (
        nextTrim === "" ||
        nextTrim === "---" ||
        next.startsWith("#") ||
        next.startsWith(">") ||
        /^[-*—]\s+/.test(next) ||
        /^\d+\.\s+/.test(next) ||
        /^\|.+\|$/.test(nextTrim)
      ) {
        break
      }
      paraLines.push(next)
      i++
    }
    blocks.push(
      <p key={key++} className="text-gray-700 leading-relaxed my-3">
        {paraLines.map((p, j) => (
          <Fragment key={j}>
            {j > 0 && <br />}
            {renderInline(p)}
          </Fragment>
        ))}
      </p>,
    )
  }

  return <div className={className}>{blocks}</div>
}
