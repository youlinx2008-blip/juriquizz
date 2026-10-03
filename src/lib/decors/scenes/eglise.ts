/* Basilique : vitrail, colonnes romanes, chandelier. */
import { blocks, f1, flame, LG, particle, RG, SVGO, type Kit } from "./kit";

function leadGrid(x0: number, x1: number, y0: number, y1: number): string {
  let d = "";
  for (let y = y0; y <= y1; y += 20) d += `M${x0} ${y}H${x1}`;
  for (let x = x0; x <= x1; x += 16) d += `M${x} ${y0}V${y1}`;
  return `<path d="${d}" stroke="#0d0a1c" stroke-width="2.4" fill="none"/>`;
}

/** Fenêtre en lancette : verres colorés, résille de plomb et médaillons. */
function lancet(
  x0: number,
  ncol: number,
  y0: number,
  y1: number,
  pal: string[],
  border: string[],
  meds: number[],
  rad: number,
): string {
  let s = "";
  const w = 16;
  const h = 20;
  const rows = Math.ceil((y1 - y0) / h);
  const cx = x0 + (ncol * w) / 2;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < ncol; c++) {
      const m = Math.min(c, ncol - 1 - c);
      const col =
        c === 0 || c === ncol - 1 ? border[r % border.length] : pal[(r * 7 + m * 13 + (r >> 2)) % pal.length];
      s += `<rect x="${x0 + c * w}" y="${y0 + r * h}" width="${w}" height="${h}" fill="${col}"/>`;
    }
  s += leadGrid(x0, x0 + ncol * w, y0, y1);
  meds.forEach((md) => {
    s += `<circle cx="${cx}" cy="${md}" r="${rad}" fill="#173d85"/><circle cx="${cx}" cy="${md}" r="${rad}" fill="none" stroke="#d9a632" stroke-width="7"/><circle cx="${cx}" cy="${md}" r="${rad + 4}" fill="none" stroke="#0d0a1c" stroke-width="2.4"/><circle cx="${cx}" cy="${md}" r="${f1(rad * 0.64)}" fill="#b3243a" stroke="#0d0a1c" stroke-width="2"/><path d="M${cx} ${f1(md - rad * 0.5)} V${f1(md + rad * 0.5)} M${f1(cx - rad * 0.5)} ${md} H${f1(cx + rad * 0.5)}" stroke="#e8b84a" stroke-width="${f1(rad * 0.2)}"/><path d="M${cx} ${f1(md - rad * 0.5)} V${f1(md + rad * 0.5)} M${f1(cx - rad * 0.5)} ${md} H${f1(cx + rad * 0.5)}" stroke="#0d0a1c" stroke-width="1.4"/>`;
  });
  return s;
}

export function drawEglise(): string {
  const pal = [
    "#1f4fa8",
    "#173d85",
    "#2a62c8",
    "#1f4fa8",
    "#173d85",
    "#6a3aa0",
    "#2f8a5a",
    "#1f4fa8",
    "#b3243a",
    "#2a62c8",
    "#173d85",
  ];
  const pal2 = ["#8f1d30", "#b3243a", "#6a3aa0", "#8f1d30", "#d9a632", "#b3243a", "#1f4fa8"];
  const brd = ["#b3243a", "#d9a632"];
  let fl = "";
  let petals = "";
  let cand = "";
  for (let i = -12; i <= 12; i++) {
    const xb = 600 + i * 110;
    fl += `M${f1(600 + (xb - 600) * 0.643)} 700 L${xb} 800 `;
  }
  [712, 728, 750, 778].forEach((y) => {
    fl += `M0 ${y} H1200 `;
  });
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    petals += `<circle cx="${f1(972 + Math.cos(a) * 30)}" cy="${f1(96 + Math.sin(a) * 30)}" r="14" fill="${["#2a62c8", "#b3243a"][i % 2]}" stroke="#0d0a1c" stroke-width="3"/>`;
  }
  [
    [1000, 650],
    [970, 650],
    [1030, 650],
    [940, 650],
    [1060, 650],
    [985, 620],
    [1015, 620],
    [955, 620],
    [1045, 620],
    [1000, 590],
    [972, 590],
    [1028, 590],
  ].forEach((c) => {
    cand +=
      `<circle class="flicker" cx="${c[0]}" cy="${c[1] - 34}" r="26" fill="url(#egCand)"/><rect x="${c[0] - 3}" y="${c[1] - 26}" width="6" height="24" fill="#f3e6c8"/>` +
      flame(c[0], c[1] - 26, 0.45);
  });
  return (
    SVGO +
    "<defs>" +
    LG("egWall", 0, 0, 0, 1, [
      [0, "#2b2452"],
      [1, "#16122d"],
    ]) +
    LG("egCol", 0, 0, 1, 0, [
      [0, "#17132e"],
      [0.6, "#2a2450"],
      [0.86, "#4a4282"],
      [1, "#7a72b4"],
    ]) +
    LG("egFloor", 0, 0, 0, 1, [
      [0, "#2a2348"],
      [1, "#110d20"],
    ]) +
    LG("egB", 0, 0, 0, 1, [
      [0, "#7fb2ff", 0.34],
      [1, "#7fb2ff", 0],
    ]) +
    LG("egR", 0, 0, 0, 1, [
      [0, "#ff7a8a", 0.26],
      [1, "#ff7a8a", 0],
    ]) +
    LG("egG", 0, 0, 0, 1, [
      [0, "#ffd27a", 0.34],
      [1, "#ffd27a", 0],
    ]) +
    RG("egGlow", [
      [0, "#8fb8ff", 0.42],
      [1, "#8fb8ff", 0],
    ]) +
    RG("egCand", [
      [0, "#ffd27a", 0.7],
      [0.4, "#ffb347", 0.2],
      [1, "#ffb347", 0],
    ]) +
    RG("egBig", [
      [0, "#ffcf7a", 0.4],
      [1, "#ffcf7a", 0],
    ]) +
    LG("egShine", 0, 0, 1, 1, [
      [0, "#ffffff", 0],
      [0.5, "#ffffff", 0.18],
      [1, "#ffffff", 0],
    ]) +
    '<clipPath id="egL1"><path d="M900 520 V232 A72 72 0 0 1 1044 232 V520Z"/></clipPath><clipPath id="egL2"><path d="M1132 520 V262 A48 48 0 0 1 1228 262 V520Z"/></clipPath><clipPath id="egL0"><path d="M30 520 V270 A48 48 0 0 1 126 270 V520Z"/></clipPath>' +
    "</defs>" +
    '<rect x="0" y="0" width="1200" height="720" fill="url(#egWall)"/>' +
    blocks(0, 0, 1200, 712, 52, 104, "#0c0a1c", 0.55, 1.5) +
    '<circle cx="970" cy="340" r="300" fill="url(#egGlow)"/><circle cx="80" cy="390" r="160" fill="url(#egGlow)" opacity=".7"/>' +
    '<g class="breathe" style="animation-duration:9s"><circle cx="972" cy="96" r="58" fill="#0d0a1c"/>' +
    petals +
    '<circle cx="972" cy="96" r="13" fill="#e8b84a" stroke="#0d0a1c" stroke-width="3"/><circle cx="972" cy="96" r="58" fill="none" stroke="#0d0a1c" stroke-width="6"/></g>' +
    '<g clip-path="url(#egL1)">' +
    lancet(900, 9, 160, 520, pal, brd, [264, 372, 476], 38) +
    '<rect class="breathe" x="900" y="160" width="144" height="360" fill="url(#egShine)"/></g>' +
    '<path d="M900 520 V232 A72 72 0 0 1 1044 232 V520Z" fill="none" stroke="#0d0a1c" stroke-width="9"/>' +
    '<g clip-path="url(#egL2)">' +
    lancet(1132, 6, 200, 520, pal2, ["#d9a632", "#1f4fa8"], [330, 440], 28) +
    '</g><path d="M1132 520 V262 A48 48 0 0 1 1228 262 V520Z" fill="none" stroke="#0d0a1c" stroke-width="8"/>' +
    '<g clip-path="url(#egL0)">' +
    lancet(30, 6, 220, 520, pal, brd, [330, 440], 28) +
    '</g><path d="M30 520 V270 A48 48 0 0 1 126 270 V520Z" fill="none" stroke="#0d0a1c" stroke-width="8"/>' +
    '<path d="M790 150 A215 130 0 0 1 1220 150" fill="none" stroke="#1d1838" stroke-width="40"/><path d="M790 150 A215 130 0 0 1 1220 150" fill="none" stroke="#3a3270" stroke-width="2" stroke-dasharray="2 22" opacity=".8"/>' +
    '<polygon class="breathe" points="900,520 1044,520 860,800 560,800" fill="url(#egB)"/><polygon class="breathe" style="animation-delay:-2.5s" points="930,520 1000,520 800,800 640,800" fill="url(#egR)"/><polygon class="breathe" style="animation-delay:-5s" points="955,520 985,520 760,800 700,800" fill="url(#egG)"/>' +
    '<polygon class="breathe" style="animation-delay:-3.5s" points="30,520 126,520 200,800 20,800" fill="url(#egB)"/>' +
    `<path d="M0 700 H1200 V800 H0Z" fill="url(#egFloor)"/><path d="${fl}" stroke="#3a3266" stroke-width="1.3" opacity=".55" fill="none"/>` +
    '<g class="breathe" style="animation-delay:-1s"><ellipse cx="700" cy="772" rx="170" ry="20" fill="#7fb2ff" opacity=".18"/><ellipse cx="740" cy="780" rx="70" ry="9" fill="#ff7a8a" opacity=".16"/><ellipse cx="728" cy="784" rx="40" ry="6" fill="#ffd27a" opacity=".22"/></g>' +
    '<rect x="762" y="60" width="78" height="680" fill="url(#egCol)"/><path d="M752 60 h98 l-8 30 q-41 22 -82 0z" fill="#2a2450"/><rect x="748" y="50" width="106" height="12" fill="#1d1838"/><rect x="754" y="730" width="94" height="14" fill="#1d1838"/><rect x="838" y="90" width="2.4" height="640" fill="#9a92d4" opacity=".45"/>' +
    '<rect x="1170" y="60" width="70" height="680" fill="url(#egCol)"/><path d="M1162 60 h86 l-8 28 q-35 20 -70 0z" fill="#2a2450"/>' +
    '<circle class="flicker" cx="1000" cy="600" r="170" fill="url(#egBig)" style="animation-duration:4s"/>' +
    '<path d="M1000 760 V600 M970 760 l30 -40 l30 40" stroke="#1a1426" stroke-width="5" fill="none"/><path d="M932 650 H1068 M948 620 H1052 M965 590 H1035" stroke="#1a1426" stroke-width="5"/>' +
    cand +
    '<g class="smoke" style="animation-duration:9s"><path d="M1110 720 q-14 -30 0 -60 q14 -30 0 -60" stroke="rgba(255,255,255,.42)" stroke-width="6" fill="none" stroke-linecap="round"/></g><g class="smoke" style="animation-duration:11s;animation-delay:-4s"><path d="M1116 720 q12 -30 0 -60 q-12 -30 0 -60" stroke="rgba(255,255,255,.32)" stroke-width="5" fill="none" stroke-linecap="round"/></g>' +
    '<path d="M1100 760 l14 -44 l14 44z" fill="#1a1426"/><ellipse cx="1114" cy="716" rx="12" ry="7" fill="#8a6a34"/>' +
    "</svg>"
  );
}

export function egliseParticles(k: Kit): string {
  const { rnd } = k;
  let out = "";
  for (let i = 0; i < 24; i++) {
    const s = 1.6 + rnd() * 2.6;
    out += particle(
      "mote",
      "left:" +
        (rnd() < 0.75 ? 50 + rnd() * 45 : rnd() * 20) +
        "%;width:" +
        s +
        "px;height:" +
        s +
        "px;animation-duration:" +
        (18 + rnd() * 16) +
        "s;animation-delay:-" +
        rnd() * 30 +
        "s;--dx:" +
        (rnd() * 50 - 25) +
        "px",
    );
  }
  return out;
}
