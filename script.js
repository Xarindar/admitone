const menuToggle = document.querySelector(".menu-toggle");
const navLinks = document.querySelector(".nav-links");
const navItems = document.querySelectorAll(".nav-links a");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function setMenu(open) {
  document.body.classList.toggle("menu-open", open);
  navLinks?.classList.toggle("is-open", open);
  menuToggle?.setAttribute("aria-expanded", String(open));
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

function setupShowtimeReveal() {
  const reveal = document.querySelector(".showtime-reveal");
  const formPanel = reveal?.querySelector(".showtime-form-panel");
  const startTriggers = document.querySelectorAll('a[href="#contact"]');

  if (!reveal) {
    return;
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
    reveal.classList.remove("is-animating-form");
    reveal.dataset.formRevealed = "true";
    reveal.style.setProperty("--showtime-progress", "1");
    reveal.style.setProperty("--showtime-clip", "0%");
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
    const wipeProgress = smoothStep(progress / 0.64);
    const copyOpacity = 1 - smoothStep((progress - 0.64) / 0.07);
    const formOpacity = smoothStep((progress - 0.68) / 0.05);

    reveal.style.setProperty("--showtime-progress", progress.toFixed(3));
    reveal.style.setProperty("--showtime-clip", `${((1 - wipeProgress) * 100).toFixed(2)}%`);
    reveal.style.setProperty("--showtime-copy-opacity", copyOpacity.toFixed(3));
    reveal.style.setProperty("--showtime-form-opacity", formOpacity.toFixed(3));

    if (formOpacity > 0.96) {
      holdRevealedForm();
    } else {
      setFormAccess(false);
    }
  }

  function getFormTargetTop() {
    const revealTravel = Math.max(1, reveal.offsetHeight - window.innerHeight);
    return Math.max(0, reveal.offsetTop + revealTravel * 0.74);
  }

  function scrollToForm() {
    window.scrollTo({ top: getFormTargetTop(), behavior: "auto" });
  }

  function animateFormReveal() {
    reveal.dataset.formRevealing = "true";
    delete reveal.dataset.formRevealed;
    reveal.classList.remove("is-form-ready", "is-animating-form");
    setFormAccess(false);
    window.scrollTo({ top: reveal.offsetTop, behavior: "auto" });
    reveal.style.setProperty("--showtime-progress", "0");
    reveal.style.setProperty("--showtime-clip", "100%");
    reveal.style.setProperty("--showtime-copy-opacity", "1");
    reveal.style.setProperty("--showtime-form-opacity", "0");

    window.requestAnimationFrame(() => {
      reveal.classList.add("is-animating-form");
      reveal.style.setProperty("--showtime-progress", "1");
      reveal.style.setProperty("--showtime-clip", "0%");
      reveal.style.setProperty("--showtime-copy-opacity", "0");
      reveal.style.setProperty("--showtime-form-opacity", "1");
      window.setTimeout(holdRevealedForm, 3100);
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

  window.addEventListener("scroll", updateReveal, { passive: true });
  window.addEventListener("resize", updateReveal);
  prefersReducedMotion.addEventListener("change", updateReveal);
}

setupShowtimeReveal();

function setupPricingTickets() {
  const stage = document.querySelector(".pricing-stage");
  const tickets = document.querySelectorAll(".tier-ticket");

  if (!stage || !tickets.length) {
    return;
  }

  function setTicketProgress() {
    if (prefersReducedMotion.matches) {
      stage.style.setProperty("--pricing-path-offset", "0");
      tickets.forEach((ticket) => ticket.classList.add("is-visible"));
      return;
    }

    const bounds = stage.getBoundingClientRect();
    const travel = Math.max(1, bounds.height + window.innerHeight * 0.36);
    const progress = Math.min(1, Math.max(0, (window.innerHeight * 0.62 - bounds.top) / travel));
    stage.style.setProperty("--pricing-path-offset", (1 - progress).toFixed(3));
  }

  function setTicketVisibility() {
    if (prefersReducedMotion.matches) {
      tickets.forEach((ticket) => ticket.classList.add("is-visible"));
      return;
    }

    tickets.forEach((ticket) => {
      const bounds = ticket.getBoundingClientRect();
      const isVisible = bounds.top < window.innerHeight * 0.72 && bounds.bottom > window.innerHeight * 0.18;
      ticket.classList.toggle("is-visible", isVisible);
    });
  }

  setTicketProgress();
  setTicketVisibility();
  window.addEventListener("scroll", setTicketProgress, { passive: true });
  window.addEventListener("scroll", setTicketVisibility, { passive: true });
  window.addEventListener("resize", setTicketProgress);
  window.addEventListener("resize", setTicketVisibility);
  prefersReducedMotion.addEventListener("change", setTicketProgress);
  prefersReducedMotion.addEventListener("change", setTicketVisibility);
}

setupPricingTickets();
