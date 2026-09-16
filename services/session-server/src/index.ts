import {createServer} from 'node:http';
import {randomBytes, randomUUID} from 'node:crypto';
import {WebSocket, WebSocketServer} from 'ws';

const PORT = Number.parseInt(process.env.PORT ?? '8080', 10);
const MAX_PLAYERS = 4;
const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

type Player = {
  id: string;
  name: string;
  socket: WebSocket;
};

type Room = {
  code: string;
  players: Map<string, Player>;
  createdAt: number;
};

type ClientMessage =
  | {type: 'create_room'; playerName?: string}
  | {type: 'join_room'; code: string; playerName?: string}
  | {type: 'input'; sequence: number; input: Record<string, boolean | number>}
  | {type: 'ping'};

const rooms = new Map<string, Room>();
const memberships = new Map<WebSocket, {roomCode: string; playerId: string}>();

function makeRoomCode(): string {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const bytes = randomBytes(4);
    const code = Array.from(bytes, byte => ROOM_ALPHABET[byte % ROOM_ALPHABET.length]).join('');
    if (!rooms.has(code)) return code;
  }
  throw new Error('Could not allocate a room code');
}

function safeName(name: string | undefined): string {
  return (name?.trim().slice(0, 24) || 'Outlaw').replace(/[<>]/g, '');
}

function send(socket: WebSocket, payload: unknown): void {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(payload));
}

function roomState(room: Room) {
  return {
    code: room.code,
    maxPlayers: MAX_PLAYERS,
    players: Array.from(room.players.values(), player => ({id: player.id, name: player.name})),
  };
}

function broadcast(room: Room, payload: unknown, except?: WebSocket): void {
  room.players.forEach(player => {
    if (player.socket !== except) send(player.socket, payload);
  });
}

function leave(socket: WebSocket): void {
  const membership = memberships.get(socket);
  if (!membership) return;
  memberships.delete(socket);
  const room = rooms.get(membership.roomCode);
  if (!room) return;
  room.players.delete(membership.playerId);
  if (room.players.size === 0) {
    rooms.delete(room.code);
  } else {
    broadcast(room, {type: 'room_state', room: roomState(room)});
  }
}

function join(socket: WebSocket, room: Room, playerName?: string): void {
  if (room.players.size >= MAX_PLAYERS) {
    send(socket, {type: 'error', code: 'ROOM_FULL', message: 'That posse already has four players.'});
    return;
  }
  leave(socket);
  const player: Player = {id: randomUUID(), name: safeName(playerName), socket};
  room.players.set(player.id, player);
  memberships.set(socket, {roomCode: room.code, playerId: player.id});
  send(socket, {type: 'room_joined', playerId: player.id, room: roomState(room)});
  broadcast(room, {type: 'room_state', room: roomState(room)}, socket);
}

const server = createServer((request, response) => {
  if (request.url === '/health') {
    response.writeHead(200, {'content-type': 'application/json'});
    response.end(JSON.stringify({ok: true, rooms: rooms.size}));
    return;
  }
  response.writeHead(404, {'content-type': 'application/json'});
  response.end(JSON.stringify({error: 'not_found'}));
});

const webSockets = new WebSocketServer({server, path: '/socket'});

webSockets.on('connection', socket => {
  send(socket, {type: 'connected', maxPlayers: MAX_PLAYERS});

  socket.on('message', data => {
    let message: ClientMessage;
    try {
      message = JSON.parse(data.toString()) as ClientMessage;
    } catch {
      send(socket, {type: 'error', code: 'BAD_JSON', message: 'Message must be valid JSON.'});
      return;
    }

    if (message.type === 'create_room') {
      const room: Room = {code: makeRoomCode(), players: new Map(), createdAt: Date.now()};
      rooms.set(room.code, room);
      join(socket, room, message.playerName);
      return;
    }

    if (message.type === 'join_room') {
      const room = rooms.get(message.code.toUpperCase());
      if (!room) {
        send(socket, {type: 'error', code: 'ROOM_NOT_FOUND', message: 'No active room uses that code.'});
        return;
      }
      join(socket, room, message.playerName);
      return;
    }

    if (message.type === 'input') {
      const membership = memberships.get(socket);
      const room = membership ? rooms.get(membership.roomCode) : undefined;
      if (!room || !membership) return;
      broadcast(room, {
        type: 'player_input',
        playerId: membership.playerId,
        sequence: message.sequence,
        input: message.input,
      }, socket);
      return;
    }

    if (message.type === 'ping') send(socket, {type: 'pong', at: Date.now()});
  });

  socket.on('close', () => leave(socket));
  socket.on('error', () => leave(socket));
});

setInterval(() => {
  const staleBefore = Date.now() - 6 * 60 * 60 * 1000;
  rooms.forEach(room => {
    if (room.players.size === 0 && room.createdAt < staleBefore) rooms.delete(room.code);
  });
}, 60_000).unref();

server.listen(PORT, '0.0.0.0', () => {
  console.log(`session server listening on ${PORT}`);
});
