const guideRoot = document.querySelector("[data-guide-progress]");
const progressSteps = Array.from(document.querySelectorAll("[data-progress-step]"));
const progressBar = document.querySelector("[data-progress-bar]");
const progressCount = document.querySelector("[data-progress-count]");
const copyButtons = document.querySelectorAll("[data-copy-value]");
const guideToast = document.querySelector("[data-guide-toast]");
let guideToastTimer = null;

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

updateGuideProgress();
