import {useRef, useState} from 'react';
import {Button} from '@astryxdesign/core/Button';
import {Dialog, DialogHeader} from '@astryxdesign/core/Dialog';
import {Heading} from '@astryxdesign/core/Heading';
import {
  Layout,
  LayoutContent,
  LayoutFooter,
} from '@astryxdesign/core/Layout';
import {HStack, VStack} from '@astryxdesign/core/Stack';
import {StatusDot} from '@astryxdesign/core/StatusDot';
import {Text} from '@astryxdesign/core/Text';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Copy, Play, Radio, Users, WifiOff} from 'lucide-react';
import {
  createRoom,
  isOnlinePlayAvailable,
  joinRoom,
  type RoomConnection,
} from '../multiplayer/client';

type LobbyDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onPlaySolo?: () => void;
};

type LobbyMode = 'choose' | 'host' | 'join';

export function LobbyDialog({isOpen, onOpenChange, onPlaySolo}: LobbyDialogProps) {
  const [mode, setMode] = useState<LobbyMode>('choose');
  const [joinCode, setJoinCode] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');
  const connectionRef = useRef<RoomConnection | null>(null);

  const close = () => {
    connectionRef.current?.socket?.close();
    connectionRef.current = null;
    setMode('choose');
    setJoinCode('');
    setRoomCode('');
    setError('');
    onOpenChange(false);
  };

  const host = async () => {
    setError('');
    try {
      const connection = await createRoom();
      connectionRef.current = connection;
      setRoomCode(connection.room.code);
      setMode('host');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not create the room.');
    }
  };

  const join = async () => {
    setError('');
    try {
      const connection = await joinRoom(joinCode);
      connectionRef.current = connection;
      setRoomCode(connection.room.code);
      setMode('host');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not join the room.');
    }
  };

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} purpose="form" width={520}>
      <Layout
        header={
          <DialogHeader
            title="Co-op lobby"
            subtitle={
              isOnlinePlayAvailable
                ? 'Host two players now; the protocol reserves four slots.'
                : 'Online rooms are not live on this build yet.'
            }
            onOpenChange={close}
          />
        }
        content={
          <LayoutContent>
            {mode === 'choose' && !isOnlinePlayAvailable ? (
              <VStack gap={4}>
                <HStack gap={2} vAlign="center">
                  <StatusDot variant="warning" label="Offline build" />
                  <Text weight="semibold">Room server not deployed</Text>
                </HStack>
                <Text color="secondary">
                  This build ships static-only, so cross-device rooms are switched off. The
                  2–4 player protocol is in the repo and turns on with a single infrastructure
                  flag. Until then, ride solo in the browser demo.
                </Text>
                <Button
                  label="Play the demo solo"
                  variant="primary"
                  size="lg"
                  width="100%"
                  icon={<Play size={18} />}
                  onClick={() => {
                    close();
                    onPlaySolo?.();
                  }}
                />
                <HStack gap={2} vAlign="center">
                  <WifiOff size={14} aria-hidden="true" />
                  <Text type="supporting" color="secondary">
                    Enable with `cdk deploy -c multiplayer=true` and `VITE_MULTIPLAYER_ENABLED=true`.
                  </Text>
                </HStack>
              </VStack>
            ) : null}

            {mode === 'choose' && isOnlinePlayAvailable ? (
              <VStack gap={4}>
                <Text>Choose how you want to enter the session.</Text>
                {error ? <Text className="error-copy">{error}</Text> : null}
                <Button
                  label="Create a room"
                  variant="primary"
                  size="lg"
                  width="100%"
                  icon={<Radio size={18} />}
                  clickAction={host}
                />
                <Button
                  label="Join with a code"
                  variant="secondary"
                  size="lg"
                  width="100%"
                  icon={<Users size={18} />}
                  onClick={() => setMode('join')}
                />
              </VStack>
            ) : null}

            {mode === 'host' ? (
              <VStack gap={5} align="center">
                <HStack gap={2} align="center">
                  <StatusDot variant="success" label="Room online" isPulsing />
                  <Text weight="semibold">Room online</Text>
                </HStack>
                <Text type="supporting" color="secondary">
                  Send this code to up to three squadmates.
                </Text>
                <Heading level={2} type="display-2" weight="bold" className="room-code">
                  {roomCode}
                </Heading>
                <Button
                  label="Copy room code"
                  variant="secondary"
                  icon={<Copy size={18} />}
                  onClick={() => void navigator.clipboard?.writeText(roomCode)}
                />
              </VStack>
            ) : null}

            {mode === 'join' ? (
              <VStack gap={4}>
                <TextInput
                  label="Room code"
                  description="Ask the host for their four-character room code."
                  value={joinCode}
                  onChange={value => {
                    setJoinCode(value.toUpperCase().slice(0, 4));
                    setError('');
                  }}
                  placeholder="AB12"
                  width="100%"
                  hasAutoFocus
                  isRequired
                  status={error ? {type: 'error', message: error} : undefined}
                  onEnter={() => {
                    if (joinCode.length === 4) void join();
                  }}
                />
                <Button
                  label="Join session"
                  variant="primary"
                  width="100%"
                  isDisabled={joinCode.length !== 4}
                  clickAction={join}
                />
              </VStack>
            ) : null}
          </LayoutContent>
        }
        footer={
          <LayoutFooter>
            <HStack gap={2} hAlign="end">
              {mode !== 'choose' ? (
                <Button label="Back" variant="ghost" onClick={() => setMode('choose')} />
              ) : null}
              <Button label="Close" variant="secondary" onClick={close} />
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}
