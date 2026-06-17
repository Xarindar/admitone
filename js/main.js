const menuToggle = document.querySelector(".menu-toggle");
const navLinks = document.querySelector(".nav-links");
const navItems = document.querySelectorAll(".nav-links a");
const siteHeader = document.querySelector(".site-header");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

// Run every scroll-driven handler once per frame through a single
// requestAnimationFrame gate, so the header, reveal, and pricing logic don't
// read and write layout repeatedly on each scroll event.
const scrollHandlers = new Set();
let scrollScheduled = false;

function runScrollHandlers() {
  scrollScheduled = false;
  scrollHandlers.forEach((handler) => handler());
}

function onScroll(handler) {
  scrollHandlers.add(handler);
}

window.addEventListener(
  "scroll",
  () => {
    if (scrollScheduled) {
      return;
    }
    scrollScheduled = true;
    window.requestAnimationFrame(runScrollHandlers);
  },
  { passive: true },
);

function setMenu(open) {
  document.body.classList.toggle("menu-open", open);
  navLinks?.classList.toggle("is-open", open);
  menuToggle?.setAttribute("aria-expanded", String(open));
  menuToggle?.setAttribute("aria-label", open ? "Close" : "Menu");
}

menuToggle?.addEventListener("click", () => {
  setMenu(!navLinks?.classList.contains("is-open"));
});

navItems.forEach((item) => {
  item.addEventListener("click", () => setMenu(false));
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setMenu(false);
  }
});

function updateHeaderScrollState() {
  siteHeader?.classList.toggle("is-scrolled", window.scrollY > 12);
}

updateHeaderScrollState();
onScroll(updateHeaderScrollState);

function setupShowtimeReveal() {
  const reveal = document.querySelector(".showtime-reveal");
  const formPanel = reveal?.querySelector(".showtime-form-panel");
  const startTriggers = document.querySelectorAll('a[href="#contact"]');

  if (!reveal) {
    return;
  }

  // When the curtains part on scroll, briefly pin the page so a fast scroll
  // doesn't blow straight past the freshly revealed contact form. The hold is
  // temporary — full scrolling returns after a few seconds.
  const SHOWTIME_LOCK_MS = 5000;
  const scrollKeys = new Set([
    " ", "Spacebar", "PageDown", "PageUp", "ArrowDown", "ArrowUp", "Home", "End",
  ]);
  let releaseScrollLock = null;

  function lockScrollForReveal() {
    if (releaseScrollLock) {
      return;
    }

    const lockedY = window.scrollY;
    const relock = () => window.scrollTo(0, lockedY);
    const blockEvent = (event) => event.preventDefault();
    const blockKeys = (event) => {
      if (scrollKeys.has(event.key)) {
        event.preventDefault();
      }
    };

    window.addEventListener("scroll", relock, { passive: true });
    window.addEventListener("wheel", blockEvent, { passive: false });
    window.addEventListener("touchmove", blockEvent, { passive: false });
    window.addEventListener("keydown", blockKeys);
    reveal.classList.add("is-scroll-locked");

    releaseScrollLock = () => {
      window.removeEventListener("scroll", relock);
      window.removeEventListener("wheel", blockEvent);
      window.removeEventListener("touchmove", blockEvent);
      window.removeEventListener("keydown", blockKeys);
      reveal.classList.remove("is-scroll-locked");
      releaseScrollLock = null;
    };

    window.setTimeout(() => releaseScrollLock && releaseScrollLock(), SHOWTIME_LOCK_MS);
  }

  function smoothStep(value) {
    const clamped = Math.min(1, Math.max(0, value));
    return clamped * clamped * (3 - 2 * clamped);
  }

  function setFormAccess(isReady) {
    reveal.classList.toggle("is-form-ready", isReady);
    formPanel?.toggleAttribute("inert", !isReady);
    formPanel?.setAttribute("aria-hidden", String(!isReady));
  }

  function holdRevealedForm() {
    delete reveal.dataset.formRevealing;
    reveal.classList.remove("is-animating-form", "is-scroll-triggering-form");
    reveal.dataset.formRevealed = "true";
    reveal.style.setProperty("--showtime-progress", "1");
    reveal.style.setProperty("--showtime-copy-opacity", "0");
    reveal.style.setProperty("--showtime-form-opacity", "1");
    setFormAccess(true);
  }

  function updateReveal() {
    if (reveal.dataset.formRevealing === "true") {
      return;
    }

    if (reveal.dataset.formRevealed === "true") {
      holdRevealedForm();
      return;
    }

    if (prefersReducedMotion.matches) {
      holdRevealedForm();
      return;
    }

    const bounds = reveal.getBoundingClientRect();
    const travel = Math.max(1, bounds.height - window.innerHeight);
    const progress = Math.min(1, Math.max(0, -bounds.top / travel));
    const curtainProgress = smoothStep(progress / 0.56);

    reveal.style.setProperty("--showtime-progress", curtainProgress.toFixed(3));
    reveal.style.setProperty("--showtime-copy-opacity", "1");
    reveal.style.setProperty("--showtime-form-opacity", "0");

    if (progress >= 0.64) {
      animateFormReveal({ source: "scroll", resetScroll: false });
      return;
    }

    setFormAccess(false);
  }

  function getFormTargetTop() {
    const revealTravel = Math.max(1, reveal.offsetHeight - window.innerHeight);
    return Math.max(0, reveal.offsetTop + revealTravel * 0.74);
  }

  function scrollToForm() {
    window.scrollTo({ top: getFormTargetTop(), behavior: "auto" });
  }

  function animateFormReveal({ source = "click", resetScroll = true } = {}) {
    reveal.dataset.formRevealing = "true";
    delete reveal.dataset.formRevealed;
    reveal.classList.remove("is-form-ready", "is-animating-form", "is-scroll-triggering-form");
    setFormAccess(false);

    if (resetScroll) {
      window.scrollTo({ top: reveal.offsetTop, behavior: "auto" });
      reveal.style.setProperty("--showtime-progress", "0");
    } else {
      reveal.style.setProperty("--showtime-progress", "1");
    }

    reveal.style.setProperty("--showtime-copy-opacity", "1");
    reveal.style.setProperty("--showtime-form-opacity", "0");

    if (source === "scroll") {
      lockScrollForReveal();
    }

    window.requestAnimationFrame(() => {
      reveal.classList.add(source === "scroll" ? "is-scroll-triggering-form" : "is-animating-form");
      reveal.style.setProperty("--showtime-progress", "1");
      reveal.style.setProperty("--showtime-copy-opacity", "0");
      reveal.style.setProperty("--showtime-form-opacity", "1");
      window.setTimeout(holdRevealedForm, source === "scroll" ? 1100 : 3100);
    });
  }

  function finishReveal(event) {
    event.preventDefault();
    setMenu(false);
    window.history.pushState(null, "", "#contact");
    animateFormReveal();
  }

  setFormAccess(false);
  startTriggers.forEach((trigger) => trigger.addEventListener("click", finishReveal));
  updateReveal();

  if (window.location.hash === "#contact") {
    const finishHashScroll = () => {
      scrollToForm();
      holdRevealedForm();
    };
    window.requestAnimationFrame(() => {
      window.setTimeout(finishHashScroll, 80);
    });
    window.addEventListener("load", () => window.setTimeout(finishHashScroll, 120), { once: true });
  }

  onScroll(updateReveal);
  window.addEventListener("resize", updateReveal);
  prefersReducedMotion.addEventListener("change", updateReveal);
}

setupShowtimeReveal();

function setupPricingTickets() {
  const tickets = Array.from(document.querySelectorAll(".tier-ticket"));

  if (!tickets.length) {
    return;
  }

  // Reveal each ticket as it scrolls into view; the per-ticket --reveal-delay
  // in CSS staggers a row that enters together.
  function revealAll() {
    tickets.forEach((ticket) => ticket.classList.add("is-visible"));
  }

  if (prefersReducedMotion.matches || !("IntersectionObserver" in window)) {
    revealAll();
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.2, rootMargin: "0px 0px -12% 0px" },
  );

  tickets.forEach((ticket) => observer.observe(ticket));
  prefersReducedMotion.addEventListener("change", (event) => {
    if (event.matches) {
      revealAll();
    }
  });
}

setupPricingTickets();
