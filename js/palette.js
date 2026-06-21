/* Color Palette Studio.
 *
 * Builds a structured, site-ready brand palette from a single brand color:
 * a tinted Background and Text (the "white" and "black"), the Primary brand
 * color, a harmonious Accent, and a Muted support tone. Lock what you like,
 * regenerate the rest, click any swatch to browse its shades and hues, and
 * (on the live site) names come from the color.pizza API.
 */
(function () {
  const row = document.getElementById("paletteRow");
  if (!row) {
    return;
  }

  const toast = document.getElementById("paletteToast");
  const generateBtn = document.getElementById("generateBtn");
  const harmonySelect = document.getElementById("harmonySelect");
  const brandColor = document.getElementById("brandColor");
  const copyAllBtn = document.getElementById("copyAllBtn");
  const shareBtn = document.getElementById("shareBtn");

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

  const hslToHex = (h, s, l) => rgbToHex(...hslToRgb(h, s, l));
  const toHex = (o) => hslToHex(o.h, o.s, o.l);

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

  function normalizeHex(value) {
    if (!value) {
      return null;
    }
    let x = String(value).trim().replace(/^#/, "").toLowerCase();
    if (/^[0-9a-f]{3}$/.test(x)) {
      x = x.replace(/(.)/g, "$1$1");
    }
    return /^[0-9a-f]{6}$/.test(x) ? "#" + x : null;
  }

  const keyHex = (hex) => hex.replace(/^#/, "").toLowerCase();

  // Brand inks and luminance, to label each swatch with the more legible one.
  const INK_DARK = "#1a1710";
  const INK_WARM = "#fbf7ee";

  function relativeLuminance(r, g, b) {
    const channels = [r, g, b].map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  }

  const LUM_DARK = relativeLuminance(26, 23, 16);
  const LUM_WARM = relativeLuminance(251, 247, 238);
  const contrastRatio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

  function readableInk(hex) {
    const rgb = hexToRgb(hex);
    if (!rgb) {
      return INK_DARK;
    }
    const lum = relativeLuminance(...rgb);
    return contrastRatio(lum, LUM_DARK) >= contrastRatio(lum, LUM_WARM) ? INK_DARK : INK_WARM;
  }

  // --- palette model ---------------------------------------------------

  const ROLES = [
    { key: "background", label: "Background" },
    { key: "text", label: "Text" },
    { key: "primary", label: "Primary" },
    { key: "accent", label: "Accent" },
    { key: "muted", label: "Muted" },
  ];

  let swatches = ROLES.map((r) => ({ key: r.key, label: r.label, hex: "#cccccc", locked: false }));
  let harmony = harmonySelect ? harmonySelect.value : "analogous";

  const ACCENT_OFFSET = {
    monochrome: 0,
    analogous: 28,
    complementary: 180,
    triadic: 120,
  };

  // Derive the four supporting roles from a primary color + harmony. The
  // neutrals borrow the brand hue at low saturation so they feel "of" the
  // brand; Background is a near-white, Text a near-black, both readable.
  function deriveRoles(primaryHsl) {
    const h = primaryHsl.h;
    const s = primaryHsl.s;
    const l = primaryHsl.l;
    const accentHue = mod360(h + (ACCENT_OFFSET[harmony] ?? 0));

    // For a same-hue (monochrome) accent, sit in whichever tonal gap is larger
    // — toward Text (13) or Muted (73) — so it never collides with the Primary.
    let accentL = 53;
    if (harmony === "monochrome") {
      accentL = l - 13 >= 73 - l ? clamp(l - 16, 20, l - 8) : clamp(l + 16, l + 8, 70);
    }

    return {
      background: { h, s: clamp(s * 0.16, 6, 20), l: 96 },
      text: { h, s: clamp(s * 0.3, 12, 34), l: 13 },
      accent: { h: accentHue, s: clamp(s * 0.92, 48, 88), l: accentL },
      muted: { h, s: clamp(s * 0.42, 16, 46), l: 73 },
    };
  }

  function rederiveFromPrimary() {
    const primary = swatches.find((s) => s.key === "primary");
    const derived = deriveRoles(hexToHsl(primary.hex));
    swatches.forEach((sw) => {
      if (sw.key !== "primary" && !sw.locked) {
        sw.hex = toHex(derived[sw.key]);
      }
    });
  }

  function generate() {
    const primary = swatches.find((s) => s.key === "primary");
    let primaryHsl;
    if (primary.locked) {
      primaryHsl = hexToHsl(primary.hex);
    } else {
      primaryHsl = { h: Math.random() * 360, s: 58 + Math.random() * 28, l: 47 + Math.random() * 8 };
      primary.hex = toHex({ h: primaryHsl.h, s: clamp(primaryHsl.s, 45, 90), l: clamp(primaryHsl.l, 40, 56) });
      primaryHsl = hexToHsl(primary.hex);
    }
    const derived = deriveRoles(primaryHsl);
    swatches.forEach((sw) => {
      if (sw.key !== "primary" && !sw.locked) {
        sw.hex = toHex(derived[sw.key]);
      }
    });
    afterChange();
  }

  // Setting the brand color directly rebuilds the palette around it.
  function setPrimary(hex) {
    const h = normalizeHex(hex);
    if (!h) {
      return;
    }
    const primary = swatches.find((s) => s.key === "primary");
    primary.hex = h;
    primary.locked = true;
    rederiveFromPrimary();
    afterChange();
  }

  // Variations shown in the per-swatch editor.
  function shadesOf(hsl) {
    return [92, 80, 67, 54, 42, 30, 18].map((l) => ({ h: hsl.h, s: clamp(hsl.s, 8, 95), l }));
  }

  function huesOf(hsl) {
    return [-45, -30, -15, 0, 15, 30, 45].map((o) => ({
      h: mod360(hsl.h + o),
      s: hsl.s,
      l: clamp(hsl.l, 16, 92),
    }));
  }

  // --- color names ------------------------------------------------------
  //
  // Names are matched locally against a bundled best-of list (color-names.js),
  // so they appear the same instant the color does — no network round-trip.
  // Matching is done in CIE Lab space for perceptually sensible picks.

  const nameCache = new Map();
  let NAME_INDEX = null;

  function rgbToLab(r, g, b) {
    let R = r / 255;
    let G = g / 255;
    let B = b / 255;
    R = R > 0.04045 ? Math.pow((R + 0.055) / 1.055, 2.4) : R / 12.92;
    G = G > 0.04045 ? Math.pow((G + 0.055) / 1.055, 2.4) : G / 12.92;
    B = B > 0.04045 ? Math.pow((B + 0.055) / 1.055, 2.4) : B / 12.92;
    let x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
    let y = R * 0.2126 + G * 0.7152 + B * 0.0722;
    let z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
    const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
    x = f(x);
    y = f(y);
    z = f(z);
    return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
  }

  function initNameIndex() {
    if (typeof window.CN === "undefined" || !window.CN.n) {
      return;
    }
    const names = window.CN.n.split("\n");
    const hex = window.CN.h;
    const count = names.length;
    const labs = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const o = i * 6;
      const lab = rgbToLab(
        parseInt(hex.slice(o, o + 2), 16),
        parseInt(hex.slice(o + 2, o + 4), 16),
        parseInt(hex.slice(o + 4, o + 6), 16),
      );
      labs[i * 3] = lab[0];
      labs[i * 3 + 1] = lab[1];
      labs[i * 3 + 2] = lab[2];
    }
    NAME_INDEX = { names, labs, count };
  }

  function nameFor(hex) {
    const key = keyHex(hex);
    if (nameCache.has(key)) {
      return nameCache.get(key);
    }
    let name = "";
    const rgb = hexToRgb(hex);
    if (NAME_INDEX && rgb) {
      const target = rgbToLab(...rgb);
      const labs = NAME_INDEX.labs;
      let best = Infinity;
      let bestIndex = 0;
      for (let i = 0; i < NAME_INDEX.count; i++) {
        const dL = target[0] - labs[i * 3];
        const dA = target[1] - labs[i * 3 + 1];
        const dB = target[2] - labs[i * 3 + 2];
        const dist = dL * dL + dA * dA + dB * dB;
        if (dist < best) {
          best = dist;
          bestIndex = i;
        }
      }
      name = NAME_INDEX.names[bestIndex];
    }
    nameCache.set(key, name);
    return name;
  }

  // --- icons -----------------------------------------------------------

  const ICON_LOCK_CLOSED =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 1.8a5 5 0 0 0-5 5V10H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V6.8a5 5 0 0 0-5-5Zm3 8.2H9V6.8a3 3 0 0 1 6 0V10Z"/></svg>';
  const ICON_LOCK_OPEN =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 1.8a5 5 0 0 0-5 5 1 1 0 1 0 2 0 3 3 0 0 1 6 0V10H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-5V6.8Z"/></svg>';
  const ICON_COPY =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M9 2a2 2 0 0 0-2 2v1H6a3 3 0 0 0-3 3v11a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-1h1a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H9Zm0 2h10v11h-2V8a3 3 0 0 0-3-3H9V4ZM6 7h8a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z"/></svg>';
  const ICON_EDIT =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m20.7 5.6-2.3-2.3a2 2 0 0 0-2.8 0l-1.6 1.6 5.1 5.1 1.6-1.6a2 2 0 0 0 0-2.8ZM3 16.2V21h4.8l9.4-9.4-4.8-4.8L3 16.2Zm4 2.8H5v-2l8.2-8.2 2 2L7 19Z"/></svg>';

  function makeButton(className, label, title, html) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.setAttribute("aria-label", label);
    button.title = title;
    button.innerHTML = html;
    return button;
  }

  // --- render ----------------------------------------------------------

  function render() {
    row.textContent = "";

    swatches.forEach((sw, index) => {
      const upper = sw.hex.toUpperCase();
      const ink = readableInk(sw.hex);

      const col = document.createElement("div");
      col.className = "swatch" + (sw.locked ? " is-locked" : "");
      col.style.setProperty("--swatch", sw.hex);
      col.style.setProperty("--ink", ink);
      col.dataset.role = sw.key;
      col.tabIndex = 0;
      col.setAttribute("role", "group");
      col.setAttribute(
        "aria-label",
        `${sw.label}: ${upper}${sw.locked ? ", locked" : ""}. Press Enter to adjust shades and hues.`,
      );

      const roleEl = document.createElement("span");
      roleEl.className = "swatch-role";
      roleEl.textContent = sw.label;

      const controls = document.createElement("div");
      controls.className = "swatch-controls";

      const lockBtn = makeButton(
        "swatch-btn swatch-lock",
        sw.locked ? `Unlock ${upper}` : `Lock ${upper}`,
        sw.locked ? "Locked — click to unlock" : "Lock this color",
        sw.locked ? ICON_LOCK_CLOSED : ICON_LOCK_OPEN,
      );
      lockBtn.setAttribute("aria-pressed", String(sw.locked));
      lockBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        sw.locked = !sw.locked;
        afterChange();
      });

      const editBtn = makeButton(
        "swatch-btn swatch-edit",
        `Adjust ${sw.label}`,
        "Adjust shades & hues",
        ICON_EDIT,
      );
      editBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        openEditor(index);
      });

      const copyBtn = makeButton("swatch-btn swatch-copy", `Copy ${upper}`, "Copy hex", ICON_COPY);
      copyBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        copy(upper);
      });

      controls.append(lockBtn, editBtn, copyBtn);

      const info = document.createElement("div");
      info.className = "swatch-info";

      const hexBtn = document.createElement("button");
      hexBtn.type = "button";
      hexBtn.className = "swatch-hex";
      hexBtn.textContent = upper;
      hexBtn.title = "Copy hex";
      hexBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        copy(upper);
      });

      const nameEl = document.createElement("span");
      nameEl.className = "swatch-name";
      nameEl.textContent = nameFor(sw.hex);

      info.append(hexBtn, nameEl);
      col.append(roleEl, controls, info);

      col.addEventListener("click", (e) => {
        if (e.target.closest("button")) {
          return;
        }
        openEditor(index);
      });
      col.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          openEditor(index);
        }
      });

      row.appendChild(col);
    });
  }

  function syncBrandInput() {
    const primary = swatches.find((s) => s.key === "primary");
    if (brandColor && primary) {
      brandColor.value = primary.hex;
    }
  }

  function afterChange() {
    render();
    syncBrandInput();
    syncHash();
  }

  // --- per-swatch editor ----------------------------------------------

  let editor = null;
  let editorEls = {};
  let activeIndex = -1;

  function buildEditor() {
    editor = document.createElement("div");
    editor.className = "shade-editor";
    editor.hidden = true;
    editor.innerHTML =
      '<div class="shade-backdrop" data-close></div>' +
      '<div class="shade-card" role="dialog" aria-modal="true" aria-label="Adjust color">' +
      '<div class="shade-head"><div><p class="shade-role"></p><p class="shade-current"></p></div>' +
      '<button type="button" class="shade-close" aria-label="Close">&times;</button></div>' +
      '<p class="shade-label">Shades</p><div class="shade-row" data-kind="shades"></div>' +
      '<p class="shade-label">Hues</p><div class="shade-row" data-kind="hues"></div>' +
      '<div class="shade-exact"><label class="exact-color"><span>Exact</span>' +
      '<input type="color" /></label><input type="text" class="exact-hex" maxlength="7" aria-label="Hex value" /></div>' +
      "</div>";
    document.body.appendChild(editor);

    editorEls = {
      role: editor.querySelector(".shade-role"),
      current: editor.querySelector(".shade-current"),
      shades: editor.querySelector('[data-kind="shades"]'),
      hues: editor.querySelector('[data-kind="hues"]'),
      color: editor.querySelector(".exact-color input"),
      hex: editor.querySelector(".exact-hex"),
    };

    editor.addEventListener("click", (e) => {
      if (e.target.matches("[data-close]") || e.target.closest(".shade-close")) {
        closeEditor();
      }
    });
    editorEls.color.addEventListener("input", () => applyActive(editorEls.color.value));
    editorEls.hex.addEventListener("change", () => {
      const h = normalizeHex(editorEls.hex.value);
      if (h) applyActive(h);
      else refreshEditor();
    });
    editorEls.hex.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const h = normalizeHex(editorEls.hex.value);
        if (h) applyActive(h);
      }
    });
  }

  function fillRow(container, list) {
    container.textContent = "";
    list.forEach((hsl) => {
      const hex = toHex(hsl);
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "shade-chip";
      chip.style.background = hex;
      chip.title = hex.toUpperCase();
      chip.setAttribute("aria-label", hex.toUpperCase());
      chip.addEventListener("click", () => applyActive(hex));
      container.appendChild(chip);
    });
  }

  function paintEditorCurrent() {
    const sw = swatches[activeIndex];
    const name = nameFor(sw.hex);
    editorEls.current.textContent = sw.hex.toUpperCase() + (name ? " · " + name : "");
  }

  function refreshEditor() {
    const sw = swatches[activeIndex];
    if (!sw) {
      return;
    }
    const hsl = hexToHsl(sw.hex);
    editorEls.role.textContent = sw.label;
    paintEditorCurrent();
    fillRow(editorEls.shades, shadesOf(hsl));
    fillRow(editorEls.hues, huesOf(hsl));
    editorEls.color.value = sw.hex;
    editorEls.hex.value = sw.hex.toUpperCase();
  }

  function openEditor(index) {
    if (!editor) {
      buildEditor();
    }
    activeIndex = index;
    editor.hidden = false;
    document.body.classList.add("editor-open");
    refreshEditor();
    window.setTimeout(() => editor.querySelector(".shade-close")?.focus(), 0);
  }

  function closeEditor() {
    if (!editor || editor.hidden) {
      return;
    }
    editor.hidden = true;
    document.body.classList.remove("editor-open");
    const col = row.children[activeIndex];
    activeIndex = -1;
    col?.focus?.();
  }

  // Picking any variation pins (locks) that swatch as a deliberate choice.
  function applyActive(hex) {
    const h = normalizeHex(hex);
    if (!h || activeIndex < 0) {
      return;
    }
    const sw = swatches[activeIndex];
    sw.hex = h;
    sw.locked = true;
    if (sw.key === "primary") {
      rederiveFromPrimary();
    }
    afterChange();
    refreshEditor();
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

  function paletteText() {
    const width = Math.max(...swatches.map((s) => s.label.length)) + 2;
    return swatches.map((s) => s.label.padEnd(width, " ") + s.hex.toUpperCase()).join("\n");
  }

  // --- shareable URL ---------------------------------------------------

  function syncHash() {
    history.replaceState(null, "", "#" + swatches.map((s) => keyHex(s.hex)).join("-"));
  }

  function paletteFromHash() {
    const raw = decodeURIComponent((location.hash || "").replace(/^#/, "")).trim();
    if (!raw) {
      return null;
    }
    const hexes = raw
      .split("-")
      .map((part) => normalizeHex(part))
      .filter(Boolean);
    return hexes.length === swatches.length ? hexes : null;
  }

  // --- wiring ----------------------------------------------------------

  generateBtn?.addEventListener("click", generate);
  harmonySelect?.addEventListener("change", () => {
    harmony = harmonySelect.value;
    rederiveFromPrimary();
    afterChange();
  });
  brandColor?.addEventListener("input", () => setPrimary(brandColor.value));
  copyAllBtn?.addEventListener("click", () => copy(paletteText(), "Copied palette"));
  shareBtn?.addEventListener("click", () => copy(location.href, "Link copied"));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && editor && !editor.hidden) {
      closeEditor();
      return;
    }
    if (event.code !== "Space" && event.key !== " ") {
      return;
    }
    if (editor && !editor.hidden) {
      return;
    }
    const el = document.activeElement;
    const tag = el && el.tagName;
    const isInteractive =
      tag === "BUTTON" ||
      tag === "INPUT" ||
      tag === "SELECT" ||
      tag === "TEXTAREA" ||
      tag === "A" ||
      (el && el.isContentEditable);
    if (isInteractive) {
      return;
    }
    event.preventDefault();
    generate();
  });

  // --- init ------------------------------------------------------------

  initNameIndex();

  const fromHash = paletteFromHash();
  if (fromHash) {
    swatches.forEach((s, i) => {
      s.hex = fromHash[i];
    });
    afterChange();
  } else {
    generate();
  }
})();
