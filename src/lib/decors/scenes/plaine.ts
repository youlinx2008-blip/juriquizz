/* Plaine carolingienne : champ de mai, palais d'Aix au loin. */
import {
  butterfly,
  cumulus,
  drifting,
  f1,
  flower,
  LG,
  oak,
  RG,
  roundTree,
  SVGO,
  warmMotes,
  type Kit,
} from "./kit";

function pavilion(x: number, y: number, s: number, c1: string, c2: string): string {
  let st = "";
  for (let n = 0; n < 6; n++) {
    const a0 = -46 + (n * 92) / 6;
    const a1 = a0 + 92 / 12;
    st += `<polygon points="0,-92 ${f1(a0)},-40 ${f1(a1)},-40" fill="${c2}"/>`;
  }
  let sc = "";
  for (let n = 0; n < 8; n++) sc += `<circle cx="${-42 + n * 12}" cy="-40" r="6" fill="${c2}"/>`;
  return `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-40" y="-40" width="80" height="40" fill="#f2ead6"/><rect x="-40" y="-40" width="18" height="40" fill="#d9cfb5"/><polygon points="-8,0 0,-26 8,0" fill="#3a2a1e"/><polygon points="-46,-40 0,-92 46,-40" fill="${c1}"/>${st}${sc}<line x1="0" y1="-92" x2="0" y2="-114" stroke="#5a3a1a" stroke-width="2.4"/><polygon class="flag" points="0,-114 26,-108 0,-102" fill="${c2}"/></g>`;
}

function rider(x: number, cloak: string, body: string): string {
  return `<g transform="translate(${x} 0)"><g class="trot"><ellipse cx="0" cy="0" rx="26" ry="11" fill="${body}"/><path d="M-22 4 l-6 22 M-12 6 l2 22 M12 6 l-2 22 M22 4 l6 22" stroke="${body}" stroke-width="4" stroke-linecap="round"/><path d="M20 -4 L38 -22 L46 -18 L30 2Z" fill="${body}"/><ellipse cx="45" cy="-21" rx="8" ry="5" fill="${body}"/><path d="M-24 -4 q-14 4 -16 18" stroke="${body}" stroke-width="3" fill="none"/><path d="M-6 -6 C-14 -22 -12 -34 -2 -38 L8 -36 C10 -26 8 -14 6 -6Z" fill="${cloak}"/><circle cx="2" cy="-42" r="5.5" fill="#d9b48a"/><path d="M-4 -46 q6 -6 12 0" fill="#3a2a1e"/><line x1="8" y1="-34" x2="36" y2="-66" stroke="#3a2a1e" stroke-width="2"/></g></g>`;
}

function hedgeRow(k: Kit, x0: number, x1: number, y: number, amp: number): string {
  let d = "M" + x0 + " " + (y + 5);
  let x = x0;
  while (x < x1) {
    const r = k.R(3.5, 6);
    const yy = y + Math.sin(x * 0.05) * amp;
    d += " A" + f1(r) + " " + f1(r) + " 0 0 1 " + f1(x + r * 1.6) + " " + f1(yy + k.R(-1, 1));
    x += r * 1.6;
  }
  d += " L" + x1 + " " + (y + 8) + " L" + x0 + " " + (y + 8) + "Z";
  return `<path d="${d}" fill="#557a40"/>`;
}

export function drawPlaine(k: Kit): string {
  const { rnd, R, bird, tuft } = k;
  let fl = "";
  let tf = "";
  let fields = "";
  for (let i = 0; i < 80; i++)
    fl += flower(
      R(-10, 1210),
      R(742, 794),
      ["#4a7fd6", "#d8352a", "#ffffff", "#e8c233", "#4a7fd6"][Math.floor(rnd() * 5)],
      R(2.2, 3.8),
    );
  for (let i = 0; i < 20; i++) tf += tuft(R(0, 1200), R(746, 796), "#3b6a2c", R(0.8, 1.3));
  [
    ["M640 560 L760 548 L780 572 L650 584Z", "#c9c46a"],
    ["M760 548 L880 540 L900 566 L780 572Z", "#9cba6a"],
    ["M880 540 L1000 538 L1012 562 L900 566Z", "#d6c784"],
    ["M1000 538 L1120 542 L1124 566 L1012 562Z", "#a9c27a"],
    ["M650 584 L780 572 L800 600 L670 610Z", "#8fb062"],
    ["M780 572 L900 566 L916 594 L800 600Z", "#cdbd72"],
    ["M900 566 L1012 562 L1024 590 L916 594Z", "#93b668"],
    ["M1012 562 L1124 566 L1130 594 L1024 590Z", "#c4c27a"],
  ].forEach((f) => {
    fields += `<path d="${f[0]}" fill="${f[1]}"/>`;
  });
  const hedge = hedgeRow(k, 640, 1124, 566, 2) + hedgeRow(k, 660, 1130, 594, 2);
  return (
    SVGO +
    "<defs>" +
    RG("plSun", [
      [0, "#fffbe8", 1],
      [0.2, "#fff1c0", 0.6],
      [1, "#fff1c0", 0],
    ]) +
    LG(
      "plCloud",
      0,
      -80,
      0,
      22,
      [
        [0, "#ffffff"],
        [1, "#c4d3e4"],
      ],
      true,
    ) +
    LG("plFar", 0, 0, 0, 1, [
      [0, "#9fb7c6"],
      [1, "#bccfd2"],
    ]) +
    LG("plHill1", 0, 0, 0, 1, [
      [0, "#a8c58a"],
      [1, "#8db070"],
    ]) +
    LG("plHill2", 0, 0, 0, 1, [
      [0, "#86ab62"],
      [1, "#6a924c"],
    ]) +
    LG("plRiver", 0, 0, 1, 0, [
      [0, "#8fbfe2"],
      [1, "#d2e8f6"],
    ]) +
    LG("plMeadow", 0, 0, 0, 1, [
      [0, "#6c9a4a"],
      [1, "#3c672b"],
    ]) +
    LG("plRay", 0, 0, 0, 1, [
      [0, "#fff6d6", 0.22],
      [1, "#fff6d6", 0],
    ]) +
    "</defs>" +
    '<circle cx="1010" cy="160" r="320" fill="url(#plSun)"/><circle cx="1010" cy="160" r="44" fill="#fffdf2"/>' +
    '<polygon class="breathe" points="1010,160 820,800 900,800" fill="url(#plRay)"/><polygon class="breathe" style="animation-delay:-3s" points="1010,160 1060,800 1150,800" fill="url(#plRay)"/>' +
    drifting(cumulus(1.3, "plCloud", 0.95), 130, 150, -50) +
    drifting(cumulus(1.7, "plCloud", 0.85), 240, 200, -120) +
    drifting(cumulus(0.9, "plCloud", 0.8), 80, 230, -80) +
    bird(180, 80, -20, 1.1, "#3e4a3a") +
    bird(215, 105, -55, 0.9, "#3e4a3a") +
    bird(160, 130, -90, 1, "#3e4a3a") +
    '<g class="par" style="animation-duration:85s"><path d="M-40 540 C200 500 420 548 640 520 C860 494 1040 540 1240 512 V640 H-40Z" fill="url(#plFar)"/></g>' +
    '<g fill="#8399a8" opacity=".9" transform="translate(-140 4)"><rect x="968" y="500" width="74" height="28"/><polygon points="964,500 1005,486 1046,500"/><polygon points="1086,530 1086,494 1098,484 1122,484 1134,494 1134,530"/><path d="M1094 484 Q1110 452 1126 484Z"/><rect x="1107" y="444" width="6" height="12"/><rect x="1060" y="478" width="10" height="52"/><polygon points="1058,478 1065,464 1072,478"/><rect x="1042" y="508" width="44" height="10"/></g>' +
    '<g class="par" style="animation-duration:70s;animation-delay:-20s"><path d="M-40 600 C220 556 460 596 660 566 C860 540 1040 572 1240 552 V720 H-40Z" fill="url(#plHill1)"/></g>' +
    fields +
    hedge +
    '<path d="M1240 604 C1120 612 1040 600 960 622 C880 644 820 668 700 676 C560 684 420 700 280 734" fill="none" stroke="url(#plRiver)" stroke-width="22" stroke-linecap="round"/><path class="shimmer" d="M1180 606 C1100 612 1040 604 980 620 M880 650 C840 662 800 670 740 674" fill="none" stroke="#ffffff" stroke-width="2.4" opacity=".7"/>' +
    '<path d="M-40 650 C240 618 520 660 760 640 C960 624 1100 646 1240 634 V760 H-40Z" fill="url(#plHill2)"/>' +
    roundTree(700, 650, 1.2, "#4f7a3c", "#6f9a52") +
    roundTree(735, 646, 0.9, "#4f7a3c", "#6f9a52") +
    roundTree(1196, 640, 1.1, "#4f7a3c", "#6f9a52") +
    pavilion(850, 666, 0.82, "#b0302a", "#f2ead6") +
    pavilion(955, 656, 1, "#2b4d7a", "#f2ead6") +
    pavilion(1065, 668, 0.86, "#6e2a55", "#e8c46a") +
    pavilion(1150, 660, 0.7, "#b0302a", "#f2ead6") +
    '<line x1="905" y1="560" x2="905" y2="668" stroke="#4a3220" stroke-width="4"/><polygon class="flag" points="905,566 966,574 946,590 966,606 905,600" fill="#6e2a55"/><path d="M905 572 H952" stroke="#e8c46a" stroke-width="2"/>' +
    '<g class="smoke" style="animation-duration:9s"><path d="M1010 650 q-8 -18 0 -36 q8 -18 0 -36" stroke="rgba(130,130,130,.4)" stroke-width="5" fill="none" stroke-linecap="round"/></g>' +
    '<g fill="#3a2a1e"><rect x="1012" y="648" width="3" height="20"/><circle cx="1013.5" cy="644" r="3"/><rect x="1108" y="652" width="3" height="20"/><circle cx="1109.5" cy="648" r="3"/></g><path d="M1016 668 l4 -34 M1112 672 l4 -34" stroke="#3a2a1e" stroke-width="1.4"/>' +
    '<path d="M-40 712 C300 700 700 716 1240 700" fill="none" stroke="#d9c899" stroke-width="22"/><path d="M-40 712 C300 700 700 716 1240 700" fill="none" stroke="#c4b07c" stroke-width="22" stroke-dasharray="1 9" opacity=".6"/>' +
    '<g transform="translate(0 700)"><g class="ride" style="animation-duration:95s;animation-delay:-62s">' +
    rider(0, "#9a2a2a", "#3a2a1e") +
    rider(78, "#3a3a46", "#5a4030") +
    "</g></g>" +
    '<path d="M-40 732 C300 720 700 744 1240 726 V800 H-40Z" fill="url(#plMeadow)"/>' +
    fl +
    tf +
    oak(1246, 808, 1.1, "#3c6a2c", "#58893c", "#7fae58") +
    butterfly(1020, 736, "#f2c14e", 13, -4) +
    butterfly(880, 750, "#ffffff", 16, -9) +
    "</svg>"
  );
}

export function plaineParticles(k: Kit): string {
  return warmMotes(k, 14);
}
