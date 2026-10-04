/* Raids vikings : coucher de soleil, monastère côtier. */
import { crestPath, drifting, f1, flame, LG, RG, stratus, SVGO, wavePath, type Kit } from "./kit";

function ship(id: string, y: number, sc: number, dur: number, delay: number, op: number): string {
  let shields = "";
  let oars = "";
  let crew = "";
  const cols = ["#b0302a", "#e3c27a", "#2b4d7a"];
  for (let i = 0; i < 9; i++) {
    shields += `<circle cx="${30 + i * 18}" cy="-6" r="7" fill="${cols[i % 3]}" stroke="#20130b" stroke-width="1.6"/><circle cx="${30 + i * 18}" cy="-6" r="1.8" fill="#d9c08a"/>`;
    crew += `<circle cx="${32 + i * 18}" cy="-17" r="3.2" fill="#20130b"/><path d="M${28.5 + i * 18} -18 l3.5 -6 l3.5 6z" fill="#5a5a66"/>`;
  }
  for (let i = 0; i < 6; i++)
    oars += `<line class="oar" style="animation-delay:-${f1(i * 0.08)}s" x1="${40 + i * 24}" y1="0" x2="${22 + i * 24}" y2="36" stroke="#6b4a2a" stroke-width="2.4"/>`;
  return (
    `<g transform="translate(0 ${y}) scale(${sc})" opacity="${op}"><g class="sail" style="animation-duration:${dur}s;animation-delay:${delay}s"><g class="bob">` +
    oars +
    `<line x1="100" y1="-128" x2="100" y2="-4" stroke="#3a2514" stroke-width="5"/><line x1="52" y1="-124" x2="148" y2="-124" stroke="#3a2514" stroke-width="3"/><path d="M100 -128 L4 -26 M100 -128 L196 -26" stroke="#3a2514" stroke-width="1" opacity=".7"/>` +
    `<clipPath id="${id}"><path d="M54 -122 Q100 -114 146 -122 L150 -46 Q100 -34 50 -46Z"/></clipPath><g class="billow"><path d="M54 -122 Q100 -114 146 -122 L150 -46 Q100 -34 50 -46Z" fill="#f1e4cc"/><g clip-path="url(#${id})"><rect x="50" y="-130" width="17" height="100" fill="#b0302a"/><rect x="84" y="-130" width="17" height="100" fill="#b0302a"/><rect x="118" y="-130" width="17" height="100" fill="#b0302a"/></g><path d="M54 -122 Q100 -114 146 -122 L150 -46 Q100 -34 50 -46Z" fill="none" stroke="#6b3a24" stroke-width="1.4"/></g>` +
    crew +
    `<path d="M0 -24 C-6 -40 4 -46 12 -34 L34 -10 C74 6 126 6 166 -10 L188 -34 C196 -46 206 -40 200 -24 C190 6 150 20 100 20 C50 20 10 6 0 -24Z" fill="#2b1a10"/><path d="M14 -8 C60 8 140 8 186 -8 M20 4 C64 14 136 14 180 4" stroke="#5a3a24" stroke-width="1.4" fill="none"/><path d="M12 -34 L34 -10 C74 6 126 6 166 -10 L188 -34" stroke="#9a6a40" stroke-width="1.4" fill="none" opacity=".8"/>` +
    `<path d="M200 -24 C206 -52 216 -64 228 -60 C234 -58 236 -52 230 -50 C224 -52 218 -48 214 -38Z" fill="#2b1a10"/><circle cx="227" cy="-57" r="1.6" fill="#e8b84a"/><path d="M0 -24 C-8 -46 -2 -58 -12 -60 C-4 -64 4 -50 6 -34" fill="#2b1a10"/>` +
    shields +
    `<path class="shimmer" d="M196 10 C214 4 230 12 240 20 C226 18 212 16 198 18Z" fill="#ffffff" opacity=".7"/>` +
    `</g></g></g>`
  );
}

function wave(y: number, a: number, dur: number, fill: string, crest: string): string {
  return `<g class="waveL" style="animation-duration:${dur}s"><path d="${wavePath(y, a)}" fill="${fill}" opacity=".9"/><path d="${crestPath(y, a)}" fill="none" stroke="${crest}" stroke-width="1.6" stroke-dasharray="44 30 14 36" opacity=".24"/></g>`;
}

export function drawMer(k: Kit): string {
  const { R, bird } = k;
  let rays = "";
  let gl = "";
  for (let i = 0; i < 9; i++) {
    const ax = -80 + i * 20;
    rays += `<polygon class="breathe" style="animation-delay:-${f1(i * 0.9)}s" points="880,560 ${f1(880 + Math.tan((ax * Math.PI) / 180) * 560 - 14)},0 ${f1(880 + Math.tan((ax * Math.PI) / 180) * 560 + 14)},0" fill="url(#meRay)"/>`;
  }
  for (let i = 0; i < 48; i++) {
    const y = R(572, 770);
    const x = 880 + R(-1, 1) * (16 + (y - 566) * 0.9);
    gl += `<ellipse class="tw" cx="${f1(x)}" cy="${f1(y)}" rx="${f1(R(6, 26))}" ry="1.6" fill="#ffcf8a" style="animation-duration:${f1(R(1.6, 3.6))}s;animation-delay:-${f1(R(0, 4))}s"/>`;
  }
  return (
    SVGO +
    "<defs>" +
    RG("meSun", [
      [0, "#fff3d0", 1],
      [0.16, "#ffd38a", 0.75],
      [0.5, "#ff9a5a", 0.22],
      [1, "#ff7a4a", 0],
    ]) +
    LG("meRay", 0, 0, 0, 1, [
      [0, "#ffd8a0", 0],
      [1, "#ffd8a0", 0.11],
    ]) +
    RG("meMistR", [
      [0, "#f3e3d0", 0.3],
      [1, "#f3e3d0", 0],
    ]) +
    LG("meRefl", 0, 0, 1, 0, [
      [0, "#ffc98a", 0],
      [0.5, "#ffc98a", 0.22],
      [1, "#ffc98a", 0],
    ]) +
    LG(
      "meCloud",
      0,
      -14,
      0,
      10,
      [
        [0, "#5d4673"],
        [1, "#f2a066"],
      ],
      true,
    ) +
    LG("meSea", 0, 0, 0, 1, [
      [0, "#3c4f74"],
      [0.4, "#26385a"],
      [1, "#111c34"],
    ]) +
    LG("meCliff", 0, 0, 1, 0, [
      [0, "#9a5a4a"],
      [0.28, "#4a3046"],
      [1, "#261d34"],
    ]) +
    RG("meGlow", [
      [0, "#ffb347", 0.8],
      [1, "#ffb347", 0],
    ]) +
    "</defs>" +
    '<circle cx="880" cy="560" r="380" fill="url(#meSun)"/>' +
    rays +
    '<circle cx="880" cy="562" r="58" fill="#fff0c4"/>' +
    drifting(stratus(220, "meCloud", 0.85), 300, 260, -80) +
    drifting(stratus(160, "meCloud", 0.75), 380, 220, -150) +
    drifting(stratus(260, "meCloud", 0.7), 450, 300, -40) +
    drifting(stratus(130, "meCloud", 0.8), 220, 200, -20) +
    '<g fill="#3a2a3e" opacity=".6"><path d="M300 566 q20 6 40 0 l-4 -4 h-32z"/><path d="M320 562 v-18 l12 12z"/><path d="M640 566 q14 4 28 0 l-3 -3 h-22z"/><path d="M654 563 v-13 l9 9z"/></g>' +
    bird(330, 62, -10, 1.3, "#2a2033") +
    bird(370, 88, -45, 1, "#2a2033") +
    bird(300, 110, -75, 1.1, "#2a2033") +
    '<path d="M930 612 C944 582 960 542 990 522 C1010 508 1030 500 1050 496 L1090 486 C1130 478 1180 476 1240 480 V650 H930Z" fill="url(#meCliff)"/>' +
    '<path d="M960 560 C1000 548 1060 546 1120 540 M950 590 C1000 578 1080 576 1160 568 M1010 516 C1060 506 1120 500 1200 498" stroke="#1d1628" stroke-width="2" fill="none" opacity=".6"/>' +
    '<g fill="#221a2e"><rect x="1062" y="446" width="80" height="42"/><polygon points="1058,446 1102,420 1146,446"/><rect x="1146" y="404" width="26" height="84"/><polygon points="1142,404 1159,380 1176,404"/><rect x="1040" y="466" width="24" height="22"/></g>' +
    '<path d="M1062 446 V488 M1146 404 V488" stroke="#c9785a" stroke-width="1.6" opacity=".7"/><g fill="#ffcf7a"><rect x="1076" y="458" width="5" height="10" rx="2.5"/><rect x="1096" y="458" width="5" height="10" rx="2.5"/><rect x="1116" y="458" width="5" height="10" rx="2.5"/><rect x="1156" y="420" width="6" height="12" rx="3"/></g>' +
    '<circle class="flicker" cx="1159" cy="372" r="54" fill="url(#meGlow)"/>' +
    flame(1159, 380, 0.8) +
    '<rect x="0" y="566" width="1200" height="234" fill="url(#meSea)"/>' +
    wave(600, 8, 28, "#2e4a70", "#ffd7a8") +
    ship("shipA", 632, 0.55, 210, -40, 0.85) +
    wave(646, 10, 22, "#25415f", "#ffd7a8") +
    ship("shipB", 700, 1.2, 150, -95, 1) +
    wave(712, 11, 16, "#1b3757", "#ffc994") +
    wave(760, 12, 12, "#132c4a", "#ffc994") +
    '<rect x="760" y="566" width="240" height="234" fill="url(#meRefl)"/>' +
    gl +
    '<path class="shimmer" d="M930 612 C950 616 970 610 990 616 M940 624 C980 630 1020 622 1060 628" stroke="#ffffff" stroke-width="2.4" fill="none" opacity=".6"/>' +
    drifting('<ellipse cx="0" cy="0" rx="360" ry="20" fill="url(#meMistR)"/>', 588, 200, -90) +
    "</svg>"
  );
}
