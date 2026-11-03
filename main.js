import "./style.css";
import QRCode from "qrcode";

const $ = (id) => document.getElementById(id);
const text = $("text"), fg = $("fg"), bg = $("bg");
const canvas = $("canvas"), empty = $("empty");
const png = $("png"), svg = $("svg");

const opts = () => ({ margin: 2, errorCorrectionLevel: "M", color: { dark: fg.value, light: bg.value } });

async function render() {
  const value = text.value.trim();
  const has = value.length > 0;
  canvas.classList.toggle("hidden", !has);
  empty.classList.toggle("hidden", has);
  png.disabled = svg.disabled = !has;
  if (!has) return;
  try {
    await QRCode.toCanvas(canvas, value, { ...opts(), width: 280 });
  } catch {
    canvas.classList.add("hidden");
    empty.textContent = "Text is too long for a QR code";
    empty.classList.remove("hidden");
    png.disabled = svg.disabled = true;
  }
}

function download(href, name) {
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  a.click();
}

png.onclick = async () => {
  download(await QRCode.toDataURL(text.value.trim(), { ...opts(), width: 1024 }), "qr.png");
};

svg.onclick = async () => {
  const s = await QRCode.toString(text.value.trim(), { ...opts(), type: "svg" });
  const url = URL.createObjectURL(new Blob([s], { type: "image/svg+xml" }));
  download(url, "qr.svg");
  URL.revokeObjectURL(url);
};

[text, fg, bg].forEach((el) => el.addEventListener("input", render));
