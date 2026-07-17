# PRO ICP — who we are actually building for

> The reference doc for every pro-side screen. If a design decision would confuse this person, it's wrong. Print it in your head before you design anything on `/pro/*`.

## One line

**A tired tradesperson with big hands, standing in the sun, tapping a cracked phone between jobs, who lives inside Facebook and WhatsApp and has no patience for anything that feels like "software."**

If the screen doesn't feel as easy and familiar as posting a photo to Facebook, they will close it and never come back.

---

## The person

Owner-operators and field techs in home services: **water treatment, HVAC, plumbing, electrical, appliance repair.**

- Age roughly 30–60. Did not grow up with apps. Trade school or on-the-job, not a keyboard.
- Runs the whole business off a phone, a truck, and memory. No office, no assistant, no laptop.
- Proud of the craft, not the paperwork. Sees admin as the annoying part of the day.
- Skeptical of new tech. Has been burned by clunky "CRM" tools that a salesperson pushed and nobody could use.

**They are not dumb.** They can diagnose a failing compressor by sound. They are *digitally impatient and change-averse* — a very different thing. Design for low digital literacy and zero tolerance for confusion, not low intelligence.

## The moment they use it (this is everything)

Design for the real conditions, not a clean desk:

- **Outside, in bright sun.** Glare kills low-contrast screens. Muted gray text disappears.
- **Tired.** End of a long physical day, or 90 seconds between jobs. No mental energy left to "figure it out."
- **Big fingers, dirty or gloved hands, one thumb.** Standing at a truck tailgate. Fat-fingers everything.
- **Older Android, cracked screen, spotty signal.** Not a new iPhone on wifi.
- **In a hurry, customer watching.** Cannot look confused in front of the person paying them.

Every one of these argues for: **bigger, higher-contrast, fewer steps, plainer words.**

## Their mental model (copy it, don't fight it)

The only apps they use fluently are **Facebook, WhatsApp, text messages, maybe Instagram.** That is the entire vocabulary of "things I know how to do":

- Tap a big thing.
- Scroll a feed of cards and photos.
- Tap a face or a photo to see more.
- Send a message. Tap a thumbs-up. Post something.

Anything outside that vocabulary — forms, fields, filters, settings panels, tabs-within-tabs, wizards, jargon — reads as "this isn't for me" and triggers abandonment. **They will not read instructions, watch a tutorial, or hunt for a hidden button.** One "huh?" equals churn.

## What they actually want

1. **Get paid.** Fast, obvious, "did the money go through."
2. **Get reviews and get rebooked.** More work, less chasing.
3. **Look professional** to the homeowner without effort.
4. **Not feel stupid.** This is emotional and it is the whole game.
5. **In and out in 30 seconds** so they can get back to real work.

## Design principles (the rules this ICP forces)

**Make it feel like Facebook/Meta, because that's the one interface they trust.**

1. **Identity-forward, not settings-forward.** A "me" page should look like a Facebook profile (big photo, your name huge, your stuff), not a control panel of toggles and menu rows.
2. **Big everything.** Tap targets 56px+. Body text 17px minimum; primary numbers and actions much bigger. Assume a gloved thumb.
3. **High contrast for sunlight.** Real ink on real paper. Never rely on light-gray muted text to carry meaning outdoors.
4. **Plain human words.** "Money," not "Invoices." "My customers," not "CRM." "Send record," not "Dispatch." No feature names they'd have to learn.
5. **One clear primary action per screen.** One big button that is obviously the thing to press. Everything else is quieter.
6. **Show, don't configure.** Smart defaults over settings. Never make them set something up to get value.
7. **Icon + label, always.** Never icon-only. A picture and a word together, like the Facebook bottom bar.
8. **Faces and photos over data.** A grid of customer faces beats a table of rows. A photo of the job beats a field of metadata.
9. **Loud, instant feedback.** "✓ Sent to Maria" the second it happens. They need to *see* it worked or they don't trust it.
10. **No dead ends, no blame.** Empty states invite the next tap. Errors never say they did something wrong; they offer the way forward.

## Anti-patterns — if you see these on a pro screen, kill them

- A screen that looks like an **admin panel or settings list** (rows of gears, toggles, "preferences").
- **Technical or brand-y labels** the user has to learn: "Referral," "Due for service," "Office," "Records" without a plain gloss.
- **Dense metadata** — key/value rows of IDs, dates, statuses stacked up like a spec sheet.
- **Low-contrast muted gray** doing important work (invisible in sun).
- **Small tap targets, icon-only buttons, hidden menus** (hamburgers, kebabs, long-press).
- **Multi-step forms and wizards** with more than one decision per screen.
- **Empty states that assume** the user will explore to find the value.

## The gut-check test

Before shipping any pro screen, ask:

> Could my tradesperson, tired and in the sun with one gloved thumb, do the main thing here in one glance and one tap — the same way they'd post a photo to Facebook — without reading anything or asking for help?

If not, it's too technical. Make it bigger, plainer, and more familiar.
