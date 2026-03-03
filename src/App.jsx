import React from 'react'
import './App.css'

function App() {
  const [players, setPlayers] = React.useState([
    { name: 'Player 1', frameScore: 0, framesWon: 0 },
    { name: 'Player 2', frameScore: 0, framesWon: 0 },
  ])
  const [currentPlayerIndex, setCurrentPlayerIndex] = React.useState(0)
  const [currentBreak, setCurrentBreak] = React.useState(0)
  const [frameNumber, setFrameNumber] = React.useState(1)
  const [bestOf, setBestOf] = React.useState(5)
  const [history, setHistory] = React.useState([])
  const [redsRemaining, setRedsRemaining] = React.useState(15)
  const [lastBallType, setLastBallType] = React.useState(null) // 'red' | 'colour' | null
  const [matchWinnerIndex, setMatchWinnerIndex] = React.useState(null)
  const [showRules, setShowRules] = React.useState(false)

  const currentPlayer = players[currentPlayerIndex]
  const matchOver = matchWinnerIndex !== null

  function updatePlayerScore(playerIndex, delta) {
    setPlayers((prev) =>
      prev.map((p, i) =>
        i === playerIndex ? { ...p, frameScore: p.frameScore + delta } : p,
      ),
    )
  }

  function handleNameChange(index, name) {
    setPlayers((prev) =>
      prev.map((p, i) => (i === index ? { ...p, name } : p)),
    )
  }

  function handlePot(points, ballType) {
    if (matchOver) return

    // Prevent colours being potted one after another while reds are still on the table.
    if (ballType === 'colour' && redsRemaining > 0 && lastBallType === 'colour') {
      window.alert('You must pot a red before potting another colour.')
      return
    }

    if (ballType === 'red' && redsRemaining > 0) {
      setRedsRemaining((prev) => Math.max(0, prev - 1))
    }

    updatePlayerScore(currentPlayerIndex, points)
    setCurrentBreak((prev) => prev + points)
    setHistory((prev) => [
      ...prev,
      { type: 'pot', playerIndex: currentPlayerIndex, points, ballType },
    ])
    setLastBallType(ballType)
  }

  function handleFoul(points) {
    if (matchOver) return
    const opponentIndex = 1 - currentPlayerIndex
    const prevBreak = currentBreak
    updatePlayerScore(opponentIndex, points)
    setCurrentBreak(0)
    setHistory((prev) => [
      ...prev,
      {
        type: 'foul',
        opponentIndex,
        points,
        previousBreak: prevBreak,
      },
    ])
    // After a foul, next legal ball depends on table, but
    // for our simple model we clear the last ball info.
    setLastBallType(null)
  }

  function handleSwitchTurn() {
    if (matchOver) return
    setHistory((prev) => [
      ...prev,
      {
        type: 'switch',
        previousPlayerIndex: currentPlayerIndex,
        previousBreak: currentBreak,
        previousLastBallType: lastBallType,
      },
    ])
    setCurrentPlayerIndex(1 - currentPlayerIndex)
    setCurrentBreak(0)
    setLastBallType(null)
  }

  function handleEndFrame() {
    if (matchOver) return

    const [p1, p2] = players
    if (p1.frameScore === p2.frameScore) {
      // Simple rule: do not allow ending a tied frame
      window.alert('Frame is tied. Resolve the frame before ending it.')
      return
    }

    const winnerIndex = p1.frameScore > p2.frameScore ? 0 : 1
    const framesForWinner = players[winnerIndex].framesWon + 1
    const framesNeededToWin = Math.floor(bestOf / 2) + 1

    if (framesForWinner >= framesNeededToWin) {
      setMatchWinnerIndex(winnerIndex)
    }
    setPlayers((prev) =>
      prev.map((p, i) =>
        i === winnerIndex ? { ...p, framesWon: p.framesWon + 1, frameScore: 0 } : { ...p, frameScore: 0 },
      ),
    )
    setCurrentBreak(0)
    setHistory([])
    setFrameNumber((prev) => prev + 1)
    setCurrentPlayerIndex(winnerIndex)
    setRedsRemaining(15)
    setLastBallType(null)
  }

  function handleUndo() {
    if (matchOver) return
    if (history.length === 0) return
    const last = history[history.length - 1]
    setHistory((prev) => prev.slice(0, prev.length - 1))

    if (last.type === 'pot') {
      updatePlayerScore(last.playerIndex, -last.points)
      setCurrentBreak((prev) => Math.max(0, prev - last.points))
      if (last.ballType) {
        // Restore lastBallType based on previous history entry, if any.
        const beforeLast = history[history.length - 2]
        setLastBallType(beforeLast && beforeLast.ballType ? beforeLast.ballType : null)
        if (last.ballType === 'red') {
          setRedsRemaining((prev) => prev + 1)
        }
      }
    } else if (last.type === 'foul') {
      updatePlayerScore(last.opponentIndex, -last.points)
      setCurrentBreak(last.previousBreak)
      setLastBallType(null)
    } else if (last.type === 'switch') {
      setCurrentPlayerIndex(last.previousPlayerIndex)
      setCurrentBreak(last.previousBreak)
      setLastBallType(last.previousLastBallType ?? null)
    }
  }

  function handleNewMatch() {
    setPlayers((prev) =>
      prev.map((p) => ({
        ...p,
        frameScore: 0,
        framesWon: 0,
      })),
    )
    setCurrentBreak(0)
    setFrameNumber(1)
    setCurrentPlayerIndex(0)
    setHistory([])
    setRedsRemaining(15)
    setLastBallType(null)
    setMatchWinnerIndex(null)
  }

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>Snooker Scoreboard</h1>
          <p className="subtitle">Tablet-friendly scoring for two players</p>
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
              onChange={(e) =>
                setBestOf(() => {
                  const n = Number(e.target.value || 1)
                  return Number.isNaN(n) ? 1 : Math.max(1, Math.min(35, n))
                })
              }
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
