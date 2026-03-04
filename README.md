# Snooker Scoreboard

Snooker Scoreboard is a small React + Node app for tracking snooker frames in a club or home setting. It runs in the browser (desktop, laptop, or tablet) and is designed to be readable across the room with large, touch‑friendly controls. The project is split into a **frontend** (Vite + React) and a **backend** (WebSocket server) so multiple people can share the same scoreboard in real time.

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

## Project structure

- `frontend/` – Vite + React single-page app (scoreboard UI)
- `backend/` – Node WebSocket server that manages rooms, roles, and shared state

## Running locally

```bash
cd SnookerScoreboard/backend
npm install
npm start    # starts the WebSocket server on port 4000
```

In a second terminal:

```bash
cd SnookerScoreboard/frontend
npm install
npm run dev  # starts the React dev server (usually on http://localhost:5173)
```

Then open the URL printed in the frontend terminal (usually `http://localhost:5173`).

## How to use during play

1. **Enter player names** at the top of each player card.
2. Use the **Red** and **colour** buttons to score pots; use **Foul to opponent** for fouls.
3. Tap **Switch player at table** when turns change.
4. After a frame is finished, tap **End frame** to award it to the current points leader.
5. Continue until one player reaches the target number of frames. Start again with **New match**.

### Multi-user / online mode

1. Start the backend (`backend/`) and frontend (`frontend/`) as described above.
2. On one device, open the app and click **Create room**:
   - You’ll see three access codes:
     - **Player code** – share with up to two players.
     - **Referee code** – share with the person who should control scoring.
     - **Viewer code** – share with any extra spectators / devices.
3. Players and referee join by entering the appropriate code and clicking **Join**.
4. When a referee is connected, only the referee can change scores or start a new match; players become read-only for scoring. Without a referee, players can update scores directly.
5. At any time you can adjust **Best of** for the room. Pressing **New match**:
   - Resets frame scores, frames won, breaks, history, and the current frame number back to 1.
   - Keeps the same player names, best-of setting, room, referee, and audience so you can play another match in the same session.

For a longer description of official rules, see the snooker article on [billiardworld.com](https://www.billiardworld.com/snooker.html). This project only implements a simplified version of the rules suitable for casual scoring.
