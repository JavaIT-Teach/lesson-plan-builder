#!/usr/bin/env node
// Board check: opens the app's lesson world (world.html) for each planned lesson, the way the classroom board
// shows it, and reports slides whose content does not fit. Run it after every write / set-world.
//
//   node board_check.js [--data DIR] [GROUP ...] [--all]
//
//   --data DIR  the lesson-plan-data clone (default: $LPB_DATA or /home/claude/lesson-plan-data)
//   GROUP       only these groups (e.g. i-even b-odd); default: every group
//   --all       also check taught lessons (history); default: the next lesson and lessons planned ahead
//
// Each slide reports its fit: 1.00 = full size. The board shrinks a long exercise to fit, so nothing is cut off,
// but below 0.60 the text is too small to read from the back of the room.
//   CUT    content still runs off the slide (a bug in the world, or a huge picture): fix before class
//   SMALL  fit < 0.60: split the exercise with {"type": "break"} (side-by-side columns) or move material
// Exit code 1 when any slide is CUT or SMALL.
const path = require('path'), fs = require('fs');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { console.error('ERROR: needs Playwright (npm i playwright, or a session where require("playwright") works)'); process.exit(2); }

const args = process.argv.slice(2);
let data = process.env.LPB_DATA || '/home/claude/lesson-plan-data', all = false; const groups = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--data') data = args[++i];
  else if (args[i] === '--all') all = true;
  else groups.push(args[i]);
}
const dbFile = fs.existsSync(path.join(data, 'lessons.json')) ? path.join(data, 'lessons.json') : data;
const db = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
const world = 'file://' + path.resolve(__dirname, '../../../../world.html');
const SIZES = [[1920, 1080, 'board 1920x1080'], [1920, 870, 'board, browser bars on'], [1366, 768, 'laptop']];

(async () => {
  const browser = await chromium.launch();
  let bad = 0, checked = 0;
  for (const [gid, g] of Object.entries(db.groups || {})) {
    if (groups.length && !groups.includes(gid)) continue;
    const lessons = [g.draft, ...(g.plans || []), ...(all ? g.history || [] : [])].filter(L => L && (L.exercises || []).some(e => !e.skipped));
    for (const L of lessons) {
      const name = `${gid} · Unit ${L.unit || '?'} · ${L.name || L.id}${L.date ? ' (taught ' + L.date + ')' : ''}`;
      const issues = new Map();
      for (const [w, h, label] of SIZES) {
        const page = await browser.newPage({ viewport: { width: w, height: h } });
        await page.addInitScript(d => { try { localStorage.setItem('lesson-plan-builder-v1', d); } catch (e) {} }, JSON.stringify(db));
        await page.goto(`${world}?g=${encodeURIComponent(gid)}&l=${encodeURIComponent(L.id)}`);
        await page.waitForTimeout(600);
        await page.evaluate(() => document.fonts && document.fonts.ready);
        await page.waitForTimeout(300);
        const res = await page.evaluate(() => [...document.querySelectorAll('.panel.bk')].map(p => ({
          id: p.dataset.id, fit: +(p.dataset.fit || 1), over: !!p.dataset.over,
          head: (p.querySelector('.rubric > span:last-child') || {}).textContent || '', stage: (p.querySelector('.stages .on') || {}).textContent || ''
        })));
        for (const r of res) {
          if (!r.over && r.fit >= 0.6) continue;
          const k = r.id, prev = issues.get(k);
          const ex = L.exercises.find(e => e.id === k.split(/[#.]/)[0]) || {};
          const msg = { what: `p.${ex.page || '?'} ex ${ex.num || '?'}${ex.sec ? ' (' + ex.sec + ')' : ''}${r.stage ? ' · stage ' + r.stage : ''}: ${r.head.trim().slice(0, 60)}`, cut: r.over, fit: r.fit, at: label };
          if (!prev || msg.cut > prev.cut || msg.fit < prev.fit) issues.set(k, msg);
        }
        await page.close();
      }
      checked++;
      if (!issues.size) { console.log(`ok     ${name}`); continue; }
      bad += issues.size;
      console.log(`CHECK  ${name}`);
      for (const m of issues.values()) console.log(`  ${m.cut ? 'CUT  ' : 'SMALL'} ${m.what}  [fit ${m.fit.toFixed(2)} on ${m.at}]`);
    }
  }
  await browser.close();
  console.log(`\n${checked} lesson(s) checked, ${bad} slide(s) to fix.`);
  process.exit(bad ? 1 : 0);
})();
