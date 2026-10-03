/* Frontière gelée du Rhin : nuit de 406, tour de guet romaine. */
import { blocks, drifting, f1, flame, LG, particle, pineSnow, RG, SVGO, type Kit } from "./kit";

type Point = [number, number];

function cap(px: number, py: number, lx: number, ly: number, rx: number, ry: number): string {
  const f = 0.3;
  const ax = px + (lx - px) * f;
  const ay = py + (ly - py) * f;
  const bx = px + (rx - px) * f;
  const by = py + (ry - py) * f;
  const my = Math.max(ay, by);
  return `<polygon points="${px},${py} ${f1(bx)},${f1(by)} ${f1(ax + (bx - ax) * 0.75)},${f1(my + 6)} ${f1(ax + (bx - ax) * 0.5)},${f1(my - 2)} ${f1(ax + (bx - ax) * 0.25)},${f1(my + 7)} ${f1(ax)},${f1(ay)}" fill="#e3ecf7" opacity=".85"/>`;
}

/** Neige sur les sommets d'une ligne de crête. */
function caps(pts: Point[]): string {
  let s = "";
  for (let i = 1; i < pts.length - 1; i++)
    if (pts[i][1] < pts[i - 1][1] && pts[i][1] < pts[i + 1][1])
      s += cap(pts[i][0], pts[i][1], pts[i - 1][0], pts[i - 1][1], pts[i + 1][0], pts[i + 1][1]);
  return s;
}

function wagon(x: number): string {
  return `<g transform="translate(${x} 0)"><path d="M0 0 h54 v-10 C54 -36 0 -36 0 -10Z" fill="#c4cfdf"/><path d="M0 -10 C0 -36 54 -36 54 -10" fill="none" stroke="#eef3fa" stroke-width="1.5" opacity=".7"/><rect x="-2" y="-2" width="58" height="6" fill="#0b1222"/><circle cx="12" cy="7" r="8" fill="#0b1222"/><circle cx="44" cy="7" r="8" fill="#0b1222"/><path d="M12 -1 V15 M4 7 H20 M44 -1 V15 M36 7 H52" stroke="#2c3850" stroke-width="1.2"/><rect x="56" y="-4" width="20" height="3" fill="#0b1222"/><ellipse cx="88" cy="-6" rx="15" ry="9" fill="#0b1222"/><path d="M100 -10 l8 -6 M100 -10 l9 -2" stroke="#0b1222" stroke-width="2"/><path d="M78 0 v12 M84 0 v12 M94 0 v12 M98 0 v12" stroke="#0b1222" stroke-width="2.4"/></g>`;
}

function walker(x: number, torch: boolean): string {
  return `<g transform="translate(${x} 0)" fill="#0b1222"><circle cx="0" cy="-22" r="3.6"/><path d="M-4 -18 h8 l2 18 h-12z"/>${
    torch
      ? `<line x1="4" y1="-16" x2="10" y2="-30" stroke="#3a2a1a" stroke-width="1.6"/><circle class="flicker" cx="10" cy="-33" r="16" fill="url(#frFire)"/><path class="flicker" d="M10 -30 C7 -33 8 -37 10 -41 C12 -37 13 -33 10 -30Z" fill="#ffd27a"/>`
      : ""
  }</g>`;
}

export function drawFrontiere(k: Kit): string {
  const { R } = k;
  let st = "";
  let tl = "";
  let tt = "";
  let pal = "";
  let cr = "";
  for (let i = 0; i < 80; i++)
    st += `<circle class="tw" cx="${Math.round(R(0, 1200))}" cy="${Math.round(R(0, 380))}" r="${f1(R(0.5, 1.6))}" fill="#fff" style="animation-duration:${f1(R(2, 6))}s;animation-delay:-${f1(R(0, 6))}s"/>`;
  for (let i = 0; i < 9; i++) {
    const x = R(40, 1180);
    const y = R(20, 320);
    st += `<path class="tw" style="animation-duration:${f1(R(3, 6))}s;animation-delay:-${f1(R(0, 5))}s" d="M${f1(x)} ${f1(y - 6)} L${f1(x + 1.2)} ${f1(y - 1.2)} L${f1(x + 6)} ${f1(y)} L${f1(x + 1.2)} ${f1(y + 1.2)} L${f1(x)} ${f1(y + 6)} L${f1(x - 1.2)} ${f1(y + 1.2)} L${f1(x - 6)} ${f1(y)} L${f1(x - 1.2)} ${f1(y - 1.2)}Z" fill="#fff"/>`;
  }
  const back: Point[] = [
    [-40, 560],
    [80, 470],
    [170, 520],
    [290, 430],
    [400, 505],
    [520, 450],
    [640, 520],
    [760, 440],
    [880, 500],
    [1000, 420],
    [1120, 495],
    [1240, 455],
  ];
  const front: Point[] = [
    [-40, 600],
    [120, 530],
    [240, 580],
    [360, 520],
    [470, 575],
    [600, 530],
    [720, 585],
    [860, 540],
    [980, 590],
    [1100, 545],
    [1240, 590],
  ];
  const pth = (a: Point[], bot: number) =>
    "M" + a.map((p) => p[0] + " " + p[1]).join(" L") + " V" + bot + " H-40Z";
  for (let x = -20; x < 1240; x += 13) {
    const h = R(16, 34);
    tl += `M${f1(x)} 613 L${f1(x + 6.5)} ${f1(613 - h)} L${f1(x + 13)} 613Z `;
    tt += `M${f1(x + 4.6)} ${f1(613 - h + 7)} L${f1(x + 6.5)} ${f1(613 - h)} L${f1(x + 8.4)} ${f1(613 - h + 7)} `;
  }
  for (let x = 1000; x < 1196; x += 9)
    pal += `<polygon points="${x},738 ${x},704 ${f1(x + 3.5)},697 ${x + 7},704 ${x + 7},738" fill="#2e2219"/><path d="M${x} 704 L${f1(x + 3.5)} 697 L${x + 7} 704" fill="none" stroke="#eef4fb" stroke-width="1.6" opacity=".85"/>`;
  [
    ["M150 662 l40 6 l26 -4 M190 668 l10 12", ".8"],
    ["M420 690 l34 -8 l30 6 M454 682 l-6 14", ".7"],
    ["M640 668 l46 8 l20 -6", ".75"],
    ["M820 700 l30 -6 l24 8 M850 694 l8 12", ".7"],
  ].forEach((c) => {
    cr += `<path d="${c[0]}" stroke="#7a98bd" stroke-width="1.4" fill="none" opacity="${c[1]}"/>`;
  });
  return (
    SVGO +
    "<defs>" +
    RG("frHalo", [
      [0, "#e8f0ff", 0.55],
      [0.4, "#c9d8f2", 0.16],
      [1, "#c9d8f2", 0],
    ]) +
    LG("frDisk", 0, 0, 1, 1, [
      [0, "#ffffff"],
      [1, "#c6d1e6"],
    ]) +
    LG("frBack", 0, 0, 0, 1, [
      [0, "#3c547e"],
      [1, "#22365c"],
    ]) +
    LG("frFront", 0, 0, 0, 1, [
      [0, "#2a3f66"],
      [1, "#192946"],
    ]) +
    LG("frIce", 0, 0, 0, 1, [
      [0, "#8ea8c8"],
      [0.5, "#b8cde3"],
      [1, "#dbe8f5"],
    ]) +
    LG("frSnow", 0, 0, 0, 1, [
      [0, "#f2f7fd"],
      [1, "#b9cbe2"],
    ]) +
    RG("frFire", [
      [0, "#ffcf7a", 0.85],
      [0.35, "#ff9a3c", 0.35],
      [1, "#ff7a1a", 0],
    ]) +
    RG("frWin", [
      [0, "#ffd27a", 0.75],
      [1, "#ffb347", 0],
    ]) +
    RG("frMilky", [
      [0, "#ffffff", 0.13],
      [1, "#ffffff", 0],
    ]) +
    RG("frMistR", [
      [0, "#e6eef8", 0.32],
      [1, "#e6eef8", 0],
    ]) +
    LG("frTower", 0, 0, 1, 0, [
      [0, "#525b70"],
      [0.6, "#79849a"],
      [1, "#a3afc4"],
    ]) +
    "</defs>" +
    '<ellipse cx="420" cy="170" rx="660" ry="74" transform="rotate(-12 420 170)" fill="url(#frMilky)"/>' +
    st +
    '<circle cx="1000" cy="150" r="200" fill="url(#frHalo)"/><circle cx="1000" cy="150" r="40" fill="url(#frDisk)"/><circle cx="990" cy="140" r="7" fill="#aebbd2" opacity=".45"/><circle cx="1013" cy="160" r="5" fill="#aebbd2" opacity=".4"/><circle cx="996" cy="166" r="3.6" fill="#aebbd2" opacity=".4"/>' +
    '<g class="par" style="animation-duration:90s">' +
    `<path d="${pth(back, 660)}" fill="url(#frBack)"/>` +
    caps(back) +
    "</g>" +
    '<g class="par" style="animation-duration:70s;animation-delay:-30s">' +
    `<path d="${pth(front, 680)}" fill="url(#frFront)"/>` +
    caps(front).replace(/opacity="\.85"/g, 'opacity=".7"') +
    "</g>" +
    drifting('<ellipse cx="0" cy="0" rx="320" ry="26" fill="url(#frMistR)"/>', 575, 220, -80) +
    '<path d="M-40 612 C300 600 700 618 1240 604 V652 H-40Z" fill="#17243f"/>' +
    `<path d="${tl}" fill="#121d36"/><path d="${tt}" fill="none" stroke="#e6eef8" stroke-width="1.6" opacity=".7"/>` +
    '<polygon points="826,612 852,572 878,612" fill="#241f22"/><polygon points="852,572 878,612 860,612" fill="#6b4a2e" opacity=".75"/><polygon points="902,614 924,580 946,614" fill="#241f22"/><polygon points="924,580 946,614 930,614" fill="#6b4a2e" opacity=".7"/>' +
    '<circle class="flicker" cx="888" cy="606" r="62" fill="url(#frFire)"/>' +
    flame(888, 612, 0.7) +
    '<g fill="#0b1222"><circle cx="872" cy="596" r="2.6"/><rect x="869.5" y="598" width="5" height="12"/><circle cx="905" cy="597" r="2.6"/><rect x="902.5" y="599" width="5" height="12"/></g>' +
    '<path d="M-40 640 C300 628 700 650 1240 632 V738 C800 726 400 744 -40 732Z" fill="url(#frIce)"/>' +
    cr +
    '<g fill="#ffffff" opacity=".42"><ellipse cx="260" cy="700" rx="70" ry="6"/><ellipse cx="760" cy="712" rx="90" ry="6"/><ellipse cx="1120" cy="690" rx="60" ry="5"/></g>' +
    '<g class="shimmer" fill="#ffffff" opacity=".6"><ellipse cx="1000" cy="646" rx="26" ry="2.4"/><ellipse cx="1000" cy="655" rx="40" ry="3"/><ellipse cx="1004" cy="666" rx="30" ry="2.4"/><ellipse cx="996" cy="678" rx="46" ry="3"/><ellipse cx="1002" cy="692" rx="34" ry="2.4"/></g>' +
    '<g transform="translate(470 698) scale(.9)"><g class="cross" style="animation-delay:-62s">' +
    walker(0, true) +
    wagon(26) +
    walker(150, false) +
    walker(166, false) +
    wagon(196) +
    walker(318, true) +
    "</g></g>" +
    drifting('<ellipse cx="0" cy="0" rx="360" ry="28" fill="url(#frMistR)"/>', 700, 170, -30) +
    '<path d="M-40 728 C260 716 600 740 900 726 C1050 720 1150 728 1240 724 V800 H-40Z" fill="url(#frSnow)"/><g fill="#9fb6d3" opacity=".35"><ellipse cx="200" cy="770" rx="160" ry="10"/><ellipse cx="760" cy="780" rx="200" ry="10"/></g>' +
    '<ellipse cx="1090" cy="738" rx="110" ry="9" fill="#e9f1fa"/>' +
    '<rect x="1045" y="560" width="74" height="178" fill="url(#frTower)"/>' +
    blocks(1045, 560, 74, 178, 18, 24, "#2e3546", 0.55, 1.2) +
    '<rect x="1036" y="532" width="92" height="30" fill="#4a3626"/><path d="M1046 532 V562 M1058 532 V562 M1070 532 V562 M1082 532 V562 M1094 532 V562 M1106 532 V562 M1118 532 V562" stroke="#2e2015" stroke-width="1.4"/><rect x="1032" y="558" width="100" height="5" fill="#3a2a1d"/>' +
    '<polygon points="1026,534 1082,486 1138,534" fill="#3b2a1e"/><polygon points="1032,530 1082,490 1132,530 1112,526 1082,505 1052,526" fill="#eef4fb"/>' +
    '<circle class="flicker" cx="1078" cy="611" r="46" fill="url(#frWin)"/><rect x="1072" y="600" width="12" height="22" rx="6" fill="#ffcf7a"/>' +
    '<circle class="flicker" cx="1036" cy="520" r="40" fill="url(#frFire)"/>' +
    flame(1036, 528, 0.6) +
    '<line x1="1014" y1="738" x2="1014" y2="590" stroke="#2e2219" stroke-width="3"/><line x1="1000" y1="596" x2="1028" y2="596" stroke="#2e2219" stroke-width="2.4"/><g class="hang" style="transform-origin:1014px 596px"><rect x="1002" y="597" width="24" height="34" fill="#8f2a2a"/><path d="M1002 631 l3 5 l3 -5 l3 5 l3 -5 l3 5 l3 -5 l3 5 l3 -5" fill="none" stroke="#d9b45a" stroke-width="1.4"/><circle cx="1014" cy="610" r="5" fill="none" stroke="#d9b45a" stroke-width="1.4"/></g>' +
    pal +
    pineSnow(1196, 806, 1.55, "#122039") +
    pineSnow(905, 812, 1.05, "#122039") +
    pineSnow(28, 808, 1.3, "#122039") +
    "</svg>"
  );
}

export function frontiereParticles(k: Kit): string {
  const { rnd } = k;
  let out = "";
  for (let i = 0; i < 28; i++) {
    const s = 1.5 + rnd() * 2;
    out += particle(
      "flake",
      "left:" +
        rnd() * 100 +
        "%;width:" +
        s +
        "px;height:" +
        s +
        "px;opacity:.7;animation-duration:" +
        (14 + rnd() * 12) +
        "s;animation-delay:-" +
        rnd() * 26 +
        "s;--dx:" +
        (rnd() * 50 - 25) +
        "px",
    );
  }
  for (let i = 0; i < 12; i++) {
    const s = 4 + rnd() * 3;
    out += particle(
      "flake near",
      "left:" +
        rnd() * 100 +
        "%;width:" +
        s +
        "px;height:" +
        s +
        "px;animation-duration:" +
        (7 + rnd() * 5) +
        "s;animation-delay:-" +
        rnd() * 12 +
        "s;--dx:" +
        (rnd() * 80 - 40) +
        "px",
    );
  }
  return out;
}
