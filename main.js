import "./style.css";
import QRCode from "qrcode";

const $ = (id) => document.getElementById(id);
const text = $("text"), canvas = $("canvas"), card = $("card");
const actions = $("actions"), copy = $("copy"), swatchBox = $("swatches");
const file = $("file"), thumb = $("thumb"), toggle = $("toggle"), knob = $("knob");
const removeBtn = $("remove"), uploadBtn = $("upload");

const COLORS = ["#000000", "#4f46e5", "#059669", "#e11d48", "#d97706"];
const SAMPLE = "https://soundfaith.app";
const LOGO_RATIO = 0.22;
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
  const pad = box * 0.12;
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
  actions.classList.toggle("opacity-0", !on);
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
  thumb.classList.toggle("hidden", !has);
  removeBtn.classList.toggle("hidden", !has);
  toggle.classList.toggle("hidden", !has);
  uploadBtn.textContent = has ? "Replace" : "Upload";
  toggle.setAttribute("aria-checked", String(showLogo));
  knob.style.transform = showLogo ? "translateX(1rem)" : "";
  if (has) thumb.src = logo.src;
}

function download(href, name) {
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  a.click();
}

const pngBlob = async () => {
  const c = document.createElement("canvas");
  await draw(c, 1024, 2, value());
  return new Promise((res) => c.toBlob(res, "image/png"));
};

copy.onclick = async () => {
  try {
    await navigator.clipboard.write([new ClipboardItem({ "image/png": pngBlob() })]);
    copy.textContent = "Copied ✓";
  } catch {
    copy.textContent = "Couldn't copy";
  }
  setTimeout(() => (copy.textContent = "Copy image"), 1800);
};

$("png").onclick = async () => {
  const url = URL.createObjectURL(await pngBlob());
  download(url, "qr.png");
  URL.revokeObjectURL(url);
};

$("svg").onclick = async () => {
  let s = await QRCode.toString(value(), { ...opts(0, 2), type: "svg" });
  if (logoOn()) {
    const n = parseFloat(s.match(/viewBox="0 0 (\d+)/)[1]);
    const box = n * LOGO_RATIO, pad = box * 0.12, x = (n - box) / 2;
    s = s.replace(
      "</svg>",
      `<rect x="${x - pad}" y="${x - pad}" width="${box + pad * 2}" height="${box + pad * 2}" rx="${box * 0.2}" fill="#fff"/>` +
        `<image href="${logo.src}" x="${x}" y="${x}" width="${box}" height="${box}" preserveAspectRatio="xMidYMid meet"/></svg>`
    );
  }
  const url = URL.createObjectURL(new Blob([s], { type: "image/svg+xml" }));
  download(url, "qr.svg");
  URL.revokeObjectURL(url);
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
  render();
});

paintSwatches();
paintLogoControls();
grow();
render();
