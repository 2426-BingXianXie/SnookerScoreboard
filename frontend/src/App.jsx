import React from 'react'
import './App.css'
import {
  createInitialState,
  applyAction,
  isMatchOver,
  matchReducer,
} from './snookerState'
import { useRoomConnection } from './useRoomConnection'

/**
 * Top-level snooker scoreboard UI.
 *
 * Responsibilities:
 * - Maintain match state (players, frames won, current frame number, best-of setting).
 * - Enforce basic snooker scoring flow (reds vs colours, fouls, reds remaining).
 * - Track the current break and a lightweight action history for undo.
 * - Drive the tablet‑friendly UI for scoring, fouls, and frame control.
 */
function App() {
  const [state, dispatch] = React.useReducer(matchReducer, undefined, () =>
    createInitialState(),
  )
  const [showRules, setShowRules] = React.useState(false)
  const [roomMode, setRoomMode] = React.useState(null) // null | 'create' | 'join'
  const [joinCodeInput, setJoinCodeInput] = React.useState('')

  const {
    roomId,
    codes,
    role,
    connectionStatus,
    stateFromServer,
    hasReferee,
    sendAction,
  } = useRoomConnection({
    mode: roomMode,
    joinCode: roomMode === 'join' ? joinCodeInput.trim().toUpperCase() : null,
  })

  const effectiveState = stateFromServer || state

  const {
    players,
    currentPlayerIndex,
    currentBreak,
    frameNumber,
    bestOf,
    history,
    redsRemaining,
    lastBallType,
    matchWinnerIndex,
  } = effectiveState

  const currentPlayer = players[currentPlayerIndex]
  const matchOver = isMatchOver(effectiveState)
  const isReferee = role === 'referee'
  const isOnline = !!roomId

  // In local mode (no room), allow edits while match is ongoing.
  // In online mode, referee always edits; players can edit only when no referee is present.
  const canEdit =
    !matchOver &&
    (!isOnline || isReferee || (role === 'player' && !hasReferee))

  /**
   * Update the display name for a player at the given index.
   */
  function handleNameChange(index, name) {
    const action = { type: 'rename_player', index, name }
    if (roomId) {
      sendAction(action)
    } else {
      dispatch(action)
    }
  }

  /**
   * Handle a successful pot of a red or colour.
   *
   * Uses the pure reducer and shows a message if the
   * action would be rejected (for example, colour after colour while reds remain).
   */
  function handlePot(points, ballType) {
    if (!canEdit) return

    const action = { type: 'pot', points, ballType }
    const preview = applyAction(effectiveState, action)

    if (
      preview === state &&
      ballType === 'colour' &&
      redsRemaining > 0 &&
      lastBallType === 'colour'
    ) {
      window.alert('You must pot a red before potting another colour.')
      return
    }
    if (roomId) {
      sendAction(action)
    } else {
      dispatch(action)
    }
  }

  /**
   * Award foul points to the non‑striker and reset the current break.
   * The action is recorded so it can be undone.
   */
  function handleFoul(points) {
    if (!canEdit) return
    const action = { type: 'foul', points }
    if (roomId) {
      sendAction(action)
    } else {
      dispatch(action)
    }
  }

  /**
   * Pass the table to the other player and reset the current break.
   * Stores enough previous state to allow undo.
   */
  function handleSwitchTurn() {
    if (!canEdit) return
    const action = { type: 'switch_turn' }
    if (roomId) {
      sendAction(action)
    } else {
      dispatch(action)
    }
  }

  /**
   * Close out the current frame, award it to the points leader,
   * and advance frame/match state. When the winner reaches the
   * required number of frames (based on bestOf), the match is over.
   */
  function handleEndFrame() {
    if (!canEdit) return

    const [p1, p2] = players
    if (p1.frameScore === p2.frameScore) {
      window.alert('Frame is tied. Resolve the frame before ending it.')
      return
    }

    const action = { type: 'end_frame' }
    if (roomId) {
      sendAction(action)
    } else {
      dispatch(action)
    }
  }

  /**
   * Undo the last scoring / foul / switch action within the current frame.
   * Uses the history stack to restore scores, break, redsRemaining, and turn.
   */
  function handleUndo() {
    if (!canEdit) return
    if (history.length === 0) return
    const action = { type: 'undo' }
    if (roomId) {
      sendAction(action)
    } else {
      dispatch(action)
    }
  }

  /**
   * Reset all match state but keep the existing player names.
   * Clears scores, frames won, break, history, and match winner.
   */
  function handleNewMatch() {
    // In online rooms, only the referee can start a fresh match.
    if (roomId && role !== 'referee') {
      window.alert('Only the referee can start a new match in this room.')
      return
    }

    const action = { type: 'new_match' }
    if (roomId) {
      sendAction(action)
    } else {
      dispatch(action)
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>Snooker Scoreboard</h1>
          <p className="subtitle">Tablet-friendly scoring for two players</p>
          <p className="subtitle">
            {roomId
              ? `Online room · role: ${role ?? 'unknown'} · ${connectionStatus}${
                  hasReferee ? ' · referee present' : ''
                }`
              : 'Local device mode (no server)'}
          </p>
        </div>
        <div className="match-info">
          <div className="frame-info">
            Frame <span className="value">{frameNumber}</span>
          </div>
          <div className="frame-info">
            Best of
            <input
              type="number"
              min="1"
              max="35"
              value={bestOf}
              onChange={(e) => {
                const n = Number(e.target.value || 1)
                const clamped = Number.isNaN(n) ? 1 : Math.max(1, Math.min(35, n))
                dispatch({ type: 'update_best_of', bestOf: clamped })
              }}
            />
          </div>
          <button
            className="secondary-button"
            type="button"
            onClick={() => setShowRules(true)}
          >
            Snooker rules
          </button>
          <button className="secondary-button" type="button" onClick={handleNewMatch}>
            New match
          </button>
          {!roomId && (
            <>
              <button
                className="secondary-button"
                type="button"
                onClick={() => setRoomMode('create')}
              >
                Create room
              </button>
              <div className="frame-info">
                Join
                <input
                  type="text"
                  placeholder="Room code"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                />
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => {
                    if (!joinCodeInput.trim()) return
                    setRoomMode('join')
                  }}
                >
                  Join
                </button>
              </div>
            </>
          )}
          {roomId && codes && (
            <div className="frame-info">
              <span>Player code: {codes.player}</span>
              <span>Referee code: {codes.referee}</span>
              <span>Viewer code: {codes.viewer}</span>
            </div>
          )}
        </div>
      </header>

      <main className="content">
        {showRules && (
          <div className="rules-overlay" onClick={() => setShowRules(false)}>
            <div
              className="rules-modal"
              onClick={(e) => {
                e.stopPropagation()
              }}
            >
              <div className="rules-modal-header">
                <h2>Snooker scoring guide</h2>
                <button
                  type="button"
                  className="secondary-button rules-close"
                  onClick={() => setShowRules(false)}
                >
                  Close
                </button>
              </div>
              <div className="rules-modal-body">
                <section>
                  <h3>Objective</h3>
                  <p>Score more points than your opponent in each frame by potting reds and colours in the correct order.</p>
                </section>
                <section>
                  <h3>Ball values</h3>
                  <p>Red = 1, Yellow = 2, Green = 3, Brown = 4, Blue = 5, Pink = 6, Black = 7.</p>
                </section>
                <section>
                  <h3>Basic scoring sequence</h3>
                  <ul>
                    <li>While any reds are left: play <strong>red → colour → red → colour</strong>, and so on.</li>
                    <li>You may pot one or more reds on a red shot; each red scores 1 and stays off the table.</li>
                    <li>On a colour shot, you must nominate and hit that colour first. Potted colours score their value and are re-spotted while reds remain.</li>
                    <li>After all reds are gone, pot the colours in order: Yellow, Green, Brown, Blue, Pink, Black. These colours stay off the table.</li>
                  </ul>
                </section>
                <section>
                  <h3>Fouls (common examples)</h3>
                  <ul>
                    <li>Hitting the wrong ball first (for example, a colour first when red is on).</li>
                    <li>Failing to hit any ball.</li>
                    <li>Potting the cue ball.</li>
                    <li>Potting a ball that is not on.</li>
                  </ul>
                  <p>Fouls give your opponent at least 4 points, or the value of the ball involved if higher.</p>
                </section>
                <section className="rules-modal-footer">
                  <p className="rules-note">
                    This summary is based on the rules article published at{' '}
                    <a
                      href="https://www.billiardworld.com/snooker.html"
                      target="_blank"
                      rel="noreferrer"
                    >
                      billiardworld.com
                    </a>
                    . Please refer to that site or your local governing body for the full official wording.
                  </p>
                </section>
              </div>
            </div>
          </div>
        )}
        {matchOver && (
          <div className="match-winner-banner">
            Match winner: <span>{players[matchWinnerIndex].name}</span>
          </div>
        )}
        <section className="players">
          {players.map((player, index) => {
            const isActive = index === currentPlayerIndex
            return (
              <div
                key={index}
                className={`player-card ${isActive ? 'active' : ''}`}
              >
                <div className="player-header">
                  <input
                    className="player-name"
                    value={player.name}
                    onChange={(e) => handleNameChange(index, e.target.value)}
                  />
                  <div className="frames-won">
                    Frames: <span className="value">{player.framesWon}</span>
                  </div>
                </div>
                <div className="player-score">
                  <div className="label">Frame score</div>
                  <div className="score-value">{player.frameScore}</div>
                </div>
                {isActive && (
                  <div className="current-break">
                    Current break:{' '}
                    <span className="value">{currentBreak}</span>
                  </div>
                )}
              </div>
            )
          })}
        </section>

        <section className="controls">
          <div className="turn-indicator">
            <span>At table: <span>{currentPlayer.name}</span></span>
            <span style={{ marginLeft: '1rem', fontSize: '0.9rem', color: '#9ca3af' }}>
              Reds remaining: <span style={{ color: '#facc15', fontWeight: 600 }}>{redsRemaining}</span>
            </span>
          </div>

          <div className="button-group">
            <div className="group-title">Reds & colours</div>
            <div className="buttons-row single">
              <button
                className="ball-button red"
                onClick={() => handlePot(1, 'red')}
                disabled={matchOver}
              >
                Red
                <span className="points">1</span>
              </button>
            </div>
            <div className="buttons-row">
              <button
                className="ball-button yellow"
                onClick={() => handlePot(2, 'colour')}
                disabled={matchOver}
              >
                Yellow
                <span className="points">2</span>
              </button>
              <button
                className="ball-button green"
                onClick={() => handlePot(3, 'colour')}
                disabled={matchOver}
              >
                Green
                <span className="points">3</span>
              </button>
              <button
                className="ball-button brown"
                onClick={() => handlePot(4, 'colour')}
                disabled={matchOver}
              >
                Brown
                <span className="points">4</span>
              </button>
            </div>
            <div className="buttons-row">
              <button
                className="ball-button blue"
                onClick={() => handlePot(5, 'colour')}
                disabled={matchOver}
              >
                Blue
                <span className="points">5</span>
              </button>
              <button
                className="ball-button pink"
                onClick={() => handlePot(6, 'colour')}
                disabled={matchOver}
              >
                Pink
                <span className="points">6</span>
              </button>
              <button
                className="ball-button black"
                onClick={() => handlePot(7, 'colour')}
                disabled={matchOver}
              >
                Black
                <span className="points">7</span>
              </button>
            </div>
          </div>

          <div className="button-group">
            <div className="group-title">Foul to opponent</div>
            <div className="buttons-row">
              {[4, 5, 6, 7].map((points) => (
                <button
                  key={points}
                  className="foul-button"
                  onClick={() => handleFoul(points)}
                  disabled={matchOver}
                >
                  +{points}
                </button>
              ))}
            </div>
          </div>

            <div className="button-group utility-group">
            <div className="buttons-row">
              <button onClick={handleSwitchTurn} disabled={matchOver}>
                Switch player at table
              </button>
              <button onClick={handleEndFrame} disabled={matchOver}>
                End frame
              </button>
            </div>
            <div className="buttons-row">
              <button
                className="secondary-button full-width"
                onClick={handleUndo}
                disabled={history.length === 0 || matchOver}
              >
                Undo last action
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
