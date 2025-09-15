"use client"

import React, { useState, useEffect, useRef } from 'react';
import { ref, onValue, off, push, set, update } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Forum, Message } from './types';

interface ForumChatWindowProps {
  forum: Forum;
  centerId: string;
}

const getInitials = (name: string | null | undefined) => {
    if (!name) return "A";
    const names = name.split(" ");
    if (names.length > 1) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name?.[0].toUpperCase() ?? 'A';
};

export default function ForumChatWindow({ forum, centerId }: ForumChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { user } = useAuth();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const messagesRef = ref(db, `centers/${centerId}/forums/${forum.id}/messages`);
    const listener = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      const list: Message[] = data 
        ? Object.values(data).sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()) 
        : [];
      setMessages(list);
    });

    return () => off(messagesRef, 'value', listener);
  }, [centerId, forum.id]);

  useEffect(() => {
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (viewport) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!user || newMessage.trim() === '') return;
    
    setIsSending(true);
    const messagesRef = ref(db, `centers/${centerId}/forums/${forum.id}/messages`);
    const forumRef = ref(db, `centers/${centerId}/forums/${forum.id}`);
    const newMsgRef = push(messagesRef);
    
    const messageData: Message = {
      id: newMsgRef.key!,
      authorId: user.uid,
      authorName: user.displayName || "Anónimo",
      authorPhotoURL: user.photoURL || "",
      text: newMessage.trim(),
      timestamp: new Date().toISOString(),
    };

    const lastMessageData = {
        text: messageData.text,
        senderId: messageData.authorId,
        senderName: messageData.authorName,
        timestamp: messageData.timestamp
    }

    try {
      await set(newMsgRef, messageData);
      await update(forumRef, { lastMessage: lastMessageData });
      setNewMessage('');
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
        setIsSending(false);
    }
  };
  
  const isDifferentDay = (date1: string, date2: string) => {
    return format(new Date(date1), 'yyyy-MM-dd') !== format(new Date(date2), 'yyyy-MM-dd');
  }

  return (
    <Card className="flex flex-col h-full">
      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full" ref={scrollAreaRef}>
          <div className="p-4 space-y-4">
            {messages.map((msg, index) => {
              const showDateSeparator = index === 0 || isDifferentDay(msg.timestamp, messages[index - 1].timestamp);
              
              return (
                <React.Fragment key={msg.id}>
                    {showDateSeparator && (
                        <div className="text-center text-xs text-muted-foreground my-4">
                            {format(new Date(msg.timestamp), "eeee, d 'de' MMMM", { locale: es })}
                        </div>
                    )}
                    <div className={cn("flex items-start gap-3")}>
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={msg.authorPhotoURL} alt={msg.authorName} />
                        <AvatarFallback>{getInitials(msg.authorName)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                          <div className="flex items-baseline gap-2">
                             <p className="font-semibold text-sm">{msg.authorName}</p>
                             <p className="text-xs text-muted-foreground">{format(new Date(msg.timestamp), 'HH:mm')}</p>
                          </div>
                          <p className="text-sm text-foreground/90">{msg.text}</p>
                      </div>
                    </div>
                </React.Fragment>
              );
            })}
             {messages.length === 0 && (
                <div className="text-center text-muted-foreground py-10">
                    <p>¡Sé el primero en romper el hielo!</p>
                </div>
             )}
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter className="p-2 border-t">
        <div className="flex items-center w-full space-x-2">
          <Input
            placeholder={'Escribe un mensaje...'}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            disabled={isSending}
          />
          <Button onClick={handleSendMessage} disabled={!newMessage.trim() || isSending}>
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            <span className="sr-only">Enviar</span>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
