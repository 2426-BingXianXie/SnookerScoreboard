// Pure state management for the snooker scoreboard.
// This module contains no React imports and is safe to reuse on the server.

export function createInitialState() {
  return {
    players: [
      { name: 'Player 1', frameScore: 0, framesWon: 0 },
      { name: 'Player 2', frameScore: 0, framesWon: 0 },
    ],
    currentPlayerIndex: 0,
    currentBreak: 0,
    frameNumber: 1,
    bestOf: 5,
    history: [],
    redsRemaining: 15,
    lastBallType: null, // 'red' | 'colour' | null
    matchWinnerIndex: null,
  };
}

export function isMatchOver(state) {
  return state.matchWinnerIndex !== null;
}

function updatePlayerScore(state, playerIndex, delta) {
  return {
    ...state,
    players: state.players.map((p, i) =>
      i === playerIndex ? { ...p, frameScore: p.frameScore + delta } : p,
    ),
  };
}

export function applyAction(state, action) {
  switch (action.type) {
    case 'rename_player': {
      const { index, name } = action;
      return {
        ...state,
        players: state.players.map((p, i) =>
          i === index ? { ...p, name } : p,
        ),
      };
    }

    case 'update_best_of': {
      const { bestOf } = action;
      return {
        ...state,
        bestOf,
      };
    }

    case 'pot': {
      if (isMatchOver(state)) return state;

      const { points, ballType } = action;

      // Prevent colours being potted one after another while reds are still on the table.
      if (
        ballType === 'colour' &&
        state.redsRemaining > 0 &&
        state.lastBallType === 'colour'
      ) {
        // Illegal sequence – state is unchanged. UI can show a message.
        return state;
      }

      let nextState = state;

      if (ballType === 'red' && state.redsRemaining > 0) {
        nextState = {
          ...nextState,
          redsRemaining: Math.max(0, nextState.redsRemaining - 1),
        };
      }

      nextState = updatePlayerScore(
        nextState,
        nextState.currentPlayerIndex,
        points,
      );

      nextState = {
        ...nextState,
        currentBreak: nextState.currentBreak + points,
        history: [
          ...nextState.history,
          {
            type: 'pot',
            playerIndex: nextState.currentPlayerIndex,
            points,
            ballType,
          },
        ],
        lastBallType: ballType,
      };

      return nextState;
    }

    case 'foul': {
      if (isMatchOver(state)) return state;

      const { points } = action;
      const opponentIndex = 1 - state.currentPlayerIndex;
      const prevBreak = state.currentBreak;

      let nextState = updatePlayerScore(state, opponentIndex, points);
      nextState = {
        ...nextState,
        currentBreak: 0,
        history: [
          ...nextState.history,
          {
            type: 'foul',
            opponentIndex,
            points,
            previousBreak: prevBreak,
          },
        ],
        lastBallType: null,
      };

      return nextState;
    }

    case 'switch_turn': {
      if (isMatchOver(state)) return state;

      return {
        ...state,
        history: [
          ...state.history,
          {
            type: 'switch',
            previousPlayerIndex: state.currentPlayerIndex,
            previousBreak: state.currentBreak,
            previousLastBallType: state.lastBallType,
          },
        ],
        currentPlayerIndex: 1 - state.currentPlayerIndex,
        currentBreak: 0,
        lastBallType: null,
      };
    }

    case 'end_frame': {
      if (isMatchOver(state)) return state;

      const [p1, p2] = state.players;
      if (p1.frameScore === p2.frameScore) {
        // Do not allow ending a tied frame.
        return state;
      }

      const winnerIndex = p1.frameScore > p2.frameScore ? 0 : 1;
      const framesForWinner = state.players[winnerIndex].framesWon + 1;
      const framesNeededToWin = Math.floor(state.bestOf / 2) + 1;

      const players = state.players.map((p, i) =>
        i === winnerIndex
          ? { ...p, framesWon: p.framesWon + 1, frameScore: 0 }
          : { ...p, frameScore: 0 },
      );

      return {
        ...state,
        players,
        currentBreak: 0,
        history: [],
        frameNumber: state.frameNumber + 1,
        currentPlayerIndex: winnerIndex,
        redsRemaining: 15,
        lastBallType: null,
        matchWinnerIndex:
          framesForWinner >= framesNeededToWin ? winnerIndex : state.matchWinnerIndex,
      };
    }

    case 'undo': {
      if (isMatchOver(state)) return state;
      if (state.history.length === 0) return state;

      const last = state.history[state.history.length - 1];
      const beforeLast = state.history[state.history.length - 2];

      let nextState = {
        ...state,
        history: state.history.slice(0, state.history.length - 1),
      };

      if (last.type === 'pot') {
        nextState = updatePlayerScore(nextState, last.playerIndex, -last.points);
        nextState = {
          ...nextState,
          currentBreak: Math.max(0, nextState.currentBreak - last.points),
        };

        if (last.ballType === 'red') {
          nextState = {
            ...nextState,
            redsRemaining: nextState.redsRemaining + 1,
          };
        }

        nextState = {
          ...nextState,
          lastBallType:
            beforeLast && beforeLast.ballType ? beforeLast.ballType : null,
        };
      } else if (last.type === 'foul') {
        nextState = updatePlayerScore(
          nextState,
          last.opponentIndex,
          -last.points,
        );
        nextState = {
          ...nextState,
          currentBreak: last.previousBreak,
          lastBallType: null,
        };
      } else if (last.type === 'switch') {
        nextState = {
          ...nextState,
          currentPlayerIndex: last.previousPlayerIndex,
          currentBreak: last.previousBreak,
          lastBallType: last.previousLastBallType ?? null,
        };
      }

      return nextState;
    }

    case 'new_match': {
      // Start a fresh match in the same room.
      // Preserve player names and current bestOf, but reset all frame/match state.
      return {
        ...state,
        players: state.players.map((p) => ({
          ...p,
          frameScore: 0,
          framesWon: 0,
        })),
        currentPlayerIndex: 0,
        currentBreak: 0,
        frameNumber: 1,
        history: [],
        redsRemaining: 15,
        lastBallType: null,
        matchWinnerIndex: null,
      };
    }

    default:
      return state;
  }
}

export function matchReducer(state, action) {
  if (!state) {
    return createInitialState();
  }
  return applyAction(state, action);
}

