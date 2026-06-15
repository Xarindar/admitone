const menuToggle = document.querySelector(".menu-toggle");
const navLinks = document.querySelector(".nav-links");
const navItems = document.querySelectorAll(".nav-links a");
const heroGradient = document.querySelector(".hero-gradient");
const heroGradientCanvas = document.querySelector(".hero-gradient-canvas");
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

function setupHeroGradient() {
  if (!heroGradient || !heroGradientCanvas) {
    return;
  }

  const context = heroGradientCanvas.getContext("2d");
  const pointer = { x: 0.62, y: 0.34 };
  const current = { x: pointer.x, y: pointer.y };
  let animationFrame = 0;
  let time = 0;

  function resizeCanvas() {
    const bounds = heroGradient.getBoundingClientRect();
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    heroGradientCanvas.width = Math.max(1, Math.round(bounds.width * scale));
    heroGradientCanvas.height = Math.max(1, Math.round(bounds.height * scale));
    context.setTransform(scale, 0, 0, scale, 0, 0);
    drawGradient();
  }

  function paintGlow(x, y, radius, colors) {
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    colors.forEach((stop) => gradient.addColorStop(stop[0], stop[1]));
    context.fillStyle = gradient;
    context.fillRect(0, 0, heroGradient.clientWidth, heroGradient.clientHeight);
  }

  function drawGradient() {
    const width = heroGradient.clientWidth;
    const height = heroGradient.clientHeight;
    const driftX = Math.sin(time * 0.018) * 0.14;
    const driftY = Math.cos(time * 0.015) * 0.12;

    context.clearRect(0, 0, width, height);
    context.globalCompositeOperation = "source-over";

    const base = context.createLinearGradient(0, 0, width, height);
    base.addColorStop(0, "#8f1d18");
    base.addColorStop(0.28, "#b8231a");
    base.addColorStop(0.58, "#c85f24");
    base.addColorStop(0.82, "#c8952a");
    base.addColorStop(1, "#7a2018");
    context.fillStyle = base;
    context.fillRect(0, 0, width, height);

    context.globalCompositeOperation = "screen";
    paintGlow(width * current.x, height * current.y, width * 0.66, [
      [0, "rgba(255, 223, 160, 0.68)"],
      [0.32, "rgba(200, 149, 42, 0.52)"],
      [1, "rgba(226, 166, 48, 0)"],
    ]);
    paintGlow(width * (0.16 + driftX), height * (0.24 + driftY), width * 0.48, [
      [0, "rgba(184, 35, 26, 0.82)"],
      [0.42, "rgba(230, 88, 42, 0.42)"],
      [1, "rgba(184, 35, 26, 0)"],
    ]);

    context.globalCompositeOperation = "multiply";
    paintGlow(width * (0.88 - driftX), height * (0.8 - driftY), width * 0.68, [
      [0, "rgba(55, 17, 12, 0.74)"],
      [1, "rgba(55, 17, 12, 0)"],
    ]);

    context.globalCompositeOperation = "overlay";
    const beam = context.createLinearGradient(width * current.x - 80, 0, width * current.x + 80, height);
    beam.addColorStop(0, "rgba(255, 255, 255, 0)");
    beam.addColorStop(0.48, "rgba(255, 246, 202, 0.26)");
    beam.addColorStop(1, "rgba(255, 255, 255, 0)");
    context.fillStyle = beam;
    context.fillRect(0, 0, width, height);
  }

  function animate() {
    current.x += (pointer.x - current.x) * 0.055;
    current.y += (pointer.y - current.y) * 0.055;
    time += 1;
    drawGradient();
    animationFrame = window.requestAnimationFrame(animate);
  }

  heroGradient.addEventListener("pointermove", (event) => {
    const bounds = heroGradient.getBoundingClientRect();
    pointer.x = (event.clientX - bounds.left) / bounds.width;
    pointer.y = (event.clientY - bounds.top) / bounds.height;
  });

  heroGradient.addEventListener("pointerleave", () => {
    pointer.x = 0.62;
    pointer.y = 0.34;
  });

  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  if (prefersReducedMotion.matches) {
    drawGradient();
    return;
  }

  animate();

  prefersReducedMotion.addEventListener("change", () => {
    window.cancelAnimationFrame(animationFrame);
    if (prefersReducedMotion.matches) {
      drawGradient();
    } else {
      animate();
    }
  });
}

setupHeroGradient();

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

  function updateReveal() {
    if (prefersReducedMotion.matches) {
      reveal.style.setProperty("--showtime-progress", "1");
      reveal.style.setProperty("--showtime-clip", "0%");
      reveal.style.setProperty("--showtime-copy-opacity", "0");
      reveal.style.setProperty("--showtime-form-opacity", "1");
      setFormAccess(true);
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
    setFormAccess(formOpacity > 0.96);
  }

  function scrollToForm(behavior) {
    const targetTop = reveal.offsetTop + reveal.offsetHeight - window.innerHeight;
    window.scrollTo({
      top: Math.max(0, targetTop),
      behavior,
    });
  }

  function finishReveal(event) {
    event.preventDefault();
    setMenu(false);
    window.history.pushState(null, "", "#contact");
    scrollToForm(prefersReducedMotion.matches ? "auto" : "smooth");
  }

  setFormAccess(false);
  startTriggers.forEach((trigger) => trigger.addEventListener("click", finishReveal));
  updateReveal();

  if (window.location.hash === "#contact") {
    window.requestAnimationFrame(() => {
      window.setTimeout(() => scrollToForm("auto"), 80);
    });
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
    const travel = Math.max(1, bounds.height - window.innerHeight * 0.44);
    const progress = Math.min(1, Math.max(0, (window.innerHeight * 0.78 - bounds.top) / travel));
    stage.style.setProperty("--pricing-path-offset", (1 - progress).toFixed(3));
  }

  const ticketObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          ticketObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.36 }
  );

  tickets.forEach((ticket) => ticketObserver.observe(ticket));
  setTicketProgress();
  window.addEventListener("scroll", setTicketProgress, { passive: true });
  window.addEventListener("resize", setTicketProgress);
  prefersReducedMotion.addEventListener("change", setTicketProgress);
}

setupPricingTickets();
