"use client"

import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Chat, CenterProfile } from './types';
import { MessageSquare, Users, Building2 } from 'lucide-react';

interface ChatListProps {
  chats: Chat[];
  onSelectChat: (chat: Chat) => void;
  allCenters: CenterProfile[];
  currentCenterId: string;
  activeChatId?: string;
}

const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';
};


export default function ChatList({ chats, onSelectChat, allCenters, currentCenterId, activeChatId }: ChatListProps) {
  if (chats.length === 0) {
    return (
      <div className="text-center py-16 border-2 border-dashed rounded-lg">
        <div className="flex justify-center items-center mb-4">
            <MessageSquare className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold">No tienes chats</h3>
        <p className="text-muted-foreground mt-2">
          Busca un centro y empieza una nueva conversación.
        </p>
      </div>
    );
  }

  const getChatDetails = (chat: Chat) => {
    if (chat.type === 'group') {
        return {
            name: chat.name || "Grupo sin nombre",
            avatar: <AvatarFallback><Users/></AvatarFallback>
        }
    }
    // Direct chat
    const otherCenterId = Object.keys(chat.members).find(id => id !== currentCenterId);
    const otherCenter = allCenters.find(c => c.id === otherCenterId);
    return {
        name: otherCenter?.centerName || "Centro Desconocido",
        avatar: <AvatarFallback><Building2/></AvatarFallback>
    }
  }

  return (
    <div className="space-y-3 h-full max-h-[75vh] overflow-y-auto">
      {chats.map(chat => {
        const {name, avatar} = getChatDetails(chat);
        const lastMessageText = chat.lastMessage?.senderId === "system" ? <i>{chat.lastMessage.text}</i> : chat.lastMessage?.text;

        return (
            <Card 
                key={chat.id} 
                className={cn(
                    "cursor-pointer hover:bg-accent transition-colors",
                    activeChatId === chat.id && "bg-accent"
                )}
                onClick={() => onSelectChat(chat)}
            >
            <CardContent className="p-3 flex items-center gap-4">
                <Avatar>{avatar}</Avatar>
                <div className="flex-1 overflow-hidden">
                <div className="flex justify-between items-baseline">
                    <p className="font-semibold truncate">{name}</p>
                    <p className="text-xs text-muted-foreground shrink-0">
                        {chat.lastMessage && formatDistanceToNow(new Date(chat.lastMessage.timestamp), { addSuffix: true, locale: es })}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground truncate">
                        {lastMessageText}
                    </p>
                </div>
                </div>
            </CardContent>
            </Card>
        )
      })}
    </div>
  );
}
