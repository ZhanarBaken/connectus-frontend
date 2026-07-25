// Shared between app/[locale]/layout.tsx and app/crm/layout.tsx — both
// root layouts render <Icon> (CRM's sidebar nav icons included), which
// depends on the Material Symbols stylesheet loaded here. Split out so
// the two independent root layouts (see "multiple root layouts") can't
// silently drift out of sync and break one tree's icons.
export function IconFontHead() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      {/* Google Material Symbols — used by <Icon> component.
          display=block hides icon glyphs (~100ms block period) until
          the font has loaded, instead of showing the raw ligature
          name (e.g. "arrow_forward") as fallback text via display=swap. */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,300..700,0..1,-50..200&display=block"
      />
    </>
  )
}
