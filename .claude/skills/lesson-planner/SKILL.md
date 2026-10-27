---
name: lesson-planner
description: Turns coursebook pages plus teacher's book pages into a lesson plan in Java's Lesson Plan Builder app, written in Java's own style, with a faithful copy of each coursebook exercise for the app's 3D lesson world (the board students see), and saves it into the right group's next lesson (synced through the private lesson-plan-data repo). Use when Java shares coursebook / teacher's book pages (images or PDF) and asks to plan, prepare or build a lesson for one of his groups, or asks to put a plan into the lesson plan builder.
---

# Lesson planner for the Lesson Plan Builder

Java teaches 7 English groups at Cambridge Learning Centre. He plans lessons in his own web app,
https://javait-teach.github.io/lesson-plan-builder/. The app's data is one file, `lessons.json`, in the
**private** repo `JavaIT-Teach/lesson-plan-data`. The app syncs with that file on its own: when you push a
new version, it shows up in the app the next time the app checks (on open, on returning to the tab, or
within about 5 minutes).

Your job: read the coursebook and teacher's book pages he gives you, convert them into his plan format
**the way he does it himself**, write the plan into the group's next lesson, and push it. He then adjusts
it by hand in the app.

## How to talk to Java about lessons

Java only uses **"Unit 3, Part 2"** (Part only when a unit takes two lessons). **Never show him book-section
numbers like 2.1 or 2.2.** They are internal roadmap codes. `--for` accepts either, e.g. `--for "Unit 4, Part 1"`. When you
need to find the section for a unit and part, use `status`, or `slots()` in lpb.py.

## Step 0: set up the data repo (once per session)

1. If `/home/claude/lesson-plan-data/lessons.json` doesn't exist, attach the repo with `add_repo`
   (owner `JavaIT-Teach`, repo `lesson-plan-data`, access `push`). Then clone it to
   `/home/claude/lesson-plan-data` as the tool result says. If it already exists, run `git pull --ff-only`
   in it.
2. The helper script is `scripts/lpb.py` in this skill folder. Run it with `python3`. It reads
   `$LPB_DATA` or `--data DIR`, and defaults to `/home/claude/lesson-plan-data`.

## Step 1: check the input and the group

1. Run `python3 scripts/lpb.py status`. It shows each group's next lesson as "Unit 3, Part 1 (2.1)",
   its date, the **next lesson still to be prepared** (Java often plans a few ahead), what is already
   planned, and the carry-over. Always name lessons this way: Unit number, Part 1 or 2 when the unit
   takes two lessons, and the book section in brackets.
2. Work out which roadmap lesson the pages are for. Match the CB pages to a book section. If it isn't
   the group's next lesson, it is a lesson planned **ahead**: write it with `--for SECTION`, e.g.
   `--for 2.2`. If unsure, ask: "Is this Unit 4, Part 1 (2.2) for Thu 15 Oct?"
3. Work out which group the plan is for. If Java didn't say, ask. Group ids:
   - Odd days: `e-odd2` Elementary 10:30, `b-odd` Beginner 15:30, `e-odd` Elementary 17:00, `b30-odd` Beginner 30+ 18:30
   - Even days: `b-even` Beginner 14:00, `e-even` Elementary 15:30, `p-even` Pre-Intermediate 17:00,
     `i-even` Intermediate 18:30
4. Wait until he says all pages are uploaded. He can only attach 5 images per message and will say
   "all done". Don't start before that.
5. Sort the pages into **coursebook (CB)** and **teacher's book (TB)**, and match every CB exercise to its
   TB notes. If a TB page or a CB page is missing for a section, say so plainly. Plan that section from
   what you have, and mark it in the plan's `self` as "TB page missing".
6. The CB page number of a section is often not visible in a cropped image. Use the visible page number
   from the same spread, or the footer (for example "BEST FRIENDS FOREVER 17"). If you are not sure,
   **say which pages you assumed** in your summary.

## Step 2: convert. Read `reference/model-plan-preint-u3.md` first

Every plan has **two layers**:
1. **The teacher's plan** (note, self, who, min…): Java's voice, for Java only. This step and the field list below.
2. **The book copy** (`book` + each row's `world`): what the **students** see on the interactive board in the app's
   lesson world. Step 2b. It must look and read like the coursebook page they hold.

That file is Java's own plan, built from CB + TB. It is the model for voice, density and choices. Rules:

**Rows**
- One row per numbered CB exercise, in CB order. Each section (Grammar, Vocabulary, Listening,
  Speaking, Reading, Writing) restarts at ex 1, so the same page can have Grammar ex 1 and Vocabulary
  ex 1.
- Unnumbered CB parts that are real activities (for example "About you", "Talking points") get their own
  row, with the part's name as `num`.
- The TB **Warmer** is **its own row**, placed before the first exercise of its section, with `num` =
  `Warmer`. Kind and grammar are the same as that section, and it is usually In pairs or All together,
  2–4 min. It is NOT Java's warm-up: the app's fixed Warm-up row is his own warm-up app, so never
  touch or mention it. Exercise 1 then starts after the Warmer.
- If Java asks to **review** something (e.g. "review to be"), add a row right at the top, before the
  Warmer: `num` = `Review`, `page` empty, kind Grammar (or Vocabulary) with the point in `grammar`, and
  All together, 4–6 min. Give a quick board prompt in `note` and concrete prompts and questions in `self`.
  The Cambridge copy shows it as its own Review stage.
- The TB **Cooler** becomes a final row with `num` = `Cooler` when the lesson has room (Java approved
  this). Use the kind of the activity, for example Speaking for a class survey. Otherwise mention it in
  the summary.
- "Prepare for the exam page 130" references and Grammar Reference pointers are not rows. Put them in
  `self` if useful.

**Four-page lessons.** Some roadmap units are one lesson covering **all 4 pages** (e.g. Beginner and
Elementary Units 0–2; `status` and the app show "One lesson · all 4 pages at once"). Java is sometimes asked
to teach all 4 pages in one lesson. Then:
- Include **every section** on all 4 pages (vocabulary, grammar, reading, listening, speaking, writing).
  Never leave a whole section out.
- Compress: 2–4 min per exercise, merge small follow-up exercises into one row (e.g. `num` "1-2"), make
  speaking tasks short pair work.
- Drop or shorten extras first: the TB Warmer, Cooler, Talking Points, fast-finisher ideas.
- The total must still be about 73–75 min. In the report, say what was squeezed or dropped.
- If unsure whether Java wants all 4 pages or only 2, ask once before building.

**Fields** (these are exactly the app's fields)
- `page`: CB page. `num`: CB exercise number.
- `sec`: the CB section heading the row sits under, copied from the book (e.g. `Vocabulary · Daily routines`,
  `Grammar · Present Simple`, `Listening`, `Talking Points`). Same text on every row of that section. The app
  shows it as a header over the rows, so the plan reads like the book. Leave it off Warmer / Review / Cooler rows.
- `kind`: the CB section heading: Grammar, Listening, Vocabulary, Speaking, Reading, Writing or Other.
  Everything inside a Writing section is Writing, even reading the model text.
- `grammar` (Grammar rows only, always filled): the grammar point, for example `-ing forms` or
  `Comparatives & Superlatives`.
- `track` (Listening rows only): the audio number from the speaker icon next to that exercise in the CB or
  TB, for example `06`, or `Video 03`. **Every exercise with an audio icon needs its track.** If the
  exercise has audio but sits in a Speaking section (for example "Listen to an interview"), keep kind
  Speaking and write the track at the start of `note`: `Track 07: …`. The app only shows `track` for
  Listening rows. (Java confirmed this.)
- `note` (one short line, shown big during the lesson): what Java does or says. Imperative, terse, his
  style: abbreviations like Ss, ex-le, 1st are fine. Take the one or two TB moves that matter: lead-in
  question, concept check, "do 1st together", "model …", "Ss predict …", "nominate Ss to read answers",
  "check words in brackets". Never paste the TB paragraph.
- `self` (Note to self, shown in yellow): answer keys, compressed (`1 going 2 Learning 3 preparing`).
  Also TB tips worth having in the moment: mixed ability, fast finishers, stress or pronunciation points,
  exam tips. For long production tasks, add the TB steps as a short checklist. Keep it scannable.
- `who`: `On their own` | `All together, I lead` | `In pairs`. Use the TB's main mode:
  - "individually", or "individually then compare in pairs" → On their own
  - "as a class", "elicit", "go through with the class" → All together, I lead
  - "in pairs", "ask and answer with a partner", "mingle" → In pairs
- `min`: whole minutes, usually 1–10. Java's presets are 1, 2, 3, 4, 5, 6, 7, 10, 15, 20. The exercises
  should add up to about **73–75**, so that with the 5–7 min warm-up the lesson is about 80. If the
  material clearly doesn't fit, cut time from practice rows first and say so. Don't drop exercises
  silently.
- `skipped`: only when Java says so, or when the TB marks the exercise optional and time is short. In
  that case list it in the summary as a suggestion rather than skipping it yourself.

**Judgement**
- Prefer the simpler route when the TB procedure is heavy, the way Java did in the model ("Teacher's
  Book complicates this…").
- Level matters. For Beginner and Elementary, keep notes shorter and add a modelling step. For
  Intermediate, exam-format tips from the TB are useful in `self`.
- If the TB answer page is missing, work the key out from the CB yourself and mark it in `self` as
  `(my key: TB page not sent)`. If the answer depends on audio you can't hear, write "check with the recording"
  instead. List every "my key" row in the report so Java can check it before class.

**Lesson fields**
- `unit`: the group's roadmap unit from `status` (the app also uses it for the roadmap count).
- `name`: the CB unit or page title, for example `Best Friends Forever`.
- `aims`: **always fill all five.** They go on the Cambridge copy for his supervisor, so write them in
  Cambridge's usual style:
  - `main`: "By the end of the lesson, Ss will be able to …". This is the lesson's main language or skill
    goal, in a real-use context (e.g. use -ing forms after verbs and adjective + preposition to talk about
    themselves and their friends).
  - `sub`: 2–3 short items covering the other stages: vocabulary, the skill practised (listening for
    specific information, speaking fluency) and the exam task if there is one.
  - `personal`: **Java's own teaching goal**, one short sentence with how he'll do it, e.g. *Reduce
    teacher talking time: short instructions, pairs check before feedback.* Others: manage time better
    (keep to the minutes, use a timer), grade language to the level, clearer instructions with checking
    questions, monitor more actively, more peer correction, better board work, give everyone a turn.
    Pick one that fits this lesson's risk. `show GROUP` lists his recent personal aims, so **don't repeat
    the last one**.
  - `prob1`, `prob2`: a likely problem **and** its solution, specific to this material, e.g. *Ss use the
    infinitive after enjoy (enjoyed to visit). Solution: board the 3 rules from Ex 1 and point back during
    Ex 4.*
  - Use the full words here. Never TTT, PW or similar: write "teacher talking time".

## Step 2b: copy the book for the lesson world (always)

The app's **🌌 Lesson world** button opens the lesson as panels in a bright 3D space on the classroom's interactive
board, one panel per exercise. Students keep their books open, so the board must mirror the page: same section
headings, same colours, same exercise numbers, same instructions, same items, in the same order. Then a student
glancing between the board and the book always knows where the class is. You write this copy from the CB pages.

**Copy, don't adapt.** The book copy is a transcription, not a summary:
- `rubric` = the CB instruction line **word for word** (e.g. "Complete the sentences with the -ing form of the verbs
  in brackets."). Never Java's `note`, never simplified, never "Ss…".
- Items, word boxes, tables, texts and dialogues **word for word**, with the book's numbering and order. Keep the
  book's spelling, punctuation and brackets. Write a gap as `___`.
- Nothing teacher-facing in it: no notes to self, no TB tips, no CCQs.
- Answers only in `answers` (they stay hidden until Java taps), and only from the TB or the CB key. No key, no answers.

**Capture the page look once per lesson** in the plan's `book` object, by looking at the CB pages:
- `unitColor`: the unit's main colour (unit header, exercise-number badges), as hex. Estimate it from the image
  (e.g. a strong pink is about `#D6336C`, a teal about `#0C8599`).
- `sections`: the colour of each section heading, keyed by the exact `sec` text of the rows, e.g.
  `{"Vocabulary · Personality": "#1C7ED6", "Grammar · -ing forms": "#D6336C"}`. Add one entry per section whose
  heading colour differs from `unitColor`.
- `numStyle`: how exercise numbers are printed: `circle` (number in a filled circle), `square` (filled square), or
  `plain` (just a coloured number).
- `headStyle`: how section headings are printed: `band` (white text on a coloured strip), `tab` (coloured tab), or
  `text` (coloured text with a rule).
- `font`: the page's feel: `rounded` (soft, round letters, common in Beginner and Elementary books), `sans`
  (plain modern), or `serif`.

Keep the same `book` for every lesson of the same book and unit, so the board doesn't change look mid-unit.

**`world` on each row.** Warmer, Review and Cooler rows have no book exercise; give them a `world` only if there is
something for students to read, such as the Warmer question.
```json
"world": {"rubric": "Complete the sentences with the -ing form of the verbs in brackets.",
          "track": "07",
          "blocks": [ … in the book's order … ]}
```
Use `track` only when the exercise has audio but its kind isn't Listening. The board then shows "Listen · Track 07".

Blocks. Use the one that matches what's printed:

| Book shows | Block |
|---|---|
| word box / word pool | `{"type": "words", "items": ["friendly", "shy", "funny"]}` |
| numbered items, gap-fill, questions, true/false | `{"type": "list", "items": ["I enjoy ___ (read) comics.", "…"], "answers": ["reading", "…"]}`. Add `"numbering": "a"` for a, b, c, or `"none"`. With gaps: one answer per `___`, in order, filled into the gaps one tap at a time. Without gaps: one answer per item (e.g. T / F). |
| two matching columns | `{"type": "match", "left": ["…"], "right": ["…"]}`. Leave out the book's 1–n and a–z; the board adds them. |
| table / chart | `{"type": "table", "rows": [["Verb", "-ing form"], ["swim", "___"]]}`. The first row is the header. |
| grammar box / rule box | `{"type": "rule", "title": "-ing forms", "items": ["We use -ing after love, like, enjoy…"]}` |
| reading text, email, model text | `{"type": "text", "title": "My best friend", "body": "Paragraph 1\n\nParagraph 2"}` |
| dialogue | `{"type": "dialogue", "lines": [["Amy", "What do you enjoy doing?"], ["Ben", "I love playing football."]]}` |
| picture the task depends on | `{"type": "image", "src": "img:beginner/p16-ex1.png", "alt": "Pictures A–F"}` |
| answer key to reveal at the end | `{"type": "answers", "items": ["1 b", "2 c", "3 a"]}` |
| more than fits one board panel | `{"type": "break"}` starts a continuation panel ("continued") for the same exercise |

**Size.** A panel holds about half a CB page. The board shrinks text to fit, but not below about 60%, so split long
reading texts or long lists with `break`: roughly 150 words of text, or 8 list items, per panel.

**Pictures.** Book pictures are often made for one task (match the photos, find the differences), so never
replace them with web images. Java snips each picture a task needs (Windows snip tool) and sends it as its own
image. For each one:
1. Save the attachment to a file, then store it:
   `python3 scripts/lpb.py add-img snip.png beginner/p16-ex1.png`. Name pictures `<level>/p<page>-ex<num>.png`,
   adding `-a`, `-b` for several per exercise. The same book means the same name, so other groups of that level reuse it.
2. Use it in the row's `world` as `{"type": "image", "src": "img:beginner/p16-ex1.png", "alt": "…"}`.

If a task needs a picture Java hasn't sent, still add the image block (the board shows a labelled placeholder)
and list the missing snips in your report: "Send me snips of: p. 16 ex 1 (the 6 photos)". Only tight crop-snips
work; a whole-page photo is too small to read on the board.

If the plan is already in the app and Java edited it, add the book copy without touching his rows:
`python3 scripts/lpb.py set-world GROUP world.json [--for SECTION]`, where `world.json` is
`{"book": {…}, "exercises": [{"page": "16", "num": "1", "world": {…}}]}`. Rows are matched by page + num.

## Telegram message for students (always write one)

Every plan gets a `telegram` field: a summary Java pastes into the group's Telegram chat after class. The
app shows it on the Plan and After class screens (editable, with a Copy button). Java approved this format:

- **Header:** `📘 Unit 3 · My Home · Part 1` (Part only when the unit has 2 lessons), then
  `🗓 Tue 13 Oct · Book p. 24–25`.
- **✏️ GRAMMAR: <point>** first, the most important part: numbered rules ➊ ➋ ➌, each with one short
  example from the lesson. Then `⚠️ <typical mistake> ❌ → <correct> ✅`.
- **📖** vocabulary: word lists grouped by topic, and a 🔊 pronunciation point if one was taught. Carried-over
  material from the previous unit is included and labelled "(Unit 2)".
- **❓ CHECK YOURSELF:** 3–4 CCQs about the grammar and vocabulary, with answers in brackets.
- **📝 REMEMBER THE TASKS:** 2 ICQs about the main exercises, with answers in brackets.
- **No homework section.** Students already get homework.
- If a section was moved to the next lesson, add `⏭ Next lesson: <topic>`.
- **Beginner and Elementary only:** after the English, a line `━━━━━━━━━━━━━━`, then a full block
  `🇺🇿 O'ZBEKCHA` and then a full block `🇷🇺 РУССКИЙ`. Each block repeats the grammar rules, the ⚠️ mistake,
  the CHECK YOURSELF questions and the REMEMBER THE TASKS questions in that language. Example sentences
  stay in English. Never mix the languages line by line. Uzbek is in Latin script. Short, simple
  sentences.
- **Pre-Intermediate and Intermediate:** English only.
- Plain text and emojis only (no * or _ markup, because Telegram copy-paste loses it). Under 3500
  characters.
- Only what is planned for the lesson. After class, the app warns Java about exercises marked Part or
  None, and he trims the message himself.

For a lesson already taught, or to rewrite only the message: `set-tg GROUP msg.txt [--for SECTION | --date YYYY-MM-DD]`.

## Lessons taught out of book order

The roadmap counts lessons in book order. If a group is taught two lessons in swapped order (e.g. Unit 5 Part 1
before Unit 4 Part 2), set `slotSwap: [[a, b]]` on the group (roadmap positions, 0-based; the lesson at position
`done` is the next one). The app and lpb.py both apply it, so labels and dates stay right and the count is
unchanged. Fix the taught lesson's unit / name / content in history and its `taught` entry to match.

## Carry-over items Java wants to teach

If Java says to include carry-over (`show GROUP` lists it), take those items into the plan **as carried-over
exercises**, the way the app's "Add to today" button does:
- Put them at the top, in book order.
- Give each a new `id` and `fromCarry: {unit, name}` from the carry item.
- Enrich them with the new pages: note, self, track, correct page.
- Remove those items from `db.carry`. Leave carry items he didn't choose untouched.

Write the new material with `lpb.py write` first (it keeps fromCarry rows on top), then inject the carry
rows with a short Python edit of `lessons.json` before `push`. Total minutes include the carry rows. If
everything doesn't fit, move a whole section (e.g. the grammar) to next lesson rather than half of it,
and say so.

## Working habits (agreed with Java)

**Receiving pages.** Java sends up to 5 images per message. After each batch, reply briefly: what arrived
(CB page numbers and sections, TB parts with answers), what is a repeat, and what is still missing (a CB page,
a TB answer block, the Cooler). Then wait for "all done". If Java says "all done" with gaps left, build anyway
and mark the gaps (see "my key" above).

**Planning a whole week.** When asked to prepare the week:
1. List every lesson Mon–Sat per group with its status (script below), then group the missing ones by
   **level + Unit N, Part X**: one set of pages covers every group on that level and part.
2. Present the sets in date order (most urgent first) as a short table: set, pages to send, groups and days.
3. Build one set at a time. Write the same plan to each group with `--for "Unit N, Part X"`, giving each its
   own date in the Telegram header and a different personal aim if that group's recent ones overlap.
   Include a group's lesson in the following week too when it uses the same pages.
4. When finished, re-run the check and confirm nothing is missing before saying the week is done.

```python
import lpb, datetime as dt   # run from scripts/
db = lpb.load('/home/claude/lesson-plan-data'); end = dt.date(2026, 10, 31)   # set the week's Saturday
for gid, g in db['groups'].items():
    sl, done = lpb.gslots(g), lpb.done_of(g)
    for k in range(done, min(done + 6, len(sl))):
        d = lpb.slot_date(g, k); d = d.date() if hasattr(d, 'date') else d
        if d > end: break
        print(d, lpb.label(g), lpb.sec_label(sl[k]), 'READY' if lpb.has_own(lpb.plan_for(g, k)) else 'need')
```

**Reusing a plan another group already taught** (e.g. Elementary 10:30 following Elementary 17:00): copy the
exercises, aims and Telegram text from that group's `history` lesson, drop its `fromCarry` rows, change the
🗓 date, then `write ... --for`. Tell Java which lesson it came from.

**Something wasn't finished in one group.** In that group's taught lesson set those exercises'
`results` to `None` (and `run.status` to `unfinished`), then add copies to the top of that group's next
lesson with `fromCarry: {unit, name}` and new ids. Only that group; others stay as planned. Mention that the
Telegram message for the taught lesson may need trimming.

**Taught out of order** see the section above (`slotSwap`).

**After every push** tell Java to refresh the app or tap Sync now. If the app shows an old state, it hasn't
pulled yet: the data on GitHub is the source of truth.

**Talking to Java.** Short, plain sentences. "Unit N, Part X" only. When guiding through an app or website,
one step at a time and wait for a screenshot or "done". Keep the report to the table of sections and minutes,
tracks, "my key" rows, aims in one line each, then the next set to send.

## Step 3: write it into the app

1. Write the plan as JSON, for example to the session scratchpad as `plan.json`:
   ```json
   {"unit": "2", "name": "Best Friends Forever",
    "book": {"unitColor": "#D6336C", "numStyle": "circle", "headStyle": "band", "font": "rounded",
             "sections": {"Grammar · -ing forms": "#D6336C"}},
    "telegram": "📘 Unit 2 · Best Friends Forever · Part 2\n🗓 Tue 13 Oct · Book p. 16–17\n\n✏️ GRAMMAR: …",
    "aims": {"main": "By the end of the lesson, Ss will be able to …", "sub": "…", "personal": "…",
             "prob1": "… Solution: …", "prob2": "… Solution: …"},
    "exercises": [
      {"page": "16", "num": "1", "sec": "Grammar · -ing forms", "kind": "Grammar", "grammar": "-ing forms", "who": "All together, I lead",
       "min": 5, "note": "…", "self": "Do Warmer: … Answers 1a 2c 3b",
       "world": {"rubric": "Complete the sentences with the -ing form of the verbs in brackets.",
                 "blocks": [{"type": "list", "items": ["I enjoy ___ (read) comics.", "…"], "answers": ["reading", "…"]}]}}
    ]}
   ```
2. Preview it: `python3 scripts/lpb.py write GROUP plan.json --dry-run`. Fix any errors or warnings
   (unknown kind or who, a Grammar row with no grammar point, total minutes far from 80, a missing book copy,
   answers that don't match the gaps, a picture not stored yet). Rows with a book copy show `[book copy]`.
3. Before writing, tell Java in one line to make sure the app's dot says **"Saved to GitHub"** (green).
   Then save and push:
   ```
   python3 scripts/lpb.py write GROUP plan.json              # the group's next lesson
   python3 scripts/lpb.py write GROUP plan.json --for 2.2    # or a later lesson, planned ahead
   python3 scripts/lpb.py push "Plan: <group> Unit <u> Part <n> <name>"
   ```
   `push` also sends the pictures stored with `add-img`.
   A lesson planned ahead appears in the app under **Upcoming lessons**. It becomes the next lesson by
   itself once the lessons before it are closed. To fill only the aims of a plan Java has already edited,
   use `set-aims GROUP aims.json [--for SECTION]`. It leaves the exercises untouched.
   To revise a plan you wrote earlier in the session, check first that Java hasn't edited it since:
   `git pull`, `git log`, and make sure the newest commit is yours. Then use `write … --replace`, so no
   duplicate lands in Saved lessons. If he has edited it, ask before you overwrite.
   What the script does:
   - puts the plan in the group's **next lesson**
   - keeps that group's carried-over exercises at the top
   - moves any plan that was already there to the group's Saved lessons
   - refuses if that group's lesson is in progress

   Carry-over belongs to its group. Never copy it, move it or delete it.
4. Tell Java to refresh the app, or click back into its tab. If the app ever shows "Your lessons changed
   in two places", he chooses **Keep the GitHub copy** to get your plan.

## Step 4: report (short, plain words)

- Group, lesson ("Unit 4, Part 1 (2.2)"), date, how many exercises, and total minutes.
- The 5 aims you wrote, in one short block.
- Tracks you assigned, exercise by exercise.
- The lesson world: the book look you captured (unit colour, number and heading style) in one line, and the
  **snips still needed** (page, exercise, what the picture shows). If none are missing, write: "Board copy complete.
  Open 🌌 Lesson world to check it against the book."
- Assumptions you made (page numbers, missing TB pages, anything you simplified or suggest skipping).
- "Open it in the app and adjust."

## Don'ts

- Don't edit anything in `lessons.json` except the target group's draft (and `plans` / `customMins`
  through the script). Never touch taught lessons, other groups or carry-over unless Java asks.
- Don't push while Java says a lesson is in progress.
- Don't paraphrase the book in `world`, and don't put Java's notes there: students read it.
- Don't use the words PW, TTT, GW, OCFB, Frontal or "stage" in `note` or `self`. The app uses plain
  words. "Ss" is fine, because Java uses it himself.
