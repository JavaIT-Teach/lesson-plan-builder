'use strict';
/*
 * Lesson Plan Builder — plain static app.
 * All data lives in one object (db) saved in localStorage under KEY.
 * Rendering: each state change rebuilds the page HTML and patches the DOM in place
 * (so typing in a box never loses focus).
 */

// ---------- tiny view helpers ----------
const esc = v => String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const IF = (c, html) => (c ? html() : '');
const FOR = (list, fn) => (list || []).map(fn).join('');
let HANDLERS = [];
const on = fn => (typeof fn === 'function' ? (HANDLERS.push(fn), String(HANDLERS.length - 1)) : '');
const click = fn => (fn ? ` data-click="${on(fn)}"` : '');
const input = fn => (fn ? ` data-input="${on(fn)}"` : '');

class App {
  K = (() => {
    const LV = {
      beginner: { name: 'Beginner', cefr: 'A1', tint: '#CFEFE6', dark: '#0F6B55', c: '#138A6E' },
      elementary: { name: 'Elementary', cefr: 'A2', tint: '#FFE2B0', dark: '#8A4B00', c: '#F59E0B' },
      preint: { name: 'Pre-Intermediate', cefr: 'B1', tint: '#E6DDFE', dark: '#5B32C9', c: '#7C4DFF' },
      inter: { name: 'Intermediate', cefr: 'B1+', tint: '#CDEFF7', dark: '#0B6378', c: '#14A3C2' }
    };
    const KINDS = {
      Grammar: { c: '#6D3FF0', t: '#F1EBFF' }, Listening: { c: '#2F5BEA', t: '#E6EDFF' },
      Vocabulary: { c: '#0E6E85', t: '#DDF1F5' }, Speaking: { c: '#138A6E', t: '#DDF3EC' },
      Reading: { c: '#B87A00', t: '#FFF0CC' }, Writing: { c: '#D63A3A', t: '#FDE3E3' },
      Other: { c: '#6B7390', t: '#ECEEF3' }
    };
    const WHO = ['On their own', 'All together, I lead', 'In pairs'];
    const CW = { 'On their own': 'Individual', 'All together, I lead': 'Frontal', 'In pairs': 'PW' };
    const RM = {
      beginner: '0:1.1*|1:1.2*|2:1.3*|3:2.1 2.2|4:2.3 3.1|5:3.2 3.3|6:4.1 4.2|7:4.3 5.1|8:5.2 5.3|9:6.1 6.2|10:6.3 7.1|11:7.2 7.3|12:8.1 8.2|13:skip|14:8.3 9.1|15:9.2 9.3|16:skip|17:10.1 10.2|18:10.3 11.1|19:11.2 11.3|20:12.1 12.2|PREP:12.3|FE:FE FE',
      elementary: '0:1.1*|1:1.2*|2:1.3*|3:2.1 2.2|4:skip|5:2.3 3.1|6:3.2 3.3|7:4.1 4.2|8:4.3 5.1|9:5.2 5.3|10:6.1 6.2|11:6.3 7.1|12:7.2 7.3|13:8.1 8.2|14:skip|15:8.3 9.1|16:9.2 9.3|17:10.1 10.2|18:10.3 11.1|19:11.2 11.3|20:12.1 12.2|PREP:12.3|FE:FE FE',
      preint: '1:1.1 1.2|2:skip|3:1.3 2.1|4:2.2 2.3|5:3.1 3.2|6:skip|7:3.3 4.1|8:4.2 4.3|9:5.1 5.2|10:5.3 6.1|11:6.2 6.3|12:7.1 7.2|13:7.3 8.1|14:8.2 8.3|15:9.1 9.2|16:9.3 10.1|17:10.2 10.3|18:11.1 11.2|19:11.3 12.1|20:12.2 12.3|FE:FE FE',
      inter: '1:1.1 1.2|2:1.3 2.1|3:skip|4:2.2 2.3|5:3.1 3.2|6:3.3 4.1|7:4.2 4.3|8:skip|9:5.1 5.2|10:5.3 6.1|11:6.2 6.3|12:7.1 7.2|13:7.3 8.1|14:8.2 8.3|15:9.1 9.2|16:9.3 10.1|17:10.2 10.3|18:11.1 11.2|19:11.3 12.1|20:12.2 12.3|FE:FE FE'
    };
    const TPL = [
      'I could have explained [grammar point] better. Next time: [idea].',
      '[Student] needs extra work on [topic].',
      'Students say [wrong] instead of [right]. Fix with [idea].',
      'Instructions for [exercise] were unclear. Shorter version: [text].',
      '[Exercise] took [min] min, planned [min].',
      '[Activity] worked well. Reuse with [group].',
      'Too easy or too hard: [exercise] was too [easy or hard]. Next time: [idea].',
      'Student quiet or dominant: [student] was [quiet or dominant]. Next time: [idea].',
      'Board or material problem: [what happened]. Fix: [idea].',
      'Homework to set: [task].',
      '[Free note]'
    ];
    const MORE = ['Too easy / too hard', 'Student quiet / dominant', 'Board or material problem', 'Homework to set', 'Free note'];
    return { LV, KINDS, WHO, CW, RM, TPL, MORE, KEY: 'lesson-plan-builder-v1' };
  })();

  SYNC_KEY = 'lesson-plan-builder-sync';
  TG_KEY = 'lesson-plan-builder-tgbot';
  state = this.init();

  init() {
    let db = null;
    try { db = JSON.parse(localStorage.getItem(this.K.KEY)); } catch (e) {}
    if (!this.validDb(db)) { db = this.seed(); this.save(db); }
    let mini = false; try { const m = localStorage.getItem('lpb-side-mini'); mini = m === '1' || (m == null && window.innerWidth < 760); } catch (e) {}
    return { sideMini: mini, db, screen: 'week', gid: 'b-odd', rmGid: null, sel: null, del: null, noteEdit: null, toast: '', aimsOpen: false, confirmReset: false, restore: null, now: Date.now(),
      sync: { status: this.cfg() ? 'pending' : 'off', msg: '' }, syncConflict: null, syncBusy: false, confirmDisconnect: false,
      syncForm: { owner: 'JavaIT-Teach', repo: 'lesson-plan-data', token: '' } };
  }
  validDb(db) {
    const ids = ['b-odd', 'e-odd', 'b30-odd', 'b-even', 'e-even', 'p-even', 'i-even'];
    return !!(db && db.groups && Array.isArray(db.carry) && ids.every(id => db.groups[id] && db.groups[id].draft && Array.isArray(db.groups[id].taught)));
  }

  // ---------- state plumbing (React-style) ----------
  setState(p) {
    const patch = typeof p === 'function' ? p(this.state) : p;
    this.state = Object.assign({}, this.state, patch);
    this.schedule();
  }
  schedule() {
    if (this._pending) return;
    this._pending = true;
    queueMicrotask(() => { this._pending = false; render(); });
  }
  mount() {
    this.iv = setInterval(() => {
      const live = this.state.screen === 'mid' || this.state.screen === 'start';
      const n = Date.now();
      if (live || Math.floor(n / 60000) !== Math.floor(this.state.now / 60000)) this.setState({ now: n });
    }, 1000);
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
    this.remindIv = setInterval(() => this.remind(), 20000);
    setTimeout(() => this.remind(), 3000);
    document.addEventListener('keydown', e => {
      if (this.state.screen !== 'mid' || /INPUT|TEXTAREA|SELECT/.test((e.target && e.target.tagName) || '')) return;
      const g = this.state.db.groups[this.state.gid], R = g.draft.run;
      if (!R.warmDone || R.idx == null || R.idx < 0) return;
      if (e.code === 'Space') { e.preventDefault(); this.togglePause(g.id); }
      else if (e.key === 'ArrowRight') { const k = this.stepIdx(g.draft, R.idx, 1); if (k >= 0) this.jumpTo(g.id, k); }
      else if (e.key === 'ArrowLeft') { const k = this.stepIdx(g.draft, R.idx, -1); if (k >= 0) this.jumpTo(g.id, k); else this.go('start'); }
    });
    // GitHub sync: check on open, on return to the tab, when back online, and every few minutes
    this.lastPull = 0;
    if (this.cfg()) this.syncNow();
    this.syncIv = setInterval(() => {
      const c = this.cfg(); if (!c || this.state.syncConflict) return;
      if (c.dirty || Date.now() - this.lastPull > 5 * 60000) this.syncNow();
    }, 60000);
    document.addEventListener('visibilitychange', () => { if (this.cfg() && !this.state.syncConflict) this.syncNow(); });
    window.addEventListener('online', () => { if (this.cfg()) this.syncNow(); });
  }

  // ---------- data ----------
  uid() { return Math.random().toString(36).slice(2, 9); }
  seed() {
    const mk = (id, level, is30, dayType, start, end, d1, d2, u1, u2) => ({
      id, level, is30, dayType, start, end, startDate: d1,
      taught: [{ unit: u1, name: '', date: d1, slot: true }, { unit: u2, name: '', date: d2, slot: true }],
      noClass: [], history: [], draft: null
    });
    const groups = {
      'b-odd': mk('b-odd', 'beginner', false, 'odd', '15:30', '16:50', '2026-10-07', '2026-10-09', '0', '1'),
      'e-odd': mk('e-odd', 'elementary', false, 'odd', '17:00', '18:20', '2026-10-07', '2026-10-09', '0', '1'),
      'b30-odd': mk('b30-odd', 'beginner', true, 'odd', '18:30', '19:50', '2026-10-07', '2026-10-09', '0', '1'),
      'b-even': mk('b-even', 'beginner', false, 'even', '14:00', '15:20', '2026-10-06', '2026-10-08', '0', '1'),
      'e-even': mk('e-even', 'elementary', false, 'even', '15:30', '16:50', '2026-10-06', '2026-10-08', '0', '1'),
      'p-even': mk('p-even', 'preint', false, 'even', '17:00', '18:20', '2026-10-06', '2026-10-08', '1', '1'),
      'i-even': mk('i-even', 'inter', false, 'even', '18:30', '19:50', '2026-10-06', '2026-10-08', '1', '1'),
      'e-odd2': Object.assign(mk('e-odd2', 'elementary', false, 'odd', '10:30', '11:50', '2026-10-14', '2026-10-14', '0', '0'), { taught: [{ unit: '0', name: '', date: '2026-10-14', slot: true }] })
    };
    Object.values(groups).forEach(g => { g.draft = this.newLesson(g); });
    return { version: 1, teacher: 'Java Akhmedov', dayType: 'odd', groups, carry: [] };
  }
  newLesson(g) {
    const ns = this.calc(g).nextSlot;
    return { id: this.uid(), unit: ns ? ns.u : '', name: '', date: null, exercises: [],
      aims: { main: '', sub: '', personal: '', prob1: '', prob2: '' },
      run: { lessonStart: null, warmDone: false, idx: null, status: {}, curStart: null },
      results: {}, drop: {}, notes: [] };
  }
  newEx(prev) {
    return { id: this.uid(), page: prev ? prev.page : '', num: '', kind: '', grammar: '', track: '', note: '', who: '', min: null, otherMin: '', self: '', skipped: false, saved: false, fromCarry: null };
  }

  // ---------- roadmap ----------
  units(level) {
    this._rm = this._rm || {};
    if (!this._rm[level]) this._rm[level] = this.K.RM[level].split('|').map(p => {
      const [u, r] = p.split(':');
      if (r === 'skip') return { u, skip: true, secs: [] };
      return { u, skip: false, all: r.endsWith('*'), secs: r.replace('*', '').split(' ') };
    });
    return this._rm[level];
  }
  slots(level) {
    return this.units(level).flatMap(un => un.skip ? [] : un.secs.map((sec, i) => ({ u: un.u, sec, i, n: un.secs.length, all: un.all })));
  }
  findUnit(level, u) {
    const k = String(u || '').trim().toLowerCase().replace(/^unit\s*/, '');
    if (!k) return null;
    return this.units(level).find(x => x.u.toLowerCase() === k) || null;
  }
  uLabel(u) { return u === 'PREP' ? 'Exam prep' : u === 'FE' ? 'Final exams' : 'Unit ' + u; }
  secsText(un) { return un.u === 'FE' ? 'Final exams' : un.secs.join(', '); }
  slotDesc(level, s) {
    if (!s) return 'Course finished';
    if (s.u === 'FE') return `Final exam ${s.i + 1} of 2`;
    if (s.u === 'PREP') return `Book ${s.sec} · exam preparation`;
    const un = this.findUnit(level, s.u);
    if (s.all) return 'One lesson · all 4 pages at once';
    return s.n > 1 ? `Part ${s.i + 1} of ${s.n}` : 'One lesson';
  }

  // ---------- dates ----------
  D(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
  iso(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
  add(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
  isType(d, t) { const w = d.getDay(); return t === 'odd' ? (w === 1 || w === 3 || w === 5) : (w === 2 || w === 4 || w === 6); }
  fmtS(d) { return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).replace(',', ''); }
  fmtL(d) { return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).replace(',', ''); }
  tm(s) { const [h, m] = s.split(':').map(Number); return h * 60 + m; }
  hm(n) { return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`; }

  today() { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); }
  clock(t) { const n = t ? new Date(t) : new Date(); return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`; }
  nextText(g, c) {
    if (!c.isToday) return this.fmtS(c.next);
    return c.live === 'now' ? `Today · on now, ends ${g.end}` : c.live === 'over' ? `Today · finished ${g.end}` : `Today · starts ${g.start}`;
  }
  // slots in the order this group teaches them; slotSwap [[a, b]] = two lessons taught out of book order
  gslots(g) { const s = this.slots(g.level).slice(); (g.slotSwap || []).forEach(([a, b]) => { if (s[a] && s[b]) [s[a], s[b]] = [s[b], s[a]]; }); return s; }
  calc(g) {
    const slots = this.gslots(g);
    const done = g.taught.filter(t => t.slot).length;
    const today = this.today();
    let last = null;
    g.taught.forEach(t => { const d = this.D(t.date); if (!last || d > last) last = d; });
    let ref = this.add(today, -1);
    if (last && last > ref) ref = last;
    let passed = 0;
    for (let d = this.D(g.startDate); d <= ref; d = this.add(d, 1)) if (this.isType(d, g.dayType) && !g.noClass.includes(this.iso(d))) passed++;
    let next = last && this.add(last, 1) > today ? this.add(last, 1) : today;
    while (!this.isType(next, g.dayType) || g.noClass.includes(this.iso(next))) next = this.add(next, 1);
    const diff = done - passed;
    const isToday = this.iso(next) === this.iso(today);
    const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
    const live = isToday ? (nowMin < this.tm(g.start) ? 'later' : nowMin <= this.tm(g.end) ? 'now' : 'over') : null;
    return { slots, done, passed, diff, ref, today, next, isToday, live, nextSlot: slots[done] };
  }
  // roadmap position: slot k = the k-th lesson on the roadmap (0-based). The draft is always slot "done";
  // lessons planned ahead live in g.plans with forSlot = k and become the draft when their turn comes.
  dayN(g, n) {
    let d = this.calc(g).next;
    for (let i = 0; i < n; i++) { d = this.add(d, 1); while (!this.isType(d, g.dayType) || g.noClass.includes(this.iso(d))) d = this.add(d, 1); }
    return d;
  }
  extrasBefore(g, k, incl) { const c = this.calc(g); return (g.draft.extra ? 1 : 0) + (g.plans || []).filter(p => p.extra && p.forSlot >= c.done && (incl ? p.forSlot <= k : p.forSlot < k)).length; }
  slotDate(g, k) { return this.dayN(g, k - this.calc(g).done + this.extrasBefore(g, k, true)); }
  extraDate(g, P) { return this.dayN(g, P.forSlot - this.calc(g).done + this.extrasBefore(g, P.forSlot, false)); }
  extraFor(g, k) { return (g.plans || []).find(p => p.extra && p.forSlot === k); }
  extraLabel(L) { return `${this.uLabel(L.unit)}${L.part ? ', Part ' + L.part : ''} (extra)`; }
  aheadFor(g, k) { return (g.plans || []).find(p => p.forSlot === k && !p.extra); }
  hasOwnPlan(L) { return !!L && L.exercises.some(e => !e.fromCarry); }
  planFor(g, k) { return k === this.calc(g).done && !g.draft.extra ? g.draft : this.aheadFor(g, k); }
  nextToPrepare(g) {
    const c = this.calc(g);
    for (let k = c.done; k < c.slots.length; k++) if (!this.hasOwnPlan(this.planFor(g, k))) return k;
    return null;
  }
  // "Unit 3, Part 1 (2.1)" · "Unit 2 (1.3)" · "Final exam 1"
  secLabel(sl) { return !sl ? '—' : sl.u === 'FE' ? `Final exam ${sl.i + 1}` : `${this.uLabel(sl.u)}${sl.n > 1 ? `, Part ${sl.i + 1}` : ''}`; }
  slotOf(g, L) { if (L.extra) return null; const c = this.calc(g); return L === g.draft ? c.done : L.forSlot != null ? L.forSlot : null; }
  planAhead(gid, k) {
    const g = this.state.db.groups[gid], c = this.calc(g);
    const go = editId => { this.setState({ gid, screen: 'plan', editId, sel: null, delEx: null, delLesson: null, copy: null }); window.scrollTo(0, 0); };
    if (k === c.done) return go(null);
    const p = this.aheadFor(g, k), id = p ? p.id : this.uid();
    if (!p) this.upd(d => { const gg = d.groups[gid]; const nl = this.newLesson(gg); Object.assign(nl, { id, unit: c.slots[k].u, forSlot: k }); gg.plans = (gg.plans || []).concat(nl); });
    go(id);
  }
  // Telegram summary for students. The skill writes L.tg; otherwise a basic one is built from the plan.
  tgAuto(g, L) {
    const c = this.calc(g), k = this.slotOf(g, L), sl = k != null ? c.slots[k] : c.slots.find(x => x.u === L.unit);
    const date = L.date ? this.D(L.date) : k != null ? this.slotDate(g, k) : c.next;
    const covered = L.exercises.filter(e => !e.skipped && L.results[e.id] !== 'None');
    const pages = [...new Set(covered.map(e => e.page).filter(Boolean))].sort((a, b) => a - b);
    const head = `📘 ${this.uLabel(L.unit || '?')}${L.name ? ' · ' + L.name : ''}${sl && sl.n > 1 ? ' · Part ' + (sl.i + 1) : ''}\n🗓 ${this.fmtS(date)}${pages.length ? ' · Book p. ' + (pages.length > 1 ? pages[0] + '–' + pages[pages.length - 1] : pages[0]) : ''}`;
    const gram = [...new Set(covered.map(e => e.kind === 'Grammar' && e.grammar).filter(Boolean))];
    const parts = [...new Set(covered.map(e => e.kind).filter(x => x && x !== 'Grammar' && x !== 'Other'))];
    return [head, gram.length ? '✏️ GRAMMAR: ' + gram.join(' · ') : '', parts.length ? '📖 We also did: ' + parts.join(', ').toLowerCase() : ''].filter(Boolean).join('\n\n');
  }
  tgVals(v, g, L, s) {
    v.tgOpen = !!s.tgOpen; v.toggleTg = () => this.setState({ tgOpen: !s.tgOpen });
    v.tgText = L.tg || this.tgAuto(g, L);
    v.tgFromSkill = !!L.tg;
    v.tgHint = L.tg ? 'Written when the lesson was planned. Edit anything before you copy.' : 'Basic message built from your plan. Plans made with Claude get full rules, checks and translations.';
    const missed = L.exercises.filter(e => !e.skipped && (L.results[e.id] === 'None' || L.results[e.id] === 'Part'));
    v.tgWarn = missed.length ? `Not fully covered: ${missed.map(e => `${e.kind || 'Exercise'} ex ${e.num}`).join(', ')}. Remove those parts from the message if needed.` : '';
    v.hasTgWarn = !!missed.length;
    v.onTg = e => this.upd(d => { this.T(d.groups[g.id], s).tg = e.target.value; });
    const link = (this.state.db.tgChats || {})[g.id], bot = this.tgCfg(), sure = s.tgSure === L.id;
    v.tgCanSend = !!(link && bot); v.tgNeedSetup = !v.tgCanSend;
    v.tgSetupText = !bot ? 'Want a Send button? Set up the Telegram bot.' : 'Link this class to its Telegram group to send from here.';
    v.goTgSetup = () => this.go('tg');
    v.tgSendLabel = s.tgSending ? 'Sending…' : sure ? `Tap again to send to ${link && link.title}` : `Send to ${link ? link.title : 'group'}`;
    v.tgSendBg = sure ? '#D97706' : '#138A6E';
    v.tgSentNote = L.tgSent ? `Sent ${this.fmtS(new Date(L.tgSent))} at ${this.clock(L.tgSent)}. Sending again posts it twice.` : '';
    v.hasTgSent = !!L.tgSent;
    v.sendTg = () => { if (s.tgSending) return; if (!sure) { this.setState({ tgSure: L.id }); return; } this.tgSend(g.id, v.tgText, L.id); };
    v.copyTg = () => {
      const done = () => { this.upd(d => { const T = this.T(d.groups[g.id], s); if (!T.tgSent) T.tgSent = Date.now(); }); this.toast('Copied and marked as sent. Paste it into the Telegram group.'); };
      if (navigator.clipboard) navigator.clipboard.writeText(v.tgText).then(done, () => this.toast('Could not copy. Select the text and copy by hand.'));
      else done();
    };
  }
  pill(diff) {
    if (diff === 0) return { t: 'On track', bg: '#DDF3EC', fg: '#0F6B55' };
    if (diff > 0) return { t: `Ahead by ${diff}`, bg: '#DDF1F7', fg: '#0B5568' };
    return { t: `Behind by ${-diff}`, bg: '#FDE3E3', fg: '#A32020' };
  }
  gLabel(g) { return this.K.LV[g.level].name + (g.is30 ? ' 30+' : ''); }
  gLong(g) { return `${this.gLabel(g)}, ${g.dayType} days, ${g.start}`; }

  // ---------- exercises ----------
  kc(kind) { return this.K.KINDS[kind] || { c: '#8E97B5', t: '#ECEEF3' }; }
  em(e) { return e.min === 'other' ? (parseInt(e.otherMin) || 0) : (e.min || 0); }
  exTitle(e) {
    let t = e.kind || 'New exercise';
    if (e.kind === 'Grammar' && e.grammar) t += ' · ' + e.grammar;
    if (e.kind === 'Listening' && e.track) t += ' · Track ' + e.track;
    return t;
  }
  // "Grammar ex 3", "Warmer", "Talking Points" — matches the book instead of counting rows
  exLabel(e, i) {
    const n = String(e.num || '').trim();
    if (!n) return `${e.kind || 'Exercise'} (row ${i + 1})`;
    return /^\d/.test(n) ? `${e.kind || 'Exercise'} ex ${n}` : n;
  }
  // book section a row belongs to: the skill's section title, else Warmer / Review / Cooler, else the page
  secKey(e) {
    const n = String(e.num || '').trim();
    if (e.fromCarry) return 'carry';
    if (e.sec) return 'sec:' + e.sec;
    if (/^(warmer|lead-?in)$/i.test(n)) return 'Warmer';
    if (/^review/i.test(n)) return 'Review';
    if (/^cooler/i.test(n)) return 'Cooler';
    return e.page ? 'Page ' + e.page : 'More';
  }
  secHead(e) {
    const k = this.secKey(e);
    if (k === 'carry') return 'Carried over from last lesson';
    if (k.startsWith('sec:')) return e.sec + (e.page ? ` · p. ${e.page}` : '');
    return k === 'More' ? 'More exercises' : k;
  }
  heads(L) { let prev = null; return L.exercises.map(e => { const k = this.secKey(e), show = k !== prev; prev = k; return show ? this.secHead(e) : ''; }); }
  exBadge(e, i) { const n = String(e.num || '').trim(); return /^\d/.test(n) && n.length <= 3 ? n : n ? n[0].toUpperCase() : String(i + 1); }
  exWhere(e) { return [e.num && `Exercise ${e.num}`, e.page && `Page ${e.page}`].filter(Boolean).join(' · '); }
  exShort(e) { return [e.num && `Exercise ${e.num}`, e.page && `Page ${e.page}`, e.note].filter(Boolean).join(' · ') || this.exTitle(e); }

  // ---------- mutations ----------
  save(db) {
    try { localStorage.setItem(this.K.KEY, JSON.stringify(db)); }
    catch (e) { setTimeout(() => this.toast('Could not save in this browser. Download a backup now.'), 0); }
  }
  upd(fn, extra) {
    this.setState(s => {
      const db = JSON.parse(JSON.stringify(s.db));
      const more = fn(db, s) || {};
      db.updatedAt = Date.now();
      this.save(db);
      this.changed();
      return Object.assign({ db }, extra || {}, more);
    });
  }
  toast(msg) { this.setState({ toast: msg }); clearTimeout(this.tt); this.tt = setTimeout(() => this.setState({ toast: '' }), 2600); }
  go(screen, gid) {
    const id = gid || this.state.gid;
    if (screen === 'start' || screen === 'mid') {
      this.upd(db => { const L = db.groups[id].draft; if (!L.run.lessonStart) L.run.lessonStart = Date.now(); }, { screen, gid: id, del: null });
    } else this.setState({ screen, gid: id, del: null, noteEdit: null });
    const keep = ['plan', 'read', 'after', 'camb'].includes(screen);
    if ((screen === 'start' || screen === 'mid') && this.state.editId && id === this.state.gid) this.toast('Lesson starts and Mid-lesson always run the next lesson.');
    if (id !== this.state.gid || !keep) this.setState({ editId: null, delEx: null, delLesson: null });
    window.scrollTo(0, 0);
  }
  T(gg, s) {
    const id = (s || this.state).editId;
    if (id) { const h = gg.history.find(x => x.id === id) || (gg.plans || []).find(x => x.id === id); if (h) return h; }
    return gg.draft;
  }
  lTitle(L) { return `${this.uLabel(L.unit || '?')}${L.name ? ' · ' + L.name : ''}`; }
  setEx(id, patch) {
    this.upd((db, s) => { const e = this.T(db.groups[s.gid], s).exercises.find(x => x.id === id); if (e) Object.assign(e, { saved: false }, patch); });
  }
  res(L, e) {
    if (L.results[e.id]) return L.results[e.id];
    const st = L.run.status[e.id];
    return st === 'done' ? 'Full' : st === 'unfinished' ? 'Part' : null;
  }
  syncCarry(db, g, L, final) {
    L.exercises.forEach(e => {
      if (e.skipped) return;
      let r = this.res(L, e);
      if (!r && final) { r = 'Full'; L.results[e.id] = 'Full'; }
      const cid = L.id + ':' + e.id;
      db.carry = db.carry.filter(c => c.id !== cid);
      if ((r === 'Part' || r === 'None') && !L.drop[e.id]) {
        const ex = Object.assign({}, e, { saved: true, skipped: false, fromCarry: null });
        db.carry.push({ id: cid, groupId: g.id, lessonId: L.id, ex, fromUnit: L.unit, fromName: L.name, mark: r });
      }
    });
  }
  stepIdx(L, from, dir) {
    for (let k = (from == null ? -1 : from) + dir; k >= 0 && k < L.exercises.length; k += dir) if (!L.exercises[k].skipped) return k;
    return -1;
  }
  jumpTo(gid, i) {
    this.upd(d => { const R = d.groups[gid].draft.run; if (!R.lessonStart) R.lessonStart = Date.now(); R.warmDone = true; R.idx = i; R.curStart = Date.now(); R.pausedAt = null; }, { screen: 'mid' });
  }
  togglePause(gid) {
    this.upd(d => { const R = d.groups[gid].draft.run; if (R.pausedAt) { R.curStart = (R.curStart || Date.now()) + (Date.now() - R.pausedAt); R.pausedAt = null; } else R.pausedAt = Date.now(); });
  }
  advance(L) {
    const from = L.run.idx == null ? -1 : L.run.idx;
    const i = L.exercises.findIndex((e, k) => k > from && !e.skipped);
    L.run.idx = i;
    L.run.curStart = Date.now();
  }
  // class days a lesson can be filed under: not "No class", not already used by another lesson
  dayOptions(g, keep) {
    const today = this.today(), next = this.iso(this.calc(g).next), end = this.add(today, 7), out = [];
    for (let d = this.D(g.startDate); d <= end; d = this.add(d, 1)) {
      if (!this.isType(d, g.dayType)) continue;
      const id = this.iso(d);
      if (g.noClass.includes(id) && id !== keep) continue;
      if (g.taught.some(t => t.date === id) && id !== keep) continue;
      out.push(id);
    }
    if (!out.includes(next)) out.push(next);
    if (keep && !out.includes(keep)) out.push(keep);
    return out.sort();
  }
  // the oldest recent class day with no lesson recorded; otherwise the next class day
  suggestDay(g) {
    const today = this.today(), from = this.add(today, -14);
    const open = this.dayOptions(g, null).filter(id => this.D(id) <= today && this.D(id) >= from);
    return open[0] || this.iso(this.calc(g).next);
  }
  dayLabel(id) { return this.fmtS(this.D(id)) + (id === this.iso(this.today()) ? ' (today)' : ''); }
  // a past class day (or today, after the class ended) with no lesson closed, newer than the last taught lesson
  unclosedDay(g) {
    const today = this.today(), ti = this.iso(today), n = new Date(), [h, m] = (g.end || '23:59').split(':').map(Number);
    const ended = n.getHours() * 60 + n.getMinutes() >= h * 60 + m;
    const last = g.taught.map(t => t.date).sort().pop() || '';
    return this.dayOptions(g, null).find(id => id > last && this.D(id) >= this.add(today, -14) && (id < ti || (id === ti && ended))) || null;
  }
  closeLesson(day, gid) {
    let carried = 0;
    this.upd((db, s) => {
      const g = db.groups[gid || s.gid]; const L = g.draft; const c = this.calc(g);
      this.syncCarry(db, g, L, true);
      carried = db.carry.filter(k => k.lessonId === L.id).length;
      if (L.results.warm == null) L.results.warm = 'Full';
      const un = this.findUnit(g.level, L.unit);
      L.date = day || this.iso(c.next);
      g.taught.push({ unit: L.unit, name: L.name, date: L.date, slot: !!(un && !un.skip), lessonId: L.id });
      g.history.push(L);
      const nk = g.taught.filter(t => t.slot).length, ah = (g.plans || []).find(p => p.forSlot === nk && p.extra) || (g.plans || []).find(p => p.forSlot === nk && !p.extra);
      if (ah) { g.plans = g.plans.filter(p => p !== ah); delete ah.forSlot; g.draft = ah; } else g.draft = this.newLesson(g);
      return { screen: 'week', sel: null, noteEdit: null, dbDayType: null };
    });
    this.queuePush(500);
    this.toast(carried ? `Lesson saved. ${carried} exercise${carried > 1 ? 's' : ''} carried over to the next lesson.` : 'Lesson saved. Everything counted as covered.');
  }

  // ---------- backup ----------
  downloadBackup() {
    const data = { app: 'lesson-plan-builder', exportedAt: new Date().toISOString(), data: this.state.db };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `lesson-plan-backup-${this.iso(new Date())}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    this.toast('Backup downloaded. Keep the file somewhere safe.');
  }
  pickBackup() {
    const f = document.getElementById('restore-file');
    f.value = '';
    f.onchange = () => {
      const file = f.files && f.files[0];
      if (!file) return;
      const r = new FileReader();
      r.onload = () => {
        let db = null;
        try { const j = JSON.parse(r.result); db = j && j.data ? j.data : j; } catch (e) {}
        if (!this.validDb(db)) { this.toast('This file is not a Lesson Plan Builder backup.'); return; }
        this.setState({ restore: { db, name: file.name }, confirmReset: false });
      };
      r.readAsText(file);
    };
    f.click();
  }
  applyRestore() {
    const db = this.state.restore.db;
    db.updatedAt = Date.now();
    this.save(db);
    this.changed();
    this.setState({ db, restore: null, screen: 'week', gid: 'b-odd', sel: null, editId: null, del: null, delEx: null, delLesson: null, noteEdit: null });
    this.toast('Backup restored.');
  }

  // ---------- GitHub sync ----------
  // Lessons are mirrored to one file (lessons.json) in a private repo, using the GitHub contents API.
  // Settings (incl. the key) live in their own localStorage entry, never in backups or on GitHub.
  // ---------- class reminders (PC notifications while the app is open) ----------
  CHECKS = [['badge', 'Badge on', 0], ['att', 'Take attendance', 15], ['speak', 'Speaking scores: 100 for all', 15], ['hw', 'Check homework', 15], ['att2', 'Update attendance (late students)', 40]];
  remindOn() { try { return localStorage.getItem('lpb-remind') === '1'; } catch (e) { return false; } }
  async toggleRemind() {
    if (this.remindOn()) { try { localStorage.setItem('lpb-remind', '0'); } catch (e) {} this.setState({}); this.toast('Class reminders off.'); return; }
    if (!('Notification' in window)) { this.toast('This browser cannot show notifications.'); return; }
    let p = Notification.permission;
    if (p !== 'granted') p = await Notification.requestPermission();
    if (p !== 'granted') { this.toast('Notifications are blocked. Allow them for this site in the browser settings.'); return; }
    try { localStorage.setItem('lpb-remind', '1'); } catch (e) {}
    this.setState({});
    new Notification('Lesson Plan Builder', { body: 'Class reminders are on. Keep this tab open during your lessons.' });
  }
  remind() {
    if (!this.remindOn() || !('Notification' in window) || Notification.permission !== 'granted') return;
    const now = new Date(), today = this.today(), ti = this.iso(today), nm = now.getHours() * 60 + now.getMinutes();
    let fired = {}; try { fired = JSON.parse(localStorage.getItem('lpb-fired')) || {}; } catch (e) {}
    Object.keys(fired).forEach(k => { if (!k.startsWith(ti)) delete fired[k]; });
    Object.values(this.state.db.groups).forEach(g => {
      if (!this.isType(today, g.dayType) || g.noClass.includes(ti) || g.taught.some(t => t.date === ti)) return;
      const st = this.tm(g.start), done = (g.draft.run && g.draft.run.checks) || {};
      [[0, ['badge']], [15, ['att', 'speak', 'hw']], [40, ['att2']]].forEach(([off, keys]) => {
        const key = `${ti}:${g.id}:${off}`, todo = this.CHECKS.filter(c => keys.includes(c[0]) && !done[c[0]]);
        if (fired[key] || nm < st + off || nm > st + off + 10 || !todo.length) return;
        fired[key] = 1;
        const n = new Notification(`${this.gLabel(g)} ${g.start} · ${off ? off + ' min in' : 'starting now'}`, { body: todo.map(c => '☐ ' + c[1]).join('\n'), tag: key, requireInteraction: true });
        n.onclick = () => { window.focus(); this.setState({ gid: g.id, screen: 'mid', editId: null }); n.close(); };
        this.toast(`${this.gLabel(g)}: ${todo.map(c => c[1]).join(' · ')}`);
      });
    });
    try { localStorage.setItem('lpb-fired', JSON.stringify(fired)); } catch (e) {}
  }

  // ---------- Telegram bot (token stays in this browser; which chat belongs to which group syncs in db.tgChats) ----------
  tgCfg() { try { return JSON.parse(localStorage.getItem(this.TG_KEY)) || null; } catch (e) { return null; } }
  setTgCfg(c) { try { if (c) localStorage.setItem(this.TG_KEY, JSON.stringify(c)); else localStorage.removeItem(this.TG_KEY); } catch (e) {} }
  async tgApi(method, params, token) {
    const t = token || (this.tgCfg() || {}).token;
    if (!t) throw new Error('no-bot');
    const body = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, val]) => body.append(k, typeof val === 'object' ? JSON.stringify(val) : String(val)));
    let r;
    try { r = await fetch(`https://api.telegram.org/bot${t}/${method}`, { method: 'POST', body }); }
    catch (e) { throw new Error('net'); }
    let j = null; try { j = await r.json(); } catch (e) {}
    if (!j) throw new Error('net');
    return j;
  }
  tgErr(e, j) {
    if (e && e.message === 'net') return 'Could not reach Telegram. Check the internet. If Telegram works in the app but not here, check the group: the message may have gone through.';
    if (e && e.message === 'no-bot') return 'Set up the Telegram bot first (left bar → Telegram bot).';
    const d = (j && j.description) || 'unknown error';
    if (/unauthorized/i.test(d)) return 'Telegram did not accept the bot token. Paste it again from BotFather.';
    if (/not a member|kicked|chat not found/i.test(d)) return 'The bot is not in that group. Add the bot to the group, then try again.';
    if (/not enough rights|administrator/i.test(d)) return 'The bot is not allowed to post there. Make it an admin of the group.';
    return 'Telegram said: ' + d;
  }
  async tgConnect() {
    const token = (this.state.tgForm || '').trim();
    if (!/^\d+:[\w-]{20,}$/.test(token)) { this.toast('That does not look like a bot token. Copy it again from BotFather.'); return; }
    this.setState({ tgBusy: true });
    let j = null;
    try { j = await this.tgApi('getMe', {}, token); } catch (e) { this.setState({ tgBusy: false }); this.toast(this.tgErr(e)); return; }
    this.setState({ tgBusy: false });
    if (!j.ok) { this.toast(this.tgErr(null, j)); return; }
    this.setTgCfg({ token, bot: j.result.username, name: j.result.first_name });
    this.setState({ tgForm: '' });
    this.toast(`Connected to @${j.result.username}.`);
  }
  async tgFind() {
    this.setState({ tgBusy: true });
    let j = null;
    try { j = await this.tgApi('getUpdates', { allowed_updates: ['message', 'my_chat_member', 'channel_post'] }); } catch (e) { this.setState({ tgBusy: false }); this.toast(this.tgErr(e)); return; }
    this.setState({ tgBusy: false });
    if (!j.ok) { this.toast(this.tgErr(null, j)); return; }
    const found = Object.assign({}, this.state.tgFound || {});
    (j.result || []).forEach(u => {
      const c = (u.message || u.my_chat_member || u.channel_post || {}).chat;
      if (c && c.type !== 'private') found[c.id] = { id: c.id, title: c.title || String(c.id) };
      const m = u.message && u.message.migrate_to_chat_id; if (m) { delete found[c.id]; found[m] = { id: m, title: c.title }; }
    });
    this.setState({ tgFound: found });
    const n = Object.keys(found).length;
    this.toast(n ? `Found ${n} group${n > 1 ? 's' : ''}. Pick one for each class.` : 'No groups found yet. Write "hi" in the Telegram group, then tap Find again.');
  }
  async tgSend(gid, text, lessonId) {
    const db = this.state.db, link = (db.tgChats || {})[gid];
    if (!link) { this.toast('Pick the Telegram group for this class first (left bar → Telegram bot).'); return false; }
    this.setState({ tgSending: true });
    let j = null;
    try {
      j = await this.tgApi('sendMessage', { chat_id: link.id, text, disable_web_page_preview: true });
      const m = !j.ok && j.parameters && j.parameters.migrate_to_chat_id;
      if (m) { this.upd(d => { d.tgChats[gid].id = m; }); j = await this.tgApi('sendMessage', { chat_id: m, text, disable_web_page_preview: true }); }
    } catch (e) { this.setState({ tgSending: false }); this.toast(this.tgErr(e)); return false; }
    this.setState({ tgSending: false, tgSure: null });
    if (!j.ok) { this.toast(this.tgErr(null, j)); return false; }
    if (lessonId) this.upd(d => { const gg = d.groups[gid], L = [gg.draft, ...gg.history, ...(gg.plans || [])].find(x => x.id === lessonId); if (L) L.tgSent = Date.now(); });
    this.toast(`Sent to ${link.title}.`);
    return true;
  }
  tgVals2(v, db, s) {
    const c = this.tgCfg();
    v.tgOn = !!c; v.tgOff = !c;
    v.tgBot = c ? `@${c.bot}` : '';
    v.tgForm = s.tgForm || ''; v.onTgForm = e => this.setState({ tgForm: e.target.value });
    v.tgConnect = () => { if (!s.tgBusy) this.tgConnect(); };
    v.tgConnectLabel = s.tgBusy ? 'Checking…' : 'Connect';
    v.tgFind = () => { if (!s.tgBusy) this.tgFind(); };
    v.tgFindLabel = s.tgBusy ? 'Looking…' : 'Find my groups';
    v.tgForget = () => { if (s.tgSureForget) { this.setTgCfg(null); this.setState({ tgSureForget: false, tgFound: null }); this.toast('Bot removed from this browser.'); } else this.setState({ tgSureForget: true }); };
    v.tgForgetLabel = s.tgSureForget ? 'Tap again to remove' : 'Remove bot from this browser';
    const chats = db.tgChats || {}, found = Object.assign({}, s.tgFound || {});
    Object.values(chats).forEach(x => { if (x) found[x.id] = found[x.id] || x; });
    const opts = Object.values(found);
    const all = Object.values(db.groups).sort((a, b) => b.dayType.localeCompare(a.dayType) || a.start.localeCompare(b.start));
    v.tgLinks = all.map(g => {
      const cur = chats[g.id];
      return {
        label: `${this.gLabel(g)} · ${g.dayType} days · ${g.start}`,
        opts: [{ id: '', label: opts.length ? '— not linked —' : 'Tap "Find my groups" first', sel: !cur }].concat(opts.map(o => ({ id: String(o.id), label: o.title, sel: !!cur && String(cur.id) === String(o.id) }))),
        linked: !!cur,
        onPick: e => { const id = e.target.value, o = found[id]; this.upd(d => { d.tgChats = d.tgChats || {}; if (o) d.tgChats[g.id] = { id: o.id, title: o.title }; else delete d.tgChats[g.id]; }); },
        onTest: () => this.tgSend(g.id, `✅ Test from Lesson Plan Builder: lesson summaries for ${this.gLabel(g)} ${g.start} will come here.`)
      };
    });
  }
  cfg() { try { return JSON.parse(localStorage.getItem(this.SYNC_KEY)) || null; } catch (e) { return null; } }
  setCfg(c) { try { if (c) localStorage.setItem(this.SYNC_KEY, JSON.stringify(c)); else localStorage.removeItem(this.SYNC_KEY); } catch (e) {} }
  patchCfg(p) { const c = this.cfg(); if (c) this.setCfg(Object.assign(c, p)); }
  setSync(status, msg) { this.setState({ sync: { status, msg: msg || '', at: Date.now() } }); }
  changed() {
    if (!this.cfg()) return;
    this.patchCfg({ dirty: true });
    this.queuePush();
  }
  queuePush(ms) {
    if (!this.cfg() || this.state.syncConflict) return;
    clearTimeout(this.pushT);
    this.pushT = setTimeout(() => this.syncNow(), ms == null ? (window.LPB_SYNC_DELAY || 8000) : ms);
    if (this.state.sync.status !== 'saving' && this.state.sync.status !== 'error') setTimeout(() => this.setSync('pending'), 0);
  }
  b64enc(str) {
    const bytes = new TextEncoder().encode(str); let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  b64dec(b64) { const bin = atob(b64.replace(/\s/g, '')); return new TextDecoder().decode(Uint8Array.from(bin, ch => ch.charCodeAt(0))); }
  gh(c, method, path, body, accept) {
    const headers = { Authorization: 'Bearer ' + c.token, Accept: accept || 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
    if (body) headers['Content-Type'] = 'application/json';
    return fetch('https://api.github.com' + path, { method, headers, cache: 'no-store', body: body ? JSON.stringify(body) : undefined });
  }
  filePath(c) { return `/repos/${encodeURIComponent(c.owner)}/${encodeURIComponent(c.repo)}/contents/lessons.json`; }
  httpErr(status) { const e = new Error('HTTP ' + status); e.status = status; return e; }
  async ghRead(c) {
    const r = await this.gh(c, 'GET', this.filePath(c));
    if (r.status === 404) return null;
    if (!r.ok) throw this.httpErr(r.status);
    const meta = await r.json();
    let text;
    if (meta.encoding === 'base64' && meta.content) text = this.b64dec(meta.content);
    else {
      const r2 = await this.gh(c, 'GET', this.filePath(c), null, 'application/vnd.github.raw+json');
      if (!r2.ok) throw this.httpErr(r2.status);
      text = await r2.text();
    }
    let db = null;
    try { db = JSON.parse(text); } catch (e) {}
    if (!this.validDb(db)) { const e = new Error('bad file'); e.plain = 'The lessons file on GitHub is damaged. Nothing was changed.'; throw e; }
    return { sha: meta.sha, db };
  }
  async syncNow() {
    if (!this.cfg() || this.state.syncConflict) return;
    if (this.syncing) { this.syncAgain = true; return; }
    this.syncing = true; clearTimeout(this.pushT);
    try { await this.syncOnce(0); }
    catch (e) { this.syncFail(e); }
    finally {
      this.syncing = false;
      if (this.syncAgain) { this.syncAgain = false; this.syncNow(); }
    }
  }
  async syncOnce(depth) {
    let c = this.cfg(); if (!c) return;
    const remote = await this.ghRead(c);
    this.lastPull = Date.now();
    c = this.cfg(); if (!c) return;
    if (remote && remote.sha !== c.sha) {
      // GitHub has a version this browser has not seen
      if (!c.dirty) { this.applyRemote(remote); return; }
      if (JSON.stringify(remote.db) === JSON.stringify(this.state.db)) { this.patchCfg({ sha: remote.sha, dirty: false }); this.setSync('ok'); return; }
      this.setState({ syncConflict: remote }); this.setSync('conflict');
      return;
    }
    if (!c.dirty && remote) { this.setSync('ok'); return; }
    // send this browser's lessons
    this.setSync('saving');
    const db = this.state.db, sent = db.updatedAt;
    const body = { message: `Lessons saved ${this.fmtS(new Date())} ${this.clock()}`, content: this.b64enc(JSON.stringify(db)) };
    if (remote) body.sha = remote.sha;
    const r = await this.gh(c, 'PUT', this.filePath(c), body);
    if ((r.status === 409 || r.status === 422) && depth < 2) return this.syncOnce(depth + 1);
    if (!r.ok) throw this.httpErr(r.status);
    const j = await r.json();
    const still = this.state.db.updatedAt !== sent;
    this.patchCfg({ sha: j.content.sha, dirty: still });
    this.setSync(still ? 'pending' : 'ok');
    if (still) this.queuePush();
  }
  applyRemote(remote) {
    this.save(remote.db);
    this.patchCfg({ sha: remote.sha, dirty: false });
    const gid = remote.db.groups[this.state.gid] ? this.state.gid : 'b-odd';
    this.setState({ db: remote.db, gid, syncConflict: null, del: null, delEx: null, delLesson: null });
    this.setSync('ok');
  }
  syncFail(e) {
    let msg;
    if (e.plain) msg = e.plain;
    else if (!e.status) msg = 'No internet. Saved in this browser. Will send to GitHub when back online.';
    else if (e.status === 401) msg = 'Your GitHub key does not work any more. Paste a new one on the Sync screen.';
    else if (e.status === 403 || e.status === 404) msg = 'GitHub would not let the app in. Check the key can read and write the lessons repository.';
    else msg = 'GitHub did not answer properly. Saved in this browser. Will try again.';
    this.setSync('error', msg);
  }
  async connect() {
    const f = this.state.syncForm, owner = f.owner.trim(), repo = f.repo.trim(), token = f.token.trim();
    if (!owner || !repo || !token) { this.toast('Fill in all three boxes.'); return; }
    this.setState({ syncBusy: true });
    const fail = msg => { this.setState({ syncBusy: false }); this.setSync('off', msg); };
    let r;
    try { r = await this.gh({ token }, 'GET', `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`); }
    catch (e) { fail('No internet. Try again when you are online.'); return; }
    if (r.status === 401) { fail('This key does not work. Check that you copied all of it.'); return; }
    if (!r.ok) { fail(`Cannot open ${owner}/${repo} with this key. Check the names, and that the key was made for this repository.`); return; }
    const info = await r.json();
    if (!info.private) { fail('This repository is public, so anyone could read your lessons. Make it private on GitHub first.'); return; }
    // a browser with its own lessons must not be silently replaced by the GitHub copy
    this.setCfg({ owner, repo, token, sha: null, dirty: !!this.state.db.updatedAt });
    this.setState({ syncBusy: false, syncForm: Object.assign({}, f, { token: '' }) });
    this.setSync('pending');
    await this.syncNow();
    if (this.state.sync.status === 'ok') this.toast('Connected. Your lessons now save to GitHub.');
  }
  disconnect() {
    clearTimeout(this.pushT);
    this.setCfg(null);
    this.setState({ confirmDisconnect: false, syncConflict: null });
    this.setSync('off');
    this.toast('Disconnected. Lessons stay in this browser and on GitHub.');
  }
  resolveConflict(which) {
    const remote = this.state.syncConflict;
    if (!remote) return;
    if (which === 'github') { this.applyRemote(remote); this.toast('Using the GitHub copy.'); return; }
    this.patchCfg({ sha: remote.sha, dirty: true });
    this.setState({ syncConflict: null });
    this.syncNow();
    this.toast("Keeping this browser's copy. GitHub still has the old one in its history.");
  }
  syncVals(v, s) {
    const c = this.cfg(), st = s.sync.status;
    const lines = {
      off: c ? '' : 'Not saved to GitHub',
      pending: 'Changes not on GitHub yet',
      saving: 'Saving to GitHub…',
      ok: `Saved to GitHub ${s.sync.at ? this.clock(s.sync.at) : ''}`,
      conflict: 'Choose which copy to keep',
      error: 'Not saved to GitHub'
    };
    v.syncLine = c || st !== 'off' ? (lines[st] || '') : 'Not saved to GitHub';
    v.syncDot = st === 'ok' ? '#3CCB8F' : st === 'error' || st === 'conflict' ? '#FF8A80' : st === 'off' ? '#8E97B5' : '#FFB020';
    v.goSync = () => this.go('sync');
    // conflict bar
    v.hasConflict = !!s.syncConflict;
    if (s.syncConflict) {
      const taught = d => Object.values(d.groups).reduce((a, g) => a + g.taught.length, 0);
      const when = d => d.updatedAt ? `${this.fmtS(new Date(d.updatedAt))} ${this.clock(d.updatedAt)}` : 'earlier';
      const R = s.syncConflict.db, Lo = s.db;
      v.conflictGh = `GitHub copy: saved ${when(R)} · ${taught(R)} lessons taught`;
      v.conflictLocal = `This browser: saved ${when(Lo)} · ${taught(Lo)} lessons taught`;
      v.keepGh = () => this.resolveConflict('github');
      v.keepLocal = () => this.resolveConflict('local');
    }
    if (s.screen !== 'sync') return;
    v.syncOn = !!c; v.syncOffForm = !c;
    v.syncRepo = c ? `${c.owner}/${c.repo}` : '';
    v.syncRepoUrl = c ? `https://github.com/${encodeURIComponent(c.owner)}/${encodeURIComponent(c.repo)}/commits` : '';
    v.syncMsg = s.sync.msg;
    v.syncMsgBg = st === 'error' || (!c && s.sync.msg) ? '#FDE3E3' : '#DDF3EC';
    v.syncMsgFg = st === 'error' || (!c && s.sync.msg) ? '#A32020' : '#0F6B55';
    v.hasSyncMsg = !!s.sync.msg;
    v.syncBig = !c ? 'Not connected' : st === 'ok' ? 'Your lessons are on GitHub' : st === 'saving' ? 'Saving to GitHub…' : st === 'pending' ? 'Changes waiting to be sent' : st === 'conflict' ? 'Choose which copy to keep' : 'Not saved to GitHub right now';
    v.syncSmall = c && s.sync.at && st === 'ok' ? `Last saved ${this.fmtS(new Date(s.sync.at))} at ${this.clock(s.sync.at)}` : '';
    v.form = s.syncForm;
    const setF = k => e => this.setState({ syncForm: Object.assign({}, this.state.syncForm, { [k]: e.target.value }) });
    v.onOwner = setF('owner'); v.onRepo = setF('repo'); v.onToken = setF('token');
    v.connectLabel = s.syncBusy ? 'Connecting…' : 'Connect';
    v.doConnect = () => { if (!this.state.syncBusy) this.connect(); };
    v.doSync = () => { this.syncNow(); };
    v.askDisconnect = () => this.setState({ confirmDisconnect: true });
    v.confirmDisconnect = s.confirmDisconnect;
    v.yesDisconnect = () => this.disconnect();
    v.keepConnect = () => this.setState({ confirmDisconnect: false });
  }

  // ---------- render values ----------
  renderVals() {
    const s = this.state, db = s.db, K = this.K;
    const g = db.groups[s.gid], L = this.T(g, s), lv = K.LV[g.level], gc = this.calc(g);
    const scr = s.screen;
    const v = {};
    const sideScreens = ['week', 'roadmap', 'carry', 'notes', 'sync', 'cambAll', 'tg'];
    Object.assign(v, {
      showSide: sideScreens.includes(scr), showJump: !sideScreens.includes(scr),
      isWeek: scr === 'week', isRoadmap: scr === 'roadmap', isCarry: scr === 'carry', isNotes: scr === 'notes', isSync: scr === 'sync',
      isPlan: scr === 'plan', isStart: scr === 'start', isMid: scr === 'mid', isAfter: scr === 'after', isCamb: scr === 'camb', isCambAll: scr === 'cambAll', isTg: scr === 'tg', isRead: scr === 'read',
      isLive: scr === 'start' || scr === 'mid', scrKey: scr + ':' + s.gid + ':' + (s.editId || ''),
      hasToast: !!s.toast, toast: s.toast,
      sideClock: `${this.fmtS(this.today())} · ${this.clock()}`,
      lvName: this.gLabel(g), lvTint: lv.tint, groupLong: this.gLong(g), groupShort: this.gLabel(g),
      dayLabel: g.dayType === 'odd' ? 'Odd days' : 'Even days', dateText: this.fmtS(gc.next),
      startTime: g.start, endTime: g.end, teacher: db.teacher,
      lessonTitle: `${this.uLabel(L.unit || '?')}${L.name ? ' · ' + L.name : ''}`,
      goWeek: () => this.go('week'),
      goStart: () => this.go('start'),
      goAfter: () => this.go('after')
    });

    // sidebar
    const odd = db.dayType === 'odd';
    Object.assign(v, {
      oddBg: odd ? '#FFB020' : 'transparent', oddFg: odd ? '#14213D' : '#fff', oddBorder: odd ? '#FFB020' : '#3A4A72',
      evenBg: !odd ? '#FFB020' : 'transparent', evenFg: !odd ? '#14213D' : '#fff', evenBorder: !odd ? '#FFB020' : '#3A4A72',
      setOdd: () => this.upd(d => { d.dayType = 'odd'; }, { screen: 'week' }),
      setEven: () => this.upd(d => { d.dayType = 'even'; }, { screen: 'week' }),
      resetLabel: s.confirmReset ? 'Tap again to reset everything' : 'Reset to starting state',
      askReset: () => {
        if (!s.confirmReset) { this.setState({ confirmReset: true }); return; }
        const fresh = this.seed(); fresh.updatedAt = Date.now(); this.save(fresh); this.changed();
        this.setState({ db: fresh, confirmReset: false, screen: 'week', gid: 'b-odd', sel: null, editId: null });
        this.toast('Back to the starting state.');
      },
      sideMini: !!s.sideMini, toggleSide: () => { const m = !this.state.sideMini; try { localStorage.setItem('lpb-side-mini', m ? '1' : '0'); } catch (e) {} this.setState({ sideMini: m }); },
      syncDotCls: s.sync && s.sync.status === 'saving' ? 'fx-pulse' : '',
      downloadBackup: () => this.downloadBackup(),
      restoreBackup: () => this.pickBackup(),
      hasRestore: !!s.restore, restoreName: s.restore ? s.restore.name : '',
      restoreYes: () => this.applyRestore(),
      restoreNo: () => this.setState({ restore: null }),
      remindOn: this.remindOn(), toggleRemind: () => this.toggleRemind()
    });
    const navDefs = [['Week', 'week'], ['Plan a lesson', 'plan'], ['Roadmap', 'roadmap'], ['Carry-over', 'carry'], ['Notes', 'notes'], ['Cambridge copy', 'camb'], ['Telegram bot', 'tg'], ['GitHub sync', 'sync']];
    const ICON = { week: '📅', plan: '✏️', roadmap: '🗺️', carry: '↩️', notes: '📝', camb: '📄', tg: '✈️', sync: '☁️' };
    const navScr = scr === 'cambAll' ? 'camb' : scr;
    v.navItems = navDefs.map(([label, key]) => ({ label, icon: ICON[key] || '•', bg: navScr === key ? '#24345C' : 'transparent', weight: navScr === key ? 700 : 500,
      onClick: () => { if (key === 'roadmap') this.setState({ rmGid: s.gid }); this.go(key); } }));
    const steps = [['Plan', 'plan'], ['Read-through', 'read'], ['Lesson starts', 'start'], ['Mid-lesson', 'mid'], ['After class', 'after'], ['Cambridge copy', 'camb']];
    {
      const gg = g, live = scr === 'start' || scr === 'mid', cur = live ? '' : (s.editId && L !== gg.draft ? L.id : '');
      const opts = [{ id: '', label: `Next lesson · ${this.fmtS(gc.next)} · ${this.lTitle(gg.draft)}` }];
      (gg.plans || []).filter(p => p.forSlot != null && (p.forSlot > gc.done || p.extra)).sort((a, b) => a.forSlot - b.forSlot - (a.extra ? 0.5 : 0) + (b.extra ? 0.5 : 0))
        .forEach(p => opts.push({ id: p.id, label: `Planned · ${this.fmtS(p.extra ? this.extraDate(gg, p) : this.slotDate(gg, p.forSlot))} · ${this.lTitle(p)}${p.extra ? ' (extra)' : ''}` }));
      gg.history.filter(h => h.date).slice().sort((a, b) => b.date.localeCompare(a.date))
        .forEach(h => opts.push({ id: h.id, label: `Taught · ${this.fmtS(this.D(h.date))} · ${this.lTitle(h)}` }));
      v.lessonOpts = opts.map(o => Object.assign(o, { sel: o.id === cur }));
      v.lessonSelLocked = live;
      v.lessonSelBg = cur ? '#E6EDFF' : '#fff';
      v.onLessonSel = e => { this.setState({ editId: e.target.value || null, sel: null, delEx: null, delLesson: null, noteEdit: null }); window.scrollTo(0, 0); };
    }
    v.jumpSteps = steps.map(([label, key], i) => ({ label, num: i + 1, bg: scr === key ? '#14213D' : 'transparent', fg: scr === key ? '#fff' : '#3A4566', onClick: () => this.go(key) }));

    this.syncVals(v, s);
    if (scr === 'week') this.weekVals(v, db);
    if (scr === 'roadmap') this.roadmapVals(v, db, s);
    if (scr === 'carry') this.carryVals(v, db, s);
    if (scr === 'notes') this.notesVals(v, db);
    if (scr === 'plan') this.planVals(v, db, s, g, L, gc);
    if (scr === 'start' || scr === 'mid') this.liveVals(v, db, s, g, L, gc);
    if (scr === 'after') this.afterVals(v, db, s, g, L, gc);
    if (scr === 'camb') this.cambVals(v, db, s, g, L, gc);
    if (scr === 'cambAll') this.bulkVals(v, db, s);
    if (scr === 'tg') this.tgVals2(v, db, s);
    if (scr === 'read') this.readVals(v, db, s, g, L, gc);
    return v;
  }

  cardVals(db, x) {
    const K = this.K, lv = K.LV[x.level], c = this.calc(x), slot = c.nextSlot, p = this.pill(c.diff);
    const carryN = db.carry.filter(k => k.groupId === x.id && k.lessonId !== x.draft.id).length;
    const planned = x.draft.exercises.length;
    const units = this.units(x.level);
    let skipNote = '';
    if (slot && slot.i === 0) {
      const idx = units.findIndex(u => u.u === slot.u);
      const prev = units[idx - 1];
      if (prev && prev.skip && !x.taught.some(t => t.unit === prev.u)) skipNote = `Unit ${prev.u} is skipped`;
    }
    const nu = slot ? this.findUnit(x.level, slot.u) : null;
    const todayIso = this.iso(c.today), tIdx = x.taught.filter(t => t.slot).findIndex(t => t.date === todayIso);
    const ready = this.hasOwnPlan(x.draft), nowLabel = x.draft.extra ? this.extraLabel(x.draft) : this.secLabel(slot);
    let todayHead, todayVal, todayTag = '', todayTagBg = '', todayTagFg = '';
    if (tIdx >= 0) { todayHead = 'Taught today:'; todayVal = this.secLabel(c.slots[tIdx]); }
    else if (c.isToday && slot) { todayHead = 'To be taught today:'; todayVal = nowLabel; todayTag = ready ? 'Plan ready' : 'No plan yet'; }
    else { todayHead = 'No class today. Next:'; todayVal = slot ? `${nowLabel} on ${this.fmtS(c.next)}` : 'Course finished'; todayTag = slot ? (ready ? 'Plan ready' : 'No plan yet') : ''; }
    if (todayTag) { todayTagBg = ready ? '#DDF3EC' : '#FFF1C7'; todayTagFg = ready ? '#0F6B55' : '#8A4B00'; }
    const pk = this.nextToPrepare(x), ps = pk != null ? c.slots[pk] : null;
    // the lesson after the one shown on the first line
    let nl = null;
    {
      const k1 = tIdx >= 0 ? c.done : (x.draft.extra ? c.done : c.done + 1);
      const X = tIdx >= 0 && x.draft.extra ? x.draft : this.extraFor(x, k1);
      if (tIdx >= 0 && !x.draft.extra && c.slots[k1]) nl = { label: this.secLabel(c.slots[k1]), date: c.next, ready: this.hasOwnPlan(x.draft) };
      else if (X) nl = { label: this.extraLabel(X), date: X === x.draft ? c.next : this.extraDate(x, X), ready: this.hasOwnPlan(X) };
      else if (c.slots[k1]) { const Lk = this.planFor(x, k1); nl = { label: this.secLabel(c.slots[k1]), date: this.slotDate(x, k1), ready: this.hasOwnPlan(Lk) }; }
    }
    const prep = {
      prepVal: ps ? this.secLabel(ps) : 'All planned', prepSub: ps ? `for ${this.fmtS(this.slotDate(x, pk))}` : '',
      hasPrep: !!ps, prepBtn: ps ? 'Prepare it →' : '',
      onPrepare: ev => { ev.stopPropagation(); this.planAhead(x.id, pk); }
    };
    const draftDiff = x.draft.unit && slot && x.draft.unit !== slot.u;
    const ud = this.unclosedDay(x), sure = this.state.sureClose === x.id + ud;
    const unc = {
      hasUnclosed: !!ud, canAsPlanned: !!ud && this.hasOwnPlan(x.draft),
      unclosedText: ud ? `${this.fmtS(this.D(ud))}${ud === todayIso ? ' (today)' : ''}: ${nowLabel} is not closed yet. Did you teach it?` : '',
      asPlannedBtn: sure ? `Tap again to close ${this.fmtS(this.D(ud))}` : '✓ Taught as planned',
      onAsPlanned: ev => { ev.stopPropagation(); if (!sure) { this.setState({ sureClose: x.id + ud }); return; } this.setState({ sureClose: null, gid: x.id }); this.closeLesson(ud, x.id); },
      onSomeMissed: ev => { ev.stopPropagation(); this.setState({ gid: x.id, screen: 'after', editId: null, sel: null, closeDay: { gid: x.id, date: ud }, sureClose: null }); window.scrollTo(0, 0); },
      onNoClass: ev => { ev.stopPropagation(); this.upd(d => { d.groups[x.id].noClass.push(ud); }, { sureClose: null }); this.toast(`${this.fmtS(this.D(ud))} marked as no class.`); }
    };
    const isTodayClass = tIdx >= 0 || (c.isToday && !!slot);
    const dayBlk = isTodayClass
      ? { todayKicker: tIdx >= 0 ? 'TODAY · TAUGHT' : 'TODAY', todayBg: lv.tint, todayBorder: lv.c, todayKfg: '#fff', todayKbg: lv.c }
      : { todayKicker: 'NO CLASS TODAY', todayBg: '#F4F6FB', todayBorder: '#E2E6F0', todayKfg: '#5A6482', todayKbg: '#E6E9F2' };
    // Telegram reminder for the last closed lesson (shown once the lesson is closed)
    const lastL = x.history.filter(h => h.date).slice().sort((a, b) => b.date.localeCompare(a.date))[0];
    const tgDue = !ud && lastL && !lastL.tgSent && !lastL.tgSkip && this.hasOwnPlan(lastL) && this.D(lastL.date) >= this.add(c.today, -3);
    const tgc = {};
    if (tgDue) {
      const link = (db.tgChats || {})[x.id], bot = this.tgCfg(), st = this.state, open = st.tgCard === x.id, sure = st.tgSure === lastL.id;
      const text = lastL.tg || this.tgAuto(x, lastL);
      const missed = lastL.exercises.filter(e => !e.skipped && (lastL.results[e.id] === 'None' || lastL.results[e.id] === 'Part'));
      const setL = fn => this.upd(d => { const h = d.groups[x.id].history.find(y => y.id === lastL.id); if (h) fn(h); });
      Object.assign(tgc, {
        tgHead: `Telegram message for ${this.fmtS(this.D(lastL.date))} · ${this.lTitle(lastL)} is not sent yet.`,
        tgOpen: open, tgText: text, tgBasic: !lastL.tg,
        tgWarn: missed.length ? `Not fully covered: ${missed.map(e => this.exLabel(e, lastL.exercises.indexOf(e))).join(', ')}. Remove those parts if needed.` : '',
        tgCanSend: !!(link && bot),
        tgSendLabel: st.tgSending ? 'Sending…' : sure ? `Tap again to send to ${link && link.title}` : `✈ Send to ${link ? link.title : 'group'}`,
        tgSendBg: sure ? '#D97706' : '#2AABEE',
        onTgToggle: ev => { ev.stopPropagation(); this.setState({ tgCard: open ? null : x.id, tgSure: null }); },
        onTgEdit: ev => { const val = ev.target.value; setL(h => { h.tg = val; }); },
        onTgSend: ev => { ev.stopPropagation(); if (st.tgSending) return; if (!sure) { this.setState({ tgSure: lastL.id, tgCard: x.id }); return; } this.tgSend(x.id, text, lastL.id).then(ok => { if (ok) this.setState({ tgCard: null }); }); },
        onTgCopy: ev => { ev.stopPropagation(); const ok = () => { setL(h => { h.tgSent = Date.now(); }); this.setState({ tgCard: null }); this.toast('Copied and marked as sent. Paste it into the Telegram group.'); }; if (navigator.clipboard) navigator.clipboard.writeText(text).then(ok, () => this.toast('Could not copy. Select the text and copy by hand.')); else ok(); },
        onTgDone: ev => { ev.stopPropagation(); setL(h => { h.tgSent = Date.now(); }); this.setState({ tgCard: null }); this.toast('Marked as sent.'); },
        onTgSkip: ev => { ev.stopPropagation(); setL(h => { h.tgSkip = true; }); this.setState({ tgCard: null }); this.toast('No message for this lesson.'); },
        stop: ev => ev.stopPropagation()
      });
    }
    return { ...unc, ...dayBlk, isTodayClass, hasTgDue: !!tgDue, ...tgc,
      time: `${x.start} - ${x.end}`, level: lv.name, is30: x.is30, tint: lv.tint, dark: lv.dark, color: lv.c,
      date: this.nextText(x, c), unit: x.draft.extra ? this.uLabel(x.draft.unit) : slot ? this.uLabel(slot.u) : 'Done', desc: x.draft.extra ? 'Extra lesson · skippable unit' : this.slotDesc(x.level, slot),
      secs: nu ? this.secsText(nu) : '',
      progress: `${c.done} of 38 lessons`, progressShort: `${c.done} of 38`, pct: Math.max(2, c.done / 38 * 100) + '%',
      pill: p.t, pillBg: p.bg, pillFg: p.fg,
      carry: carryN ? `${carryN} carried over` : 'Nothing carried over', hasCarry: carryN > 0,
      carryBg: carryN ? '#FFE4D1' : '#E6E9F2', carryFg: carryN ? '#9A4A0A' : '#3A4566',
      ahead: c.diff > 0, aheadText: `You are ahead by ${c.diff}. Better not to teach skippable units.`,
      hasPlan: planned > 0 || draftDiff,
      planText: [planned ? `${planned} exercise${planned > 1 ? 's' : ''} planned` : '', draftDiff ? `Planned unit: ${x.draft.unit}` : ''].filter(Boolean).join(' · '),
      btn: planned ? `Open plan · ${this.uLabel(x.draft.unit || (slot && slot.u))}` : `Plan ${this.uLabel(x.draft.unit || (slot && slot.u))}`,
      hasSkipNote: !!skipNote, skipNote,
      todayHead, todayVal, todayTag, hasTodayTag: !!todayTag, todayTagBg, todayTagFg, ...prep,
      hasNl: !!nl, nlLabel: nl ? nl.label : '', nlSub: nl ? this.fmtS(nl.date) : '', nlTag: nl ? (nl.ready ? 'Plan ready' : 'No plan yet') : '',
      nlTagBg: nl && nl.ready ? '#DDF3EC' : '#FFF1C7', nlTagFg: nl && nl.ready ? '#0F6B55' : '#8A4B00',
      onOpen: () => { this.setState({ gid: x.id, screen: 'plan', sel: null, editId: null, delEx: null, delLesson: null }); window.scrollTo(0, 0); }
    };
  }
  weekVals(v, db) {
    const sel = db.dayType, other = sel === 'odd' ? 'even' : 'odd';
    const of = t => Object.values(db.groups).filter(x => x.dayType === t).sort((a, b) => a.start.localeCompare(b.start));
    v.bigCards = of(sel).map(x => this.cardVals(db, x));
    v.smallCards = of(other).map(x => this.cardVals(db, x));
    const nextOf = t => of(t).map(x => this.calc(x).next).sort((a, b) => a - b)[0];
    v.weekKicker = `${sel.toUpperCase()} DAYS · NEXT LESSONS ${this.fmtS(nextOf(sel)).toUpperCase()}`;
    v.otherKicker = `${other.toUpperCase()} DAYS · NEXT LESSONS ${this.fmtS(nextOf(other)).toUpperCase()}`;
    v.todayLong = this.fmtL(this.today());
    v.clockNow = this.clock();
    const all = Object.values(db.groups).map(x => this.calc(x).diff);
    const on = all.filter(d => d === 0).length, ah = all.filter(d => d > 0).length, be = all.filter(d => d < 0).length;
    v.statusTitle = on === all.length ? `All ${all.length} groups on track` : [on && `${on} on track`, ah && `${ah} ahead`, be && `${be} behind`].filter(Boolean).join(' · ');
    v.statusBg = be ? '#FDE3E3' : '#D9F2E4'; v.statusFg = be ? '#A32020' : '#0F6B55';
    v.statusSub = `Next ${other} day: ${this.fmtS(nextOf(other))}`;
  }
  roadmapVals(v, db, s) {
    const g = db.groups[s.rmGid || s.gid], lv = this.K.LV[g.level], c = this.calc(g), p = this.pill(c.diff);
    const order = Object.values(db.groups).sort((a, b) => a.dayType === b.dayType ? a.start.localeCompare(b.start) : a.dayType === 'odd' ? -1 : 1);
    v.rmChips = order.map(x => ({ label: `${this.gLabel(x)} · ${x.dayType} · ${x.start}`, bg: x.id === g.id ? this.K.LV[x.level].tint : '#fff', border: x.id === g.id ? this.K.LV[x.level].c : '#E2E6F0', onClick: () => this.setState({ rmGid: x.id }) }));
    v.rm = {
      title: `${this.gLong(g)}`, pill: p.t, pillBg: p.bg, pillFg: p.fg, progress: `${c.done} of 38 lessons`,
      explain: `${c.passed} class day${c.passed === 1 ? '' : 's'} so far, ${c.done} roadmap lesson${c.done === 1 ? '' : 's'} taught.` + (c.diff > 0 ? ' Better not to teach skippable units.' : c.diff < 0 ? ' Skip the greyed-out units to catch up.' : ' Greyed-out units take no lesson. Skipping them keeps you on track.')
    };
    let k = 0;
    v.rmUnits = this.units(g.level).map(un => {
      if (un.skip) {
        const taught = g.taught.some(t => t.unit === un.u);
        return { label: this.uLabel(un.u), secs: '—', state: taught ? 'Taught (used a lesson)' : 'Can be skipped', bg: '#E8EBF3', fg: '#6B7390', border: '#C9CFDE', borderStyle: 'dashed' };
      }
      const n = un.u === 'FE' ? 2 : un.secs.length; const start = k; k += n;
      const doneN = Math.max(0, Math.min(n, c.done - start));
      const isNext = c.done >= start && c.done < start + n;
      return { label: this.uLabel(un.u), secs: this.secsText(un),
        state: doneN === n ? 'Done' : isNext ? (doneN ? `Next · ${doneN} of ${n} done` : 'Next') : `${n} lesson${n > 1 ? 's' : ''}`,
        bg: doneN === n ? lv.tint : '#fff', fg: '#14213D', border: isNext ? lv.c : doneN === n ? lv.tint : '#E2E6F0', borderStyle: 'solid' };
    });
    const days = []; let after = 0;
    for (let d = this.D(g.startDate); after < 7; d = this.add(d, 1)) {
      if (!this.isType(d, g.dayType)) continue;
      const id = this.iso(d), t = g.taught.find(x => x.date === id), no = g.noClass.includes(id), isNext = id === this.iso(c.next);
      if (d >= c.today) after++;
      const isT = id === this.iso(c.today);
      days.push({
        date: (isT ? 'Today · ' : '') + this.fmtS(d),
        label: t ? `Taught · ${this.uLabel(t.unit)}${t.name ? ' · ' + t.name : ''}` : no ? 'No class (does not count)' : isNext ? (isT ? 'Today’s lesson' : 'Next lesson') : d < c.today ? 'No lesson recorded (counts as a class day)' : 'Coming up',
        fg: no ? '#A32020' : t ? '#0F6B55' : d < c.today ? '#B5530A' : '#14213D', weight: isNext ? 700 : 500,
        canToggle: !t, btn: no ? 'Undo' : 'No class',
        onToggle: () => this.upd(db2 => { const gg = db2.groups[g.id]; gg.noClass = no ? gg.noClass.filter(x => x !== id) : gg.noClass.concat(id); })
      });
    }
    v.rmDays = days;
  }
  carryItemVals(db, s, k) {
    return {
      title: this.exShort(k.ex), short: this.exShort(k.ex),
      from: `From ${this.uLabel(k.fromUnit || '?')}${k.fromName ? ' · ' + k.fromName : ''} · ${k.mark === 'Part' ? 'part done' : 'not done'}`,
      confirming: s.del === k.id, normal: s.del !== k.id,
      onDelete: () => this.setState({ del: k.id }),
      onKeep: () => this.setState({ del: null }),
      onYes: () => { this.upd(d => { d.carry = d.carry.filter(x => x.id !== k.id); }, { del: null }); this.toast('Deleted. It will not carry over again.'); },
      onAdd: () => {
        this.upd(d => {
          const gg = d.groups[k.groupId];
          const ex = Object.assign({}, k.ex, { id: this.uid(), fromCarry: { unit: k.fromUnit, name: k.fromName }, saved: true });
          gg.draft.exercises.unshift(ex);
          d.carry = d.carry.filter(x => x.id !== k.id);
        });
        this.toast('Added to today.');
      }
    };
  }
  carryVals(v, db, s) {
    const order = Object.values(db.groups).sort((a, b) => a.dayType === b.dayType ? a.start.localeCompare(b.start) : a.dayType === 'odd' ? -1 : 1);
    v.carryGroups = order.map(x => {
      const items = db.carry.filter(k => k.groupId === x.id).map(k => this.carryItemVals(db, s, k));
      return { label: this.gLong(x), color: this.K.LV[x.level].c, items, empty: !items.length, onOpen: () => this.go('start', x.id) };
    });
  }
  notesVals(v, db) {
    const out = [];
    Object.values(db.groups).forEach(x => {
      [...x.history, x.draft].forEach(L => (L.notes || []).forEach(n => out.push({ t: n.t || 0, text: n.text, color: this.K.LV[x.level].c, meta: `${this.gLong(x)} · ${this.uLabel(L.unit || '?')}${L.name ? ' · ' + L.name : ''}${L.date ? ' · ' + this.fmtS(this.D(L.date)) : ''}` })));
    });
    v.allNotes = out.sort((a, b) => b.t - a.t);
    v.noNotes = !out.length;
  }

  planVals(v, db, s, g, L, gc) {
    const K = this.K, lv = K.LV[g.level];
    v.unit = L.unit; v.lname = L.name;
    const syncTaught = (gg, T) => { const te = gg.taught.find(t => t.lessonId === T.id); if (te) { const u = this.findUnit(gg.level, T.unit); te.unit = T.unit; te.name = T.name; te.slot = !!(u && !u.skip); } };
    v.onUnit = e => this.upd(d => { const gg = d.groups[g.id], T = this.T(gg, s); T.unit = e.target.value; syncTaught(gg, T); });
    v.onName = e => this.upd(d => { const gg = d.groups[g.id], T = this.T(gg, s); T.name = e.target.value; syncTaught(gg, T); });
    // editing a taught lesson
    const editingTaught = !!s.editId && L !== g.draft;
    const isAhead = editingTaught && L.forSlot != null && !L.date;
    v.editingTaught = editingTaught; v.canStart = !editingTaught;
    v.taughtDays = editingTaught && L.date ? this.dayOptions(g, L.date).map(id => ({ id, label: this.dayLabel(id), sel: id === L.date })) : [];
    v.hasTaughtDay = v.taughtDays.length > 0;
    v.onTaughtDay = e => {
      const val = e.target.value;
      this.upd(d => { const gg = d.groups[g.id], T = this.T(gg, s); const te = gg.taught.find(t => t.lessonId === T.id); T.date = val; if (te) te.date = val; });
      this.toast(`Moved to ${this.fmtS(this.D(val))}.`);
    };
    v.editBanner = isAhead ? `Planning ahead: the lesson for ${this.fmtS(L.extra ? this.extraDate(g, L) : this.slotDate(g, L.forSlot))} (${L.extra ? this.extraLabel(L) : this.secLabel(gc.slots[L.forSlot])}). It becomes the next lesson by itself when its turn comes. Changes save as you type.`
      : editingTaught ? `You are editing a taught lesson from ${L.date ? this.fmtS(this.D(L.date)) : 'earlier'}. Changes save as you type.` : '';
    v.backToNext = () => this.setState({ editId: null, sel: null, delEx: null });
    // saved lessons
    const rowFor = (key, type, when, Lx, tag, extra) => {
      const open = type === 'draft' ? !editingTaught : (Lx && Lx === L);
      return Object.assign({
        key, when, title: Lx ? this.lTitle(Lx) : '', tag, count: Lx ? `${Lx.exercises.length} exercise${Lx.exercises.length === 1 ? '' : 's'}` : 'No plan saved',
        isOpen: !!open, notOpen: !open, rowBg: open ? lv.tint : '#fff', rowBorder: open ? lv.c : '#E2E6F0',
        tagBg: type === 'taught' ? '#DDF3EC' : type === 'draft' ? '#FFF1C7' : '#E6EDFF', tagFg: type === 'taught' ? '#0F6B55' : type === 'draft' ? '#6B4E00' : '#1F45C2',
        confirming: s.delLesson === key, normal: s.delLesson !== key, isTaught: type === 'taught',
        onDelete: () => this.setState({ delLesson: key }), onKeep: () => this.setState({ delLesson: null })
      }, extra);
    };
    const saved = [];
    const dL = g.draft;
    saved.push(rowFor('draft', 'draft', `Next lesson · ${this.fmtS(gc.next)}`, dL, 'Being planned', {
      onOpen: () => this.setState({ editId: null, sel: null, delEx: null }),
      onYes: () => { this.upd(d => { const gg = d.groups[g.id]; gg.draft = this.newLesson(gg); }, { delLesson: null, editId: null, sel: null }); this.toast('Lesson plan deleted. Carry-over from it stays.'); }
    }));
    // upcoming roadmap lessons: what is planned and what still needs a plan
    v.upcoming = [];
    if (g.draft.extra) { const Lk = g.draft, n = Lk.exercises.filter(e => !e.fromCarry).length, open = Lk === L;
      v.upcoming.push({ when: this.fmtS(gc.next) + ' · next lesson', sec: this.extraLabel(Lk), status: `Ready · ${n} exercises${Lk.name ? ' · ' + Lk.name : ''}`, statusFg: '#0F6B55',
        rowBg: open ? lv.tint : '#fff', rowBorder: open ? lv.c : '#E2E6F0', isOpen: open, notOpen: !open, btn: 'Open', onOpen: () => this.setState({ editId: null, sel: null }) }); }
    for (let k = gc.done; k < Math.min(gc.slots.length, gc.done + 4); k++) {
      const X = this.extraFor(g, k);
      if (X) { const n = X.exercises.filter(e => !e.fromCarry).length, open = X === L;
        v.upcoming.push({ when: this.fmtS(this.extraDate(g, X)), sec: this.extraLabel(X), status: `Ready · ${n} exercises${X.name ? ' · ' + X.name : ''}`, statusFg: '#0F6B55',
          rowBg: open ? lv.tint : '#fff', rowBorder: open ? lv.c : '#E2E6F0', isOpen: open, notOpen: !open, btn: 'Open', onOpen: () => this.setState({ editId: X.id, sel: null, delEx: null }) }); }
      const sl = gc.slots[k], Lk = this.planFor(g, k), ready = this.hasOwnPlan(Lk), open = !!Lk && Lk === L;
      const n = Lk ? Lk.exercises.filter(e => !e.fromCarry).length : 0;
      v.upcoming.push({ when: this.fmtS(this.slotDate(g, k)) + (k === gc.done ? ' · next lesson' : ''), sec: this.secLabel(sl),
        status: ready ? `Ready · ${n} exercise${n === 1 ? '' : 's'}${Lk.name ? ' · ' + Lk.name : ''}` : 'Not planned yet', statusFg: ready ? '#0F6B55' : '#8A4B00',
        rowBg: open ? lv.tint : '#fff', rowBorder: open ? lv.c : '#E2E6F0', isOpen: open, notOpen: !open, btn: ready ? 'Open' : 'Plan it', onOpen: () => this.planAhead(g.id, k) });
    }
    (g.plans || []).filter(p => p.forSlot != null && (p.forSlot > gc.done || p.extra) && this.hasOwnPlan(p)).sort((a, b) => a.forSlot - b.forSlot).forEach(p => {
      saved.push(rowFor('p:' + p.id, 'plan', `Planned ahead · for ${this.fmtS(p.extra ? this.extraDate(g, p) : this.slotDate(g, p.forSlot))} · ${p.extra ? this.extraLabel(p) : this.secLabel(gc.slots[p.forSlot])}`, p, 'Planned ahead', {
        onOpen: () => p.extra ? this.setState({ editId: p.id, sel: null }) : this.planAhead(g.id, p.forSlot),
        onYes: () => { this.upd(d => { const gg = d.groups[g.id]; gg.plans = (gg.plans || []).filter(x => x.id !== p.id); }, { delLesson: null, editId: s.editId === p.id ? null : s.editId, sel: null }); this.toast('Lesson plan deleted.'); }
      }));
    });
    (g.plans || []).filter(p => (p.forSlot == null || p.forSlot <= gc.done) && !p.extra).slice().sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0)).forEach(p => {
      saved.push(rowFor('p:' + p.id, 'plan', `Not taught yet · saved ${this.fmtS(new Date(p.savedAt || Date.now()))}`, p, 'Saved plan', {
        onOpen: () => { this.upd(d => { const gg = d.groups[g.id]; gg.plans = (gg.plans || []).filter(x => x.id !== p.id); const cur = gg.draft; if (cur.exercises.length || cur.name) { cur.savedAt = Date.now(); gg.plans.push(cur); } const np = JSON.parse(JSON.stringify(p)); delete np.forSlot; gg.draft = np; }, { editId: null, sel: null, delLesson: null }); this.toast('Plan loaded into the planner.'); },
        onYes: () => { this.upd(d => { const gg = d.groups[g.id]; gg.plans = (gg.plans || []).filter(x => x.id !== p.id); }, { delLesson: null }); this.toast('Lesson plan deleted. Carry-over from it stays.'); }
      }));
    });
    g.taught.map((t, i) => ({ t, i })).sort((a, b) => b.t.date.localeCompare(a.t.date) || b.i - a.i).forEach(({ t, i }) => {
      const Lx = t.lessonId ? g.history.find(h => h.id === t.lessonId) : null;
      const r = rowFor('t:' + i + ':' + t.date, 'taught', `Taught · ${this.fmtS(this.D(t.date))}`, Lx, 'Taught', {
        onOpen: () => {
          if (Lx) { this.setState({ editId: Lx.id, sel: null, delEx: null, delLesson: null }); return; }
          const nid = this.uid();
          this.upd(d => { const gg = d.groups[g.id]; const te = gg.taught[i]; const nl = this.newLesson(gg); Object.assign(nl, { id: nid, unit: te.unit, name: te.name || '', date: te.date }); gg.history.push(nl); te.lessonId = nid; }, { editId: nid, sel: null, delLesson: null });
        },
        onYes: () => {
          this.upd(d => { const gg = d.groups[g.id]; const te = gg.taught[i]; if (te.lessonId) gg.history = gg.history.filter(h => h.id !== te.lessonId); gg.taught.splice(i, 1); }, { delLesson: null, editId: s.editId && Lx && s.editId === Lx.id ? null : s.editId, sel: null });
          this.toast('Taught lesson deleted. The roadmap count went back by one.');
        }
      });
      if (!Lx) r.title = this.uLabel(t.unit) + (t.name ? ' · ' + t.name : '');
      saved.push(r);
    });
    v.savedLessons = saved;
    v.newPlan = () => { this.upd(d => { const gg = d.groups[g.id]; gg.plans = gg.plans || []; const cur = gg.draft; if (cur.exercises.length || cur.name) { cur.savedAt = Date.now(); gg.plans.push(cur); } gg.draft = this.newLesson(gg); }, { editId: null, sel: null }); this.toast('Saved. New empty plan for the next lesson.'); };
    // copy this plan to other groups (carry-over never travels: it belongs to one group)
    const copyOpen = !!s.copy && s.copy.gid === g.id, copySel = copyOpen ? s.copy.sel : [];
    const own = L.exercises.filter(e => !e.fromCarry), carriedN = L.exercises.length - own.length;
    v.copyOpen = copyOpen;
    v.toggleCopy = () => this.setState({ copy: copyOpen ? null : { gid: g.id, sel: [] } });
    v.copyCarryNote = carriedN ? `${carriedN} carried-over exercise${carriedN > 1 ? 's stay' : ' stays'} with ${this.gLabel(g)} only.` : '';
    v.hasCopyCarryNote = !!carriedN;
    const others = Object.values(db.groups).filter(x => x.id !== g.id)
      .sort((a, b) => (b.level === g.level) - (a.level === g.level) || (a.dayType === b.dayType ? a.start.localeCompare(b.start) : a.dayType === 'odd' ? -1 : 1));
    const srcK = this.slotOf(g, L), srcSl = srcK != null ? gc.slots[srcK] : null;
    const targetK = x => { const xc = this.calc(x); if (!srcSl) return xc.done; const k = xc.slots.findIndex((sl, i) => i >= xc.done && sl.u === srcSl.u && sl.sec === srcSl.sec); return k < 0 ? xc.done : k; };
    v.copyTargets = others.map(x => {
      const xc = this.calc(x), tk = targetK(x), xd = this.planFor(x, tk) || { exercises: [], name: '', unit: '', run: {} }, started = tk === xc.done && !!x.draft.run.lessonStart;
      const xOwn = xd.exercises.filter(e => !e.fromCarry).length, hasPlan = xOwn > 0 || !!xd.name;
      const on = copySel.includes(x.id), same = x.level === g.level;
      const nextU = xc.nextSlot ? this.uLabel(xc.nextSlot.u) : 'Course finished';
      return {
        label: this.gLong(x), same, tag: same ? 'Same level' : this.K.LV[x.level].name, tagBg: same ? lv.tint : '#ECEEF3',
        sub: tk === xc.done ? `Goes to its next lesson, ${this.fmtS(xc.next)} · on ${nextU}` + (L.unit && xc.nextSlot && xc.nextSlot.u !== L.unit ? ` (this plan is ${this.uLabel(L.unit)})` : '')
          : `Goes to its ${this.secLabel(xc.slots[tk])} lesson, planned ahead for ${this.fmtS(this.slotDate(x, tk))}`,
        warn: started ? 'Lesson in progress. Finish it first.' : hasPlan ? `Has a plan (${this.lTitle(xd)}, ${xOwn} exercise${xOwn === 1 ? '' : 's'}). It moves to its Saved lessons.` : '',
        hasWarn: started || hasPlan, warnFg: started ? '#A32020' : '#8A4B00',
        disabled: started, on, box: on ? '✓' : '', boxBg: on ? '#14213D' : '#fff', boxBorder: started ? '#D5DAEA' : on ? '#14213D' : '#9AA1B6',
        rowBg: on ? lv.tint : started ? '#F4F6FB' : '#fff', rowBorder: on ? lv.c : '#E2E6F0', fg: started ? '#8E97B5' : '#14213D', cursor: started ? 'default' : 'pointer',
        onToggle: () => { if (started) return; this.setState({ copy: { gid: g.id, sel: on ? copySel.filter(id => id !== x.id) : copySel.concat(x.id) } }); }
      };
    });
    v.copyBtn = copySel.length ? `Copy to ${copySel.length} group${copySel.length > 1 ? 's' : ''}` : 'Pick a group first';
    v.copyBtnBg = copySel.length ? '#138A6E' : '#C9CFDE';
    v.doCopy = () => {
      if (!copySel.length) return;
      if (!own.length && !L.name) { this.toast('Nothing to copy yet. Add exercises first.'); return; }
      const names = copySel.map(id => this.gLabel(db.groups[id]) + ' ' + db.groups[id].start);
      const tks = Object.fromEntries(copySel.map(id => [id, targetK(db.groups[id])]));
      this.upd((d, st) => {
        const src = this.T(d.groups[g.id], st);
        const exs = src.exercises.filter(e => !e.fromCarry);
        copySel.forEach(tid => {
          const tg = d.groups[tid], tk = tks[tid];
          let cur = tk === this.calc(tg).done ? tg.draft : this.aheadFor(tg, tk);
          if (!cur) { cur = this.newLesson(tg); cur.forSlot = tk; tg.plans = (tg.plans || []).concat(cur); }
          if (cur.run.lessonStart) return;
          const keepCarry = cur.exercises.filter(e => e.fromCarry);
          if (cur.exercises.length > keepCarry.length || cur.name) {
            const old = JSON.parse(JSON.stringify(cur));
            Object.assign(old, { id: this.uid(), savedAt: Date.now(), exercises: old.exercises.filter(e => !e.fromCarry) });
            delete old.forSlot;
            tg.plans = (tg.plans || []).concat(old);
          }
          cur.unit = src.unit; cur.name = src.name;
          cur.aims = Object.assign({}, src.aims);
          if (src.tg) cur.tg = src.tg.replace(/🗓 [A-Za-z]{3} \d{1,2} [A-Za-z]{3}/, '🗓 ' + this.fmtS(this.slotDate(tg, tk))); else delete cur.tg;
          cur.exercises = keepCarry.concat(exs.map(e => Object.assign(JSON.parse(JSON.stringify(e)), { id: this.uid(), saved: true, fromCarry: null })));
        });
      }, { copy: null });
      this.toast(`Copied to ${names.join(', ')}. Open each one to adjust it.`);
    };
    const live = L.exercises.filter(e => !e.skipped);
    const sum = live.reduce((a, e) => a + this.em(e), 0);
    v.minText = `${5 + sum}-${7 + sum} of 80 min`;
    const freeLo = 80 - 7 - sum, freeHi = 80 - 5 - sum;
    v.minFree = freeHi < 0 ? `${-freeHi}-${-freeLo} min too long` : freeLo < 0 ? 'Full' : `${freeLo}-${freeHi} min free`;
    v.minFreeColor = freeLo < 0 ? '#FF8A80' : '#FFB020';
    // warning
    const un = this.findUnit(g.level, L.unit);
    v.hasWarn = false;
    if (L.unit.trim() && !un) {
      v.hasWarn = true; v.warnHead = `Unit ${L.unit} is not on the ${lv.name} roadmap.`; v.warnBody = 'Check the number.'; v.hasWarnBtn = false;
    } else if (un && un.skip) {
      const us = this.units(g.level), nu = us.slice(us.indexOf(un) + 1).find(x => !x.skip);
      v.hasWarn = true; v.warnHead = `Unit ${un.u} can be skipped`;
      v.warnBody = `It is greyed out on the ${lv.name} roadmap.` + (nu ? ` Next on the roadmap: ${this.uLabel(nu.u)} (${this.secsText(nu)}).` : '') + (gc.diff > 0 ? ' You are ahead. Better not to teach skippable units.' : ' You can still plan it.');
      v.hasWarnBtn = !!nu; v.warnBtn = nu ? `Use ${this.uLabel(nu.u)} instead` : '';
      v.useNext = () => { this.upd(d => { this.T(d.groups[g.id], s).unit = nu.u; }); this.toast(`Changed to ${this.uLabel(nu.u)}.`); };
    }
    // list
    const n = L.exercises.length, hd = this.heads(L);
    v.exRows = L.exercises.map((e, i) => {
      const k = this.kc(e.kind), sel = s.sel === e.id;
      const move = (dir) => ev => { ev.stopPropagation(); this.upd(d => { const a = this.T(d.groups[g.id], s).exercises; const j = i + dir; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; }); };
      return {
        key: e.id, head: hd[i], hasHead: !!hd[i], n: this.exBadge(e, i), title: e.skipped ? `Skip: ${this.exLabel(e, i)}` : this.exTitle(e),
        sub: e.skipped ? [e.page && `Page ${e.page}`, 'Not teaching this one'].filter(Boolean).join(' · ') : [e.page && `Page ${e.page}`, e.note].filter(Boolean).join(' · ') || 'Tap to fill in',
        min: e.skipped ? '' : (this.em(e) ? `${this.em(e)} min` : '—'), who: e.skipped ? '' : (e.who === 'All together, I lead' ? 'All together' : e.who),
        hasFrom: !!e.fromCarry, from: e.fromCarry ? `Carried over from ${this.uLabel(e.fromCarry.unit || '?')}${e.fromCarry.name ? ' · ' + e.fromCarry.name : ''}` : '',
        bg: e.skipped ? '#E8EBF3' : sel ? k.t : '#fff', numBg: e.skipped ? '#8E97B5' : k.c,
        border: sel ? '#14213D' : e.skipped ? '#9AA1B6' : '#E2E6F0', borderW: sel ? '2px' : '1px', borderStyle: e.skipped ? 'dashed' : 'solid',
        fg: e.skipped ? '#4E5568' : '#14213D',
        onClick: () => this.setState({ sel: e.id }), onUp: move(-1), onDown: move(1),
        confirming: s.delEx === e.id, confirmText: `Delete ${this.exLabel(e, i)}?`,
        onAskDel: ev => { ev.stopPropagation(); this.setState({ delEx: e.id }); },
        onKeep: ev => { ev.stopPropagation(); this.setState({ delEx: null }); },
        onYes: ev => { ev.stopPropagation(); this.upd(d => { const a = this.T(d.groups[g.id], s).exercises; const j = a.findIndex(x => x.id === e.id); if (j >= 0) a.splice(j, 1); }, { delEx: null, sel: s.sel === e.id ? null : s.sel }); this.toast('Exercise deleted. Carry-over from it stays.'); }
      };
    });
    v.addEx = () => { const ex = this.newEx(L.exercises[n - 1]); this.upd(d => { this.T(d.groups[g.id], s).exercises.push(ex); }, { sel: ex.id }); };
    const carry = editingTaught ? [] : db.carry.filter(k => k.groupId === g.id && k.lessonId !== L.id);
    v.planHasCarry = carry.length > 0;
    v.planCarry = carry.map(k => { const c = this.carryItemVals(db, s, k); return { title: c.title, from: c.from, onAdd: c.onAdd }; });
    const last = g.history[g.history.length - 1];
    v.planNotes = last ? (last.notes || []).map(x => ({ text: x.text })) : [];
    v.planHasNotes = v.planNotes.length > 0;
    // aims
    v.aimsOpen = s.aimsOpen; v.toggleAims = () => this.setState({ aimsOpen: !s.aimsOpen });
    const aimDefs = [['main', 'Main aim', 'By the end of the lesson, students will be able to…'], ['sub', 'Sub-aims', 'e.g. Vocabulary: classroom objects'], ['personal', 'Personal aim', 'e.g. Give instructions in short steps'], ['prob1', 'Problem 1 and solution', 'e.g. They say "a apple". I drill both forms.'], ['prob2', 'Problem 2 and solution', 'Optional']];
    v.aimFields = aimDefs.map(([key, label, ph]) => ({ label, ph, value: L.aims[key], bg: L.aims[key] ? '#fff' : '#FFF8D9', onChange: e => this.upd(d => { this.T(d.groups[g.id], s).aims[key] = e.target.value; }) }));
    this.tgVals(v, g, L, s);
    v.aimsCount = `${aimDefs.filter(([k]) => L.aims[k]).length} of 5 filled ${s.aimsOpen ? '▲' : '▼'}`;
    // editor
    const idx = L.exercises.findIndex(e => e.id === s.sel), e = L.exercises[idx];
    v.hasSel = !!e; v.noSel = !e;
    v.emptyTitle = n ? 'Saved. Add the next exercise, or tap one to change it.' : `Plan ${this.uLabel(L.unit || '?')}`;
    v.kindChips = []; v.whoBtns = []; v.minBtns = []; v.se = {};
    if (!e) return;
    v.se = {
      heading: this.exLabel(e, idx), skipped: e.skipped, skipLabel: `Skip: ${this.exLabel(e, idx)}`,
      savedText: e.saved ? 'Saved' : 'Not saved yet', savedBg: e.saved ? '#DDF3EC' : '#FFF1C7', savedFg: e.saved ? '#0F6B55' : '#6B4E00',
      page: e.page, num: e.num, grammar: e.grammar, track: e.track, note: e.note, self: e.self, otherMin: e.otherMin,
      isGrammar: e.kind === 'Grammar', isListening: e.kind === 'Listening', isOther: e.min === 'other',
      sec: e.sec || '', secPh: this.secHead(Object.assign({}, e, { sec: '' })), onSec: ev => this.setEx(e.id, { sec: ev.target.value }),
      onPage: ev => this.setEx(e.id, { page: ev.target.value }), onNum: ev => this.setEx(e.id, { num: ev.target.value }),
      onGrammar: ev => this.setEx(e.id, { grammar: ev.target.value }), onTrack: ev => this.setEx(e.id, { track: ev.target.value }),
      onNote: ev => this.setEx(e.id, { note: ev.target.value }), onSelf: ev => this.setEx(e.id, { self: ev.target.value }),
      onOther: ev => this.setEx(e.id, { otherMin: ev.target.value.replace(/\D/g, '') }),
      skipBtn: e.skipped ? 'Teach it after all' : "I'm skipping this exercise",
      skipHint: e.skipped ? 'Skipped exercises never carry over.' : `It will show as "Skip: ${this.exLabel(e, idx)}" in the lesson.`,
      onSkip: () => { this.setEx(e.id, { skipped: !e.skipped, saved: true }); this.toast(e.skipped ? 'Back in the lesson.' : `Shows as "Skip: ${this.exLabel(e, idx)}".`); },
      onDelete: () => this.setState({ delEx: e.id }),
      onSave: () => {
        let added = 0;
        this.upd(d => {
          const x = this.T(d.groups[g.id], s).exercises.find(y => y.id === e.id); x.saved = true;
          const m = parseInt(x.otherMin);
          if (x.min === 'other' && m > 0) {
            d.customMins = d.customMins || [];
            if (![1, 2, 3, 5, 7, 15, 20].includes(m) && !d.customMins.includes(m)) { d.customMins.push(m); added = m; }
            x.min = m; x.otherMin = '';
          }
        }, { sel: null });
        this.toast(added ? `${this.exLabel(e, idx)} saved. ${added} min is now a preset.` : `${this.exLabel(e, idx)} saved.`);
      }
    };
    v.kindChips = Object.keys(this.K.KINDS).map(kind => {
      const on = e.kind === kind, kk = this.K.KINDS[kind];
      return { label: kind, bg: on ? kk.c : '#fff', fg: on ? '#fff' : '#14213D', border: on ? kk.c : '#C9CFDE', weight: on ? 700 : 500, onClick: () => this.setEx(e.id, { kind }) };
    });
    v.whoBtns = this.K.WHO.map(w => ({ label: w, bg: e.who === w ? '#14213D' : '#fff', fg: e.who === w ? '#fff' : '#14213D', border: e.who === w ? '#14213D' : '#C9CFDE', weight: e.who === w ? 700 : 500, onClick: () => this.setEx(e.id, { who: w }) }));
    const base = [1, 2, 3, 5, 7, 15, 20];
    const presets = [...new Set(base.concat(db.customMins || []))].sort((a, b) => a - b);
    v.minBtns = presets.concat('other').map(m => {
      const on = e.min === m;
      return { label: m === 'other' ? 'Other' : String(m), font: m === 'other' ? "'DM Sans'" : "'DM Mono'", bg: on ? '#14213D' : '#fff', fg: on ? '#fff' : '#14213D', border: on ? '#14213D' : '#C9CFDE', onClick: () => this.setEx(e.id, { min: m }) };
    });
  }

  liveVals(v, db, s, g, L, gc) {
    const run = L.run;
    const elapsed = run.lessonStart ? Math.max(0, Math.floor((s.now - run.lessonStart) / 60000)) : 0;
    v.minLeft = Math.max(0, 80 - elapsed);
    // today list
    let t = this.tm(g.start);
    const rows = [];
    const sty = (state, kc, warm) => ({
      done: { bg: '#F2F4FA', border: '#F2F4FA', fg: '#5A6482', iconBg: '#138A6E', iconFg: '#fff', iconBorder: '#138A6E', iconStyle: 'solid', weight: 500 },
      unf: { bg: '#FFF1E6', border: '#FFF1E6', fg: '#8A3D05', iconBg: '#F07A1A', iconFg: '#fff', iconBorder: '#F07A1A', iconStyle: 'solid', weight: 500 },
      cur: { bg: kc, border: kc, fg: warm ? '#14213D' : '#fff', iconBg: '#fff', iconFg: warm ? '#14213D' : kc, iconBorder: '#fff', iconStyle: 'solid', weight: 700 },
      up: { bg: '#fff', border: '#E2E6F0', fg: '#14213D', iconBg: '#fff', iconFg: '#14213D', iconBorder: '#9AA1B6', iconStyle: 'solid', weight: 500 },
      skip: { bg: '#E8EBF3', border: '#E8EBF3', fg: '#5A6482', iconBg: 'transparent', iconFg: '#5A6482', iconBorder: '#9AA1B6', iconStyle: 'dashed', weight: 500 }
    })[state];
    const warmCur = !run.warmDone, hd = this.heads(L);
    rows.push(Object.assign({ key: 'warm', label: warmCur ? 'Warm-up · now' : 'Warm-up', time: this.hm(t), icon: warmCur ? 'Go' : '✓', pop: !warmCur, onJump: () => this.go('start') }, sty(warmCur ? 'cur' : 'done', '#FFB020', true)));
    t += 6;
    L.exercises.forEach((e, i) => {
      const hk = hd[i] ? { head: hd[i] } : {};
      if (e.skipped) { rows.push(Object.assign({ key: e.id, ...hk, label: `Skip: ${this.exLabel(e, i)}`, time: '', icon: '' }, sty('skip'))); return; }
      const st = run.status[e.id], cur = run.warmDone && run.idx === i;
      const state = st === 'done' ? 'done' : st === 'unfinished' ? 'unf' : cur ? 'cur' : 'up';
      rows.push(Object.assign({ key: e.id + state, ...hk, label: `${this.exLabel(e, i)}${e.kind === 'Listening' && e.track ? ' · Track ' + e.track : ''}${cur ? ' · now' : ''}${st === 'unfinished' ? ' · next lesson' : ''}`, time: this.hm(t), icon: state === 'done' ? '✓' : state === 'unf' ? '→' : state === 'cur' ? this.exBadge(e, i) : '', pop: state === 'done',
        onJump: () => this.jumpTo(g.id, i) }, sty(state, this.kc(e.kind).c)));
      t += this.em(e);
    });
    v.today = rows;
    const ck = run.checks || {}, st0 = this.tm(g.start);
    v.checks = this.CHECKS.map(([key, label, off]) => ({ key, label, at: this.hm(st0 + off), on: !!ck[key],
      onClick: () => this.upd(d => { const R = d.groups[g.id].draft.run; R.checks = R.checks || {}; R.checks[key] = !R.checks[key]; }) }));
    v.checksLeft = v.checks.filter(c => !c.on).length;
    v.remindOn = this.remindOn(); v.toggleRemind = () => this.toggleRemind();
    const free = this.tm(g.end) - t;
    v.todayFoot = free >= 0 ? `Planned work ends ${this.hm(t)}. Free time left: ${free} min.` : `Planned work ends ${this.hm(t)}, ${-free} min after the lesson ends.`;
    // carry
    const carry = db.carry.filter(k => k.groupId === g.id && k.lessonId !== L.id);
    v.carryItems = carry.map(k => this.carryItemVals(db, s, k));
    v.noCarry = !carry.length;
    v.warmBtn = run.warmDone ? 'Warm-up done ✓  Go to the lesson' : 'Warm-up done';
    v.warmDone = () => {
      this.upd(d => { const LL = this.T(d.groups[g.id], s); if (!LL.run.warmDone) { LL.run.warmDone = true; LL.run.idx = null; this.advance(LL); } }, { screen: 'mid' });
    };
    // current & next
    const cur = run.warmDone && run.idx != null && run.idx >= 0 ? L.exercises[run.idx] : null;
    const fromIdx = cur ? run.idx : (run.warmDone ? L.exercises.length : -1);
    const nIdx = L.exercises.findIndex((e, k) => k > fromIdx && !e.skipped);
    const ne = L.exercises[nIdx];
    const between = [];
    if (ne) for (let k = nIdx + 1; k < L.exercises.length && L.exercises[k].skipped; k++) between.push(k + 1);
    for (let k = fromIdx + 1; k < nIdx; k++) if (L.exercises[k].skipped) between.unshift(k + 1);
    const lab = between.map(k => this.exLabel(L.exercises[k - 1], k - 1));
    v.nx = {
      has: !!ne, none: !ne, noneText: L.exercises.length ? 'Nothing after this. Then: After class.' : 'No exercises planned yet.',
      kind: ne ? (ne.kind || 'Exercise') : '', kc: ne ? this.kc(ne.kind).c : '#8E97B5',
      text: ne ? [this.exLabel(ne, nIdx), ne.page && `p. ${ne.page}`, ne.who, this.em(ne) && `${this.em(ne)} min`].filter(Boolean).join(' · ') : '',
      hasThen: between.length > 0, then: `Then skip: ${lab.join(', ')}`
    };
    v.hasCur = !!cur; v.noCur = !cur;
    if (cur) {
      const k = this.kc(cur.kind), extra = (run.extra || {})[cur.id] || 0, planned = this.em(cur) * 60 + extra;
      const nowT = run.pausedAt || s.now;
      const left = planned - Math.max(0, Math.floor((nowT - (run.curStart || nowT)) / 1000));
      const a = Math.abs(left);
      v.timerText = `${left < 0 ? '+' : ''}${String(Math.floor(a / 60)).padStart(2, '0')}:${String(a % 60).padStart(2, '0')}`;
      v.timerColor = run.pausedAt ? '#8E97B5' : left < 0 ? '#D63A3A' : left < 60 ? '#C98A0B' : '#14213D';
      v.timerCls = run.pausedAt ? '' : left < 0 ? 'fx-pulse' : '';
      v.timerSub = run.pausedAt ? 'Paused' : left < 0 ? `over the planned ${Math.round(planned / 60)} min` : `left of ${Math.round(planned / 60)} min`;
      v.paused = !!run.pausedAt; v.pauseLabel = run.pausedAt ? '▶ Start' : '❚❚ Pause';
      v.togglePause = () => this.togglePause(g.id);
      v.addMin = () => this.upd(d => { const R = d.groups[g.id].draft.run; R.extra = R.extra || {}; R.extra[cur.id] = (R.extra[cur.id] || 0) + 60; });
      v.resetTimer = () => this.upd(d => { const R = d.groups[g.id].draft.run; R.curStart = Date.now(); if (R.pausedAt) R.pausedAt = R.curStart; if (R.extra) delete R.extra[cur.id]; });
      const pi = this.stepIdx(L, run.idx, -1), ni = this.stepIdx(L, run.idx, 1);
      v.canPrev = true; v.prevLabel = pi >= 0 ? `← ${this.exLabel(L.exercises[pi], pi)}` : '← Warm-up';
      v.goPrev = () => pi >= 0 ? this.jumpTo(g.id, pi) : this.go('start');
      v.canNext = ni >= 0; v.nextLabel = ni >= 0 ? `${this.exLabel(L.exercises[ni], ni)} →` : '';
      v.goNext = () => { if (ni >= 0) this.jumpTo(g.id, ni); };
      v.curDone = run.status[cur.id] === 'done';
      v.undoDone = () => this.upd(d => { delete d.groups[g.id].draft.run.status[cur.id]; });
      v.cur = {
        key: cur.id, kind: cur.kind || 'Exercise', kc: k.c, kt: k.t, where: [this.exLabel(cur, run.idx), cur.page && `Page ${cur.page}`].filter(Boolean).join(' · '), note: cur.note || this.exTitle(cur),
        hasExtra: (cur.kind === 'Grammar' && !!cur.grammar) || (cur.kind === 'Listening' && !!cur.track),
        extraLabel: cur.kind === 'Grammar' ? 'EXPLAIN THIS GRAMMAR' : 'PLAY THIS TRACK',
        extra: cur.kind === 'Grammar' ? cur.grammar : 'Track ' + cur.track,
        who: cur.who || 'Not set', hasSelf: !!cur.self, self: cur.self
      };
    } else v.cur = {};
    const finished = run.warmDone && (run.idx === -1 || !L.exercises.some(e => !e.skipped));
    v.midEmptyColor = finished ? '#138A6E' : '#FFB020';
    v.midEmptyTitle = finished ? 'All exercises done' : 'Start with the warm-up';
    v.midEmptyText = finished ? 'Well done. Now mark what you covered.' : 'Open your warm-up app first. The first exercise comes after.';
    v.midEmptyBtn = finished ? 'Go to After class' : 'Go to Lesson starts';
    v.midEmptyGo = () => this.go(finished ? 'after' : 'start');
    v.allDone = () => {
      this.upd(d => { const R = d.groups[g.id].draft.run, LL = d.groups[g.id].draft; if (!R.lessonStart) R.lessonStart = Date.now(); R.warmDone = true;
        LL.exercises.forEach(e => { if (!e.skipped && R.status[e.id] !== 'unfinished') R.status[e.id] = 'done'; }); R.idx = -1; R.pausedAt = null; }, { screen: 'mid' });
      this.toast('All exercises marked done. Tap any row to change one.');
    };
    v.exDone = () => this.upd(d => { const LL = d.groups[g.id].draft; LL.run.status[cur.id] = 'done'; this.advance(LL); LL.run.pausedAt = null; });
    // undo an accidental start
    v.isStarted = !!run.lessonStart;
    v.confirmResetStart = !!s.askResetStart; v.askResetStart = () => this.setState({ askResetStart: true }); v.keepStart = () => this.setState({ askResetStart: false });
    v.resetStart = () => { this.upd(d => { d.groups[g.id].draft.run = { lessonStart: null, warmDone: false, idx: null, status: {}, curStart: null }; }, { screen: 'plan', askResetStart: false }); this.toast('Lesson set back to "not started".'); };
    v.exUnfinished = () => {
      this.upd(d => { const gg = d.groups[g.id], LL = gg.draft; LL.run.status[cur.id] = 'unfinished'; LL.results[cur.id] = 'Part'; this.syncCarry(d, gg, LL, false); this.advance(LL); });
      this.toast(`Moved to the next ${this.gLabel(g)} lesson.`);
    };
  }

  // the whole lesson as full cards, like Mid-lesson, with no timers: for rehearsing
  readVals(v, db, s, g, L, gc) {
    const hd = this.heads(L);
    let t = this.tm(g.start) + 6, n = 0;
    v.readTitle = this.lTitle(L);
    v.readSub = `${this.gLabel(g)} · ${L.date ? 'taught ' + this.fmtS(this.D(L.date)) : L !== g.draft && L.forSlot != null ? this.fmtS(this.slotDate(g, L.forSlot)) : this.fmtS(gc.next)} · ${g.start}–${g.end}`;
    v.readCards = L.exercises.map((e, i) => {
      const k = this.kc(e.kind), m = this.em(e), at = this.hm(t);
      if (!e.skipped) { t += m; n += m; }
      return {
        key: e.id, head: hd[i], hasHead: !!hd[i], skipped: !!e.skipped,
        label: this.exLabel(e, i), kind: e.kind || 'Exercise', kc: e.skipped ? '#8E97B5' : k.c, kt: k.t,
        where: [e.page && `Page ${e.page}`, m ? `${m} min` : '', !e.skipped && `about ${at}`].filter(Boolean).join(' · '),
        note: e.note || this.exTitle(e),
        hasExtra: (e.kind === 'Grammar' && !!e.grammar) || (e.kind === 'Listening' && !!e.track),
        extraLabel: e.kind === 'Grammar' ? 'EXPLAIN THIS GRAMMAR' : 'PLAY THIS TRACK', extra: e.kind === 'Grammar' ? e.grammar : 'Track ' + e.track,
        who: e.who || 'Not set', hasSelf: !!e.self, self: e.self,
        from: e.fromCarry ? `Carried over from ${this.uLabel(e.fromCarry.unit || '?')}` : '',
        onEdit: () => { this.setState({ screen: 'plan', sel: e.id }); window.scrollTo(0, 0); }
      };
    });
    v.readTotal = `${n} min + 5–7 min warm-up · ${L.exercises.filter(e => !e.skipped).length} exercises`;
    v.readEmpty = !L.exercises.length;
  }
  afterVals(v, db, s, g, L, gc) {
    const opt = (cur, setter) => ['Full', 'Part', 'None'].map(o => {
      const on = cur === o, col = { Full: '#138A6E', Part: '#C98A0B', None: '#D63A3A' }[o];
      return { label: o, bg: on ? col : '#EEF0F5', fg: on ? '#fff' : '#5A6482', weight: on ? 700 : 500, onClick: () => setter(o) };
    });
    const warmRes = L.results.warm || 'Full';
    const hd = this.heads(L);
    const rows = [{ label: 'Warm-up', sub: 'Warm-up app', opts: opt(warmRes, o => this.upd(d => { this.T(d.groups[g.id], s).results.warm = o; })), missed: false }];
    L.exercises.forEach((e, i) => {
      if (e.skipped) return;
      const r = this.res(L, e) || 'Full', dropped = !!L.drop[e.id];
      const set = o => this.upd(d => { const gg = d.groups[g.id], T = this.T(gg, s); T.results[e.id] = o; this.syncCarry(d, gg, T, false); });
      const setDrop = val => this.upd(d => { const gg = d.groups[g.id], T = this.T(gg, s); T.drop[e.id] = val; this.syncCarry(d, gg, T, false); });
      rows.push({
        head: hd[i], hasHead: !!hd[i], label: e.note || this.exTitle(e), sub: [`${i + 1} · ${e.kind || 'Exercise'}`, e.page && `Page ${e.page}`].filter(Boolean).join(' · '),
        opts: opt(r, set), missed: r === 'Part' || r === 'None',
        missText: r === 'Part' ? 'Missed: part of it' : 'Missed: whole exercise',
        missBg: dropped ? '#E8EBF3' : '#FFF1C7',
        carryBg: dropped ? '#fff' : '#14213D', carryFg: dropped ? '#14213D' : '#fff',
        dropBg: dropped ? '#5A6482' : '#fff', dropFg: dropped ? '#fff' : '#3A4566',
        onCarry: () => setDrop(false), onDrop: () => setDrop(true)
      });
    });
    v.resRows = rows;
    v.missedN = rows.filter(x => x.missed).length;
    v.allFull = () => this.upd(d => { const gg = d.groups[g.id], T = this.T(gg, s); T.exercises.forEach(e => { if (!e.skipped) T.results[e.id] = 'Full'; }); T.results.warm = 'Full'; T.drop = {}; this.syncCarry(d, gg, T, false); });
    // templates
    const ne = s.noteEdit;
    const card = (ti) => {
      const editing = ne && ne.ti === ti;
      const bits = this.K.TPL[ti].split(/(\[[^\]]+\])/).filter(Boolean);
      let bi = 0;
      const parts = bits.map(b => {
        if (!b.startsWith('[')) return { isText: true, isChip: false, isInput: false, text: b };
        const ph = b.slice(1, -1), my = bi++;
        if (!editing) return { isText: false, isChip: true, isInput: false, text: ph };
        const val = ne.vals[my] || '';
        return { isText: false, isChip: false, isInput: true, text: ph, val, size: Math.max(ph.length, val.length, 4) + 1,
          onChange: ev => { const vals = this.state.noteEdit.vals.slice(); vals[my] = ev.target.value; this.setState({ noteEdit: { ti, vals } }); } };
      });
      return {
        parts, editing, bg: editing ? '#fff' : '#F4F6FB', border: editing ? '#2F5BEA' : '#F4F6FB',
        onOpen: () => { if (!editing) this.setState({ noteEdit: { ti, vals: [] } }); },
        onCancel: ev => { ev.stopPropagation(); this.setState({ noteEdit: null }); },
        onSave: ev => {
          ev.stopPropagation(); let j = 0;
          const text = bits.map(b => b.startsWith('[') ? (ne.vals[j++] || b.slice(1, -1)) : b).join('').replace(/\s+/g, ' ').trim();
          this.upd(d => { this.T(d.groups[g.id], s).notes.push({ id: this.uid(), text, t: Date.now() }); }, { noteEdit: null });
          this.toast('Note saved for the next lesson.');
        }
      };
    };
    const list = [0, 1, 2, 3, 4, 5].map(card);
    if (ne && ne.ti >= 6) list.unshift(card(ne.ti));
    v.tplCards = list;
    v.customNote = s.customNote || '';
    v.onCustomNote = ev => this.setState({ customNote: ev.target.value });
    v.saveCustomNote = () => {
      const text = (s.customNote || '').trim();
      if (!text) { this.toast('Type your note first.'); return; }
      this.upd(d => { this.T(d.groups[g.id], s).notes.push({ id: this.uid(), text, t: Date.now() }); }, { customNote: '' });
      this.toast('Note saved for the next lesson.');
    };
    v.moreTpl = this.K.MORE.map((label, i) => ({ label, border: ne && ne.ti === i + 6 ? '#2F5BEA' : '#C9CFDE', onClick: () => this.setState({ noteEdit: { ti: i + 6, vals: [] } }) }));
    // next lesson panel
    let nd = this.add(gc.next, 1);
    while (!this.isType(nd, g.dayType) || g.noClass.includes(this.iso(nd))) nd = this.add(nd, 1);
    v.nextLessonLabel = `${this.gLabel(g)} · ${g.dayType} days · ${g.start} · ${this.fmtS(nd)}`;
    const items = db.carry.filter(k => k.lessonId === L.id).map(k => ({ head: `Carried over from ${this.uLabel(L.unit || '?')}${L.name ? ' · ' + L.name : ''}`, text: `${this.exShort(k.ex)} (${k.mark === 'Part' ? 'part done' : 'not done'})`, canDel: false }));
    L.notes.forEach(n => items.push({ head: 'Note to self', text: n.text, canDel: true, onDel: () => this.upd(d => { const a = this.T(d.groups[g.id], s).notes; const j = a.findIndex(x => x.id === n.id); if (j >= 0) a.splice(j, 1); }) }));
    v.nlItems = items; v.nlEmpty = !items.length;
    const cd = s.closeDay && s.closeDay.gid === g.id && this.dayOptions(g, null).includes(s.closeDay.date) ? s.closeDay.date : this.suggestDay(g);
    v.closeDays = this.dayOptions(g, null).map(id => ({ id, label: this.dayLabel(id), sel: id === cd }));
    v.onCloseDay = e => this.setState({ closeDay: { gid: g.id, date: e.target.value } });
    this.tgVals(v, g, L, s);
    v.closeLesson = () => { this.closeLesson(cd); this.setState({ closeDay: null }); };
    const isTaught = L !== g.draft && !!L.date, isAhead = L !== g.draft && !L.date;
    v.canClose = L === g.draft; v.afterDateLabel = L.date ? this.fmtS(this.D(L.date)) : ''; v.afterTaught = isTaught; v.afterAhead = isAhead;
    v.afterDays = isTaught ? this.dayOptions(g, L.date).map(id => ({ id, label: this.dayLabel(id), sel: id === L.date })) : [];
    v.onAfterDay = e => { const val = e.target.value; this.upd(d => { const gg = d.groups[g.id], T = this.T(gg, s); const te = gg.taught.find(t => t.lessonId === T.id); T.date = val; if (te) te.date = val; }); this.toast(`Moved to ${this.fmtS(this.D(val))}.`); };
    if (isTaught) v.nextLessonLabel = `${this.gLabel(g)} · ${g.dayType} days · ${g.start} · the lesson after ${this.fmtS(this.D(L.date))}`;
  }

  // one row per stage: Warm-up, Lead-in (the book's Warmer), then each run of same-kind exercises, then Cooler / Review
  cambRows(g, C) {
    const K = this.K;
    const AIM = { Listening: 'Develop listening for gist and specific information.', Vocabulary: 'Present and practise new vocabulary.', Speaking: 'Develop speaking fluency.', Reading: 'Develop reading for gist and detail.', Writing: 'Develop writing skills.', Other: '' };
    const kindOf = e => { const n = String(e.num).trim(); return /^(warmer|lead-?in)$/i.test(n) ? 'lead' : /^review/i.test(n) ? 'review' : /^cooler/i.test(n) ? 'cool' : e.kind || 'Other'; };
    const groups = [];
    C.exercises.filter(e => !e.skipped).forEach(e => { const k = kindOf(e), last = groups[groups.length - 1]; if (last && last.k === k) last.ex.push(e); else groups.push({ k, ex: [e] }); });
    const rows = [{ stage: 'Warm-up', time: '5-7', proc: 'Warm-up game from the app.', aim: 'Wake up the class. Review.', inter: 'GW' }];
    groups.forEach(({ k, ex }) => {
      const pages = [...new Set(ex.map(e => e.page).filter(Boolean))];
      const nums = ex.map(e => e.num).filter(n => /^\d+$/.test(String(n)));
      const where = [pages.length && `p. ${pages.join(', ')}`, nums.length && `ex. ${nums.length > 1 ? nums[0] + '-' + nums[nums.length - 1] : nums[0]}`].filter(Boolean).join(', ');
      const points = [...new Set(ex.map(e => e.grammar).filter(Boolean))];
      const stage = k === 'lead' ? 'Lead-in' : k === 'review' ? `Review${points.length ? ': ' + points.join(' / ') : ''}` : k === 'cool' ? 'Cooler' : k === 'Grammar' ? `Grammar${points.length ? ': ' + points.join(' / ') : ''}` : k;
      const mins = ex.reduce((a, e) => a + this.em(e), 0);
      const step = e => [e.note, e.kind === 'Listening' && e.track ? `Track ${e.track}.` : ''].filter(Boolean).join(' ');
      const proc = ex.length === 1 && ['lead', 'cool', 'review'].includes(k) ? step(ex[0]) : ex.map(e => step(e) && `Ex ${e.num}: ${step(e)}`).filter(Boolean).join('\n');
      const aim = k === 'lead' ? 'Engage Ss, set the context and activate the topic.' : k === 'review' ? `Review ${points.length ? points.join(' and ') : 'language from previous lessons'}.` : k === 'cool' ? 'Review the lesson and end on a positive note.' : k === 'Grammar' ? (points.length ? `Clarify and practise ${points.join(' and ')}.` : '') : AIM[k] || '';
      rows.push({ stage: stage + (where && !['lead', 'cool', 'review'].includes(k) ? ` (${where})` : ''), time: mins ? String(mins) : '', proc, aim, inter: [...new Set(ex.map(e => K.CW[e.who]).filter(Boolean))].join(', ') });
    });
    return rows;
  }
  // every lesson of a group that has exercises, taught or planned, with its date
  datedLessons(g) {
    const c = this.calc(g), out = [];
    g.history.filter(h => h.date && h.exercises.length).forEach(h => out.push({ L: h, date: h.date, taught: true }));
    if (g.draft && g.draft.exercises.length) out.push({ L: g.draft, date: this.iso(c.next), taught: false });
    (g.plans || []).filter(p => p.forSlot != null && p.exercises.length && (p.forSlot > c.done || p.extra))
      .forEach(p => out.push({ L: p, date: this.iso(p.extra ? this.extraDate(g, p) : this.slotDate(g, p.forSlot)), taught: false }));
    return out;
  }
  bulkVals(v, db, s) {
    const K = this.K, t = this.today(), mon = this.add(t, -((t.getDay() + 6) % 7)), b = s.bulk || {};
    const from = b.from || this.iso(mon), to = b.to || this.iso(this.add(mon, 5));
    const all = Object.values(db.groups).sort((x, y) => y.dayType.localeCompare(x.dayType) || x.start.localeCompare(y.start));
    const on = b.gids || all.map(x => x.id), wantT = b.taught !== false, wantP = b.planned !== false;
    const set = patch => this.setState({ bulk: Object.assign({ from, to, gids: on, taught: wantT, planned: wantP }, patch) });
    v.bulkFrom = from; v.bulkTo = to;
    v.onBulkFrom = e => e.target.value && set({ from: e.target.value });
    v.onBulkTo = e => e.target.value && set({ to: e.target.value });
    const chip = (label, sel, fn) => ({ label, box: sel ? '✓' : '', boxBg: sel ? '#14213D' : '#fff', border: sel ? '#14213D' : '#C9CFDE', onClick: fn });
    v.bulkGroups = all.map(x => chip(`${this.gLabel(x)} · ${x.dayType} · ${x.start}`, on.includes(x.id), () => set({ gids: on.includes(x.id) ? on.filter(id => id !== x.id) : on.concat(x.id) })));
    v.bulkAllGroups = () => set({ gids: on.length === all.length ? [] : all.map(x => x.id) });
    v.bulkAllLabel = on.length === all.length ? 'Untick all' : 'Tick all';
    v.bulkKinds = [chip('Taught lessons', wantT, () => set({ taught: !wantT })), chip('Planned lessons', wantP, () => set({ planned: !wantP }))];
    const list = [];
    all.filter(x => on.includes(x.id)).forEach(g => this.datedLessons(g).forEach(d => {
      if (d.date < from || d.date > to || (d.taught ? !wantT : !wantP)) return;
      list.push({ g, ...d });
    }));
    list.sort((a, b) => a.date.localeCompare(b.date) || a.g.start.localeCompare(b.g.start));
    const Y = '#FFF1B8';
    v.bulkPages = list.map(({ g, L, date, taught }) => {
      const lv = K.LV[g.level], dd = this.D(date);
      const aim = (key, label) => ({ label, text: L.aims[key] || '[missing]', bg: L.aims[key] ? 'transparent' : Y });
      return {
        key: g.id + L.id, teacher: db.teacher, level: `${lv.name}${g.is30 ? ' 30+' : ''} (${lv.cefr})`,
        date: dd.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
        tag: `${this.fmtS(dd)} · ${this.gLabel(g)} ${g.start} · ${this.lTitle(L)} · ${taught ? 'taught' : 'planned'}`,
        aimsL: [aim('main', 'Main aim'), aim('sub', 'Sub-aims'), aim('personal', 'Personal aim')],
        probs: [aim('prob1', ''), Object.assign(aim('prob2', ''), L.aims.prob2 ? {} : { text: '', bg: 'transparent' })],
        rows: this.cambRows(g, L).map(r => { const o = {}; ['stage', 'time', 'proc', 'aim', 'inter'].forEach(k => { o[k] = r[k] || '[missing]'; o[k + 'Bg'] = r[k] ? 'transparent' : Y; }); return o; })
      };
    });
    v.bulkCount = list.length ? `${list.length} lesson${list.length > 1 ? 's' : ''} · one page each` : 'No lessons in these dates';
    v.bulkNone = !list.length;
    v.bulkPrint = () => { if (!list.length) { this.toast('No lessons to print. Change the dates or groups.'); return; } window.print(); };
    v.bulkBack = () => this.go('camb');
  }
  cambVals(v, db, s, g, L, gc) {
    v.goBulk = () => this.go('cambAll');
    const K = this.K, lv = K.LV[g.level];
    const useLast = !s.editId && !L.exercises.length && g.history.length;
    const C = useLast ? g.history[g.history.length - 1] : L;
    const date = C.date ? this.D(C.date) : C.forSlot != null && C !== g.draft ? this.slotDate(g, C.forSlot) : gc.next;
    v.cambLevel = `${lv.name}${g.is30 ? ' 30+' : ''} (${lv.cefr})`;
    v.cambDate = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    v.cambSub = `${this.gLabel(g)} · ${this.fmtS(date)} · ${this.uLabel(C.unit || '?')}${C.name ? ' · ' + C.name : ''}. Built from your planner. Nothing to retype.`;
    const setAim = key => e => this.upd(d => { const gg = d.groups[g.id]; const T = gg.draft.id === C.id ? gg.draft : gg.history.find(h => h.id === C.id) || (gg.plans || []).find(h => h.id === C.id); T.aims[key] = e.target.value; });
    const f = (key, label, ph) => ({ label, ph, value: C.aims[key], bg: C.aims[key] ? 'transparent' : '#FFF1B8', onChange: setAim(key) });
    v.cambAimsL = [f('main', 'Main aim', '[By the end of the lesson, Ss will be able to…]'), f('sub', 'Sub-aims', '[Add sub-aims]'), f('personal', 'Personal aim', '[Add your personal aim]')];
    v.cambProbs = [f('prob1', '', '1. [Add a problem and solution]'), f('prob2', '', '2. [Add a second problem, or leave empty]')];
    const Y = '#FFF1B8', rows = this.cambRows(g, C);
    v.cambRows = rows.map(r => {
      const o = {};
      ['stage', 'time', 'proc', 'aim', 'inter'].forEach(k => { o[k] = r[k] || '[missing]'; o[k + 'Bg'] = r[k] ? 'transparent' : Y; });
      return o;
    });
    v.cambNoEx = !C.exercises.length;
    v.legend = [
      { a: 'Your exercises', b: 'Grouped into stages: Warm-up, Review, Lead-in (Warmer), each part of the lesson, Cooler. Time is the stage total.' },
      { a: 'Who does it', b: 'Interaction column. On their own = Individual, All together = Frontal, In pairs = PW' },
      { a: 'Short notes', b: 'Procedure column, one line per exercise. Notes to self stay private.' },
      { a: 'Exercise kind', b: 'Aim of stage, written for you' },
      { a: 'Aims and problems', b: 'Typed here or on the Plan screen. Both stay the same.' }
    ];
    v.printPdf = () => window.print();
    v.copyTable = () => {
      const tsv = [['Stage', 'Time', 'Procedure', 'Aim of stage', 'Interaction'], ...rows.map(r => [r.stage, r.time, r.proc.replace(/\n/g, ' / '), r.aim, r.inter])].map(r => r.join('\t')).join('\n');
      const done = () => this.toast('Table copied. Paste it into the Cambridge document.');
      if (navigator.clipboard) navigator.clipboard.writeText(tsv).then(done, () => this.toast('Could not copy. Select the table and copy by hand.'));
      else done();
    };
  }
}

// ---------- templates (one per screen, matching the design) ----------
const BTN_DEL = 'border:1.5px solid #D63A3A;background:#fff;color:#B02A33;font-weight:700;cursor:pointer';

function tSidebarMini(v) {
  return `<aside data-noprint="1" class="fx-side" style="flex:none;width:64px;background:#14213D;color:#fff;position:sticky;top:0;height:100vh;padding:16px 8px;display:flex;flex-direction:column;align-items:center;gap:10px">
  <button${click(v.toggleSide)} title="Open the menu" class="hov-side" style="border:none;background:transparent;color:#fff;font-size:22px;width:44px;height:44px;border-radius:10px;cursor:pointer">☰</button>
  <button${click(v.setOdd)} title="Odd days" style="border:1px solid ${esc(v.oddBorder)};background:${esc(v.oddBg)};color:${esc(v.oddFg)};width:44px;height:36px;border-radius:9px;cursor:pointer;font-weight:700;font-size:13px">Odd</button>
  <button${click(v.setEven)} title="Even days" style="border:1px solid ${esc(v.evenBorder)};background:${esc(v.evenBg)};color:${esc(v.evenFg)};width:44px;height:36px;border-radius:9px;cursor:pointer;font-weight:700;font-size:13px">Even</button>
  <span style="height:6px"></span>
  ${FOR(v.navItems, n => `<button${click(n.onClick)} title="${esc(n.label)}" class="hov-nav" style="border:none;background:${esc(n.bg)};width:44px;height:44px;border-radius:10px;cursor:pointer;font-size:19px">${n.icon}</button>`)}
  <button${click(v.goSync)} title="${esc(v.syncLine)}" style="margin-top:auto;border:none;background:transparent;cursor:pointer;width:44px;height:30px;display:grid;place-items:center"><span class="${v.syncDotCls}" style="width:10px;height:10px;border-radius:50%;background:${esc(v.syncDot)}"></span></button>
</aside>`;
}

function tSidebar(v) {
  if (v.sideMini) return tSidebarMini(v);
  return `<aside data-noprint="1" class="fx-side" style="flex:none;width:232px;background:#14213D;color:#fff;position:sticky;top:0;height:100vh;overflow-y:auto;padding:28px 20px 20px;display:flex;flex-direction:column;gap:28px">
  <div style="display:flex;flex-direction:column;gap:6px">
    <div style="display:flex;align-items:flex-start;gap:8px"><span style="flex:1;font-family:'Bricolage Grotesque';font-size:24px;font-weight:700;line-height:1.1;letter-spacing:-0.01em">Lesson Plan Builder</span><button${click(v.toggleSide)} title="Fold the menu" class="hov-side" style="flex:none;border:none;background:transparent;color:#B8C0D8;font-size:18px;width:32px;height:32px;border-radius:8px;cursor:pointer">«</button></div>
    <span style="font-size:13px;color:#B8C0D8">Cambridge Learning Centre</span>
    <span style="font-family:'DM Mono';font-size:14px;color:#FFB020;margin-top:6px">${esc(v.sideClock)}</span>
    <button${click(v.goSync)} style="align-self:flex-start;border:none;background:transparent;color:#D5DAEA;font-size:12.5px;padding:2px 0;cursor:pointer;display:flex;align-items:center;gap:7px;text-align:left"><span class="${v.syncDotCls}" style="flex:none;width:8px;height:8px;border-radius:50%;background:${esc(v.syncDot)}"></span>${esc(v.syncLine)}</button>
  </div>
  <div style="display:flex;flex-direction:column;gap:8px">
    <button${click(v.setOdd)} style="text-align:left;border:1px solid ${esc(v.oddBorder)};background:${esc(v.oddBg)};color:${esc(v.oddFg)};border-radius:10px;padding:10px 14px;cursor:pointer;display:flex;flex-direction:column;gap:2px">
      <span style="font-weight:700;font-size:15px">Odd days</span><span style="font-size:12px;opacity:0.85">Mon · Wed · Fri</span>
    </button>
    <button${click(v.setEven)} style="text-align:left;border:1px solid ${esc(v.evenBorder)};background:${esc(v.evenBg)};color:${esc(v.evenFg)};border-radius:10px;padding:10px 14px;cursor:pointer;display:flex;flex-direction:column;gap:2px">
      <span style="font-weight:700;font-size:15px">Even days</span><span style="font-size:12px;opacity:0.85">Tue · Thu · Sat</span>
    </button>
  </div>
  <nav style="display:flex;flex-direction:column;gap:4px">
    ${FOR(v.navItems, n => `<button${click(n.onClick)} class="hov-nav" style="text-align:left;border:none;background:${esc(n.bg)};color:#fff;font-weight:${n.weight};font-size:16px;padding:11px 12px;border-radius:8px;cursor:pointer;display:flex;gap:10px;align-items:center"><span style="width:22px;text-align:center">${n.icon}</span>${esc(n.label)}</button>`)}
  </nav>
  <div style="margin-top:auto;display:flex;flex-direction:column;gap:10px;font-size:12.5px;color:#B8C0D8;line-height:1.45">
    <div style="display:flex;flex-direction:column;gap:6px">
      <span style="font-weight:700;color:#fff;font-size:13px">Your lessons are saved in this browser.</span>
      <button${click(v.toggleRemind)} class="hov-side" style="text-align:left;border:1px solid ${v.remindOn ? '#FFB020' : '#3A4A72'};background:transparent;color:#fff;font-weight:600;font-size:13.5px;padding:8px 12px;border-radius:8px;cursor:pointer">${v.remindOn ? '🔔 Class reminders: on' : '🔕 Class reminders: off'}</button>
      <button${click(v.downloadBackup)} class="hov-side" style="text-align:left;border:1px solid #3A4A72;background:transparent;color:#fff;font-weight:600;font-size:13.5px;padding:8px 12px;border-radius:8px;cursor:pointer">Download backup</button>
      <button${click(v.restoreBackup)} class="hov-side" style="text-align:left;border:1px solid #3A4A72;background:transparent;color:#fff;font-weight:600;font-size:13.5px;padding:8px 12px;border-radius:8px;cursor:pointer">Restore backup</button>
      ${IF(v.hasRestore, () => `<div style="background:#FFE3E0;color:#14213D;border-radius:10px;padding:10px 12px;display:flex;flex-direction:column;gap:8px">
        <span style="font-weight:700;font-size:13.5px">Replace everything with this backup?</span>
        <span style="font-size:12px;color:#8A2A2A">${esc(v.restoreName)}. Your current lessons will be replaced.</span>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <button${click(v.restoreYes)} style="border:none;background:#D63A3A;color:#fff;font-weight:700;font-size:12.5px;padding:7px 10px;border-radius:7px;cursor:pointer">Yes, restore</button>
          <button${click(v.restoreNo)} style="border:1.5px solid #8E97B5;background:#fff;font-weight:700;font-size:12.5px;padding:6px 10px;border-radius:7px;cursor:pointer">Keep current</button>
        </div>
      </div>`)}
    </div>
    <span>Course started Tue 6 Oct (even days) and Wed 7 Oct (odd days).</span>
    <span style="font-family:'DM Mono';font-size:11.5px;color:#8E97B5">Version: 26 Oct c</span>
    <button${click(v.askReset)} style="align-self:flex-start;border:none;background:transparent;color:#8E97B5;font-size:12px;padding:0;cursor:pointer;text-decoration:underline">${esc(v.resetLabel)}</button>
  </div>
</aside>`;
}

function tJump(v) {
  return `<div data-noprint="1" class="m-jump" style="background:#fff;border-bottom:1px solid #E2E6F0;padding:8px 32px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
  <button${click(v.goWeek)} style="border:none;background:#F2F4FA;color:#14213D;font-weight:700;font-size:14px;padding:8px 14px;border-radius:8px;cursor:pointer">← Week</button>
  <span style="font-family:'DM Mono';font-size:14px;color:#3A4566;padding:0 6px">${esc(v.sideClock)}</span>
  <button${click(v.goSync)} style="border:none;background:transparent;color:#5A6482;font-size:13px;padding:4px 6px;cursor:pointer;display:flex;align-items:center;gap:6px"><span style="flex:none;width:8px;height:8px;border-radius:50%;background:${esc(v.syncDot)}"></span>${esc(v.syncLine)}</button>
  <span style="width:1px;height:22px;background:#E2E6F0;margin:0 6px"></span>
  <label style="display:flex;align-items:center;gap:6px;font-size:13px;font-weight:700;color:#3A4566">Lesson<select${input(v.onLessonSel)}${v.lessonSelLocked ? ' disabled title="Lesson starts and Mid-lesson always run the next lesson"' : ''} style="max-width:340px;height:36px;border:1.5px solid #14213D;border-radius:8px;padding:0 8px;font-size:13.5px;font-weight:700;background:${esc(v.lessonSelBg)};color:#14213D;cursor:pointer">${FOR(v.lessonOpts, o => `<option value="${esc(o.id)}"${o.sel ? ' selected' : ''}>${esc(o.label)}</option>`)}</select></label>
  <span style="width:1px;height:22px;background:#E2E6F0;margin:0 6px"></span>
  ${FOR(v.jumpSteps, j => `<button${click(j.onClick)} style="border:none;background:${esc(j.bg)};color:${esc(j.fg)};font-weight:600;font-size:14px;padding:8px 12px;border-radius:8px;cursor:pointer;display:flex;gap:6px;align-items:center"><span style="font-family:'DM Mono';opacity:0.6">${j.num}</span>${esc(j.label)}</button>`)}
</div>`;
}

const tTgDue = (c, small) => IF(c.hasTgDue, () => `<div${click(c.stop)} class="fx-in" style="background:#E3F4FD;border:1.5px solid #2AABEE;border-radius:12px;padding:${small ? '8px 10px' : '10px 12px'};display:flex;flex-direction:column;gap:8px;cursor:default">
  <span style="font-size:${small ? 13 : 14}px;font-weight:600;color:#0B5568">✈ ${esc(c.tgHead)}</span>
  ${c.tgOpen ? `${c.tgBasic ? `<span style="font-size:12.5px;color:#5A6482">Basic message built from the plan. Edit it here if needed.</span>` : ''}${c.tgWarn ? `<span style="background:#FFF1C7;border-radius:8px;padding:6px 9px;font-size:12.5px;font-weight:600;color:#6B4E00">${esc(c.tgWarn)}</span>` : ''}
  <textarea data-autogrow="1"${input(c.onTgEdit)} rows="8" style="border:1.5px solid #9CCFEA;border-radius:10px;padding:10px 12px;font-size:13.5px;line-height:1.45;resize:vertical;max-height:420px;overflow:auto;background:#fff;font-family:'DM Sans',system-ui,sans-serif">${esc(c.tgText)}</textarea>` : ''}
  <div style="display:flex;gap:6px;flex-wrap:wrap">
    <button${click(c.onTgToggle)} style="border:1.5px solid #14213D;background:#fff;font-weight:700;font-size:13px;padding:6px 10px;border-radius:8px;cursor:pointer">${c.tgOpen ? 'Hide message' : 'Preview & edit'}</button>
    ${c.tgCanSend ? `<button${click(c.onTgSend)} style="border:none;background:${esc(c.tgSendBg)};color:#fff;font-weight:700;font-size:13px;padding:7px 10px;border-radius:8px;cursor:pointer">${esc(c.tgSendLabel)}</button>`
      : `<button${click(c.onTgCopy)} style="border:none;background:#2AABEE;color:#fff;font-weight:700;font-size:13px;padding:7px 10px;border-radius:8px;cursor:pointer">Copy message</button>`}
    <button${click(c.onTgDone)} style="border:1.5px solid #C9CFDE;background:#fff;color:#3A4566;font-weight:600;font-size:13px;padding:6px 10px;border-radius:8px;cursor:pointer">I sent it myself</button>
    <button${click(c.onTgSkip)} style="border:none;background:transparent;color:#5A6482;font-size:12.5px;text-decoration:underline;cursor:pointer">No message</button>
  </div>
</div>`);
const tUnclosed = (c, small) => IF(c.hasUnclosed, () => `<div class="fx-in" style="background:#FFF1C7;border:1.5px solid #E9B949;border-radius:12px;padding:${small ? '8px 10px' : '10px 12px'};display:flex;flex-direction:column;gap:8px;cursor:default">
  <span style="font-size:${small ? 13 : 14}px;font-weight:600;color:#6B4E00">${esc(c.unclosedText)}</span>
  <div style="display:flex;gap:6px;flex-wrap:wrap">
    ${IF(c.canAsPlanned, () => `<button${click(c.onAsPlanned)} style="border:none;background:#138A6E;color:#fff;font-weight:700;font-size:13px;padding:7px 10px;border-radius:8px;cursor:pointer">${esc(c.asPlannedBtn)}</button>`)}
    <button${click(c.onSomeMissed)} style="border:1.5px solid #14213D;background:#fff;font-weight:700;font-size:13px;padding:6px 10px;border-radius:8px;cursor:pointer">Some not finished</button>
    <button${click(c.onNoClass)} style="border:1.5px solid #C9CFDE;background:#fff;color:#3A4566;font-weight:600;font-size:13px;padding:6px 10px;border-radius:8px;cursor:pointer">No class that day</button>
  </div>
</div>`);

function tWeek(v) {
  const tag30 = (c, fs, pad) => IF(c.is30, () => `<span style="background:${esc(c.dark)};color:#fff;font-family:'DM Mono';font-size:${fs};font-weight:500;padding:${pad};border-radius:999px">30+</span>`);
  return `<main data-screen-label="01 Week home" class="m-main" style="padding:36px 40px 56px;display:flex;flex-direction:column;gap:24px;max-width:1240px">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:20px;flex-wrap:wrap">
    <div style="display:flex;flex-direction:column;gap:6px">
      <span style="font-family:'DM Mono';font-size:13px;letter-spacing:0.12em;color:#5A6482">${esc(v.weekKicker)}</span>
      <div style="display:flex;align-items:baseline;gap:18px;flex-wrap:wrap">
        <h1 style="margin:0;font-family:'Bricolage Grotesque';font-size:44px;font-weight:700;letter-spacing:-0.02em;line-height:1.05">${esc(v.todayLong)}</h1>
        <span style="font-family:'DM Mono';font-size:36px;font-weight:500;color:#3A4566">${esc(v.clockNow)}</span>
      </div>
    </div>
    <div style="background:${esc(v.statusBg)};color:${esc(v.statusFg)};border-radius:12px;padding:12px 16px;display:flex;flex-direction:column;gap:2px">
      <span style="font-weight:700;font-size:15px">${esc(v.statusTitle)}</span>
      <span style="font-size:14px">${esc(v.statusSub)}</span>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(280px,100%),1fr));gap:20px">
    ${FOR(v.bigCards, c => `<div${click(c.onOpen)} class="hov-card" style="background:#fff;border:1px solid #E2E6F0;border-radius:18px;overflow:hidden;cursor:pointer;display:flex;flex-direction:column">
        <div style="background:${esc(c.tint)};padding:16px 18px 14px;display:flex;flex-direction:column;gap:4px">
          <span style="font-family:'DM Mono';font-size:15px;font-weight:500">${esc(c.time)}</span>
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-family:'Bricolage Grotesque';font-size:24px;font-weight:700">${esc(c.level)}</span>
            ${tag30(c, '14px', '3px 9px')}
          </div>
        </div>
        <div style="padding:16px 18px 18px;display:flex;flex-direction:column;gap:12px;flex:1">
          ${tUnclosed(c, false)}
          <div style="display:flex;flex-direction:column;gap:2px">
            <span style="font-size:14px;color:#5A6482">Next lesson · ${esc(c.date)}</span>
            <span style="font-family:'Bricolage Grotesque';font-size:30px;font-weight:700;letter-spacing:-0.01em">${esc(c.unit)}</span>
            <span style="font-size:15px;color:#3A4566">${esc(c.desc)}</span>
          </div>
          ${tTgDue(c, false)}
          <div style="background:${esc(c.todayBg)};border:2px solid ${esc(c.todayBorder)};border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:5px">
            <span style="align-self:flex-start;background:${esc(c.todayKbg)};color:${esc(c.todayKfg)};font-family:'DM Mono';font-size:11.5px;font-weight:500;letter-spacing:0.1em;padding:3px 9px;border-radius:999px">${esc(c.todayKicker)}</span>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><span style="font-size:14px;color:#3A4566">${esc(c.todayHead)}</span><b style="font-size:${c.isTodayClass ? 19 : 16}px">${esc(c.todayVal)}</b>${IF(c.hasTodayTag, () => `<span style="margin-left:auto;background:${esc(c.todayTagBg)};color:${esc(c.todayTagFg)};font-weight:700;font-size:12px;padding:3px 9px;border-radius:999px">${esc(c.todayTag)}</span>`)}</div>
          </div>
          <div style="background:#F4F6FB;border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:7px">
            ${IF(c.hasNl, () => `
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><span style="font-family:'DM Mono';font-size:11.5px;letter-spacing:0.08em;color:#5A6482">UPCOMING</span><span style="font-size:14px;color:#3A4566">Next lesson:</span><b style="font-size:16px">${esc(c.nlLabel)}</b><span style="font-size:13px;color:#5A6482">${esc(c.nlSub)}</span><span style="margin-left:auto;background:${esc(c.nlTagBg)};color:${esc(c.nlTagFg)};font-weight:700;font-size:12px;padding:3px 9px;border-radius:999px">${esc(c.nlTag)}</span></div>`)}
            <div style="border:1.5px dashed #9AA1B6;border-radius:10px;padding:8px 10px;display:flex;flex-direction:column;gap:6px;background:#fff">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><span style="font-family:'DM Mono';font-size:11.5px;letter-spacing:0.08em;color:#8A4B00">TO PREPARE</span><span style="font-size:14px;color:#3A4566">Next LP to be prepared:</span><b style="font-size:16px">${esc(c.prepVal)}</b></div>
            ${IF(c.hasPrep, () => `<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><span style="font-size:13px;color:#5A6482">${esc(c.prepSub)}</span><button${click(c.onPrepare)} style="margin-left:auto;border:1.5px solid #14213D;background:#fff;font-weight:700;font-size:13px;padding:5px 10px;border-radius:8px;cursor:pointer">${esc(c.prepBtn)}</button></div>`)}
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:6px">
            <div style="display:flex;justify-content:space-between;font-size:14px"><span style="color:#5A6482">Roadmap</span><span style="font-weight:700">${esc(c.progress)}</span></div>
            <div style="height:8px;background:#E6E9F2;border-radius:999px;overflow:hidden"><div style="height:100%;width:${esc(c.pct)};background:${esc(c.color)};border-radius:999px"></div></div>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <span style="background:${esc(c.pillBg)};color:${esc(c.pillFg)};font-weight:700;font-size:14px;padding:5px 11px;border-radius:999px">${esc(c.pill)}</span>
            <span style="background:${esc(c.carryBg)};color:${esc(c.carryFg)};font-weight:600;font-size:14px;padding:5px 11px;border-radius:999px">${esc(c.carry)}</span>
          </div>
          ${IF(c.ahead, () => `<span style="background:#DDF1F7;color:#0B5568;border-radius:10px;padding:9px 12px;font-size:14px;font-weight:600">${esc(c.aheadText)}</span>`)}
          ${IF(c.hasPlan, () => `<span style="font-size:14px;color:#5A6482">${esc(c.planText)}</span>`)}
          <button style="margin-top:auto;border:none;background:#FFB020;color:#14213D;font-weight:700;font-size:16px;padding:12px;border-radius:10px;cursor:pointer">${esc(c.btn)}</button>
        </div>
      </div>`)}
  </div>
  <span style="font-family:'DM Mono';font-size:13px;letter-spacing:0.12em;color:#5A6482;margin-top:8px">${esc(v.otherKicker)}</span>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(210px,100%),1fr));gap:14px">
    ${FOR(v.smallCards, c => `<div${click(c.onOpen)} class="hov-small" style="background:#fff;border:1px solid #E2E6F0;border-top:5px solid ${esc(c.color)};border-radius:14px;padding:14px 16px;display:flex;flex-direction:column;gap:4px;cursor:pointer">
        <span style="font-family:'DM Mono';font-size:13px">${esc(c.time)}</span>
        <div style="display:flex;align-items:center;gap:6px"><span style="font-weight:700;font-size:17px">${esc(c.level)}</span>${IF(c.is30, () => `<span style="background:${esc(c.dark)};color:#fff;font-family:'DM Mono';font-size:12px;padding:2px 7px;border-radius:999px">30+</span>`)}</div>
        ${tUnclosed(c, true)}
        ${tTgDue(c, true)}
        <span style="font-size:14px;${c.isTodayClass ? `background:${esc(c.todayBg)};border-left:4px solid ${esc(c.todayBorder)};padding:4px 8px;border-radius:6px;font-weight:600` : ''}">${c.isTodayClass ? '<b>TODAY</b> · ' : ''}${esc(c.todayHead)} <b>${esc(c.todayVal)}</b></span>
        ${IF(c.hasNl, () => `<span style="font-size:14px">Next lesson: <b>${esc(c.nlLabel)}</b> · ${esc(c.nlSub)}</span>`)}
        <span style="font-size:14px">Next LP to be prepared: <b>${esc(c.prepVal)}</b></span>
        <span style="font-size:14px;font-weight:700;color:${esc(c.pillFg)}">${esc(c.pill)} · ${esc(c.progressShort)}</span>
        ${IF(c.hasSkipNote, () => `<span style="font-size:13px;color:#5A6482">${esc(c.skipNote)}</span>`)}
        ${IF(c.hasCarry, () => `<span style="font-size:13px;color:#B5530A;font-weight:600">${esc(c.carry)}</span>`)}
      </div>`)}
  </div>
</main>`;
}

function tRoadmap(v) {
  return `<main data-screen-label="Roadmap" style="padding:36px 40px 56px;display:flex;flex-direction:column;gap:22px;max-width:1240px">
  <div style="display:flex;flex-direction:column;gap:6px">
    <span style="font-family:'DM Mono';font-size:13px;letter-spacing:0.12em;color:#5A6482">ROADMAP</span>
    <h1 style="margin:0;font-family:'Bricolage Grotesque';font-size:40px;font-weight:700;letter-spacing:-0.02em">${esc(v.rm.title)}</h1>
  </div>
  <div style="display:flex;gap:8px;flex-wrap:wrap">
    ${FOR(v.rmChips, ch => `<button${click(ch.onClick)} style="border:2px solid ${esc(ch.border)};background:${esc(ch.bg)};color:#14213D;font-weight:600;font-size:14px;padding:8px 12px;border-radius:10px;cursor:pointer">${esc(ch.label)}</button>`)}
  </div>
  <div style="background:${esc(v.rm.pillBg)};color:${esc(v.rm.pillFg)};border-radius:14px;padding:14px 18px;display:flex;flex-direction:column;gap:2px">
    <span style="font-weight:700;font-size:18px">${esc(v.rm.pill)} · ${esc(v.rm.progress)}</span>
    <span style="font-size:15px">${esc(v.rm.explain)}</span>
  </div>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(112px,100%),1fr));gap:10px">
    ${FOR(v.rmUnits, u => `<div style="background:${esc(u.bg)};border:2px ${esc(u.borderStyle)} ${esc(u.border)};border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:2px;color:${esc(u.fg)}">
        <span style="font-weight:700;font-size:16px">${esc(u.label)}</span>
        <span style="font-family:'DM Mono';font-size:13px">${esc(u.secs)}</span>
        <span style="font-size:12px;font-weight:700;margin-top:4px">${esc(u.state)}</span>
      </div>`)}
  </div>
  <div style="background:#fff;border:1px solid #E2E6F0;border-radius:18px;padding:20px 22px;display:flex;flex-direction:column;gap:6px">
    <span style="font-family:'Bricolage Grotesque';font-size:22px;font-weight:700">Class days</span>
    <span style="font-size:14px;color:#5A6482;margin-bottom:8px">Mark a day “No class” and it does not count. The next lesson moves to the next class day.</span>
    ${FOR(v.rmDays, d => `<div style="display:flex;align-items:center;gap:14px;padding:9px 0;border-top:1px solid #EEF0F5">
        <span style="font-family:'DM Mono';font-size:14px;width:110px">${esc(d.date)}</span>
        <span style="flex:1;font-size:15px;color:${esc(d.fg)};font-weight:${d.weight}">${esc(d.label)}</span>
        ${IF(d.canToggle, () => `<button${click(d.onToggle)} style="border:1px solid #C9CFDE;background:#fff;font-size:13px;font-weight:600;padding:6px 12px;border-radius:8px;cursor:pointer">${esc(d.btn)}</button>`)}
      </div>`)}
  </div>
</main>`;
}

function tCarry(v) {
  return `<main data-screen-label="Carry-over" style="padding:36px 40px 56px;display:flex;flex-direction:column;gap:20px;max-width:1000px">
  <div style="display:flex;flex-direction:column;gap:6px">
    <span style="font-family:'DM Mono';font-size:13px;letter-spacing:0.12em;color:#5A6482">CARRY-OVER</span>
    <h1 style="margin:0;font-family:'Bricolage Grotesque';font-size:40px;font-weight:700;letter-spacing:-0.02em">Not covered yet</h1>
    <span style="font-size:15px;color:#5A6482">Each group keeps its own list. Items stay until you add them to a lesson or delete them.</span>
  </div>
  ${FOR(v.carryGroups, cg => `<div style="background:#fff;border:1px solid #E2E6F0;border-left:6px solid ${esc(cg.color)};border-radius:14px;padding:16px 18px;display:flex;flex-direction:column;gap:10px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
        <span style="font-weight:700;font-size:17px">${esc(cg.label)}</span>
        <button${click(cg.onOpen)} style="border:none;background:#F2F4FA;font-weight:600;font-size:13px;padding:6px 10px;border-radius:8px;cursor:pointer">Open lesson start</button>
      </div>
      ${IF(cg.empty, () => `<span style="font-size:14px;color:#5A6482">Nothing carried over</span>`)}
      ${FOR(cg.items, ci => `<div style="display:flex;flex-direction:column;gap:8px">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;background:#FFF5EC;border-radius:10px;padding:10px 12px">
            <div style="flex:1;min-width:220px;display:flex;flex-direction:column;gap:2px"><span style="font-size:15px">${esc(ci.title)}</span><span style="font-size:12.5px;font-weight:700;color:#9A4A0A">${esc(ci.from)}</span></div>
            <button${click(ci.onDelete)} style="border:1px solid #D63A3A;background:#fff;color:#B02A33;font-weight:700;font-size:13px;padding:6px 12px;border-radius:8px;cursor:pointer">Delete</button>
          </div>
          ${IF(ci.confirming, () => `<div style="background:#FFE3E0;border:1px solid #D63A3A;border-radius:10px;padding:10px 14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">
              <div style="flex:1;display:flex;flex-direction:column"><span style="font-weight:700;font-size:15px">Delete "${esc(ci.short)}"?</span><span style="font-size:12.5px;color:#8A2A2A">It will not carry over again.</span></div>
              <button${click(ci.onYes)} style="border:none;background:#D63A3A;color:#fff;font-weight:700;font-size:13px;padding:8px 12px;border-radius:8px;cursor:pointer">Yes, delete</button>
              <button${click(ci.onKeep)} style="border:1px solid #8E97B5;background:#fff;font-weight:700;font-size:13px;padding:7px 12px;border-radius:8px;cursor:pointer">Keep it</button>
            </div>`)}
        </div>`)}
    </div>`)}
</main>`;
}

function tNotes(v) {
  return `<main data-screen-label="Notes" style="padding:36px 40px 56px;display:flex;flex-direction:column;gap:20px;max-width:1000px">
  <div style="display:flex;flex-direction:column;gap:6px">
    <span style="font-family:'DM Mono';font-size:13px;letter-spacing:0.12em;color:#5A6482">NOTES</span>
    <h1 style="margin:0;font-family:'Bricolage Grotesque';font-size:40px;font-weight:700;letter-spacing:-0.02em">Notes to self</h1>
    <span style="font-size:15px;color:#5A6482">Written after class. Newest first.</span>
  </div>
  ${IF(v.noNotes, () => `<div style="background:#fff;border:1px solid #E2E6F0;border-radius:14px;padding:20px;font-size:16px;color:#5A6482">No notes yet. Add them on the After class screen.</div>`)}
  ${FOR(v.allNotes, nt => `<div style="background:#fff;border:1px solid #E2E6F0;border-left:6px solid ${esc(nt.color)};border-radius:14px;padding:14px 18px;display:flex;flex-direction:column;gap:4px">
      <span style="font-size:13px;font-weight:700;color:#5A6482">${esc(nt.meta)}</span>
      <span style="font-size:17px">${esc(nt.text)}</span>
    </div>`)}
</main>`;
}

function tPlan(v) {
  const se = v.se;
  return `<div data-screen-label="02 Plan the lesson" style="display:flex;flex-direction:column">
  <div class="m-pad" style="background:#14213D;color:#fff;padding:14px 32px;display:flex;align-items:center;gap:18px;flex-wrap:wrap">
    <span style="font-family:'Bricolage Grotesque';font-size:26px;font-weight:700">Plan the lesson</span>
    <span style="background:${esc(v.lvTint)};color:#14213D;font-weight:700;font-size:14px;padding:5px 12px;border-radius:999px">${esc(v.lvName)}</span>
    <span style="font-size:15px;color:#D5DAEA">${esc(v.dayLabel)} · ${esc(v.dateText)} · ${esc(v.startTime)}</span>
    <label style="display:flex;align-items:center;gap:8px;font-size:15px;color:#D5DAEA">Unit<input value="${esc(v.unit)}"${input(v.onUnit)} style="width:66px;height:38px;border:none;border-radius:8px;text-align:center;font-weight:700;font-size:17px;background:#fff;color:#14213D"></label>
    <label style="display:flex;align-items:center;gap:8px;font-size:15px;color:#D5DAEA;flex:1;min-width:240px">Lesson name<input value="${esc(v.lname)}"${input(v.onName)} placeholder="Type the lesson name" style="flex:1;min-width:140px;max-width:280px;height:38px;border:none;border-radius:8px;padding:0 12px;font-size:16px;background:#fff;color:#14213D"></label>
    <span style="font-family:'DM Mono';font-size:16px;font-weight:500;margin-left:auto">${esc(v.minText)} <span style="color:${esc(v.minFreeColor)};font-family:'DM Sans';font-weight:700;font-size:15px">· ${esc(v.minFree)}</span></span>
  </div>
  ${IF(v.hasWarn, () => `<div style="background:#FFEBA8;border-bottom:1px solid #E0A400;padding:12px 32px;display:flex;align-items:center;gap:14px;flex-wrap:wrap">
      <span style="font-weight:700;font-size:16px">${esc(v.warnHead)}</span>
      <span style="font-size:16px;flex:1;min-width:260px">${esc(v.warnBody)}</span>
      ${IF(v.hasWarnBtn, () => `<button${click(v.useNext)} style="border:1.5px solid #14213D;background:#FFF6D6;font-weight:700;font-size:14px;padding:8px 14px;border-radius:8px;cursor:pointer">${esc(v.warnBtn)}</button>`)}
    </div>`)}
  ${IF(v.editingTaught, () => `<div style="background:#E6EDFF;border-bottom:1px solid #2F5BEA;padding:12px 32px;display:flex;align-items:center;gap:14px;flex-wrap:wrap">
      <span style="font-size:16px;font-weight:600;flex:1;min-width:260px">${esc(v.editBanner)}</span>
      ${IF(v.hasTaughtDay, () => `<label style="display:flex;align-items:center;gap:8px;font-size:15px;font-weight:600">Taught on<select${input(v.onTaughtDay)} style="height:38px;border:1.5px solid #14213D;border-radius:8px;padding:0 10px;font-size:15px;font-weight:700;background:#fff;color:#14213D;cursor:pointer">${FOR(v.taughtDays, o => `<option value="${o.id}"${o.sel ? ' selected' : ''}>${esc(o.label)}</option>`)}</select></label>`)}
      <button${click(v.backToNext)} style="border:1.5px solid #14213D;background:#fff;font-weight:700;font-size:14px;padding:8px 14px;border-radius:8px;cursor:pointer">Back to the next lesson</button>
    </div>`)}
  <main class="m-1col m-main" style="padding:22px 32px 48px;display:grid;grid-template-columns:minmax(300px,410px) minmax(0,1fr);gap:24px;align-items:start">
    <div style="display:flex;flex-direction:column;gap:8px">
      <span style="font-size:14px;color:#5A6482;margin-bottom:4px">Your lesson, in order. Tap one to change it.</span>
      <div style="background:#FFF1C7;border:1px solid #F3DC91;border-radius:12px;padding:10px 12px;display:flex;align-items:center;gap:12px">
        <span style="flex:none;width:32px;height:32px;border-radius:8px;background:#FFB020;display:grid;place-items:center;font-weight:700;font-size:13px">Go</span>
        <div style="flex:1;display:flex;flex-direction:column"><span style="font-weight:700;font-size:16px">Warm-up</span><span style="font-size:13.5px;color:#5A6482">Your warm-up app. Nothing to plan.</span></div>
        <span style="font-family:'DM Mono';font-size:14px">5-7 min</span>
      </div>
      ${FOR(v.exRows, r => `<div data-k="${esc(r.key)}" class="fx-in" style="display:flex;flex-direction:column;gap:6px">
        ${IF(r.hasHead, () => `<span style="margin-top:8px;font-family:'DM Mono';font-size:12.5px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#3A4566;border-bottom:1.5px solid #C9CFDE;padding-bottom:4px">${esc(r.head)}</span>`)}
        <div${click(r.onClick)} style="background:${esc(r.bg)};border:${esc(r.borderW)} ${esc(r.borderStyle)} ${esc(r.border)};border-radius:12px;padding:10px 12px;display:flex;align-items:center;gap:12px;cursor:pointer">
          <span style="flex:none;width:32px;height:32px;border-radius:8px;background:${esc(r.numBg)};color:#fff;display:grid;place-items:center;font-weight:700;font-size:15px">${r.n}</span>
          <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:1px">
            <span style="font-weight:700;font-size:16px;color:${esc(r.fg)}">${esc(r.title)}</span>
            <span style="font-size:13.5px;color:#5A6482;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(r.sub)}</span>
            ${IF(r.hasFrom, () => `<span style="font-size:12.5px;font-weight:700;color:#9A4A0A">${esc(r.from)}</span>`)}
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:1px">
            <span style="font-family:'DM Mono';font-size:14px;color:${esc(r.fg)}">${esc(r.min)}</span>
            <span style="font-size:12px;color:#5A6482">${esc(r.who)}</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:2px">
            <button${click(r.onUp)} title="Move up" style="width:24px;height:20px;border:none;border-radius:5px;background:#EEF0F5;cursor:pointer;font-size:11px;line-height:1">▲</button>
            <button${click(r.onDown)} title="Move down" style="width:24px;height:20px;border:none;border-radius:5px;background:#EEF0F5;cursor:pointer;font-size:11px;line-height:1">▼</button>
          </div>
          <button${click(r.onAskDel)} title="Delete exercise" style="width:28px;height:28px;border:none;border-radius:7px;background:#FDE3E3;color:#B02A33;cursor:pointer;font-size:16px;font-weight:700;line-height:1">×</button>
        </div>
        ${IF(r.confirming, () => `<div style="background:#FFE3E0;border:1.5px solid #D63A3A;border-radius:10px;padding:10px 12px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <div style="flex:1;min-width:150px;display:flex;flex-direction:column"><span style="font-weight:700;font-size:15px">${esc(r.confirmText)}</span><span style="font-size:12.5px;color:#8A2A2A">Carry-over from it stays.</span></div>
            <button${click(r.onYes)} style="border:none;background:#D63A3A;color:#fff;font-weight:700;font-size:13px;padding:8px 12px;border-radius:8px;cursor:pointer">Yes, delete</button>
            <button${click(r.onKeep)} style="border:1.5px solid #8E97B5;background:#fff;font-weight:700;font-size:13px;padding:7px 12px;border-radius:8px;cursor:pointer">Keep it</button>
          </div>`)}
        </div>`)}
      <button${click(v.addEx)} class="hov-white" style="border:1.5px dashed #9AA1B6;background:transparent;border-radius:12px;padding:13px;font-weight:700;font-size:16px;cursor:pointer">+ Add exercise</button>
      ${IF(v.planHasCarry, () => `<div style="background:#FFF1E6;border:1px solid #F4B183;border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:8px;margin-top:8px">
          <span style="font-weight:700;font-size:14px;color:#8A3D05">Not covered last lesson</span>
          ${FOR(v.planCarry, pc => `<div style="display:flex;align-items:center;gap:8px;background:#fff;border-radius:8px;padding:8px 10px">
              <div style="flex:1;min-width:0;display:flex;flex-direction:column"><span style="font-size:14px">${esc(pc.title)}</span><span style="font-size:12px;font-weight:700;color:#9A4A0A">${esc(pc.from)}</span></div>
              <button${click(pc.onAdd)} style="border:none;background:#14213D;color:#fff;font-weight:700;font-size:12.5px;padding:6px 10px;border-radius:7px;cursor:pointer">Add</button>
            </div>`)}
        </div>`)}
      ${IF(v.planHasNotes, () => `<div style="background:#FFF4C2;border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:4px">
          <span style="font-weight:700;font-size:14px;color:#6B4E00">Your notes from last lesson</span>
          ${FOR(v.planNotes, pn => `<span style="font-size:14px">${esc(pn.text)}</span>`)}
        </div>`)}
      <div style="background:#fff;border:1px solid #E2E6F0;border-radius:12px;margin-top:8px;overflow:hidden">
        <button${click(v.toggleAims)} style="width:100%;border:none;background:transparent;padding:12px 14px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;font-weight:700;font-size:14px"><span>For the Cambridge copy: aims and problems</span><span style="font-family:'DM Mono';color:#5A6482">${esc(v.aimsCount)}</span></button>
        ${IF(v.aimsOpen, () => `<div style="padding:0 14px 14px;display:flex;flex-direction:column;gap:10px">
            ${FOR(v.aimFields, af => `<label style="display:flex;flex-direction:column;gap:4px"><span style="font-size:13px;font-weight:700;color:#5A6482">${esc(af.label)}</span><input value="${esc(af.value)}"${input(af.onChange)} placeholder="${esc(af.ph)}" style="height:38px;border:1.5px solid #C9CFDE;border-radius:8px;padding:0 10px;font-size:14px;background:${esc(af.bg)}"></label>`)}
          </div>`)}
      </div>
      ${tgPanel(v, false)}
      <div style="background:#fff;border:1px solid #E2E6F0;border-radius:12px;margin-top:8px;overflow:hidden">
        <button${click(v.toggleCopy)} style="width:100%;border:none;background:transparent;padding:12px 14px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;font-weight:700;font-size:14px"><span>Copy plan to other groups</span><span style="font-family:'DM Mono';color:#5A6482">${v.copyOpen ? '▲' : '▼'}</span></button>
        ${IF(v.copyOpen, () => `<div style="padding:0 14px 14px;display:flex;flex-direction:column;gap:8px">
            <span style="font-size:13px;color:#5A6482">Copies the unit, lesson name, exercises and aims. Carry-over is not copied. Each group keeps its own.</span>
            ${IF(v.hasCopyCarryNote, () => `<span style="font-size:12.5px;font-weight:700;color:#9A4A0A">${esc(v.copyCarryNote)}</span>`)}
            ${FOR(v.copyTargets, ct => `<div${click(ct.onToggle)} style="background:${esc(ct.rowBg)};border:1.5px solid ${esc(ct.rowBorder)};border-radius:10px;padding:9px 11px;display:flex;align-items:flex-start;gap:10px;cursor:${ct.cursor};color:${esc(ct.fg)}">
                <span style="flex:none;width:22px;height:22px;margin-top:1px;border-radius:6px;border:1.5px solid ${esc(ct.boxBorder)};background:${esc(ct.boxBg)};color:#fff;display:grid;place-items:center;font-size:13px;font-weight:700">${ct.box}</span>
                <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px">
                  <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap"><span style="font-weight:700;font-size:14.5px">${esc(ct.label)}</span><span style="background:${esc(ct.tagBg)};color:#14213D;font-weight:700;font-size:11px;padding:2px 7px;border-radius:999px">${esc(ct.tag)}</span></div>
                  <span style="font-size:12.5px;color:#5A6482">${esc(ct.sub)}</span>
                  ${IF(ct.hasWarn, () => `<span style="font-size:12.5px;font-weight:700;color:${esc(ct.warnFg)}">${esc(ct.warn)}</span>`)}
                </div>
              </div>`)}
            <button${click(v.doCopy)} style="align-self:flex-start;margin-top:4px;border:none;background:${esc(v.copyBtnBg)};color:#fff;font-weight:700;font-size:14px;padding:10px 16px;border-radius:9px;cursor:pointer">${esc(v.copyBtn)}</button>
          </div>`)}
      </div>
      <div style="background:#fff;border:1px solid #E2E6F0;border-radius:12px;padding:14px;margin-top:8px;display:flex;flex-direction:column;gap:8px">
        <span style="font-weight:700;font-size:16px">Upcoming lessons</span>
        <span style="font-size:12.5px;color:#5A6482;margin-top:-4px">Next lessons on the roadmap. Plan ahead as far as you like.</span>
        ${FOR(v.upcoming, u => `<div style="background:${esc(u.rowBg)};border:1.5px solid ${esc(u.rowBorder)};border-radius:10px;padding:9px 12px;display:flex;align-items:center;gap:10px">
            <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:1px"><b style="font-size:15px">${esc(u.sec)}</b><span style="font-family:'DM Mono';font-size:12.5px;color:#3A4566">${esc(u.when)}</span><span style="font-size:13px;font-weight:700;color:${esc(u.statusFg)}">${esc(u.status)}</span></div>
            ${IF(u.notOpen, () => `<button${click(u.onOpen)} style="border:none;background:#14213D;color:#fff;font-weight:700;font-size:13px;padding:7px 12px;border-radius:7px;cursor:pointer">${esc(u.btn)}</button>`)}
            ${IF(u.isOpen, () => `<span style="font-weight:700;font-size:12.5px;padding:0 4px">Open now</span>`)}
          </div>`)}
      </div>
      <div style="background:#fff;border:1px solid #E2E6F0;border-radius:12px;padding:14px;margin-top:8px;display:flex;flex-direction:column;gap:8px">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
          <span style="font-weight:700;font-size:16px">Saved lessons</span>
          <button${click(v.newPlan)} style="border:1.5px solid #C9CFDE;background:#fff;font-weight:600;font-size:13px;padding:6px 10px;border-radius:8px;cursor:pointer">+ New lesson plan</button>
        </div>
        <span style="font-size:12.5px;color:#5A6482;margin-top:-4px">${esc(v.groupLong)} only. Newest first.</span>
        ${FOR(v.savedLessons, sl => `<div style="display:flex;flex-direction:column;gap:6px">
            <div style="background:${esc(sl.rowBg)};border:1.5px solid ${esc(sl.rowBorder)};border-radius:10px;padding:10px 12px;display:flex;align-items:center;gap:10px">
              <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px">
                <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap"><span style="font-family:'DM Mono';font-size:12.5px;color:#3A4566">${esc(sl.when)}</span><span style="background:${esc(sl.tagBg)};color:${esc(sl.tagFg)};font-weight:700;font-size:11.5px;padding:2px 7px;border-radius:999px">${esc(sl.tag)}</span></div>
                <span style="font-weight:700;font-size:15px">${esc(sl.title)}</span>
                <span style="font-size:12.5px;color:#5A6482">${esc(sl.count)}</span>
              </div>
              ${IF(sl.notOpen, () => `<button${click(sl.onOpen)} style="border:none;background:#14213D;color:#fff;font-weight:700;font-size:13px;padding:7px 12px;border-radius:7px;cursor:pointer">Open</button>`)}
              ${IF(sl.isOpen, () => `<span style="font-weight:700;font-size:12.5px;color:#14213D;padding:0 4px">Open now</span>`)}
              <button${click(sl.onDelete)} style="border:1.5px solid #D63A3A;background:#fff;color:#B02A33;font-weight:700;font-size:13px;padding:6px 10px;border-radius:7px;cursor:pointer">Delete</button>
            </div>
            ${IF(sl.confirming, () => `<div style="background:#FFE3E0;border:1.5px solid #D63A3A;border-radius:10px;padding:10px 12px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                <div style="flex:1;min-width:150px;display:flex;flex-direction:column">
                  <span style="font-weight:700;font-size:15px">Delete this lesson plan? Carry-over from it stays.</span>
                  ${IF(sl.isTaught, () => `<span style="font-size:12.5px;color:#8A2A2A">This lesson was taught, so the roadmap goes back by one.</span>`)}
                </div>
                <button${click(sl.onYes)} style="border:none;background:#D63A3A;color:#fff;font-weight:700;font-size:13px;padding:8px 12px;border-radius:8px;cursor:pointer">Yes, delete</button>
                <button${click(sl.onKeep)} style="border:1.5px solid #8E97B5;background:#fff;font-weight:700;font-size:13px;padding:7px 12px;border-radius:8px;cursor:pointer">Keep it</button>
              </div>`)}
          </div>`)}
      </div>
    </div>

    <div style="background:#fff;border:1px solid #E2E6F0;border-radius:18px;padding:26px 28px">
      ${IF(v.noSel, () => `<div style="display:flex;flex-direction:column;gap:14px;align-items:flex-start;padding:30px 0">
          <span style="font-family:'Bricolage Grotesque';font-size:30px;font-weight:700">${esc(v.emptyTitle)}</span>
          <span style="font-size:16px;color:#5A6482">Add each exercise from the book in the order you will do it.</span>
          <button${click(v.addEx)} style="border:none;background:#138A6E;color:#fff;font-weight:700;font-size:17px;padding:14px 22px;border-radius:10px;cursor:pointer">+ Add exercise</button>
        </div>`)}
      ${IF(v.hasSel, () => `<div style="display:flex;flex-direction:column;gap:20px">
          <div style="display:flex;align-items:baseline;gap:14px;flex-wrap:wrap">
            <span style="font-family:'Bricolage Grotesque';font-size:34px;font-weight:700;letter-spacing:-0.01em">${esc(se.heading)}</span>
            <span style="font-size:14px;color:#5A6482">Fill in the boxes. Only the first four are needed.</span>
            <span style="margin-left:auto;background:${esc(se.savedBg)};color:${esc(se.savedFg)};font-size:13px;font-weight:700;padding:4px 10px;border-radius:999px">${esc(se.savedText)}</span>
          </div>
          ${IF(se.skipped, () => `<div style="background:#E8EBF3;border-radius:10px;padding:12px 14px;font-size:15px;color:#3A4566;font-weight:600">You are skipping this one. It shows as “${esc(se.skipLabel)}” in grey and never carries over.</div>`)}
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr));gap:22px 28px">
            <div style="display:flex;flex-direction:column;gap:20px">
              <div style="display:flex;flex-direction:column;gap:8px">
                <span style="font-weight:700;font-size:16px">1 · Where in the book?</span>
                <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px">
                  <label style="display:flex;flex-direction:column;gap:4px;font-size:13px;color:#5A6482">Page<input value="${esc(se.page)}"${input(se.onPage)} inputmode="numeric" style="height:46px;border:1.5px solid #C9CFDE;border-radius:10px;padding:0 14px;font-size:17px;color:#14213D"></label>
                  <label style="display:flex;flex-direction:column;gap:4px;font-size:13px;color:#5A6482">Exercise<input value="${esc(se.num)}"${input(se.onNum)} inputmode="numeric" style="height:46px;border:1.5px solid #C9CFDE;border-radius:10px;padding:0 14px;font-size:17px;color:#14213D"></label>
                  <label style="grid-column:1 / -1;display:flex;flex-direction:column;gap:4px;font-size:13px;color:#5A6482">Book section (optional, the heading in the book)<input value="${esc(se.sec)}"${input(se.onSec)} placeholder="${esc(se.secPh)}" style="height:42px;border:1.5px solid #C9CFDE;border-radius:10px;padding:0 14px;font-size:15px;color:#14213D"></label>
                </div>
              </div>
              <div style="display:flex;flex-direction:column;gap:8px">
                <span style="font-weight:700;font-size:16px">2 · What kind of exercise?</span>
                <div style="display:flex;gap:8px;flex-wrap:wrap">
                  ${FOR(v.kindChips, k => `<button${click(k.onClick)} style="border:1.5px solid ${esc(k.border)};background:${esc(k.bg)};color:${esc(k.fg)};font-weight:${k.weight};font-size:15px;padding:9px 14px;border-radius:10px;cursor:pointer">${esc(k.label)}</button>`)}
                </div>
                ${IF(se.isGrammar, () => `<label style="display:flex;flex-direction:column;gap:6px;background:#F4F0FF;border:1.5px solid #6D3FF0;border-radius:12px;padding:12px 14px">
                    <span style="font-weight:700;font-size:14px;color:#5426D6">What grammar will you explain?</span>
                    <input value="${esc(se.grammar)}"${input(se.onGrammar)} placeholder="e.g. a / an" style="height:42px;border:1.5px solid #C9CFDE;border-radius:8px;padding:0 12px;font-size:16px;background:#fff">
                  </label>`)}
                ${IF(se.isListening, () => `<label style="display:flex;flex-direction:column;gap:6px;background:#EEF2FF;border:1.5px solid #2F5BEA;border-radius:12px;padding:12px 14px">
                    <span style="font-weight:700;font-size:14px;color:#1F45C2">Which track?</span>
                    <input value="${esc(se.track)}"${input(se.onTrack)} placeholder="e.g. 14" style="height:42px;border:1.5px solid #C9CFDE;border-radius:8px;padding:0 12px;font-size:16px;background:#fff">
                  </label>`)}
              </div>
              <div style="display:flex;flex-direction:column;gap:8px">
                <span style="font-weight:700;font-size:16px">3 · Short note</span>
                <input value="${esc(se.note)}"${input(se.onNote)} placeholder="One line, e.g. Fill the gaps with a or an" style="height:46px;border:1.5px solid #C9CFDE;border-radius:10px;padding:0 14px;font-size:16px">
              </div>
            </div>
            <div style="display:flex;flex-direction:column;gap:20px">
              <div style="display:flex;flex-direction:column;gap:8px">
                <span style="font-weight:700;font-size:16px">4 · Who does it?</span>
                ${FOR(v.whoBtns, w => `<button${click(w.onClick)} style="text-align:left;border:1.5px solid ${esc(w.border)};background:${esc(w.bg)};color:${esc(w.fg)};font-weight:${w.weight};font-size:16px;padding:13px 16px;border-radius:10px;cursor:pointer">${esc(w.label)}</button>`)}
              </div>
              <div style="display:flex;flex-direction:column;gap:8px">
                <span style="font-weight:700;font-size:16px">5 · How many minutes?</span>
                <div style="display:flex;flex-wrap:wrap;gap:8px">
                  ${FOR(v.minBtns, m => `<button${click(m.onClick)} style="min-width:54px;border:1.5px solid ${esc(m.border)};background:${esc(m.bg)};color:${esc(m.fg)};font-family:${esc(m.font)};font-size:16px;padding:12px 10px;border-radius:10px;cursor:pointer">${esc(m.label)}</button>`)}
                </div>
                ${IF(se.isOther, () => `<label style="display:flex;align-items:center;gap:8px;font-size:15px;color:#5A6482"><input value="${esc(se.otherMin)}"${input(se.onOther)} inputmode="numeric" placeholder="0" style="width:80px;height:42px;border:1.5px solid #14213D;border-radius:8px;text-align:center;font-family:'DM Mono';font-size:16px;color:#14213D">minutes</label>`)}
              </div>
              <div style="display:flex;flex-direction:column;gap:8px">
                <span style="font-weight:700;font-size:16px">6 · Note to self <span style="font-weight:400;color:#5A6482">(optional)</span></span>
                <div style="background:#FFF1C7;border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:6px">
                  <span style="font-size:13px;color:#6B4E00">Shows in yellow during the lesson</span>
                  <input value="${esc(se.self)}"${input(se.onSelf)} placeholder="e.g. First say: Look at the picture." style="height:42px;border:1.5px solid #E8C860;border-radius:8px;padding:0 12px;font-size:16px;background:#fff">
                </div>
              </div>
            </div>
          </div>
          <div style="border-top:1px solid #E2E6F0;padding-top:18px;display:flex;align-items:center;gap:14px;flex-wrap:wrap">
            <button${click(se.onSkip)} style="border:1.5px solid #8E97B5;background:#fff;font-size:15px;padding:10px 16px;border-radius:10px;cursor:pointer">${esc(se.skipBtn)}</button>
            <span style="font-size:13px;color:#5A6482">${esc(se.skipHint)}</span>
            <button${click(se.onDelete)} style="border:none;background:transparent;color:#B02A33;font-size:13px;cursor:pointer;text-decoration:underline">Remove</button>
            <button${click(se.onSave)} style="margin-left:auto;border:none;background:#138A6E;color:#fff;font-weight:700;font-size:17px;padding:14px 28px;border-radius:10px;cursor:pointer">Save exercise</button>
          </div>
        </div>`)}
    </div>
  </main>
  <div style="padding:0 32px 40px;display:flex;justify-content:flex-end">
    ${IF(v.canStart, () => `<button${click(v.goStart)} style="border:none;background:#14213D;color:#fff;font-weight:700;font-size:16px;padding:13px 22px;border-radius:10px;cursor:pointer">Start the lesson →</button>`)}
  </div>
</div>`;
}

function tLiveHead(v) {
  return `<div class="m-pad" style="padding:22px 32px 4px;display:flex;align-items:center;gap:14px;flex-wrap:wrap">
  <span style="background:${esc(v.lvTint)};font-weight:700;font-size:14px;padding:5px 12px;border-radius:999px">${esc(v.lvName)}</span>
  <span style="font-size:15px;color:#5A6482">${esc(v.dateText)} · ${esc(v.startTime)} · <b style="color:#14213D">${esc(v.lessonTitle)}</b></span>
  <span style="margin-left:auto;font-size:15px;color:#5A6482">Lesson ends ${esc(v.endTime)} · <b style="font-family:'DM Mono';color:#14213D">${esc(v.minLeft)} min left</b></span>
  ${IF(v.isStarted, () => `<button${click(v.askResetStart)} title="Started by mistake? Set this lesson back to not started" style="border:none;background:transparent;color:#5A6482;font-size:13px;text-decoration:underline;cursor:pointer">Not started yet?</button>`)}
</div>
${IF(v.confirmResetStart, () => `<div class="fx-in" style="margin:6px 32px 0;background:#FFF1C7;border-radius:12px;padding:10px 14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap"><span style="flex:1;font-weight:600">Set this lesson back to "not started"? Done marks and the timer are cleared.</span><button${click(v.resetStart)} style="border:none;background:#14213D;color:#fff;font-weight:700;font-size:13px;padding:8px 12px;border-radius:8px;cursor:pointer">Yes, not started</button><button${click(v.keepStart)} style="border:1.5px solid #8E97B5;background:#fff;font-weight:700;font-size:13px;padding:7px 12px;border-radius:8px;cursor:pointer">Keep it</button></div>`)}`;
}

function tNext(v) {
  const nx = v.nx;
  return `<div style="background:#fff;border:1px solid #E2E6F0;border-radius:14px;padding:14px 20px;display:flex;align-items:center;gap:14px;flex-wrap:wrap">
      <span style="font-weight:700;font-size:13px;letter-spacing:0.08em;color:#5A6482">NEXT</span>
      ${IF(nx.has, () => `<span style="background:${esc(nx.kc)};color:#fff;font-weight:700;font-size:14px;padding:4px 12px;border-radius:7px">${esc(nx.kind)}</span>
        <span style="font-size:16px">${esc(nx.text)}</span>`)}
      ${IF(nx.none, () => `<span style="font-size:16px;color:#5A6482">${esc(nx.noneText)}</span>`)}
      ${IF(nx.hasThen && v.isMid, () => `<span style="margin-left:auto;background:#E8EBF3;color:#3A4566;font-weight:700;font-size:14px;padding:6px 12px;border-radius:7px">${esc(nx.then)}</span>`)}
    </div>`;
}

const tChecks = v => `<div style="background:#F4F6FB;border:1.5px solid #C9CFDE;border-radius:10px;padding:8px 10px;display:flex;flex-direction:column;gap:5px;margin:2px 0">
  <div style="display:flex;align-items:center;gap:6px"><span style="font-family:'DM Mono';font-size:11.5px;letter-spacing:0.08em;color:#3A4566">CLASS CHECKLIST</span><span style="margin-left:auto;font-size:12px;font-weight:700;color:${v.checksLeft ? '#8A4B00' : '#0F6B55'}">${v.checksLeft ? v.checksLeft + ' left' : 'All done ✓'}</span></div>
  ${FOR(v.checks, c => `<div${click(c.onClick)} style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:3px 0">
    <span style="flex:none;width:20px;height:20px;border-radius:5px;border:1.5px solid ${c.on ? '#138A6E' : '#9AA1B6'};background:${c.on ? '#138A6E' : '#fff'};color:#fff;display:grid;place-items:center;font-size:12px;font-weight:700">${c.on ? '✓' : ''}</span>
    <span style="flex:1;font-size:14px;${c.on ? 'color:#5A6482;text-decoration:line-through' : ''}">${esc(c.label)}</span>
    <span style="font-family:'DM Mono';font-size:12px;color:#5A6482">${esc(c.at)}</span></div>`)}
  <button${click(v.toggleRemind)} style="align-self:flex-start;border:none;background:transparent;color:#2F5BEA;font-size:12.5px;font-weight:600;padding:0;cursor:pointer">${v.remindOn ? '🔔 PC reminders on · turn off' : '🔕 Turn on PC reminders'}</button>
</div>`;
function tToday(v, withAfter) {
  return `<aside style="background:#fff;border:1px solid #E2E6F0;border-radius:18px;padding:18px;display:flex;flex-direction:column;gap:7px;min-height:420px">
    <span style="font-weight:700;font-size:15px;margin-bottom:4px">Today</span>
    ${FOR(v.today, (t, ti) => `${ti === 1 ? tChecks(v) : ''}${t.head ? `<span style="margin-top:6px;font-family:'DM Mono';font-size:11.5px;letter-spacing:0.08em;text-transform:uppercase;color:#5A6482">${esc(t.head)}</span>` : ''}<div data-k="${esc(t.key)}"${click(t.onJump)} class="fx-in${t.onJump ? ' hov-row' : ''}" title="${t.onJump ? 'Go to this exercise' : ''}" style="display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:9px;background:${esc(t.bg)};border:1px solid ${esc(t.border)};cursor:${t.onJump ? 'pointer' : 'default'}">
        <span class="${t.pop ? 'fx-pop' : ''}" style="flex:none;width:26px;height:26px;border-radius:50%;background:${esc(t.iconBg)};color:${esc(t.iconFg)};border:1.5px ${esc(t.iconStyle)} ${esc(t.iconBorder)};display:grid;place-items:center;font-size:12px;font-weight:700">${esc(t.icon)}</span>
        <span style="flex:1;font-size:15px;color:${esc(t.fg)};font-weight:${t.weight}">${esc(t.label)}</span>
        <span style="font-family:'DM Mono';font-size:12.5px;color:${esc(t.fg)}">${esc(t.time)}</span>
      </div>`)}
    <span style="margin-top:auto;padding-top:10px;font-size:13px;color:#5A6482">${esc(v.todayFoot)}</span>
    <span style="font-size:12px;color:#8E97B5">Tip: tap any exercise to jump to it. Keys: Space pause · ← → previous / next.</span>
    <button${click(v.allDone)} style="border:none;background:#DDF3EC;color:#0F6B55;font-weight:700;font-size:14px;padding:10px;border-radius:9px;cursor:pointer;margin-top:6px">✓ Mark all as done</button>
    ${withAfter ? `<button${click(v.goAfter)} style="border:1.5px solid #14213D;background:#fff;font-weight:700;font-size:14px;padding:10px;border-radius:9px;cursor:pointer;margin-top:6px">Class over → After class</button>` : ''}
  </aside>`;
}

function tStart(v) {
  return `<main data-screen-label="03 Lesson starts" class="m-grid" style="padding:14px 32px 40px;display:grid;grid-template-columns:minmax(0,1fr) minmax(260px,330px);gap:22px;align-items:start">
  <div style="display:flex;flex-direction:column;gap:16px">
    <div class="m-card" style="background:#fff;border:3px solid #FFB020;border-radius:20px;padding:28px 32px;display:flex;flex-direction:column;gap:14px;align-items:flex-start">
      <div style="display:flex;align-items:center;gap:12px"><span style="background:#FFB020;font-weight:700;font-size:16px;padding:6px 14px;border-radius:8px">Warm-up</span><span style="font-size:15px;color:#5A6482">5 to 7 minutes</span></div>
      <span class="m-big" style="font-family:'Bricolage Grotesque';font-size:40px;font-weight:700;letter-spacing:-0.015em;line-height:1.1">Open your warm-up app</span>
      <span style="font-size:17px;color:#3A4566">Pick the game yourself. When it's done, tap the green button.</span>
      <button${click(v.warmDone)} style="border:none;background:#138A6E;color:#fff;font-weight:700;font-size:19px;padding:16px 38px;border-radius:12px;cursor:pointer;white-space:pre">${esc(v.warmBtn)}</button>
    </div>
    <div style="background:#FFF1E8;border:1.5px solid #F4A672;border-radius:18px;padding:16px 20px;display:flex;flex-direction:column;gap:10px">
      <span style="font-weight:700;font-size:16px;color:#8A3D05">Not covered last lesson · ${esc(v.groupLong)} only</span>
      ${IF(v.noCarry, () => `<span style="font-size:15px;color:#8A3D05">Nothing carried over. All clear.</span>`)}
      ${FOR(v.carryItems, ci => `<div style="display:flex;flex-direction:column;gap:8px">
          ${IF(ci.normal, () => `<div style="background:#fff;border-radius:10px;padding:10px 14px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">
              <div style="flex:1;min-width:220px;display:flex;flex-direction:column;gap:2px"><span style="font-size:16px">${esc(ci.title)}</span><span style="font-size:12.5px;font-weight:700;color:#9A4A0A">${esc(ci.from)}</span></div>
              <button${click(ci.onAdd)} style="border:none;background:#14213D;color:#fff;font-weight:700;font-size:14px;padding:9px 14px;border-radius:8px;cursor:pointer">Add to today</button>
              <button${click(ci.onDelete)} style="border:1.5px solid #D63A3A;background:#fff;color:#B02A33;font-weight:700;font-size:14px;padding:8px 14px;border-radius:8px;cursor:pointer">Delete</button>
            </div>`)}
          ${IF(ci.confirming, () => `<div style="background:#FFE3E0;border:1.5px solid #D63A3A;border-radius:10px;padding:12px 14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">
              <div style="flex:1;min-width:220px;display:flex;flex-direction:column"><span style="font-weight:700;font-size:16px">Delete "${esc(ci.short)}"?</span><span style="font-size:13px;color:#8A2A2A">It will not carry over again.</span></div>
              <button${click(ci.onYes)} style="border:none;background:#D63A3A;color:#fff;font-weight:700;font-size:14px;padding:9px 14px;border-radius:8px;cursor:pointer">Yes, delete</button>
              <button${click(ci.onKeep)} style="border:1.5px solid #8E97B5;background:#fff;font-weight:700;font-size:14px;padding:8px 14px;border-radius:8px;cursor:pointer">Keep it</button>
            </div>`)}
        </div>`)}
    </div>
    ${tNext(v)}
  </div>
  ${tToday(v, false)}
</main>`;
}

function tMid(v) {
  const cur = v.cur;
  return `<main data-screen-label="04 Mid-lesson" class="m-grid" style="padding:14px 32px 40px;display:grid;grid-template-columns:minmax(0,1fr) minmax(260px,330px);gap:22px;align-items:start">
  <div style="display:flex;flex-direction:column;gap:16px">
    ${IF(v.hasCur, () => `<div data-k="${esc(cur.key)}" class="fx-in m-card" style="background:#fff;border:3px solid ${esc(cur.kc)};border-radius:20px;padding:28px 32px;display:flex;flex-direction:column;gap:18px;min-height:540px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap">
          <div style="display:flex;align-items:center;gap:12px;padding-top:12px"><span style="background:${esc(cur.kc)};color:#fff;font-weight:700;font-size:17px;padding:6px 14px;border-radius:8px">${esc(cur.kind)}</span><span style="font-size:16px;color:#5A6482">${esc(cur.where)}</span></div>
          <div style="display:flex;flex-direction:column;align-items:flex-end">
            <span class="${v.timerCls} m-timer" style="font-family:'DM Mono';font-size:58px;font-weight:500;line-height:1;letter-spacing:-0.02em;color:${esc(v.timerColor)};transition:color .3s">${esc(v.timerText)}</span>
            <span style="font-size:13px;color:#5A6482">${esc(v.timerSub)}</span>
            <div style="display:flex;gap:6px;margin-top:8px">
              <button${click(v.togglePause)} style="border:1.5px solid #14213D;background:${v.paused ? '#14213D' : '#fff'};color:${v.paused ? '#fff' : '#14213D'};font-weight:700;font-size:13px;padding:6px 10px;border-radius:8px;cursor:pointer">${esc(v.pauseLabel)}</button>
              <button${click(v.addMin)} style="border:1.5px solid #C9CFDE;background:#fff;font-weight:700;font-size:13px;padding:6px 10px;border-radius:8px;cursor:pointer">+1 min</button>
              <button${click(v.resetTimer)} style="border:1.5px solid #C9CFDE;background:#fff;font-weight:700;font-size:13px;padding:6px 10px;border-radius:8px;cursor:pointer">Reset</button>
            </div>
          </div>
        </div>
        <span class="m-big" style="font-family:'Bricolage Grotesque';font-size:40px;font-weight:700;letter-spacing:-0.015em;line-height:1.12;text-wrap:pretty">${esc(cur.note)}</span>
        <div style="display:flex;gap:12px;flex-wrap:wrap">
          ${IF(cur.hasExtra, () => `<div style="background:${esc(cur.kt)};border-radius:12px;padding:12px 18px;display:flex;flex-direction:column;gap:2px"><span style="font-size:12px;font-weight:700;letter-spacing:0.04em;color:${esc(cur.kc)}">${esc(cur.extraLabel)}</span><span style="font-size:24px;font-weight:700">${esc(cur.extra)}</span></div>`)}
          <div style="background:#ECEEF3;border-radius:12px;padding:12px 18px;display:flex;flex-direction:column;gap:2px"><span style="font-size:12px;font-weight:700;letter-spacing:0.04em;color:#5A6482">WHO DOES IT</span><span style="font-size:24px;font-weight:700">${esc(cur.who)}</span></div>
        </div>
        ${IF(cur.hasSelf, () => `<div style="background:#FFF1C7;border-radius:12px;padding:14px 18px;display:flex;flex-direction:column;gap:4px"><span style="font-size:12px;font-weight:700;letter-spacing:0.04em;color:#6B4E00">NOTE TO SELF</span><span style="font-size:20px">${esc(cur.self)}</span></div>`)}
        <div style="margin-top:auto;display:flex;gap:12px;flex-wrap:wrap;align-items:center">
          ${v.curDone ? `<span class="fx-pop" style="background:#DDF3EC;color:#0F6B55;font-weight:700;font-size:17px;padding:16px 22px;border-radius:12px">✓ Done</span><button${click(v.undoDone)} style="border:1.5px solid #8E97B5;background:#fff;font-weight:700;font-size:15px;padding:14px 18px;border-radius:12px;cursor:pointer">Undo done</button>`
          : `<button${click(v.exDone)} style="border:none;background:#138A6E;color:#fff;font-weight:700;font-size:20px;padding:18px 40px;border-radius:12px;cursor:pointer">Done</button>
          <button${click(v.exUnfinished)} style="border:1.5px solid #D63A3A;background:#fff;color:#B02A33;font-weight:700;font-size:17px;padding:16px 24px;border-radius:12px;cursor:pointer">Didn't finish, do it next lesson</button>`}
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;border-top:1px solid #E2E6F0;padding-top:14px">
          <button${click(v.goPrev)} style="border:1.5px solid #C9CFDE;background:#fff;font-weight:700;font-size:14px;padding:10px 14px;border-radius:10px;cursor:pointer">${esc(v.prevLabel)}</button>
          ${v.canNext ? `<button${click(v.goNext)} style="margin-left:auto;border:1.5px solid #C9CFDE;background:#fff;font-weight:700;font-size:14px;padding:10px 14px;border-radius:10px;cursor:pointer">${esc(v.nextLabel)}</button>` : ''}
        </div>
      </div>`)}
    ${IF(v.noCur, () => `<div style="background:#fff;border:3px solid ${esc(v.midEmptyColor)};border-radius:20px;padding:36px;display:flex;flex-direction:column;gap:14px;align-items:flex-start;min-height:340px">
        <span style="font-family:'Bricolage Grotesque';font-size:38px;font-weight:700">${esc(v.midEmptyTitle)}</span>
        <span style="font-size:17px;color:#3A4566">${esc(v.midEmptyText)}</span>
        <button${click(v.midEmptyGo)} style="border:none;background:#138A6E;color:#fff;font-weight:700;font-size:18px;padding:15px 28px;border-radius:12px;cursor:pointer">${esc(v.midEmptyBtn)}</button>
      </div>`)}
    ${tNext(v)}
  </div>
  ${tToday(v, true)}
</main>`;
}

const tgSendBtn = v => v.tgCanSend ? `<button${click(v.sendTg)} style="border:none;background:${esc(v.tgSendBg)};color:#fff;font-weight:700;font-size:14px;padding:9px 16px;border-radius:9px;cursor:pointer">✈ ${esc(v.tgSendLabel)}</button>` : '';
const tgPanel = (v, open) => `<div style="background:#fff;border:1px solid #E2E6F0;border-radius:${open ? 16 : 12}px;padding:${open ? '18px 20px' : '0'};display:flex;flex-direction:column;gap:10px;margin-top:${open ? 0 : 8}px;overflow:hidden">
  ${open ? `<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><span style="font-weight:700;font-size:16px">4 · Telegram message for students</span><span style="margin-left:auto;display:flex;gap:8px;flex-wrap:wrap">${tgSendBtn(v)}<button${click(v.copyTg)} style="border:none;background:#2AABEE;color:#fff;font-weight:700;font-size:14px;padding:9px 16px;border-radius:9px;cursor:pointer">Copy message</button></span></div>`
  : `<button${click(v.toggleTg)} style="width:100%;border:none;background:transparent;padding:12px 14px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;font-weight:700;font-size:14px"><span>Telegram message for students</span><span style="font-family:'DM Mono';color:#5A6482">${v.tgOpen ? '▲' : '▼'}</span></button>`}
  ${IF(open || v.tgOpen, () => `<div style="padding:${open ? 0 : '0 14px 14px'};display:flex;flex-direction:column;gap:8px">
    <span style="font-size:12.5px;color:#5A6482">${esc(v.tgHint)}</span>
    ${IF(v.hasTgSent, () => `<span style="background:#DDF3EC;border-radius:8px;padding:7px 10px;font-size:13px;font-weight:600;color:#0F6B55">✓ ${esc(v.tgSentNote)}</span>`)}
    ${IF(v.tgNeedSetup, () => `<button${click(v.goTgSetup)} style="align-self:flex-start;border:none;background:transparent;color:#2F5BEA;font-size:13px;font-weight:600;padding:0;cursor:pointer;text-decoration:underline">${esc(v.tgSetupText)}</button>`)}
    ${IF(v.hasTgWarn, () => `<span style="background:#FFF1C7;border-radius:8px;padding:7px 10px;font-size:13px;font-weight:600;color:#6B4E00">${esc(v.tgWarn)}</span>`)}
    <textarea data-autogrow="1"${input(v.onTg)} rows="8" style="border:1.5px solid #C9CFDE;border-radius:10px;padding:12px 14px;font-size:14.5px;line-height:1.5;resize:none;overflow:hidden;background:#F7FAFD;font-family:'DM Sans',system-ui,sans-serif">${esc(v.tgText)}</textarea>
    ${open ? '' : `<div style="display:flex;gap:8px;flex-wrap:wrap">${tgSendBtn(v)}<button${click(v.copyTg)} style="border:none;background:#2AABEE;color:#fff;font-weight:700;font-size:13.5px;padding:8px 14px;border-radius:8px;cursor:pointer">Copy message</button></div>`}
  </div>`)}
</div>`;

function tAfter(v) {
  return `<main data-screen-label="05 After class" class="m-main" style="padding:22px 32px 40px;display:flex;flex-direction:column;gap:18px">
  <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
    <span style="background:${esc(v.lvTint)};font-weight:700;font-size:14px;padding:5px 12px;border-radius:999px">${esc(v.lvName)}</span>
    <span style="font-family:'Bricolage Grotesque';font-size:32px;font-weight:700;letter-spacing:-0.01em">Wrap-up · ${esc(v.lessonTitle)}${v.afterTaught ? ' · ' + esc(v.afterDateLabel) : ''}</span>
    ${IF(v.afterTaught, () => `<span style="margin-left:auto;background:#DDF3EC;color:#0F6B55;font-weight:700;font-size:14px;padding:8px 12px;border-radius:9px">Taught lesson · changes save as you type</span>
    <label style="display:flex;align-items:center;gap:8px;font-size:15px;font-weight:600;color:#3A4566">Taught on<select${input(v.onAfterDay)} style="height:38px;border:1.5px solid #14213D;border-radius:8px;padding:0 10px;font-size:15px;font-weight:700;background:#fff;color:#14213D;cursor:pointer">${FOR(v.afterDays, o => `<option value="${o.id}"${o.sel ? ' selected' : ''}>${esc(o.label)}</option>`)}</select></label>`)}
    ${IF(v.afterAhead, () => `<span style="margin-left:auto;background:#FFF1C7;color:#6B4E00;font-weight:700;font-size:14px;padding:8px 12px;border-radius:9px">Planned ahead · not taught yet</span>`)}
    ${IF(v.canClose, () => `<label style="margin-left:auto;display:flex;align-items:center;gap:8px;font-size:15px;font-weight:600;color:#3A4566">Lesson day<select${input(v.onCloseDay)} style="height:38px;border:1.5px solid #14213D;border-radius:8px;padding:0 10px;font-size:15px;font-weight:700;background:#fff;color:#14213D;cursor:pointer">${FOR(v.closeDays, o => `<option value="${o.id}"${o.sel ? ' selected' : ''}>${esc(o.label)}</option>`)}</select></label>
    <button${click(v.closeLesson)} style="border:none;background:#14213D;color:#fff;font-weight:700;font-size:16px;padding:14px 24px;border-radius:10px;cursor:pointer">Save and close lesson</button>`)}
  </div>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr));gap:20px;align-items:stretch">
    <div style="background:#fff;border:1px solid #E2E6F0;border-radius:16px;padding:20px;display:flex;flex-direction:column;gap:10px">
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:4px">
        <span style="font-weight:700;font-size:16px">1 · What did you cover?</span>
        <button${click(v.allFull)} style="margin-left:auto;border:none;background:${v.missedN ? '#DDF3EC' : '#138A6E'};color:${v.missedN ? '#0F6B55' : '#fff'};font-weight:700;font-size:13.5px;padding:7px 12px;border-radius:8px;cursor:pointer">✓ Taught as planned</button>
      </div>
      <span style="font-size:13px;color:#5A6482;margin-top:-6px">Everything counts as covered. Only tap Part or None for what you did not finish. Those go to carry-over.</span>
      ${FOR(v.resRows, rr => `<div style="display:flex;flex-direction:column;gap:6px">
          ${IF(rr.hasHead, () => `<span style="margin-top:6px;font-family:'DM Mono';font-size:11.5px;letter-spacing:0.08em;text-transform:uppercase;color:#5A6482;border-bottom:1px solid #E2E6F0;padding-bottom:3px">${esc(rr.head)}</span>`)}
          <div style="display:flex;align-items:center;gap:8px">
            <div style="flex:1;min-width:0;display:flex;flex-direction:column"><span style="font-size:15px">${esc(rr.label)}</span><span style="font-size:12px;color:#5A6482">${esc(rr.sub)}</span></div>
            ${FOR(rr.opts, o => `<button${click(o.onClick)} style="border:none;background:${esc(o.bg)};color:${esc(o.fg)};font-weight:${o.weight};font-size:13.5px;padding:7px 10px;border-radius:6px;cursor:pointer">${esc(o.label)}</button>`)}
          </div>
          ${IF(rr.missed, () => `<div style="background:${esc(rr.missBg)};border-radius:8px;padding:7px 10px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
              <span style="font-size:13px;flex:1">${esc(rr.missText)}</span>
              <button${click(rr.onCarry)} style="border:1.5px solid #14213D;background:${esc(rr.carryBg)};color:${esc(rr.carryFg)};font-weight:700;font-size:12.5px;padding:4px 10px;border-radius:999px;cursor:pointer">Carry to next lesson</button>
              <button${click(rr.onDrop)} style="border:1.5px solid #8E97B5;background:${esc(rr.dropBg)};color:${esc(rr.dropFg)};font-weight:700;font-size:12.5px;padding:4px 10px;border-radius:999px;cursor:pointer">Drop it</button>
            </div>`)}
        </div>`)}
    </div>
    <div style="background:#fff;border:1px solid #E2E6F0;border-radius:16px;padding:20px;display:flex;flex-direction:column;gap:10px">
      <span style="font-weight:700;font-size:16px;margin-bottom:4px">2 · Notes to self · tap a template, fill the blanks</span>
      ${FOR(v.tplCards, tc => `<div${click(tc.onOpen)} style="background:${esc(tc.bg)};border:1.5px solid ${esc(tc.border)};border-radius:10px;padding:11px 14px;cursor:pointer;display:flex;flex-direction:column;gap:10px">
          <div style="font-size:15.5px;line-height:2.1;display:block">${FOR(tc.parts, p =>
            p.isText ? `<span style="white-space:pre-wrap">${esc(p.text)}</span>`
            : p.isChip ? `<span style="display:inline-block;white-space:nowrap;background:#FFF1C7;border-bottom:1.5px dashed #C99A00;padding:0 7px;border-radius:4px;line-height:1.6;vertical-align:baseline">${esc(p.text)}</span>`
            : `<input value="${esc(p.val)}"${input(p.onChange)} placeholder="${esc(p.text)}" size="${p.size}" style="display:inline-block;max-width:100%;vertical-align:baseline;border:none;border-bottom:2px solid #2F5BEA;background:#E6EDFF;border-radius:4px;padding:3px 7px;font-size:15px;font-weight:700;color:#14213D;outline:none">`)}</div>
          ${IF(tc.editing, () => `<div style="display:flex;gap:8px">
              <button${click(tc.onSave)} style="border:none;background:#138A6E;color:#fff;font-weight:700;font-size:13.5px;padding:8px 14px;border-radius:8px;cursor:pointer">Save note</button>
              <button${click(tc.onCancel)} style="border:1.5px solid #8E97B5;background:#fff;font-weight:600;font-size:13.5px;padding:7px 12px;border-radius:8px;cursor:pointer">Cancel</button>
            </div>`)}
        </div>`)}
      <div style="background:#F4F6FB;border-radius:10px;padding:12px 14px;display:flex;flex-direction:column;gap:8px">
        <span style="font-weight:700;font-size:14px">Your own note</span>
        <textarea${input(v.onCustomNote)} rows="3" placeholder="Write anything the templates don't cover" style="border:1.5px solid #C9CFDE;border-radius:8px;padding:10px 12px;font-size:15px;resize:vertical;background:#fff">${esc(v.customNote)}</textarea>
        <button${click(v.saveCustomNote)} style="align-self:flex-start;border:none;background:#138A6E;color:#fff;font-weight:700;font-size:13.5px;padding:8px 14px;border-radius:8px;cursor:pointer">Save note</button>
      </div>
      <div style="margin-top:auto;padding-top:10px;display:flex;flex-wrap:wrap;gap:8px;align-items:center">
        <span style="font-size:13px;color:#5A6482">More templates:</span>
        ${FOR(v.moreTpl, mt => `<button${click(mt.onClick)} style="border:1.5px solid ${esc(mt.border)};background:#fff;font-size:13px;padding:7px 12px;border-radius:999px;cursor:pointer">${esc(mt.label)}</button>`)}
      </div>
    </div>
    <div style="background:#14213D;color:#fff;border-radius:16px;padding:20px;display:flex;flex-direction:column;gap:10px">
      <span style="font-family:'DM Mono';font-size:12px;letter-spacing:0.14em;color:#FFB020">3 · OPENS NEXT LESSON</span>
      <span style="font-size:15px;color:#D5DAEA;margin-bottom:4px">${esc(v.nextLessonLabel)}</span>
      ${IF(v.nlEmpty, () => `<span style="font-size:14px;color:#B8C0D8">Nothing yet. Part and None items and your notes appear here.</span>`)}
      ${FOR(v.nlItems, ni => `<div style="background:#24345C;border-radius:10px;padding:10px 12px;display:flex;gap:8px;align-items:flex-start">
          <div style="flex:1;display:flex;flex-direction:column;gap:2px"><span style="font-size:13px;color:#D5DAEA">${esc(ni.head)}</span><span style="font-size:14.5px;font-weight:700">${esc(ni.text)}</span></div>
          ${IF(ni.canDel, () => `<button${click(ni.onDel)} title="Remove note" style="border:none;background:transparent;color:#B8C0D8;font-size:16px;cursor:pointer">×</button>`)}
        </div>`)}
      <span style="margin-top:auto;font-size:13px;color:#B8C0D8;line-height:1.45;padding-top:12px">These show on the ${esc(v.groupShort)} planner and the first screen of the next lesson. Other groups never see them.</span>
    </div>
  </div>
  ${tgPanel(v, true)}
</main>`;
}

function tCamb(v) {
  const ta = (x, extra) => `<textarea data-autogrow="1"${input(x.onChange)} placeholder="${esc(x.ph)}" rows="2" style="font-family:Arial,Helvetica,sans-serif;font-size:13.5px;color:#000;border:none;resize:none;overflow:hidden;padding:2px 4px;background:${esc(x.bg)};outline-color:#2F5BEA${extra || ''}">${esc(x.value)}</textarea>`;
  const cell = (val, bg, last) => `<span style="padding:7px 8px;white-space:pre-line;${last ? '' : 'border-right:1px solid #000;'}border-bottom:1px solid #000;background:${esc(bg)}">${esc(val)}</span>`;
  return `<main data-screen-label="06 Cambridge copy" data-printwrap="1" class="m-1col m-main" style="padding:24px 32px 40px;display:grid;grid-template-columns:minmax(240px,300px) minmax(0,1fr);gap:26px;align-items:start">
  <div data-noprint="1" style="display:flex;flex-direction:column;gap:16px">
    <div style="display:flex;flex-direction:column;gap:4px">
      <span style="font-family:'DM Mono';font-size:12px;letter-spacing:0.14em;color:#5A6482">FOR YOUR SUPERVISOR</span>
      <span style="font-family:'Bricolage Grotesque';font-size:32px;font-weight:700;line-height:1.05;letter-spacing:-0.01em">Cambridge lesson plan</span>
      <span style="font-size:14.5px;color:#5A6482">${esc(v.cambSub)}</span>
    </div>
    <div style="background:#fff;border:1px solid #E2E6F0;border-radius:14px;padding:16px;display:flex;flex-direction:column;gap:10px">
      <span style="font-weight:700;font-size:15px">Where each part comes from</span>
      ${FOR(v.legend, lg => `<div style="display:flex;flex-direction:column;gap:3px;align-items:flex-start"><span style="background:#DCE5FF;font-weight:700;font-size:13.5px;padding:2px 7px;border-radius:5px">${esc(lg.a)}</span><span style="font-size:13.5px">${esc(lg.b)}</span></div>`)}
    </div>
    <button${click(v.printPdf)} style="border:none;background:#14213D;color:#fff;font-weight:700;font-size:15px;padding:14px;border-radius:10px;cursor:pointer">Download PDF · landscape</button>
    <button${click(v.copyTable)} style="border:1.5px solid #14213D;background:#fff;font-weight:700;font-size:15px;padding:13px;border-radius:10px;cursor:pointer">Copy the table</button>
    <button${click(v.goBulk)} style="border:none;background:#FFB020;color:#14213D;font-weight:700;font-size:15px;padding:13px;border-radius:10px;cursor:pointer">Many lessons in one PDF →</button>
    <div style="background:#FFF1C7;border-radius:12px;padding:12px 14px;font-size:13.5px">Empty fields show here in yellow, so you see what is missing before you send it. Tap any yellow field to fill it.</div>
    <div style="background:#fff;border:1px solid #E2E6F0;border-radius:12px;padding:12px 14px;font-size:13px;color:#5A6482">Download PDF opens the print window. Choose “Save as PDF”.</div>
  </div>
  <div data-printpage="1" class="m-page" style="background:#fff;border:1px solid #E2E6F0;border-radius:14px;padding:28px 30px;font-family:Arial,Helvetica,sans-serif;color:#000;font-size:13.5px;aspect-ratio:1.414/1;display:flex;flex-direction:column;gap:14px;min-width:0">
    <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;border-bottom:1.5px solid #000;padding-bottom:8px;flex-wrap:wrap">
      <span style="font-size:19px;font-weight:700">Lesson plan</span>
      <span>Teacher: ${esc(v.teacher)} · Level: ${esc(v.cambLevel)} · Date: ${esc(v.cambDate)}</span>
    </div>
    <div class="m-1col" style="display:grid;grid-template-columns:1fr 1fr;gap:6px 28px">
      <div style="display:flex;flex-direction:column;gap:8px">
        ${FOR(v.cambAimsL, ca => `<label style="display:flex;flex-direction:column;gap:1px"><b>${esc(ca.label)}</b>${ta(ca)}</label>`)}
      </div>
      <div style="display:flex;flex-direction:column;gap:4px">
        <b>Anticipated problems and possible solutions</b>
        ${FOR(v.cambProbs, cp => ta(cp))}
      </div>
    </div>
    <div class="m-tbl" style="border:1px solid #000;display:flex;flex-direction:column;flex:1">
      <div style="display:grid;grid-template-columns:13% 6% 43% 26% 12%;background:#E6E6E6;font-weight:700">
        <span style="padding:7px 8px;border-right:1px solid #000;border-bottom:1px solid #000">Stage</span>
        <span style="padding:7px 8px;border-right:1px solid #000;border-bottom:1px solid #000">Time</span>
        <span style="padding:7px 8px;border-right:1px solid #000;border-bottom:1px solid #000">Procedure</span>
        <span style="padding:7px 8px;border-right:1px solid #000;border-bottom:1px solid #000">Aim of stage</span>
        <span style="padding:7px 8px;border-bottom:1px solid #000">Interaction</span>
      </div>
      ${FOR(v.cambRows, cr => `<div style="display:grid;grid-template-columns:13% 6% 43% 26% 12%">${cell(cr.stage, cr.stageBg)}${cell(cr.time, cr.timeBg)}${cell(cr.proc, cr.procBg)}${cell(cr.aim, cr.aimBg)}${cell(cr.inter, cr.interBg, true)}</div>`)}
      ${IF(v.cambNoEx, () => `<span style="padding:10px 8px;font-style:italic;color:#555">No exercises planned yet. Add them on the Plan screen.</span>`)}
    </div>
  </div>
</main>`;
}

function tCambAll(v) {
  const cell = (val, bg, last) => `<span class="pc" style="padding:6px 7px;white-space:pre-line;${last ? '' : 'border-right:1px solid #000;'}border-bottom:1px solid #000;background:${esc(bg)}">${esc(val)}</span>`;
  const box = c => `<button${click(c.onClick)} style="display:flex;align-items:center;gap:8px;border:1.5px solid ${esc(c.border)};background:#fff;border-radius:9px;padding:7px 10px;font-size:14px;font-weight:600;cursor:pointer;text-align:left"><span style="flex:none;width:20px;height:20px;border-radius:5px;border:1.5px solid ${esc(c.border)};background:${esc(c.boxBg)};color:#fff;display:grid;place-items:center;font-size:12px">${c.box}</span>${esc(c.label)}</button>`;
  return `<main data-screen-label="Cambridge many" data-printwrap="1" class="m-1col m-main" style="padding:24px 32px 40px;display:grid;grid-template-columns:minmax(240px,300px) minmax(0,1fr);gap:26px;align-items:start">
  <div data-noprint="1" style="display:flex;flex-direction:column;gap:14px;position:sticky;top:16px">
    <div style="display:flex;flex-direction:column;gap:4px">
      <span style="font-family:'DM Mono';font-size:12px;letter-spacing:0.14em;color:#5A6482">FOR YOUR SUPERVISOR</span>
      <span style="font-family:'Bricolage Grotesque';font-size:30px;font-weight:700;line-height:1.05">Many lessons, one PDF</span>
    </div>
    <div class="m-1col" style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <label style="display:flex;flex-direction:column;gap:4px;font-size:13px;font-weight:600;color:#5A6482">From<input type="date" value="${esc(v.bulkFrom)}"${input(v.onBulkFrom)} style="height:40px;border:1.5px solid #C9CFDE;border-radius:8px;padding:0 8px;font-size:14px"></label>
      <label style="display:flex;flex-direction:column;gap:4px;font-size:13px;font-weight:600;color:#5A6482">To<input type="date" value="${esc(v.bulkTo)}"${input(v.onBulkTo)} style="height:40px;border:1.5px solid #C9CFDE;border-radius:8px;padding:0 8px;font-size:14px"></label>
    </div>
    <div style="display:flex;flex-direction:column;gap:6px">${FOR(v.bulkKinds, box)}</div>
    <div style="display:flex;align-items:center"><span style="font-weight:700;font-size:14px">Groups</span><button${click(v.bulkAllGroups)} style="margin-left:auto;border:none;background:transparent;color:#2F5BEA;font-weight:700;font-size:13px;cursor:pointer">${esc(v.bulkAllLabel)}</button></div>
    <div style="display:flex;flex-direction:column;gap:6px">${FOR(v.bulkGroups, box)}</div>
    <span style="font-weight:700;font-size:15px">${esc(v.bulkCount)}</span>
    <button${click(v.bulkPrint)} style="border:none;background:#14213D;color:#fff;font-weight:700;font-size:15px;padding:14px;border-radius:10px;cursor:pointer">Download PDF · all pages</button>
    <div style="background:#fff;border:1px solid #E2E6F0;border-radius:12px;padding:12px 14px;font-size:13px;color:#5A6482">Opens the print window. Choose “Save as PDF”. Yellow means missing: fix it on that lesson's Cambridge copy.</div>
    <button${click(v.bulkBack)} style="border:1.5px solid #C9CFDE;background:#fff;font-weight:700;font-size:14px;padding:10px;border-radius:10px;cursor:pointer">← One lesson</button>
  </div>
  <div data-printwrap="1" style="display:flex;flex-direction:column;gap:22px;min-width:0">
    ${IF(v.bulkNone, () => `<div data-noprint="1" style="background:#fff;border:1px dashed #9AA1B6;border-radius:14px;padding:30px;font-size:16px;color:#5A6482">No lessons with exercises in these dates for the ticked groups.</div>`)}
    ${FOR(v.bulkPages, pg => `<div data-k="${esc(pg.key)}" class="ppw" style="display:flex;flex-direction:column;gap:6px">
      <span data-noprint="1" style="font-size:13px;font-weight:700;color:#3A4566">${esc(pg.tag)}</span>
      <div data-printpage="1" class="pp m-page" style="background:#fff;border:1px solid #E2E6F0;border-radius:14px;padding:26px 28px;font-family:Arial,Helvetica,sans-serif;color:#000;font-size:12.5px;display:flex;flex-direction:column;gap:12px">
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;border-bottom:1.5px solid #000;padding-bottom:8px;flex-wrap:wrap">
          <span style="font-size:18px;font-weight:700">Lesson plan</span>
          <span>Teacher: ${esc(pg.teacher)} · Level: ${esc(pg.level)} · Date: ${esc(pg.date)}</span>
        </div>
        <div class="m-1col" style="display:grid;grid-template-columns:1fr 1fr;gap:6px 28px">
          <div style="display:flex;flex-direction:column;gap:6px">${FOR(pg.aimsL, a => `<div style="display:flex;flex-direction:column;gap:1px"><b>${esc(a.label)}</b><span style="background:${esc(a.bg)};padding:1px 3px">${esc(a.text)}</span></div>`)}</div>
          <div style="display:flex;flex-direction:column;gap:4px"><b>Anticipated problems and possible solutions</b>${FOR(pg.probs, a => `<span style="background:${esc(a.bg)};padding:1px 3px">${esc(a.text)}</span>`)}</div>
        </div>
        <div class="m-tbl" style="border:1px solid #000;display:flex;flex-direction:column">
          <div style="display:grid;grid-template-columns:13% 6% 43% 26% 12%;background:#E6E6E6;font-weight:700">${cell('Stage', '')}${cell('Time', '')}${cell('Procedure', '')}${cell('Aim of stage', '')}${cell('Interaction', '', true)}</div>
          ${FOR(pg.rows, cr => `<div style="display:grid;grid-template-columns:13% 6% 43% 26% 12%">${cell(cr.stage, cr.stageBg)}${cell(cr.time, cr.timeBg)}${cell(cr.proc, cr.procBg)}${cell(cr.aim, cr.aimBg)}${cell(cr.inter, cr.interBg, true)}</div>`)}
        </div>
      </div>
    </div>`)}
  </div>
</main>`;
}

function tConflict(v) {
  return `<div data-noprint="1" style="background:#FFEBA8;border-bottom:1px solid #E0A400;padding:14px 32px;display:flex;flex-direction:column;gap:8px">
  <span style="font-weight:700;font-size:17px">Your lessons changed in two places. Which copy do you want to keep?</span>
  <span style="font-size:15px">${esc(v.conflictGh)}</span>
  <span style="font-size:15px">${esc(v.conflictLocal)}</span>
  <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:4px">
    <button${click(v.keepGh)} style="border:none;background:#14213D;color:#fff;font-weight:700;font-size:14px;padding:9px 14px;border-radius:8px;cursor:pointer">Keep the GitHub copy</button>
    <button${click(v.keepLocal)} style="border:1.5px solid #14213D;background:#fff;font-weight:700;font-size:14px;padding:8px 14px;border-radius:8px;cursor:pointer">Keep this browser's copy</button>
    <button${click(v.downloadBackup)} style="border:none;background:transparent;color:#14213D;font-size:13.5px;cursor:pointer;text-decoration:underline">Not sure? Download a backup of this browser first</button>
  </div>
</div>`;
}

function tRead(v) {
  return `<main data-screen-label="Read-through" class="m-main" style="padding:22px 32px 48px;display:flex;flex-direction:column;gap:16px;max-width:980px">
  <div style="display:flex;flex-direction:column;gap:4px">
    <span style="font-family:'DM Mono';font-size:13px;letter-spacing:0.12em;color:#5A6482">READ-THROUGH · NO TIMERS</span>
    <span style="font-family:'Bricolage Grotesque';font-size:32px;font-weight:700;letter-spacing:-0.01em">${esc(v.readTitle)}</span>
    <span style="font-size:15px;color:#5A6482">${esc(v.readSub)} · ${esc(v.readTotal)}</span>
  </div>
  <div style="background:#fff;border:3px solid #FFB020;border-radius:16px;padding:16px 20px;display:flex;align-items:center;gap:12px"><span style="background:#FFB020;font-weight:700;font-size:15px;padding:5px 12px;border-radius:8px">Warm-up</span><span style="font-size:16px">Your warm-up app · 5–7 min</span></div>
  ${IF(v.readEmpty, () => `<div style="background:#fff;border:1px dashed #9AA1B6;border-radius:14px;padding:24px;font-size:16px;color:#5A6482">No exercises yet. Add them on the Plan screen.</div>`)}
  ${FOR(v.readCards, rc => `${rc.hasHead ? `<span style="margin-top:10px;font-family:'DM Mono';font-size:13px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#3A4566;border-bottom:1.5px solid #C9CFDE;padding-bottom:4px">${esc(rc.head)}</span>` : ''}
    <div data-k="${esc(rc.key)}" style="background:${rc.skipped ? '#E8EBF3' : '#fff'};border:3px ${rc.skipped ? 'dashed' : 'solid'} ${esc(rc.kc)};border-radius:18px;padding:20px 24px;display:flex;flex-direction:column;gap:12px">
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <span style="background:${esc(rc.kc)};color:#fff;font-weight:700;font-size:15px;padding:5px 12px;border-radius:8px">${esc(rc.kind)}</span>
        <b style="font-size:17px">${rc.skipped ? 'Skip: ' : ''}${esc(rc.label)}</b>
        <span style="font-size:14px;color:#5A6482">${esc(rc.where)}</span>
        <button${click(rc.onEdit)} style="margin-left:auto;border:1.5px solid #C9CFDE;background:#fff;font-weight:700;font-size:13px;padding:5px 10px;border-radius:8px;cursor:pointer">Edit</button>
      </div>
      ${rc.from ? `<span style="font-size:13px;font-weight:700;color:#9A4A0A">${esc(rc.from)}</span>` : ''}
      <span class="m-big" style="font-family:'Bricolage Grotesque';font-size:28px;font-weight:700;line-height:1.18;letter-spacing:-0.01em">${esc(rc.note)}</span>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        ${rc.hasExtra ? `<div style="background:${esc(rc.kt)};border-radius:10px;padding:8px 14px;display:flex;flex-direction:column"><span style="font-size:11.5px;font-weight:700;letter-spacing:0.04em;color:${esc(rc.kc)}">${esc(rc.extraLabel)}</span><span style="font-size:18px;font-weight:700">${esc(rc.extra)}</span></div>` : ''}
        <div style="background:#ECEEF3;border-radius:10px;padding:8px 14px;display:flex;flex-direction:column"><span style="font-size:11.5px;font-weight:700;letter-spacing:0.04em;color:#5A6482">WHO DOES IT</span><span style="font-size:18px;font-weight:700">${esc(rc.who)}</span></div>
      </div>
      ${rc.hasSelf ? `<div style="background:#FFF1C7;border-radius:10px;padding:10px 14px;display:flex;flex-direction:column;gap:3px"><span style="font-size:11.5px;font-weight:700;letter-spacing:0.04em;color:#6B4E00">NOTE TO SELF</span><span style="font-size:16px;line-height:1.45;white-space:pre-line">${esc(rc.self)}</span></div>` : ''}
    </div>`)}
</main>`;
}

function tTg(v) {
  const box = 'height:44px;border:1.5px solid #C9CFDE;border-radius:10px;padding:0 14px;font-size:16px;color:#14213D;background:#fff';
  const step = (n, title, body) => `<div style="display:flex;gap:14px;align-items:flex-start">
      <span style="flex:none;width:30px;height:30px;border-radius:8px;background:#2AABEE;color:#fff;display:grid;place-items:center;font-weight:700;font-size:15px">${n}</span>
      <div style="display:flex;flex-direction:column;gap:4px;font-size:15px;line-height:1.5;min-width:0;flex:1"><span style="font-weight:700;font-size:16px">${title}</span>${body}</div>
    </div>`;
  return `<main data-screen-label="Telegram bot" style="padding:36px 40px 56px;display:flex;flex-direction:column;gap:20px;max-width:900px">
  <div style="display:flex;flex-direction:column;gap:6px">
    <span style="font-family:'DM Mono';font-size:13px;letter-spacing:0.12em;color:#5A6482">TELEGRAM BOT</span>
    <h1 style="margin:0;font-family:'Bricolage Grotesque';font-size:40px;font-weight:700;letter-spacing:-0.02em">Send summaries in one tap</h1>
    <span style="font-size:15px;color:#5A6482">Your own bot posts the lesson message to each class group. Students see it from the bot, not from you.</span>
  </div>
  <div style="background:#fff;border:1px solid #E2E6F0;border-radius:18px;padding:22px 24px;display:flex;flex-direction:column;gap:22px">
    ${step(1, 'Make the bot', `<span>In Telegram, open <a href="https://t.me/BotFather" target="_blank" rel="noopener">@BotFather</a>, send <b>/newbot</b>, give it a name (for example <b>Java's English Class</b>) and a username ending in <b>bot</b>. BotFather replies with a token like <span style="font-family:'DM Mono'">123456:ABC…</span>. Copy it.</span>
      ${v.tgOn ? `<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;background:#DDF3EC;border-radius:10px;padding:10px 14px"><b style="color:#0F6B55">✓ Connected to ${esc(v.tgBot)}</b><button${click(v.tgForget)} style="margin-left:auto;${BTN_DEL};font-size:13px;padding:6px 10px;border-radius:8px">${esc(v.tgForgetLabel)}</button></div>`
      : `<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:4px"><input type="password" value="${esc(v.tgForm)}"${input(v.onTgForm)} autocomplete="off" placeholder="Paste the bot token" style="${box};flex:1;min-width:min(220px,100%)"><button${click(v.tgConnect)} style="border:none;background:#138A6E;color:#fff;font-weight:700;font-size:16px;padding:0 22px;border-radius:10px;cursor:pointer">${esc(v.tgConnectLabel)}</button></div>
      <span style="font-size:13px;color:#5A6482">The token is kept in this browser only. It is not in backups or on GitHub. On another device, paste it again.</span>`}`)}
    ${step(2, 'Add the bot to each class group', `<span>Open the class group → group name → <b>Add members</b> → search your bot's username. Then make it an <b>admin</b> (only "Post messages" is needed). Then write <b>hi</b> in the group, so the bot can see it.</span>`)}
    ${step(3, 'Link each class to its group', `${v.tgOn ? `<button${click(v.tgFind)} style="align-self:flex-start;border:none;background:#14213D;color:#fff;font-weight:700;font-size:15px;padding:10px 18px;border-radius:10px;cursor:pointer">${esc(v.tgFindLabel)}</button>
        <div style="display:flex;flex-direction:column;gap:8px;margin-top:6px">
          ${FOR(v.tgLinks, tl => `<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;border:1px solid #E2E6F0;border-radius:10px;padding:8px 12px">
              <span style="flex:1;min-width:200px;font-weight:600">${esc(tl.label)}</span>
              <select${input(tl.onPick)} style="height:38px;border:1.5px solid ${tl.linked ? '#138A6E' : '#C9CFDE'};border-radius:8px;padding:0 8px;font-size:14px;background:#fff;max-width:260px">${FOR(tl.opts, o => `<option value="${esc(o.id)}"${o.sel ? ' selected' : ''}>${esc(o.label)}</option>`)}</select>
              ${tl.linked ? `<button${click(tl.onTest)} style="border:1.5px solid #C9CFDE;background:#fff;font-weight:700;font-size:13px;padding:7px 10px;border-radius:8px;cursor:pointer">Send test</button>` : ''}
            </div>`)}
        </div>
        <span style="font-size:13px;color:#5A6482">Group not in the list? Write something in it, wait a few seconds, tap Find again. Links are saved with your lessons, so other devices get them too.</span>`
      : `<span style="color:#5A6482">Connect the bot in step 1 first.</span>`}`)}
    ${step(4, 'Send', `<span>On After class or Plan, open the Telegram message, check it, and tap <b>✈ Send to …</b> twice. The app remembers when each lesson was sent.</span>`)}
  </div>
</main>`;
}

function tSync(v) {
  const box = 'height:44px;border:1.5px solid #C9CFDE;border-radius:10px;padding:0 14px;font-size:16px;color:#14213D;background:#fff';
  const step = (n, title, body) => `<div style="display:flex;gap:14px;align-items:flex-start">
      <span style="flex:none;width:30px;height:30px;border-radius:8px;background:#14213D;color:#fff;display:grid;place-items:center;font-weight:700;font-size:15px">${n}</span>
      <div style="display:flex;flex-direction:column;gap:4px;font-size:15px;line-height:1.5"><span style="font-weight:700;font-size:16px">${title}</span>${body}</div>
    </div>`;
  return `<main data-screen-label="GitHub sync" style="padding:36px 40px 56px;display:flex;flex-direction:column;gap:20px;max-width:900px">
  <div style="display:flex;flex-direction:column;gap:6px">
    <span style="font-family:'DM Mono';font-size:13px;letter-spacing:0.12em;color:#5A6482">GITHUB SYNC</span>
    <h1 style="margin:0;font-family:'Bricolage Grotesque';font-size:40px;font-weight:700;letter-spacing:-0.02em">Keep your lessons safe</h1>
    <span style="font-size:15px;color:#5A6482">Every change is also saved to a private GitHub repository. If this browser loses its data, connect again and your lessons come back. GitHub keeps every old version too.</span>
  </div>
  ${IF(v.hasSyncMsg, () => `<div style="background:${esc(v.syncMsgBg)};color:${esc(v.syncMsgFg)};border-radius:12px;padding:12px 16px;font-size:15px;font-weight:600">${esc(v.syncMsg)}</div>`)}
  ${IF(v.syncOn, () => `<div style="background:#fff;border:1px solid #E2E6F0;border-left:6px solid ${esc(v.syncDot)};border-radius:14px;padding:18px 20px;display:flex;flex-direction:column;gap:10px">
      <span style="font-family:'Bricolage Grotesque';font-size:24px;font-weight:700">${esc(v.syncBig)}</span>
      ${IF(v.syncSmall, () => `<span style="font-size:14px;color:#5A6482">${esc(v.syncSmall)}</span>`)}
      <span style="font-size:15px">Repository: <a href="${esc(v.syncRepoUrl)}" target="_blank" rel="noopener">${esc(v.syncRepo)}</a> <span style="color:#5A6482">(the link shows every saved version)</span></span>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:4px">
        <button${click(v.doSync)} style="border:none;background:#138A6E;color:#fff;font-weight:700;font-size:15px;padding:11px 18px;border-radius:10px;cursor:pointer">Sync now</button>
        <button${click(v.askDisconnect)} style="${BTN_DEL};font-size:14px;padding:10px 16px;border-radius:10px">Disconnect</button>
      </div>
      ${IF(v.confirmDisconnect, () => `<div style="background:#FFE3E0;border:1.5px solid #D63A3A;border-radius:10px;padding:10px 14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <div style="flex:1;min-width:220px;display:flex;flex-direction:column"><span style="font-weight:700;font-size:15px">Disconnect from GitHub?</span><span style="font-size:12.5px;color:#8A2A2A">Lessons stay in this browser and on GitHub. New changes will not be sent.</span></div>
          <button${click(v.yesDisconnect)} style="border:none;background:#D63A3A;color:#fff;font-weight:700;font-size:13px;padding:8px 12px;border-radius:8px;cursor:pointer">Yes, disconnect</button>
          <button${click(v.keepConnect)} style="border:1.5px solid #8E97B5;background:#fff;font-weight:700;font-size:13px;padding:7px 12px;border-radius:8px;cursor:pointer">Keep it</button>
        </div>`)}
      <span style="font-size:13px;color:#5A6482">Your GitHub key is kept in this browser only. It is never in backups or on GitHub.</span>
    </div>`)}
  ${IF(v.syncOffForm, () => `<div style="background:#fff;border:1px solid #E2E6F0;border-radius:18px;padding:22px 24px;display:flex;flex-direction:column;gap:20px">
      <span style="font-family:'Bricolage Grotesque';font-size:24px;font-weight:700">Set up once, about 5 minutes</span>
      ${step(1, 'Make a private repository', `<span>On GitHub, create a new repository called <b>lesson-plan-data</b>. Choose <b>Private</b>. <a href="https://github.com/new" target="_blank" rel="noopener">Open GitHub</a></span>`)}
      ${step(2, 'Make a key for it', `<span><a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">Open the key page</a>, then:</span>
        <span>· Name: <b>Lesson Plan Builder</b>. Expiration: the longest you can choose.</span>
        <span>· Repository access: <b>Only select repositories</b>, then pick <b>lesson-plan-data</b>.</span>
        <span>· Permissions: <b>Contents</b>, set to <b>Read and write</b>.</span>
        <span>· Tap <b>Generate token</b> and copy it.</span>`)}
      ${step(3, 'Paste it here', `<div class="m-1col" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:4px">
          <label style="display:flex;flex-direction:column;gap:4px;font-size:13px;color:#5A6482">GitHub username<input value="${esc(v.form.owner)}"${input(v.onOwner)} autocomplete="off" style="${box}"></label>
          <label style="display:flex;flex-direction:column;gap:4px;font-size:13px;color:#5A6482">Repository<input value="${esc(v.form.repo)}"${input(v.onRepo)} autocomplete="off" style="${box}"></label>
          <label style="grid-column:1 / -1;display:flex;flex-direction:column;gap:4px;font-size:13px;color:#5A6482">Key<input type="password" value="${esc(v.form.token)}"${input(v.onToken)} autocomplete="off" placeholder="github_pat_…" style="${box}"></label>
        </div>
        <button${click(v.doConnect)} style="align-self:flex-start;margin-top:8px;border:none;background:#138A6E;color:#fff;font-weight:700;font-size:16px;padding:12px 24px;border-radius:10px;cursor:pointer">${esc(v.connectLabel)}</button>
        <span style="font-size:13px;color:#5A6482">The key only opens this one repository. It is kept in this browser only.</span>`)}
    </div>`)}
</main>`;
}

function tApp(v) {
  return `<div style="min-height:100vh;display:flex;background:#F2F4FA;color:#14213D;font-family:'DM Sans',system-ui,sans-serif">
${IF(v.showSide, () => tSidebar(v))}
<div style="flex:1;min-width:0;display:flex;flex-direction:column">
${IF(v.showJump, () => tJump(v))}
${IF(v.hasConflict, () => tConflict(v))}
<div data-k="scr-${esc(v.scrKey)}" class="fx-screen" style="display:flex;flex-direction:column">
${IF(v.isWeek, () => tWeek(v))}
${IF(v.isRoadmap, () => tRoadmap(v))}
${IF(v.isCarry, () => tCarry(v))}
${IF(v.isNotes, () => tNotes(v))}
${IF(v.isPlan, () => tPlan(v))}
${IF(v.isLive, () => tLiveHead(v))}
${IF(v.isStart, () => tStart(v))}
${IF(v.isMid, () => tMid(v))}
${IF(v.isAfter, () => tAfter(v))}
${IF(v.isCamb, () => tCamb(v))}
${IF(v.isCambAll, () => tCambAll(v))}
${IF(v.isTg, () => tTg(v))}
${IF(v.isRead, () => tRead(v))}
${IF(v.isSync, () => tSync(v))}
</div>
</div>
${IF(v.hasToast, () => `<div data-noprint="1" role="status" class="fx-toast" data-k="${esc(v.toast)}" style="position:fixed;left:50%;bottom:28px;transform:translateX(-50%);background:#14213D;color:#fff;font-weight:600;font-size:15px;padding:12px 20px;border-radius:12px;box-shadow:0 10px 30px rgba(20,33,61,.25);z-index:50">${esc(v.toast)}</div>`)}
</div>`;
}

// ---------- DOM patching (keeps focus and cursor while typing) ----------
function morph(from, to) {
  for (const a of Array.from(from.attributes)) if (!to.hasAttribute(a.name)) from.removeAttribute(a.name);
  for (const a of Array.from(to.attributes)) if (from.getAttribute(a.name) !== a.value) from.setAttribute(a.name, a.value);
  if (from.tagName === 'INPUT') { const val = to.getAttribute('value') || ''; if (from.value !== val) from.value = val; return; }
  if (from.tagName === 'TEXTAREA') { const val = to.textContent; if (from.value !== val) from.value = val; return; }
  if (from.tagName === 'SELECT') { morphChildren(from, to); const o = to.querySelector('option[selected]'); if (o && from.value !== o.value) from.value = o.value; return; }
  morphChildren(from, to);
}
function morphChildren(from, to) {
  const a = Array.from(from.childNodes), b = Array.from(to.childNodes);
  for (let i = 0; i < b.length; i++) {
    const x = a[i], y = b[i];
    if (!x) { from.appendChild(y); continue; }
    if (x.nodeType !== y.nodeType || (x.nodeType === 1 && x.tagName !== y.tagName)) { from.replaceChild(y, x); continue; }
    if (x.nodeType !== 1) { if (x.nodeValue !== y.nodeValue) x.nodeValue = y.nodeValue; continue; }
    if (x.getAttribute('data-k') !== y.getAttribute('data-k')) { from.replaceChild(y, x); continue; }
    morph(x, y);
  }
  for (let i = b.length; i < a.length; i++) from.removeChild(a[i]);
}

const app = new App();
const root = document.getElementById('app');
let handlers = [];

function render() {
  HANDLERS = [];
  const html = tApp(app.renderVals());
  handlers = HANDLERS;
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  morphChildren(root, tpl.content);
  root.querySelectorAll('textarea[data-autogrow]').forEach(t => { t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; });
}

function dispatch(e, type) {
  let stopped = false;
  const ev = { target: e.target, stopPropagation() { stopped = true; } };
  const fns = [];
  for (let el = e.target; el && el !== root; el = el.parentElement) {
    const i = el.getAttribute && el.getAttribute('data-' + type);
    if (i) fns.push(handlers[+i]);
  }
  for (const fn of fns) { if (fn) fn(ev); if (stopped) break; }
}
root.addEventListener('click', e => dispatch(e, 'click'));
root.addEventListener('input', e => dispatch(e, 'input'));

render();
app.mount();
