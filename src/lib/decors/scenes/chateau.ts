/* Château fort : motte, village, moulin banal, champs en lanières. */
import { blocks, cumulus, drifting, f1, flower, LG, RG, roundTree, SVGO, warmMotes, type Kit } from "./kit";

function house(x: number, y: number, s: number, roof: string): string {
  return `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-26" y="-32" width="52" height="32" fill="#efe6d2"/><path d="M-26 -32 H26 M-26 -16 H26 M-26 0 H26 M-26 -32 V0 M26 -32 V0 M-8 -32 V0 M8 -32 V0 M-26 -32 L-8 -16 M8 -16 L26 -32" stroke="#5a3a24" stroke-width="2.4"/><rect x="-4" y="-14" width="8" height="14" fill="#4a2e1a"/><polygon points="-33,-32 0,-62 33,-32" fill="${roof}"/><path d="M-22 -42 H22 M-12 -52 H12" stroke="#000" stroke-opacity=".15" stroke-width="2"/><rect x="12" y="-60" width="8" height="18" fill="#8a7a62"/></g>`;
}

export function drawChateau(k: Kit): string {
  const { rnd, R, bird, tuft } = k;
  let strips = "";
  let rows = "";
  let tf = "";
  let fl = "";
  let m1 = "";
  let m2 = "";
  let m3 = "";
  let slits = "";
  const vp = [1000, 560];
  const xs: number[] = [];
  for (let i = -6; i <= 18; i++) xs.push(-300 + i * 90);
  for (let i = 0; i < xs.length - 1; i++) {
    const a = xs[i];
    const b = xs[i + 1];
    const t = (708 - vp[1]) / (800 - vp[1]);
    const ta = vp[0] + (a - vp[0]) * t;
    const tb = vp[0] + (b - vp[0]) * t;
    strips += `<polygon points="${f1(ta)},708 ${f1(tb)},708 ${b},800 ${a},800" fill="${["#d8bb5e", "#8db062", "#a98455", "#cbbf6c"][(i + 12) % 4]}"/>`;
    rows += `M${f1((ta + tb) / 2)} 708 L${f1((a + b) / 2)} 800 `;
  }
  for (let i = 0; i < 14; i++) tf += tuft(R(0, 1200), R(780, 798), "#5a7a3a", R(0.8, 1.2));
  for (let i = 0; i < 30; i++)
    fl += flower(
      R(0, 1200),
      R(786, 798),
      ["#d8352a", "#ffffff", "#e8c233"][Math.floor(rnd() * 3)],
      R(2, 3.2),
    );
  for (let i = 0; i < 16; i++)
    m1 += `<rect x="${902 + i * 16}" y="458" width="10" height="13" fill="url(#chStone)"/>`;
  for (let i = 0; i < 6; i++)
    m2 += `<rect x="${992 + i * 16}" y="346" width="10" height="14" fill="url(#chKeep)"/>`;
  for (let i = 0; i < 3; i++)
    m3 += `<rect x="${878 + i * 17}" y="430" width="9" height="12" fill="url(#chStoneR)"/><rect x="${1138 + i * 17}" y="430" width="9" height="12" fill="url(#chStoneR)"/>`;
  [
    [1010, 400],
    [1046, 400],
    [1028, 450],
    [1010, 500],
    [1046, 500],
    [898, 490],
    [1158, 490],
  ].forEach((p) => {
    slits += `<rect x="${p[0]}" y="${p[1]}" width="4" height="16" fill="#3a3530"/>`;
  });
  return (
    SVGO +
    "<defs>" +
    RG("chSun", [
      [0, "#fffbe8", 1],
      [0.2, "#fff3c4", 0.55],
      [1, "#fff3c4", 0],
    ]) +
    LG(
      "chCloud",
      0,
      -80,
      0,
      22,
      [
        [0, "#ffffff"],
        [1, "#c8d6e8"],
      ],
      true,
    ) +
    LG("chFar", 0, 0, 0, 1, [
      [0, "#9cb6cf"],
      [1, "#b9ccd7"],
    ]) +
    LG("chHill", 0, 0, 0, 1, [
      [0, "#a3c186"],
      [1, "#86a86a"],
    ]) +
    LG("chMotte", 0, 0, 1, 0, [
      [0, "#a6c47e"],
      [1, "#6c8e50"],
    ]) +
    LG("chStoneR", 0, 0, 1, 0, [
      [0, "#ece5d4"],
      [0.55, "#bcb3a0"],
      [1, "#7f786a"],
    ]) +
    LG("chStone", 0, 0, 0, 1, [
      [0, "#d8d0bd"],
      [1, "#a59d8a"],
    ]) +
    LG("chKeep", 0, 0, 1, 0, [
      [0, "#e6dfcd"],
      [0.6, "#c2baa6"],
      [1, "#8d8676"],
    ]) +
    LG("chRoof", 0, 0, 1, 0, [
      [0, "#7d8ca6"],
      [1, "#3d4862"],
    ]) +
    LG("chRay", 0, 0, 0, 1, [
      [0, "#fff6d6", 0.16],
      [1, "#fff6d6", 0],
    ]) +
    "</defs>" +
    '<circle cx="220" cy="120" r="380" fill="url(#chSun)"/><circle cx="220" cy="120" r="44" fill="#fffdf2"/>' +
    '<polygon class="breathe" points="220,120 760,800 860,800" fill="url(#chRay)"/><polygon class="breathe" style="animation-delay:-3s" points="220,120 1000,800 1120,800" fill="url(#chRay)"/>' +
    drifting(cumulus(1.3, "chCloud", 0.95), 120, 160, -60) +
    drifting(cumulus(1.6, "chCloud", 0.85), 230, 210, -130) +
    drifting(cumulus(0.9, "chCloud", 0.8), 70, 240, -90) +
    bird(200, 85, -25, 1.1, "#3e4a3a") +
    bird(232, 115, -70, 0.9, "#3e4a3a") +
    '<g class="par" style="animation-duration:85s"><path d="M-40 552 C220 508 420 560 640 532 C860 504 1020 548 1240 520 V660 H-40Z" fill="url(#chFar)"/></g>' +
    '<g class="par" style="animation-duration:65s;animation-delay:-25s"><path d="M-40 630 C260 584 460 640 700 604 C920 572 1060 630 1240 604 V760 H-40Z" fill="url(#chHill)"/></g>' +
    '<polygon points="752,602 768,602 766,574 754,574" fill="#ece4d0"/><polygon points="760,602 768,602 766,574 760,574" fill="#bdb39c"/><polygon points="752,575 760,564 768,575" fill="#7a5a3a"/>' +
    '<g class="spin" style="transform-origin:760px 574px;animation-duration:28s">' +
    [0, 90, 180, 270]
      .map(
        (a) =>
          `<g transform="rotate(${a} 760 574)"><rect x="759" y="532" width="2" height="42" fill="#6b4a2a"/><rect x="761" y="535" width="9" height="36" fill="#f1e7cf" opacity=".9"/><path d="M761 535 H770 V571 H761 M761 544 H770 M761 553 H770 M761 562 H770" fill="none" stroke="#6b4a2a" stroke-width=".8"/></g>`,
      )
      .join("") +
    '</g><circle cx="760" cy="574" r="2.2" fill="#4a3220"/>' +
    '<path d="M836 704 C878 604 940 552 1020 544 C1100 538 1172 582 1240 640 V704Z" fill="url(#chMotte)"/><path d="M836 704 C870 690 900 688 940 692" stroke="#5a7a40" stroke-width="3" fill="none" opacity=".6"/>' +
    '<path d="M958 704 C980 664 996 630 1004 596" stroke="#c9b98a" stroke-width="14" fill="none" stroke-linecap="round"/><path d="M958 704 C980 664 996 630 1004 596" stroke="#e6d6a8" stroke-width="9" fill="none" stroke-linecap="round"/>' +
    roundTree(866, 690, 1, "#557a3c", "#79a052") +
    roundTree(1210, 650, 1.2, "#557a3c", "#79a052") +
    roundTree(1186, 676, 0.9, "#557a3c", "#79a052") +
    '<rect x="900" y="470" width="260" height="92" fill="url(#chStone)"/>' +
    blocks(900, 470, 260, 92, 14, 30, "#6b6456", 0.35, 1) +
    m1 +
    '<rect x="876" y="442" width="52" height="122" fill="url(#chStoneR)"/>' +
    blocks(876, 442, 52, 122, 14, 26, "#6b6456", 0.3, 1) +
    '<rect x="1136" y="442" width="52" height="122" fill="url(#chStoneR)"/>' +
    blocks(1136, 442, 52, 122, 14, 26, "#6b6456", 0.3, 1) +
    m3 +
    '<polygon points="870,444 902,368 934,444" fill="url(#chRoof)"/><polygon points="1130,444 1162,370 1194,444" fill="url(#chRoof)"/><path d="M902 368 v-18 M1162 370 v-18" stroke="#3a2a1a" stroke-width="2"/><polygon class="flag" points="902,350 922,355 902,360" fill="#8a2f2f"/><polygon class="flag" points="1162,352 1182,357 1162,362" fill="#8a2f2f"/>' +
    '<rect x="990" y="360" width="96" height="202" fill="url(#chKeep)"/>' +
    blocks(990, 360, 96, 202, 15, 30, "#6b6456", 0.32, 1) +
    m2 +
    '<rect x="980" y="334" width="16" height="30" fill="url(#chStoneR)"/><polygon points="977,336 988,312 999,336" fill="url(#chRoof)"/><rect x="1080" y="334" width="16" height="30" fill="url(#chStoneR)"/><polygon points="1077,336 1088,312 1099,336" fill="url(#chRoof)"/>' +
    slits +
    '<line x1="1038" y1="346" x2="1038" y2="282" stroke="#3a2a1a" stroke-width="3"/><g class="flag"><path d="M1038 284 L1098 292 L1086 306 L1098 320 L1038 316Z" fill="#8a2f2f"/><path d="M1038 300 H1090" stroke="#e8c46a" stroke-width="3"/></g>' +
    '<path d="M942 562 V530 A20 20 0 0 1 982 530 V562Z" fill="#2e2a24"/><path d="M948 534 V562 M956 528 V562 M964 526 V562 M972 528 V562 M976 534 V562 M944 540 H980 M944 550 H980" stroke="#5a5046" stroke-width="1.4"/>' +
    '<polygon points="942,562 982,562 1000,598 960,598" fill="#7a5a3a"/><path d="M946 566 L964 598 M954 564 L972 598 M962 564 L980 598 M970 564 L988 598" stroke="#5a3e26" stroke-width="1.2"/><path d="M942 530 L960 598 M982 530 L1000 598" stroke="#3a3530" stroke-width="1.4"/>' +
    house(760, 708, 1, "#a8603a") +
    house(824, 712, 0.92, "#8a6a44") +
    house(888, 714, 0.86, "#a8603a") +
    house(712, 712, 0.8, "#8a6a44") +
    '<rect x="640" y="660" width="40" height="52" fill="#e9e1cd"/><polygon points="636,660 660,640 684,660" fill="#7a5a3a"/><rect x="676" y="620" width="22" height="92" fill="#e2d9c3"/><polygon points="672,620 687,566 702,620" fill="#5a4a3a"/><path d="M687 566 v-12 M682 559 h10" stroke="#3a2a1a" stroke-width="2"/>' +
    '<g class="smoke" style="animation-duration:8s"><path d="M776 646 q-10 -20 0 -40 q10 -20 0 -40" stroke="rgba(120,120,120,.45)" stroke-width="5" fill="none" stroke-linecap="round"/></g><g class="smoke" style="animation-duration:10s;animation-delay:-5s"><path d="M840 656 q10 -20 0 -40 q-10 -20 0 -40" stroke="rgba(120,120,120,.4)" stroke-width="5" fill="none" stroke-linecap="round"/></g>' +
    '<path d="M-40 706 C300 694 800 716 1240 702 V720 H-40Z" fill="#7ea258"/>' +
    strips +
    `<path d="${rows}" stroke="#5a4a2a" stroke-opacity=".22" stroke-width="1.2"/>` +
    '<g transform="translate(1046 748)"><path d="M-30 0 C-30 -34 30 -34 30 0Z" fill="#d9b95a"/><path d="M-22 -10 C-10 -20 10 -20 22 -10 M-26 -2 C-10 -12 10 -12 26 -2" stroke="#a8893a" stroke-width="1.4" fill="none"/></g>' +
    '<g transform="translate(940 756)"><path d="M-6 0 L-4 -22 L4 -22 L6 0Z" fill="#6b4a2a"/><path d="M-5 -22 C-6 -32 6 -32 5 -22Z" fill="#b08a5c"/><circle cx="0" cy="-32" r="5" fill="#d9b48a"/><path d="M-6 -36 q6 -6 12 0" fill="#c9a24a"/></g><g class="scythe" style="transform-origin:938px 734px"><line x1="938" y1="734" x2="914" y2="752" stroke="#5a3e26" stroke-width="2.4"/><path d="M914 752 C906 754 896 750 892 742 C900 746 908 746 914 748Z" fill="#c9ced6"/></g>' +
    tf +
    fl +
    "</svg>"
  );
}

export function chateauParticles(k: Kit): string {
  return warmMotes(k, 12);
}
