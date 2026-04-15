# Snooker Scoreboard

A real-time snooker scoreboard built with React and Node.js. Designed for clubs, home play, or anywhere you need a large, readable score display with touch-friendly controls. The app runs in the browser and supports both local single-device use and multi-device online rooms via WebSocket.

## Features

- **Two-player match tracking**: editable player names, frame scores, current break, and frames won.
- **Scoring controls**: buttons for all standard balls (Red 1, Yellow 2, Green 3, Brown 4, Blue 5, Pink 6, Black 7).
- **Basic rules assistance**:
  - Enforces the red-colour-red-colour pattern while reds remain.
  - Allows multiple reds scored in a row.
  - Tracks reds remaining on the table.
- **Frame and match logic**:
  - End frame awards it to the current points leader.
  - Best-of-N setting (1-35); first to `floor(N/2) + 1` frames wins.
  - Match winner banner and automatic scoring lockout.
- **History tools**: undo last action (pot, foul, or turn switch), switch player at table, foul-to-opponent (+4, +5, +6, +7).
- **Online rooms** (WebSocket):
  - Create a room and share access codes for players, referee, and viewers.
  - Referee mode locks scoring to a single authority; without a referee, players can score directly.
  - State is broadcast to all connected clients in real time.
- **In-app rules panel**: mobile-friendly scoring guide with a link to the full rules on [billiardworld.com](https://www.billiardworld.com/snooker.html).

## Tech stack

| Layer    | Technology                    |
| -------- | ----------------------------- |
| Frontend | React 19, Vite 7, JavaScript |
| Backend  | Node.js, ws (WebSocket)      |

## Project structure

```
SnookerScoreboard/
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Main scoreboard UI
│   │   ├── App.css              # Styles
│   │   ├── snookerState.js      # Pure state reducer (shared with backend)
│   │   └── useRoomConnection.js # WebSocket client hook
│   └── package.json
├── backend/
│   ├── server.js                # WebSocket server (rooms, roles, state sync)
│   └── package.json
└── README.md
```

## Running locally

Start the backend:

```bash
cd SnookerScoreboard/backend
npm install
npm start
```

In a second terminal, start the frontend:

```bash
cd SnookerScoreboard/frontend
npm install
npm run dev
```

Open the URL printed in the frontend terminal (default `http://localhost:5173`).

## Environment variables

| Variable                   | Default                | Description                          |
| -------------------------- | ---------------------- | ------------------------------------ |
| `PORT`                     | `4000`                 | Backend WebSocket server port        |
| `VITE_SNOOKER_SERVER_URL`  | `ws://localhost:4000`  | Frontend WebSocket endpoint override |

## How to use during play

1. **Enter player names** at the top of each player card.
2. Use the **Red** and **colour** buttons to score pots; use **Foul to opponent** for fouls.
3. Tap **Switch player at table** when turns change.
4. After a frame is finished, tap **End frame** to award it to the current points leader.
5. Continue until one player reaches the target number of frames. Start again with **New match**.

### Multi-user / online mode

1. Start the backend and frontend as described above.
2. On one device, open the app and click **Create room**:
   - You'll see three access codes:
     - **Player code** — share with up to two players.
     - **Referee code** — share with the person who should control scoring.
     - **Viewer code** — share with any extra spectators / devices.
3. Players and referee join by entering the appropriate code and clicking **Join**.
4. When a referee is connected, only the referee can change scores or start a new match; players become read-only. Without a referee, players can score directly.
5. **Best of** can be adjusted at any time. Pressing **New match** resets frame scores, frames won, break, history, and frame number back to 1 while keeping player names, best-of setting, room, referee, and audience intact.

For the full official rules, see the snooker article on [billiardworld.com](https://www.billiardworld.com/snooker.html). This project implements a simplified subset suitable for casual scoring.
