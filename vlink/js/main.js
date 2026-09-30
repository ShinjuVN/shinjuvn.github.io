/* /vlink — 3 states based on URL query params:
 *   ?i=<base64>  -> decode, must be exactly 10 chars -> redirect through
 *                   Link4M (ad-gated shortener) to this same page with
 *                   ?o=<code> instead. Invalid -> "task unavailable" message.
 *   ?o=<code>    -> must be exactly 10 letters (a-zA-Z) -> show the
 *                   "/gift <code>" copy button. Invalid -> redirect to 404.
 *   neither      -> redirect to 404 immediately.
 *
 * Uses Link4M's plain redirect endpoint (/st?api=...&url=...) rather
 * than its JSON API (/api-shorten/v2) — the JSON API needs a fetch()
 * call, which a shortener service may not enable CORS for from an
 * arbitrary GitHub Pages origin. A plain top-level navigation is never
 * subject to CORS at all, so it works reliably on a static host with
 * no backend to proxy the request through.
 */

// Replace with your real Link4M API token from your Link4M dashboard —
// the example token in Link4M's own docs is not a working credential.
const LINK4M_API_TOKEN = "6abc4a6ad55fa23da3099cb1";

// Where the Link4M redirect should eventually land — derived
// automatically from this page's own URL, so it's always correct
// wherever the site is actually hosted. Override this line instead if
// you ever need a different, hardcoded base.
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
      <h1 class="msg-title">Nhận quà thành công!</h1>
      <p class="msg-sub">Dùng lệnh sau trong Server để nhận quà của bạn :3</p>
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

function main() {
  const iParam = getParam("i");
  const oParam = getParam("o");

  // Case 1: ?i= present (checked first, takes priority over ?o=)
  if (iParam !== null) {
    const decoded = base64Decode(iParam);
    if (!decoded || decoded.length !== 10) {
      showUnavailable();
      return;
    }
    const destination = DESTINATION_BASE + decoded;
    const shortUrl = `https://link4m.co/st?api=${LINK4M_API_TOKEN}&url=${encodeURIComponent(destination)}`;
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

  // Case 3: neither present
  redirectTo404();
}

main();
