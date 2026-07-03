/* Help center hub: client-side search over a hand-kept index, per-guide
   progress read back from the same storage the guides write, and deep links
   that open the right quick answer. */

(function () {
  "use strict";

  /* ---------- Search index ---------- */
  /* Kept by hand: one entry per destination someone might actually want.
     Keywords cover the words clients use, not the words we use. */
  var HELP_INDEX = [
    {
      group: "Guides",
      title: "Set up GitHub",
      hint: "Account, private repository, and inviting Admit One",
      url: "github-setup-guide.html",
      keywords: "github account signup repo repository private start begin guide one first",
    },
    {
      group: "Guides",
      title: "Set up Railway",
      hint: "Connect GitHub, deploy, and invite Admit One",
      url: "railway-setup-guide.html",
      keywords: "railway hosting host deploy publish live server guide two second",
    },
    {
      group: "Guides",
      title: "Hand off your domain",
      hint: "Find your registrar and pick how we connect it — optional",
      url: "domain-handoff-guide.html",
      keywords: "domain dns registrar url address website launch optional guide three third",
    },
    {
      group: "Guide steps",
      title: "Create your GitHub account",
      hint: "Step 1 of the GitHub guide",
      url: "github-setup-guide.html#create-account",
      keywords: "github sign up signup register email password username verification",
    },
    {
      group: "Guide steps",
      title: "Create a repository",
      hint: "Step 2 of the GitHub guide",
      url: "github-setup-guide.html#create-repository",
      keywords: "repo repository new private readme project folder files name",
    },
    {
      group: "Guide steps",
      title: "Invite Admit One on GitHub",
      hint: "Step 3 of the GitHub guide",
      url: "github-setup-guide.html#add-collaborator",
      keywords: "collaborator invite add people access settings share username email",
    },
    {
      group: "Guide steps",
      title: "Create your Railway account",
      hint: "Step 1 of the Railway guide",
      url: "railway-setup-guide.html#create-account",
      keywords: "railway sign in signup continue with github authorize account",
    },
    {
      group: "Guide steps",
      title: "Connect GitHub to Railway",
      hint: "Step 2 of the Railway guide",
      url: "railway-setup-guide.html#connect-github",
      keywords: "connect install allow permissions verify code all repositories",
    },
    {
      group: "Guide steps",
      title: "Deploy your project",
      hint: "Step 3 of the Railway guide",
      url: "railway-setup-guide.html#deploy-project",
      keywords: "deploy publish launch live github repository railway website online",
    },
    {
      group: "Guide steps",
      title: "Invite Admit One on Railway",
      hint: "Step 4 of the Railway guide",
      url: "railway-setup-guide.html#add-collaborator",
      keywords: "invite member members email settings collaborator can edit access",
    },
    {
      group: "Guide steps",
      title: "Find out where your domain lives",
      hint: "Step 1 of the domain guide",
      url: "domain-handoff-guide.html#find-registrar",
      keywords: "registrar who manages domain whois icann lookup godaddy namecheap squarespace",
    },
    {
      group: "Guide steps",
      title: "Give the domain account a health check",
      hint: "Step 2 of the domain guide",
      url: "domain-handoff-guide.html#health-check",
      keywords: "expire expiration renew auto-renew login dns settings account email",
    },
    {
      group: "Guide steps",
      title: "Send us your domain details",
      hint: "Step 3 of the domain guide",
      url: "domain-handoff-guide.html#send-details",
      keywords: "checklist email details template send domain information",
    },
    {
      group: "Guide steps",
      title: "Choose how the DNS changes get made",
      hint: "Step 4 of the domain guide",
      url: "domain-handoff-guide.html#choose-route",
      keywords: "dns records paste delegate access share access screen share call cname txt",
    },
    {
      group: "Quick answers",
      title: "Does any of this cost money?",
      hint: "What's free, what isn't, and when we flag it",
      url: "#faq-cost",
      keywords: "cost price pay paid free billing charge plan money hosting fees",
    },
    {
      group: "Quick answers",
      title: "Why do I create the accounts myself?",
      hint: "Ownership stays with you",
      url: "#faq-access",
      keywords: "own ownership account access control why setup myself",
    },
    {
      group: "Quick answers",
      title: "Do the guides have to happen in order?",
      hint: "GitHub first, Railway second",
      url: "#faq-order",
      keywords: "order sequence first second skip which guide start",
    },
    {
      group: "Quick answers",
      title: "What if I get stuck halfway?",
      hint: "Progress saves; a human answers email",
      url: "#faq-stuck",
      keywords: "stuck help lost confused error problem broken resume saved progress",
    },
    {
      group: "Quick answers",
      title: "Is adding a collaborator safe?",
      hint: "You stay the owner; access is revocable",
      url: "#faq-safe",
      keywords: "safe security trust remove revoke permissions owner collaborator",
    },
    {
      group: "Quick answers",
      title: "I already own a domain",
      hint: "Keep it renewed, then follow the handoff guide",
      url: "#faq-domain",
      keywords: "domain dns registrar godaddy namecheap url website address transfer",
    },
    {
      group: "Free tools",
      title: "Color Palette Studio",
      hint: "Build a five-role brand palette from one color",
      url: "palette.html",
      keywords: "color colour palette brand primary accent shades generator studio tool",
    },
  ];

  /* ---------- Guide progress, read from the guides' own storage ---------- */

  function readGuideProgress(slug) {
    try {
      var raw = window.localStorage.getItem("admit-one-guide:" + slug);
      if (!raw) {
        return 0;
      }
      var saved = JSON.parse(raw);
      var steps = saved && saved.steps ? saved.steps : {};
      return Object.keys(steps).filter(function (key) {
        return steps[key] === true;
      }).length;
    } catch (error) {
      return 0;
    }
  }

  function showGuideProgress() {
    var rows = document.querySelectorAll("[data-guide-slug]");

    rows.forEach(function (row) {
      var total = parseInt(row.getAttribute("data-guide-steps"), 10) || 0;
      var done = Math.min(readGuideProgress(row.getAttribute("data-guide-slug")), total);
      var note = row.querySelector("[data-guide-progress-note]");
      var action = row.querySelector("[data-guide-action]");

      if (!note || !done) {
        return;
      }

      note.hidden = false;

      if (done >= total) {
        note.textContent = "Done";
        note.classList.add("is-done");
        if (action) {
          action.textContent = "Revisit";
        }
      } else {
        note.textContent = done + " of " + total + " done";
        if (action) {
          action.textContent = "Resume";
        }
      }
    });
  }

  /* ---------- Quick answer deep links ---------- */

  function openTargetAnswer() {
    var hash = window.location.hash;
    if (!hash) {
      return;
    }

    var target = document.querySelector(hash + ".help-faq-item");
    if (target) {
      target.open = true;
    }
  }

  /* ---------- Search ---------- */

  var form = document.querySelector("[data-help-search]");
  var input = document.querySelector("[data-help-search-input]");
  var panel = document.querySelector("[data-help-search-results]");
  var activeIndex = -1;

  function tokenize(query) {
    return query.toLowerCase().split(/\s+/).filter(Boolean);
  }

  function scoreEntry(entry, tokens) {
    var title = entry.title.toLowerCase();
    var haystack = (entry.title + " " + entry.hint + " " + entry.keywords).toLowerCase();
    var score = 0;

    for (var i = 0; i < tokens.length; i += 1) {
      var token = tokens[i];

      if (haystack.indexOf(token) === -1) {
        return 0; /* every word has to land somewhere */
      }

      if (title.indexOf(token) === 0) {
        score += 6;
      } else if (title.indexOf(token) !== -1) {
        score += 4;
      } else {
        score += 1;
      }
    }

    return score;
  }

  function findMatches(query) {
    var tokens = tokenize(query);
    if (!tokens.length) {
      return [];
    }

    return HELP_INDEX.map(function (entry) {
      return { entry: entry, score: scoreEntry(entry, tokens) };
    })
      .filter(function (match) {
        return match.score > 0;
      })
      .sort(function (a, b) {
        return b.score - a.score;
      })
      .slice(0, 8)
      .map(function (match) {
        return match.entry;
      });
  }

  function closeResults() {
    if (!panel) {
      return;
    }
    panel.hidden = true;
    panel.innerHTML = "";
    input.setAttribute("aria-expanded", "false");
    form.classList.remove("is-searching");
    activeIndex = -1;
  }

  function renderResults(matches, query) {
    panel.innerHTML = "";
    activeIndex = -1;

    if (!matches.length) {
      var empty = document.createElement("p");
      empty.className = "help-search-empty";
      empty.innerHTML =
        "Nothing in the guides matches that. " +
        '<a href="mailto:hello@admitone.studio?subject=' +
        encodeURIComponent("Help center question: " + query) +
        '">Ask us directly</a> and we’ll answer.';
      panel.appendChild(empty);
    } else {
      var lastGroup = null;

      matches.forEach(function (entry) {
        if (entry.group !== lastGroup) {
          var label = document.createElement("p");
          label.className = "help-search-group";
          label.textContent = entry.group;
          panel.appendChild(label);
          lastGroup = entry.group;
        }

        var link = document.createElement("a");
        link.className = "help-search-result";
        link.href = entry.url;
        link.innerHTML = "<strong></strong><span></span>";
        link.querySelector("strong").textContent = entry.title;
        link.querySelector("span").textContent = entry.hint;
        link.addEventListener("click", closeResults);
        panel.appendChild(link);
      });
    }

    panel.hidden = false;
    input.setAttribute("aria-expanded", "true");
    form.classList.add("is-searching");
  }

  function moveActive(delta) {
    var results = panel.querySelectorAll(".help-search-result");
    if (!results.length) {
      return;
    }

    activeIndex = (activeIndex + delta + results.length) % results.length;

    results.forEach(function (result, index) {
      result.classList.toggle("is-active", index === activeIndex);
    });

    results[activeIndex].scrollIntoView({ block: "nearest" });
  }

  function setupSearch() {
    if (!form || !input || !panel) {
      return;
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
    });

    input.addEventListener("input", function () {
      var query = input.value.trim();

      if (query.length < 2) {
        closeResults();
        return;
      }

      renderResults(findMatches(query), query);
    });

    input.addEventListener("keydown", function (event) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        moveActive(event.key === "ArrowDown" ? 1 : -1);
      } else if (event.key === "Enter") {
        var active = panel.querySelector(".help-search-result.is-active");
        if (active) {
          event.preventDefault();
          active.click();
          window.location.href = active.href;
        }
      } else if (event.key === "Escape") {
        closeResults();
        input.blur();
      }
    });

    document.addEventListener("click", function (event) {
      if (!form.contains(event.target)) {
        closeResults();
      }
    });

    /* "/" from anywhere on the page jumps to search, like every good docs site. */
    document.addEventListener("keydown", function (event) {
      var typing =
        /input|textarea|select/i.test(document.activeElement.tagName) ||
        document.activeElement.isContentEditable;

      if (event.key === "/" && !typing) {
        event.preventDefault();
        input.focus();
      }
    });
  }

  setupSearch();
  showGuideProgress();
  openTargetAnswer();
  window.addEventListener("hashchange", openTargetAnswer);
})();
