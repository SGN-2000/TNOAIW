"use client"

import { useState, useEffect, useRef } from 'react';
import { ref, onValue, off, push, set, update, get } from 'firebase/database';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, ArrowLeft, Users, Building2, UserCog } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Chat, Message, CenterProfile } from './types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import ManageGroup from './manage-group';

interface ChatWindowProps {
  chat: Chat;
  currentCenterId: string;
  allCenters: CenterProfile[];
  onClose: () => void;
  directChats: Chat[];
}

export default function ChatWindow({ chat, currentCenterId, allCenters, onClose, directChats }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isManageGroupOpen, setManageGroupOpen] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const [currentCenter, setCurrentCenter] = useState<CenterProfile | undefined>(undefined);

    useEffect(() => {
        const fetchCenter = async () => {
            const snap = await get(ref(db, `centers/${currentCenterId}`));
            if(snap.exists()) setCurrentCenter(snap.val());
        }
        fetchCenter();
    }, [currentCenterId]);

  useEffect(() => {
    const messagesRef = ref(db, `interCenterChats/${chat.id}/messages`);
    const listener = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      const list: Message[] = data ? Object.values(data) : [];
      setMessages(list.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()));
    });

    return () => off(messagesRef, 'value', listener);
  }, [chat.id]);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (viewport) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!currentCenter || newMessage.trim() === '') return;

    const messagesRef = ref(db, `interCenterChats/${chat.id}/messages`);
    const chatRef = ref(db, `interCenterChats/${chat.id}`);
    const newMsgRef = push(messagesRef);
    
    const messageData: Message = {
      id: newMsgRef.key!,
      senderId: currentCenterId,
      senderName: currentCenter.centerName,
      text: newMessage.trim(),
      timestamp: new Date().toISOString(),
    };

    try {
      await set(newMsgRef, messageData);
      await update(chatRef, { lastMessage: { text: messageData.text, timestamp: messageData.timestamp, senderId: currentCenterId } });
      setNewMessage('');
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };
  
  const getChatDetails = () => {
    if (chat.type === 'group') {
        return {
            name: chat.name || "Grupo sin nombre",
            avatar: <AvatarFallback><Users/></AvatarFallback>
        }
    }
    const otherCenterId = Object.keys(chat.members).find(id => id !== currentCenterId);
    const otherCenter = allCenters.find(c => c.id === otherCenterId);
    return {
        name: otherCenter?.centerName || "Centro Desconocido",
        avatar: <AvatarFallback><Building2/></AvatarFallback>
    }
  }

  const { name, avatar } = getChatDetails();
  const isGroupAdmin = chat.type === 'group' && chat.admins?.[currentCenterId];


  return (
    <div className="flex flex-col h-[calc(100vh-20rem)] bg-background rounded-lg border">
      <CardHeader className="flex flex-row items-center justify-between border-b p-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <ArrowLeft />
          </Button>
          <Avatar className="h-9 w-9">{avatar}</Avatar>
          <div>
            <CardTitle className="text-base">{name}</CardTitle>
            {chat.type === 'group' && <p className="text-xs text-muted-foreground">{Object.keys(chat.members).length} miembros</p>}
          </div>
        </div>
         {isGroupAdmin && (
             <Dialog open={isManageGroupOpen} onOpenChange={setManageGroupOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" size="icon" className="h-8 w-8">
                        <UserCog className="h-4 w-4" />
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Gestionar Grupo</DialogTitle>
                        <DialogDescription>Añadir o eliminar miembros del grupo.</DialogDescription>
                    </DialogHeader>
                    <ManageGroup
                        chat={chat}
                        allCenters={allCenters}
                        currentCenterId={currentCenterId}
                        directChats={directChats}
                        onClose={() => setManageGroupOpen(false)}
                    />
                </DialogContent>
             </Dialog>
        )}
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full" ref={scrollAreaRef}>
          <div className="p-4 space-y-4">
            {messages.map((msg, index) => {
              const isSystemMessage = msg.senderId === 'system';
              const isMe = msg.senderId === currentCenterId;
              
              if (isSystemMessage) {
                return (
                    <div key={index} className="text-center text-xs text-muted-foreground italic py-2">
                        {msg.text}
                    </div>
                )
              }

              return (
                <div key={index} className={cn("flex flex-col gap-1", isMe ? "items-end" : "items-start")}>
                   <div className={cn("flex items-end gap-2", isMe ? "flex-row-reverse" : "flex-row")}>
                    <div className={cn("max-w-xs md:max-w-md rounded-lg px-3 py-2", isMe ? "bg-primary text-primary-foreground" : "bg-muted")}>
                        <p className="text-sm">{msg.text}</p>
                    </div>
                   </div>
                    <div className={cn("text-xs text-muted-foreground", isMe ? "pr-2" : "pl-2")}>
                        {isMe ? "Tú" : msg.senderName} - {format(new Date(msg.timestamp), 'HH:mm')}
                    </div>
                </div>
              );
            })}
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
          />
          <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
            <Send className="h-4 w-4" />
            <span className="sr-only">Enviar</span>
          </Button>
        </div>
      </CardFooter>
    </div>
  );
}
