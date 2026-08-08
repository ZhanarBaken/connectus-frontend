// Shared between app/[locale]/layout.tsx and app/crm/layout.tsx — both
// root layouts render <Icon> (CRM's sidebar nav icons included), which
// depends on the Material Symbols font. The @font-face itself lives in
// app/globals.css (self-hosted from public/fonts/, not Google Fonts —
// see the comment there for why), so this component preloads the file
// to start the fetch as early as possible.
export function IconFontHead() {
  return (
    <link
      rel="preload"
      href="/fonts/MaterialSymbolsOutlined.woff2"
      as="font"
      type="font/woff2"
      crossOrigin=""
    />
  )
}
