/*
 * Bibliothèque de dessin des décors : petites fonctions qui produisent du SVG en texte.
 * Chaque décor reçoit son propre générateur pseudo-aléatoire (graine fixe), pour que le
 * dessin soit identique d'un chargement à l'autre.
 */

export type Stop = [offset: number, color: string, opacity?: number];

/** Arrondi au dixième, sous forme de texte. */
export function f1(n: number): string {
  return String(Math.round(n * 10) / 10);
}

export function stops(list: Stop[]): string {
  return list
    .map(
      (s) =>
        `<stop offset="${s[0]}" stop-color="${s[1]}"${s[2] !== undefined ? ` stop-opacity="${s[2]}"` : ""}/>`,
    )
    .join("");
}

export function LG(
  id: string,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  list: Stop[],
  user?: boolean,
): string {
  return `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"${
    user ? ' gradientUnits="userSpaceOnUse"' : ""
  }>${stops(list)}</linearGradient>`;
}

export function RG(id: string, list: Stop[]): string {
  return `<radialGradient id="${id}">${stops(list)}</radialGradient>`;
}

export const SVGO =
  '<svg viewBox="0 0 1200 800" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">';

export function drifting(inner: string, y: number, dur: number, delay: number): string {
  return `<g transform="translate(0 ${y})"><g class="drift" style="animation-duration:${dur}s;animation-delay:${delay}s">${inner}</g></g>`;
}

export function cumulus(s: number, gid: string, op: number): string {
  return `<g transform="scale(${s})" opacity="${op}" fill="url(#${gid})"><circle cx="-62" cy="-4" r="30"/><circle cx="-28" cy="-26" r="40"/><circle cx="14" cy="-34" r="46"/><circle cx="58" cy="-16" r="34"/><circle cx="88" cy="0" r="24"/><rect x="-92" y="-8" width="204" height="30" rx="15"/></g>`;
}

export function stratus(w: number, gid: string, op: number): string {
  return `<g opacity="${op}" fill="url(#${gid})"><ellipse cx="0" cy="0" rx="${w}" ry="9"/><ellipse cx="${f1(w * 0.3)}" cy="-6" rx="${f1(w * 0.55)}" ry="8"/><ellipse cx="${f1(-w * 0.35)}" cy="4" rx="${f1(w * 0.5)}" ry="6"/></g>`;
}

export function butterfly(x: number, y: number, col: string, dur: number, delay: number): string {
  return `<g transform="translate(${x} ${y})"><g class="flit" style="animation-duration:${dur}s;animation-delay:${delay}s"><g class="flap"><path d="M0 0 C-6 -9 -13 -7 -11 0 C-13 6 -6 8 0 0Z M0 0 C6 -9 13 -7 11 0 C13 6 6 8 0 0Z" fill="${col}"/><rect x="-.8" y="-4" width="1.6" height="8" fill="#2a2018"/></g></g></g>`;
}

export function flower(x: number, y: number, c: string, r: number): string {
  const heart = c === "#ffffff" || c === "#f8f4e6" ? "#e8b938" : "#2a1a12";
  return `<g><path d="M${f1(x)} ${f1(y)} v${f1(r * 3.2)}" stroke="#4d6b30" stroke-width="1.4"/><circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="${c}"/><circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r * 0.35)}" fill="${heart}"/></g>`;
}

/** Appareil de pierres (assises décalées). */
export function blocks(
  x: number,
  y: number,
  w: number,
  h: number,
  rh: number,
  bw: number,
  col: string,
  op: number,
  sw?: number,
): string {
  let d = "";
  let row = 0;
  for (let yy = y + rh; yy < y + h; yy += rh) d += "M" + x + " " + yy + "H" + (x + w);
  for (let yy = y; yy < y + h; yy += rh, row++) {
    const off = ((row % 2) * bw) / 2;
    for (let xx = x + off + bw; xx < x + w; xx += bw)
      d += "M" + f1(xx) + " " + yy + "V" + Math.min(yy + rh, y + h);
  }
  return `<path d="${d}" stroke="${col}" stroke-opacity="${op}" stroke-width="${sw || 1.5}" fill="none"/>`;
}

export function cypress(x: number, y: number, s: number, c1: string, c2: string): string {
  return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 -230 C14 -180 20 -110 16 -40 C14 -14 8 0 0 0 C-8 0 -14 -14 -16 -40 C-20 -110 -14 -180 0 -230Z" fill="${c1}"/><path d="M0 -230 C-14 -180 -20 -110 -16 -40 C-14 -14 -8 0 0 0Z" fill="${c2}" opacity=".55"/></g>`;
}

export function umbrellaPine(
  x: number,
  y: number,
  s: number,
  dark: string,
  light: string,
  trunk: string,
): string {
  return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-3 0 C-2 -40 4 -80 0 -120 L6 -120 C10 -80 4 -40 5 0Z" fill="${trunk}"/><path d="M2 -100 L-30 -128 M3 -110 L36 -134" stroke="${trunk}" stroke-width="3"/><g fill="${dark}"><ellipse cx="0" cy="-138" rx="78" ry="20"/><ellipse cx="-40" cy="-146" rx="44" ry="16"/><ellipse cx="38" cy="-148" rx="48" ry="17"/></g><g fill="${light}"><ellipse cx="-12" cy="-153" rx="56" ry="11"/><ellipse cx="34" cy="-157" rx="34" ry="8"/></g></g>`;
}

export function pineSnow(x: number, y: number, s: number, c: string): string {
  let t = "";
  for (let i = 0; i < 4; i++) {
    const w = 22 + i * 15;
    const top = -150 + i * 30;
    t +=
      `<path d="M0 ${top} L${w} ${top + 46} Q0 ${top + 38} -${w} ${top + 46}Z" fill="${c}"/>` +
      `<path d="M0 ${top} L${w} ${top + 46} Q${f1(w * 0.4)} ${top + 41} 0 ${top + 40}Z" fill="#000" opacity=".22"/>` +
      `<path d="M0 ${top} L${f1(w * 0.5)} ${top + 21} Q${f1(w * 0.18)} ${top + 15} 0 ${top + 18} Q${f1(-w * 0.22)} ${top + 14} ${f1(-w * 0.52)} ${top + 22}Z" fill="#eef4fb" opacity=".93"/>` +
      `<path d="M${f1(-w * 0.9)} ${top + 44} Q${f1(-w * 0.6)} ${top + 38} ${f1(-w * 0.3)} ${top + 41}" stroke="#eef4fb" stroke-width="3" fill="none" opacity=".8" stroke-linecap="round"/>`;
  }
  return `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-5" y="-30" width="10" height="34" fill="#22190f"/>${t}</g>`;
}

export function oak(x: number, y: number, s: number, d: string, m: string, l: string): string {
  let c = "";
  let h1 = "";
  let h2 = "";
  [
    [-70, -210, 60],
    [-10, -244, 70],
    [62, -215, 62],
    [-40, -168, 55],
    [32, -172, 58],
    [96, -168, 40],
    [-104, -168, 38],
  ].forEach((p) => {
    c += `<circle cx="${p[0]}" cy="${p[1]}" r="${p[2]}" fill="${d}"/>`;
  });
  [
    [-62, -226, 40],
    [-2, -258, 46],
    [52, -232, 38],
    [-24, -198, 30],
    [-96, -180, 22],
  ].forEach((p) => {
    h1 += `<circle cx="${p[0]}" cy="${p[1]}" r="${p[2]}" fill="${m}"/>`;
  });
  [
    [-54, -240, 18],
    [6, -272, 22],
    [46, -248, 15],
    [-90, -188, 10],
  ].forEach((p) => {
    h2 += `<circle cx="${p[0]}" cy="${p[1]}" r="${p[2]}" fill="${l}"/>`;
  });
  return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-16 0 C-10 -60 -16 -110 -32 -150 L-18 -154 C-6 -122 0 -104 4 -152 L16 -152 C10 -104 14 -60 18 0Z" fill="#4a3624"/><g class="canopy">${c}${h1}${h2}</g></g>`;
}

export function roundTree(x: number, y: number, s: number, d: string, l: string): string {
  return `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-3" y="-18" width="6" height="18" fill="#5a4230"/><circle cx="0" cy="-34" r="20" fill="${d}"/><circle cx="-12" cy="-26" r="13" fill="${d}"/><circle cx="12" cy="-27" r="14" fill="${d}"/><circle cx="-5" cy="-40" r="11" fill="${l}"/><circle cx="6" cy="-34" r="7" fill="${l}"/></g>`;
}

export function flame(x: number, y: number, s: number): string {
  return `<g transform="translate(${x} ${y}) scale(${s})"><path class="flicker" d="M0 0 C-7 -6 -6 -16 0 -26 C6 -16 7 -6 0 0Z" fill="#ff9a3c"/><path class="flicker" style="animation-duration:1.7s" d="M0 0 C-4 -4 -3 -10 0 -17 C3 -10 4 -4 0 0Z" fill="#ffe08a"/></g>`;
}

export function wavePath(y: number, a = 10): string {
  return "M0 " + y + " q25 -" + a + " 50 0" + " t50 0".repeat(31) + " V800 H0Z";
}

export function crestPath(y: number, a = 10): string {
  return "M0 " + y + " q25 -" + a + " 50 0" + " t50 0".repeat(31);
}

/** Générateur pseudo-aléatoire de Park et Miller, et dessins qui en dépendent. */
export function createKit(seed: number) {
  let state = seed;

  function rnd(): number {
    state = (state * 16807) % 2147483647;
    return state / 2147483647;
  }

  function R(a: number, b: number): number {
    return a + rnd() * (b - a);
  }

  function bird(y: number, dur: number, delay: number, sc: number, col: string): string {
    return `<g transform="translate(0 ${y}) scale(${sc})"><g class="fly" style="animation-duration:${dur}s;animation-delay:${delay}s"><g class="wing" style="animation-duration:${f1(R(0.35, 0.55))}s"><path d="M0 0 q7 -9 14 0 q7 -9 14 0" fill="none" stroke="${col}" stroke-width="2.2" stroke-linecap="round"/></g></g></g>`;
  }

  function tuft(x: number, y: number, c: string, h = 1): string {
    return `<g class="sway" style="animation-duration:${f1(R(3, 6))}s;animation-delay:-${f1(R(0, 4))}s"><path d="M${f1(x)} ${y} q-3 ${f1(-14 * h)} -7 ${f1(-26 * h)} M${f1(x)} ${y} q2 ${f1(-13 * h)} 6 ${f1(-30 * h)} M${f1(x)} ${y} q0 ${f1(-16 * h)} -1 ${f1(-34 * h)}" stroke="${c}" stroke-width="2.6" fill="none" stroke-linecap="round"/></g>`;
  }

  return { rnd, R, bird, tuft };
}

export type Kit = ReturnType<typeof createKit>;

/** Particules en HTML (poussières, flocons, lettres) superposées au dessin. */
export function particle(className: string, style: string, text = "", tag: "i" | "span" = "i"): string {
  return `<${tag} class="${className}" style="${style}">${text}</${tag}>`;
}

export function warmMotes(k: Kit, n: number): string {
  let out = "";
  for (let i = 0; i < n; i++) {
    const s = 2 + k.rnd() * 3;
    out += particle(
      "mote warm",
      "left:" +
        k.rnd() * 100 +
        "%;width:" +
        s +
        "px;height:" +
        s +
        "px;animation-duration:" +
        (18 + k.rnd() * 16) +
        "s;animation-delay:-" +
        k.rnd() * 28 +
        "s;--dx:" +
        (k.rnd() * 70 - 35) +
        "px",
    );
  }
  return out;
}
