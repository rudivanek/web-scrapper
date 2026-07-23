# Design System: Sharpen Studio

## Color Palette

> **Note:** The branding extract returned empty color/font fields. The CSS provided is predominantly WordPress/Elementor boilerplate. The `.wp-block-button__link` rule uses `rgb(50, 55, 60)` (#32373C) as the button background — however, this is the WordPress default button preset, **not** a custom brand primary. No distinct accent color (blue, teal, orange, etc.) appears on any interactive element in the provided CSS. The inline styles confirm dark text (`#000000`) and font-weight 300 body text. Design tokens below are derived from the actual computed values found, with a refined neutral palette appropriate for a studio brand named "Sharpen Studio."

### Primary Colors
| Token | Hex | Usage |
|-------|-----|-------|
| --color-primary | #32373C | Main brand color, CTA buttons, active states |
| --color-primary-dark | #1A1D20 | Hover states, pressed states |
| --color-primary-light | #8A9099 | Tints, disabled states, placeholder backgrounds |

### Secondary Colors
| Token | Hex | Usage |
|-------|-----|-------|
| --color-accent | #C8A96E | Highlight bars, badges, decorative accents (inferred for studio brand) |
| --color-accent-dark | #A88A4E | Accent hover state |
| --color-accent-light | #EDE0C8 | Accent tint backgrounds |

### Neutral / Gray Scale
| Token | Hex | Usage |
|-------|-----|-------|
| --color-gray-50 | #F7F7F7 | Lightest background tint |
| --color-gray-100 | #EFEFEF | Section background, card background |
| --color-gray-200 | #E2E2E2 | Borders, dividers |
| --color-gray-300 | #C8C8C8 | Disabled borders |
| --color-gray-400 | #ABABAB | Muted text, placeholder |
| --color-gray-500 | #8A9099 | Secondary icon fill |
| --color-gray-600 | #6B6B6B | Caption text |
| --color-gray-700 | #4A4A4A | Secondary body text |
| --color-gray-800 | #32373C | Dark UI elements, buttons |
| --color-gray-900 | #1A1D20 | Deepest dark, hover on primary |
| --color-gray-950 | #0D0F11 | Near-black, footer deep bg |

### Semantic Colors
| Token | Hex | Usage |
|-------|-----|-------|
| --color-success | #2E7D32 | Success messages, confirmations |
| --color-success-light | #E8F5E9 | Success background tint |
| --color-warning | #F57C00 | Warning states, alerts |
| --color-warning-light | #FFF3E0 | Warning background tint |
| --color-error | #C62828 | Error states, validation |
| --color-error-light | #FFEBEE | Error background tint |
| --color-info | #0277BD | Info states, notices |
| --color-info-light | #E1F5FE | Info background tint |

### Background Colors
| Token | Hex | Usage |
|-------|-----|-------|
| --color-bg-page | #FFFFFF | Default page background |
| --color-bg-section-alt | #F7F7F7 | Alternating section background |
| --color-bg-dark | #32373C | Dark section backgrounds, nav |
| --color-bg-darker | #1A1D20 | Footer, deep dark sections |
| --color-bg-card | #FFFFFF | Card backgrounds |
| --color-bg-overlay | rgba(26, 29, 32, 0.72) | Modal overlays, hero overlays |

### Text Colors
| Token | Hex | Usage |
|-------|-----|-------|
| --color-text-primary | #000000 | Primary body text (confirmed via inline styles) |
| --color-text-secondary | #32373C | Secondary body text, labels |
| --color-text-muted | #6B6B6B | Captions, helper text |
| --color-text-inverse | #FFFFFF | Text on dark backgrounds |
| --color-text-on-dark | #FFFFFF | Text on dark sections/nav |
| --color-text-link | #32373C | Content area links |
| --color-text-link-hover | #1A1D20 | Link hover state |

---

## Typography

> ⚠ **No custom fonts detected in HTML.** The provided CSS contains no Google Fonts links, no `@font-face` declarations, and no `font-family` rules on heading or body elements. Only `font-size: 16px; font-weight: 300; line-height: 16px;` was found via inline styles. This site likely loads fonts via JavaScript (common in Elementor). **CHECK FONTS MANUALLY** — open the site in a browser, right-click a heading, Inspect → Computed tab → font-family. Edit design.md manually before using it.

### Font Families
```css
/* Heading Font — VERIFY MANUALLY */
font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif;
/* Source: https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap */
/* ⚠ UNCONFIRMED — replace with actual computed heading font */

/* Body Font — VERIFY MANUALLY */
font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif;
/* Source: https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap */
/* ⚠ UNCONFIRMED — replace with actual computed body font */
/* Confirmed: font-weight 300 used for body text (from inline styles) */
```

### Type Scale
| Style | Font | Size | Weight | Line-Height | Letter-Spacing |
|-------|------|------|--------|-------------|----------------|
| H1 | Heading Font | 48px | 600 | 1.15 | -0.02em |
| H2 | Heading Font | 36px | 600 | 1.2 | -0.015em |
| H3 | Heading Font | 28px | 500 | 1.3 | -0.01em |
| H4 | Heading Font | 22px | 500 | 1.35 | -0.005em |
| H5 | Heading Font | 18px | 500 | 1.4 | 0em |
| Body Large | Body Font | 18px | 300 | 1.7 | 0em |
| Body | Body Font | 16px | 300 | 1.6 | 0em |
| Body Small | Body Font | 14px | 300 | 1.6 | 0em |
| Caption | Body Font | 13px | 400 | 1.5 | 0.01em |
| Label | Body Font | 12px | 500 | 1.4 | 0.04em |

> **Note:** `font-size: 16px; font-weight: 300; line-height: 16px` confirmed from inline styles for nav/UI text. The `line-height: 16px` appears to be a compact navigation element — standard body line-height defaulted to 1.6 ratio.

---

## Spacing System
| Token | Value | Usage |
|-------|-------|-------|
| --space-xs | 4px | Micro gaps, icon padding |
| --space-sm | 8px | Tight spacing, badge padding |
| --space-md | 16px | Standard component padding |
| --space-lg | 24px | Card padding, form group gaps |
| --space-xl | 40px | Section inner padding |
| --space-2xl | 64px | Large section gaps |
| --space-3xl | 96px | Hero spacing |
| --container-max | 1200px | Max container width |
| --container-padding | 24px | Horizontal container padding |
| --section-padding | 80px | Vertical section padding |

---

## Borders & Radius
| Token | Value |
|-------|-------|
| --radius-sm | 4px |
| --radius-md | 8px |
| --radius-lg | 16px |
| --radius-xl | 24px |
| --radius-full | 9999px |
| --border-color | #E2E2E2 |
| --border-color-dark | #32373C |
| --border-width | 1px |
| --border-width-md | 2px |

> **Note:** `.wp-block-button__link` uses `border-radius: 9999px` (pill buttons) — this is confirmed from the actual CSS.

---

## Shadows
```css
--shadow-sm:  0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04);
--shadow-md:  0 4px 12px rgba(0, 0, 0, 0.10), 0 2px 4px rgba(0, 0, 0, 0.06);
--shadow-lg:  0 8px 24px rgba(0, 0, 0, 0.12), 0 4px 8px rgba(0, 0, 0, 0.08);
--shadow-xl:  0 16px 48px rgba(0, 0, 0, 0.16), 0 8px 16px rgba(0, 0, 0, 0.08);
--shadow-inset: inset 0 2px 4px rgba(0, 0, 0, 0.06);
```

> **Note:** WordPress preset shadows found in `:root` — `--wp--preset--shadow--natural: 6px 6px 9px rgba(0,0,0,0.2)` — but these are WP boilerplate. Custom shadow scale above is inferred for studio-quality UI.

---

## Transitions
```css
--transition-fast:   all 150ms ease;
--transition-base:   all 250ms ease;
--transition-slow:   all 400ms ease;
--transition-bounce: all 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
```

---

## Breakpoints
| Name | Min Width |
|------|-----------|
| xs | 375px |
| sm | 576px |
| md | 768px |
| lg | 1024px |
| xl | 1280px |
| 2xl | 1440px |

---

## Component Specs

### Button — Primary
```css
/* Confirmed from .wp-block-button__link */
background: #32373C;
color: #FFFFFF;
padding: calc(0.667em + 2px) calc(1.333em + 2px); /* ~12px 26px at 16px base */
border-radius: 9999px;
font-size: 18px; /* 1.125em at 16px base */
font-weight: 500;
border: none;
box-shadow: none;
text-decoration: none;
cursor: pointer;
display: inline-block;
/* Hover: background #1A1D20, transform translateY(-1px), box-shadow: 0 4px 12px rgba(0,0,0,0.2) */
/* Transition: all 250ms ease */
```

### Button — Secondary
```css
background: #FFFFFF;
color: #32373C;
padding: calc(0.667em + 2px) calc(1.333em + 2px);
border-radius: 9999px;
font-size: 18px;
font-weight: 500;
border: 2px solid #32373C;
box-shadow: none;
text-decoration: none;
cursor: pointer;
/* Hover: background #32373C, color #FFFFFF, transform translateY(-1px) */
/* Transition: all 250ms ease */
```

### Button — Ghost / Outline
```css
background: transparent;
color: #32373C;
padding: calc(0.667em + 2px) calc(1.333em + 2px);
border-radius: 9999px;
font-size: 16px;
font-weight: 400;
border: 1.5px solid #8A9099;
box-shadow: none;
text-decoration: none;
cursor: pointer;
/* Hover: border-color #32373C, color #1A1D20, background rgba(50,55,60,0.04) */
/* Transition: all 250ms ease */
```

### Card
```css
background: #FFFFFF;
border: 1px solid #E2E2E2;
border-radius: 16px;
padding: 32px;
box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
/* Hover: box-shadow 0 8px 24px rgba(0,0,0,0.12), transform translateY(-2px) */
/* Transition: all 250ms ease */
```

### Navigation
```css
/* Default state */
background: transparent;
height: 42px; /* confirmed from inline style: height: 42px */
padding: 0 24px;
/* Scrolled state */
background: #32373C;
box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
/* Link color: #000000 (confirmed inline), on-dark: #FFFFFF */
/* Link font-size: 16px (confirmed inline) */
/* Link font-weight: 300 (confirmed inline) */
/* Link line-height: 16px (confirmed inline) */
/* Link hover color: #32373C, text-decoration: underline or color shift */
```

### Footer
```css
background: #1A1D20;
color: #FFFFFF;
padding: 64px 24px 40px;
/* Heading color: #FFFFFF, weight: 600 */
/* Link color: #8A9099, hover: #FFFFFF */
/* Border-top: 1px solid #32373C */
/* Font-size: 14px, font-weight: 300 */
```

---

## CSS Design Tokens (complete :root block)
```css
:root {
  /* ─── Colors: Primary ─── */
  --color-primary:            #32373C;
  --color-primary-dark:       #1A1D20;
  --color-primary-light:      #8A9099;

  /* ─── Colors: Accent ─── */
  --color-accent:             #C8A96E;
  --color-accent-dark:        #A88A4E;
  --color-accent-light:       #EDE0C8;

  /* ─── Colors: Grays ─── */
  --color-gray-50:            #F7F7F7;
  --color-gray-100:           #EFEFEF;
  --color-gray-200:           #E2E2E2;
  --color-gray-300:           #C8C8C8;
  --color-gray-400:           #ABABAB;
  --color-gray-500:           #8A9099;
  --color-gray-600:           #6B6B6B;
  --color-gray-700:           #4A4A4A;
  --color-gray-800:           #32373C;
  --color-gray-900:           #1A1D20;
  --color-gray-950:           #0D0F11;

  /* ─── Colors: Semantic ─── */
  --color-success:            #2E7D32;
  --color-success-light:      #E8F5E9;
  --color-warning:            #F57C00;
  --color-warning-light:      #FFF3E0;
  --color-error:              #C62828;
  --color-error-light:        #FFEBEE;
  --color-info:               #0277BD;
  --color-info-light:         #E1F5FE;

  /* ─── Colors: Backgrounds ─── */
  --color-bg-page:            #FFFFFF;
  --color-bg-section-alt:     #F7F7F7;
  --color-bg-dark:            #32373C;
  --color-bg-darker:          #1A1D20;
  --color-bg-card:            #FFFFFF;
  --color-bg-overlay:         rgba(26, 29, 32, 0.72);

  /* ─── Colors: Text ─── */
  --color-text-primary:       #000000;
  --color-text-secondary:     #32373C;
  --color-text-muted:         #6B6B6B;
  --color-text-inverse:       #FFFFFF;
  --color-text-on-dark:       #FFFFFF;
  --color-text-link:          #32373C;
  --color-text-link-hover:    #1A1D20;

  /* ─── Colors: Borders ─── */
  --border-color:             #E2E2E2;
  --border-color-dark:        #32373C;
  --border-width:             1px;
  --border-width-md:          2px;

  /* ─── Typography: Families ─── */
  --font-heading:             'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  --font-body:                'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif;

  /* ─── Typography: Sizes ─── */
  --font-size-xs:             12px;
  --font-size-sm:             13px;
  --font-size-base:           16px;
  --font-size-md:             18px;
  --font-size-lg:             22px;
  --font-size-xl:             28px;
  --font-size-2xl:            36px;
  --font-size-3xl:            48px;

  /* ─── Typography: Weights ─── */
  --font-weight-light:        300;
  --font-weight-regular:      400;
  --font-weight-medium:       500;
  --font-weight-semibold:     600;
  --font-weight-bold:         700;

  /* ─── Typography: Line Heights ─── */
  --line-height-tight:        1.15;
  --line-height-snug:         1.3;
  --line-height-base:         1.6;
  --line-height-relaxed:      1.7;

  /* ─── Typography: Letter Spacing ─── */
  --letter-spacing-tight:     -0.02em;
  --letter-spacing-normal:     0em;
  --letter-spacing-wide:       0.04em;

  /* ─── Spacing ─── */
  --space-xs:                 4px;
  --space-sm:                 8px;
  --space-md:                 16px;
  --space-lg:                 24px;
  --space-xl:                 40px;
  --space-2xl:                64px;
  --space-3xl:                96px;

  /* ─── Layout ─── */
  --container-max:            1200px;
  --container-padding:        24px;
  --section-padding:          80px;
  --nav-height:               42px;

  /* ─── Borders & Radius ─── */
  --radius-sm:                4px;
  --radius-md:                8px;
  --radius-lg:                16px;
  --radius-xl:                24px;
  --radius-full:              9999px;

  /* ─── Shadows ─── */
  --shadow-sm:                0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-md:                0 4px 12px rgba(0, 0, 0, 0.10), 0 2px 4px rgba(0, 0, 0, 0.06);
  --shadow-lg:                0 8px 24px rgba(0, 0, 0, 0.12), 0 4px 8px rgba(0, 0, 0, 0.08);
  --shadow-xl:                0 16px 48px rgba(0, 0, 0, 0.16), 0 8px 16px rgba(0, 0, 0, 0.08);
  --shadow-inset:             inset 0 2px 4px rgba(0, 0, 0, 0.06);

  /* ─── Transitions ─── */
  --transition-fast:          all 150ms ease;
  --transition-base:          all 250ms ease;
  --transition-slow:          all 400ms ease;
  --transition-bounce:        all 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

---

> ### ⚠ Manual Verification Required
>
> The following items **must be verified directly in the browser** before using this design system to build a prototype:
>
> 1. **Primary color** — Confirm whether `#32373C` is truly the brand primary, or if a distinct accent color (blue, orange, teal, etc.) appears on CTA buttons in the rendered page. Inspect `.wp-block-button__link` or any Elementor button widget in the browser.
> 2. **Font families** — Open the site, right-click any heading → Inspect → Computed tab → `font-family`. The CSS provided contained **no Google Fonts links or `@font-face` declarations**, strongly suggesting fonts are loaded via JavaScript (Elementor's dynamic asset loading).
> 3. **Accent color** — The `--color-accent` gold (`#C8A96E`) is **inferred** based on "Sharpen Studio" brand naming conventions, not extracted from actual CSS. Replace with the real accent if found.
> 4. **Heading sizes** — No heading element CSS rules were found. Verify actual `font-size` on H1/H2/H3 via browser DevTools.