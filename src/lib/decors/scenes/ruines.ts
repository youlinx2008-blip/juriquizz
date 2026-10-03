/* Ruines romaines : forum au soleil couchant. */
import {
  blocks,
  butterfly,
  cumulus,
  cypress,
  drifting,
  f1,
  flower,
  LG,
  RG,
  SVGO,
  umbrellaPine,
  warmMotes,
  type Kit,
} from "./kit";

function column(
  x: number,
  base: number,
  h: number,
  w: number,
  gid: string,
  cap: string,
  shade: string,
): string {
  const top = base - h;
  let s = "";
  let d = "";
  let a = "";
  s += `<rect x="${f1(x - w * 0.8)}" y="${base - 12}" width="${f1(w * 1.6)}" height="12" fill="${cap}"/><rect x="${f1(x - w * 0.66)}" y="${base - 22}" width="${f1(w * 1.32)}" height="10" rx="4" fill="url(#${gid})"/>`;
  s += `<rect x="${f1(x - w / 2)}" y="${top + 26}" width="${w}" height="${h - 48}" fill="url(#${gid})"/>`;
  for (let k = 1; k < 6; k++) d += "M" + f1(x - w / 2 + (k * w) / 6) + " " + (top + 30) + "V" + (base - 24);
  s += `<path d="${d}" stroke="${shade}" stroke-opacity=".26" stroke-width="2"/>`;
  s += `<rect x="${f1(x - w * 0.55)}" y="${top + 20}" width="${f1(w * 1.1)}" height="6" fill="${cap}"/>`;
  s += `<path d="M${f1(x - w * 0.55)} ${top + 20} C${f1(x - w * 0.6)} ${top + 6} ${f1(x - w * 0.9)} ${top + 2} ${f1(x - w * 0.95)} ${top - 4} H${f1(x + w * 0.95)} C${f1(x + w * 0.9)} ${top + 2} ${f1(x + w * 0.6)} ${top + 6} ${f1(x + w * 0.55)} ${top + 20}Z" fill="url(#${gid})"/>`;
  for (let k = 0; k < 4; k++)
    a += `<path d="M${f1(x - w * 0.62 + k * w * 0.31)} ${top + 20} q${f1(w * 0.155)} -15 ${f1(w * 0.31)} 0" fill="none" stroke="${shade}" stroke-opacity=".38" stroke-width="2"/>`;
  s +=
    a +
    `<rect x="${f1(x - w * 1.05)}" y="${top - 12}" width="${f1(w * 2.1)}" height="9" fill="${cap}"/><circle cx="${f1(x - w * 0.86)}" cy="${top - 1}" r="5" fill="${cap}" stroke="${shade}" stroke-opacity=".4"/><circle cx="${f1(x + w * 0.86)}" cy="${top - 1}" r="5" fill="${cap}" stroke="${shade}" stroke-opacity=".4"/>`;
  return "<g>" + s + "</g>";
}

export function drawRuines(k: Kit): string {
  const { rnd, R, bird, tuft } = k;
  let aq1 = "M0 520 H1200 V541 H0 Z";
  let aq2 = "M0 541 H1200 V594 H0 Z";
  let rays = "";
  let fl = "";
  let tf = "";
  let ivy = "";
  let dent = "";
  for (let x = 6; x < 1200; x += 34) aq1 += ` M${x} 541 V533 A8 8 0 0 1 ${x + 16} 533 V541Z`;
  for (let x = 8; x < 1200; x += 52) aq2 += ` M${x} 594 V563 A15 15 0 0 1 ${x + 30} 563 V594Z`;
  [
    [700, 760],
    [880, 960],
    [1040, 1130],
    [1180, 1250],
    [540, 600],
  ].forEach((r, n) => {
    rays += `<polygon class="breathe" style="animation-delay:-${n * 1.7}s" points="820,170 ${r[0]},800 ${r[1]},800" fill="url(#ruRay)"/>`;
  });
  for (let i = 0; i < 34; i++) {
    const x = rnd() < 0.25 ? R(0, 110) : R(700, 1200);
    fl += flower(
      x,
      R(732, 790),
      ["#d8352a", "#d8352a", "#f8f4e6", "#e8b938"][Math.floor(rnd() * 4)],
      R(2.6, 4.4),
    );
  }
  for (let i = 0; i < 16; i++)
    tf += tuft(rnd() < 0.3 ? R(0, 110) : R(700, 1200), R(728, 792), "#5b6a2c", R(0.8, 1.3));
  const vp: [number, number][] = [];
  for (let i = 0; i <= 22; i++) {
    const t = i / 22;
    vp.push([912 + Math.sin(t * 5) * 7, 290 + t * 168]);
  }
  ivy +=
    '<path d="M' +
    vp.map((p) => f1(p[0]) + " " + f1(p[1])).join(" L") +
    '" stroke="#4a5a26" stroke-width="1.6" fill="none"/>';
  vp.forEach((p, n) => {
    const sx = p[0] + (n % 2 ? 5 : -5);
    const a = (n % 2 ? 35 : -35) + R(-25, 25);
    ivy += `<ellipse cx="${f1(sx)}" cy="${f1(p[1])}" rx="5.8" ry="3.2" transform="rotate(${f1(a)} ${f1(sx)} ${f1(p[1])})" fill="${rnd() < 0.5 ? "#5a6b2c" : "#7a8c3c"}"/>`;
  });
  for (let i = 0; i < 9; i++) {
    const lx = 906 + i * 7;
    const ly = R(286, 296);
    ivy += `<ellipse cx="${f1(lx)}" cy="${f1(ly)}" rx="5" ry="3" transform="rotate(${f1(R(-50, 50))} ${f1(lx)} ${f1(ly)})" fill="${rnd() < 0.5 ? "#5a6b2c" : "#7a8c3c"}"/>`;
  }
  for (let x = 904; x < 1166; x += 10) dent += `<rect x="${x}" y="240" width="6" height="7" fill="#c9a676"/>`;
  return (
    SVGO +
    "<defs>" +
    LG("ruFar", 0, 0, 0, 1, [
      [0, "#e6b49c"],
      [1, "#f1cfa6"],
    ]) +
    LG("ruHill", 0, 0, 0, 1, [
      [0, "#d6a773"],
      [1, "#bf9060"],
    ]) +
    LG("ruGround", 0, 0, 0, 1, [
      [0, "#a77a4a"],
      [1, "#5a3e25"],
    ]) +
    LG("ruCol", 0, 0, 1, 0, [
      [0, "#f8e7c4"],
      [0.45, "#e3c394"],
      [1, "#8f6a45"],
    ]) +
    LG("ruEnt", 0, 0, 0, 1, [
      [0, "#f3ddb4"],
      [1, "#b38c5b"],
    ]) +
    LG("ruDrum", 0, 0, 0, 1, [
      [0, "#ecd3a6"],
      [1, "#9b7449"],
    ]) +
    RG("ruSun", [
      [0, "#fff8e2", 1],
      [0.22, "#ffe7b4", 0.7],
      [1, "#ffd99a", 0],
    ]) +
    LG("ruRay", 0, 0, 0, 1, [
      [0, "#fff3d0", 0.34],
      [1, "#fff3d0", 0],
    ]) +
    LG(
      "ruCloud",
      0,
      -80,
      0,
      22,
      [
        [0, "#fffaf0"],
        [1, "#f0c49c"],
      ],
      true,
    ) +
    LG("ruMist", 0, 0, 0, 1, [
      [0, "#f8dcb0", 0],
      [0.7, "#f8dcb0", 0.55],
      [1, "#f8dcb0", 0],
    ]) +
    "</defs>" +
    '<circle cx="820" cy="170" r="320" fill="url(#ruSun)"/><circle cx="820" cy="170" r="44" fill="#fffaf0"/>' +
    drifting(cumulus(1.15, "ruCloud", 0.95), 130, 150, -40) +
    drifting(cumulus(1.5, "ruCloud", 0.8), 230, 200, -120) +
    drifting(cumulus(0.85, "ruCloud", 0.7), 80, 240, -70) +
    bird(200, 70, -12, 1.1, "#6b4a30") +
    bird(240, 95, -50, 0.85, "#6b4a30") +
    bird(170, 120, -80, 1, "#6b4a30") +
    '<g class="par" style="animation-duration:80s"><path d="M-40 520 L60 470 L160 492 L260 450 L380 488 L500 455 L620 492 L760 448 L900 486 L1020 455 L1140 480 L1240 462 V620 H-40Z" fill="url(#ruFar)" opacity=".9"/></g>' +
    `<path fill-rule="evenodd" d="${aq1}" fill="#d6aa82" opacity=".8"/><path fill-rule="evenodd" d="${aq2}" fill="#cfa078" opacity=".85"/>` +
    '<rect x="0" y="430" width="1200" height="200" fill="url(#ruMist)"/>' +
    '<g class="par" style="animation-duration:60s;animation-delay:-25s"><path d="M-40 600 C150 560 330 610 520 585 C700 560 880 605 1040 582 C1120 572 1180 585 1240 580 V800 H-40Z" fill="url(#ruHill)"/></g>' +
    umbrellaPine(735, 606, 0.8, "#76703f", "#958e55", "#5a4630") +
    umbrellaPine(805, 600, 0.62, "#76703f", "#958e55", "#5a4630") +
    umbrellaPine(1190, 594, 0.7, "#76703f", "#958e55", "#5a4630") +
    cypress(42, 702, 1, "#4f4a26", "#7d7a42") +
    cypress(86, 708, 0.78, "#4f4a26", "#7d7a42") +
    cypress(690, 646, 0.55, "#5f5a30", "#8a8650") +
    rays +
    '<path d="M-40 690 C200 676 460 700 700 690 C900 682 1060 694 1240 686 V800 H-40Z" fill="url(#ruGround)"/>' +
    '<rect x="846" y="704" width="380" height="28" fill="#b8915f" opacity=".55"/>' +
    blocks(846, 704, 380, 28, 14, 42, "#6b4a2c", 0.35, 1) +
    '<rect x="860" y="694" width="360" height="10" fill="#c39f72"/><rect x="872" y="684" width="348" height="10" fill="#d8b788"/><rect x="884" y="674" width="336" height="10" fill="#ebd2a6"/>' +
    blocks(860, 674, 360, 30, 10, 46, "#7a5634", 0.35, 1) +
    '<rect x="842" y="586" width="36" height="92" fill="url(#ruCol)"/><polygon points="842,586 850,574 858,584 866,570 878,582 878,586" fill="url(#ruCol)"/><rect x="836" y="670" width="48" height="6" fill="#e6cc9d"/>' +
    '<g fill="#4a2e18" opacity=".16"><polygon points="930,674 970,674 1060,702 1020,702"/><polygon points="1020,674 1060,674 1150,702 1110,702"/><polygon points="1110,674 1150,674 1240,702 1200,702"/></g>' +
    column(950, 674, 370, 40, "ruCol", "#e8cfa0", "#6b4a2c") +
    column(1040, 674, 370, 40, "ruCol", "#e8cfa0", "#6b4a2c") +
    column(1130, 674, 370, 40, "ruCol", "#e8cfa0", "#6b4a2c") +
    '<rect x="902" y="268" width="272" height="24" fill="url(#ruEnt)"/><rect x="902" y="247" width="272" height="21" fill="#ecd5ab"/>' +
    dent +
    '<rect x="894" y="226" width="286" height="12" fill="#f5e3be"/><rect x="896" y="238" width="282" height="3" fill="#6b4a2c" opacity=".25"/><rect x="902" y="290" width="272" height="3" fill="#6b4a2c" opacity=".22"/>' +
    '<polygon points="1174,226 1188,234 1180,247 1192,258 1178,270 1174,292" fill="#e9cfa3"/>' +
    ivy +
    '<g transform="translate(748 712) rotate(-6)"><rect x="0" y="-19" width="86" height="38" rx="3" fill="url(#ruDrum)"/><path d="M14 -19 V19 M28 -19 V19 M42 -19 V19 M56 -19 V19 M70 -19 V19" stroke="#6b4a2c" stroke-opacity=".22"/><ellipse cx="86" cy="0" rx="8" ry="19" fill="#ecd4a8" stroke="#a07a4c" stroke-opacity=".5"/></g>' +
    '<rect x="1004" y="712" width="42" height="22" rx="2" fill="#cdac7e"/><rect x="1004" y="712" width="42" height="5" fill="#e6c999"/><rect x="1072" y="722" width="30" height="16" rx="2" fill="#c3a172"/><rect x="928" y="726" width="36" height="18" rx="2" fill="#c8a678"/>' +
    tf +
    fl +
    butterfly(980, 700, "#f2c14e", 12, -3) +
    butterfly(1110, 720, "#fff8ea", 15, -8) +
    "</svg>"
  );
}

export function ruinesParticles(k: Kit): string {
  return warmMotes(k, 16);
}
