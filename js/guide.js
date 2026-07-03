/* Guide pages: step progress that survives a closed tab, a scroll-spy table
   of contents, copy-to-clipboard boxes, and the end-of-guide feedback row.
   The help center hub reads the same storage to show "2 of 3 done". */

(function () {
  "use strict";

  var guideRoot = document.querySelector("[data-guide-progress]");
  var guideKey = guideRoot ? guideRoot.getAttribute("data-guide-key") : null;
  var storageKey = guideKey ? "admit-one-guide:" + guideKey : null;
  var progressSteps = Array.from(document.querySelectorAll("[data-progress-step]"));
  var progressBar = document.querySelector("[data-progress-bar]");
  var progressCount = document.querySelector("[data-progress-count]");
  var guideToast = document.querySelector("[data-guide-toast]");
  var guideToastTimer = null;
  var mobileProgressCount = null;
  var mobileProgressBar = null;

  function stepId(step) {
    var section = step.closest("section[id]");
    return section ? section.id : null;
  }

  /* ---------- Saved progress ---------- */

  function readSavedSteps() {
    if (!storageKey) {
      return {};
    }

    try {
      var saved = JSON.parse(window.localStorage.getItem(storageKey));
      return saved && saved.steps ? saved.steps : {};
    } catch (error) {
      return {};
    }
  }

  function saveSteps() {
    if (!storageKey) {
      return;
    }

    var steps = {};
    progressSteps.forEach(function (step) {
      var id = stepId(step);
      if (id && step.checked) {
        steps[id] = true;
      }
    });

    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ steps: steps }));
    } catch (error) {
      /* Private browsing or blocked storage: the checkboxes still work,
         they just won't survive the tab. */
    }
  }

  function restoreSteps() {
    var saved = readSavedSteps();
    progressSteps.forEach(function (step) {
      var id = stepId(step);
      if (id && saved[id]) {
        step.checked = true;
      }
    });
  }

  /* ---------- Progress display ---------- */

  function createMobileProgressFooter() {
    if (!guideRoot || !progressSteps.length) {
      return;
    }

    var footer = document.createElement("div");
    footer.className = "guide-mobile-progress";
    footer.setAttribute("role", "region");
    footer.setAttribute("aria-label", "Guide progress");

    footer.innerHTML =
      '<div class="guide-mobile-progress-copy">' +
      "<span>Your progress</span>" +
      '<strong data-mobile-progress-count>0 of ' + progressSteps.length + " steps</strong>" +
      "</div>" +
      '<div class="guide-mobile-progress-track" aria-hidden="true"><span></span></div>';

    document.body.append(footer);
    document.body.classList.add("has-guide-mobile-progress");
    mobileProgressCount = footer.querySelector("[data-mobile-progress-count]");
    mobileProgressBar = footer.querySelector(".guide-mobile-progress-track span");
  }

  function updateGuideProgress() {
    if (!guideRoot || !progressSteps.length) {
      return;
    }

    var completed = progressSteps.filter(function (step) {
      return step.checked;
    }).length;
    var total = progressSteps.length;
    var progress = Math.round((completed / total) * 100);
    var countText = completed + " of " + total + " steps";

    guideRoot.style.setProperty("--guide-progress", progress + "%");

    if (progressBar) {
      progressBar.setAttribute("aria-valuenow", String(progress));
    }

    if (progressCount) {
      progressCount.textContent = countText;
    }

    if (mobileProgressCount) {
      mobileProgressCount.textContent = countText;
    }

    if (mobileProgressBar) {
      mobileProgressBar.style.width = progress + "%";
    }
  }

  /* ---------- Scroll-spy table of contents ---------- */

  function setupScrollSpy() {
    var toc = document.querySelector("[data-guide-toc]");
    if (!toc || !("IntersectionObserver" in window)) {
      return;
    }

    var links = {};
    toc.querySelectorAll('a[href^="#"]').forEach(function (link) {
      links[link.getAttribute("href").slice(1)] = link;
    });

    var sections = Object.keys(links)
      .map(function (id) {
        return document.getElementById(id);
      })
      .filter(Boolean);

    function setCurrent(id) {
      Object.keys(links).forEach(function (key) {
        links[key].classList.toggle("is-current", key === id);
      });
    }

    /* Track which sections overlap the reading band near the top of the
       viewport and highlight the last one that started. */
    var visible = new Set();

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            visible.add(entry.target.id);
          } else {
            visible.delete(entry.target.id);
          }
        });

        for (var i = sections.length - 1; i >= 0; i -= 1) {
          if (visible.has(sections[i].id)) {
            setCurrent(sections[i].id);
            return;
          }
        }
      },
      { rootMargin: "-20% 0px -65% 0px" },
    );

    sections.forEach(function (section) {
      observer.observe(section);
    });
  }

  /* ---------- Feedback ---------- */

  function setupFeedback() {
    var feedback = document.querySelector("[data-guide-feedback]");
    if (!feedback) {
      return;
    }

    var yesButton = feedback.querySelector("[data-feedback-yes]");
    var noButton = feedback.querySelector("[data-feedback-no]");
    var yesNote = feedback.querySelector("[data-feedback-yes-note]");
    var noNote = feedback.querySelector("[data-feedback-no-note]");

    function answer(note) {
      feedback.classList.add("has-answer");
      if (note) {
        note.hidden = false;
      }
    }

    if (yesButton) {
      yesButton.addEventListener("click", function () {
        answer(yesNote);
      });
    }

    if (noButton) {
      noButton.addEventListener("click", function () {
        answer(noNote);
      });
    }
  }

  /* ---------- Toast + copy boxes ---------- */

  function showGuideToast(message) {
    if (!guideToast) {
      return;
    }

    guideToast.textContent = message;
    guideToast.classList.add("is-visible");
    window.clearTimeout(guideToastTimer);
    guideToastTimer = window.setTimeout(function () {
      guideToast.classList.remove("is-visible");
    }, 2200);
  }

  function copyText(value) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(value);
    }

    var textarea = document.createElement("textarea");
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

    return Promise.resolve();
  }

  document.querySelectorAll("[data-copy-value]").forEach(function (button) {
    button.addEventListener("click", function () {
      var value = button.dataset.copyValue;

      if (!value) {
        return;
      }

      copyText(value)
        .then(function () {
          showGuideToast(button.dataset.copyMessage || "Copied");
        })
        .catch(function () {
          showGuideToast("Copy failed");
        });
    });
  });

  /* ---------- Wire up ---------- */

  progressSteps.forEach(function (step) {
    step.addEventListener("change", function () {
      saveSteps();
      updateGuideProgress();
    });
  });

  createMobileProgressFooter();
  restoreSteps();
  updateGuideProgress();
  setupScrollSpy();
  setupFeedback();
})();
