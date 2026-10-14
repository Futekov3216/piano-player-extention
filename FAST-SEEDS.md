# Fast seeds

Seeds that make `chopin(seed)` play at the fastest speeds.

Nothing about the seed itself predicts the speed. Each seed is hashed into a random number, so seed 151 is no faster than 150. These seeds were found by running the generator on every seed from 1 to 20,000 and sorting the results by speed.

## Fastest tempo: waltzes at 200 BPM

A waltz's eighth note is 150–185 ms long. These seeds land on 150 ms, the fastest possible.

| Seed | Key | Notes/sec | Length |
|---|---|---|---|
| **16067** | E♭ major | 13.5 | 3:25 |
| **5951** | D minor | 13.3 | 3:25 |
| **6338** | G minor | 13.3 | 3:28 |
| **3384** | A minor | 13.2 | 3:28 |
| **17309** | F minor | 13.2 | 3:26 |
| **92** | G minor | 13.1 | 3:27 |
| 9720 | A♭ major | 13.1 | 3:22 |
| 11259 | G minor | 13.1 | 3:24 |
| 387 | E minor | 13.0 | 3:28 |
| 19584 | C♯ minor | 13.5 | 3:23 (199 BPM) |

## Fastest note runs: études at 105 ms per note

Études play running 16th notes, the shortest regular notes in any style. They can sound faster than a waltz even though their tempo is lower (143 BPM).

| Seed | Key | Notes/sec | Length |
|---|---|---|---|
| **14726** | A♭ major | 13.3 | 3:50 |
| **18374** | A minor | 12.8 | 2:58 |
| **3010** | E♭ minor | 12.7 | 2:00 |
| 3303 | B major | 12.6 | 3:53 |
| 7315 | B♭ major | 12.6 | 3:02 |

**Best overall: 16067.** It has the fastest tempo and the most notes per second of every seed tested.

## The speed limit

Only 134 of the 20,000 seeds reach the 200 BPM ceiling, and none go past it, because the script never makes a waltz eighth note shorter than 150 ms. To play any faster, the tempo has to change in the code, not the seed.

### How the script sets the speed

All of these choices come from the seeded random generator, so a given seed always plays at the same speed.

1. **Style sets the base unit** (ms per eighth note) in [chopin-generator.js:203-207](chopin-generator.js#L203-L207):

   | Style | ms per eighth | Approx. quarter-note BPM | Time signature |
   |---|---|---|---|
   | Nocturne | 300–380 | 79–100 | 4/4 |
   | Waltz | 150–185 | 162–200 | 3/4 |
   | Mazurka | 175–215 | 140–171 | 3/4 |
   | Étude | 210–250 | 120–143, played as 16ths (105–125 ms each) | 4/4 |

2. **Each section** scales the unit by `tscale`: A = 1, B = 0.92–1.05, episodes = 0.9–1.08.
3. **Each bar** adds ±1.5% rubato. The last bar of each phrase is 12% slower, and the bar before the section's final cadence is 5% slower.
4. **Ornaments** use fixed times regardless of tempo: trills and turns at 65 ms per note, grace notes 50 ms early, and fioritura runs at about 55 ms per note.
5. **The coda** starts with a step of `max(110, unit / 2)` ms in 4/4, or `unit × 0.65` ms in 3/4. Each of its 5 chords is 12% slower than the one before.

The `minutes` option adds episodes to make the piece longer. It doesn't change the tempo.

To play faster than 200 BPM, multiply `S.unit` by a speed factor right after line 207. Section, bar and coda timing would all follow it, but ornament timing would not, because it's fixed in ms.
