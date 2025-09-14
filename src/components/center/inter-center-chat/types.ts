export type Role = 'owner' | 'exchangeMember' | 'member';

export interface Member {
  id: string;
  name: string;
  username: string;
}

export interface CenterProfile {
    id: string;
    centerName: string;
    schoolName: string;
    country: string;
    province: string;
    district: string;
    educationLevel: string;
    representativeAnimal: string;
    primaryColor: string;
    ownerId: string;
}

export interface Message {
    id: string;
    senderId: string; // centerId or 'system'
    senderName: string;
    text: string;
    timestamp: string;
}

export interface LastMessage {
    text: string;
    senderId: string;
    timestamp: string;
}

export interface Chat {
    id: string;
    name?: string; // For group chats
    type: 'direct' | 'group';
    members: { [centerId: string]: true };
    admins: { [centerId: string]: true };
    createdAt: string;
    createdBy: string;
    messages: { [messageId: string]: Message };
    lastMessage?: LastMessage;
}
