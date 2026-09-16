export type RoomSummary = {
  code: string;
  maxPlayers: number;
  players: Array<{id: string; name: string}>;
};

export type RoomConnection = {
  socket: WebSocket | null;
  playerId: string;
  room: RoomSummary;
};

type ServerMessage =
  | {type: 'connected'; maxPlayers: number}
  | {type: 'room_joined'; playerId: string; room: RoomSummary}
  | {type: 'error'; code: string; message: string};

const configuredUrl = import.meta.env.VITE_GAME_SERVER_URL as string | undefined;
const isMultiplayerEnabled =
  import.meta.env.VITE_MULTIPLAYER_ENABLED === 'true';

function multiplayerUrl(): string | undefined {
  if (!isMultiplayerEnabled) return undefined;
  if (configuredUrl && !configuredUrl.includes('example.')) return configuredUrl;
  if (!['localhost', '127.0.0.1'].includes(window.location.hostname)) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/socket`;
  }
  return undefined;
}

function localRoom(code?: string): RoomConnection {
  return {
    socket: null,
    playerId: crypto.randomUUID(),
    room: {
      code: code || createRoomCode(),
      maxPlayers: 4,
      players: [{id: crypto.randomUUID(), name: 'Outlaw'}],
    },
  };
}

function createRoomCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({length: 4}, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
}

async function requestRoom(payload: object, fallbackCode?: string): Promise<RoomConnection> {
  const serverUrl = multiplayerUrl();
  if (!serverUrl) {
    await new Promise(resolve => window.setTimeout(resolve, 250));
    return localRoom(fallbackCode);
  }

  return new Promise((resolve, reject) => {
    const socket = new WebSocket(serverUrl);
    const timeout = window.setTimeout(() => {
      socket.close();
      reject(new Error('The room server did not respond.'));
    }, 8_000);

    socket.addEventListener('open', () => socket.send(JSON.stringify(payload)));
    socket.addEventListener('message', event => {
      const message = JSON.parse(String(event.data)) as ServerMessage;
      if (message.type === 'room_joined') {
        window.clearTimeout(timeout);
        resolve({socket, playerId: message.playerId, room: message.room});
      }
      if (message.type === 'error') {
        window.clearTimeout(timeout);
        socket.close();
        reject(new Error(message.message));
      }
    });
    socket.addEventListener('error', () => {
      window.clearTimeout(timeout);
      reject(new Error('Could not connect to the room server.'));
    });
  });
}

export function createRoom(playerName = 'Outlaw'): Promise<RoomConnection> {
  return requestRoom({type: 'create_room', playerName});
}

export function joinRoom(code: string, playerName = 'Outlaw'): Promise<RoomConnection> {
  return requestRoom({type: 'join_room', code: code.toUpperCase(), playerName}, code.toUpperCase());
}
