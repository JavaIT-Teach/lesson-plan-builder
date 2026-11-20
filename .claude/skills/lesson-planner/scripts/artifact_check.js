#!/usr/bin/env node
// Artifact check: opens every lesson artifact (artifacts/*.html in the app) the way the classroom board shows it,
// and reports anything that doesn't fit or breaks. Run it after every write / set-artifacts.
//
//   node artifact_check.js [--data DIR] [GROUP ...] [--all] [--demo] [--shots DIR]
//
//   --data DIR   the lesson-plan-data clone (default: $LPB_DATA or /home/claude/lesson-plan-data)
//   GROUP        only these groups (e.g. i-even b-odd); default: every group
//   --all        also check taught lessons (history); default: the next lesson and lessons planned ahead
//   --demo       check each template's built-in demo instead of lesson data (after changing a template)
//   --shots DIR  save a screenshot of each artifact (board size) to DIR, to look at it
//
//   ERROR   the page threw a script error, or the template doesn't exist
//   CUT     content runs off the 1600×900 stage: shorten it or split it into two artifacts
//   SCROLL  a list or area has more than fits and scrolls: fine for the teacher, but say so in the report
// Exit code 1 when anything is ERROR or CUT.
const path = require('path'), fs = require('fs');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { console.error('ERROR: needs Playwright (require("playwright") must work)'); process.exit(2); }

const args = process.argv.slice(2);
let data = process.env.LPB_DATA || '/home/claude/lesson-plan-data', all = false, demo = false, shots = null; const groups = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--data') data = args[++i];
  else if (args[i] === '--all') all = true;
  else if (args[i] === '--demo') demo = true;
  else if (args[i] === '--shots') shots = args[++i];
  else groups.push(args[i]);
}
const dir = path.resolve(__dirname, '../../../../artifacts');
const TEMPLATES = fs.readdirSync(dir).filter(f => f.endsWith('.html') && f !== 'index.html').map(f => f.slice(0, -5));
if (shots) fs.mkdirSync(shots, { recursive: true });

// list of [label, url, db or null]
const jobs = [];
let db = null;
if (demo) TEMPLATES.forEach(t => jobs.push([`demo · ${t}`, `file://${dir}/${t}.html`, null]));
else {
  const dbFile = fs.existsSync(path.join(data, 'lessons.json')) ? path.join(data, 'lessons.json') : data;
  db = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
  for (const [gid, g] of Object.entries(db.groups || {})) {
    if (groups.length && !groups.includes(gid)) continue;
    const lessons = [g.draft, ...(g.plans || []), ...(all ? g.history || [] : [])].filter(L => L && (L.artifacts || []).length);
    for (const L of lessons) (L.artifacts || []).forEach((a, i) => {
      const where = [a.page && 'p.' + a.page, String(a.sec || '').split('·')[0].trim(), a.num && (/^\d/.test(a.num) ? 'Ex ' + a.num : a.num)].filter(Boolean).join(' · ');
      const label = `${gid} · Unit ${L.unit || '?'} · ${where} · ${a.tpl}`;
      if (!TEMPLATES.includes(a.tpl)) { jobs.push([label, null, null, `no template "${a.tpl}" (have: ${TEMPLATES.join(', ')})`]); return; }
      jobs.push([label, `file://${dir}/${a.tpl}.html?g=${encodeURIComponent(gid)}&l=${encodeURIComponent(L.id)}&a=${i}`, db]);
    });
  }
}

(async () => {
  if (!jobs.length) { console.log(demo ? 'No templates found.' : 'No artifacts in the checked lessons.'); return; }
  const browser = await chromium.launch();
  let bad = 0;
  for (const [label, url, d, pre] of jobs) {
    if (pre) { console.log(`ERROR  ${label}: ${pre}`); bad++; continue; }
    const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    if (d) await page.addInitScript(x => { try { localStorage.setItem('lesson-plan-builder-v1', x); } catch (e) {} }, JSON.stringify(d));
    await page.goto(url);
    await page.waitForTimeout(500);
    await page.evaluate(() => document.fonts && document.fonts.ready);
    await page.waitForTimeout(300);
    const r = await page.evaluate(() => {
      const st = document.querySelector('.stage');
      if (!st) return { missing: (document.querySelector('.missing') || {}).textContent || 'no stage' };
      const S = st.getBoundingClientRect(), k = S.width / 1600;
      const cut = [...st.querySelectorAll('*')].filter(e => { const b = e.getBoundingClientRect(); if (!b.width || !b.height) return false;
        if (e.closest('[style*="overflow"], .area, .list, .cols, .prac, .keyl, .grp .in, .zone, .notes, .groups')) { const sc = e.closest('.area, .list, .cols, .prac, .keyl, .grp .in, .zone, .notes'); if (sc && sc !== e) return false; }
        return b.bottom > S.bottom + 2 * k || b.right > S.right + 2 * k; })
        .map(e => (e.className && e.className.baseVal === undefined ? '.' + String(e.className).split(' ')[0] : e.tagName.toLowerCase()) + ': ' + (e.textContent || '').trim().slice(0, 40));
      const scroll = [...st.querySelectorAll('*')].filter(e => { const cs = getComputedStyle(e); return /auto|scroll/.test(cs.overflowY + cs.overflowX) && (e.scrollHeight > e.clientHeight + 2 || e.scrollWidth > e.clientWidth + 2); })
        .map(e => '.' + String(e.className).split(' ')[0]);
      return { cut: [...new Set(cut)].slice(0, 4), scroll: [...new Set(scroll)] };
    });
    if (shots) await page.screenshot({ path: path.join(shots, label.replace(/[^\w.-]+/g, '_') + '.png') });
    await page.close();
    if (errs.length || r.missing) { console.log(`ERROR  ${label}: ${errs[0] || r.missing}`); bad++; }
    else if (r.cut.length) { console.log(`CUT    ${label}: ${r.cut.join(' | ')}`); bad++; }
    else if (r.scroll.length) console.log(`SCROLL ${label}: ${r.scroll.join(', ')} has more than fits`);
    else console.log(`ok     ${label}`);
  }
  await browser.close();
  console.log(bad ? `\n${bad} artifact(s) to fix.` : `\n0 artifacts to fix (${jobs.length} checked).`);
  process.exit(bad ? 1 : 0);
})();
