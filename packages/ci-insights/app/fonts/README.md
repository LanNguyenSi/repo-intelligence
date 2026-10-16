# Self-hosted fonts (next/font/local)

Fonts are vendored here and loaded through `next/font/local` in
`app/layout.tsx`. A build must never reach the network for fonts, so do not add
a `next/font/google` import. The CI workflow has a **font guard** step in the
package matrix job (it runs for every package, this one included) that fails when `next/font/google` appears in any
`.ts/.tsx/.js/.jsx/.mjs/.cjs/.mts/.cts` file, and when grep itself errors.

## Why one `@font-face` per subset

`next/font/local` cannot attach a `unicode-range` to an individual `src` file, so
each subset is declared with its own `localFont` call in `app/layout.tsx`. Every
call of a family sets the same `font-family` through `declarations`, so
`next/font` keeps a single family name and the browser selects the face by
`unicode-range`. The declared family is `geistSans` or `geistMono`, the identifier of
the latin const: `next/font` (Next 16, Turbopack) builds the `className` and the
CSS variable stack from that identifier, so a different declared name would leave
the variables pointing at a family with no face and the text would render in the
fallback font. Keep the two in sync when renaming. Only `latin` is `preload`ed and carries the `--font-geist-sans`
and `--font-geist-mono` variables the app uses. The other subsets set
`adjustFontFallback: false` and `preload: false`.

## Why every subset, even though only `latin` is preloaded

ci-insights renders repository names, workflow names, job names and commit
messages from GitHub, so the glyphs that appear are not known ahead of time.
Dropping the non-latin subsets would make such text fall back to a system font,
so every subset the package ships is vendored. Only `latin` is used on first
paint, so only it is preloaded.

## Files

Packages: `@fontsource-variable/geist` and `@fontsource-variable/geist-mono`,
both **5.3.0** (SIL Open Font License 1.1). Every `.woff2` is the `wght-normal`
(variable weight, normal style) build, `font-weight: 100 900`, copied verbatim
from the package's `files/` directory.

| File in this directory | npm package | version | Subset |
| --- | --- | --- | --- |
| `geist-cyrillic-ext-wght-normal.woff2` | `@fontsource-variable/geist` | 5.3.0 | cyrillic-ext |
| `geist-cyrillic-wght-normal.woff2` | `@fontsource-variable/geist` | 5.3.0 | cyrillic |
| `geist-latin-ext-wght-normal.woff2` | `@fontsource-variable/geist` | 5.3.0 | latin-ext |
| `geist-latin-wght-normal.woff2` | `@fontsource-variable/geist` | 5.3.0 | latin |
| `geist-vietnamese-wght-normal.woff2` | `@fontsource-variable/geist` | 5.3.0 | vietnamese |
| `geist-mono-cyrillic-ext-wght-normal.woff2` | `@fontsource-variable/geist-mono` | 5.3.0 | cyrillic-ext |
| `geist-mono-cyrillic-wght-normal.woff2` | `@fontsource-variable/geist-mono` | 5.3.0 | cyrillic |
| `geist-mono-latin-ext-wght-normal.woff2` | `@fontsource-variable/geist-mono` | 5.3.0 | latin-ext |
| `geist-mono-latin-wght-normal.woff2` | `@fontsource-variable/geist-mono` | 5.3.0 | latin |
| `geist-mono-symbols2-wght-normal.woff2` | `@fontsource-variable/geist-mono` | 5.3.0 | symbols2 |
| `geist-mono-vietnamese-wght-normal.woff2` | `@fontsource-variable/geist-mono` | 5.3.0 | vietnamese |
| `OFL-Geist.txt` | `@fontsource-variable/geist` | 5.3.0 | license (`LICENSE` from the package) |
| `OFL-Geist-Mono.txt` | `@fontsource-variable/geist-mono` | 5.3.0 | license (`LICENSE` from the package) |

The `unicode-range` values in `app/layout.tsx` are taken from each package's
`unicode.json` (equivalently the `@font-face` rules in its `wght.css`).

## How to update a font

The packages are **not** dependencies; they are only used to obtain the files,
so this adds nothing to `package.json` or the lockfile.

1. From `packages/ci-insights`, fetch and unpack the packages into a throwaway dir:

   ```sh
   mkdir -p .scratch
   npm pack @fontsource-variable/geist @fontsource-variable/geist-mono --pack-destination .scratch
   for t in .scratch/*.tgz; do d=".scratch/$(basename "$t" .tgz)"; mkdir "$d"; tar -xzf "$t" -C "$d"; done
   ```

2. Copy the variable-weight, normal-style files over the ones here (keep the
   existing filenames; copy each package's `LICENSE` to its `OFL-*.txt`):

   ```sh
   cp .scratch/fontsource-variable-geist-[0-9]*/package/files/geist-*-wght-normal.woff2 app/fonts/
   cp .scratch/fontsource-variable-geist-mono-*/package/files/geist-mono-*-wght-normal.woff2 app/fonts/
   cp .scratch/fontsource-variable-geist-[0-9]*/package/LICENSE app/fonts/OFL-Geist.txt
   cp .scratch/fontsource-variable-geist-mono-*/package/LICENSE app/fonts/OFL-Geist-Mono.txt
   ```

3. Refresh the `unicode-range` values in `app/layout.tsx` from the new
   `unicode.json` files if they changed, and update the version column above.
   If a package version ships a new subset file, add it here and give it its
   own `localFont` call in `app/layout.tsx` (same declared family, that subset's
   `unicode-range`, `preload: false`); a file without a call is never served.

4. Confirm each file is still a WOFF2 and that a build passes with no network:

   ```sh
   file app/fonts/*.woff2     # must say "Web Open Font Format (Version 2)"
   rm -rf .scratch
   HTTPS_PROXY=http://127.0.0.1:9 npm run build   # must pass with a dead proxy
   ```
