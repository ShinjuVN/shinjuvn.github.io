/* Nền động bằng code thuần (canvas/CSS). Cấu hình ở site-settings.json → theme.
   Thêm data-manual vào thẻ <script> để KHÔNG tự chạy (dùng cho trang admin xem trước). */
(() => {
  const manual = document.currentScript && document.currentScript.hasAttribute("data-manual");
  const LIST = [["none", "Mặc định (ảnh nền hiện tại)"], ["stars", "Bầu trời sao + sao băng"], ["aurora", "Cực quang"], ["sakura", "Hoa anh đào rơi"], ["snow", "Tuyết rơi"], ["rain", "Mưa đêm"], ["fireflies", "Đom đóm"], ["bubbles", "Bong bóng"]];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const TAU = Math.PI * 2;

  const st = document.createElement("style");
  st.textContent = `.fx-canvas,.fx-aurora{position:fixed;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none}
.fx-canvas.in,.fx-aurora.in{position:absolute;z-index:0}
.fx-aurora{inset:-10%;width:120%;height:120%;filter:blur(50px);opacity:.6;animation:fx-au 22s ease-in-out infinite alternate;
background:radial-gradient(60% 50% at 20% 30%,rgba(60,220,180,.55),transparent 60%),radial-gradient(50% 60% at 80% 20%,rgba(120,90,255,.5),transparent 60%),radial-gradient(60% 50% at 50% 90%,rgba(40,140,255,.45),transparent 60%)}
.fx-aurora.in{inset:-10%}
@keyframes fx-au{to{transform:translate3d(4%,3%,0) scale(1.15) rotate(6deg)}}
@media (prefers-reduced-motion:reduce){.fx-aurora{animation:none}}`;
  document.head.appendChild(st);

  const glow = (() => { // sprite phát sáng cho đom đóm (vẽ 1 lần, dùng lại)
    const c = document.createElement("canvas"); c.width = c.height = 32; const g = c.getContext("2d");
    if (!g) return c;
    const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    gr.addColorStop(0, "rgba(220,255,140,1)"); gr.addColorStop(.3, "rgba(190,255,100,.5)"); gr.addColorStop(1, "rgba(190,255,100,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 32, 32); return c;
  })();

  const P = {
    stars: { n: 140,
      init(p, W, H) { p.x = rnd(0, W); p.y = rnd(0, H); p.r = rnd(.4, 1.6); p.ph = rnd(0, TAU); p.sp = rnd(.6, 2.2); },
      draw(g, p, t) { g.globalAlpha = .35 + .65 * Math.abs(Math.sin(t * p.sp + p.ph)); g.fillStyle = "#fff"; g.beginPath(); g.arc(p.x, p.y, p.r, 0, TAU); g.fill(); },
      extra(g, W, H, t, dt, s) { // sao băng thỉnh thoảng
        if (!s.s && ((s.cd = (s.cd ?? rnd(2, 5)) - dt) <= 0)) { s.s = { x: rnd(W * .2, W), y: rnd(0, H * .4), l: 0 }; s.cd = rnd(4, 9); }
        if (!s.s) return; const q = s.s; q.l += dt; q.x -= 700 * dt; q.y += 350 * dt;
        g.globalAlpha = Math.max(0, 1 - q.l / .9);
        const gr = g.createLinearGradient(q.x, q.y, q.x + 110, q.y - 55); gr.addColorStop(0, "#fff"); gr.addColorStop(1, "rgba(255,255,255,0)");
        g.strokeStyle = gr; g.lineWidth = 1.6; g.beginPath(); g.moveTo(q.x, q.y); g.lineTo(q.x + 110, q.y - 55); g.stroke();
        if (q.l > .9) s.s = null;
      } },
    snow: { n: 120,
      init(p, W, H) { p.x = rnd(0, W); p.y = rnd(0, H); p.r = rnd(1, 3); p.vy = rnd(20, 50); p.ph = rnd(0, TAU); p.dx = rnd(8, 20); },
      step(p, dt, W, H, t) { p.y += p.vy * dt; p.x += Math.sin(t + p.ph) * p.dx * dt; if (p.y > H + 5) { p.y = -5; p.x = rnd(0, W); } },
      draw(g, p) { g.globalAlpha = .85; g.fillStyle = "#fff"; g.beginPath(); g.arc(p.x, p.y, p.r, 0, TAU); g.fill(); } },
    sakura: { n: 45,
      init(p, W, H) { p.x = rnd(0, W); p.y = rnd(0, H); p.s = rnd(5, 10); p.vy = rnd(25, 55); p.ph = rnd(0, TAU); p.rot = rnd(0, TAU); p.vr = rnd(-1.5, 1.5); p.dx = rnd(15, 40); },
      step(p, dt, W, H, t) { p.y += p.vy * dt; p.x += (Math.sin(t * .8 + p.ph) * p.dx + 8) * dt; p.rot += p.vr * dt; if (p.y > H + 12 || p.x > W + 12) { p.y = -12; p.x = rnd(-20, W); } },
      draw(g, p) { g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.globalAlpha = .85; g.fillStyle = "#ffb7c5"; g.beginPath(); g.ellipse(0, 0, p.s, p.s * .55, 0, 0, TAU); g.fill(); g.restore(); } },
    rain: { n: 140,
      init(p, W, H) { p.x = rnd(0, W); p.y = rnd(0, H); p.len = rnd(10, 22); p.vy = rnd(500, 800); },
      step(p, dt, W, H) { p.y += p.vy * dt; p.x -= p.vy * .1 * dt; if (p.y > H + 5) { p.y = -p.len; p.x = rnd(0, W + 100); } },
      draw(g, p) { g.globalAlpha = .45; g.strokeStyle = "#aac8ff"; g.lineWidth = 1; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x + p.len * .1, p.y - p.len); g.stroke(); } },
    fireflies: { n: 40,
      init(p, W, H) { p.x = rnd(0, W); p.y = rnd(0, H); p.vx = rnd(-12, 12); p.vy = rnd(-12, 12); p.ph = rnd(0, TAU); p.s = rnd(6, 14); },
      step(p, dt, W, H, t) { p.x += (p.vx + Math.sin(t + p.ph) * 8) * dt; p.y += (p.vy + Math.cos(t * .7 + p.ph) * 8) * dt; if (p.x < -20) p.x = W + 20; if (p.x > W + 20) p.x = -20; if (p.y < -20) p.y = H + 20; if (p.y > H + 20) p.y = -20; },
      draw(g, p, t) { g.globalAlpha = .2 + .8 * Math.abs(Math.sin(t * .9 + p.ph)); g.drawImage(glow, p.x - p.s, p.y - p.s, p.s * 2, p.s * 2); } },
    bubbles: { n: 35,
      init(p, W, H) { p.x = rnd(0, W); p.y = rnd(0, H); p.r = rnd(4, 18); p.vy = rnd(15, 45); p.ph = rnd(0, TAU); },
      step(p, dt, W, H, t) { p.y -= p.vy * dt; p.x += Math.sin(t + p.ph) * 10 * dt; if (p.y < -p.r) { p.y = H + p.r; p.x = rnd(0, W); } },
      draw(g, p) { g.globalAlpha = 1; g.lineWidth = 1.2; g.strokeStyle = "rgba(180,225,255,.55)"; g.fillStyle = "rgba(180,225,255,.08)"; g.beginPath(); g.arc(p.x, p.y, p.r, 0, TAU); g.fill(); g.stroke(); } },
  };

  // host = phần tử chứa (xem trước); bỏ trống = phủ cả màn hình, nằm sau nội dung. Trả về hàm dừng.
  function mount(host, name) {
    if (name === "aurora") {
      const d = document.createElement("div"); d.className = "fx-aurora" + (host ? " in" : "");
      (host || document.body).prepend(d); return () => d.remove();
    }
    const def = P[name]; if (!def) return () => {};
    const cv = document.createElement("canvas"); cv.className = "fx-canvas" + (host ? " in" : "");
    (host || document.body).prepend(cv);
    const g = cv.getContext("2d"); let W, H, ps = [], raf, last = performance.now(), t = 0, off = false; const ex = {};
    const size = () => {
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      W = host ? host.clientWidth : innerWidth; H = host ? host.clientHeight : innerHeight;
      cv.width = W * dpr; cv.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const k = Math.min(1.2, Math.max(.4, (W * H) / 921600)) * (W < 700 ? .6 : 1); // máy nhỏ → ít hạt hơn
      ps = Array.from({ length: Math.round(def.n * k) }, () => { const p = {}; def.init(p, W, H); return p; });
    };
    const frame = (now) => {
      if (off) return;
      const dt = Math.min(.05, (now - last) / 1000); last = now; t += dt;
      g.clearRect(0, 0, W, H);
      for (const p of ps) { if (def.step && !reduce) def.step(p, dt, W, H, t); def.draw(g, p, t); }
      if (def.extra && !reduce) def.extra(g, W, H, t, dt, ex);
      g.globalAlpha = 1;
      if (!reduce && !document.hidden) raf = requestAnimationFrame(frame);
    };
    const vis = () => { if (!document.hidden && !reduce && !off) { last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); } };
    size(); raf = requestAnimationFrame(frame);
    addEventListener("resize", size); document.addEventListener("visibilitychange", vis);
    const ro = host && window.ResizeObserver ? new ResizeObserver(size) : null; if (ro) ro.observe(host);
    return () => { off = true; cancelAnimationFrame(raf); removeEventListener("resize", size); document.removeEventListener("visibilitychange", vis); if (ro) ro.disconnect(); cv.remove(); };
  }

  const pageKey = () => { const p = location.pathname; return p.startsWith("/post") ? "post" : p.startsWith("/download") ? "download" : p.startsWith("/channel") ? "channel" : p.startsWith("/donate") ? "donate" : "home"; };
  window.ShinjuTheme = { list: LIST, mount, pageKey };

  if (!manual) {
    fetch("/site-settings.json", { cache: "no-cache" }).then((r) => (r.ok ? r.json() : {})).then((s) => {
      const t = s.theme || {}; mount(null, (t.pages && t.pages[pageKey()]) || t.default || "none");
    }).catch(() => {});
  }
})();
