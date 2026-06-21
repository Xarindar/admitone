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
│   └── palette.css   # Color Palette Studio tool
├── js/
│   ├── main.js       # header/menu + homepage scroll behaviors (safe on every page)
│   └── palette.js    # palette generation, locking, copy, shareable URL
└── assets/
    └── logos/        # favicon + header/footer brand marks
```

## Resources & the Color Palette Studio

`resources.html` is a small hub of no-login brand tools to send clients to. The
first tool, `palette.html`, is a Coolors-style palette generator:

- **Generate** random colors with the button or the spacebar.
- **Lock** any swatch you like; regenerating only replaces the unlocked ones.
- Locked colors **anchor the harmony** — new colors are picked as harmonic
  offsets (analogous, complementary, triadic, etc.) around the held hues, at a
  matching saturation, with lightness spread across the row for a usable range.
- **Click a swatch** (or its copy button) to copy the hex; **Copy palette**
  grabs them all, and **Copy link** shares the palette via the URL hash, so a
  client can open exactly what you built and lock their own favorites.

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
