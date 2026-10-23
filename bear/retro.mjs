// ファミコン風の荒いドット絵（16x16前後・少ない色・ディザ影）
import { writeFileSync } from "node:fs";

export const PAL = {
  K: "#000000", B: "#9c4a1c", D: "#5c2408", M: "#f8b878", H: "#58309c", h: "#38186c",
  Y: "#f8b800", G: "#bcbcbc", X: "#6c6c6c", T: "#d8a048", R: "#c82000", U: "#0050c8", S: "#fcfcfc",
  l: "#c86c30", u: "#3c80f8", n: "#00287c", p: "#8458d0", r: "#f84820", e: "#7c1000", g: "#e8e8e8", N: "#1c1c8c",
};

const bear = {
  base: [
    "................",
    ".KK..........KK.",
    "KBBK........KBBK",
    "KBMBKKKKKKKKBMBK",
    ".KBBBBBBBBBBBBK.",
    "KBBBBBBBBBBBBBBK",
    "KBBBBKBBBBKBBBBK",
    "KBBBBKBBBBKBBBBK",
    "KBBBBBMMMMBBBBBK",
    ".KBBBMMKKMMBBBK.",
    "..KKBBMMMMBBKK..",
    ".KBBKKKKKKKKBBK.",
    "KBBKMMMMMMMMKBBK",
    "KMMKMMMMMMMMKMMK",
    ".KKBBBBBBBBBBKK.",
    "..KMMK....KMMK..",
    "..KKKK....KKKK..",
  ],
  mage: [
    ".........KK.....",
    "........KHHK....",
    ".......KHHK.....",
    "......KHHHHK....",
    ".....KHHYHHHK...",
    "KKHHHHHHHHHHHHKK",
    ".KKKKKKKKKKKKKK.",
    "KBBBBBBBBBBBBBBK",
    "KBBBBKBBBBKBBBBK",
    "KBBBBKBBBBKBBBBK",
    "KBBBBBMMMMBBBBBK",
    ".KBBBMMKKMMBBBK.",
    "..KKBBMMMMBBKK..",
    ".KHHHHHHHHHHHHK.",
    "KMMKHHHYHHHHKHHK",
    "KMMKHHHHHHHHKHHK",
    ".KKHHHhHhHhHHKK.",
    "..KHHhHhHhHhHK..",
    "..KKKKKKKKKKKK..",
  ],
  warrior: [
    "....KKKKKKKK....",
    "...KGGGGGGGGK...",
    "..KGGSGGGGGGGK..",
    "KBKGGGGGGGGGGKBK",
    "KBKXXXXXXXXXXKBK",
    "KBBBKKBBBBKKBBBK",
    "KBBBBKBBBBKBBBBK",
    "KBBBBKBBBBKBBBBK",
    "KBBBBBMMMMBBBBBK",
    ".KBBBMMKKMMBBBK.",
    "..KKBBMMMMBBKK..",
    ".KBBKGGGGGGKBBK.",
    "KBBBKGXGGXGKBBBK",
    "KMMBKGGGGGGKBBBK",
    "KMMKRRRRRRRRKBBK",
    ".KKRRRRRRRRRRKK.",
    "..KBBBK..KBBBK..",
    "..KKKKK..KKKKK..",
  ],
  hero: [
    "................",
    ".KK..........KK.",
    "KBBK........KBBK",
    "KBMBKKKKKKKKBMBK",
    ".KYYYYYRRYYYYYK.",
    "KBBBBBBBBBBBBBBK",
    "KBBBBKBBBBKBBBBK",
    "KBBBBKBBBBKBBBBK",
    "KBBBBBMMMMBBBBBK",
    ".KBBBMMKKMMBBBK.",
    "RKKKBBMMMMBBKKKR",
    "RKUUKKKKKKKKUUKR",
    "RKUUKUUUUUUKUUKR",
    "RKMMKUUYYUUKUUKR",
    "RRKKUUUUUUUUKKRR",
    "RRRKBBBKKBBBKRRR",
    "..RKKKK..KKKKR..",
  ],
};
// 力こぶポーズ（両腕を上げて、目は^ ^）。若くまの頭に腕と体を組み合わせて作る
{
  const head = bear.base.slice(1, 11).map(r => r);
  head[5] = "KBBBBKBBBBKBBBBK";
  head[6] = "KBBBKBKBBKBKBBBK";
  head[9] = "..KKBBMKKMBBKK..";
  const L = ["KKK", "KMM", "KMM", "KBK", "KBB", "KBB", ".KB", "..K", "...", "..."];
  const R = L.map(x => [...x].reverse().join(""));
  const rows = ["......................"];
  head.forEach((h, i) => rows.push(L[i] + h + R[i]));
  [".KBBKKKKKKKKBBK.", "KBBBMMMMMMMMBBBK", "KBBBMMMKKMMMBBBK", ".KKBBBBBBBBBBKK.", "..KMMK....KMMK..", "..KKKK....KKKK.."]
    .forEach(b => rows.push("..." + b + "..."));
  bear.flex = rows;
}
// 持ち物（右手側に重ねる）
const items = {
  // 武器は向かって左の腰で握り、刃は頭の横をかすめて上へ。ゆうしゃは右手に盾
  hero: { pad: 1, extra: 4, parts: [
    { x: 2, y: 0, rows: [".K..", "KSK.", "KSK.", "KSK.", "KSK.", "KSK.", "KSK.", "KSK.", "KSK.", "KSK.", "YYYY", "KMMK", "KMMK", ".YK."] },
    { x: 14, y: 9, rows: [".KKKKKK", "KYYYYYK", "KYNuNYK", "KYuYuYK", "KYNuNYK", ".KYYYK.", "..KYK..", "...K..."] },
  ] },
  mage: { pad: 1, extra: 0, parts: [
    { x: 2, y: 0, rows: [".KYK", "KYYYK", ".KYK", "..T.", "..T.", "..T.", "..T.", "..T.", "..T.", "..T.", "..T.", "..T.", "..T.", "KMMK", "KMMK", ".KTK", "..T.", "..T.", "..K."].map(r => r.padEnd(5, ".")) },
  ] },
  warrior: { pad: 2, extra: 0, parts: [
    { x: 1, y: 0, rows: ["KKKKKK", "KSXXXK", "KXXXXK", "KXXXXK", "KKKKKK", "..T...", "..T...", "..T...", "..T...", "..T...", "..T...", "..T...", ".KMMK.", ".KMMK.", "..KTK.", "...T..", "...K.."] },
  ] },
};

// 明暗：左上の縁を明るく、右の縁と下を暗く（スーファミ風）
const SHADE = { B: ["l", "D"], U: ["u", "n"], H: ["p", "h"], R: ["r", "e"] };
function shade(g) {
  const out = g.map(r => [...r]);
  const empty = (r, c) => !g[r] || !g[r][c] || g[r][c] === "." || g[r][c] === "K";
  g.forEach((row, r) => row.forEach((ch, c) => {
    const sh = SHADE[ch]; if (!sh) return;
    if (empty(r, c + 1) || (empty(r + 1, c) && c > row.length / 2)) out[r][c] = sh[1];
    else if (empty(r, c - 1) || empty(r - 1, c)) out[r][c] = sh[0];
  }));
  return out;
}

export function grid(name) {
  const base = bear[name];
  const it = items[name] || { pad: 0, extra: 0, parts: [] };
  const w = base[0].length + it.pad + it.extra;
  let h = base.length;
  it.parts.forEach(p => { h = Math.max(h, p.y + p.rows.length); });
  let g = Array.from({ length: h }, (_, r) => [...(".".repeat(it.pad) + (base[r] || "")).padEnd(w, ".")]);
  g = shade(g);
  it.parts.forEach(p => p.rows.forEach((row, r) => [...row].forEach((ch, c) => { if (ch !== ".") g[p.y + r][p.x + c] = ch; })));
  return g;
}

export function svg(name, px, { scan = false } = {}) {
  const g = grid(name), w = g[0].length * px, h = g.length * px;
  let s = "";
  g.forEach((row, r) => {
    let c = 0;
    while (c < row.length) {
      const ch = row[c]; if (ch === ".") { c++; continue; }
      let e = c + 1; while (e < row.length && row[e] === ch) e++;
      s += `<rect x="${c * px}" y="${r * px}" width="${(e - c) * px}" height="${px}" fill="${PAL[ch]}"/>`;
      c = e;
    }
  });
  if (scan) for (let y = 0; y < h; y += px) s += `<rect x="0" y="${y + px * .7}" width="${w}" height="${px * .3}" fill="#000" opacity=".18"/>`;
  return { w, h, svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges">${s}</svg>` };
}

if (import.meta.url === `file://${process.argv[1]}` && process.argv[2]) {
  const dir = process.argv[2], meta = {};
  for (const n of Object.keys(bear)) {
    const big = svg(n, 8), small = svg(n, 2);
    writeFileSync(`${dir}/retro-${n}-8x.svg`, big.svg);
    writeFileSync(`${dir}/retro-${n}-2x.svg`, small.svg);
    meta[n] = { big: [big.w, big.h], small: [small.w, small.h] };
  }
  console.log(JSON.stringify(meta));
}
