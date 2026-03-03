# Snooker Scoreboard

Snooker Scoreboard is a small React app for tracking snooker frames in a club or home setting. It runs in the browser (desktop, laptop, or tablet) and is designed to be readable across the room with large, touch‑friendly controls.

## Features

- **Two-player match tracking**: player names, frame scores, and frames won.
- **Scoring controls**: buttons for all balls (Red, Yellow, Green, Brown, Blue, Pink, Black) with correct point values.
- **Basic rules assistance**:
  - Enforces the `red → colour → red → colour` pattern while reds remain (no back‑to‑back colours unless reds are gone).
  - Allows multiple reds to be scored in a row.
  - Tracks **reds remaining**.
- **Frame and match logic**:
  - `End frame` determines the frame winner from current points.
  - `Best of N` setting; first to `floor(N / 2) + 1` frames wins the match.
  - Match winner banner and automatic lockout of further scoring.
- **History tools**: `Undo last action`, `Switch player at table`, `Foul to opponent` (+4, +5, +6, +7).
- **Snooker rules panel**: in‑app, mobile‑friendly summary of basic scoring rules, with a link to the longer article on [billiardworld.com](https://www.billiardworld.com/snooker.html).

## Getting started

```bash
cd SnookerScoreboard
npm install
npm run dev
```

Then open the URL printed in the terminal (usually `http://localhost:5173`).

## How to use during play

1. **Enter player names** at the top of each player card.
2. Use the **Red** and **colour** buttons to score pots; use **Foul to opponent** for fouls.
3. Tap **Switch player at table** when turns change.
4. After a frame is finished, tap **End frame** to award it to the current points leader.
5. Continue until one player reaches the target number of frames. Start again with **New match**.

For a longer description of official rules, see the snooker article on [billiardworld.com](https://www.billiardworld.com/snooker.html). This project only implements a simplified version of the rules suitable for casual scoring.
