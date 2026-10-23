#!/usr/bin/env node
// くまのステータス — 黒い窓の中でその場で足踏みするくまと、ステータス・どうぐの窓（README用SVG）
//
//   node gen-bear-idle.mjs --demo balance|brain|muscle --out demo.svg
//   node gen-bear-idle.mjs --git git.json --lift lift.json --out bear.svg
//
//   git.json  : [{ "date": "2026-10-19", "count": 4 }]
//   lift.json : [{ "date": "2026-10-19", "sessions": 1, "volume": 12450 }]
//
// 毎日作り直す前提。レベル・かしこさ・ちから・職業は直近1年分、どうぐは直近7日分から決まる。
// 文字は DotGothic16（SIL OFL）を使う文字だけ抜き出して埋め込む（pyftsubset が必要）。

import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { grid, PAL } from "./retro.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const FONT_TTF = process.env.BEAR_FONT || join(HERE, "font/DotGothic16-Regular.ttf");

// ---------- データ ----------
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith("--") && a.push([v.slice(2), arr[i + 1]]), a), []));
const outFile = args.out || "bear.svg";
// 「今日」は日本時間で決める（--end YYYY-MM-DD で上書きできる）
const todayJst = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const endDate = new Date((args.end || todayJst) + "T00:00:00Z");
const iso = d => d.toISOString().slice(0, 10);
const days = [];
for (let i = 364; i >= 0; i--) { const d = new Date(endDate); d.setUTCDate(d.getUTCDate() - i); days.push({ date: iso(d), dow: d.getUTCDay(), i: 364 - i }); }

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function demo(kind) {
  const r = rng({ balance: 11, brain: 23, muscle: 37 }[kind]);
  const git = [], lift = [];
  days.forEach(({ date, dow, i }) => {
    const wd = dow >= 1 && dow <= 5, wk = Math.floor(i / 7);
    const p = { balance: wd ? .7 : .35, brain: wd ? .95 : .7, muscle: wd ? .3 : .1 }[kind];
    git.push({ date, count: r() < p ? 1 + Math.floor(r() * { balance: 9, brain: 16, muscle: 4 }[kind]) : 0 });
    const plan = { balance: [1, 2, 3, 5, 6, 0], brain: [2, 6], muscle: [0, 1, 2, 3, 5, 6] }[kind];
    let vol = 0;
    if (!(wk >= 30 && wk <= 31) && plan.includes(dow) && r() < .92)
      vol = Math.round({ balance: 9000, brain: 5000, muscle: 12500 }[kind] * (wk % 6 === 5 ? .55 : 1) * (.7 + r() * .6));
    lift.push({ date, sessions: vol ? 1 : 0, volume: vol });
  });
  return { git, lift };
}
let git, lift;
if (args.demo) ({ git, lift } = demo(args.demo));
else { git = args.git ? JSON.parse(readFileSync(args.git, "utf8")) : []; lift = args.lift ? JSON.parse(readFileSync(args.lift, "utf8")) : []; }
const gm = new Map(git.map(g => [g.date, g.count || 0])), lm = new Map(lift.map(l => [l.date, l]));
const gitLevel = c => c <= 0 ? 0 : c <= 2 ? 1 : c <= 5 ? 2 : c <= 9 ? 3 : 4;
const liftLevel = v => v <= 0 ? 0 : v < 6000 ? 1 : v < 10000 ? 2 : v < 14000 ? 3 : 4;
days.forEach(d => { d.git = gitLevel(gm.get(d.date) || 0); const l = lm.get(d.date); d.lift = liftLevel(l?.volume || 0); d.sessions = l?.sessions || 0; });

// ---------- ステータス ----------
const GIT_TARGET = 0.40, LIFT_TARGET = 0.55, PTS_PER_LV = 30;
const sumG = days.reduce((n, d) => n + d.git, 0), sumL = days.reduce((n, d) => n + d.lift, 0);
const maxPts = days.length * 4;
const brain = Math.min(1, sumG / maxPts / GIT_TARGET), muscle = Math.min(1, sumL / maxPts / LIFT_TARGET);
const level = 1 + Math.floor((sumG + sumL) / PTS_PER_LV);
const wis = Math.round(brain * 99), str = Math.round(muscle * 99);
const job = brain - muscle > .15 ? "mage" : muscle - brain > .15 ? "warrior" : "hero";
const JOBS = { mage: "まほうつかい", warrior: "せんし", hero: "ゆうしゃ" };
const week = days.slice(-7);
const fruit = week.reduce((n, d) => n + (d.git ? 1 : 0), 0);          // 今週コミットした日数
const shake = week.reduce((n, d) => n + d.sessions, 0);               // 今週のトレーニング回数

// ---------- 草グラフ用の並び（列＝週、行＝曜日） ----------
const dow0 = days[0].dow;
days.forEach((d, i) => { d.col = Math.floor((i + dow0) / 7); d.row = (i + dow0) % 7; });
const NCOL = days.at(-1).col + 1;
const GITC = ["#1e1e1e", "#0e4429", "#006d32", "#26a641", "#39d353"];
const LIFTC = ["#1e1e1e", "#4a1d0a", "#8a3410", "#d64a0e", "#ff6a2b"];

// ---------- レイアウト（--variant で切り替え） ----------
// base: 今の形 / bars: バーを草に / ground: 足元が草 / record: 草の窓を追加 / map: ちず
const variant = args.variant || "base";
const W = 830, PX = 7;
const L = {
  base:   { H: 194, LW: [6, 6, 236, 182], SW: [252, 6, 572, 104], IW: [252, 118, 572, 70] },
  bars:   { H: 194, LW: [6, 6, 236, 182], SW: [252, 6, 572, 104], IW: [252, 118, 572, 70] },
  ground: { H: 230, LW: [6, 6, 236, 218], SW: [252, 6, 572, 126], IW: [252, 140, 572, 84] },
  record: { H: 262, LW: [6, 6, 236, 250], SW: [252, 6, 572, 104], IW: [252, 118, 572, 70], RW: [252, 196, 572, 60] },
  map:    { H: 334, LW: [6, 6, 236, 182], SW: [252, 6, 572, 104], IW: [252, 118, 572, 70], MW: [6, 198, 818, 130] },
}[variant];
const box = a => a && { x: a[0], y: a[1], w: a[2], h: a[3] };
const H = L.H, LW = box(L.LW), SW = box(L.SW), IW = box(L.IW), RW = box(L.RW), MW = box(L.MW);

const win = ({ x, y, w, h }) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="9" fill="#000"/>` +
  `<rect x="${x + 5}" y="${y + 5}" width="${w - 10}" height="${h - 10}" rx="5" fill="none" stroke="#fcfcfc" stroke-width="3"/>`;

function rects(rows, px, x0, y0, pal) {
  let s = "";
  rows.forEach((row0, r) => {
    const row = typeof row0 === "string" ? [...row0] : row0;
    let c = 0;
    while (c < row.length) {
      const ch = row[c]; if (ch === ".") { c++; continue; }
      let e = c + 1; while (e < row.length && row[e] === ch) e++;
      s += `<rect x="${x0 + c * px}" y="${y0 + r * px}" width="${(e - c) * px}" height="${px}" fill="${pal[ch]}"/>`;
      c = e;
    }
  });
  return s;
}

// 草グラフ（1マス cell、間隔 gap）
function graph(x0, y0, key, colors, cell = 3, gap = 1, rx = 0) {
  let s = "";
  for (const d of days) s += `<rect x="${x0 + d.col * (cell + gap)}" y="${y0 + d.row * (cell + gap)}" width="${cell}" height="${cell}"${rx ? ` rx="${rx}"` : ""} fill="${colors[d[key]]}"/>`;
  return `<g shape-rendering="crispEdges">${s}</g>`;
}

// 足踏み：Aは体が1ドット下（上に空行）、Bは腰の行を1つ増やして体が1ドット上がる
function idleBear(floorY = LW.y + LW.h - 22, px = PX, cx = LW.x + LW.w / 2) {
  const g = grid(job).map(r => r.join(""));
  const w = g[0].length, h = g.length, blank = ".".repeat(w);
  const A = [blank, ...g];
  const B = [...g.slice(0, h - 2), g[h - 3], ...g.slice(h - 2)];
  const x0 = Math.round(cx - w * px / 2), y0 = floorY - (h + 1) * px;
  const frame = (rows, show) =>
    `<g opacity="${show ? 1 : 0}"><animate attributeName="opacity" values="${show ? "1;0" : "0;1"}" keyTimes="0;0.5" dur="1s" calcMode="discrete" repeatCount="indefinite"/>${rects(rows, px, x0, y0, PAL)}</g>`;
  return `<g shape-rendering="crispEdges">${frame(A, true)}${frame(B, false)}</g>`;
}

// ---------- 文字 ----------
const texts = [];
const T = (x, y, s, { size = 18, color = "#fcfcfc", anchor = "start" } = {}) => { texts.push(String(s)); return `<text x="${x}" y="${y}" font-size="${size}" fill="${color}" text-anchor="${anchor}">${s}</text>`; };
const dateStr = endDate.toISOString().slice(0, 10).replaceAll("-", "/");

function status() {
  const lx = SW.x + 28, y1 = SW.y + 36;
  let s = T(lx, y1, JOBS[job]) + T(lx + 170, y1, "Lv") + T(lx + 200, y1, level) + T(SW.x + SW.w - 26, y1, dateStr, { size: 14, color: "#9a9a9a", anchor: "end" });
  if (variant === "bars") {
    // バーの代わりに、1年分の草を週ごとにまとめた1列（左が1年前、右が今週）
    const strip = (y, label, key, colors, v) => {
      const sums = Array.from({ length: NCOL }, (_, c) => days.filter(d => d.col === c).reduce((n, d) => n + d[key], 0));
      const max = Math.max(1, ...sums);
      let r = "";
      sums.forEach((n, c) => { const lv = n === 0 ? 0 : Math.min(4, 1 + Math.floor(n / max * 3.999)); r += `<rect x="${lx + 110 + c * 6}" y="${y - 12}" width="5" height="11" fill="${colors[lv]}"/>`; });
      return T(lx, y, label) + `<g shape-rendering="crispEdges">${r}</g>` + T(SW.x + SW.w - 26, y, v, { anchor: "end" });
    };
    return s + strip(SW.y + 64, "かしこさ", "git", GITC, wis) + strip(SW.y + 90, "ちから", "lift", LIFTC, str);
  }
  const bar = (y, label, v, c) => T(lx, y, label) + `<rect x="${lx + 110}" y="${y - 12}" width="330" height="11" fill="#2a2a2a"/><rect x="${lx + 110}" y="${y - 12}" width="${Math.round(v / 99 * 330)}" height="11" fill="${c}"/>` + T(SW.x + SW.w - 26, y, v, { anchor: "end" });
  const dy = variant === "ground" ? 10 : 0;
  return s + bar(SW.y + 64 + dy, "かしこさ", wis, "#40c463") + bar(SW.y + 90 + dy * 2, "ちから", str, "#ff6a1f");
}

const FRUIT = ["....fK..", "...fLf..", "..KKKKK.", ".KFFFFFK", "KFWFFFFFK", "KFWFFFFFK", "KFFFFFFFK", ".KFFFFFK.", "..KKKKK.."];
const SHAKER = [".KKKKK.", ".KXXXK.", "KKKKKKK", "KOOOOOK", "KOWOOoK", "KOWOOoK", "KZZZZZK", "KOOOOoK", "KOOOOoK", "KOOOOoK", ".KKKKK."];
const IP = { ...PAL, F: "#40c463", f: "#216e39", L: "#9be9a8", O: "#ff6a1f", o: "#c84a10", W: "#fcfcfc", Z: "#f8d878" };
function items() {
  const y = IW.y + Math.round(IW.h / 2) + 9, lx = IW.x + 28;
  return T(lx, y, "こんしゅう", { size: 15, color: "#9a9a9a" }) +
    `<g shape-rendering="crispEdges">${rects(FRUIT, 3, lx + 112, y - 22, IP)}</g>` + T(lx + 146, y, "ちえのみ") + T(lx + 300, y, `× ${fruit}`) +
    `<g shape-rendering="crispEdges">${rects(SHAKER, 3, lx + 362, y - 26, IP)}</g>` + T(lx + 392, y, "プロテイン") + T(IW.x + IW.w - 26, y, `× ${shake}`, { anchor: "end" });
}

// 足元の地面：上がgit、下がliftの草（1マス3px）
function groundStrips() {
  const gw = NCOL * 4 - 1, x0 = LW.x + Math.round((LW.w - gw) / 2);
  const yLift = LW.y + LW.h - 14 - 27, yGit = yLift - 31;
  return { svg: graph(x0, yGit, "git", GITC) + graph(x0, yLift, "lift", LIFTC), top: yGit };
}

// きろく窓：2つの草グラフを横に並べる
function record() {
  const y0 = RW.y + 17, lx = RW.x + 24;
  return T(lx, y0 + 21, "git", { size: 15, color: "#9a9a9a" }) + graph(lx + 40, y0, "git", GITC, 3, 1) +
    T(lx + 270, y0 + 21, "lift", { size: 15, color: "#9a9a9a" }) + graph(lx + 310, y0, "lift", LIFTC, 3, 1);
}

// ちず：草の濃さとトレの有無を地形にする（海・草原・森・岩山・まち）
const TILE = {
  sea:   { pal: { a: "#0838a8", b: "#3c78f0" }, rows: ["aaaaaaa", "aaabbaa", "aabaaba", "aaaaaaa", "abbaaaa", "baabaaa", "aaaaaaa"] },
  plain: { pal: { a: "#4ca83c", b: "#78d060" }, rows: ["aaaaaaa", "abaaaba", "aaaaaaa", "aaabaaa", "aaaaaaa", "abaaaba", "aaaaaaa"] },
  forest:{ pal: { a: "#4ca83c", b: "#155a24", c: "#5a3a18" }, rows: ["aabbbaa", "abbbbba", "bbbbbbb", "abbbbba", "aabcbaa", "aaacaaa", "aaaaaaa"] },
  mount: { pal: { a: "#4ca83c", b: "#a0582a", c: "#e8a070", d: "#fcfcfc" }, rows: ["aaadaaa", "aadbbaa", "acbbbba", "acbbbba", "cbbbbbb", "bbbbbbb", "aaaaaaa"] },
  town:  { pal: { a: "#4ca83c", b: "#c82000", c: "#e8d8b0", d: "#000000" }, rows: ["abbabba", "bbbbbbb", "cccbccc", "cdcbcdc", "cccbccc", "aaaaaaa", "aaaaaaa"] },
};
function worldMap() {
  const tp = 2, ts = 7 * tp, mapW = NCOL * ts, mapH = 7 * ts;
  const x0 = MW.x + Math.round((MW.w - mapW) / 2), y0 = MW.y + Math.round((MW.h - mapH) / 2);
  let s = "";
  for (const d of days) {
    const kind = d.lift >= 3 ? "mount" : d.git >= 3 ? "forest" : d.git || d.lift ? "plain" : "sea";
    const t = TILE[kind];
    s += rects(t.rows, tp, x0 + d.col * ts, y0 + d.row * ts, t.pal);
  }
  // 今日のマスに小さいくま
  const today = days.at(-1), g = grid(job);
  const bx = x0 + today.col * ts + ts / 2 - (g[0].length * 1.5) / 2, by = y0 + today.row * ts + ts - g.length * 1.5;
  s += `<rect x="${x0 + today.col * ts - 1}" y="${y0 + today.row * ts - 1}" width="${ts + 2}" height="${ts + 2}" fill="none" stroke="#f8d020" stroke-width="2"/>`;
  s += rects(g, 1.5, bx, by - 6, PAL);
  return `<g shape-rendering="crispEdges">${s}</g>`;
}

function fontFace(chars) {
  const dir = mkdtempSync(join(tmpdir(), "bearfont-"));
  const out = join(dir, "sub.woff");
  execFileSync("pyftsubset", [FONT_TTF, `--text=${chars}`, "--flavor=woff", `--output-file=${out}`, "--no-hinting"]);
  return `@font-face{font-family:"BearDot";src:url(data:font/woff;base64,${readFileSync(out).toString("base64")}) format("woff");}`;
}

const parts = [win(LW)];
if (variant === "ground") { const gs = groundStrips(); parts.push(gs.svg, idleBear(gs.top - 4)); } else parts.push(idleBear());
parts.push(win(SW), status(), win(IW), items());
if (RW) parts.push(win(RW), record());
if (MW) parts.push(win(MW), worldMap());
const body = parts.join("\n");
const chars = [...new Set(texts.join("") + "0123456789/×")].join("");
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="くまは${JOBS[job]}・レベル${level}。かしこさ${wis}、ちから${str}。今週はちえのみ${fruit}こ、プロテイン${shake}こ。">
<title>くま — ${JOBS[job]} Lv.${level}</title>
<style>${fontFace(chars)}text{font-family:"BearDot",monospace;}</style>
${body}
</svg>`;
writeFileSync(outFile, svg);
console.log(JSON.stringify({ out: outFile, variant, job: JOBS[job], level, wis, str, fruit, shake, kb: Math.round(svg.length / 1024) }));
