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
  push  "message"             commit lessons.json and push it to GitHub

Options
  --data DIR                  folder of the lesson-plan-data clone (default: $LPB_DATA or /home/claude/lesson-plan-data)

Group ids: e-odd2 b-odd e-odd b30-odd (Mon/Wed/Fri)   b-even e-even p-even i-even (Tue/Thu/Sat)
"""
import json, os, random, string, subprocess, sys, time
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
    return g['draft'] if k == done_of(g) else next((p for p in g.get('plans') or [] if p.get('forSlot') == k), None)


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
    return f"{u}{', Part ' + str(sl['i'] + 1) if sl['n'] > 1 else ''} ({sl['sec']})"


def label(g):
    return f"{LEVEL[g['level']]}{' 30+' if g.get('is30') else ''}, {g['dayType']} days, {g['start']}"


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
        sl = slots(g['level'])
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
        show_lesson(f"Planned ahead for {sec_label(slots(g['level'])[p['forSlot']])} ({slot_date(g, p['forSlot']).strftime('%a %d %b')})", p)
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


def build_ex(x, n, presets):
    e = {'id': uid(), 'page': str(x.get('page', '')), 'num': str(x.get('num', '')), 'kind': x.get('kind', ''),
         'grammar': x.get('grammar', ''), 'track': str(x.get('track', '')), 'note': x.get('note', ''),
         'who': x.get('who', ''), 'min': x.get('min'), 'otherMin': '', 'self': x.get('self', ''),
         'skipped': bool(x.get('skipped')), 'saved': True, 'fromCarry': None}
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
    done, sl = done_of(g), slots(g['level'])
    k = done
    if sec:
        k = next((i for i in range(done, len(sl)) if sl[i]['sec'] == sec), None)
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
        git(d, 'add', 'lessons.json')
        if not git(d, 'status', '--porcelain'):
            print('nothing to push')
            return
        git(d, '-c', 'user.name=JavaIT-Teach', '-c', 'user.email=javahirahmedov@gmail.com', 'commit', '-q', '-m', msg)
        git(d, 'push', '-q', 'origin', 'HEAD')
        print('pushed: ' + git(d, 'log', '--oneline', '-1'))
        return
    db = load(d)
    if c == 'status':
        cmd_status(db)
    elif c == 'show':
        cmd_show(db, args[1], '--all' in args)
    elif c == 'set-aims':
        sec = None
        if '--for' in args:
            i = args.index('--for'); sec = args[i + 1]; del args[i:i + 2]
        g = db['groups'].get(args[1]) or die(f'unknown group {args[1]}')
        sl, done = slots(g['level']), done_of(g)
        k = done if not sec else next((i for i in range(done, len(sl)) if sl[i]['sec'] == sec), None)
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
            sl, done = slots(g['level']), done_of(g)
            k = done if not sec else next((i for i in range(done, len(sl)) if sl[i]['sec'] == sec), None)
            L = plan_for(g, k) if k is not None else None
        if not L:
            die('no lesson found for that group / date / section')
        with open(args[2], encoding='utf-8') as f:
            L['tg'] = f.read().strip()
        save(d, db)
        print(f"telegram message set ({len(L['tg'])} chars) on Unit {L.get('unit')} {L.get('name') or ''}")
        if len(L['tg']) > 4000:
            print('warning: Telegram messages are limited to 4096 characters', file=sys.stderr)
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
