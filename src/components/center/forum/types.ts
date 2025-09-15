
export type Role = 'owner' | 'admin-plus' | 'admin' | 'student';

export interface Message {
  id: string;
  authorId: string;
  authorName: string;
  authorPhotoURL?: string;
  text: string;
  timestamp: string;
}

export interface LastMessage {
    text: string;
    senderId: string;
    senderName: string;
    timestamp: string;
}

export interface Forum {
  id: 'general' | 'admins' | 'admins-plus';
  name: string;
  description: string;
  messages: { [messageId: string]: Message };
  lastMessage?: LastMessage;
  lastRead?: { [userId: string]: string }; // timestamp
}
