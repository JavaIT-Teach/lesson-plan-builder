# Lesson Plan Builder

A lesson planner for one English teacher at Cambridge Learning Centre. It covers 7 groups, and each group's lessons and carry-over are kept apart.

It is a plain static web page (HTML, CSS, JavaScript). There is no server, no login and no AI.

## Use it

Open the live page on a laptop. Then work through these steps:

1. **Week**: pick Odd days or Even days, then tap a group.
2. **Plan**: type the unit and lesson name. Add the exercises in order and save each one.
3. **Lesson starts**: do the warm-up, then add or delete what was not covered last time.
4. **Mid-lesson**: tap Done, or "Didn't finish, do it next lesson".
5. **After class**: mark each exercise Full, Part or None, add notes, then tap "Save and close lesson".
6. **Cambridge copy**: fill the yellow boxes. Tap "Download PDF" and choose "Save as PDF".

**Same lesson for several groups:** on the Plan screen, open **Copy plan to other groups**, tick the groups and tap Copy. You get the unit, lesson name, exercises and aims, and then you adjust each group's copy. Carry-over is never copied: each group keeps its own. If a group already had a plan, it moves to that group's Saved lessons.

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
- `app.js`: all data, roadmap rules and screens. The data is one object (`db`) saved under the key `lesson-plan-builder-v1`.

## Run locally

Open `index.html` in a browser, or serve the folder:

```
python3 -m http.server
```
