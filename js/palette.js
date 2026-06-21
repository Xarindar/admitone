/* Color Palette Studio.
 *
 * Generates harmonious palettes, lets you lock the colors you like, and
 * regenerates only the unlocked slots — choosing new colors that stay in
 * harmony with whatever is held. No build step, no dependencies.
 */
(function () {
  const row = document.getElementById("paletteRow");
  if (!row) {
    return;
  }

  const toast = document.getElementById("paletteToast");
  const countLabel = document.getElementById("swatchCount");
  const addBtn = document.getElementById("addSwatch");
  const removeBtn = document.getElementById("removeSwatch");
  const generateBtn = document.getElementById("generateBtn");
  const copyAllBtn = document.getElementById("copyAllBtn");
  const shareBtn = document.getElementById("shareBtn");

  const MIN_SWATCHES = 3;
  const MAX_SWATCHES = 7;
  const DEFAULT_SWATCHES = 5;

  // --- color math ------------------------------------------------------

  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  const mod360 = (n) => ((n % 360) + 360) % 360;

  function hslToRgb(h, s, l) {
    h = mod360(h) / 360;
    s = clamp(s, 0, 100) / 100;
    l = clamp(l, 0, 100) / 100;

    if (s === 0) {
      const v = Math.round(l * 255);
      return [v, v, v];
    }

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const toChannel = (t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    return [toChannel(h + 1 / 3), toChannel(h), toChannel(h - 1 / 3)].map((v) =>
      Math.round(v * 255),
    );
  }

  function rgbToHex(r, g, b) {
    return (
      "#" +
      [r, g, b]
        .map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0"))
        .join("")
    );
  }

  function hslToHex(h, s, l) {
    return rgbToHex(...hslToRgb(h, s, l));
  }

  function hexToRgb(hex) {
    const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!match) {
      return null;
    }
    return [parseInt(match[1], 16), parseInt(match[2], 16), parseInt(match[3], 16)];
  }

  function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        default:
          h = (r - g) / d + 4;
      }
      h /= 6;
    }

    return { h: h * 360, s: s * 100, l: l * 100 };
  }

  function hexToHsl(hex) {
    const rgb = hexToRgb(hex);
    return rgb ? rgbToHsl(...rgb) : null;
  }

  // WCAG relative luminance, used to pick legible ink (text/icon) per swatch.
  function relativeLuminance(r, g, b) {
    const channels = [r, g, b].map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  }

  // Brand inks (almost-black / warm-white) and their luminance, so labels use
  // whichever gives the stronger WCAG contrast on a given swatch.
  const INK_DARK = "#1a1710";
  const INK_WARM = "#fbf7ee";
  const LUM_DARK = relativeLuminance(26, 23, 16);
  const LUM_WARM = relativeLuminance(251, 247, 238);

  function contrastRatio(a, b) {
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  }

  function readableInk(hex) {
    const rgb = hexToRgb(hex);
    if (!rgb) {
      return INK_DARK;
    }
    const lum = relativeLuminance(...rgb);
    return contrastRatio(lum, LUM_DARK) >= contrastRatio(lum, LUM_WARM)
      ? INK_DARK
      : INK_WARM;
  }

  // --- harmony ---------------------------------------------------------

  // Each scheme is a set of hue offsets (degrees) from a base hue. Generated
  // colors are placed at these offsets so they relate to the base — and, when
  // colors are locked, the base is taken from the held colors themselves.
  const SCHEMES = [
    { name: "Analogous", offsets: [-34, -17, 0, 17, 34] },
    { name: "Complementary", offsets: [0, 16, 180, 196, 180] },
    { name: "Split complementary", offsets: [0, 150, 210, 168, 192] },
    { name: "Triadic", offsets: [0, 120, 240, 120, 240] },
    { name: "Tetradic", offsets: [0, 90, 180, 270, 90] },
    { name: "Monochrome", offsets: [0, 0, 0, 0, 0] },
  ];

  const randItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const jitter = (amount) => (Math.random() * 2 - 1) * amount;

  function shuffle(arr) {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function cycle(arr, length) {
    const out = [];
    for (let i = 0; i < length; i++) {
      out.push(arr[i % arr.length]);
    }
    return out;
  }

  // Circular mean of hues so a set of held colors collapses to one base angle.
  function meanHue(hues) {
    if (!hues.length) {
      return Math.random() * 360;
    }
    let x = 0;
    let y = 0;
    hues.forEach((h) => {
      const rad = (h * Math.PI) / 180;
      x += Math.cos(rad);
      y += Math.sin(rad);
    });
    return mod360((Math.atan2(y, x) * 180) / Math.PI);
  }

  // --- state -----------------------------------------------------------

  let swatches = [];

  function generate() {
    const locked = swatches.filter((s) => s.locked).map((s) => hexToHsl(s.hex)).filter(Boolean);
    const scheme = randItem(SCHEMES);

    // Anchor hue + vividness to the held colors so new picks belong with them.
    const baseHue = locked.length ? meanHue(locked.map((c) => c.h)) : Math.random() * 360;
    const baseSat = locked.length
      ? clamp(locked.reduce((sum, c) => sum + c.s, 0) / locked.length, 38, 90)
      : 52 + Math.random() * 30;

    const unlockedIndices = swatches
      .map((s, i) => (s.locked ? -1 : i))
      .filter((i) => i !== -1);
    const count = unlockedIndices.length;
    const offsetPool = shuffle(cycle(scheme.offsets, count));

    unlockedIndices.forEach((index, ordinal) => {
      // Spread lightness across the unlocked slots for a usable light→dark range.
      const ladder = count > 1 ? 32 + 50 * (ordinal / (count - 1)) : 58;
      const h = mod360(baseHue + offsetPool[ordinal] + jitter(7));
      const s = clamp(baseSat + jitter(12), 30, 92);
      const l = clamp(ladder + jitter(7), 20, 90);
      swatches[index].hex = hslToHex(h, s, l);
    });

    render();
  }

  function addSwatch() {
    if (swatches.length >= MAX_SWATCHES) {
      return;
    }
    // Derive the new color from the current palette so it arrives in harmony.
    const all = swatches.map((s) => hexToHsl(s.hex)).filter(Boolean);
    const base = meanHue(all.map((c) => c.h));
    const avgSat = all.length
      ? clamp(all.reduce((sum, c) => sum + c.s, 0) / all.length, 35, 90)
      : 60;
    const h = mod360(base + randItem([-30, 30, 120, 150, 180, 210]) + jitter(8));
    const s = clamp(avgSat + jitter(10), 32, 92);
    const l = clamp(38 + Math.random() * 34, 24, 86);
    swatches.push({ hex: hslToHex(h, s, l), locked: false });
    render();
  }

  function removeSwatch() {
    if (swatches.length <= MIN_SWATCHES) {
      return;
    }
    // Prefer removing an unlocked color so a held one isn't dropped by surprise.
    let removeAt = -1;
    for (let i = swatches.length - 1; i >= 0; i--) {
      if (!swatches[i].locked) {
        removeAt = i;
        break;
      }
    }
    swatches.splice(removeAt === -1 ? swatches.length - 1 : removeAt, 1);
    render();
  }

  // --- clipboard + toast ----------------------------------------------

  let toastTimer;

  function showToast(message) {
    if (!toast) {
      return;
    }
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 1600);
  }

  async function copy(text, label) {
    const announce = () => showToast(label || `Copied ${text}`);
    try {
      await navigator.clipboard.writeText(text);
      announce();
    } catch (error) {
      const field = document.createElement("textarea");
      field.value = text;
      field.setAttribute("readonly", "");
      field.style.position = "absolute";
      field.style.left = "-9999px";
      document.body.appendChild(field);
      field.select();
      try {
        document.execCommand("copy");
        announce();
      } catch (fallbackError) {
        showToast("Copy not supported");
      }
      field.remove();
    }
  }

  // --- icons -----------------------------------------------------------

  const ICON_LOCK_CLOSED =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 1.8a5 5 0 0 0-5 5V10H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V6.8a5 5 0 0 0-5-5Zm3 8.2H9V6.8a3 3 0 0 1 6 0V10Z"/></svg>';
  const ICON_LOCK_OPEN =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 1.8a5 5 0 0 0-5 5 1 1 0 1 0 2 0 3 3 0 0 1 6 0V10H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-5V6.8Z"/></svg>';
  const ICON_COPY =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M9 2a2 2 0 0 0-2 2v1H6a3 3 0 0 0-3 3v11a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-1h1a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H9Zm0 2h10v11h-2V8a3 3 0 0 0-3-3H9V4ZM6 7h8a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z"/></svg>';

  // --- render ----------------------------------------------------------

  function makeButton(className, label, title, html) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.setAttribute("aria-label", label);
    button.title = title;
    button.innerHTML = html;
    return button;
  }

  function render() {
    row.textContent = "";

    swatches.forEach((sw, index) => {
      const upper = sw.hex.toUpperCase();
      const ink = readableInk(sw.hex);

      const column = document.createElement("div");
      column.className = "swatch" + (sw.locked ? " is-locked" : "");
      column.style.setProperty("--swatch", sw.hex);
      column.style.setProperty("--ink", ink);
      column.setAttribute("role", "group");
      column.setAttribute(
        "aria-label",
        `Color ${index + 1}, ${upper}${sw.locked ? ", locked" : ""}`,
      );

      const controls = document.createElement("div");
      controls.className = "swatch-controls";

      const lockBtn = makeButton(
        "swatch-btn swatch-lock",
        sw.locked ? `Unlock ${upper}` : `Lock ${upper}`,
        sw.locked ? "Locked — click to unlock" : "Lock this color",
        sw.locked ? ICON_LOCK_CLOSED : ICON_LOCK_OPEN,
      );
      lockBtn.setAttribute("aria-pressed", String(sw.locked));
      lockBtn.addEventListener("click", () => {
        sw.locked = !sw.locked;
        render();
      });

      const copyBtn = makeButton(
        "swatch-btn swatch-copy",
        `Copy ${upper}`,
        "Copy hex",
        ICON_COPY,
      );
      copyBtn.addEventListener("click", () => copy(upper));

      controls.append(lockBtn, copyBtn);

      const hexBtn = document.createElement("button");
      hexBtn.type = "button";
      hexBtn.className = "swatch-hex";
      hexBtn.textContent = upper;
      hexBtn.title = "Copy hex";
      hexBtn.addEventListener("click", () => copy(upper));

      column.append(controls, hexBtn);
      row.appendChild(column);
    });

    if (countLabel) {
      countLabel.textContent = String(swatches.length);
    }
    if (addBtn) {
      addBtn.disabled = swatches.length >= MAX_SWATCHES;
    }
    if (removeBtn) {
      removeBtn.disabled = swatches.length <= MIN_SWATCHES;
    }

    syncHash();
  }

  // --- shareable URL ---------------------------------------------------

  function syncHash() {
    const slug = swatches.map((s) => s.hex.replace("#", "")).join("-");
    history.replaceState(null, "", "#" + slug);
  }

  function paletteFromHash() {
    const raw = decodeURIComponent((location.hash || "").replace(/^#/, "")).trim();
    if (!raw) {
      return null;
    }
    const hexes = raw
      .split("-")
      .map((part) => part.trim())
      .map((part) => {
        if (/^[0-9a-f]{6}$/i.test(part)) {
          return "#" + part.toLowerCase();
        }
        if (/^[0-9a-f]{3}$/i.test(part)) {
          return "#" + part.toLowerCase().replace(/(.)/g, "$1$1");
        }
        return null;
      })
      .filter(Boolean)
      .slice(0, MAX_SWATCHES);

    if (hexes.length < MIN_SWATCHES) {
      return null;
    }
    return hexes.map((hex) => ({ hex, locked: false }));
  }

  // --- wiring ----------------------------------------------------------

  generateBtn?.addEventListener("click", generate);
  addBtn?.addEventListener("click", addSwatch);
  removeBtn?.addEventListener("click", removeSwatch);
  copyAllBtn?.addEventListener("click", () =>
    copy(swatches.map((s) => s.hex.toUpperCase()).join(", "), "Copied palette"),
  );
  shareBtn?.addEventListener("click", () => copy(location.href, "Link copied"));

  // Spacebar regenerates, the way Coolors does — but never while a control,
  // field, or link is focused, so buttons and inputs keep working normally.
  document.addEventListener("keydown", (event) => {
    if (event.code !== "Space" && event.key !== " ") {
      return;
    }
    const el = document.activeElement;
    const tag = el && el.tagName;
    const isInteractive =
      tag === "BUTTON" ||
      tag === "INPUT" ||
      tag === "TEXTAREA" ||
      tag === "SELECT" ||
      tag === "A" ||
      (el && el.isContentEditable);
    if (isInteractive) {
      return;
    }
    event.preventDefault();
    generate();
  });

  // --- init ------------------------------------------------------------

  const fromHash = paletteFromHash();
  if (fromHash) {
    swatches = fromHash;
    render();
  } else {
    swatches = Array.from({ length: DEFAULT_SWATCHES }, () => ({
      hex: "#cccccc",
      locked: false,
    }));
    generate();
  }
})();
