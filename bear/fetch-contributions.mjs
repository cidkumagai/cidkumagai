#!/usr/bin/env node
// GitHub の草（コントリビューションカレンダー）を取ってきて [{ date, count }] で書き出す
//
//   GITHUB_TOKEN=... node fetch-contributions.mjs --user cidkumagai --out git.json
//
// 期間は「今日（日本時間）を含めて 365 日」。gen-bear-idle.mjs と同じ範囲。
// プロフィールで「Private contributions」を表示する設定にしていれば、プライベートの分も数に入る。

import { writeFileSync } from "node:fs";

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith("--") && a.push([v.slice(2), arr[i + 1]]), a), []));
const user = args.user || process.env.GITHUB_REPOSITORY_OWNER;
const token = process.env.GITHUB_TOKEN;
if (!user || !token) {
  process.stderr.write("--user（または GITHUB_REPOSITORY_OWNER）と GITHUB_TOKEN が必要です。\n");
  process.exit(1);
}

const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const end = new Date(`${today}T00:00:00Z`);
const start = new Date(end); start.setUTCDate(start.getUTCDate() - 364);
const iso = d => d.toISOString().slice(0, 10);

const query = `query($user: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $user) {
    contributionsCollection(from: $from, to: $to) {
      contributionCalendar { weeks { contributionDays { date contributionCount } } }
    }
  }
}`;

const res = await fetch("https://api.github.com/graphql", {
  method: "POST",
  headers: { Authorization: `bearer ${token}`, "Content-Type": "application/json", "User-Agent": "bear-status" },
  body: JSON.stringify({ query, variables: { user, from: `${iso(start)}T00:00:00+09:00`, to: `${iso(end)}T23:59:59+09:00` } }),
});
const body = await res.json();
if (!res.ok || body.errors) {
  process.stderr.write(`草の取得に失敗しました: ${JSON.stringify(body.errors ?? body)}\n`);
  process.exit(1);
}

const days = body.data.user.contributionsCollection.contributionCalendar.weeks
  .flatMap(w => w.contributionDays)
  .map(d => ({ date: d.date, count: d.contributionCount }))
  .filter(d => d.date >= iso(start) && d.date <= iso(end));

const out = `${JSON.stringify(days, null, 2)}\n`;
if (args.out) writeFileSync(args.out, out); else process.stdout.write(out);
