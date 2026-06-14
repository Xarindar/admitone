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

/* Scroll-reveal: a quiet fade-and-rise as each section enters frame.
   Items that share a parent stagger in sequence, like a marquee lighting up. */
function setupReveals() {
  const revealItems = document.querySelectorAll("[data-reveal]");
  if (!revealItems.length) {
    return;
  }

  if (prefersReducedMotion.matches || !("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("is-revealed"));
    return;
  }

  // Stagger each item against its [data-reveal] siblings under the same parent.
  const stepMs = 90;
  const maxSteps = 6;
  revealItems.forEach((item) => {
    const siblings = Array.from(item.parentElement?.children || []).filter((el) =>
      el.hasAttribute("data-reveal")
    );
    const index = Math.min(siblings.indexOf(item), maxSteps);
    if (index > 0) {
      item.style.setProperty("--reveal-delay", `${index * stepMs}ms`);
    }
  });

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-revealed");
          obs.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "0px 0px -12% 0px", threshold: 0.12 }
  );

  revealItems.forEach((item) => observer.observe(item));
}

/* Parallax depth: drift images at a fraction of scroll speed for a sense of
   layers. Uses the independent `translate` property so it never fights the
   grain's `transform` animation or the hover `scale`. */
function setupParallax() {
  const layers = Array.from(document.querySelectorAll("[data-parallax]"));
  if (!layers.length || prefersReducedMotion.matches) {
    return;
  }

  let ticking = false;

  function update() {
    const viewportH = window.innerHeight;
    layers.forEach((layer) => {
      const rect = layer.getBoundingClientRect();
      if (rect.bottom < -120 || rect.top > viewportH + 120) {
        return;
      }
      const speed = parseFloat(layer.dataset.parallaxSpeed || "0.06");
      const fromCenter = (rect.top + rect.height / 2 - viewportH / 2) / (viewportH / 2);
      const offset = -fromCenter * speed * 200;
      layer.style.translate = `0 ${offset.toFixed(1)}px`;
    });
    ticking = false;
  }

  function requestUpdate() {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(update);
    }
  }

  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate);
  update();
}

setupReveals();
setupParallax();
