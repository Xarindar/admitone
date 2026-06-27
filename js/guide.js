const guideRoot = document.querySelector("[data-guide-progress]");
const progressSteps = Array.from(document.querySelectorAll("[data-progress-step]"));
const progressBar = document.querySelector("[data-progress-bar]");
const progressCount = document.querySelector("[data-progress-count]");
const copyButtons = document.querySelectorAll("[data-copy-value]");
const guideToast = document.querySelector("[data-guide-toast]");
let guideToastTimer = null;
let mobileProgressCount = null;
let mobileProgressLights = [];

function createMobileProgressFooter() {
  if (!guideRoot || !progressSteps.length) {
    return;
  }

  const footer = document.createElement("div");
  footer.className = "guide-mobile-progress";
  footer.setAttribute("role", "region");
  footer.setAttribute("aria-label", "Guide progress");
  const stepLights = progressSteps
    .map((_, index) => `<span class="guide-mobile-progress-light" style="--light-index: ${index}"></span>`)
    .join("");

  footer.innerHTML = `
    <div class="guide-mobile-progress-copy">
      <span>Progress</span>
      <strong data-mobile-progress-count>0 of ${progressSteps.length} steps</strong>
    </div>
    <div class="guide-mobile-progress-lights" aria-hidden="true">${stepLights}</div>
  `;

  document.body.append(footer);
  document.body.classList.add("has-guide-mobile-progress");
  mobileProgressCount = footer.querySelector("[data-mobile-progress-count]");
  mobileProgressLights = Array.from(footer.querySelectorAll(".guide-mobile-progress-light"));
}

function showGuideToast(message) {
  if (!guideToast) {
    return;
  }

  guideToast.textContent = message;
  guideToast.classList.add("is-visible");
  window.clearTimeout(guideToastTimer);
  guideToastTimer = window.setTimeout(() => {
    guideToast.classList.remove("is-visible");
  }, 2200);
}

function updateGuideProgress() {
  if (!guideRoot || !progressSteps.length) {
    return;
  }

  const completed = progressSteps.filter((step) => step.checked).length;
  const total = progressSteps.length;
  const progress = Math.round((completed / total) * 100);

  guideRoot.style.setProperty("--guide-progress", `${progress}%`);
  progressBar?.setAttribute("aria-valuenow", String(progress));

  if (progressCount) {
    progressCount.textContent = `${completed} of ${total} steps`;
  }

  if (mobileProgressCount) {
    mobileProgressCount.textContent = `${completed} of ${total} steps`;
  }

  mobileProgressLights.forEach((light, index) => {
    light.classList.toggle("is-complete", index < completed);
  });
}

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

progressSteps.forEach((step) => {
  step.addEventListener("change", updateGuideProgress);
});

copyButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    const value = button.dataset.copyValue;

    if (!value) {
      return;
    }

    try {
      await copyText(value);
      showGuideToast(button.dataset.copyMessage || "Copied");
    } catch {
      showGuideToast("Copy failed");
    }
  });
});

createMobileProgressFooter();
updateGuideProgress();
