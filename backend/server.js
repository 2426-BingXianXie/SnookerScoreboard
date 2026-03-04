// Simple Node.js WebSocket server for SnookerScoreboard.
// Manages rooms, roles, and shared match state.

import http from 'http';
import { WebSocketServer } from 'ws';
import { createInitialState, matchReducer } from '../frontend/src/snookerState.js';

const PORT = process.env.PORT || 4000;

const server = http.createServer();
const wss = new WebSocketServer({ server });

// internalRoomId -> { state, codes, clients: Map<ws, { role, playerIndex | null }> }
const rooms = new Map();
// code -> { roomId, role }
const accessCodeIndex = new Map();

function generateRandomCode(length = 6) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

function createRoom() {
  const roomId = generateRandomCode(8);

  const codes = {
    player: `P-${generateRandomCode(6)}`,
    referee: `R-${generateRandomCode(6)}`,
    viewer: `V-${generateRandomCode(6)}`,
  };

  rooms.set(roomId, {
    state: createInitialState(),
    clients: new Map(),
    codes,
  });

  accessCodeIndex.set(codes.player, { roomId, role: 'player' });
  accessCodeIndex.set(codes.referee, { roomId, role: 'referee' });
  accessCodeIndex.set(codes.viewer, { roomId, role: 'viewer' });

  return { roomId, codes };
}

function broadcastState(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;

  const payload = {
    type: 'state_update',
    roomId,
    state: room.state,
  };

  const data = JSON.stringify(payload);
  for (const ws of room.clients.keys()) {
    if (ws.readyState === ws.OPEN) {
      ws.send(data);
    }
  }
}

function assignRole(room, ws, requestedRole) {
  if (requestedRole === 'referee') {
    // Single referee per room.
    for (const info of room.clients.values()) {
      if (info.role === 'referee') {
        return { role: 'viewer', playerIndex: null };
      }
    }
    room.clients.set(ws, { role: 'referee', playerIndex: null });
    return room.clients.get(ws);
  }

  if (requestedRole === 'viewer') {
    room.clients.set(ws, { role: 'viewer', playerIndex: null });
    return room.clients.get(ws);
  }

  // Player role: up to two player slots.
  let playerSlots = [false, false];
  for (const info of room.clients.values()) {
    if (info.role === 'player' && info.playerIndex != null) {
      playerSlots[info.playerIndex] = true;
    }
  }

  if (!playerSlots[0]) {
    room.clients.set(ws, { role: 'player', playerIndex: 0 });
  } else if (!playerSlots[1]) {
    room.clients.set(ws, { role: 'player', playerIndex: 1 });
  } else {
    room.clients.set(ws, { role: 'viewer', playerIndex: null });
  }

  return room.clients.get(ws);
}

function handleMessage(ws, message) {
  let parsed;
  try {
    parsed = JSON.parse(message);
  } catch (_err) {
    ws.send(JSON.stringify({ type: 'error', error: 'Invalid JSON message' }));
    return;
  }

  const { type, code, roomId, payload } = parsed;

  if (type === 'create_room') {
    const { roomId: newRoomId, codes } = createRoom();
    const room = rooms.get(newRoomId);
    const info = assignRole(room, ws, 'player');
    ws.roomId = newRoomId;

    ws.send(
      JSON.stringify({
        type: 'room_created',
        roomId: newRoomId,
        codes,
        role: info.role,
        playerIndex: info.playerIndex,
        state: room.state,
      }),
    );
    return;
  }

  if (type === 'join_room') {
    if (!code || !accessCodeIndex.has(code)) {
      ws.send(JSON.stringify({ type: 'error', error: 'Code not found' }));
      return;
    }
    const { roomId: joinRoomId, role: requestedRole } = accessCodeIndex.get(code);
    const room = rooms.get(joinRoomId);
    if (!room) {
      ws.send(JSON.stringify({ type: 'error', error: 'Room not found' }));
      return;
    }

    const info = assignRole(room, ws, requestedRole);
    ws.roomId = joinRoomId;

    ws.send(
      JSON.stringify({
        type: 'joined_room',
        roomId: joinRoomId,
        role: info.role,
        playerIndex: info.playerIndex,
        state: room.state,
      }),
    );
    return;
  }

  if (!roomId || !rooms.has(roomId)) {
    ws.send(JSON.stringify({ type: 'error', error: 'Unknown room' }));
    return;
  }

  const room = rooms.get(roomId);
  const clientInfo = room.clients.get(ws);

  if (type === 'apply_action') {
    if (!clientInfo) {
      ws.send(JSON.stringify({ type: 'error', error: 'Not part of this room' }));
      return;
    }

    // If a referee is present, only referee can modify.
    const hasReferee = Array.from(room.clients.values()).some(
      (info) => info.role === 'referee',
    );

    const canEdit =
      clientInfo.role === 'referee' ||
      (clientInfo.role === 'player' && !hasReferee);

    if (!canEdit) {
      ws.send(JSON.stringify({ type: 'error', error: 'You cannot modify the match in this role' }));
      return;
    }

    const { action } = payload || {};
    if (!action || typeof action.type !== 'string') {
      ws.send(JSON.stringify({ type: 'error', error: 'Invalid action payload' }));
      return;
    }

    const prevState = room.state;
    const nextState = matchReducer(prevState, action);
    room.state = nextState;

    const hasRefereeAfter = Array.from(room.clients.values()).some(
      (info) => info.role === 'referee',
    );

    broadcastStateWithMeta(roomId, hasRefereeAfter);
    return;
  }

  ws.send(JSON.stringify({ type: 'error', error: 'Unknown message type' }));
}

function broadcastStateWithMeta(roomId, hasReferee) {
  const room = rooms.get(roomId);
  if (!room) return;

  const base = {
    type: 'state_update',
    roomId,
    state: room.state,
    hasReferee,
  };

  const data = JSON.stringify(base);
  for (const ws of room.clients.keys()) {
    if (ws.readyState === ws.OPEN) {
      ws.send(data);
    }
  }
}

wss.on('connection', (ws) => {
  ws.on('message', (msg) => handleMessage(ws, msg));

  ws.on('close', () => {
    const { roomId } = ws;
    if (!roomId || !rooms.has(roomId)) return;
    const room = rooms.get(roomId);
    room.clients.delete(ws);

    if (room.clients.size === 0) {
      rooms.delete(roomId);
    }
  });
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Snooker scoreboard server listening on port ${PORT}`);
});

