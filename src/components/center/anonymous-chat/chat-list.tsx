"use client"

import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Chat } from './types';
import { MessageSquare, ShieldX } from 'lucide-react';

interface ChatListProps {
  chats: Chat[];
  onSelectChat: (chatId: string) => void;
}

export default function ChatList({ chats, onSelectChat }: ChatListProps) {
  if (chats.length === 0) {
    return (
      <div className="text-center py-16 border-2 border-dashed rounded-lg">
        <div className="flex justify-center items-center mb-4">
            <MessageSquare className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold">No hay chats activos</h3>
        <p className="text-muted-foreground mt-2">
          Cuando un usuario inicie una conversación, aparecerá aquí.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {chats.map(chat => (
        <Card 
            key={chat.id} 
            className={cn(
                "cursor-pointer hover:bg-accent transition-colors",
                chat.status === 'blocked' && 'bg-destructive/10 hover:bg-destructive/20'
            )}
            onClick={() => onSelectChat(chat.id)}
        >
          <CardContent className="p-3 flex items-center gap-4">
            <Avatar>
                <AvatarFallback>U</AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <div className="flex justify-between items-baseline">
                <p className="font-semibold truncate">Usuario Anónimo #{chat.initiatorId.slice(0, 5)}</p>
                <p className="text-xs text-muted-foreground shrink-0">
                    {chat.lastMessage && formatDistanceToNow(new Date(chat.lastMessage.timestamp), { addSuffix: true, locale: es })}
                </p>
              </div>
               <div className="flex items-center gap-2">
                 {chat.status === 'blocked' && <ShieldX className="h-4 w-4 text-destructive flex-shrink-0" />}
                <p className={cn(
                    "text-sm text-muted-foreground truncate",
                    chat.status === 'blocked' && 'italic'
                )}>
                    {chat.lastMessage?.sender === 'moderator' && 'Tú: '}
                    {chat.lastMessage?.text}
                </p>
               </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
