"use client"

import { useState, useEffect, useRef } from 'react';
import { ref, onValue, off, push, set, update } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, ArrowLeft, ShieldX, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Chat, Role, Message } from './types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

interface ChatWindowProps {
  chat: Chat;
  centerId: string;
  userRole: Role;
  onClose: () => void;
}

export default function ChatWindow({ chat, centerId, userRole, onClose }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const { user } = useAuth();
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const messagesRef = ref(db, `centers/${centerId}/anonymousChats/chats/${chat.id}/messages`);
    const listener = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      const list: Message[] = data ? Object.values(data) : [];
      setMessages(list.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()));
    });

    return () => off(messagesRef, 'value', listener);
  }, [centerId, chat.id]);

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
    if (!user || newMessage.trim() === '' || chat.status !== 'open') return;

    const messagesRef = ref(db, `centers/${centerId}/anonymousChats/chats/${chat.id}/messages`);
    const chatRef = ref(db, `centers/${centerId}/anonymousChats/chats/${chat.id}`);
    const newMsgRef = push(messagesRef);
    
    const senderType = user.uid === chat.initiatorId ? 'user' : 'moderator';

    const messageData: Message = {
      id: newMsgRef.key!,
      sender: senderType,
      text: newMessage.trim(),
      timestamp: new Date().toISOString(),
    };

    try {
      await set(newMsgRef, messageData);
      await update(chatRef, { lastMessage: { text: messageData.text, timestamp: messageData.timestamp, sender: senderType } });
      setNewMessage('');
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };
  
  const handleBlockChat = async () => {
    const chatRef = ref(db, `centers/${centerId}/anonymousChats/chats/${chat.id}`);
    const messagesRef = ref(db, `centers/${centerId}/anonymousChats/chats/${chat.id}/messages`);
    const newMsgRef = push(messagesRef);
    
    const blockMessage: Message = {
        id: newMsgRef.key!,
        sender: 'system',
        text: 'Este chat ha sido bloqueado por un moderador.',
        timestamp: new Date().toISOString(),
    }

    try {
        await update(chatRef, { 
            status: 'blocked',
            lastMessage: { text: blockMessage.text, timestamp: blockMessage.timestamp, sender: 'system' }
        });
        await set(newMsgRef, blockMessage);
        toast({ title: "Chat bloqueado", description: "El usuario ya no podrá enviar mensajes.", variant: "destructive" });
        // Do not close the window, just update the state
    } catch (error) {
        console.error(error);
        toast({ title: "Error", description: "No se pudo bloquear el chat.", variant: "destructive" });
    }
  }
  
  const handleUnblockChat = async () => {
    const chatRef = ref(db, `centers/${centerId}/anonymousChats/chats/${chat.id}`);
    const messagesRef = ref(db, `centers/${centerId}/anonymousChats/chats/${chat.id}/messages`);
    const newMsgRef = push(messagesRef);

    const unblockMessage: Message = {
        id: newMsgRef.key!,
        sender: 'system',
        text: 'Este chat ha sido desbloqueado por un moderador.',
        timestamp: new Date().toISOString(),
    }

    try {
        await update(chatRef, { 
            status: 'open',
            lastMessage: { text: unblockMessage.text, timestamp: unblockMessage.timestamp, sender: 'system' }
        });
        await set(newMsgRef, unblockMessage);
        toast({ title: "Chat desbloqueado", description: "El usuario ahora puede volver a enviar mensajes." });
    } catch (error) {
        console.error(error);
        toast({ title: "Error", description: "No se pudo desbloquear el chat.", variant: "destructive" });
    }
  }

  const isMyChat = user?.uid === chat.initiatorId;
  const canModerate = userRole === 'owner' || userRole === 'moderator';

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] bg-background rounded-lg border">
      <CardHeader className="flex flex-row items-center justify-between border-b p-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <ArrowLeft />
          </Button>
          <Avatar className="h-9 w-9">
            <AvatarFallback>{isMyChat ? 'S' : 'U'}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-base">{isMyChat ? 'Soporte del Centro' : `Usuario Anónimo #${chat.initiatorId.slice(0,5)}`}</CardTitle>
          </div>
        </div>
         {canModerate && !isMyChat && (
            <>
            {chat.status === 'open' ? (
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="icon" className="h-8 w-8">
                            <ShieldX className="h-4 w-4" />
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>¿Bloquear este chat?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta acción impedirá que el usuario anónimo siga enviando mensajes en esta conversación. ¿Estás seguro?
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleBlockChat} className="bg-destructive hover:bg-destructive/90">Bloquear</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            ) : (
                 <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600" onClick={handleUnblockChat}>
                    <ShieldCheck className="h-5 w-5" />
                </Button>
            )}
            </>
        )}
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full" ref={scrollAreaRef}>
          <div className="p-4 space-y-4">
            {messages.map((msg, index) => {
              const isSystemMessage = msg.sender === 'system';
              const isMe = msg.sender === 'user' ? isMyChat : !isMyChat;
              
              if (isSystemMessage) {
                return (
                    <div key={index} className="text-center text-xs text-muted-foreground italic py-2">
                        {msg.text}
                    </div>
                )
              }

              return (
                <div key={index} className={cn("flex items-end gap-2", isMe ? "justify-end" : "justify-start")}>
                  {!isMe && (
                    <Avatar className="h-7 w-7">
                        <AvatarFallback>{isMyChat ? 'S' : 'U'}</AvatarFallback>
                    </Avatar>
                  )}
                  <div className={cn("max-w-xs md:max-w-md rounded-lg px-3 py-2", isMe ? "bg-primary text-primary-foreground" : "bg-muted")}>
                    <p className="text-sm">{msg.text}</p>
                    <p className="text-xs text-right mt-1 opacity-70">
                        {format(new Date(msg.timestamp), 'HH:mm')}
                    </p>
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
            placeholder={chat.status !== 'open' ? (chat.status === 'blocked' ? 'Chat bloqueado' : 'Chat cerrado') : 'Escribe un mensaje...'}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            disabled={chat.status !== 'open'}
          />
          <Button onClick={handleSendMessage} disabled={!newMessage.trim() || chat.status !== 'open'}>
            <Send className="h-4 w-4" />
            <span className="sr-only">Enviar</span>
          </Button>
        </div>
      </CardFooter>
    </div>
  );
}
