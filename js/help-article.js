/* Help Center article behaviors: persisted step progress, scrollspy for the
   "On this page" nav, copy-to-clipboard boxes, and the feedback widget.
   Loads after help-center.js, which provides the progress storage helpers. */

const articleRoot = document.querySelector("[data-help-article]");
const articleId = articleRoot?.dataset.helpArticle || "";
const stepInputs = Array.from(document.querySelectorAll("[data-progress-step]"));
const progressBars = Array.from(document.querySelectorAll("[data-progress-bar]"));
const progressCounts = Array.from(document.querySelectorAll("[data-progress-count]"));
const resetButton = document.querySelector("[data-progress-reset]");
const helpToast = document.querySelector("[data-help-toast]");
let helpToastTimer = null;
let mobileProgressCount = null;
let mobileProgressLights = [];

/* ---- Toast -------------------------------------------------------------- */

function showHelpToast(message) {
  if (!helpToast) {
    return;
  }

  helpToast.textContent = message;
  helpToast.classList.add("is-visible");
  window.clearTimeout(helpToastTimer);
  helpToastTimer = window.setTimeout(() => {
    helpToast.classList.remove("is-visible");
  }, 2200);
}

/* ---- Step progress, persisted per guide --------------------------------- */

function createMobileProgressFooter() {
  if (!stepInputs.length) {
    return;
  }

  const footer = document.createElement("div");
  footer.className = "help-mobile-progress";
  footer.setAttribute("role", "region");
  footer.setAttribute("aria-label", "Guide progress");
  const stepLights = stepInputs
    .map(() => '<span class="help-mobile-progress-light"></span>')
    .join("");

  footer.innerHTML = `
    <div class="help-mobile-progress-copy">
      <span>Progress</span>
      <strong data-mobile-progress-count>0 of ${stepInputs.length} steps</strong>
    </div>
    <div class="help-mobile-progress-lights" aria-hidden="true">${stepLights}</div>
  `;

  document.body.append(footer);
  document.body.classList.add("has-help-mobile-progress");
  mobileProgressCount = footer.querySelector("[data-mobile-progress-count]");
  mobileProgressLights = Array.from(footer.querySelectorAll(".help-mobile-progress-light"));
}

function updateProgressUI() {
  if (!stepInputs.length) {
    return;
  }

  const completed = stepInputs.filter((input) => input.checked).length;
  const total = stepInputs.length;
  const percent = Math.round((completed / total) * 100);
  const countText = `${completed} of ${total} steps`;

  progressBars.forEach((bar) => {
    bar.style.setProperty("--help-progress", `${percent}%`);
    bar.setAttribute("aria-valuenow", String(percent));
  });

  progressCounts.forEach((count) => {
    count.textContent = countText;
  });

  if (mobileProgressCount) {
    mobileProgressCount.textContent = countText;
  }

  mobileProgressLights.forEach((light, index) => {
    light.classList.toggle("is-complete", index < completed);
  });

  stepInputs.forEach((input) => {
    const section = input.closest(".help-step");
    section?.classList.toggle("is-done", input.checked);

    const stepId = input.value;
    document
      .querySelectorAll(`[data-toc-step="${stepId}"]`)
      .forEach((link) => link.classList.toggle("is-done", input.checked));
  });

  if (resetButton) {
    resetButton.hidden = completed === 0;
  }
}

function saveProgress() {
  if (!articleId) {
    return;
  }

  const completedIds = stepInputs
    .filter((input) => input.checked)
    .map((input) => input.value);
  setGuideProgress(articleId, completedIds);
}

function restoreProgress() {
  if (!articleId) {
    return;
  }

  const completedIds = getGuideProgress(articleId);
  stepInputs.forEach((input) => {
    input.checked = completedIds.includes(input.value);
  });
}

stepInputs.forEach((input) => {
  input.addEventListener("change", () => {
    updateProgressUI();
    saveProgress();

    if (input.checked && stepInputs.every((step) => step.checked)) {
      showHelpToast("All steps complete. Nice work!");
    }
  });
});

resetButton?.addEventListener("click", () => {
  stepInputs.forEach((input) => {
    input.checked = false;
  });
  updateProgressUI();
  saveProgress();
  showHelpToast("Progress cleared");
});

/* ---- Scrollspy for the "On this page" nav -------------------------------- */

const tocLinks = Array.from(document.querySelectorAll("[data-toc] a[href^='#']"));
const spiedSections = tocLinks
  .map((link) => document.getElementById(link.hash.slice(1)))
  .filter(Boolean);

function setActiveTocLink(id) {
  tocLinks.forEach((link) => {
    const isActive = link.hash === `#${id}`;
    link.classList.toggle("is-active", isActive);
    if (isActive) {
      link.setAttribute("aria-current", "true");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

if (spiedSections.length && "IntersectionObserver" in window) {
  const visible = new Set();

  const spy = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          visible.add(entry.target.id);
        } else {
          visible.delete(entry.target.id);
        }
      });

      const current = spiedSections.find((section) => visible.has(section.id));
      if (current) {
        setActiveTocLink(current.id);
      }
    },
    { rootMargin: "-96px 0px -55% 0px" }
  );

  spiedSections.forEach((section) => spy.observe(section));
}

/* ---- Copy boxes ----------------------------------------------------------- */

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.append(textarea);
  textarea.select();

  try {
    document.execCommand("copy");
  } finally {
    textarea.remove();
  }
}

document.querySelectorAll("[data-copy-value]").forEach((button) => {
  button.addEventListener("click", async () => {
    const value = button.dataset.copyValue;

    if (!value) {
      return;
    }

    try {
      await copyText(value);
      showHelpToast(button.dataset.copyMessage || "Copied");
    } catch {
      showHelpToast("Copy failed");
    }
  });
});

/* ---- "Was this helpful?" -------------------------------------------------- */

const feedback = document.querySelector("[data-help-feedback]");

if (feedback && articleId) {
  const prompt = feedback.querySelector("[data-feedback-prompt]");
  const thanks = feedback.querySelector("[data-feedback-thanks]");
  const sorry = feedback.querySelector("[data-feedback-sorry]");

  function showFeedbackState(vote) {
    if (prompt) {
      prompt.hidden = true;
    }
    if (thanks) {
      thanks.hidden = vote !== "yes";
    }
    if (sorry) {
      sorry.hidden = vote !== "no";
    }
  }

  const savedVote = helpStorageGet(`feedback:${articleId}`);
  if (savedVote === "yes" || savedVote === "no") {
    showFeedbackState(savedVote);
  }

  feedback.querySelectorAll("[data-feedback-vote]").forEach((button) => {
    button.addEventListener("click", () => {
      const vote = button.dataset.feedbackVote;
      helpStorageSet(`feedback:${articleId}`, vote);
      showFeedbackState(vote);
    });
  });
}

/* On small screens the sidebar renders as an accordion; start it collapsed so
   the article is the first thing readers see. */
const sidebarBrowse = document.querySelector(".help-sidebar-browse");
if (sidebarBrowse && window.matchMedia("(max-width: 860px)").matches) {
  sidebarBrowse.open = false;
}

/* ---- Init ----------------------------------------------------------------- */

createMobileProgressFooter();
restoreProgress();
updateProgressUI();
