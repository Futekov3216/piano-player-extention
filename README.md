# Piano Player

A Chrome extension that composes original piano pieces and plays them on the virtual piano at [onlinepianist.com](https://www.onlinepianist.com/virtual-piano).

Each piece is generated from a **seed**, which can be a number or any text. The same seed always produces the same piece, so you can replay a piece you liked or share its seed with someone else.

Example here https://www.youtube.com/watch?v=cV8W8Yhrs88

## What it does

From each seed the extension generates a piece of about 3 minutes in the style of Chopin:

- **Style:** nocturne, waltz, mazurka or étude.
- **Key:** any of the 12 keys, minor or major.
- **Form:** a main theme, a contrasting middle section, episodes in other keys, the theme's return and a coda.
- **Details:** grace notes, turns, trills and fast runs, plus small timing changes (rubato) and slowing down at the ends of phrases.

It plays the notes by sending key presses to the site's virtual piano, using all 88 keys (A0 to C8).

## Installation

1. Download or clone this folder.
2. In Chrome, go to `chrome://extensions`.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and select this folder.
5. Optionally, pin the extension to your toolbar using the puzzle-piece icon.

## Usage

1. Click the extension icon. The player opens in its own small window, which stays open while you use Chrome. Press **Go to virtual piano**, or open https://www.onlinepianist.com/virtual-piano yourself.
2. **Click any piano key once with your mouse.** Browsers keep a page silent until you interact with it, so the extension can't play anything until you do.
3. Press **Play** in the player window.

### The player window

The player works on whichever tab is showing in your main Chrome window. Its buttons update as you switch tabs: on the piano page, Play and Stop are enabled and **Go to virtual piano** is disabled; on any other page it's the other way round.

| Control | What it does |
|---|---|
| **Seed box** | Type a seed to play that exact piece. Leave it alone to get a random one. |
| **Play** | Plays a new random seed each time. If you've typed a seed, plays that seed once, then goes back to random. Pressing Enter in the seed box does the same. |
| **Stop** | Stops playback. |
| **Go to virtual piano** | Opens the piano page in the current tab. Disabled when you're already on it. |
| **×** (top right) | Closes the player window. Clicking the extension icon while it's open brings it to the front instead of opening a second one. |
| **Reload page** | Only appears when the page needs a reload before it can play (see [Troubleshooting](#troubleshooting)). |
| **Played seeds** | Expands a list of the seeds you've played, newest first, with each one's style, key and length. Each seed is saved once: playing it again doesn't add or move it. Click a seed to play it again, or its **×** to remove it. **Clear history** empties the list. |

After you press Play, the player shows the piece's seed, style, key, tempo, length, number of notes and how it ends.

The music keeps playing if you close the player window. Click the extension icon again to stop it.

### Finding fast pieces

Waltzes play at up to 200 BPM, and études have the fastest runs of notes. [FAST-SEEDS.md](FAST-SEEDS.md) lists the fastest seeds and explains how the speed is chosen. Try seed `16067`.

## The keyboard map

The site's default keybinds only reach 35 piano keys. To use all 88, the extension changes the site's keyboard setting to a custom map:

- **Without Shift**, 44 keyboard keys (`1`–`0`, `Q`–`]`, `A`–`'`, `Z`–`/` and `=`) play A0 to E4.
- **With Shift**, the same keys play F4 to C8.

The extension applies this map every time the site loads, so **your own keybinds on onlinepianist.com are replaced while the extension is turned on.** To get the default keys back:

1. On the piano page, open the console (F12 → Console) and run `restoreRealKeys()`.
2. Turn the extension off in `chrome://extensions`. Do this before reloading, or the extension will apply its map again when the page loads.
3. Reload the page.

## Troubleshooting

| Problem | Fix |
|---|---|
| Play does nothing, or there's no sound | Click a piano key on the page with your mouse, then press Play again. |
| Play and Stop are greyed out | The tab showing in your main Chrome window isn't onlinepianist.com. Press **Go to virtual piano**, or switch to the piano tab. |
| The player window disappeared | It's behind your main Chrome window. Click the extension icon to bring it to the front. |
| A message asks you to reload the page | The tab was open before the extension was installed or updated, so the site loaded its old keyboard settings. Press **Reload page** once. |
| Wrong notes or missing keys | Reload the page so the site picks up the 88-key map. |
