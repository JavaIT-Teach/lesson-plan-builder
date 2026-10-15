---
name: lesson-planner
description: Turns coursebook pages plus teacher's book pages into a lesson plan in Java's Lesson Plan Builder app, written in Java's own style, and saves it into the right group's next lesson (synced through the private lesson-plan-data repo). Use when Java shares coursebook / teacher's book pages (images or PDF) and asks to plan, prepare or build a lesson for one of his groups, or asks to put a plan into the lesson plan builder.
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

**Fields** (these are exactly the app's fields)
- `page`: CB page. `num`: CB exercise number.
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
- Don't invent answer keys. If the TB answers aren't in the pages, leave them out and say so.

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

## Step 3: write it into the app

1. Write the plan as JSON, for example to the session scratchpad as `plan.json`:
   ```json
   {"unit": "2", "name": "Best Friends Forever",
    "telegram": "📘 Unit 2 · Best Friends Forever · Part 2\n🗓 Tue 13 Oct · Book p. 16–17\n\n✏️ GRAMMAR: …",
    "aims": {"main": "By the end of the lesson, Ss will be able to …", "sub": "…", "personal": "…",
             "prob1": "… Solution: …", "prob2": "… Solution: …"},
    "exercises": [
      {"page": "16", "num": "1", "kind": "Grammar", "grammar": "-ing forms", "who": "All together, I lead",
       "min": 5, "note": "…", "self": "Do Warmer: … Answers 1a 2c 3b"}
    ]}
   ```
2. Preview it: `python3 scripts/lpb.py write GROUP plan.json --dry-run`. Fix any errors or warnings
   (unknown kind or who, a Grammar row with no grammar point, total minutes far from 80).
3. Before writing, tell Java in one line to make sure the app's dot says **"Saved to GitHub"** (green).
   Then save and push:
   ```
   python3 scripts/lpb.py write GROUP plan.json              # the group's next lesson
   python3 scripts/lpb.py write GROUP plan.json --for 2.2    # or a later lesson, planned ahead
   python3 scripts/lpb.py push "Plan: <group> Unit <u> Part <n> <name>"
   ```
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
- Assumptions you made (page numbers, missing TB pages, anything you simplified or suggest skipping).
- "Open it in the app and adjust."

## Don'ts

- Don't edit anything in `lessons.json` except the target group's draft (and `plans` / `customMins`
  through the script). Never touch taught lessons, other groups or carry-over unless Java asks.
- Don't push while Java says he is mid-lesson.
- Don't use the words PW, TTT, GW, OCFB, Frontal or "stage" in `note` or `self`. The app uses plain
  words. "Ss" is fine, because Java uses it himself.
