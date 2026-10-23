/* ════════════════════════════════════════════════════════════
   Portfolio interactions: network background, cursor ring,
   terminal, projects slideshow, copy-email.
   ════════════════════════════════════════════════════════════ */

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(pointer: fine)").matches;
const MINT = [79, 227, 193];
const INK = [160, 190, 230];
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const mix = (a, b, t) => a + (b - a) * t;

const pointer = { x: -9999, y: -9999, sx: -9999, sy: -9999, active: false };
window.addEventListener("pointermove", (e) => {
  pointer.x = e.clientX;
  pointer.y = e.clientY;
  if (!pointer.active) { pointer.sx = e.clientX; pointer.sy = e.clientY; pointer.active = true; }
}, { passive: true });
document.addEventListener("pointerleave", () => { pointer.active = false; });

// ── Network background ──────────────────────────────────────
// Drifting nodes link to their neighbours and to the cursor; packets
// travel along live links, like traffic across a monitored network.
const canvas = document.getElementById("net");
const ctx = canvas.getContext("2d");
const LINK = 135;
const CURSOR_LINK = 190;
let w = 0, h = 0, dpr = 1, nodes = [], packets = [];

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  w = window.innerWidth;
  h = window.innerHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const count = Math.min(Math.round((w * h) / 15000), 110);
  nodes = Array.from({ length: count }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    vx: (Math.random() - 0.5) * 0.22,
    vy: (Math.random() - 0.5) * 0.22,
  }));
  packets = [];
  if (reducedMotion) draw();
}

function step() {
  for (const n of nodes) {
    n.x += n.vx;
    n.y += n.vy;
    if (n.x < -20) n.x = w + 20; else if (n.x > w + 20) n.x = -20;
    if (n.y < -20) n.y = h + 20; else if (n.y > h + 20) n.y = -20;
  }
  for (const p of packets) p.t += p.speed;
  packets = packets.filter((p) => p.t < 1);
}

function draw() {
  ctx.clearRect(0, 0, w, h);
  const px = pointer.sx, py = pointer.sy;
  const cursorOn = pointer.active && finePointer && !reducedMotion;

  if (cursorOn) {
    const g = ctx.createRadialGradient(px, py, 0, px, py, 260);
    g.addColorStop(0, rgba(MINT, 0.06));
    g.addColorStop(1, rgba(MINT, 0));
    ctx.fillStyle = g;
    ctx.fillRect(px - 260, py - 260, 520, 520);
  }

  const links = [];
  ctx.lineWidth = 1;
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i];
    for (let j = i + 1; j < nodes.length; j++) {
      const b = nodes[j];
      const dx = a.x - b.x, dy = a.y - b.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < LINK * LINK) {
        const t = 1 - Math.sqrt(d2) / LINK;
        ctx.strokeStyle = rgba(INK, t * 0.13);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        links.push([a, b]);
      }
    }
  }

  for (const n of nodes) {
    let lit = 0;
    if (cursorOn) {
      const d = Math.hypot(n.x - px, n.y - py);
      if (d < CURSOR_LINK) {
        lit = 1 - d / CURSOR_LINK;
        ctx.strokeStyle = rgba(MINT, lit * 0.45);
        ctx.beginPath();
        ctx.moveTo(n.x, n.y);
        ctx.lineTo(px, py);
        ctx.stroke();
      }
    }
    ctx.fillStyle = lit ? rgba(MINT, 0.35 + lit * 0.6) : rgba(INK, 0.32);
    ctx.beginPath();
    ctx.arc(n.x, n.y, 1.3 + lit * 1.4, 0, Math.PI * 2);
    ctx.fill();
  }

  if (!reducedMotion && links.length && packets.length < 14 && Math.random() < 0.08) {
    const [a, b] = links[Math.floor(Math.random() * links.length)];
    packets.push({ a, b, t: 0, speed: 0.008 + Math.random() * 0.01 });
  }
  for (const p of packets) {
    const x = mix(p.a.x, p.b.x, p.t), y = mix(p.a.y, p.b.y, p.t);
    ctx.fillStyle = rgba(MINT, 0.85 * Math.sin(Math.PI * p.t));
    ctx.beginPath();
    ctx.arc(x, y, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Cursor ring ─────────────────────────────────────────────
const ring = document.getElementById("cursor-ring");
const ringPos = { x: -100, y: -100 };
if (finePointer && !reducedMotion) {
  document.documentElement.classList.add("has-cursor-ring");
  document.addEventListener("pointerover", (e) => {
    const interactive = !!e.target.closest("a, button, input, [role='button']");
    const onTrack = !interactive && !!e.target.closest(".show-track");
    ring.classList.toggle("is-hover", interactive);
    ring.classList.toggle("is-drag", onTrack);
  });
  document.addEventListener("pointerdown", () => ring.classList.add("is-down"));
  document.addEventListener("pointerup", () => ring.classList.remove("is-down"));
}

function frame() {
  pointer.sx = mix(pointer.sx, pointer.x, 0.16);
  pointer.sy = mix(pointer.sy, pointer.y, 0.16);
  ringPos.x = mix(ringPos.x, pointer.x, 0.22);
  ringPos.y = mix(ringPos.y, pointer.y, 0.22);
  ring.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0)`;
  step();
  draw();
  requestAnimationFrame(frame);
}

window.addEventListener("resize", resize);
resize();
if (!reducedMotion) requestAnimationFrame(frame);

// ── Terminal ────────────────────────────────────────────────
const body = document.getElementById("term-body");
const form = document.getElementById("term-form");
const input = document.getElementById("term-cmd");

const COMMANDS = {
  help: () => [
    "Available commands:",
    "  <span class='k'>whoami</span>      who I am",
    "  <span class='k'>focus</span>       roles I'm targeting",
    "  <span class='k'>experience</span>  where I've worked",
    "  <span class='k'>projects</span>    selected work",
    "  <span class='k'>certs</span>       certifications",
    "  <span class='k'>education</span>   degrees",
    "  <span class='k'>contact</span>     how to reach me",
    "  <span class='k'>clear</span>       clear the screen",
  ],
  whoami: () => [
    "<span class='k'>Muhammad Zubair Najam</span>",
    "BS Computer Science · FAST-NUCES · <span class='a'>Class of 2027</span>",
    "<span class='d'>Software, AI and GenAI, automation, QA and security.</span>",
  ],
  focus: () => [
    "<span class='k'>[1]</span> Software engineering",
    "<span class='k'>[2]</span> AI · GenAI · Agentic AI",
    "<span class='k'>[3]</span> Automation",
    "<span class='k'>[4]</span> QA and testing",
    "<span class='k'>[5]</span> Cybersecurity and SOC",
    "<span class='k'>[6]</span> Data loss prevention",
    "<span class='d'>status:</span> <span class='a'>open to internships and graduate roles</span>",
  ],
  experience: () => [
    "<span class='a'>2025 to now</span>  App Tester at 9D Technologies",
    "<span class='a'>2025</span>         SOC Intern at Secure Dev Labs",
    "<span class='a'>2024</span>         Patient Enrollment Specialist at Ibex",
  ],
  projects: () => [
    "<span class='k'>fingerdetect</span>  CV + ML · webcam accuracy 89.6% → 96.2%",
    "<span class='k'>vidmind</span>       RAG over YouTube transcripts (LangChain, FAISS)",
    "<span class='k'>shadow-state</span>  online Mafia game, the server runs the rules",
    "<span class='k'>soc-lab</span>       Wazuh SIEM across Ubuntu + Windows",
    "<span class='d'>→ scroll to <a href='#projects'>projects</a> for more</span>",
  ],
  certs: () => [
    "<span class='k'>[x]</span> Google Cybersecurity Professional Certificate",
    "<span class='k'>[x]</span> TryHackMe · SOC Level 1",
    "<span class='k'>[x]</span> Cisco NetAcad · Intro to Cybersecurity, Networking Basics",
    "<span class='a'>[~]</span> TryHackMe · AI Security <span class='d'>(~70%)</span>",
  ],
  education: () => [
    "BS Computer Science · FAST-NUCES · <span class='a'>2027</span>",
    "CAIE O &amp; A Levels · Generation's School, Karachi · <span class='a'>2023</span>",
  ],
  contact: () => [
    "email     <a href='mailto:zubairnajam18@gmail.com'>zubairnajam18@gmail.com</a>",
    "linkedin  <a href='https://www.linkedin.com/in/zubair-najam' target='_blank' rel='noopener'>in/zubair-najam</a>",
    "github    <a href='https://github.com/zubairnajam' target='_blank' rel='noopener'>zubairnajam</a>",
  ],
};

function addLine(html, cls = "term-out") {
  const div = document.createElement("div");
  div.className = `term-line ${cls}`;
  div.innerHTML = html;
  body.appendChild(div);
  body.scrollTop = body.scrollHeight;
  return div;
}

function addCommandLine(text) {
  const div = document.createElement("div");
  div.className = "term-line term-cmd";
  div.textContent = text;               // user input is never parsed as HTML
  body.appendChild(div);
  return div;
}

function run(raw) {
  const cmd = raw.trim().toLowerCase();
  if (!cmd) return;
  addCommandLine(raw.trim());
  if (cmd === "clear") { body.innerHTML = ""; return; }
  const out = COMMANDS[cmd];
  if (out) out().forEach((l) => addLine(l));
  else {
    const line = addLine("");
    line.append(`command not found: ${raw.trim()}. Try `);
    const k = document.createElement("span");
    k.className = "k";
    k.textContent = "help";
    line.append(k);
  }
  const gap = document.createElement("div");
  gap.className = "term-gap";
  body.appendChild(gap);
  body.scrollTop = body.scrollHeight;
}

let typing = false;
async function typeAndRun(cmd) {
  if (typing) return;
  typing = true;
  const line = addCommandLine("");
  const caret = document.createElement("span");
  caret.className = "caret";
  line.appendChild(caret);
  if (!reducedMotion) {
    for (const ch of cmd) {
      caret.before(ch);
      await new Promise((r) => setTimeout(r, 55 + Math.random() * 45));
    }
    await new Promise((r) => setTimeout(r, 180));
  }
  line.remove();
  run(cmd);
  typing = false;
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  run(input.value);
  input.value = "";
});
document.getElementById("term-chips").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-cmd]");
  if (btn) typeAndRun(btn.dataset.cmd);
});

(async () => {
  addLine("<span class='d'>Interactive profile. Type</span> <span class='k'>help</span> <span class='d'>or tap a command.</span>");
  body.appendChild(Object.assign(document.createElement("div"), { className: "term-gap" }));
  await typeAndRun("whoami");
  await new Promise((r) => setTimeout(r, 500));
  await typeAndRun("focus");
})();

// ── Escape Grid illustration ────────────────────────────────
// Runs a real A* search on a small maze and animates the explored
// cells in visit order, then draws the path it found.
(() => {
  const svg = document.getElementById("viz-grid");
  const NS = "http://www.w3.org/2000/svg";
  const COLS = 14, ROWS = 9, S = 24, X0 = 20, Y0 = 46, STEP_MS = 45;
  const walls = new Set();
  for (let r = 0; r <= 5; r++) walls.add(`4,${r}`);
  for (let r = 3; r <= 8; r++) walls.add(`9,${r}`);
  ["6,2", "7,2", "11,1", "12,1", "6,6", "7,6", "2,4", "11,4", "12,4"].forEach((k) => walls.add(k));
  const start = [1, 1], goal = [12, 7];

  const key = (c, r) => `${c},${r}`;
  const hScore = (c, r) => Math.abs(c - goal[0]) + Math.abs(r - goal[1]);
  const open = [{ c: start[0], r: start[1], g: 0, f: hScore(...start) }];
  const came = new Map(), gBest = new Map([[key(...start), 0]]), closed = new Set(), order = [];
  while (open.length) {
    open.sort((a, b) => a.f - b.f || b.g - a.g);
    const cur = open.shift();
    const k = key(cur.c, cur.r);
    if (closed.has(k)) continue;
    closed.add(k);
    order.push([cur.c, cur.r]);
    if (cur.c === goal[0] && cur.r === goal[1]) break;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const c = cur.c + dc, r = cur.r + dr, nk = key(c, r);
      if (c < 0 || r < 0 || c >= COLS || r >= ROWS || walls.has(nk) || closed.has(nk)) continue;
      const g = cur.g + 1;
      if (g < (gBest.get(nk) ?? Infinity)) {
        gBest.set(nk, g);
        came.set(nk, k);
        open.push({ c, r, g, f: g + hScore(c, r) });
      }
    }
  }
  const path = [];
  for (let k = key(...goal); k; k = came.get(k)) path.unshift(k.split(",").map(Number));

  const el = (tag, attrs, text) => {
    const n = document.createElementNS(NS, tag);
    for (const [a, v] of Object.entries(attrs)) n.setAttribute(a, v);
    if (text) n.textContent = text;
    svg.appendChild(n);
    return n;
  };
  const cx = (c) => X0 + c * S + S / 2, cy = (r) => Y0 + r * S + S / 2;

  el("text", { x: 20, y: 30, class: "t-mint" }, "A*  f = g + h");
  el("text", { x: 356, y: 30, class: "t-3 sm", "text-anchor": "end" }, "energy-constrained grid");
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      el("rect", { x: X0 + c * S, y: Y0 + r * S, width: S, height: S, class: walls.has(key(c, r)) ? "wall" : "cell" });
    }
  }
  order.forEach(([c, r], i) => {
    el("rect", { x: X0 + c * S + 2, y: Y0 + r * S + 2, width: S - 4, height: S - 4, rx: 3, class: "ex", style: `animation-delay:${i * STEP_MS}ms` });
  });
  el("polyline", {
    points: path.map(([c, r]) => `${cx(c)},${cy(r)}`).join(" "),
    pathLength: 1, class: "route", style: `animation-delay:${order.length * STEP_MS + 150}ms`,
  });
  el("circle", { cx: cx(start[0]), cy: cy(start[1]), r: 6, class: "start" });
  el("rect", { x: X0 + goal[0] * S + 4, y: Y0 + goal[1] * S + 4, width: S - 8, height: S - 8, rx: 3, class: "goal" });

  [["BFS", 46], ["DFS", 76], ["A*", 106]].forEach(([name, y]) => {
    const on = name === "A*";
    el("rect", { x: 372, y, width: 88, height: 22, rx: 11, class: on ? "pill on" : "pill" });
    el("text", { x: 416, y: y + 15, class: on ? "sm pill-on-text" : "sm t-3", "text-anchor": "middle" }, name);
  });
  el("text", { x: 372, y: 160, class: "t-3 sm" }, "explored");
  el("text", { x: 372, y: 178, class: "t-1" }, String(order.length));
  el("text", { x: 372, y: 204, class: "t-3 sm" }, "path cost");
  el("text", { x: 372, y: 222, class: "t-1" }, String(path.length - 1));
  el("text", { x: 372, y: 248, class: "t-3 sm" }, "energy");
  el("rect", { x: 372, y: 256, width: 88, height: 6, rx: 3, class: "bar-bg" });
  el("rect", { x: 372, y: 256, width: 88 * 0.62, height: 6, rx: 3, class: "bar-amber" });
})();

// ── Projects carousel ───────────────────────────────────────
// A horizontal scroll-snap track. Touch and trackpads scroll it
// natively; a mouse can drag it; arrows, keys and the project index
// jump to a card. The current card is whichever is nearest its snap point.
const track = document.getElementById("show-track");
const slides = [...track.querySelectorAll(".slide")];
const indexBtns = [...document.querySelectorAll(".show-index button")];
const showCount = document.getElementById("show-count");
const thumb = document.getElementById("show-thumb");
const prevBtn = document.getElementById("show-prev");
const nextBtn = document.getElementById("show-next");
const pad = (n) => String(n).padStart(2, "0");
let current = -1;

const maxScroll = () => track.scrollWidth - track.clientWidth;
const snapFor = (i) => Math.min(slides[i].offsetLeft - slides[0].offsetLeft, maxScroll());

function setCurrent(i) {
  if (i === current) return;
  current = i;
  slides.forEach((s, k) => s.classList.toggle("is-active", k === i));
  indexBtns.forEach((b, k) => {
    b.classList.toggle("is-active", k === i);
    b.setAttribute("aria-current", String(k === i));
  });
  showCount.innerHTML = `<b>${pad(i + 1)}</b> / ${pad(slides.length)}`;
}

function go(i) {
  i = Math.max(0, Math.min(slides.length - 1, i));
  track.scrollTo({ left: snapFor(i), behavior: reducedMotion ? "auto" : "smooth" });
  setCurrent(i);
}

function syncTrack() {
  const x = track.scrollLeft, max = maxScroll();
  if (!drag) {
    let best = 0;
    slides.forEach((_, k) => { if (Math.abs(snapFor(k) - x) < Math.abs(snapFor(best) - x)) best = k; });
    setCurrent(best);
  }
  // Scrollbar-style thumb: its width is the visible share of the track.
  const share = track.clientWidth / track.scrollWidth;
  thumb.style.width = `${share * 100}%`;
  thumb.style.transform = `translateX(${max ? (x / max) * (1 / share - 1) * 100 : 0}%)`;
  prevBtn.disabled = x <= 2;
  nextBtn.disabled = x >= max - 2;
}

let drag = null, suppressClick = false;
track.addEventListener("pointerdown", (e) => {
  if (e.pointerType !== "mouse" || e.button !== 0) return;
  drag = { x: e.clientX, left: track.scrollLeft, start: current, moved: false };
});
window.addEventListener("pointermove", (e) => {
  if (!drag) return;
  const dx = e.clientX - drag.x;
  if (!drag.moved && Math.abs(dx) > 5) { drag.moved = true; track.classList.add("is-dragging"); }
  if (drag.moved) track.scrollLeft = drag.left - dx;
});
window.addEventListener("pointerup", (e) => {
  if (!drag) return;
  const { moved, start, x } = drag;
  drag = null;
  if (!moved) return;
  track.classList.remove("is-dragging");
  suppressClick = true;
  setTimeout(() => { suppressClick = false; });
  // A short flick still moves one card; a long drag lands on the nearest.
  const dx = e.clientX - x;
  const near = slides.reduce((b, _, k) => (Math.abs(snapFor(k) - track.scrollLeft) < Math.abs(snapFor(b) - track.scrollLeft) ? k : b), 0);
  go(near === start && Math.abs(dx) > 60 ? start + (dx < 0 ? 1 : -1) : near);
});
track.addEventListener("dragstart", (e) => e.preventDefault());

// Clicking a dimmed card brings it forward instead of following its links.
track.addEventListener("click", (e) => {
  if (suppressClick) { e.preventDefault(); e.stopPropagation(); return; }
  const slide = e.target.closest(".slide");
  if (slide && !slide.classList.contains("is-active")) {
    e.preventDefault();
    go(slides.indexOf(slide));
  }
}, true);

track.addEventListener("keydown", (e) => {
  const moves = { ArrowRight: 1, ArrowLeft: -1, Home: -current, End: slides.length - 1 - current };
  if (!(e.key in moves)) return;
  e.preventDefault();
  go(current + moves[e.key]);
});

// Soft spotlight that follows the pointer across the active visual.
track.addEventListener("pointermove", (e) => {
  const v = e.target.closest(".slide.is-active .slide-visual");
  if (!v) return;
  const r = v.getBoundingClientRect();
  v.style.setProperty("--mx", `${e.clientX - r.left}px`);
  v.style.setProperty("--my", `${e.clientY - r.top}px`);
});

prevBtn.addEventListener("click", () => go(current - 1));
nextBtn.addEventListener("click", () => go(current + 1));
indexBtns.forEach((b, k) => b.addEventListener("click", () => go(k)));
track.addEventListener("scroll", syncTrack, { passive: true });
window.addEventListener("resize", syncTrack);

if (reducedMotion) document.querySelectorAll(".viz").forEach((svg) => svg.pauseAnimations());
setCurrent(0);
syncTrack();

// ── Copy email ──────────────────────────────────────────────
const copyBtn = document.getElementById("email-copy");
const copyState = document.getElementById("copy-state");
copyBtn.addEventListener("click", async () => {
  const email = copyBtn.dataset.email;
  try {
    await navigator.clipboard.writeText(email);
    copyState.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-check"/></svg>Copied';
    setTimeout(() => {
      copyState.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-copy"/></svg>Copy';
    }, 1800);
  } catch {
    window.location.href = `mailto:${email}`;
  }
});

// ── Nav state, reveal on scroll, year ───────────────────────
const nav = document.getElementById("nav");
const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 40);
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

const navLinks = [...document.querySelectorAll(".nav-links a")];
const sectionObserver = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    navLinks.forEach((a) => a.classList.toggle("is-current", a.getAttribute("href") === `#${entry.target.id}`));
  }
}, { rootMargin: "-45% 0px -50% 0px" });
document.querySelectorAll("main section[id]").forEach((s) => sectionObserver.observe(s));

const reveal = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      reveal.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll("[data-animate]").forEach((el) => reveal.observe(el));

document.getElementById("year").textContent = new Date().getFullYear();
