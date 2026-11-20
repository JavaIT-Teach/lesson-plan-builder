# Lesson artifacts: the library

Artifacts are separate full-screen pages in the app (`artifacts/<tpl>.html`) that Java opens on the interactive board
while he teaches from the book. Each one makes one point clearer than the page can: visual, often interactive, often
a game. A lesson stores only settings (`L.artifacts`); the template does the rest. The builder's top bar shows one
button per artifact, named from the book place and the type: **p.42 · Grammar · Ex 6 · Clock**.

Every artifact automatically has: the book place and title on top, **Pen** (write straight on the content),
**Board** (blank white paper), full screen, and, when set, a timer (`timer`: seconds) and a team scoreboard
(`teams`: 2, or names like `["Boys", "Girls"]`, up to 4). Use `teams` when the TB task is a team game or competition.

Look at any template with its demo: open `artifacts/index.html`, or run `node scripts/artifact_check.js --demo --shots DIR`.

## The energizer (every lesson, required)

Every lesson gets one `energizer`: a 3–5 minute **seated** game in the middle of the lesson (around minute 35–45, between
two sections, ideally after the heaviest part) so students don't sit through 80 minutes of exercises. No movement:
everything happens from the seats, in teams. It **recycles the lesson's own language** (this lesson's words, grammar
and questions, plus last lesson's when useful), so it is revision, not lost time. It does not count toward the 1–3.

In the plan it is also a **row**: `num` "Energizer", `page` empty, kind Speaking (or Vocabulary / Grammar, matching what
it recycles), `who` "All together, I lead", `min` 4 (3–5), a one-line `note`. Place the row where it happens. The
3–5 minutes come out of the longest practice row; say which one in the report.

## Choosing artifacts (the rule that matters)

The book stays the main tool. Make an artifact only where seeing it or doing it at the board teaches **better than
the page**: usually **1–3 per lesson**, never one per exercise. If the book exercise works fine with books open,
leave it alone. Good reasons:

- **The TB Warmer** makes Java write things on the board (categories, questions, a word race): a `warmer` does that
  writing for him, as a team game. The Warmer is the most common artifact.
- **A grammar point that reduces to a pattern** (to be, Present Simple / Continuous, there is / are, comparatives,
  going to, Past Simple questions): a `formula` with practice. Skip it for points that are not a formula
  (used to vs would, article use, most phrasal verbs): don't force a fake one.
- **Telling the time**: `clock`.
- **A distinction students mix up** (countable / uncountable, -ed pronunciation, verb + -ing / to): `sort`.
- **Tense or time meaning** (past / now / future, a daily routine, a story's order): `timeline`.
- **A picture task** (rooms, prepositions of place, parts of the body, a scene to describe): `scene`, using Java's snip.
- **A gap-fill or matching that is better done together at the board** (the TB says "check as a class", or the
  practice needs the class to see the pattern): `drag` or `match`. Not for every gap-fill.

**Reuse before you build.** The nine templates below cover most needs: change the content, not the code. If a
lesson needs something none of them can carry, say so in the report and propose a new template (what it shows,
what students do). Build it only when Java agrees; it then joins this library for every later lesson.

## Fields every artifact has

| field | |
|---|---|
| `tpl` | the template: warmer, energizer, formula, clock, drag, match, sort, timeline, scene |
| `page`, `sec`, `num` | where in the book, exactly as the plan's row (`sec` = the section heading, `num` = exercise number or "Warmer"). The button is made from them, so two "Ex 6" on different pages or sections never look the same. |
| `title` | big heading on the board, student-facing ("Who works where?") |
| `task` | one line telling students what to do, in simple English for the level |
| `timer`, `teams` | optional, see above |

Everything on an artifact is **for students**: no teacher notes, no "Ss", no answers outside the answer fields.
Answers stay hidden until tapped. Use the level's language (A1 for Beginner: short words, short sentences).

## Templates

### warmer
The TB warmer, ready-made, as a game. `rounds`: one or more, each shown as a tab.
```json
{"tpl": "warmer", "page": "38", "sec": "Vocabulary · Jobs", "num": "Warmer", "title": "Who works where?",
 "task": "In teams, say a job for each place. One point for each job.", "timer": 120, "teams": 2,
 "rounds": [
   {"name": "Places", "type": "categories", "columns": [{"name": "Hospital", "items": ["doctor", "nurse"]}, {"name": "School", "items": ["teacher"]}]},
   {"name": "Who am I?", "type": "clues", "items": [["I work in a hospital. I help the doctor.", "nurse"]]},
   {"name": "Words", "type": "words", "items": ["doctor", "pilot"]}]}
```
`categories`: hidden answers under each heading (2–5 columns, up to ~6 items each). `clues`: clue cards, the answer
is revealed on tap (up to 6). `words`: a grid of hidden words (brainstorms, "how many can you remember?").

### energizer
Seated team game, 1–3 rounds (2 is usual for 4 minutes). Teams default to 2; give names with `teams` if the class has
its own. No `page` / `sec` needed; the button reads **Energizer**.
```json
{"tpl": "energizer", "num": "Energizer", "title": "Quick fire", "task": "Teams answer fast. One point for each right answer.",
 "rounds": [
   {"name": "Spin", "type": "wheel", "items": ["What time do you get up?", "How do you go to school?"]},
   {"name": "Race", "type": "race", "category": "Things you do every morning", "seconds": 30, "ideas": ["get up", "have a shower"]},
   {"name": "Odd one out", "type": "oddone", "items": [{"words": ["gets", "goes", "has", "play"], "odd": 3, "why": "play has no -s"}]},
   {"name": "Unscramble", "type": "unscramble", "items": ["breakfast", "He goes to bed at ten."]},
   {"name": "Mystery word", "type": "mystery", "items": [{"word": "shower", "clue": "You have one in the bathroom."}]}]}
```
`wheel`: 4–10 questions with the lesson's grammar; spin, it lands on one, a student or team answers. `race`: a
category; teams list words before the timer ends (`seconds`, default 30); `ideas` are revealed after. `oddone`: 4
words, `odd` = index of the different one, `why` in a few words. `unscramble`: a word (letters shuffled) or a
sentence (words shuffled). `mystery`: letters appear one by one; fewer letters = more points; give a `clue`.
Pick rounds that fit the lesson: grammar lessons → wheel / unscramble sentences / oddone with forms; vocabulary
lessons → race / mystery / oddone with meanings.

### formula
Grammar as colour bricks. Roles keep one colour everywhere: `subj` who (blue), `aux` be / do / have / will (red),
`verb` the action form (yellow), `neg` not (dark), `q` question word (violet), `rest` the rest (grey outline),
`mark` the "?" (dark). Give the forms the lesson teaches (`pos`, `neg`, `q`, any of them).
```json
{"tpl": "formula", "page": "44", "sec": "Grammar · Present Continuous", "num": "1", "title": "Present Continuous",
 "task": "For actions happening now.",
 "forms": {"pos": {"parts": [["Subject", "subj", "She"], ["am / is / are", "aux", "is"], ["verb + ing", "verb", "reading"], ["…", "rest", "a book"]]},
           "q": {"parts": [["Am / Is / Are", "aux", "Is"], ["subject", "subj", "she"], ["verb + ing", "verb", "reading"], ["…", "rest", "a book"], ["?", "mark", "?"]]}},
 "notes": ["I → <em>am</em>", "he / she / it → <em>is</em>", "run → run<em>ning</em>"],
 "practice": [
   {"type": "build", "ask": "Make a sentence.", "words": [["They", "subj"], ["are", "aux"], ["playing", "verb"], ["football", "rest"]]},
   {"type": "transform", "from": [["He", "subj"], ["is", "aux"], ["cooking", "verb"], ["dinner", "rest"]], "to": "neg",
    "words": [["He", "subj"], ["is", "aux"], ["not", "neg"], ["cooking", "verb"], ["dinner", "rest"]]},
   {"type": "fix", "ask": "One part is wrong. Find it.", "words": [["We", "subj"], ["is", "aux", "are"], ["studying", "verb"]]}]}
```
Parts are `[label, role, example]`; the examples make the example sentence. `notes`: up to 5 short lines, `<em>` marks
the key part. `practice`: 4–6 items for Java to model, mixing build, transform and fix; use the lesson's own words
and topic. `build` / `transform`: students tap the words in order; `fix`: one word has `[word, role, correction]`.

### clock
```json
{"tpl": "clock", "page": "30", "sec": "Vocabulary · Telling the time", "num": "3", "title": "What time is it?",
 "task": "Move the hands to show the time.", "mode": "set",
 "items": [{"time": "9:00", "say": "It's nine o'clock."}, {"time": "10:30", "say": "It's half past ten."}]}
```
`set`: students move the hands, then Check. `read`: the clock shows the time, students say it, tap Show.
Time as h:mm, hours 1–12, minutes in fives.

### drag
```json
{"tpl": "drag", "page": "31", "sec": "Grammar · Present Simple", "num": "4", "title": "My morning",
 "task": "Drag the verbs into the sentences.",
 "items": ["Tom ___ up at seven o'clock.", "He ___ a shower and ___ his teeth."],
 "answers": ["gets", "has", "brushes"], "words": ["gets", "has", "brushes", "goes", "get"], "image": "img:…"}
```
One answer per `___`, in order. `words` = all answers plus 1–2 likely wrong forms. Up to ~7 sentences. `image` optional.

### match
```json
{"tpl": "match", "page": "22", "sec": "Vocabulary · Free time", "num": "2", "title": "Verb + activity",
 "task": "Match the verbs with the activities.",
 "left": ["play", "go", "watch"], "right": ["swimming", "football", "TV"], "answers": [1, 0, 2]}
```
`answers[i]` = index in `right` of the partner of `left[i]`. Up to 8 pairs. An item can be a picture: `"img:…"`.

### sort
```json
{"tpl": "sort", "page": "40", "sec": "Grammar · Countable and uncountable", "num": "2", "title": "Can you count it?",
 "task": "Put each word in the right group.",
 "groups": [{"name": "Countable", "items": ["apple", "egg"]}, {"name": "Uncountable", "items": ["milk", "bread"]}]}
```
2–4 groups, up to ~14 words in all.

### timeline
```json
{"tpl": "timeline", "page": "52", "sec": "Grammar · Past Simple", "num": "3", "title": "When does it happen?",
 "task": "Read the sentence. Tap the right place on the timeline.", "mode": "place",
 "zones": ["Past", "Now", "Future"], "now": 1,
 "items": [{"text": "I played football yesterday.", "zone": 0, "tag": "Past Simple"}]}
```
`place`: one sentence at a time, students tap its zone (2–5 zones; `now` = index of the present). `tag` names the form
when it lands. `order`: `"items": [{"text": "I get up.", "time": "7:00"}, …]` in the right order (up to 7); the page
shuffles them and students put them along the line.

### scene
```json
{"tpl": "scene", "page": "20", "sec": "Vocabulary · My room", "num": "1", "title": "Where is it?",
 "task": "Say where each thing is. Tap the number to check.", "image": "img:elementary/p20-ex1.png",
 "spots": [{"x": 22, "y": 30, "label": "on the desk"}]}
```
`x`, `y` = % across and down the picture. Needs Java's snip of the picture (store it with `add-img`); you place the
spots by looking at the snip. Up to ~8 spots.
