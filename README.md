# Lesson Plan Builder

A lesson planner for one English teacher at Cambridge Learning Centre. It covers 7 groups, and each group's lessons and carry-over are kept apart.

It is a plain static web page (HTML, CSS, JavaScript). There is no server, no login and no AI.

## Use it

Open the live page on a laptop. Then work through these steps:

1. **Week**: pick Odd days or Even days, then tap a group.
2. **Plan**: type the unit and lesson name. Add the exercises in order and save each one.
3. **Lesson starts**: do the warm-up, then add or delete what was not covered last time.
4. **Mid-lesson**: tap Done, or "Didn't finish, do it next lesson".
5. **After class**: everything counts as covered. Only tap Part or None for what you did not finish (it goes to carry-over), then tap "Save and close lesson".

**Forgot to close a lesson?** After the class time ends, the group card asks "Did you teach it?" Tap **Taught as planned** (tap twice to confirm), **Some not finished** (opens After class on that day), or **No class that day**.
6. **Cambridge copy**: fill the yellow boxes. Tap "Download PDF" and choose "Save as PDF".

**Today and next to prepare:** each group card on the Week screen shows the lesson to be taught today (for example "Unit 3, Part 1 (2.1)") and the next lesson that still needs a plan, with a **Prepare it** button. On the Plan screen, **Upcoming lessons** lists the next roadmap lessons. Plan any of them ahead. A lesson planned ahead becomes the next lesson by itself once the one before it is closed.

**Cambridge copy:** the table is grouped by stage: Warm-up, Lead-in (the book's Warmer), one row for each part of the lesson, and Cooler / Review. To send many at once, tap **Many lessons in one PDF**, pick the dates, groups and taught / planned, then **Download PDF · all pages**. You get one landscape page per lesson.

**Book sections:** exercises are shown under headers like the book (the section name, or the page when no name is saved). Type a name in **Book section** on any exercise. Plans made with Claude fill it in.

**Telegram message:** each lesson has a summary for students (grammar rules, words, check-yourself questions; Uzbek and Russian blocks for Beginner and Elementary). Find it on the After class screen or on the Plan screen, edit it if needed, and tap **Copy message**.

**Same lesson for several groups:** on the Plan screen, open **Copy plan to other groups**, tick the groups and tap Copy. You get the unit, lesson name, exercises and aims, and then you adjust each group's copy. Carry-over is never copied: each group keeps its own. If a group already had a plan, it moves to that group's Saved lessons.

**Telegram bot:** open **Telegram bot** in the left bar. Make a bot with @BotFather, paste its token, add the bot to each class group as admin, write "hi" there, tap **Find my groups** and pick the group for each class. Then the Telegram message box has **✈ Send to …** (tap twice). The token stays in this browser only; the class-to-group links sync with your lessons.

**Phone:** every screen fits a phone. The Cambridge table scrolls sideways inside its box on a phone; the PDF is unchanged. The left bar starts folded on small screens.

**Read-through:** step 2 in the top bar shows the whole lesson as big cards, like Mid-lesson, with no timers: note, grammar or track, who does it, note to self, and the rough clock time. Use it to rehearse. Edit on any card opens it on the Plan screen.

**Week cards:** today's lesson sits in a coloured TODAY box. Next lesson is marked UPCOMING, and the next plan to write is in a dashed TO PREPARE box. After you close a lesson, the card asks about its Telegram message: Preview & edit, Send (tap twice), Copy, I sent it myself, or No message.

**Class checklist and reminders:** on Lesson starts and Mid-lesson, under the warm-up: Badge on (at the start), Take attendance, Speaking scores 100 for all, Check homework (start + 15 min) and Update attendance (start + 40 min). Turn on **Class reminders** in the left bar to get PC notifications at those times for every class on the day. Notifications only come while the app is open in a browser tab (it can be in the background). Ticked items are not reminded.

**Lesson world:** tap **🌌 Lesson world** in the top bar. The lesson opens as a bright 3D world in a second window: one panel per exercise (skipped ones are left out), and the camera flies between them. Put the two windows side by side while you plan: the world updates as you type, and tapping an exercise in the plan flies the camera to it. To teach, drag that window to the interactive board and make it full screen. Swipe to move between panels, tap **Board** for the whiteboard, and use **Lite** if the board stutters. Notes to self never appear in the world.

**Book copy on the board:** plans made with Claude (the `lesson-planner` skill) include a copy of each coursebook exercise: the book's instruction, word boxes, items with gaps, tables, grammar boxes, texts, dialogues and pictures, in the book's own colours, section headings, exercise numbers and page numbers. Students can match the board to the page in their books. Answers stay hidden: tap to fill in the gaps one at a time. Book pictures are the snips you send Claude; they are saved in your private `lesson-plan-data` repo (folder `img/`) and loaded with your GitHub sync key, so turn on GitHub sync on the computer that runs the board. After a picture has loaded once, it also shows without internet.

## Your data

- Everything is saved in this browser only, in `localStorage`. Another browser or computer will not see it.
- To keep a copy, go to Week and tap **Download backup** in the left bar. Do this often. You get a `.json` file.
- To bring lessons back, tap **Restore backup** and pick that file. It asks before it replaces anything.
- If you clear browsing data for the site, your lessons are deleted from this browser. With GitHub sync on, connect again and they come back.

## GitHub sync (recommended)

Every change is also saved to `lessons.json` in a **private** repository of yours (for example `lesson-plan-data`). GitHub keeps every old version as its history.

Setup (once): open **GitHub sync** in the left bar and follow the 3 steps. You create the private repo, make a fine-grained key that can only read and write that repo's contents, then paste it in.

- Changes are sent about 8 seconds after you stop, and straight away when you close a lesson.
- The app checks GitHub when it opens, when you come back to the tab, and every few minutes.
- If two browsers changed the lessons, the app asks which copy to keep. It never overwrites without asking.
- No internet: lessons stay in the browser and are sent when you are back online.
- The key is kept in this browser only (not in backups, not on GitHub). When it expires, the app says so. Make a new one and paste it in.

## Files

- `index.html`: the page
- `styles.css`: global styles and print layout (A4 landscape)
- `world.html`: the lesson world (3D presentation and whiteboard). It reads the same saved lessons and needs no setup. When you change it, bump `WORLD_V` at the top of `app.js` (and `?v=` in `index.html`), or browsers may keep showing the old copy for a while.
- `app.js`: all data, roadmap rules and screens. The data is one object (`db`) saved under the key `lesson-plan-builder-v1`.

## Run locally

Open `index.html` in a browser, or serve the folder:

```
python3 -m http.server
```
