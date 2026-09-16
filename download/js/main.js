/* Shinju download page — download/js/main.js
   URL: index.html?f=<id>  ->  fetches data/<id>.json for this file's
   config, plus the shared data.json ad-link pool sitting next to
   index.html. No id / fetch failure -> redirect to the site's 404.

   Ad-watch mechanism (Page Visibility API):
   Clicking an ad button opens a random matching, non-expired link
   from data.json in a NEW TAB, then marks that button "active". While
   this tab is hidden (document.hidden), time is NOT ticked live (the
   page can't repaint while hidden anyway) — instead, the elapsed
   hidden-time is added to that button's progress the moment the
   person switches back to this tab. Progress accumulates across
   multiple back-and-forth switches until it reaches the required
   seconds. Only the most-recently-clicked, not-yet-completed button
   receives credit for a given hidden period — idly switching tabs
   without ever clicking a button earns nothing.
*/

const SITE_404 = "/404.html";

function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
}

function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
}

/* ============================================================== */
/* Data loading                                                     */
/* ============================================================== */

async function loadFileConfig(id) {
    const res = await fetch(`data/${encodeURIComponent(id)}.json`, { cache: "no-store" });
    if (!res.ok) throw new Error(`config not found (HTTP ${res.status})`);

    const text = await res.text();
    let config;
    try {
        config = JSON.parse(text);
    } catch (e) {
        // JSON.parse can fail for two very different reasons: (1) the data
        // file itself has a syntax error, or (2) some hosts (e.g. IIS with
        // a custom 404 page set to responseMode="ExecuteURL") respond with
        // status 200 and an error page's HTML instead of a real 404 — res.ok
        // would be true even though this isn't real JSON. Report both
        // possibilities rather than assuming one.
        throw new Error(
            `data/${id}.json is not valid JSON (check the file for a syntax error, or the server may have substituted an error page for a missing file): ${e.message}`
        );
    }

    if (!config || typeof config !== "object" || !config.download || !config.download.url) {
        throw new Error('invalid download config — missing "download.url"');
    }
    return config;
}

async function loadAdPool() {
    try {
        const res = await fetch("data.json", { cache: "no-store" });
        if (!res.ok) return { adLinks: [] };
        const data = await res.json();
        return { adLinks: Array.isArray(data.adLinks) ? data.adLinks : [] };
    } catch (e) {
        return { adLinks: [] }; // shared pool unreachable -> every button falls back to "skip"
    }
}

/* ============================================================== */
/* Ad link selection                                                */
/* ============================================================== */

function isLinkValid(expires) {
    if (!expires) return true;
    const norm = String(expires).trim().toLowerCase();
    if (norm === "inf" || norm === "infinity") return true;

    const m = norm.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) {
        console.warn(`download: unrecognized "expires" value "${expires}", treating link as expired`);
        return false;
    }
    const [, dd, mm, yyyy] = m;
    const expiryDate = new Date(Number(yyyy), Number(mm) - 1, Number(dd), 23, 59, 59);
    return Date.now() <= expiryDate.getTime();
}

function pickAdLink(categories, pool) {
    const wanted = new Set((categories || []).map((c) => c.toLowerCase()));
    const matches = pool.adLinks.filter(
        (link) => wanted.has(String(link.category || "").toLowerCase()) && isLinkValid(link.expires)
    );
    if (!matches.length) return null;
    return matches[Math.floor(Math.random() * matches.length)];
}

/* ============================================================== */
/* Per-button progress (sessionStorage — resets when the tab closes) */
/* ============================================================== */

function progressKey(fileId, buttonId) {
    return `dl_progress_${fileId}_${buttonId}`;
}

function getProgress(fileId, buttonId) {
    try {
        const raw = sessionStorage.getItem(progressKey(fileId, buttonId));
        if (!raw) return { seconds: 0, completed: false };
        return JSON.parse(raw);
    } catch (e) {
        return { seconds: 0, completed: false };
    }
}

function setProgress(fileId, buttonId, progress) {
    try {
        sessionStorage.setItem(progressKey(fileId, buttonId), JSON.stringify(progress));
    } catch (e) {
        // sessionStorage unavailable (private mode etc.) — progress just won't persist across reload
    }
}

/* ============================================================== */
/* Page logic                                                       */
/* ============================================================== */

async function main() {
    const fileId = getParam("f");
    if (!fileId) {
        window.location.href = SITE_404;
        return;
    }

    let config;
    try {
        config = await loadFileConfig(fileId);
    } catch (e) {
        console.error(`download: could not load data/${fileId}.json —`, e.message);
        window.location.href = SITE_404;
        return;
    }

    const pool = await loadAdPool();
    const root = document.getElementById("app");

    root.innerHTML = `
    <div class="download-card">
      <h1 class="download-title">${escapeHtml(config.title || "Tải xuống")}</h1>
      <p class="download-hint">Xem quảng cáo bên dưới để ủng hộ mình, sau đó bấm Tải Xuống nhé!</p>
      <div class="ad-button-list" data-ad-list></div>
      <button type="button" class="download-btn locked" data-download-btn disabled>
        🔒 <span data-download-label>${escapeHtml((config.download && config.download.label) || "Tải Xuống")}</span>
      </button>
      <p class="download-note" data-download-note></p>
    </div>
  `;

    if (window.SiteLoading) window.SiteLoading.ready();

    const adButtons = Array.isArray(config.adButtons) ? config.adButtons : [];
    const requireAll = config.requireAllAds !== false; // default true unless explicitly false
    const list = document.querySelector("[data-ad-list]");
    const downloadBtn = document.querySelector("[data-download-btn]");
    const downloadNote = document.querySelector("[data-download-note]");

    // in-memory view of each button's state, keyed by button id
    const state = {};
    let activeButtonId = null; // the button currently "earning" hidden-time
    let hiddenSince = null;

    function isButtonDone(btn) {
        return state[btn.id].completed;
    }

    function checkUnlock() {
        const unlocked = !requireAll || adButtons.every(isButtonDone);
        downloadBtn.classList.toggle("locked", !unlocked);
        downloadBtn.classList.toggle("unlocked", unlocked);
        downloadBtn.disabled = !unlocked;
        downloadBtn.innerHTML = unlocked
            ? `<span data-download-label>${escapeHtml((config.download && config.download.label) || "Tải Xuống")}</span>`
            : `🔒 <span data-download-label>${escapeHtml((config.download && config.download.label) || "Tải Xuống")}</span>`;
    }

    function renderButtonUI(btn) {
        const el = document.querySelector(`[data-btn-id="${btn.id}"]`);
        if (!el) return;
        const s = state[btn.id];
        const statusEl = el.querySelector("[data-ad-status]");

        el.classList.remove("in-progress", "completed", "skipped");
        if (s.skipped) {
            el.classList.add("skipped");
            el.disabled = true;
            statusEl.textContent = "Không khả dụng — đã bỏ qua";
        } else if (s.completed) {
            el.classList.add("completed");
            el.disabled = true;
            statusEl.textContent = "✅ Đã hoàn thành";
        } else if (s.seconds > 0) {
            el.classList.add("in-progress");
            const remain = Math.max(0, btn.seconds - s.seconds);
            statusEl.textContent = `Còn thiếu ${Math.ceil(remain)}s`;
        } else {
            statusEl.textContent = `${btn.seconds}s`;
        }
    }

    adButtons.forEach((btn) => {
        const saved = getProgress(fileId, btn.id);
        state[btn.id] = { seconds: saved.seconds || 0, completed: !!saved.completed, skipped: false };

        const item = document.createElement("button");
        item.type = "button";
        item.className = "ad-btn";
        item.setAttribute("data-btn-id", btn.id);
        item.innerHTML = `
      <span class="ad-btn-label">${escapeHtml(btn.label || "Xem quảng cáo")}</span>
      <span class="ad-btn-status" data-ad-status></span>
    `;

        item.addEventListener("click", () => {
            if (state[btn.id].completed || state[btn.id].skipped) return;

            const link = pickAdLink(btn.categories, pool);
            if (!link) {
                // No valid ad available for this button's categories -> per
                // site policy, auto-skip it rather than blocking the download.
                state[btn.id].completed = true;
                state[btn.id].skipped = true;
                setProgress(fileId, btn.id, state[btn.id]);
                renderButtonUI(btn);
                checkUnlock();
                return;
            }

            window.open(link.url, "_blank", "noopener,noreferrer");
            activeButtonId = btn.id;
            renderButtonUI(btn);
        });

        list.appendChild(item);
        renderButtonUI(btn);
    });

    checkUnlock();

    // Page Visibility API: only the most-recently-clicked, not-yet-done
    // button earns credit for a period the tab spent hidden.
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            hiddenSince = Date.now();
            return;
        }
        if (hiddenSince && activeButtonId && state[activeButtonId] && !state[activeButtonId].completed) {
            const elapsedSec = (Date.now() - hiddenSince) / 1000;
            const btn = adButtons.find((b) => b.id === activeButtonId);
            const s = state[activeButtonId];
            s.seconds = Math.min(btn.seconds, s.seconds + elapsedSec);
            if (s.seconds >= btn.seconds) s.completed = true;
            setProgress(fileId, activeButtonId, s);
            renderButtonUI(btn);
            checkUnlock();
        }
        hiddenSince = null;
    });

    // Download button
    downloadBtn.addEventListener("click", () => {
        if (downloadBtn.disabled) return;
        const dl = config.download;
        if (dl.mode === "direct") {
            const a = document.createElement("a");
            a.href = dl.url;
            a.setAttribute("download", "");
            document.body.appendChild(a);
            a.click();
            a.remove();
            downloadNote.textContent = "Đang tải xuống...";
        } else {
            window.open(dl.url, "_blank", "noopener,noreferrer");
        }
    });
}

main();