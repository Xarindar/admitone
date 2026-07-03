/* Help Center shared layer: the article index, client-side search, and
   per-guide progress storage used by both the hub page and article pages. */

const HELP_INDEX = {
  contactUrl: "index.html#contact",
  collections: [
    {
      id: "setup",
      label: "Setting things up",
      description: "Accounts, permissions, and launch prep that happen before design work can move.",
      articles: [
        {
          id: "github-setup",
          url: "github-setup-guide.html",
          title: "Set up GitHub and invite Admit One",
          summary: "Create a free GitHub account, start a private repository, and add us as a collaborator.",
          type: "guide",
          steps: 3,
          minutes: "15-20 min",
          keywords: [
            "github", "account", "repository", "repo", "private", "collaborator",
            "invite", "sign up", "username", "git",
          ],
        },
        {
          id: "railway-setup",
          url: "railway-setup-guide.html",
          title: "Deploy your project with Railway",
          summary: "Connect Railway to GitHub, deploy your repository, and invite us to the project.",
          type: "guide",
          steps: 4,
          minutes: "12 min",
          keywords: [
            "railway", "deploy", "deployment", "hosting", "host", "publish",
            "live", "connect github", "invite", "member",
          ],
        },
        {
          id: "domain-handoff",
          title: "Hand off your domain for launch",
          summary: "Share registrar access and DNS details so launch day has fewer surprises.",
          type: "soon",
          keywords: ["domain", "dns", "registrar", "launch", "godaddy", "namecheap"],
        },
      ],
    },
    {
      id: "brand-tools",
      label: "Brand tools",
      description: "Lightweight tools for brand decisions, launch assets, and common checks along the way.",
      articles: [
        {
          id: "palette-studio",
          url: "palette.html",
          title: "Build a brand palette in the Color Palette Studio",
          summary: "Pick one brand color and get a site-ready set of roles you can share with a link.",
          type: "tool",
          keywords: [
            "color", "colour", "palette", "brand", "primary", "accent", "shade",
            "hex", "swatch", "studio",
          ],
        },
        {
          id: "type-pairing",
          title: "Pick font pairings that hold up",
          summary: "A short, opinionated set of font pairings that work across a whole site.",
          type: "soon",
          keywords: ["font", "typography", "type", "pairing", "typeface"],
        },
        {
          id: "contrast-checker",
          title: "Check text contrast for readability",
          summary: "Drop in two colors and see whether text stays readable against its background.",
          type: "soon",
          keywords: ["contrast", "accessibility", "wcag", "readable", "a11y"],
        },
        {
          id: "logo-export",
          title: "Export logo files the right way",
          summary: "The file formats, sizes, and clear-space rules to hand a printer or developer.",
          type: "soon",
          keywords: ["logo", "export", "svg", "png", "print", "handoff", "checklist"],
        },
      ],
    },
  ],
};

const helpArticles = HELP_INDEX.collections.flatMap((collection) =>
  collection.articles.map((article) => ({ ...article, collection }))
);

/* ---- Progress storage -------------------------------------------------- */

const HELP_STORAGE_PREFIX = "admitone-help";

function helpStorageGet(key) {
  try {
    return window.localStorage.getItem(`${HELP_STORAGE_PREFIX}:${key}`);
  } catch {
    return null;
  }
}

function helpStorageSet(key, value) {
  try {
    if (value === null) {
      window.localStorage.removeItem(`${HELP_STORAGE_PREFIX}:${key}`);
    } else {
      window.localStorage.setItem(`${HELP_STORAGE_PREFIX}:${key}`, value);
    }
  } catch {
    /* Private browsing: progress just won't persist. */
  }
}

function getGuideProgress(articleId) {
  try {
    const raw = helpStorageGet(`progress:${articleId}`);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function setGuideProgress(articleId, completedStepIds) {
  helpStorageSet(
    `progress:${articleId}`,
    completedStepIds.length ? JSON.stringify(completedStepIds) : null
  );
}

/* ---- Search ------------------------------------------------------------ */

function searchHelpArticles(query) {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);

  if (!terms.length) {
    return [];
  }

  return helpArticles
    .map((article) => {
      const haystacks = [
        { text: article.title.toLowerCase(), weight: 3 },
        { text: article.keywords.join(" "), weight: 2 },
        { text: article.summary.toLowerCase(), weight: 1 },
        { text: article.collection.label.toLowerCase(), weight: 1 },
      ];

      let score = 0;
      const matched = terms.every((term) => {
        let termScore = 0;
        haystacks.forEach(({ text, weight }) => {
          if (text.includes(term)) {
            termScore += weight;
          }
        });
        score += termScore;
        return termScore > 0;
      });

      return matched ? { article, score } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .map((result) => result.article);
}

const HELP_TYPE_LABELS = {
  guide: "Guide",
  tool: "Tool",
  soon: "Coming soon",
};

function renderSearchResult(article, isActive) {
  const label = HELP_TYPE_LABELS[article.type] || "Article";
  const meta = [article.collection.label, label];

  if (article.type === "soon") {
    return `
      <li class="help-search-result is-soon${isActive ? " is-active" : ""}" role="option" aria-disabled="true">
        <span class="help-search-result-title">${article.title}</span>
        <span class="help-search-result-meta">${meta.join(" · ")}</span>
      </li>
    `;
  }

  return `
    <li role="presentation">
      <a
        class="help-search-result${isActive ? " is-active" : ""}"
        role="option"
        href="${article.url}"
        data-result-url="${article.url}"
      >
        <span class="help-search-result-title">${article.title}</span>
        <span class="help-search-result-meta">${meta.join(" · ")}</span>
      </a>
    </li>
  `;
}

function initHelpSearch(form) {
  const input = form.querySelector("[data-help-search-input]");
  const listbox = form.querySelector("[data-help-search-results]");

  if (!input || !listbox) {
    return;
  }

  let results = [];
  let activeIndex = -1;

  function render() {
    if (!input.value.trim()) {
      listbox.hidden = true;
      listbox.innerHTML = "";
      form.classList.remove("is-open");
      return;
    }

    if (!results.length) {
      listbox.innerHTML = `
        <li class="help-search-empty" role="option" aria-disabled="true">
          No matches for &ldquo;${input.value.trim().replace(/[<>&]/g, "")}&rdquo;.
          <a href="${HELP_INDEX.contactUrl}">Ask us directly</a> and we&rsquo;ll point you the right way.
        </li>
      `;
    } else {
      listbox.innerHTML = results
        .map((article, index) => renderSearchResult(article, index === activeIndex))
        .join("");
    }

    listbox.hidden = false;
    form.classList.add("is-open");
  }

  function update() {
    results = searchHelpArticles(input.value);
    activeIndex = -1;
    render();
  }

  function close() {
    listbox.hidden = true;
    form.classList.remove("is-open");
    activeIndex = -1;
  }

  input.addEventListener("input", update);
  input.addEventListener("focus", () => {
    if (input.value.trim()) {
      update();
    }
  });

  input.addEventListener("keydown", (event) => {
    const openable = results.filter((article) => article.type !== "soon");

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (!results.length) {
        return;
      }
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      activeIndex = (activeIndex + direction + results.length) % results.length;
      render();
    } else if (event.key === "Enter") {
      event.preventDefault();
      const target = results[activeIndex] || openable[0];
      if (target && target.url) {
        window.location.href = target.url;
      }
    } else if (event.key === "Escape") {
      close();
    }
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
  });

  document.addEventListener("click", (event) => {
    if (!form.contains(event.target)) {
      close();
    }
  });
}

document.querySelectorAll("[data-help-search]").forEach(initHelpSearch);

/* ---- Hub page: live progress badges on article rows -------------------- */

document.querySelectorAll("[data-progress-badge]").forEach((badge) => {
  const articleId = badge.dataset.progressBadge;
  const total = Number(badge.dataset.progressTotal || 0);
  const done = getGuideProgress(articleId).length;

  if (!total || !done) {
    return;
  }

  if (done >= total) {
    badge.textContent = "Completed";
    badge.classList.add("is-complete");
  } else {
    badge.textContent = `In progress · ${done} of ${total} done`;
    badge.classList.add("is-started");
  }

  badge.hidden = false;
});
