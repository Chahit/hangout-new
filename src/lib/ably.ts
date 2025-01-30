import Ably from 'ably';

export const ably = new Ably.Realtime({
  key: process.env.NEXT_PUBLIC_ABLY_API_KEY,
  clientId: 'collegeconnect-client',
});

export function getGroupChannelName(groupId: string) {
  return `group:${groupId}`;
}

export function getPrivateChannelName(userId: string, otherUserId: string) {
  const sortedIds = [userId, otherUserId].sort();
  return `private:${sortedIds.join("_")}`;
}

export function subscribeToChannel(channelName: string, callback: (message: Ably.Message) => void) {
  const channel = ably.channels.get(channelName);
  channel.subscribe(callback);
  return () => {
    channel.unsubscribe(callback);
  };
}

export function publishToChannel(channelName: string, eventName: string, data: unknown) {
  const channel = ably.channels.get(channelName);
  return channel.publish(eventName, data);
}

export function getAblyChannel(channelName: string) {
  return ably.channels.get(channelName);
}