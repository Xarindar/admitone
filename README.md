# Admit One

First draft for the Admit One web design studio site.

## Direction

Admit One is being shaped as a fun, modern, clean web design studio with a small amount of vintage ticket-window charm. The current draft uses a modular homepage structure inspired by polished consulting and studio layouts: a full top hero, logo rail, compact service cards, project placeholders, pricing, client notes, insight cards, and a final contact banner.

## Palette

- Almost black: `#1A1710`
- Vintage ticket red: `#B8231A`
- Old Hollywood gold: `#C8952A`
- Warm white: `#FBF7EE`

## Typography

- Primary UI and headings: Bricolage Grotesque
- Accent/editorial type: Fraunces

## Project Structure

```text
.
├── index.html        # homepage
├── resources.html    # Resources hub (brand tools we hand to clients)
├── palette.html      # Color Palette Studio tool
├── railway-setup-guide.html # Client guide for Railway + GitHub setup
├── README.md
├── css/              # component stylesheets, linked in order by each page
│   ├── tokens.css    # design tokens (colors, type)
│   ├── base.css      # reset, elements, typography, buttons, containers
│   ├── header.css
│   ├── hero.css      # hero marquee + logo rail
│   ├── content.css   # intro, stats, services, features, work, notes, testimonials
│   ├── pricing.css
│   ├── showtime.css  # scroll reveal + contact form
│   ├── footer.css
│   ├── subpage.css   # shared dark header band + page intro for standalone pages
│   ├── resources.css # Resources hub card grid
│   ├── guide.css     # Reusable long-form client setup guide layout
│   └── palette.css   # Color Palette Studio tool
├── js/
│   ├── main.js         # header/menu + homepage scroll behaviors (safe on every page)
│   ├── guide.js        # guide progress + copy interactions
│   ├── palette.js      # palette generation, locking, copy, shareable URL
│   └── color-names.js  # bundled best-of color-name list, matched locally for instant names
└── assets/
    └── logos/        # favicon + header/footer brand marks
```

## Resources & the Color Palette Studio

`resources.html` is a small hub of setup guides and no-login brand tools to send
clients to. The setup guide pattern uses a web-native reading page with guide
metadata, a progress checklist, anchored sections, callouts, and related-guide
slots so additional setup guides can be added consistently.

The first tool, `palette.html`, builds a structured, site-ready **brand palette**
from a single brand color rather than five random swatches:

- **Five roles** — Primary, Accent, Muted, Text, and Background. Text and
  Background stay near-white / near-black tints of the brand hue for large areas and body copy.
  Background↔Text always meets WCAG AA contrast.
- **Brand color** picker anchors the Primary; **Generate** (or the spacebar)
  rolls fresh supporting options around it without claiming there is one perfect
  companion palette.
- **Lock** any role to hold it while regenerating the rest. Use the shade
  button on a swatch to show a seven-step ladder: three lighter options, the
  current color, and three darker options. Selecting a step makes it the color
  for that role.
- **Names** appear instantly: a bundled best-of list from
  [meodai/color-names](https://github.com/meodai/color-names) (`js/color-names.js`,
  ~4.9k names) is matched locally in CIE Lab space — no network round-trip, works
  offline.
- **Copy palette** exports a labeled `Role  #HEX` block for handoff, and **Copy
  link** shares the exact palette via the URL hash.

## Local Preview

This is a static HTML/CSS/JS site. You can open `index.html` directly or serve the folder locally:

```bash
python -m http.server 59120 --bind 127.0.0.1
```

Then open:

```text
http://127.0.0.1:59120/
```

## Notes

The current logos, images, metrics, testimonials, package prices, and project names are placeholders so final brand assets can be swapped in later.
