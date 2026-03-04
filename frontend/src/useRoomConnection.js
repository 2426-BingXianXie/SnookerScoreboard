import { useEffect, useRef, useState } from 'react'

const DEFAULT_SERVER_URL = import.meta.env.VITE_SNOOKER_SERVER_URL || 'ws://localhost:4000'

export function useRoomConnection({ mode, joinCode }) {
  const [roomId, setRoomId] = useState(null)
  const [codes, setCodes] = useState(null) // { player, referee, viewer } for creator
  const [role, setRole] = useState(null) // 'player' | 'referee' | 'viewer'
  const [playerIndex, setPlayerIndex] = useState(null)
  const [connectionStatus, setConnectionStatus] = useState('disconnected') // 'connecting' | 'connected' | 'disconnected'
  const [stateFromServer, setStateFromServer] = useState(null)
  const [hasReferee, setHasReferee] = useState(false)
  const wsRef = useRef(null)

  useEffect(() => {
    if (!mode) return

    const ws = new WebSocket(DEFAULT_SERVER_URL)
    wsRef.current = ws
    setConnectionStatus('connecting')

    ws.onopen = () => {
      if (mode === 'create') {
        ws.send(JSON.stringify({ type: 'create_room' }))
      } else if (mode === 'join' && joinCode) {
        ws.send(JSON.stringify({ type: 'join_room', code: joinCode }))
      }
    }

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data)
      if (msg.type === 'room_created') {
        setRoomId(msg.roomId)
        setCodes(msg.codes)
        setRole(msg.role)
        setPlayerIndex(msg.playerIndex)
        setStateFromServer(msg.state)
        setConnectionStatus('connected')
      } else if (msg.type === 'joined_room') {
        setRoomId(msg.roomId)
        setRole(msg.role)
        setPlayerIndex(msg.playerIndex)
        setStateFromServer(msg.state)
        setConnectionStatus('connected')
      } else if (msg.type === 'state_update') {
        setStateFromServer(msg.state)
        if (typeof msg.hasReferee === 'boolean') {
          setHasReferee(msg.hasReferee)
        }
      } else if (msg.type === 'error') {
        // For now, surface in console; UI can add toast later.
        // eslint-disable-next-line no-console
        console.error('Server error:', msg.error)
      }
    }

    ws.onclose = () => {
      setConnectionStatus('disconnected')
    }

    return () => {
      ws.close()
    }
  }, [mode, joinCode])

  function sendAction(action) {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN || !roomId) return
    ws.send(
      JSON.stringify({
        type: 'apply_action',
        roomId,
        payload: { action },
      }),
    )
  }

  return {
    roomId,
    codes,
    role,
    playerIndex,
    connectionStatus,
    stateFromServer,
    hasReferee,
    sendAction,
  }
}

