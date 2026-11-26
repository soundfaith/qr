import "./style.css";
import QRCode from "qrcode";

const $ = (id) => document.getElementById(id);
const text = $("text"), canvas = $("canvas"), card = $("card");
const actions = $("actions"), copy = $("copy"), swatchBox = $("swatches");
const file = $("file"), thumb = $("thumb"), thumbWrap = $("thumbWrap"), toggle = $("toggle"), knob = $("knob");
const removeBtn = $("remove"), uploadBtn = $("upload");
const clearBtn = $("clear"), about = $("about"), copyLabel = $("copyLabel"), copyIcon = $("copyIcon");
const exportSuccess = $("exportSuccess");

const COLORS = ["#000000", "#4f46e5", "#059669", "#e11d48", "#d97706"];
const SAMPLE = "https://soundfaith.app";
const LOGO_RATIO = 0.23;
const COPY_ICONS = {
  copy: '<svg class="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="7" width="10" height="10" rx="2"/><path d="M13 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/></svg>',
  check: '<svg class="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m4 10 4 4 8-8"/></svg>',
  download: '<svg class="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3v10m-4-4 4 4 4-4M4 16v1h12v-1"/></svg>',
};
let color = COLORS[0];
let logo = null; // { src, img }
let showLogo = false;

const value = () => text.value.trim();
const logoOn = () => showLogo && logo;
const opts = (width, margin = 0) => ({
  margin,
  width,
  errorCorrectionLevel: logoOn() ? "H" : "M",
  color: { dark: color, light: "#ffffff" },
});

function drawLogo(ctx, size) {
  const box = size * LOGO_RATIO;
  const pad = box * 0.14;
  const x = (size - box) / 2;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(x - pad, x - pad, box + pad * 2, box + pad * 2, box * 0.2);
  ctx.fill();
  const r = Math.min(box / logo.img.width, box / logo.img.height);
  const w = logo.img.width * r, h = logo.img.height * r;
  ctx.drawImage(logo.img, (size - w) / 2, (size - h) / 2, w, h);
}

async function draw(target, size, margin, content) {
  await QRCode.toCanvas(target, content, opts(size, margin));
  // the library forces fixed pixel sizes inline; let CSS control the display size
  target.style.width = "";
  target.style.height = "";
  if (logoOn()) drawLogo(target.getContext("2d"), target.width);
}

function setActive(on) {
  card.classList.toggle("opacity-30", !on);
  actions.classList.toggle("max-h-0", !on);
  actions.classList.toggle("max-h-96", on);
  actions.classList.toggle("opacity-0", !on);
  actions.classList.toggle("opacity-100", on);
  actions.classList.toggle("pointer-events-none", !on);
}

async function render() {
  const has = value().length > 0;
  setActive(has);
  try {
    await draw(canvas, 576, 0, has ? value() : SAMPLE);
  } catch {
    setActive(false);
  }
}

function grow() {
  text.style.height = "auto";
  text.style.height = text.scrollHeight + "px";
}

function paintSwatches() {
  swatchBox.innerHTML = "";
  for (const c of COLORS) {
    const b = document.createElement("button");
    b.setAttribute("aria-label", `Color ${c}`);
    b.style.backgroundColor = c;
    b.className =
      "h-5 w-5 rounded-full ring-1 ring-white/20 transition hover:scale-110 " +
      (c === color ? "ring-2 ring-offset-2 ring-offset-stone-50 !ring-accent dark:ring-offset-stone-950" : "");
    b.onclick = () => {
      color = c;
      paintSwatches();
      render();
    };
    swatchBox.append(b);
  }
}

function paintLogoControls() {
  const has = !!logo;
  thumbWrap.classList.toggle("hidden", !has);
  removeBtn.classList.toggle("hidden", !has);
  toggle.classList.toggle("hidden", !has);
  uploadBtn.textContent = has ? "Replace" : "Center logo";
  toggle.setAttribute("aria-checked", String(showLogo));
  knob.style.transform = showLogo ? "translateX(1rem)" : "";
  if (has) thumb.src = logo.src;
}

function download(href, name) {
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  a.click();
  setTimeout(() => { if (href.startsWith("blob:")) URL.revokeObjectURL(href); }, 1000);
}

function revealAbout(shouldScroll = false) {
  const isNewlyRevealed = shouldScroll && about.hidden;
  localStorage.setItem("soundfaith_qr_exported", "true");
  about.setAttribute("aria-hidden", "false");
  const show = () => {
    about.classList.remove("max-h-0", "border-stone-200/0", "dark:border-stone-800/0", "opacity-0");
    about.classList.add("max-h-96", "border-stone-200", "dark:border-stone-800", "opacity-100");
  };
  if (about.hidden) {
    about.hidden = false;
    requestAnimationFrame(show);
  } else show();
  if (isNewlyRevealed) {
    let scrollTimer;
    const scrollToFooter = () => {
      clearTimeout(scrollTimer);
      about.removeEventListener("transitionend", onRevealEnd);
      about.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    };
    const onRevealEnd = (event) => {
      if (event.target === about && event.propertyName === "max-height") scrollToFooter();
    };
    about.addEventListener("transitionend", onRevealEnd);
    scrollTimer = setTimeout(scrollToFooter, 600);
  }
}

let successTimer, successHideTimer;
function exportSucceeded() {
  revealAbout(true);
  if (localStorage.getItem("soundfaith_qr_success_shown") === "true") return;
  localStorage.setItem("soundfaith_qr_success_shown", "true");
  clearTimeout(successTimer);
  clearTimeout(successHideTimer);
  exportSuccess.hidden = false;
  requestAnimationFrame(() => exportSuccess.classList.remove("translate-y-2", "opacity-0"));
  successTimer = setTimeout(() => {
    exportSuccess.classList.add("translate-y-2", "opacity-0");
    successHideTimer = setTimeout(() => { exportSuccess.hidden = true; }, 300);
  }, 3200);
}

function syncClear() {
  clearBtn.classList.toggle("hidden", !text.value);
  clearBtn.classList.toggle("grid", !!text.value);
}


const pngBlob = async () => {
  const c = document.createElement("canvas");
  await draw(c, 1024, 2, value());
  return new Promise((res) => c.toBlob(res, "image/png"));
};

let copyTimer;
copy.onclick = async () => {
  try {
    const blob = await pngBlob();
    if (!blob) throw new Error("PNG generation failed");
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    copyLabel.textContent = "Copied!";
    copyIcon.innerHTML = COPY_ICONS.check;
    exportSucceeded();
  } catch {
    try {
      const blob = await pngBlob();
      if (!blob) throw new Error("PNG generation failed");
      download(URL.createObjectURL(blob), "qr.png");
      copyLabel.textContent = "Downloaded PNG";
      exportSucceeded();
    } catch {
      copyLabel.textContent = "Copy unavailable";
    }
    copyIcon.innerHTML = COPY_ICONS.download;
  }
  clearTimeout(copyTimer);
  copyTimer = setTimeout(() => { copyLabel.textContent = "Copy image"; copyIcon.innerHTML = COPY_ICONS.copy; }, 1800);
};

$("png").onclick = async () => {
  try {
    const blob = await pngBlob();
    if (!blob) throw new Error("PNG generation failed");
    download(URL.createObjectURL(blob), "qr.png");
    exportSucceeded();
  } catch { /* Keep the current screen if PNG generation fails. */ }
};

$("svg").onclick = async () => {
  try {
  let s = await QRCode.toString(value(), { ...opts(0, 2), type: "svg" });
  if (logoOn()) {
    const n = parseFloat(s.match(/viewBox="0 0 (\d+)/)[1]);
    const box = n * LOGO_RATIO, pad = box * 0.14, x = (n - box) / 2;
    s = s.replace(
      "</svg>",
      `<rect x="${x - pad}" y="${x - pad}" width="${box + pad * 2}" height="${box + pad * 2}" rx="${box * 0.2}" fill="#fff"/>` +
        `<image href="${logo.src}" x="${x}" y="${x}" width="${box}" height="${box}" preserveAspectRatio="xMidYMid meet"/></svg>`
    );
  }
  const url = URL.createObjectURL(new Blob([s], { type: "image/svg+xml" }));
  download(url, "qr.svg");
  exportSucceeded();
  } catch { /* Keep the current screen if SVG generation fails. */ }
};

uploadBtn.onclick = () => file.click();
file.onchange = () => {
  const f = file.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      logo = { src: reader.result, img };
      showLogo = true;
      paintLogoControls();
      render();
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(f);
  file.value = "";
};
toggle.onclick = () => {
  showLogo = !showLogo;
  paintLogoControls();
  render();
};
removeBtn.onclick = () => {
  logo = null;
  showLogo = false;
  paintLogoControls();
  render();
};

$("theme").onclick = () => {
  const dark = document.documentElement.classList.toggle("dark");
  localStorage.setItem("theme", dark ? "dark" : "light");
};

text.addEventListener("input", () => {
  grow();
  syncClear();
  render();
});

paintSwatches();
paintLogoControls();
grow();
render();
syncClear();
if (localStorage.getItem("soundfaith_qr_exported") === "true") revealAbout();

text.addEventListener("focus", () => { if (text.value) text.select(); });
clearBtn.onclick = () => { text.value = ""; syncClear(); grow(); render(); text.focus(); };
