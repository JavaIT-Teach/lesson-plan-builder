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

## Your data

- Everything is saved in this browser only, in `localStorage`. Another browser or computer will not see it.
- To keep a copy, go to Week and tap **Download backup** in the left bar. Do this often. You get a `.json` file.
- To bring lessons back, tap **Restore backup** and pick that file. It asks before it replaces anything.
- If you clear browsing data for the site, your lessons are deleted. Download a backup before you do that.

## Files

- `index.html`: the page
- `styles.css`: global styles and print layout (A4 landscape)
- `app.js`: all data, roadmap rules and screens. The data is one object (`db`) saved under the key `lesson-plan-builder-v1`.

## Run locally

Open `index.html` in a browser, or serve the folder:

```
python3 -m http.server
```
