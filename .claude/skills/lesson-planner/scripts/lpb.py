#!/usr/bin/env python3
"""Read and write Java's Lesson Plan Builder data (lessons.json in the private lesson-plan-data repo).

The app syncs that file with GitHub: when this script pushes a new version, the app picks it up the
next time it checks (on open, on returning to the tab, or within ~5 minutes).

Commands
  status                      every group: next lesson date, roadmap unit/section, current draft, carry-over
  show  GROUP [--all]         the group's next-lesson draft (and with --all its taught lessons) in full
  write GROUP PLAN.json       put a plan into GROUP's next lesson (draft); see SKILL.md for the plan format
                              add --for SECTION (e.g. --for 2.2) to plan a later roadmap lesson ahead
                              add --dry-run to validate and preview without saving
                              add --replace to overwrite the current draft without keeping a copy
                              (only for revising a plan you wrote yourself that Java hasn't edited)
  set-aims GROUP AIMS.json    fill only the Cambridge aims of the next lesson (or --for SECTION); exercises untouched
  set-tg GROUP MSG.txt        set the Telegram message of the next lesson (or --for SECTION, or --date YYYY-MM-DD
                              for a lesson already taught)
  set-world GROUP WORLD.json  add the lesson-world book copy (lesson "book" look + each exercise's "world") to the next
                              lesson (or --for SECTION) without touching anything else; rows matched by page + num
  add-img FILE NAME           store a book picture as img/NAME in the data repo (shrunk to 1400 px wide when Pillow
                              is installed); use it in a world block as {"type": "image", "src": "img:NAME"}
  log [DAYS]                  write PLANS.md (the plan log: per group, what was taught, what is planned and
                              ready, what still needs a plan in the next DAYS days, default 14) and print it
  push  "message"             refresh PLANS.md, then commit lessons.json, PLANS.md and img/ and push them to GitHub

Options
  --data DIR                  folder of the lesson-plan-data clone (default: $LPB_DATA or /home/claude/lesson-plan-data)

Group ids: e-odd2 b-odd e-odd b30-odd (Mon/Wed/Fri)   b-even e-even p-even i-even (Tue/Thu/Sat)
"""
import json, os, random, re, shutil, string, subprocess, sys, time
from datetime import date, timedelta

KINDS = ['Grammar', 'Listening', 'Vocabulary', 'Speaking', 'Reading', 'Writing', 'Other']
WHO = ['On their own', 'All together, I lead', 'In pairs']
WHO_ALIASES = {'individual': WHO[0], 'individually': WHO[0], 'alone': WHO[0], 'own': WHO[0],
               'class': WHO[1], 'whole class': WHO[1], 'all together': WHO[1], 'frontal': WHO[1], 'teacher': WHO[1],
               'pairs': WHO[2], 'pair': WHO[2], 'pw': WHO[2], 'in pairs': WHO[2]}
LEVEL = {'beginner': 'Beginner', 'elementary': 'Elementary', 'preint': 'Pre-Intermediate', 'inter': 'Intermediate'}
# Roadmap copied from app.js (unit: book sections; * = all 4 pages in one lesson; skip = greyed out, takes no lesson)
RM = {
    'beginner': '0:1.1*|1:1.2*|2:1.3*|3:2.1 2.2|4:2.3 3.1|5:3.2 3.3|6:4.1 4.2|7:4.3 5.1|8:5.2 5.3|9:6.1 6.2|10:6.3 7.1|11:7.2 7.3|12:8.1 8.2|13:skip|14:8.3 9.1|15:9.2 9.3|16:skip|17:10.1 10.2|18:10.3 11.1|19:11.2 11.3|20:12.1 12.2|PREP:12.3|FE:FE FE',
    'elementary': '0:1.1*|1:1.2*|2:1.3*|3:2.1 2.2|4:skip|5:2.3 3.1|6:3.2 3.3|7:4.1 4.2|8:4.3 5.1|9:5.2 5.3|10:6.1 6.2|11:6.3 7.1|12:7.2 7.3|13:8.1 8.2|14:skip|15:8.3 9.1|16:9.2 9.3|17:10.1 10.2|18:10.3 11.1|19:11.2 11.3|20:12.1 12.2|PREP:12.3|FE:FE FE',
    'preint': '1:1.1 1.2|2:skip|3:1.3 2.1|4:2.2 2.3|5:3.1 3.2|6:skip|7:3.3 4.1|8:4.2 4.3|9:5.1 5.2|10:5.3 6.1|11:6.2 6.3|12:7.1 7.2|13:7.3 8.1|14:8.2 8.3|15:9.1 9.2|16:9.3 10.1|17:10.2 10.3|18:11.1 11.2|19:11.3 12.1|20:12.2 12.3|FE:FE FE',
    'inter': '1:1.1 1.2|2:1.3 2.1|3:skip|4:2.2 2.3|5:3.1 3.2|6:3.3 4.1|7:4.2 4.3|8:skip|9:5.1 5.2|10:5.3 6.1|11:6.2 6.3|12:7.1 7.2|13:7.3 8.1|14:8.2 8.3|15:9.1 9.2|16:9.3 10.1|17:10.2 10.3|18:11.1 11.2|19:11.3 12.1|20:12.2 12.3|FE:FE FE',
}


def die(msg):
    print('ERROR: ' + msg, file=sys.stderr)
    sys.exit(1)


def uid():
    return ''.join(random.choice(string.ascii_lowercase + string.digits) for _ in range(7))


def gslots(g):
    # the group's lesson order; slotSwap [[a, b]] = two lessons taught out of book order (same as the app)
    s = slots(g['level'])
    for a, b in g.get('slotSwap', []):
        if a < len(s) and b < len(s):
            s[a], s[b] = s[b], s[a]
    return s


def slots(level):
    out = []
    for part in RM[level].split('|'):
        u, r = part.split(':')
        if r == 'skip':
            continue
        secs = r.replace('*', '').split(' ')
        for i, s in enumerate(secs):
            out.append({'u': u, 'sec': s, 'i': i, 'n': len(secs), 'all': r.endswith('*')})
    return out


def unit_info(level, u):
    for part in RM[level].split('|'):
        k, r = part.split(':')
        if k.lower() == str(u).strip().lower().replace('unit', '').strip():
            return {'u': k, 'skip': r == 'skip', 'secs': [] if r == 'skip' else r.replace('*', '').split(' ')}
    return None


def is_type(d, t):
    return d.weekday() in ((0, 2, 4) if t == 'odd' else (1, 3, 5))


def next_day(g):
    """Same rule as the app: day after the last taught lesson (or today), skipping non-class and No-class days."""
    today = date.today()
    last = max((date.fromisoformat(t['date']) for t in g['taught']), default=None)
    d = last + timedelta(days=1) if last and last + timedelta(days=1) > today else today
    while not is_type(d, g['dayType']) or d.isoformat() in g['noClass']:
        d += timedelta(days=1)
    return d


def done_of(g):
    return sum(1 for t in g['taught'] if t.get('slot'))


def plan_for(g, k):
    if k == done_of(g) and not g['draft'].get('extra'):
        return g['draft']
    return next((p for p in g.get('plans') or [] if p.get('forSlot') == k and not p.get('extra')), None)


def has_own(L):
    return bool(L) and any(not e.get('fromCarry') for e in L['exercises'])


def slot_date(g, k):
    d = next_day(g)
    for _ in range(done_of(g), k):
        d += timedelta(days=1)
        while not is_type(d, g['dayType']) or d.isoformat() in g['noClass']:
            d += timedelta(days=1)
    return d


def sec_label(sl):
    if sl['u'] == 'FE':
        return f"Final exam {sl['i'] + 1}"
    u = 'Exam prep' if sl['u'] == 'PREP' else f"Unit {sl['u']}"
    return f"{u}{', Part ' + str(sl['i'] + 1) if sl['n'] > 1 else ''}"


def label(g):
    return f"{LEVEL[g['level']]}{' 30+' if g.get('is30') else ''}, {g['dayType']} days, {g['start']}"


ORDER = ['e-odd2', 'b-odd', 'e-odd', 'b30-odd', 'b-even', 'e-even', 'p-even', 'i-even']


def build_log(db, days=14):
    """Plain-text plan log for a fresh chat: what each group was taught, what is ready, what is missing."""
    from datetime import datetime
    today, end = date.today(), date.today() + timedelta(days=days)
    fmt = lambda d: d.strftime('%a %d %b')
    out = [f"# Lesson plan log", "",
           f"Written automatically by lpb.py on every push. Last update: {datetime.now().strftime('%a %d %b %Y %H:%M')}.",
           "lessons.json is the source of truth; this file is a readable summary of it.", ""]
    todo = {}
    body = []
    # lessons any group already has (taught or planned), so missing ones can be copied instead of rebuilt
    have = {}
    for gid, g in db['groups'].items():
        sl = gslots(g)
        hist = {h['id']: h for h in g['history']}
        for i, t in enumerate([t for t in g['taught'] if t.get('slot')]):
            h = hist.get(t.get('lessonId'))
            if i < len(sl) and h and has_own(h):
                have.setdefault(f"{g['level']} {sec_label(sl[i])}", f"{label(g).split(', ')[0]} {g['start']}, taught {fmt(date.fromisoformat(t['date']))}")
        for k in range(done_of(g), len(sl)):
            L = plan_for(g, k)
            if has_own(L):
                have.setdefault(f"{g['level']} {sec_label(sl[k])}", f"{label(g).split(', ')[0]} {g['start']}, planned for {fmt(slot_date(g, k))}")
    for gid in ORDER + [k for k in db['groups'] if k not in ORDER]:
        g = db['groups'].get(gid)
        if not g:
            continue
        sl, done = gslots(g), done_of(g)
        body += [f"## {label(g)} (`{gid}`)", f"Roadmap: {done} of {len(sl)} lessons taught.", "", "Taught (latest 4):"]
        hist = {h['id']: h for h in g['history']}
        taught = [t for t in g['taught'] if t.get('slot')]
        for i, t in list(enumerate(taught))[-4:]:
            h = hist.get(t.get('lessonId'), {})
            sent = 'Telegram sent' if h.get('tgSent') else 'Telegram skipped' if h.get('tgSkip') else 'Telegram not sent'
            body.append(f"- {fmt(date.fromisoformat(t['date']))} · {sec_label(sl[i]) if i < len(sl) else 'Unit ' + str(t['unit'])}"
                        f"{' · ' + h['name'] if h.get('name') else ''} · {sent}")
        body += ["", "Next lessons:"]
        for k in range(done, len(sl)):
            d = slot_date(g, k)
            if d > end:
                break
            L = plan_for(g, k)
            if has_own(L):
                own = [e for e in L['exercises'] if not e.get('skipped')]
                mins = sum(e.get('min') for e in own if isinstance(e.get('min'), int))
                carry = sum(1 for e in L['exercises'] if e.get('fromCarry'))
                mykey = sum(1 for e in own if 'my key' in (e.get('self') or ''))
                bits = [f"{len(own)} rows, {mins} min", 'Telegram ready' if L.get('tg') else 'no Telegram message',
                        f"{carry} carried over" if carry else '', f"{mykey} rows with my key (check before class)" if mykey else '']
                body.append(f"- {fmt(d)} · {sec_label(sl[k])} · {L.get('name') or ''} · READY ({', '.join(b for b in bits if b)})")
            else:
                body.append(f"- {fmt(d)} · {sec_label(sl[k])} · NEEDS A PLAN")
                key = (g['level'], sec_label(sl[k]))
                todo.setdefault(key, []).append((d, f"{label(g).split(', ')[0]} {g['start']} {fmt(d)}"))
        waiting = [c for c in db.get('carry', []) if c.get('groupId') == gid]
        if waiting:
            body.append(f"Carry-over waiting: " + '; '.join(f"p.{c['ex'].get('page', '')} ex {c['ex'].get('num', '')}" for c in waiting))
        body.append("")
    out += [f"## Still to plan (next {days} days)", ""]
    if todo:
        for (lv, sec), v in sorted(todo.items(), key=lambda kv: min(x[0] for x in kv[1])):
            src = have.get(f"{lv} {sec}")
            out.append(f"- **{LEVEL[lv]} {sec}**: {', '.join(x[1] for x in sorted(v))}"
                       + (f" · copy from {src} (no new pages needed)" if src else " · needs CB + TB pages"))
    else:
        out.append("- Nothing. Every lesson in this period has a plan.")
    out.append("")
    return '\n'.join(out + body)


def write_log(d, db, days=14):
    with open(os.path.join(d, 'PLANS.md'), 'w', encoding='utf-8') as f:
        f.write(build_log(db, days))


def data_dir(args):
    if '--data' in args:
        i = args.index('--data')
        d = args[i + 1]
        del args[i:i + 2]
        return d
    return os.environ.get('LPB_DATA', '/home/claude/lesson-plan-data')


def load(d):
    p = os.path.join(d, 'lessons.json')
    if not os.path.exists(p):
        die(f'{p} not found. Attach and clone JavaIT-Teach/lesson-plan-data first (see SKILL.md).')
    with open(p, encoding='utf-8') as f:
        return json.load(f)


def save(d, db):
    db['updatedAt'] = int(time.time() * 1000)
    with open(os.path.join(d, 'lessons.json'), 'w', encoding='utf-8') as f:
        json.dump(db, f, ensure_ascii=False, separators=(',', ':'))


def git(d, *a):
    r = subprocess.run(['git', '-C', d] + list(a), capture_output=True, text=True)
    if r.returncode:
        die(f"git {' '.join(a)} failed: {r.stderr.strip()}")
    return r.stdout.strip()


def ex_line(i, e):
    if e.get('skipped'):
        return f"  {i}. SKIP  p.{e.get('page','')} ex.{e.get('num','')}"
    mins = e['min'] if e.get('min') not in (None, 'other') else (e.get('otherMin') or '-')
    extra = f" [{e['grammar']}]" if e.get('kind') == 'Grammar' and e.get('grammar') else f" [Track {e['track']}]" if e.get('kind') == 'Listening' and e.get('track') else ''
    carry = '  (carried over)' if e.get('fromCarry') else ''
    carry += '  [book copy]' if e.get('world') else ''
    s = f"  {i}. {e.get('kind') or '?'}{extra}  p.{e.get('page','')} ex.{e.get('num','')}  {e.get('who') or '?'}  {mins} min{carry}"
    if e.get('note'):
        s += f"\n       note: {e['note']}"
    if e.get('self'):
        s += f"\n       self: {e['self']}"
    return s


def show_lesson(title, L):
    total = sum(int(e['min']) for e in L['exercises'] if not e.get('skipped') and isinstance(e.get('min'), int))
    print(f"{title}: Unit {L.get('unit') or '?'}{' · ' + L['name'] if L.get('name') else ''}  ({len(L['exercises'])} exercises, {total} min + 5-7 warm-up)")
    for i, e in enumerate(L['exercises'], 1):
        print(ex_line(i, e))


def cmd_status(db):
    for gid, g in db['groups'].items():
        done = sum(1 for t in g['taught'] if t.get('slot'))
        sl = gslots(g)
        nxt = sl[done] if done < len(sl) else None
        where = sec_label(nxt) if nxt else 'course finished'
        dr = g['draft']
        own = [e for e in dr['exercises'] if not e.get('fromCarry')]
        carry = [c for c in db['carry'] if c['groupId'] == gid and c['lessonId'] != dr['id']]
        print(f"{gid:8} {label(g):36} next {next_day(g).strftime('%a %d %b')} · {where} · {done}/38 done")
        ahead = []
        for k in range(done, len(sl)):
            if has_own(plan_for(g, k)):
                ahead.append(sec_label(sl[k]))
            else:
                print(f"         next LP to prepare: {sec_label(sl[k])} for {slot_date(g, k).strftime('%a %d %b')}"
                      + (f" · already planned: {', '.join(ahead)}" if ahead else ''))
                break
        print(f"         draft: Unit {dr.get('unit') or '?'} {dr.get('name') or ''} · {len(own)} own exercises"
              f"{' · ' + str(len(dr['exercises']) - len(own)) + ' carried-over in plan' if len(own) < len(dr['exercises']) else ''}"
              f" · {len(carry)} waiting in carry-over{' · LESSON IN PROGRESS' if dr['run'].get('lessonStart') else ''}")


def cmd_show(db, gid, all_):
    g = db['groups'].get(gid) or die(f'unknown group {gid}')
    print(label(g))
    show_lesson(f"Next lesson ({next_day(g).strftime('%a %d %b')})", g['draft'])
    print('  aims: ' + json.dumps(g['draft']['aims'], ensure_ascii=False))
    for p in sorted([p for p in g.get('plans') or [] if p.get('forSlot') is not None and p['forSlot'] > done_of(g)], key=lambda p: p['forSlot']):
        show_lesson(f"Planned ahead for {sec_label(gslots(g)[p['forSlot']])} ({slot_date(g, p['forSlot']).strftime('%a %d %b')})", p)
    used = [L['aims'].get('personal') for L in g['history'][-4:] + [g['draft']] if L['aims'].get('personal')]
    if used:
        print('Recent personal aims (pick a different one): ' + ' | '.join(used))
    carry = [c for c in db['carry'] if c['groupId'] == gid and c['lessonId'] != g['draft']['id']]
    if carry:
        print('Carry-over waiting (only for this group):')
        for c in carry:
            print(f"  - p.{c['ex'].get('page','')} ex.{c['ex'].get('num','')} {c['ex'].get('note','')} ({c['mark']})")
    if all_:
        for h in g['history']:
            show_lesson(f"Taught {h.get('date')}", h)


# ---------- lesson world (world.html in the app): a copy of the book page ----------
BLOCKS = {'words': ['items'], 'list': ['items'], 'match': ['left', 'right'], 'table': ['rows'], 'rule': ['items'],
          'text': ['body'], 'dialogue': ['lines'], 'answers': ['items'], 'image': ['src'], 'break': []}
HEX = re.compile(r'^#[0-9a-fA-F]{6}$')
DATA = None  # data repo folder, set in main(); used to check that pictures exist


def check_world(w, n):
    if not isinstance(w, dict):
        die(f"exercise {n}: world must be an object with rubric and blocks")
    if not str(w.get('rubric', '')).strip():
        print(f"warning: exercise {n}: world has no rubric (the book's instruction line)", file=sys.stderr)
    for j, b in enumerate(w.get('blocks') or [], 1):
        t = b.get('type') if isinstance(b, dict) else None
        if t not in BLOCKS:
            die(f"exercise {n}, block {j}: type must be one of {sorted(BLOCKS)}, got {t!r}")
        miss = [k for k in BLOCKS[t] if not b.get(k)]
        if miss:
            die(f"exercise {n}, block {j} ({t}): missing {', '.join(miss)}")
        if t == 'list' and b.get('answers'):
            gaps = sum(len(re.findall(r'_{3,}', str(i))) for i in b['items'])
            want = gaps or len(b['items'])
            if len(b['answers']) != want:
                print(f"warning: exercise {n}, block {j}: {len(b['answers'])} answers for {want} {'gaps' if gaps else 'items'}", file=sys.stderr)
        if t == 'image' and str(b['src']).startswith('img:') and DATA and not os.path.exists(os.path.join(DATA, 'img', b['src'][4:])):
            print(f"warning: exercise {n}: picture {b['src']} is not in img/ yet; store it with add-img", file=sys.stderr)


def check_book(bk):
    if not isinstance(bk, dict):
        die('book must be an object: unitColor, sections, numStyle, headStyle, font')
    for k, v in [('unitColor', bk.get('unitColor'))] + [(f'sections[{s}]', c) for s, c in (bk.get('sections') or {}).items()]:
        if v is not None and not HEX.match(str(v)):
            die(f'book {k}: colour must look like #1C7ED6, got {v!r}')
    for k, ok in (('numStyle', ('circle', 'square', 'plain')), ('headStyle', ('band', 'tab', 'text')), ('font', ('sans', 'rounded', 'serif'))):
        if bk.get(k) is not None and bk[k] not in ok:
            die(f'book {k} must be one of {ok}')
    return bk


def build_ex(x, n, presets):
    e = {'id': uid(), 'page': str(x.get('page', '')), 'num': str(x.get('num', '')), 'kind': x.get('kind', ''),
         'grammar': x.get('grammar', ''), 'track': str(x.get('track', '')), 'note': x.get('note', ''),
         'who': x.get('who', ''), 'min': x.get('min'), 'otherMin': '', 'self': x.get('self', ''),
         'skipped': bool(x.get('skipped')), 'saved': True, 'fromCarry': None}
    if x.get('sec'):
        e['sec'] = x['sec']
    if x.get('world'):
        check_world(x['world'], n)
        e['world'] = x['world']
    if e['skipped']:
        return e
    if e['kind'] not in KINDS:
        die(f"exercise {n}: kind must be one of {KINDS}, got {e['kind']!r}")
    w = str(e['who']).strip()
    e['who'] = w if w in WHO else WHO_ALIASES.get(w.lower(), w)
    if e['who'] not in WHO:
        die(f"exercise {n}: who must be one of {WHO}, got {x.get('who')!r}")
    if e['min'] is not None:
        try:
            e['min'] = int(e['min'])
        except (TypeError, ValueError):
            die(f"exercise {n}: min must be a whole number")
        if e['min'] not in presets:
            presets.add(e['min'])  # becomes a preset button in the app, like typing it under "Other"
    if e['kind'] != 'Grammar':
        e['grammar'] = ''
    if e['kind'] != 'Listening':
        e['track'] = ''
    if e['kind'] == 'Grammar' and not e['grammar']:
        print(f"warning: exercise {n} is Grammar but has no grammar point", file=sys.stderr)
    return e


def cmd_write(db, gid, plan_path, dry, replace=False, sec=None):
    g = db['groups'].get(gid) or die(f'unknown group {gid}')
    with open(plan_path, encoding='utf-8') as f:
        plan = json.load(f)
    done, sl = done_of(g), gslots(g)
    k = done
    if sec:
        k = next((i for i in range(done, len(sl)) if sec in (sl[i]['sec'], sec_label(sl[i]))), None)
        if k is None:
            die(f"{sec} is not an upcoming {LEVEL[g['level']]} roadmap lesson. Upcoming: {', '.join(sec_label(x) for x in sl[done:done + 6])}")
    ahead_new = None
    if k == done:
        dr = g['draft']
        if dr['run'].get('lessonStart'):
            die(f'{label(g)}: the lesson is in progress in the app. Finish it first.')
    else:
        dr = plan_for(g, k)
        if not dr:
            ahead_new = dr = {'id': uid(), 'unit': sl[k]['u'], 'name': '', 'date': None, 'exercises': [],
                              'aims': {'main': '', 'sub': '', 'personal': '', 'prob1': '', 'prob2': ''},
                              'run': {'lessonStart': None, 'warmDone': False, 'idx': None, 'status': {}, 'curStart': None},
                              'results': {}, 'drop': {}, 'notes': [], 'forSlot': k}
        if not plan.get('unit'):
            plan['unit'] = sl[k]['u']
        elif str(plan['unit']) != sl[k]['u']:
            print(f"warning: plan says Unit {plan['unit']} but {sec} is {sec_label(sl[k])}", file=sys.stderr)
    base = {1, 2, 3, 5, 7, 15, 20}
    presets = base | set(db.get('customMins') or [])
    exs = [build_ex(x, i, presets) for i, x in enumerate(plan.get('exercises', []), 1)]
    if not exs:
        die('plan has no exercises')
    unit = str(plan.get('unit') or dr.get('unit') or '')
    ui = unit_info(g['level'], unit)
    if not ui:
        print(f"warning: Unit {unit} is not on the {LEVEL[g['level']]} roadmap", file=sys.stderr)
    elif ui['skip']:
        print(f"warning: Unit {unit} is a skippable (greyed-out) unit for {LEVEL[g['level']]}", file=sys.stderr)
    keep_carry = [e for e in dr['exercises'] if e.get('fromCarry')]
    old_own = [e for e in dr['exercises'] if not e.get('fromCarry')]
    new = dict(dr)
    new.update({'unit': unit, 'name': plan.get('name', dr.get('name', '')), 'exercises': keep_carry + exs})
    if plan.get('book'):
        new['book'] = check_book(plan['book'])
    if not new.get('book') or not any(e.get('world') for e in exs if not e['skipped']):
        print('warning: no lesson-world copy (book + world); the skill should write one so the board matches the book', file=sys.stderr)
    if plan.get('telegram'):
        new['tg'] = plan['telegram'].strip()
    elif not new.get('tg'):
        print('warning: no telegram message in the plan; the skill should write one', file=sys.stderr)
    if plan.get('aims'):
        new['aims'] = {**dr['aims'], **{k: v for k, v in plan['aims'].items() if k in dr['aims']}}
    total = sum(e['min'] for e in exs if not e['skipped'] and isinstance(e['min'], int))
    print(f"{label(g)} · {'next lesson' if k == done else 'planned ahead: ' + sec_label(sl[k])} {slot_date(g, k).strftime('%a %d %b')}")
    if not any((new.get('aims') or {}).values()):
        print('warning: aims are empty; the skill should fill main, sub, personal, prob1, prob2', file=sys.stderr)
    show_lesson('New plan', new)
    if total + 7 > 82 or total + 5 < 70:
        print(f"warning: exercises add up to {total} min; with the 5-7 min warm-up the lesson is {total + 5}-{total + 7} of 80", file=sys.stderr)
    if dry:
        print('(dry run: nothing saved)')
        return
    if (old_own or dr.get('name')) and not replace:
        old = json.loads(json.dumps(dr))
        old.update({'id': uid(), 'savedAt': int(time.time() * 1000), 'exercises': old_own})
        old.pop('forSlot', None)
        g['plans'] = (g.get('plans') or []) + [old]
        print(f"The previous plan for this lesson ({len(old_own)} exercises) was moved to Saved lessons.")
    if k == done:
        g['draft'] = new
    else:
        g['plans'] = [p for p in g.get('plans') or [] if p is not dr] + [new]
    added = sorted(presets - base - set(db.get('customMins') or []))
    if added:
        db['customMins'] = (db.get('customMins') or []) + added
    return True


def main():
    args = sys.argv[1:]
    d = data_dir(args)
    if not args or args[0] in ('-h', '--help'):
        print(__doc__)
        return
    c = args[0]
    if c == 'push':
        msg = args[1] if len(args) > 1 else 'Lesson plan written by Claude'
        write_log(d, load(d))
        git(d, 'add', 'lessons.json', 'PLANS.md')
        if os.path.isdir(os.path.join(d, 'img')):
            git(d, 'add', 'img')
        if not git(d, 'status', '--porcelain'):
            print('nothing to push')
            return
        git(d, '-c', 'user.name=JavaIT-Teach', '-c', 'user.email=javahirahmedov@gmail.com', 'commit', '-q', '-m', msg)
        git(d, 'push', '-q', 'origin', 'HEAD')
        print('pushed: ' + git(d, 'log', '--oneline', '-1'))
        return
    global DATA
    DATA = d
    if c == 'add-img':
        src, name = args[1], args[2].replace('\\', '/').lstrip('/')
        if not re.match(r'^[\w./-]+\.(png|jpe?g|webp)$', name, re.I) or '..' in name:
            die('NAME must be like beginner/p16-ex1.png (letters, digits, - _ / and .png .jpg or .webp)')
        out = os.path.join(d, 'img', name)
        os.makedirs(os.path.dirname(out), exist_ok=True)
        try:
            from PIL import Image
            im = Image.open(src)
            if im.width > 1400:
                im = im.resize((1400, round(im.height * 1400 / im.width)))
            im.save(out)
        except Exception:  # no Pillow, or a format it can't read: keep the file as it is
            shutil.copyfile(src, out)
        kb = os.path.getsize(out) // 1024
        print(f'stored img/{name} ({kb} KB). Use {{"type": "image", "src": "img:{name}"}}')
        if kb > 600:
            print('warning: big picture; crop it tighter so the board loads it fast', file=sys.stderr)
        return
    db = load(d)
    if c == 'log':
        days = int(args[1]) if len(args) > 1 and args[1].isdigit() else 14
        write_log(d, db, days)
        print(build_log(db, days))
        return
    if c == 'status':
        cmd_status(db)
    elif c == 'show':
        cmd_show(db, args[1], '--all' in args)
    elif c == 'set-aims':
        sec = None
        if '--for' in args:
            i = args.index('--for'); sec = args[i + 1]; del args[i:i + 2]
        g = db['groups'].get(args[1]) or die(f'unknown group {args[1]}')
        sl, done = gslots(g), done_of(g)
        k = done if not sec else next((i for i in range(done, len(sl)) if sec in (sl[i]['sec'], sec_label(sl[i]))), None)
        L = plan_for(g, k) if k is not None else None
        if not L:
            die('no plan for that lesson yet')
        with open(args[2], encoding='utf-8') as f:
            aims = json.load(f)
        bad = set(aims) - set(L['aims'])
        if bad:
            die(f'unknown aim fields {bad}; use main, sub, personal, prob1, prob2')
        L['aims'].update(aims)
        save(d, db)
        print('aims set: ' + json.dumps(L['aims'], ensure_ascii=False, indent=1))
    elif c == 'set-tg':
        sec = date_ = None
        if '--for' in args:
            i = args.index('--for'); sec = args[i + 1]; del args[i:i + 2]
        if '--date' in args:
            i = args.index('--date'); date_ = args[i + 1]; del args[i:i + 2]
        g = db['groups'].get(args[1]) or die(f'unknown group {args[1]}')
        if date_:
            L = next((h for h in g['history'] if h.get('date') == date_), None)
        else:
            sl, done = gslots(g), done_of(g)
            k = done if not sec else next((i for i in range(done, len(sl)) if sec in (sl[i]['sec'], sec_label(sl[i]))), None)
            L = plan_for(g, k) if k is not None else None
        if not L:
            die('no lesson found for that group / date / section')
        with open(args[2], encoding='utf-8') as f:
            L['tg'] = f.read().strip()
        save(d, db)
        print(f"telegram message set ({len(L['tg'])} chars) on Unit {L.get('unit')} {L.get('name') or ''}")
        if len(L['tg']) > 4000:
            print('warning: Telegram messages are limited to 4096 characters', file=sys.stderr)
    elif c == 'set-world':
        sec = None
        if '--for' in args:
            i = args.index('--for'); sec = args[i + 1]; del args[i:i + 2]
        g = db['groups'].get(args[1]) or die(f'unknown group {args[1]}')
        sl, done = gslots(g), done_of(g)
        k = done if not sec else next((i for i in range(done, len(sl)) if sec in (sl[i]['sec'], sec_label(sl[i]))), None)
        L = plan_for(g, k) if k is not None else None
        if not L:
            die('no plan for that lesson yet; write the plan first')
        with open(args[2], encoding='utf-8') as f:
            wd = json.load(f)
        if wd.get('book'):
            L['book'] = check_book(wd['book'])
        key = lambda e: (str(e.get('page', '')).strip(), str(e.get('num', '')).strip().lower())
        rows = {key(e): e for e in L['exercises']}
        for n, x in enumerate(wd.get('exercises', []), 1):
            e = rows.get(key(x))
            if not e:
                print(f"warning: no row p.{x.get('page','')} ex.{x.get('num','')} in the plan; skipped", file=sys.stderr)
                continue
            check_world(x['world'], n)
            e['world'] = x['world']
        save(d, db)
        show_lesson('Lesson world copy added', L)
    elif c == 'write':
        dry, replace = '--dry-run' in args, '--replace' in args
        sec = None
        if '--for' in args:
            i = args.index('--for'); sec = args[i + 1]; del args[i:i + 2]
        args = [a for a in args if a not in ('--dry-run', '--replace')]
        if cmd_write(db, args[1], args[2], dry, replace, sec):
            save(d, db)
            print('saved lessons.json (run: lpb.py push "message")')
    else:
        die('unknown command ' + c)


if __name__ == '__main__':
    main()
