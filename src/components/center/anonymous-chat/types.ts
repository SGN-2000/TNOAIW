export interface Message {
    id: string;
    sender: 'user' | 'moderator' | 'system';
    text: string;
    timestamp: string;
}

export interface Chat {
    id: string;
    initiatorId: string;
    createdAt: string;
    status: 'open' | 'closed' | 'blocked';
    messages: { [messageId: string]: Message };
    lastMessage?: {
        text: string;
        timestamp: string;
        sender: 'user' | 'moderator' | 'system';
    }
}

export type Role = 'owner' | 'moderator' | 'member';

export interface Moderator {
  id: string;
  name: string;
  username: string;
}
