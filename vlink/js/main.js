/* /vlink — 3 states based on URL query params:
 *   ?type=<provider>&i=<base64>
 *       -> decode `i`, must be exactly 10 chars -> look up `type` in
 *          api.json, build that provider's redirect link, send the
 *          person through it, landing back on this same page with
 *          ?o=<code> instead. Invalid `i` / unknown `type` -> "task
 *          unavailable" message.
 *   ?o=<code>
 *       -> must be exactly 10 letters (a-zA-Z) -> show the "/gift
 *          <code>" copy button. Invalid -> redirect to 404.
 *   neither
 *       -> friendly "no quest code yet" message with a link to the
 *          Minecraft server's quest page (no longer redirects to 404
 *          for this case).
 *
 * Shortener providers are configured in api.json, not hardcoded here —
 * add a new one (Link4M, Site2S, or any other clone with a similar
 * "?api=TOKEN&url=URL"-style redirect endpoint) purely by adding an
 * entry to that file; no code change needed. Each provider's plain
 * redirect endpoint is used via a top-level navigation (never its JSON
 * API) — a plain navigation is never subject to CORS, so it works
 * reliably from a static GitHub Pages host with no backend to proxy
 * the request through.
 */

// Where to send people who land on /vlink with no code at all —
// replace with your actual Minecraft server's quest/task page.
const URL_CUSTOM = "../posts";

// Where the shortener's redirect should eventually land — derived
// automatically from this page's own URL, so it's always correct
// wherever the site is actually hosted.
const DESTINATION_BASE = `${window.location.origin}${window.location.pathname}?o=`;

function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function base64Decode(str) {
  try {
    return atob(str);
  } catch (e) {
    return null; // not valid base64 at all
  }
}

function isValidGiftCode(str) {
  return typeof str === "string" && /^[a-zA-Z]{10}$/.test(str);
}

async function loadApiConfig() {
  const res = await fetch("api.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`api.json HTTP ${res.status}`);
  return res.json();
}

// Fills a provider's URL template — e.g.
// "https://link4m.co/st?api={token}&url={destination}" — with its own
// token and the actual destination URL.
function buildShortUrl(provider, destination) {
  return provider.template
    .replace("{token}", encodeURIComponent(provider.token))
    .replace("{destination}", encodeURIComponent(destination));
}

function render(html) {
  document.getElementById("app").innerHTML = html;
}

function redirectTo404() {
  window.location.href = "/404.html";
}

function showUnavailable() {
  render(`
    <div class="msg-card">
      <p class="msg-icon">🚫</p>
      <h1 class="msg-title">Nhiệm vụ này hiện không hoạt động hoặc không tồn tại</h1>
    </div>
  `);
}

function showNoQuestCode() {
  render(`
    <div class="msg-card">
      <p class="msg-icon">🙈</p>
      <h1 class="msg-title">Ui ui :3</h1>
      <p class="msg-sub">Tui chưa thấy mã chuyển hướng đến trang download nào cả đấy :< \nMở đúng link ik!</p>
      <a class="primary-btn" href="${URL_CUSTOM}" target="_blank" rel="noopener noreferrer">Ghé qua trang Posts của tui!</a>
    </div>
  `);
}

function showRedirecting(shortUrl) {
  render(`
    <div class="msg-card">
      <div class="spinner" aria-hidden="true"></div>
      <h1 class="msg-title">Đang chuyển hướng...</h1>
      <p class="msg-sub">Bạn sẽ được chuyển tới trang xác thực trong giây lát.</p>
      <a class="fallback-link" href="${shortUrl}">Nếu không tự chuyển hướng, bấm vào đây</a>
    </div>
  `);
  window.location.href = shortUrl;
}

function showSuccess(code) {
  render(`
    <div class="msg-card success-card">
      <p class="msg-icon">🎁</p>
      <h1 class="msg-title">Mở khoá thành công!</h1>
      <p class="msg-sub">Dùng lệnh sau trong Server để nhận key</p>
      <div class="code-box">
        <code>/gift ${code}</code>
        <button type="button" class="copy-btn" data-copy-btn>Copy</button>
      </div>
    </div>
  `);

  const btn = document.querySelector("[data-copy-btn]");
  const originalLabel = btn.textContent;
  btn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(`/gift ${code}`);
      btn.textContent = "Đã sao chép!";
      btn.classList.add("copied");
      setTimeout(() => {
        btn.textContent = originalLabel;
        btn.classList.remove("copied");
      }, 2000);
    } catch (e) {
      btn.textContent = "Không sao chép được";
      setTimeout(() => {
        btn.textContent = originalLabel;
      }, 2000);
    }
  });
}

async function main() {
  const iParam = getParam("i");
  const oParam = getParam("o");
  const typeParam = getParam("type");

  // Case 1: ?i= present (checked first, takes priority over ?o=)
  if (iParam !== null) {
    const decoded = base64Decode(iParam);
    if (!decoded || decoded.length !== 10) {
      showUnavailable();
      return;
    }

    let apiConfig;
    try {
      apiConfig = await loadApiConfig();
    } catch (e) {
      console.error("vlink: could not load api.json —", e.message);
      showUnavailable();
      return;
    }

    const provider = typeParam ? apiConfig[typeParam] : null;
    if (!provider) {
      console.error(`vlink: unknown or missing shortener "type" ("${typeParam}"). Configured: ${Object.keys(apiConfig).join(", ")}`);
      showUnavailable();
      return;
    }

    const destination = DESTINATION_BASE + decoded;
    const shortUrl = buildShortUrl(provider, destination);
    showRedirecting(shortUrl);
    return;
  }

  // Case 2: ?o= present
  if (oParam !== null) {
    if (!isValidGiftCode(oParam)) {
      redirectTo404();
      return;
    }
    showSuccess(oParam);
    return;
  }

  // Case 3: neither present — friendly message instead of a 404
  showNoQuestCode();
}

main();
