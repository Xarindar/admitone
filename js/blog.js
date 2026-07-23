(() => {
  const config = window.ADMIT_ONE_BLOG_CONFIG || {};
  const apiBaseUrl = String(config.apiBaseUrl || "").replace(/\/+$/, "");
  const publishableKey = String(config.publishableKey || "").trim();
  const homeGrid = document.querySelector("[data-blog-grid]");
  const library = document.querySelector("[data-blog-library]");
  const libraryGrid = document.querySelector("[data-blog-library-grid]");
  const story = document.querySelector("[data-blog-post]");
  const requestedSlug = new URLSearchParams(window.location.search).get("slug");

  function formattedDate(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(date);
  }

  async function requestBlog(path = "") {
    if (!apiBaseUrl || !publishableKey) {
      throw new Error("The blog connection is not configured.");
    }

    const response = await fetch(`${apiBaseUrl}${path}`, {
      headers: { "X-Showrunner-Key": publishableKey }
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || "The blog could not be loaded.");
    }
    return payload.data || {};
  }

  function makeImage(source, title) {
    if (!source) {
      const placeholder = document.createElement("span");
      placeholder.className = "note-image-placeholder";
      placeholder.setAttribute("aria-hidden", "true");
      return placeholder;
    }

    const image = document.createElement("img");
    image.alt = "";
    image.decoding = "async";
    image.loading = "lazy";
    image.src = source;
    image.title = title;
    return image;
  }

  function makePostCard(post, options = {}) {
    const article = document.createElement("article");
    article.className = "note-card";

    const link = document.createElement("a");
    link.className = "note-link";
    link.href = `blog.html?slug=${encodeURIComponent(post.slug)}`;
    link.append(makeImage(post.thumbnailUrl, post.title));

    const copy = document.createElement("span");
    copy.className = "note-card-copy";

    const category = document.createElement("span");
    category.className = "note-category";
    category.textContent = post.category || "Notes";

    const title = document.createElement("strong");
    title.className = "note-title";
    title.textContent = post.title;

    copy.append(category, title);

    if (options.showExcerpt && post.excerpt) {
      const excerpt = document.createElement("span");
      excerpt.className = "note-excerpt";
      excerpt.textContent = post.excerpt;
      copy.append(excerpt);
    }

    const published = formattedDate(post.publishedAt);
    if (published) {
      const time = document.createElement("time");
      time.className = "note-date";
      time.dateTime = post.publishedAt;
      time.textContent = published;
      copy.append(time);
    }

    link.append(copy);
    article.append(link);
    return article;
  }

  function makeMessage(message) {
    const panel = document.createElement("article");
    panel.className = "blog-message";
    const text = document.createElement("p");
    text.textContent = message;
    panel.append(text);
    return panel;
  }

  async function loadHomePosts() {
    if (!homeGrid) return;
    try {
      const { posts = [] } = await requestBlog();
      if (!posts.length) return;
      homeGrid.replaceChildren(...posts.slice(0, 3).map((post) => makePostCard(post)));
      homeGrid.dataset.blogState = "ready";
    } catch (error) {
      console.warn("[admit-one-blog]", error);
      homeGrid.dataset.blogState = "fallback";
    }
  }

  async function loadLibrary() {
    if (!library || !libraryGrid || requestedSlug) return;
    try {
      const { posts = [] } = await requestBlog();
      libraryGrid.replaceChildren(
        ...(posts.length
          ? posts.map((post) => makePostCard(post, { showExcerpt: true }))
          : [makeMessage("No stories are published yet. Check back soon.")])
      );
      libraryGrid.dataset.blogState = "ready";
    } catch (error) {
      libraryGrid.replaceChildren(makeMessage(error instanceof Error ? error.message : "The blog could not be loaded."));
      libraryGrid.dataset.blogState = "error";
    }
  }

  async function loadStory() {
    if (!story || !requestedSlug) return;
    library?.setAttribute("hidden", "");
    story.removeAttribute("hidden");

    const status = story.querySelector("[data-blog-status]");
    const content = story.querySelector("[data-blog-content]");

    try {
      const { post } = await requestBlog(`/${encodeURIComponent(requestedSlug)}`);
      if (!post) throw new Error("Story not found.");

      const category = story.querySelector("[data-blog-category]");
      const title = story.querySelector("[data-blog-title]");
      const excerpt = story.querySelector("[data-blog-excerpt]");
      const date = story.querySelector("[data-blog-date]");
      const author = story.querySelector("[data-blog-author]");
      const hero = story.querySelector("[data-blog-image]");

      if (category) category.textContent = post.category || "Notes";
      if (title) title.textContent = post.title;
      if (excerpt) {
        excerpt.textContent = post.excerpt || "";
        excerpt.toggleAttribute("hidden", !post.excerpt);
      }
      if (date) {
        date.textContent = formattedDate(post.publishedAt);
        date.setAttribute("datetime", post.publishedAt || "");
        date.toggleAttribute("hidden", !post.publishedAt);
      }
      if (author) {
        author.textContent = post.authorName ? `By ${post.authorName}` : "";
        author.toggleAttribute("hidden", !post.authorName);
      }
      if (hero && post.headerImageUrl) {
        hero.src = post.headerImageUrl;
        hero.alt = "";
        hero.removeAttribute("hidden");
      }
      if (content) content.innerHTML = post.contentHtml || "";
      if (status) status.setAttribute("hidden", "");

      document.title = `${post.title} | Admit One`;
      const description = document.querySelector('meta[name="description"]');
      if (description && post.excerpt) description.setAttribute("content", post.excerpt);
    } catch (error) {
      const message = error instanceof Error ? error.message : "The story could not be loaded.";
      const title = story.querySelector("[data-blog-title]");
      if (title) title.textContent = "Story unavailable";
      if (status) status.textContent = message;
      if (content) content.replaceChildren();
      document.title = "Story unavailable | Admit One";
    }
  }

  void loadHomePosts();
  void loadLibrary();
  void loadStory();
})();
