const menuToggle = document.querySelector(".menu-toggle");
const navLinks = document.querySelector(".nav-links");
const navItems = document.querySelectorAll(".nav-links a");
const siteHeader = document.querySelector(".site-header");
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

function updateHeaderScrollState() {
  siteHeader?.classList.toggle("is-scrolled", window.scrollY > 12);
}

updateHeaderScrollState();
window.addEventListener("scroll", updateHeaderScrollState, { passive: true });

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
    reveal.classList.remove("is-animating-form", "is-scroll-triggering-form");
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
    const curtainProgress = smoothStep(progress / 0.56);

    reveal.style.setProperty("--showtime-progress", curtainProgress.toFixed(3));
    reveal.style.setProperty("--showtime-clip", `${((1 - curtainProgress) * 100).toFixed(2)}%`);
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
      reveal.style.setProperty("--showtime-clip", "100%");
    } else {
      reveal.style.setProperty("--showtime-progress", "1");
      reveal.style.setProperty("--showtime-clip", "0%");
    }

    reveal.style.setProperty("--showtime-copy-opacity", "1");
    reveal.style.setProperty("--showtime-form-opacity", "0");

    window.requestAnimationFrame(() => {
      reveal.classList.add(source === "scroll" ? "is-scroll-triggering-form" : "is-animating-form");
      reveal.style.setProperty("--showtime-progress", "1");
      reveal.style.setProperty("--showtime-clip", "0%");
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

  window.addEventListener("scroll", updateReveal, { passive: true });
  window.addEventListener("resize", updateReveal);
  prefersReducedMotion.addEventListener("change", updateReveal);
}

setupShowtimeReveal();

function setupPricingTickets() {
  const stage = document.querySelector(".pricing-stage");
  const tickets = Array.from(document.querySelectorAll(".tier-ticket"));
  const route = stage?.querySelector(".pricing-route");
  const routePath = stage?.querySelector(".pricing-route-path");
  const bulbLayer = stage?.querySelector(".pricing-route-bulbs");

  if (!stage || !tickets.length || !route || !routePath || !bulbLayer) {
    return;
  }

  let bulbs = [];
  let ticketHits = [];
  let timeline = [];
  let routeLength = 1;
  let isRendering = false;
  let isRefreshing = false;

  function clamp(value, min = 0, max = 1) {
    return Math.min(max, Math.max(min, value));
  }

  function pointToSvg(x, y) {
    const matrix = route.getScreenCTM();

    if (!matrix) {
      return null;
    }

    const point = route.createSVGPoint();
    point.x = x;
    point.y = y;
    return point.matrixTransform(matrix.inverse());
  }

  function getTicketSvgRect(ticket) {
    const bounds = ticket.getBoundingClientRect();
    const points = [
      pointToSvg(bounds.left, bounds.top),
      pointToSvg(bounds.right, bounds.top),
      pointToSvg(bounds.right, bounds.bottom),
      pointToSvg(bounds.left, bounds.bottom),
    ].filter(Boolean);

    if (points.length !== 4) {
      return null;
    }

    return {
      left: Math.min(...points.map((point) => point.x)),
      right: Math.max(...points.map((point) => point.x)),
      top: Math.min(...points.map((point) => point.y)),
      bottom: Math.max(...points.map((point) => point.y)),
    };
  }

  function distanceToRect(point, rect) {
    const dx = Math.max(rect.left - point.x, 0, point.x - rect.right);
    const dy = Math.max(rect.top - point.y, 0, point.y - rect.bottom);
    return Math.hypot(dx, dy);
  }

  function findTicketHitDistance(ticket, minimumDistance) {
    const rect = getTicketSvgRect(ticket);

    if (!rect) {
      return minimumDistance;
    }

    const searchStart = clamp(minimumDistance, 0, routeLength);
    const samples = 360;
    const roughStep = Math.max(1, (routeLength - searchStart) / samples);
    let bestDistance = searchStart;
    let bestScore = Infinity;

    for (let index = 0; index <= samples; index += 1) {
      const distance = searchStart + (routeLength - searchStart) * (index / samples);
      const score = distanceToRect(routePath.getPointAtLength(distance), rect);

      if (score < bestScore) {
        bestDistance = distance;
        bestScore = score;
      }
    }

    for (let index = -14; index <= 14; index += 1) {
      const distance = clamp(bestDistance + roughStep * (index / 14), searchStart, routeLength);
      const score = distanceToRect(routePath.getPointAtLength(distance), rect);

      if (score < bestScore) {
        bestDistance = distance;
        bestScore = score;
      }
    }

    return bestDistance;
  }

  function buildBulbs() {
    const regularCount = Math.max(28, Math.ceil(routeLength / 32));
    const regularStep = routeLength / regularCount;
    const points = [];

    for (let index = 0; index <= regularCount; index += 1) {
      points.push({ distance: routeLength * (index / regularCount), isHit: false });
    }

    ticketHits.forEach((hit) => {
      points.push({ distance: hit.distance, isHit: true });
    });

    const mergedPoints = [];
    const mergeDistance = regularStep * 0.82;

    points
      .sort((a, b) => a.distance - b.distance)
      .forEach((point) => {
        const previous = mergedPoints[mergedPoints.length - 1];

        if (previous && Math.abs(previous.distance - point.distance) < mergeDistance) {
          if (point.isHit) {
            previous.distance = point.distance;
            previous.isHit = true;
          }

          return;
        }

        mergedPoints.push({ ...point });
      });

    bulbLayer.replaceChildren();
    bulbs = mergedPoints.map((point) => {
      const routePoint = routePath.getPointAtLength(point.distance);
      const bulb = document.createElementNS("http://www.w3.org/2000/svg", "circle");

      bulb.setAttribute("class", point.isHit ? "pricing-route-bulb is-ticket-hit" : "pricing-route-bulb");
      bulb.setAttribute("cx", routePoint.x.toFixed(2));
      bulb.setAttribute("cy", routePoint.y.toFixed(2));
      bulb.setAttribute("r", point.isHit ? "8.3" : "6.6");
      bulbLayer.appendChild(bulb);

      return {
        node: bulb,
        distance: point.distance,
      };
    });
  }

  function normalizeTimeline() {
    for (let index = 1; index < timeline.length; index += 1) {
      if (timeline[index].scroll <= timeline[index - 1].scroll) {
        timeline[index].scroll = timeline[index - 1].scroll + 1;
      }
    }
  }

  function refreshGeometry() {
    routeLength = routePath.getTotalLength();

    const ticketTriggerPoint = window.innerHeight * 0.58;
    let previousDistance = 0;
    ticketHits = tickets.map((ticket) => {
      const distance = findTicketHitDistance(ticket, previousDistance);
      const bounds = ticket.getBoundingClientRect();
      const scroll = window.scrollY + bounds.top - ticketTriggerPoint;

      previousDistance = Math.min(routeLength, distance + routeLength * 0.035);

      return {
        ticket,
        distance,
        scroll,
      };
    });

    const stageBounds = stage.getBoundingClientRect();
    const stageTop = window.scrollY + stageBounds.top;
    const stageBottom = window.scrollY + stageBounds.bottom;
    const firstHit = ticketHits[0];
    const lastHit = ticketHits[ticketHits.length - 1];
    const startsOnFirstTicket = firstHit.distance <= routeLength * 0.02;
    const startScroll = startsOnFirstTicket
      ? firstHit.scroll
      : Math.min(stageTop - window.innerHeight * 0.18, firstHit.scroll - window.innerHeight * 0.3);
    const endScroll = Math.max(stageBottom - window.innerHeight * 0.42, lastHit.scroll + window.innerHeight * 0.34);

    timeline = [
      { scroll: startScroll, distance: 0 },
      ...ticketHits.map((hit) => ({ scroll: hit.scroll, distance: hit.distance })),
      { scroll: endScroll, distance: routeLength },
    ];

    normalizeTimeline();
    buildBulbs();
  }

  function getCurrentRouteDistance() {
    const scrollY = window.scrollY;

    if (!timeline.length || scrollY < timeline[0].scroll) {
      return -1;
    }

    for (let index = 1; index < timeline.length; index += 1) {
      const previous = timeline[index - 1];
      const next = timeline[index];

      if (scrollY <= next.scroll) {
        const progress = clamp((scrollY - previous.scroll) / (next.scroll - previous.scroll));
        return previous.distance + (next.distance - previous.distance) * progress;
      }
    }

    return routeLength;
  }

  function renderPricingFlow() {
    if (prefersReducedMotion.matches) {
      tickets.forEach((ticket) => ticket.classList.add("is-visible"));
      bulbs.forEach((bulb) => bulb.node.classList.add("is-lit"));
      return;
    }

    const currentDistance = getCurrentRouteDistance();
    const hitTolerance = routeLength * 0.008;

    bulbs.forEach((bulb) => {
      bulb.node.classList.toggle("is-lit", currentDistance >= 0 && bulb.distance <= currentDistance + hitTolerance);
    });

    ticketHits.forEach((hit) => {
      const hasArrived = currentDistance >= 0
        && window.scrollY + 0.5 >= hit.scroll
        && currentDistance + hitTolerance >= hit.distance;
      const bounds = hit.ticket.getBoundingClientRect();
      const isNearViewport = bounds.top < window.innerHeight * 0.88 && bounds.bottom > window.innerHeight * 0.08;

      hit.ticket.classList.toggle("is-visible", hasArrived && isNearViewport);
    });
  }

  function requestRender() {
    if (isRendering) {
      return;
    }

    isRendering = true;
    window.requestAnimationFrame(() => {
      isRendering = false;
      renderPricingFlow();
    });
  }

  function requestRefresh() {
    if (isRefreshing) {
      return;
    }

    isRefreshing = true;
    window.requestAnimationFrame(() => {
      isRefreshing = false;
      refreshGeometry();
      renderPricingFlow();
    });
  }

  refreshGeometry();
  renderPricingFlow();
  window.addEventListener("load", requestRefresh, { once: true });
  window.addEventListener("scroll", requestRender, { passive: true });
  window.addEventListener("resize", requestRefresh);
  prefersReducedMotion.addEventListener("change", requestRefresh);
}

setupPricingTickets();
