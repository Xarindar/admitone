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
├── index.html
├── README.md
├── css/              # component stylesheets, linked in order by index.html
│   ├── tokens.css    # design tokens (colors, type)
│   ├── base.css      # reset, elements, typography, buttons, containers
│   ├── header.css
│   ├── hero.css      # hero marquee + logo rail
│   ├── content.css   # intro, stats, services, features, work, notes, testimonials
│   ├── pricing.css
│   ├── showtime.css  # scroll reveal + contact form
│   └── footer.css
├── js/
│   └── main.js
└── assets/
    ├── ticket.svg
    └── logos/        # favicon + header/footer brand marks
```

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
