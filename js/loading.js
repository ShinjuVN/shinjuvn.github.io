/* loading.js — shared loading-screen controller.
   Include this once per page, right after the #site-loading markup,
   before the page's own main.js. It hides the overlay once every
   image it's told to wait for has finished loading.

   Works with ANY image format the background CSS uses — png, jpg,
   webp, or an animated gif — because it never assumes an extension;
   it just reads whatever URL getComputedStyle() reports for
   background-image and preloads that exact file. If you swap a bg
   image to .gif in the CSS, this keeps working with no code changes.
*/
(function () {
    const overlay = document.getElementById("site-loading");
    if (!overlay) return;

    const fill = overlay.querySelector(".site-loading-fill");
    const tasks = [];
    let finished = false;

    // --- Ambient glow + falling snow (pure code, no image assets) ---
    const glow = document.createElement("div");
    glow.className = "site-loading-glow";
    overlay.insertBefore(glow, overlay.firstChild);

    const snowLayer = document.createElement("div");
    snowLayer.className = "site-loading-snow";
    overlay.insertBefore(snowLayer, overlay.firstChild.nextSibling);

    const FLAKE_COUNT = 28;
    for (let i = 0; i < FLAKE_COUNT; i++) {
        const flake = document.createElement("span");
        flake.className = "snowflake";
        const size = (Math.random() * 3 + 2).toFixed(1); // 2–5px
        const left = (Math.random() * 100).toFixed(1); // 0–100%
        const duration = (Math.random() * 6 + 6).toFixed(1); // 6–12s
        const delay = (Math.random() * -12).toFixed(1); // stagger so they don't all start together
        const drift = (Math.random() * 60 - 30).toFixed(0) + "px"; // slight left/right sway
        const opacity = (Math.random() * 0.5 + 0.5).toFixed(2);
        flake.style.width = size + "px";
        flake.style.height = size + "px";
        flake.style.left = left + "%";
        flake.style.opacity = opacity;
        flake.style.animationDuration = duration + "s";
        flake.style.animationDelay = delay + "s";
        flake.style.setProperty("--drift", drift);
        snowLayer.appendChild(flake);
    }

    // Smooth "fake" progress while we wait, so the bar always feels alive
    // even though real byte-level download progress isn't available for
    // CSS background images.
    let fakeProgress = 0;
    const tick = setInterval(() => {
        fakeProgress = Math.min(fakeProgress + (90 - fakeProgress) * 0.12, 90);
        if (fill) fill.style.width = fakeProgress + "%";
    }, 120);

    function finish() {
        if (finished) return;
        finished = true;
        clearInterval(tick);
        if (fill) fill.style.width = "100%";
        setTimeout(() => {
            overlay.classList.add("site-loading--hide");
            setTimeout(() => overlay.remove(), 500);
        }, 200);
    }

    function loadImage(url) {
        return new Promise((resolve) => {
            if (!url) return resolve();
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => resolve(); // never block on a broken image
            img.src = url;
        });
    }

    // Whatever background-image the page's own CSS resolved to for the
    // current screen size (bgpc/bgpad/bgphone, any file extension).
    function currentBackgroundUrl() {
        const bg = getComputedStyle(document.body).backgroundImage;
        const match = bg && bg.match(/url\(["']?([^"')]+)["']?\)/);
        return match ? match[1] : null;
    }

    tasks.push(loadImage(currentBackgroundUrl()));

    window.SiteLoading = {
        // Page scripts call this for any extra image that loads
        // dynamically (e.g. the avatar, whose real src only becomes known
        // after data.json arrives).
        waitFor(url) {
            tasks.push(loadImage(url));
        },
        // Call once the page has queued everything above — resolves and
        // hides the overlay once all of it has loaded.
        ready() {
            Promise.all(tasks).then(finish);
        },
    };

    // Safety net: never block the page forever if something goes wrong.
    setTimeout(finish, 8000);
})();