/* Scriptorium : moine copiste, fenêtre et chandelle. */
import { blocks, flame, LG, particle, RG, SVGO, type Kit } from "./kit";

export function drawCodex(k: Kit): string {
  const { rnd } = k;
  let lat = "";
  let books = "";
  let l = "";
  let r = "";
  let pl = "";
  const cols = ["#6b2d2d", "#2d4a6b", "#3f5a2d", "#6b4f2d", "#4a2d6b", "#7a5a2d"];
  for (let i = -8; i < 14; i++) {
    lat += `M${984 + i * 20} 124 L${984 + i * 20 + 280} 404 M${984 + i * 20} 404 L${984 + i * 20 + 280} 124 `;
  }
  for (let sh = 0; sh < 4; sh++) {
    const by = 200 + sh * 130;
    books += `<rect x="0" y="${by + 64}" width="128" height="8" fill="#2a1a0e"/>`;
    let bx = 6;
    while (bx < 118) {
      const w = 11 + Math.floor(rnd() * 9);
      const h = 42 + Math.floor(rnd() * 20);
      books += `<rect x="${bx}" y="${by + 64 - h}" width="${w}" height="${h}" rx="1.5" fill="${cols[Math.floor(rnd() * cols.length)]}"/><rect x="${bx}" y="${by + 64 - h + 8}" width="${w}" height="2.4" fill="#d9b45a" opacity=".75"/>`;
      bx += w + 2;
    }
  }
  for (let i = 0; i < 6; i++) {
    l += `<path d="M762 ${700 + i * 9} C800 ${692 + i * 9} 840 ${695 + i * 9} 878 ${703 + i * 9}" stroke="#7a5a38" stroke-width="1.6" opacity=".55" fill="none"/>`;
    r += `<path d="M1018 ${700 + i * 9} C980 ${692 + i * 9} 940 ${695 + i * 9} 902 ${703 + i * 9}" stroke="#7a5a38" stroke-width="1.6" opacity=".55" fill="none"/>`;
  }
  for (let i = 0; i < 7; i++) pl += `M0 ${748 + i * 9} H1200 `;
  return (
    SVGO +
    "<defs>" +
    LG("cxWall", 0, 0, 0, 1, [
      [0, "#5f4329"],
      [1, "#3a2716"],
    ]) +
    RG("cxCandle", [
      [0, "#ffd88a", 0.75],
      [0.4, "#ffb347", 0.24],
      [1, "#ff9a3c", 0],
    ]) +
    RG("cxWarm", [
      [0, "#ffcf8a", 0.32],
      [1, "#ffcf8a", 0],
    ]) +
    LG("cxGlass", 0, 0, 0, 1, [
      [0, "#e6f0fa"],
      [1, "#f7ebcf"],
    ]) +
    LG("cxBeam", 0, 0, 0, 1, [
      [0, "#fff3d6", 0.4],
      [1, "#fff3d6", 0],
    ]) +
    LG("cxRobe", 0, 0, 1, 0, [
      [0, "#24180f"],
      [0.7, "#3b2a1c"],
      [1, "#8a6038"],
    ]) +
    LG("cxFloor", 0, 0, 0, 1, [
      [0, "#3a2716"],
      [1, "#1e130a"],
    ]) +
    RG("cxWin", [
      [0, "#fff1cf", 0.4],
      [1, "#fff1cf", 0],
    ]) +
    '<clipPath id="cxWinClip"><path d="M984 404 V200 A60 60 0 0 1 1104 200 V404Z"/></clipPath>' +
    "</defs>" +
    '<rect x="0" y="0" width="1200" height="760" fill="url(#cxWall)"/>' +
    blocks(0, 0, 1200, 744, 46, 92, "#24160b", 0.38, 1.5) +
    '<circle cx="840" cy="640" r="440" fill="url(#cxWarm)"/>' +
    '<circle cx="1044" cy="262" r="240" fill="url(#cxWin)"/>' +
    '<path d="M966 420 V196 A78 78 0 0 1 1122 196 V420Z" fill="#26180d"/>' +
    '<path d="M984 404 V200 A60 60 0 0 1 1104 200 V404Z" fill="url(#cxGlass)"/>' +
    `<g clip-path="url(#cxWinClip)"><path d="${lat}" stroke="#7a6548" stroke-width="1.6" opacity=".5"/></g>` +
    '<path d="M1044 140 V404 M984 300 H1104" stroke="#2a1b10" stroke-width="6"/><rect x="960" y="416" width="168" height="10" fill="#4a3220"/>' +
    '<polygon class="breathe" points="984,404 1104,404 980,800 690,800" fill="url(#cxBeam)"/>' +
    '<rect x="0" y="180" width="134" height="560" fill="#3a2616"/>' +
    books +
    '<rect x="0" y="176" width="140" height="10" fill="#2a1a0e"/>' +
    `<rect x="0" y="744" width="1200" height="56" fill="url(#cxFloor)"/><path d="${pl}" stroke="#120b05" stroke-opacity=".5" stroke-width="1.2"/>` +
    '<g class="swing" style="transform-origin:880px 0px"><line x1="880" y1="0" x2="880" y2="150" stroke="#2a1b10" stroke-width="3" stroke-dasharray="6 3"/><path d="M864 150 h32 l-4 10 h-24z" fill="#7a5a2c"/><rect x="866" y="160" width="28" height="36" rx="5" fill="#8a6a34"/><rect x="871" y="165" width="18" height="26" rx="3" fill="#ffd88a"/><path d="M864 196 h32 l-6 10 h-20z" fill="#7a5a2c"/><circle class="flicker" cx="880" cy="178" r="130" fill="url(#cxCandle)"/></g>' +
    '<rect x="700" y="690" width="380" height="10" fill="#5a3a22"/><rect x="706" y="700" width="368" height="58" fill="#3f2816"/><rect x="716" y="708" width="348" height="40" fill="none" stroke="#2a1a0e" stroke-width="2"/>' +
    '<path d="M752 694 C810 674 856 676 890 698 C924 676 970 674 1028 694 V766 H752Z" fill="#5a2a18"/>' +
    '<path d="M890 690 C852 672 800 668 760 684 L760 756 C800 742 852 746 890 762Z" fill="#f4e6c4" stroke="#6b4a2c" stroke-width="2"/>' +
    '<path d="M890 690 C928 672 980 668 1020 684 L1020 756 C980 742 928 746 890 762Z" fill="#f4e6c4" stroke="#6b4a2c" stroke-width="2"/>' +
    l +
    r +
    '<rect x="770" y="690" width="22" height="22" fill="#8f2a2a" stroke="#d9b45a" stroke-width="2"/><text x="781" y="707" text-anchor="middle" font-family="Georgia,serif" font-size="16" font-weight="700" fill="#e8c46a">L</text>' +
    '<circle cx="960" cy="712" r="12" fill="none" stroke="#2d4a6b" stroke-width="2"/><path d="M952 716 l8 -10 l8 10" fill="#3f5a2d" opacity=".7"/>' +
    '<path class="turn" style="transform-origin:890px 724px" d="M890 690 C928 672 980 668 1020 684 L1020 756 C980 742 928 746 890 762Z" fill="#fbf1d6" stroke="#6b4a2c" stroke-width="1.6"/>' +
    '<circle class="flicker" cx="726" cy="640" r="150" fill="url(#cxCandle)"/><rect x="714" y="684" width="24" height="6" rx="2" fill="#6b4a2c"/><rect x="719" y="640" width="14" height="46" rx="2" fill="#f2e3bf"/><path d="M719 650 q-3 6 0 10" stroke="#e6d2a6" stroke-width="2" fill="none"/>' +
    flame(726, 642, 0.8) +
    '<rect x="1046" y="676" width="24" height="16" rx="4" fill="#20160e"/>' +
    '<rect x="1104" y="700" width="72" height="9" fill="#4a3220"/><path d="M1110 709 V760 M1170 709 V760" stroke="#3a2616" stroke-width="5"/>' +
    '<path d="M1088 604 C1072 624 1068 664 1074 704 L1082 760 L1178 760 L1172 704 C1174 652 1162 612 1142 594 C1126 586 1102 588 1088 604Z" fill="url(#cxRobe)"/>' +
    '<path d="M1084 602 C1074 582 1080 550 1104 542 C1128 536 1146 554 1144 580 C1142 596 1130 606 1112 606 C1100 606 1090 606 1084 602Z" fill="#2c1e14"/><path d="M1140 560 C1146 572 1144 590 1136 600" stroke="#a87a4a" stroke-width="2.2" fill="none" opacity=".7"/>' +
    '<ellipse cx="1091" cy="578" rx="8" ry="13" fill="#120a05"/><path d="M1085 575 q-4 4 -1 8" stroke="#c08a58" stroke-width="2" fill="none" stroke-linecap="round"/>' +
    '<path d="M1150 610 C1160 640 1164 690 1168 730" stroke="#a87a4a" stroke-width="2" fill="none" opacity=".55"/>' +
    '<g class="write" style="transform-origin:1098px 614px"><path d="M1098 614 C1072 632 1054 660 1036 684 L1046 692 C1064 670 1084 650 1108 630Z" fill="#35251a"/><ellipse cx="1038" cy="688" rx="6" ry="4.4" fill="#c9a07a"/><path d="M1036 690 L1062 640" stroke="#efe2c4" stroke-width="2"/><path d="M1062 640 C1072 626 1082 626 1088 616 C1082 636 1072 644 1062 640Z" fill="#f4ead2" stroke="#6b4a2c" stroke-width="1"/></g>' +
    "</svg>"
  );
}

export function codexParticles(k: Kit): string {
  const { rnd } = k;
  const letters = "ABCDEGILMNOPQRSTUVX";
  let out = "";
  for (let i = 0; i < 12; i++) {
    const text = letters.charAt(Math.floor(rnd() * letters.length));
    out += particle(
      "letter",
      "left:" +
        rnd() * 100 +
        "%;font-size:" +
        (20 + rnd() * 26) +
        "px;animation-duration:" +
        (26 + rnd() * 18) +
        "s;animation-delay:-" +
        rnd() * 30 +
        "s;--dx:" +
        (rnd() * 80 - 40) +
        "px",
      text,
      "span",
    );
  }
  for (let i = 0; i < 16; i++) {
    const s = 1.6 + rnd() * 2;
    out += particle(
      "mote warm",
      "left:" +
        (58 + rnd() * 32) +
        "%;width:" +
        s +
        "px;height:" +
        s +
        "px;animation-duration:" +
        (16 + rnd() * 12) +
        "s;animation-delay:-" +
        rnd() * 24 +
        "s;--dx:" +
        rnd() * -60 +
        "px",
    );
  }
  return out;
}
