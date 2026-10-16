import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Geist and Geist Mono are vendored in app/fonts (see app/fonts/README.md) and
// loaded through next/font/local, so a build never fetches fonts from Google.
//
// next/font/local cannot attach a unicode-range to an individual file, so each
// subset is declared with its own localFont call. Every call of a family sets
// the same font-family through `declarations`, so next/font keeps that single
// family name and the browser picks the face by unicode-range. That family name
// must equal the identifier of the latin const (geistSans, geistMono): next/font
// derives the className and CSS variable family from the identifier, while the
// @font-face rules use the declared name, and a mismatch silently renders the
// fallback font. Only the latin subset is preloaded and carries the CSS
// variable used by the app; the other subsets are never referenced in the
// markup, their @font-face rules are the point, so they are listed in the
// `void` statement below to keep them.

const geistSans = localFont({
  src: [
    {
      path: "./fonts/geist-latin-wght-normal.woff2",
      weight: "100 900",
      style: "normal",
    },
  ],
  display: "swap",
  variable: "--font-geist-sans",
  declarations: [
    { prop: "font-family", value: "geistSans" },
    {
      prop: "unicode-range",
      value:
        "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD",
    },
  ],
});

const geistSansCyrillicExt = localFont({
  src: [
    {
      path: "./fonts/geist-cyrillic-ext-wght-normal.woff2",
      weight: "100 900",
      style: "normal",
    },
  ],
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  variable: "--font-geist-sans-cyrillic-ext",
  declarations: [
    { prop: "font-family", value: "geistSans" },
    {
      prop: "unicode-range",
      value:
        "U+0460-052F,U+1C80-1C8A,U+20B4,U+2DE0-2DFF,U+A640-A69F,U+FE2E-FE2F",
    },
  ],
});

const geistSansCyrillic = localFont({
  src: [
    {
      path: "./fonts/geist-cyrillic-wght-normal.woff2",
      weight: "100 900",
      style: "normal",
    },
  ],
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  variable: "--font-geist-sans-cyrillic",
  declarations: [
    { prop: "font-family", value: "geistSans" },
    {
      prop: "unicode-range",
      value:
        "U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116",
    },
  ],
});

const geistSansVietnamese = localFont({
  src: [
    {
      path: "./fonts/geist-vietnamese-wght-normal.woff2",
      weight: "100 900",
      style: "normal",
    },
  ],
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  variable: "--font-geist-sans-vietnamese",
  declarations: [
    { prop: "font-family", value: "geistSans" },
    {
      prop: "unicode-range",
      value:
        "U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+0329,U+1EA0-1EF9,U+20AB",
    },
  ],
});

const geistSansLatinExt = localFont({
  src: [
    {
      path: "./fonts/geist-latin-ext-wght-normal.woff2",
      weight: "100 900",
      style: "normal",
    },
  ],
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  variable: "--font-geist-sans-latin-ext",
  declarations: [
    { prop: "font-family", value: "geistSans" },
    {
      prop: "unicode-range",
      value:
        "U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF",
    },
  ],
});

const geistMono = localFont({
  src: [
    {
      path: "./fonts/geist-mono-latin-wght-normal.woff2",
      weight: "100 900",
      style: "normal",
    },
  ],
  display: "swap",
  variable: "--font-geist-mono",
  declarations: [
    { prop: "font-family", value: "geistMono" },
    {
      prop: "unicode-range",
      value:
        "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD",
    },
  ],
});

const geistMonoCyrillicExt = localFont({
  src: [
    {
      path: "./fonts/geist-mono-cyrillic-ext-wght-normal.woff2",
      weight: "100 900",
      style: "normal",
    },
  ],
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  variable: "--font-geist-mono-cyrillic-ext",
  declarations: [
    { prop: "font-family", value: "geistMono" },
    {
      prop: "unicode-range",
      value:
        "U+0460-052F,U+1C80-1C8A,U+20B4,U+2DE0-2DFF,U+A640-A69F,U+FE2E-FE2F",
    },
  ],
});

const geistMonoCyrillic = localFont({
  src: [
    {
      path: "./fonts/geist-mono-cyrillic-wght-normal.woff2",
      weight: "100 900",
      style: "normal",
    },
  ],
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  variable: "--font-geist-mono-cyrillic",
  declarations: [
    { prop: "font-family", value: "geistMono" },
    {
      prop: "unicode-range",
      value:
        "U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116",
    },
  ],
});

const geistMonoSymbols2 = localFont({
  src: [
    {
      path: "./fonts/geist-mono-symbols2-wght-normal.woff2",
      weight: "100 900",
      style: "normal",
    },
  ],
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  variable: "--font-geist-mono-symbols2",
  declarations: [
    { prop: "font-family", value: "geistMono" },
    {
      prop: "unicode-range",
      value:
        "U+2000-2001,U+2004-2008,U+200A,U+23B8-23BD,U+2500-259F",
    },
  ],
});

const geistMonoVietnamese = localFont({
  src: [
    {
      path: "./fonts/geist-mono-vietnamese-wght-normal.woff2",
      weight: "100 900",
      style: "normal",
    },
  ],
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  variable: "--font-geist-mono-vietnamese",
  declarations: [
    { prop: "font-family", value: "geistMono" },
    {
      prop: "unicode-range",
      value:
        "U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+0329,U+1EA0-1EF9,U+20AB",
    },
  ],
});

const geistMonoLatinExt = localFont({
  src: [
    {
      path: "./fonts/geist-mono-latin-ext-wght-normal.woff2",
      weight: "100 900",
      style: "normal",
    },
  ],
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  variable: "--font-geist-mono-latin-ext",
  declarations: [
    { prop: "font-family", value: "geistMono" },
    {
      prop: "unicode-range",
      value:
        "U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF",
    },
  ],
});

void [
  geistSansCyrillicExt,
  geistSansCyrillic,
  geistSansVietnamese,
  geistSansLatinExt,
  geistMonoCyrillicExt,
  geistMonoCyrillic,
  geistMonoSymbols2,
  geistMonoVietnamese,
  geistMonoLatinExt,
];

export const metadata: Metadata = {
  title: "ci-insights",
  description: "GitHub Actions analytics API: fail rates, build times, flaky jobs",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
