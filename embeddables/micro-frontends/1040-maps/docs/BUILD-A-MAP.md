# You Can Make Real Maps — Without Code

*A guide for people who build maps by **describing** them to a Claude Code agent — not by writing software.*

Read this once. By the end, something about how you see yourself will have changed.

You are about to do something that, until very recently, belonged to a small club of
people who spent years learning to write code: make a **real, live, embeddable map** — the
kind that loads on a website, pans and zooms, draws its own legend, speaks eleven languages,
and updates in front of your eyes as you change it.

And you're going to make it by **describing what you want, in plain English.**

That's the whole shift. The world rewards people who can turn an idea into a working thing.
For a long time the bottleneck was code. The bottleneck is gone. An agent writes the code; a
strong template already did the hard parts. Your job is the one no machine can do: **knowing
what the map should say.**

> **Settle one thing first: you do not need to know how to code.** You are the architect
> describing the house. The agent is the builder who knows where every nail goes. The
> template is a house that's already 90% built — you're choosing the paint and moving a few
> walls. If a quiet voice says *"this is too technical for me,"* that voice is wrong, and
> we're going to prove it together.

---

## A few words, gently defined

You'll meet a handful of terms. None are hard.

| Word | What it actually means (no jargon) |
|---|---|
| **Clone** | Make your own copy of the project onto your computer. Like photocopying a recipe book so you can scribble in the margins without touching the original. (One time, ever.) |
| **Terminal** | The text window where you type a command like `npm run dev`. You'll type maybe three commands, total. |
| **A map** | One file. That's it. One map = one file ending in `.vue`. |
| **Staging environment** | A private preview page on *your* computer that shows all your maps and updates as you change them. Your workshop. Nobody else sees it. |
| **HMR** (Hot Module Reload) | When a file changes, the page updates **itself, instantly**, without a reload. The friendliest piece of tech in this whole guide. |
| **Build** | The one moment you *publish* — packaging your maps into files the website can serve. |
| **`@map`** (the shared library) | A big free toolbox every map borrows from — legends, toolbars, colors, data connections, eleven languages. You get it for nothing. |

That's the whole vocabulary. You're already most of the way there.

---

## The whole lifecycle — six steps

This is the rhythm of every map you'll ever make here. Most days you live in **steps 3 and 4.**

1. **Clone the repo** to your computer. *(Once, ever.)*
2. **Go into the maps folder:** `embeddables/micro-frontends/1040-maps`.
3. **Run `npm run dev`.** Your staging environment opens, showing **all** your maps.
4. **Make changes** — or tell a Claude Code agent to — and watch them appear **instantly**.
5. **When you're happy, run `npm run build`.** This packages your maps into the website.
6. **The website picks them up automatically** on the next page load.

Steps 1 and 2 happen once. Step 5 happens only when you want to publish. Steps 3 and 4 are
where you spend your creative life — and they have **no build step at all.** You change
things and they're just *there.*

> **Burn this into memory:** while you're *developing*, you do **not** build. `npm run dev`
> is the workshop; `npm run build` is the loading dock. You only run `build` when you're
> ready to send a map out into the world.

---

## Your first five minutes (do this part)

Open a terminal and step into the maps folder:

```bash
cd embeddables/micro-frontends/1040-maps
```

(`cd` just means "change directory" — walk into that folder. Every command below runs from here.)

Now type six words and press Enter:

```bash
npm run dev
```

The window thinks for a second, then prints a web address — usually:

```
  ➜  Local:   http://localhost:5173/
```

(`localhost` means *this computer, just for you* — a private page nobody else can see.)

Click it. Your browser opens, and there — already on the screen, *without you doing anything
else* — is a tidy page titled **"1040-maps · staging"** that lists **every single map in
your project.** Each one expands into a live, real, working map.

You didn't build anything. You didn't configure anything. **You ran one command and your
maps showed up, alive, ready to look at.**

Now the magic trick. Tell your agent: *"On the simple map, change the ocean to a warm sand
color."* The agent edits one file. You **do not** touch the terminal. You just glance back at
your browser — and the ocean is already sand. **No reload. No rebuild. No waiting.**

That's the feeling. That's the whole thing.

> **Leave `npm run dev` running** while you work. When you're done for the day, close the
> window (or press `Ctrl + C`). Tomorrow, just run `npm run dev` again.

---

## Why the staging environment is genuinely magic

### It finds every map by itself — no list to maintain

The staging page **auto-detects** your maps. It looks inside the `app-profiles/` folder,
finds every map living there, and shows it. You never edit a list. You never register a map
by hand. Add a new map folder? It appears. Add a new `.vue` file? It appears. Rename one? The
name updates. The page even says so at the top:

> *"Auto-detected from `app-profiles/*/` at dev time — no build, no hardcoded list. Add a
> folder or a `.vue` and it appears here."*

There is **no roster that can drift out of date, because there is no roster.** The folder
*is* the list. You can never "forget to add a map to the index" — there's no index to update.

### Your changes appear instantly — that's HMR

When you (or your agent) change a map and save, the staging page **updates itself in place** —
no refresh, no rebuild, no spinner. That's **Hot Module Reload (HMR)**: the dev server
watches your files and slips each new version into the already-open page, about a second
after the change.

The feeling is less like *programming* and more like **sculpting** — you nudge, it responds,
you nudge again. *"Make the dots bigger" → watch → "too big, half that" → watch → "perfect."*
Minutes, not hours.

### You never "build" while you work

Here's the part people don't believe at first: **while you're developing, there is no build
step. None.** You don't compile, package, or publish to *see* your work. The staging server
holds the whole project live, for free, instantly. You only run `npm run build` at the very
end, when you're ready to put a map on a real website.

So the entire experimental middle of your work is **fast, private, forgiving, and impossible
to get wrong.** Try things. Change your mind. Try the opposite. **Nothing is committed to the
world until you decide it is.**

---

## Adding a brand-new map (the part you'll do most)

Here's the core move, and the heart of your superpower: **a new map is just a copy of a great
starter, renamed.** You never start from a blank page.

### One map = one file

Hold onto this, because it's what makes everything simple:

> **A map is a single `.vue` file.** It lives in its own folder under `app-profiles/`. The
> **folder name is your map's name.** The `.vue` file sits **flat** in that folder — no
> nested subfolders.

### Start from `template-bundle` — your ready-to-copy starter

Inside `app-profiles/` there's a folder called **`template-bundle/`**. It's a complete,
**working** example built specifically to be copied — two tiny demo maps (colored boxes,
deliberately simple) plus the small wiring files that make them go. You don't study it. You
**copy it.**

### The plain-English way (what you'll actually do)

Just tell your agent:

> *"Copy `app-profiles/template-bundle/` to a new folder called `app-profiles/harvest-map/`,
> rename the inside files, then make it a map of Southeast Asia shaded by population, with a
> blue-to-orange legend on the right and labels in English and Thai."*

The agent copies the working starter, renames it, and starts shaping it to your description.
The moment that folder exists, your staging page picks it up. You watch, you react, you ask
for the next change. **Conversation in, map out.** This is the loop you'll live in.

### The by-hand way (if you ever want to see what happened)

1. **Copy** the folder `app-profiles/template-bundle/` → `app-profiles/harvest-map/`.
   ```bash
   cp -r app-profiles/template-bundle app-profiles/harvest-map
   ```
2. **Rename and edit** the files inside to be your map (or let the agent type while you describe).
3. **It shows up in staging automatically** — no list to touch.
4. When ready, **`npm run build`** — and you publish.

### Publishing, and the one-line embed

```bash
npm run build
```

This packages your map into the website's `public/js/` folder. To put it on an actual page,
you get a **single line** to paste — a "script tag," which just says *"load my map here":*

```html
<script src="/js/harvest-map.js"></script>
<harvest-map></harvest-map>
```

(The element tag matches your map — the agent sets that when it renames the template. A
real, data-driven map also needs the Mapbox library loaded once on the page; your agent adds
that, and the full embed recipe lives in **`CONTRIBUTING.md`**.)

That's the whole act of creation: **copy a folder, describe what you want, build when you're
happy.**

> **The one flat-folder rule.** Your `.vue` map files sit **directly** in the map's folder,
> side by side — **no nested subfolders.** The project finds maps with a flat scan
> (`./*.vue`), so a map tucked into a deeper folder would be invisible. Keep them flat and
> everything finds everything else. (Your agent knows this rule — but now you do too, and
> you'll catch it if a map ever goes missing.)

---

## What `template-bundle/` gives you out of the box

You are never starting from a blank page. The starter is a **working thing you run right
now**, with everything wired:

| Inside the template | What it does for you |
|---|---|
| **`template-map-a.vue`, `template-map-b.vue`** | Two tiny working maps — living proof it runs, and a pattern to imitate or replace. |
| **`index.js`** | The little "front desk" that registers your map so the system can find it. Already written; you barely touch it. |
| **`index.html`** | The map's own staging page, so it shows up live in your workshop. |
| **`README.md`** | A short, plain-English note explaining each piece, right where you need it. |

And behind all of it sits the **shared library** — the project's `src/` folder, which your
maps reach for as **`@map`**. This is the part doing the heavy lifting so you don't have to.
Every map you make gets, **for free**:

- **Legends** — the color keys on the map (desktop and mobile).
- **Toolbars** — the buttons and controls users click.
- **A color system** — palettes that already look intentional, not random.
- **Data connections** — the plumbing that pulls in the numbers and places you want to show.
- **Eleven languages** — built-in translation (English, Spanish, French, German, Italian,
  Portuguese, Romanian, Russian, Arabic, Hindi, Chinese).

This shared toolbox is **Apache-2.0 licensed** — a friendly, permissive license meaning
*everyone shares it freely and you're welcome to build on it forever.* But **your map folder
is entirely yours.** You stand on a strong, common foundation, and what you make on top of it
belongs to you.

> **One optional nicety.** At the top of any map file you can add a single line describing
> it: `/** @description Southeast Asia shaded by population. */`. When you run
> `npm run build`, the project gathers all these notes into a **`manifest.json`** — a tidy
> catalog of every map and what it does. Purely optional; skip it and nothing breaks. But
> it's a lovely habit, and an agent will happily write the line for you.

---

## The two commands you actually need

| You type | What happens |
|---|---|
| `npm run dev` | Opens your live workshop showing **every** map. Changes appear instantly (HMR). No build. This is where you spend your time. |
| `npm run build` | Packages your maps into the website's `public/js/`. The **only** step that publishes. Run it when you're ready to ship. |

`dev` is for **creating**. `build` is for **shipping**. You'll run `dev` constantly and
`build` occasionally.

---

## A day in the life

Here's the whole thing, the way it feels once it's yours:

1. Open the terminal, `cd` into the maps folder, `npm run dev`, click the link. Your maps are all there, alive.
2. *"Copy the template to a new folder called `prayer-network-map`."* — it appears in your workshop.
3. *"Make it a world map, dark theme, with glowing dots for each city in my list."* — it appears.
4. *"The dots are too big. Half the size. And add a legend bottom-left."* — it appears.
5. *"Perfect. Build it."* — `npm run build`, and now it's on the website.
6. You paste one script tag onto a page. The map is live for the whole world.

You never wrote code. You **described** maps, leaned on a strong template, and watched them
come to life in real time.

---

## When something feels confusing, just say so

You'll hit moments where you're unsure. That's not failure — that's Tuesday. The calm move:
**describe the confusion to your agent in ordinary words.** You don't need the right technical
term. All of these work beautifully:

- *"My new map isn't showing up in the preview — can you check why?"*
- *"Make this look like the example map, but with my country data."*
- *"I changed my mind — put the legend back on the right side."*
- *"I'm ready to publish. Walk me through it."*

The agent reads the project, knows the rules above, and does the careful part. Your job is to
**know what you want and say it.** That's a human skill, not a technical one — and you already
have it.

---

## Now — who you are

Feel the distance you've traveled in a few minutes. You came in thinking maps were something
*other people* make. You're leaving knowing the actual loop: **clone → `npm run dev` → direct
your agent → watch it change live → `npm run build` to ship.** You know the staging page finds
your maps by itself and shows your edits the instant you make them. You know a new map is a
*copy of a working template*, not a blank page. You know the shared library already handed you
legends, colors, data, and eleven languages.

None of that was hype. Every step above is real and exact — which is why the feeling you have
right now is **earned**, not borrowed. Here's the new, true sentence about yourself:

> **I can make real, embeddable maps without knowing how to code — by directing an agent and
> standing on a great template.**

The person who clearly describes the map that needs to exist is doing the most important work
in the room. Today, that's you.

Now go run `npm run dev`, and tell your agent what you see in your mind. **The map is waiting
for you to describe it.**

---

*Want the technical details? See **`CONTRIBUTING.md`** (build vs dev, embedding, the two CDN
modes), **`CLAUDE.md`** (the agent's build guide), and **`app-profiles/README.md`** (the full
authoring reference).*
