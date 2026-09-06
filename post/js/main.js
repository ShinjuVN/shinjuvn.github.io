/* Shinju Blog — post/js/main.js
   Static blog: no build step, no backend. Everything below is plain
   client-side JS reading data/posts.json + data/<id>.md at runtime.

   Routing:
     index.html            -> homepage (top10, recent, search)
     index.html?p=<id>     -> fetches data/<id>.md and renders it;
                               redirects to post404.html on fetch failure,
                               or shows a "private" notice instead if the
                               post is marked visibility: "private".

   Visibility (posts.json "visibility" field, optional):
     "public"   (default, same as omitting the field) — shows everywhere.
     "unlisted" — hidden from homepage/search/related posts, but a
                  direct ?p=<id> link still opens it normally.
     "private"  — hidden everywhere AND a direct ?p=<id> link is blocked,
                  showing a "private post" notice instead of the content.
     A .md file with no matching posts.json entry at all (e.g. still
     being drafted) behaves like "unlisted", not "private" — it just
     never appears in any entry-less list.
*/

const ABACUS_BASE = "https://abacus.jasoncameron.dev";
// Abacus (github.com/JasonLovesDoggo/abacus) — a free, no-signup, no-API-key
// counter service made specifically as a CountAPI replacement. Unlike
// CounterAPI, a counter needs no manual setup at all: the very first
// /hit call for a given namespace+key creates it automatically.
// Namespace just needs to be reasonably unique so it doesn't collide
// with someone else's counters — no dashboard, no account required.
const ABACUS_NAMESPACE = "shinjuvn-posts-ShinjuVNer";

const LAST_SEARCH_KEY = "shinjuvn_blog_last_search";
const CAME_FROM_HOME_KEY = "shinjuvn_blog_from_home";

/* ============================================================== */
/* Minecraft color / format codes (&0-&9, &a-&f, &l &m &n &o, &r) */
/* ============================================================== */

const MC_COLORS = {
    "0": "#000000", "1": "#0000AA", "2": "#00AA00", "3": "#00AAAA",
    "4": "#AA0000", "5": "#AA00AA", "6": "#FFAA00", "7": "#AAAAAA",
    "8": "#555555", "9": "#5555FF", a: "#55FF55", b: "#55FFFF",
    c: "#FF5555", d: "#FF55FF", e: "#FFFF55", f: "#FFFFFF",
};

const MC_FORMATS = {
    l: "font-weight:bold;",
    m: "text-decoration:line-through;",
    n: "text-decoration:underline;",
    o: "font-style:italic;",
};

// Converts "&e&lYellow bold&r normal" into styled <span> tags. Only
// touches "&x" sequences with a valid Minecraft code, so it's safe to
// run over ordinary text containing a stray "&".
function parseMinecraftColors(text) {
    const tokens = text.split(/(&[0-9a-fk-or])/i);
    let color = null;
    const formats = new Set();
    let html = "";
    let openSpan = false;

    function closeSpan() {
        if (openSpan) {
            html += "</span>";
            openSpan = false;
        }
    }

    tokens.forEach((tok) => {
        const m = tok.match(/^&([0-9a-fk-or])$/i);
        if (m) {
            const code = m[1].toLowerCase();
            if (code === "r") {
                closeSpan();
                color = null;
                formats.clear();
            } else if (MC_COLORS[code]) {
                closeSpan();
                color = MC_COLORS[code];
                formats.clear(); // a new color code resets active formats too
            } else if (MC_FORMATS[code]) {
                formats.add(code);
            } else if (code === "k") {
                formats.add("k");
            }
            return;
        }
        if (!tok) return;

        let style = "";
        let extraClass = "";
        if (color) style += `color:${color};`;
        formats.forEach((f) => {
            if (f === "k") extraClass = "mc-obfuscated";
            else style += MC_FORMATS[f] || "";
        });

        if (style || extraClass) {
            closeSpan();
            html += `<span${extraClass ? ` class="${extraClass}"` : ""}${style ? ` style="${style}"` : ""}>`;
            openSpan = true;
        }
        html += tok;
    });

    closeSpan();
    return html;
}

// Applies Minecraft colors only to text between HTML tags, so it never
// corrupts an href/src attribute (e.g. a query string containing "&e=1").
function applyMinecraftColorsToHtml(html) {
    return html.replace(/(<[^>]+>)|([^<]+)/g, (whole, tag, text) =>
        tag ? tag : parseMinecraftColors(text)
    );
}

/* ============================================================== */
/* Minimal markdown: images, links, raw HTML passthrough           */
/* ============================================================== */

function markdownLiteToHtml(md) {
    const text = md.replace(/\r\n/g, "\n").trim();
    const blocks = text.split(/\n\s*\n/);

    const htmlBlocks = blocks.map((block) => {
        const trimmed = block.trim();
        if (!trimmed) return "";

        // A block that is just one image on its own -> block-level figure
        const imgOnly = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
        if (imgOnly) {
            const [, alt, url] = imgOnly;
            return `<div class="post-image"><img src="${url}" alt="${alt}" loading="lazy" /></div>`;
        }

        // A block that already starts with a block-level HTML tag (e.g. a
        // <a class="btn"> button on its own line) — leave it as-is.
        if (/^<(div|a|img|h[1-6]|blockquote|ul|ol)\b/i.test(trimmed)) {
            return trimmed;
        }

        const inline = trimmed
            .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy" />')
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
            .replace(/\n/g, "<br>");

        return `<p>${inline}</p>`;
    });

    return htmlBlocks.filter(Boolean).join("\n");
}

function renderPostBody(rawMarkdown) {
    return applyMinecraftColorsToHtml(markdownLiteToHtml(rawMarkdown));
}

/* ============================================================== */
/* Frontmatter parsing                                              */
/* ============================================================== */

function parseFrontmatter(raw) {
    const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
    if (!match) return { meta: {}, body: raw };
    const meta = {};
    match[1].split("\n").forEach((line) => {
        const m = line.match(/^([\w-]+):\s*"?([^"]*?)"?\s*$/);
        if (m) meta[m[1]] = m[2];
    });
    return { meta, body: match[2] };
}

/* ============================================================== */
/* Abacus view counter (replaces the discontinued CountAPI)        */
/* ============================================================== */

// Abacus can be slow or entirely unreachable; a fetch() with no
// timeout would otherwise hang the whole page forever waiting for it.
// This aborts after `ms` and falls back to 0 views instead.
async function fetchWithTimeout(url, ms) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    try {
        // cache: "no-store" avoids the browser silently replaying a stale
        // response (e.g. an old 404 from before a counter existed)
        // instead of hitting the server on a later call.
        return await fetch(url, { signal: controller.signal, cache: "no-store" });
    } finally {
        clearTimeout(timer);
    }
}

async function getViews(id) {
    try {
        // Returns 404 { error: "Key not found" } until the counter has
        // been hit at least once — treated the same as "0 views" below.
        const res = await fetchWithTimeout(
            `${ABACUS_BASE}/get/${ABACUS_NAMESPACE}/${encodeURIComponent(id)}`,
            4000
        );
        if (!res.ok) return 0;
        const data = await res.json();
        return data.value || 0;
    } catch (e) {
        return 0; // Abacus unreachable or too slow — don't break the page over it
    }
}

async function hitViews(id) {
    try {
        // First call for a given id auto-creates the counter — no manual
        // setup needed, unlike CounterAPI's dashboard-based workspaces.
        const res = await fetchWithTimeout(
            `${ABACUS_BASE}/hit/${ABACUS_NAMESPACE}/${encodeURIComponent(id)}`,
            4000
        );
        if (!res.ok) return 0;
        const data = await res.json();
        return data.value || 0;
    } catch (e) {
        return 0;
    }
}

/* ============================================================== */
/* Data loading + helpers                                          */
/* ============================================================== */

async function loadPosts() {
    const res = await fetch("data/posts.json", { cache: "no-store" });
    if (!res.ok) throw new Error("Could not load data/posts.json");
    return res.json();
}

// Only "public" (or the field omitted entirely) counts as visible in
// listings/search. "unlisted" and "private" are both excluded here —
// they differ only in whether a direct link is allowed (see
// renderPostPage), not in whether they show up in lists.
function isPublic(p) {
    return !p.visibility || p.visibility === "public";
}

function truncateTitle(title) {
    return title.length > 50 ? title.slice(0, 50) + "..." : title;
}

// Dates are stored as DD/MM/YYYY directly in posts.json and post
// frontmatter, so display needs no conversion — this just guards
// against a missing value.
function formatDate(dateStr) {
    return dateStr || "";
}

// new Date("20/08/2026") is unreliable across browsers — slash-separated
// dates are commonly parsed as MM/DD/YYYY (US format), which would
// silently scramble sorting and the "views per day" score. Every place
// that needs a real Date object from a DD/MM/YYYY string goes through
// this instead of calling `new Date(...)` directly.
function parseDate(dateStr) {
    const m = (dateStr || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) return new Date(NaN);
    const [, d, mo, y] = m;
    return new Date(Number(y), Number(mo) - 1, Number(d));
}

// Matches the search query against the title or the DD/MM/YYYY date
// string, so typing "20/08/2026", "20/08", or just "2026" all work as a
// natural substring.
function filterPosts(posts, query) {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return posts
        .filter((p) => p.title.toLowerCase().includes(q) || (p.date || "").includes(q))
        .sort((a, b) => parseDate(b.date) - parseDate(a.date));
}

/* ============================================================== */
/* Rendering: post cards                                            */
/* ============================================================== */

function renderCards(container, posts) {
    if (!container) return;
    container.innerHTML = "";
    if (!posts.length) {
        container.innerHTML = '<p class="empty-msg">Không có bài đăng nào.</p>';
        return;
    }
    posts.forEach((p) => {
        const card = document.createElement("a");
        card.className = "post-card";
        card.href = `index.html?p=${encodeURIComponent(p.id)}`;
        card.addEventListener("click", () => {
            // Lets the post page know it was reached via the homepage, so it
            // can show "related posts" based on the last search term.
            sessionStorage.setItem(CAME_FROM_HOME_KEY, "1");
        });
        const viewsHtml =
            p.views != null
                ? `${p.views} lượt xem`
                : `<span class="views-loading" aria-label="Đang tải lượt xem">Đang tải<span class="dot">.</span><span class="dot">.</span><span class="dot">.</span></span>`;
        card.innerHTML = `
      <div class="post-card-photo"><img src="${p.photo}" alt="${truncateTitle(p.title)}" loading="lazy" /></div>
      <div class="post-card-body">
        <h3 class="post-card-title">${truncateTitle(p.title)}</h3>
        <div class="post-card-meta">
          <span>${formatDate(p.date)}</span>
          <span>${viewsHtml}</span>
        </div>
      </div>
    `;
        container.appendChild(card);
    });
}

/* ============================================================== */
/* Homepage                                                         */
/* ============================================================== */

function homeTemplate() {
    return `
    <header class="site-header"><h1>Shinju Ch.</h1></header>

    <div class="search-wrap">
      <input type="search" class="search-input" data-search
             placeholder="Tìm theo tiêu đề hoặc ngày (DD/MM/YYYY)..." />
    </div>

    <section class="search-results" data-search-results hidden>
      <h2>Kết quả tìm kiếm</h2>
      <div class="post-grid" data-search-grid></div>
    </section>

    <div data-default-sections>
      <section class="post-section">
        <h2>🔥 Top bài đăng nổi bật</h2>
        <div class="post-grid" data-top10></div>
      </section>

      <section class="post-section">
        <h2>📝 Bài đăng gần đây</h2>
        <div class="post-grid" data-recent></div>
        <button type="button" class="show-all-btn" data-show-all>Hiện toàn bộ bài đăng</button>
      </section>
    </div>
  `;
}

async function renderHomePage() {
    const root = document.getElementById("app");
    root.innerHTML = homeTemplate();

    // The homepage has no per-post images to wait on beyond the shared
    // bg — let the loading screen close as soon as that's ready.
    if (window.SiteLoading) window.SiteLoading.ready();

    let posts = [];
    try {
        posts = await loadPosts();
    } catch (e) {
        console.error(e);
    }
    // Unlisted/private posts never appear on the homepage, in "show all",
    // in search results, or in related-posts suggestions.
    posts = posts.filter(isPublic);

    const today = new Date();
    function computeScored(viewsMap) {
        return posts.map((p) => {
            const days = Math.max(1, Math.floor((today - parseDate(p.date)) / 86400000));
            const known = viewsMap[p.id];
            return { ...p, views: known == null ? null : known, score: (known || 0) / days };
        });
    }
    function byNewest(list) {
        return [...list].sort((a, b) => parseDate(b.date) - parseDate(a.date));
    }

    // 1) Render right away, sorted by date, with the view count shown as
    //    a loading pulse — so the person sees the post list immediately
    //    instead of an empty page while Abacus is contacted.
    let scored = computeScored({});
    renderCards(document.querySelector("[data-top10]"), byNewest(scored).slice(0, 10));
    renderCards(document.querySelector("[data-recent]"), byNewest(scored).slice(0, 5));

    const showAllBtn = document.querySelector("[data-show-all]");
    let showingAll = false;
    if (posts.length <= 5) {
        showAllBtn.remove();
    } else {
        showAllBtn.addEventListener("click", () => {
            showingAll = true;
            renderCards(document.querySelector("[data-recent]"), byNewest(scored));
            showAllBtn.remove();
        });
    }

    // Search — partial match on title or date, persisted to localStorage.
    const searchInput = document.querySelector("[data-search]");
    const resultsSection = document.querySelector("[data-search-results]");
    const defaultSections = document.querySelector("[data-default-sections]");
    let currentQuery = "";

    function runSearch(query) {
        currentQuery = query.trim();
        if (!currentQuery) {
            resultsSection.hidden = true;
            defaultSections.hidden = false;
            return;
        }
        defaultSections.hidden = true;
        resultsSection.hidden = false;
        renderCards(document.querySelector("[data-search-grid]"), filterPosts(scored, currentQuery));
    }

    const savedSearch = localStorage.getItem(LAST_SEARCH_KEY) || "";
    searchInput.value = savedSearch;
    runSearch(savedSearch);

    searchInput.addEventListener("input", () => {
        localStorage.setItem(LAST_SEARCH_KEY, searchInput.value);
        runSearch(searchInput.value);
    });

    // 2) Fetch real view counts in the background (each request already
    //    has its own 4s timeout; this outer race is a second safety net),
    //    then refresh the view numbers and re-sort "nổi bật" by score.
    const viewsMap = {};
    await Promise.race([
        Promise.all(
            posts.map(async (p) => {
                viewsMap[p.id] = await getViews(p.id);
            })
        ),
        new Promise((resolve) => setTimeout(resolve, 6000)),
    ]);

    scored = computeScored(viewsMap);
    const top10 = [...scored].sort((a, b) => b.score - a.score).slice(0, 10);
    const newestFirst = byNewest(scored);

    renderCards(document.querySelector("[data-top10]"), top10);
    renderCards(document.querySelector("[data-recent]"), showingAll ? newestFirst : newestFirst.slice(0, 5));
    if (currentQuery) {
        renderCards(document.querySelector("[data-search-grid]"), filterPosts(scored, currentQuery));
    }
}

/* ============================================================== */
/* Single post view                                                 */
/* ============================================================== */

function postTemplate(meta, bodyHtml) {
    return `
    <div class="post-view">
      <button type="button" class="back-btn" data-back>&larr; Quay lại</button>
      <article class="post-article">
        ${meta.photo ? `<img class="post-cover" src="${meta.photo}" alt="${meta.title || ""}" />` : ""}
        <h1 class="post-title">${meta.title || ""}</h1>
        <div class="post-meta">
          <span>${formatDate(meta.date)}</span>
          <span><span data-views-wrap><span class="views-loading" aria-label="Đang tải lượt xem">Đang tải<span class="dot">.</span><span class="dot">.</span><span class="dot">.</span></span></span> lượt xem</span>
        </div>
        <div class="post-body">${bodyHtml}</div>
      </article>
      <section class="related-posts" data-related hidden>
        <h2>Bài viết liên quan</h2>
        <div class="post-grid" data-related-grid></div>
      </section>
    </div>
  `;
}

// Shown instead of the post content when posts.json marks this id as
// visibility: "private" — even someone with the direct link sees this,
// not the post body.
function privateNoticeTemplate() {
    return `
    <div class="post-view">
      <button type="button" class="back-btn" data-back>&larr; Quay lại</button>
      <article class="post-article private-notice">
        <h1 class="post-title">Không thể xem bài đăng này!</h1>
        <p class="post-body">Đây là bài đăng riêng tư.</p>
      </article>
    </div>
  `;
}

function renderPrivateNotice() {
    const root = document.getElementById("app");
    root.innerHTML = privateNoticeTemplate();

    if (window.SiteLoading) window.SiteLoading.ready();

    document.querySelector("[data-back]").addEventListener("click", () => {
        window.location.href = "index.html";
    });
}

async function renderPostPage(id) {
    // Loaded once up front: used both for the private/visibility check
    // below and (later) for the related-posts suggestions, so posts.json
    // is only fetched a single time per post view.
    let allPosts = [];
    try {
        allPosts = await loadPosts();
    } catch (e) {
        console.error(e);
    }

    // A post explicitly marked private can't be opened via a direct link
    // either — show a dedicated notice instead of fetching/rendering it.
    // A .md file with no matching posts.json entry at all is NOT treated
    // as private (that would silently lock out drafts you forgot to add
    // to posts.json) — it behaves like "unlisted" and opens normally.
    const entry = allPosts.find((p) => p.id === id);
    if (entry && entry.visibility === "private") {
        renderPrivateNotice();
        return;
    }

    let raw;
    try {
        const res = await fetch(`data/${encodeURIComponent(id)}.md`, { cache: "no-store" });
        if (!res.ok) throw new Error("post not found");
        raw = await res.text();
        // Some hosts (e.g. IIS with a custom 404 page set to
        // responseMode="ExecuteURL") respond with status 200 and the
        // error page's HTML instead of a real 404 status. A genuine post
        // file always starts with a frontmatter block, so use that as the
        // real "does this post exist" check rather than trusting res.ok
        // alone.
        if (!/^\s*---\s*\n/.test(raw)) {
            throw new Error("response is not a valid post file");
        }
    } catch (e) {
        window.location.href = "post404.html";
        return;
    }

    const { meta, body } = parseFrontmatter(raw);
    const root = document.getElementById("app");
    root.innerHTML = postTemplate(meta, renderPostBody(body));

    if (window.SiteLoading) {
        window.SiteLoading.waitFor(meta.photo);
        window.SiteLoading.ready();
    }

    // Back button always returns to the homepage (not browser history).
    document.querySelector("[data-back]").addEventListener("click", () => {
        window.location.href = "index.html";
    });

    // View counter: shows the current count immediately, then waits
    // until the visitor has had the post open for a few seconds before
    // deciding whether to count the view. If they navigate away before
    // then, this code never gets to run (the page has already unloaded),
    // so a quick bounce doesn't count as a view.
    //
    // On top of that, localStorage remembers the last time THIS browser
    // counted a view for THIS post id, so reloading or reopening the
    // same post within 10 minutes doesn't inflate the count further.
    // (Using localStorage rather than relying on HTTP caching because
    // that depends on Cache-Control headers from Abacus's server, which
    // we don't control and could change or be absent entirely.)
    const VIEW_DWELL_MS = 5000; // must stay on the page this long
    const VIEW_COOLDOWN_MS = 10 * 60 * 1000; // then, at most once per 10 min
    const viewsEl = document.querySelector("[data-views-wrap]");

    getViews(id).then((v) => {
        if (viewsEl) viewsEl.textContent = v;
    });

    setTimeout(() => {
        const storageKey = `shinjuvn_blog_viewed_${id}`;
        const lastViewedAt = Number(localStorage.getItem(storageKey) || 0);
        if (Date.now() - lastViewedAt < VIEW_COOLDOWN_MS) return; // counted recently — skip

        localStorage.setItem(storageKey, String(Date.now()));
        hitViews(id).then((v) => {
            if (viewsEl) viewsEl.textContent = v;
        });
    }, VIEW_DWELL_MS);

    // Related posts: only when arriving from the homepage (via a card
    // click) with a saved search term — hidden on direct/deep links.
    // Only ever suggests public posts, same as the homepage.
    const cameFromHome = sessionStorage.getItem(CAME_FROM_HOME_KEY) === "1";
    const lastSearch = localStorage.getItem(LAST_SEARCH_KEY) || "";
    if (cameFromHome && lastSearch) {
        const related = filterPosts(allPosts.filter(isPublic), lastSearch)
            .filter((p) => p.id !== id)
            .slice(0, 5);
        if (related.length) {
            document.querySelector("[data-related]").hidden = false;
            renderCards(document.querySelector("[data-related-grid]"), related);
        }
    }
}

/* ============================================================== */
/* Entry point                                                      */
/* ============================================================== */

function main() {
    const params = new URLSearchParams(window.location.search);
    const postId = params.get("p");
    if (postId) {
        renderPostPage(postId);
    } else {
        renderHomePage();
    }
}

main();
