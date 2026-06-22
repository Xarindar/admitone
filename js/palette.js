/* Color Palette Studio.
 *
 * Builds a structured, site-ready brand palette around a primary color:
 * a tinted Background and Text (the "white" and "black"), the Primary brand
 * color, an Accent, and a Muted support tone. The primary can act as an anchor
 * while the other roles regenerate as fresh matching options.
 */
(function () {
  const row = document.getElementById("paletteRow");
  if (!row) {
    return;
  }

  const toast = document.getElementById("paletteToast");
  const generateBtn = document.getElementById("generateBtn");
  const brandColor = document.getElementById("brandColor");
  const copyAllBtn = document.getElementById("copyAllBtn");
  const shareBtn = document.getElementById("shareBtn");
  const copyMenu = document.getElementById("copyMenu");
  const copyMenuToggle = document.getElementById("copyMenuToggle");
  const copyMenuPanel = document.getElementById("copyMenuPanel");
  const copyLinkMobileBtn = document.getElementById("copyLinkMobileBtn");
  const copyPaletteMobileBtn = document.getElementById("copyPaletteMobileBtn");

  // --- color math ------------------------------------------------------

  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  const mod360 = (n) => ((n % 360) + 360) % 360;
  const rand = (min, max) => min + Math.random() * (max - min);
  const pick = (list) => list[Math.floor(Math.random() * list.length)];

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
    { key: "primary", label: "Primary" },
    { key: "accent", label: "Accent" },
    { key: "muted", label: "Muted" },
    { key: "text", label: "Text" },
    { key: "background", label: "Background" },
  ];

  let swatches = ROLES.map((r) => ({ key: r.key, label: r.label, hex: "#cccccc", locked: false }));
  const BALANCED_PROFILE = {
    primaryS: [54, 82],
    primaryL: [44, 56],
    fallbackS: [44, 64],
    accentOffsets: [-42, -30, -22, 24, 34, 46, 142, 168, -150],
    accentSFactor: [0.78, 1.12],
    accentS: [46, 88],
    accentL: [44, 62],
    mutedSFactor: [0.26, 0.48],
    mutedS: [16, 42],
    mutedL: [68, 82],
    backgroundSFactor: [0.1, 0.22],
    backgroundS: [5, 20],
    backgroundL: [95, 98],
    textSFactor: [0.22, 0.38],
    textS: [12, 34],
    textL: [10, 16],
    mix: [0.08, 0.3],
  };

  function inRange(range) {
    return rand(range[0], range[1]);
  }

  function scaledSaturation(base, factorRange, clampRange) {
    return clamp(base * inRange(factorRange), clampRange[0], clampRange[1]);
  }

  function mixHue(from, to, amount) {
    const delta = ((to - from + 540) % 360) - 180;
    return mod360(from + delta * amount);
  }

  function primaryBaseSaturation(primaryHsl, config) {
    if (primaryHsl.s < 8) {
      return inRange(config.fallbackS);
    }
    return clamp(primaryHsl.s, 28, 92);
  }

  function randomPrimaryHsl() {
    return {
      h: Math.random() * 360,
      s: inRange(BALANCED_PROFILE.primaryS),
      l: inRange(BALANCED_PROFILE.primaryL),
    };
  }

  // Build fresh supporting roles from the primary anchor. The relationships are
  // guided, but intentionally varied so Generate offers multiple viable options
  // instead of one "correct" color-theory answer.
  function deriveRoles(primaryHsl) {
    const h = primaryHsl.h;
    const baseS = primaryBaseSaturation(primaryHsl, BALANCED_PROFILE);
    const accentHue = mod360(h + pick(BALANCED_PROFILE.accentOffsets) + rand(-8, 8));
    const neutralHue = mixHue(h, accentHue, inRange(BALANCED_PROFILE.mix));
    const mutedHue =
      Math.random() < 0.72
        ? mixHue(h, accentHue, rand(0.08, 0.42))
        : mod360(h + pick([-1, 1]) * rand(12, 34));

    return {
      background: {
        h: mod360(neutralHue + rand(-5, 5)),
        s: scaledSaturation(baseS, BALANCED_PROFILE.backgroundSFactor, BALANCED_PROFILE.backgroundS),
        l: inRange(BALANCED_PROFILE.backgroundL),
      },
      text: {
        h: mod360(neutralHue + rand(-7, 7)),
        s: scaledSaturation(baseS, BALANCED_PROFILE.textSFactor, BALANCED_PROFILE.textS),
        l: inRange(BALANCED_PROFILE.textL),
      },
      accent: {
        h: accentHue,
        s: scaledSaturation(baseS, BALANCED_PROFILE.accentSFactor, BALANCED_PROFILE.accentS),
        l: inRange(BALANCED_PROFILE.accentL),
      },
      muted: {
        h: mod360(mutedHue + rand(-6, 6)),
        s: scaledSaturation(baseS, BALANCED_PROFILE.mutedSFactor, BALANCED_PROFILE.mutedS),
        l: inRange(BALANCED_PROFILE.mutedL),
      },
    };
  }

  function rederiveFromPrimary() {
    const primary = swatches.find((s) => s.key === "primary");
    const primaryHsl = hexToHsl(primary.hex);
    if (!primaryHsl) {
      return;
    }
    const derived = deriveRoles(primaryHsl);
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
      primaryHsl = randomPrimaryHsl();
      primary.hex = toHex(primaryHsl);
      primaryHsl = hexToHsl(primary.hex);
    }
    if (!primaryHsl) {
      return;
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

  // Seven visible steps for a swatch: three lighter, the current color, and
  // three darker. The endpoints scale toward near-white/near-black so very
  // light or dark colors still get usable neighboring options.
  function shadeStepsOf(hex) {
    const hsl = hexToHsl(hex);
    if (!hsl) {
      return [];
    }
    const lightTarget = 98;
    const darkTarget = 6;
    const lighter = [0.78, 0.52, 0.26].map((amount) => ({
      h: hsl.h,
      s: clamp(hsl.s, 0, 96),
      l: clamp(hsl.l + (lightTarget - hsl.l) * amount, 0, 100),
    }));
    const darker = [0.24, 0.48, 0.72].map((amount) => ({
      h: hsl.h,
      s: clamp(hsl.s, 0, 96),
      l: clamp(hsl.l - (hsl.l - darkTarget) * amount, 0, 100),
    }));
    return [...lighter, hsl, ...darker];
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
  const ICON_SHADES =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M5 3h14a2 2 0 0 1 2 2v2H3V5a2 2 0 0 1 2-2Zm-2 6h18v6H3V9Zm0 8h18v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2Z"/></svg>';

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

  let activeShadeIndex = -1;

  function toggleShadePanel(index) {
    activeShadeIndex = activeShadeIndex === index ? -1 : index;
    render();
  }

  function selectShade(index, hex) {
    const h = normalizeHex(hex);
    const sw = swatches[index];
    if (!h || !sw) {
      return;
    }
    sw.hex = h;
    sw.locked = true;
    activeShadeIndex = -1;
    if (sw.key === "primary") {
      rederiveFromPrimary();
    }
    afterChange();
  }

  function buildShadeStack(sw, index) {
    const stack = document.createElement("div");
    stack.className = "swatch-shade-stack";
    stack.setAttribute("aria-label", `${sw.label} shade options`);

    shadeStepsOf(sw.hex).forEach((hsl, stepIndex) => {
      const hex = toHex(hsl).toUpperCase();
      const button = document.createElement("button");
      button.type = "button";
      button.className = "shade-step" + (stepIndex === 3 ? " is-current" : "");
      button.style.setProperty("--shade", hex);
      button.style.setProperty("--shade-ink", readableInk(hex));
      const label = document.createElement("span");
      label.className = "shade-hex";
      label.textContent = hex;
      button.appendChild(label);
      button.title = `Use ${hex}`;
      button.setAttribute("aria-label", `Use ${hex} for ${sw.label}`);
      button.setAttribute("aria-pressed", String(stepIndex === 3));
      button.addEventListener("click", (e) => {
        e.stopPropagation();
        selectShade(index, hex);
      });
      stack.appendChild(button);
    });

    return stack;
  }

  function render() {
    row.textContent = "";

    swatches.forEach((sw, index) => {
      const upper = sw.hex.toUpperCase();
      const ink = readableInk(sw.hex);
      const showingShades = activeShadeIndex === index;

      const col = document.createElement("div");
      col.className =
        "swatch" + (sw.locked ? " is-locked" : "") + (showingShades ? " is-showing-shades" : "");
      col.style.setProperty("--swatch", sw.hex);
      col.style.setProperty("--ink", ink);
      col.dataset.role = sw.key;
      col.setAttribute("role", "group");
      col.setAttribute(
        "aria-label",
        `${sw.label}: ${upper}${sw.locked ? ", locked" : ""}`,
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

      const shadesBtn = makeButton(
        "swatch-btn swatch-shades",
        showingShades ? `Hide shade options for ${sw.label}` : `Show shade options for ${sw.label}`,
        showingShades ? "Hide shade options" : "Show shade options",
        ICON_SHADES,
      );
      shadesBtn.setAttribute("aria-expanded", String(showingShades));
      shadesBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleShadePanel(index);
      });

      const copyBtn = makeButton("swatch-btn swatch-copy", `Copy ${upper}`, "Copy hex", ICON_COPY);
      copyBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        copy(upper);
      });

      controls.append(lockBtn, shadesBtn, copyBtn);

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
      col.append(roleEl, controls);
      if (showingShades) {
        col.appendChild(buildShadeStack(sw, index));
      }
      col.appendChild(info);

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

  function setCopyMenu(open, focusToggle = false) {
    if (!copyMenuToggle || !copyMenuPanel) {
      return;
    }
    copyMenuToggle.setAttribute("aria-expanded", String(open));
    copyMenuPanel.hidden = !open;
    if (!open && focusToggle) {
      copyMenuToggle.focus();
    }
  }

  function isCopyMenuOpen() {
    return copyMenuToggle?.getAttribute("aria-expanded") === "true";
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
  brandColor?.addEventListener("input", () => setPrimary(brandColor.value));
  copyAllBtn?.addEventListener("click", () => copy(paletteText(), "Copied palette"));
  shareBtn?.addEventListener("click", () => copy(location.href, "Link copied"));
  copyMenuToggle?.addEventListener("click", (event) => {
    event.stopPropagation();
    setCopyMenu(!isCopyMenuOpen());
  });
  copyMenuPanel?.addEventListener("click", (event) => {
    event.stopPropagation();
  });
  copyLinkMobileBtn?.addEventListener("click", () => {
    setCopyMenu(false);
    copy(location.href, "Link copied");
  });
  copyPaletteMobileBtn?.addEventListener("click", () => {
    setCopyMenu(false);
    copy(paletteText(), "Copied palette");
  });
  document.addEventListener("click", (event) => {
    if (isCopyMenuOpen() && copyMenu && !copyMenu.contains(event.target)) {
      setCopyMenu(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      let handled = false;
      if (activeShadeIndex >= 0) {
        activeShadeIndex = -1;
        render();
        handled = true;
      }
      if (isCopyMenuOpen()) {
        setCopyMenu(false, true);
        handled = true;
      }
      if (handled) {
        return;
      }
    }
    if (event.code !== "Space" && event.key !== " ") {
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
