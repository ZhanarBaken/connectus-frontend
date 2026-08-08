// Render plain text with embedded URLs as clickable anchors.
//
// We do NOT use dangerouslySetInnerHTML — splitting on a regex and
// returning a React fragment keeps everything safely escaped, so a
// message like `<script>` stays inert text.

import React from "react"

// Match http(s) URLs greedily up to whitespace or angle brackets.
// Trailing punctuation that's likely sentence-ending is trimmed below
// so "see https://example.com." doesn't include the period.
const URL_RE = /https?:\/\/[^\s<>]+/g
const TRAILING_PUNCT_CHARS = new Set([".", ",", ";", ":", "!", "?", ")"])

export function Linkified({ text }: { text: string }) {
  if (!text) return null

  const nodes: React.ReactNode[] = []
  let lastIndex = 0
  let key = 0

  for (const match of text.matchAll(URL_RE)) {
    const start = match.index ?? 0
    let url = match[0]
    let trailing = ""

    // Strip trailing punctuation but keep balanced parens — Wikipedia-style
    // URLs like https://en.wikipedia.org/wiki/Foo_(bar) should stay intact.
    // Peel off one trailing char at a time (rather than the whole
    // punctuation run at once) so a ")" that balances an earlier "("
    // stops the strip immediately, even if further trailing punctuation
    // (e.g. a sentence-ending period) follows it.
    const opens = (url.match(/\(/g) ?? []).length
    let closes = (url.match(/\)/g) ?? []).length
    while (url.length > 0) {
      const lastChar = url[url.length - 1]
      if (!TRAILING_PUNCT_CHARS.has(lastChar)) break
      if (lastChar === ")" && closes <= opens) break
      if (lastChar === ")") closes--
      url = url.slice(0, -1)
      trailing = lastChar + trailing
    }

    if (start > lastIndex) {
      nodes.push(text.slice(lastIndex, start))
    }
    nodes.push(
      <a
        key={key++}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 hover:opacity-80 break-all"
      >
        {url}
      </a>,
    )
    if (trailing) nodes.push(trailing)
    lastIndex = start + match[0].length
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex))
  }

  return <>{nodes}</>
}
