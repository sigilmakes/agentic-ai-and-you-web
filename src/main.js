// WebGL retro starfield shader
(() => {
  const canvas = document.getElementById("backdrop");
  const gl = canvas.getContext("webgl", { antialias: false, depth: false, stencil: false, alpha: false });
  if (!gl) return;

  const prefersReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const renderScale = (window.devicePixelRatio || 1) < 1.5 ? 0.5 : 0.35;

  const vs = `
    attribute vec2 position;
    void main() { gl_Position = vec4(position, 0.0, 1.0); }
  `;

  const fs = `
{{SHADER_SOURCE}}
  `;

  function createShader(type, source) {
    const s = gl.createShader(type);
    gl.shaderSource(s, source);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(s));
      gl.deleteShader(s);
      return null;
    }
    return s;
  }

  const program = gl.createProgram();
  const vsCompiled = createShader(gl.VERTEX_SHADER, vs);
  const fsCompiled = createShader(gl.FRAGMENT_SHADER, fs);
  if (!vsCompiled || !fsCompiled) return;
  gl.attachShader(program, vsCompiled);
  gl.attachShader(program, fsCompiled);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);

  const posLoc = gl.getAttribLocation(program, "position");
  const resLoc = gl.getUniformLocation(program, "iResolution");
  const timeLoc = gl.getUniformLocation(program, "iTime");

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.max(1, Math.floor(w * renderScale));
    canvas.height = Math.max(1, Math.floor(h * renderScale));
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  window.addEventListener("resize", resize);
  resize();

  const start = performance.now();

  function render(now) {
    requestAnimationFrame(render);

    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(resLoc, canvas.width, canvas.height);
    gl.uniform1f(timeLoc, prefersReducedMotion ? 0 : (now - start) / 1000);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  requestAnimationFrame(render);
})();

// Deck scaling and navigation
const deck = document.querySelector(".deck");
const DECK_WIDTH = 1920;
const DECK_HEIGHT = 1080;

function scaleDeck() {
  const sx = window.innerWidth / DECK_WIDTH;
  const sy = window.innerHeight / DECK_HEIGHT;
  deck.style.transform = `translate(-50%, -50%) scale(${Math.min(sx, sy)})`;
}

window.addEventListener("resize", scaleDeck);
scaleDeck();

// Complexity stack: apply rotations from data-rot once on load.
document.querySelectorAll(".complexity-layer[data-rot]").forEach(el => {
  el.style.transform = `rotate(${el.dataset.rot}deg)`;
});

const slides = Array.from(document.querySelectorAll(".slide"));
let slideIndex = 0;
let stepIndex = 0;

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function stepNumber(s, i) {
  const n = Number.parseInt(s.dataset.step, 10);
  return Number.isNaN(n) ? i + 1 : n;
}

function stepCountFor(steps) {
  const nums = steps.map(stepNumber);
  return nums.length ? Math.max(...nums) : 0;
}

function applySteps(slide) {
  const steps = Array.from(slide.querySelectorAll(".step"));
  steps.forEach((s, i) => s.classList.toggle("hidden", stepNumber(s, i) > stepIndex));
  return stepCountFor(steps);
}

function showSlide(index, shouldUpdateHash = true) {
  slideIndex = clamp(index, 0, slides.length - 1);
  slides.forEach((s, i) => s.classList.toggle("active", i === slideIndex));
  const stepCount = applySteps(slides[slideIndex]);
  stepIndex = clamp(stepIndex, 0, stepCount);
  applySteps(slides[slideIndex]);
  if (shouldUpdateHash) updateHash();
}

function updateHash() {
  const n = slides[slideIndex].dataset.slide;
  history.replaceState(null, "", `#${n}`);
}

function parseHash(raw) {
  const n = Number.parseInt(raw, 10);
  const idx = Number.isNaN(n) ? 0 : slides.findIndex(s => Number(s.dataset.slide) === n);
  return idx === -1 ? 0 : idx;
}

function syncFromHash() {
  showSlide(parseHash(window.location.hash.replace("#", "")), false);
}

function next(shouldUpdateHash = true) {
  const steps = Array.from(slides[slideIndex].querySelectorAll(".step"));
  const count = stepCountFor(steps);
  if (stepIndex < count) {
    stepIndex += 1;
    applySteps(slides[slideIndex]);
    if (shouldUpdateHash) updateHash();
    return;
  }
  if (slideIndex >= slides.length - 1) return;
  stepIndex = 0;
  showSlide(slideIndex + 1, shouldUpdateHash);
}

function prev(shouldUpdateHash = true) {
  if (stepIndex > 0) {
    stepIndex -= 1;
    applySteps(slides[slideIndex]);
    if (shouldUpdateHash) updateHash();
    return;
  }
  slideIndex = clamp(slideIndex - 1, 0, slides.length - 1);
  const steps = Array.from(slides[slideIndex].querySelectorAll(".step"));
  stepIndex = stepCountFor(steps);
  showSlide(slideIndex, shouldUpdateHash);
}

function first() { stepIndex = 0; showSlide(0); }
function last() { stepIndex = 0; showSlide(slides.length - 1); }

window.addEventListener("hashchange", syncFromHash);
window.addEventListener("keydown", e => {
  if (["ArrowRight", " ", "PageDown", "l", "j"].includes(e.key)) { e.preventDefault(); next(); }
  if (["ArrowLeft", "PageUp", "h", "k"].includes(e.key)) { e.preventDefault(); prev(); }
  if (e.key === "Home") { e.preventDefault(); first(); }
  if (e.key === "End") { e.preventDefault(); last(); }
});

let touchId = null, touchX = 0, touchY = 0;
document.addEventListener("touchstart", e => {
  if (e.touches.length !== 1) { touchId = null; return; }
  const t = e.changedTouches[0];
  touchId = t.identifier; touchX = t.clientX; touchY = t.clientY;
}, { passive: true });

document.addEventListener("touchend", e => {
  if (touchId === null) return;
  const t = Array.from(e.changedTouches).find(c => c.identifier === touchId);
  if (!t) return;
  const dx = t.clientX - touchX;
  const dy = t.clientY - touchY;
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.2) {
    dx < 0 ? next() : prev();
  } else if (Math.abs(dx) <= 12 && Math.abs(dy) <= 12) {
    t.clientX < window.innerWidth / 2 ? prev() : next();
  }
  touchId = null;
}, { passive: true });

document.addEventListener("touchcancel", () => touchId = null, { passive: true });

syncFromHash();
