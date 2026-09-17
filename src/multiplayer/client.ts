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
  if (typeof window !== 'undefined' && !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/socket`;
  }
  return undefined;
}

/** True when this build is wired to a live room server. */
export const isOnlinePlayAvailable = multiplayerUrl() !== undefined;

export class OfflineError extends Error {
  constructor() {
    super('Online rooms are not live on this build yet.');
    this.name = 'OfflineError';
  }
}

async function requestRoom(payload: object): Promise<RoomConnection> {
  const serverUrl = multiplayerUrl();
  if (!serverUrl) throw new OfflineError();

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
  return requestRoom({type: 'join_room', code: code.toUpperCase(), playerName});
}
