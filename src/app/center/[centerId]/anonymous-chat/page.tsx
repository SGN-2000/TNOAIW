"use client"

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ref, onValue, off, get, set, push, child } from 'firebase/database';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import Loader from '@/components/loader';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { ShieldOff, MessageSquarePlus, Users, MessageCircle } from 'lucide-react';
import { initializeAnonymousChatData } from '@/lib/anonymous-chat-helpers';
import type { Chat, Role, Moderator } from '@/components/center/anonymous-chat/types';
import ChatList from '@/components/center/anonymous-chat/chat-list';
import PermissionsManager from '@/components/center/anonymous-chat/permissions-manager';
import { useToast } from '@/hooks/use-toast';
import ChatWindow from '@/components/center/anonymous-chat/chat-window';


export default function AnonymousChatPage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [userRole, setUserRole] = useState<Role>('member');
  const [loading, setLoading] = useState(true);
  const [potentialModerators, setPotentialModerators] = useState<Moderator[]>([]);
  const [isPermissionsOpen, setPermissionsOpen] = useState(false);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [myChatId, setMyChatId] = useState<string | null>(null);
  
  const { user } = useAuth();
  const params = useParams();
  const centerId = Array.isArray(params.centerId) ? params.centerId[0] : params.centerId;
  const { toast } = useToast();

  useEffect(() => {
    if (!centerId || !user) return;
    
    const chatsRef = ref(db, `centers/${centerId}/anonymousChats/chats`);
    const centerRef = ref(db, `centers/${centerId}`);

    const fetchData = async () => {
      setLoading(true);
      await initializeAnonymousChatData(centerId);
      
      const centerSnap = await get(centerRef);
      if (!centerSnap.exists()) { setLoading(false); return; }
      const centerData = centerSnap.val();

      const permsRef = ref(db, `centers/${centerId}/anonymousChats/permissions`);
      const permsListener = onValue(permsRef, (snapshot) => {
        const perms = snapshot.val();
        if (user.uid === centerData.ownerId) setUserRole('owner');
        else if (perms?.moderators && perms.moderators[user.uid]) setUserRole('moderator');
        else setUserRole('member');
      });

      const chatsListener = onValue(chatsRef, (snapshot) => {
        const chatsData = snapshot.val();
        const list: Chat[] = chatsData ? Object.keys(chatsData).map(key => ({ id: key, ...chatsData[key] })) : [];
        setChats(list.sort((a,b) => new Date(b.lastMessage?.timestamp || 0).getTime() - new Date(a.lastMessage?.timestamp || 0).getTime()));
        
        const existingChat = list.find(chat => chat.initiatorId === user.uid);
        setMyChatId(existingChat ? existingChat.id : null);
      });
      
      const adminIds = Object.keys(centerData.members.admins || {});
      const adminPlusIds = Object.keys(centerData.members.adminsPlus || {});
      const potentialModIds = [...new Set([...adminIds, ...adminPlusIds, centerData.ownerId])];

      const modPromises = potentialModIds.map(async (id) => {
        const userSnap = await get(child(ref(db, 'users'), id));
        if (userSnap.exists()) {
          const userData = userSnap.val();
          return { id, name: `${userData.name} ${userData.surname}`, username: userData.username };
        }
        return null;
      });
      const resolvedMods = (await Promise.all(modPromises)).filter(Boolean) as Moderator[];
      setPotentialModerators(resolvedMods);
      
      setLoading(false);
      return () => {
        off(chatsRef, 'value', chatsListener);
        off(permsRef, 'value', permsListener);
      };
    };

    let cleanup: (() => void) | undefined;
    fetchData().then(c => { cleanup = c; });

    return () => cleanup?.();

  }, [centerId, user]);
  
  const handleStartChat = async () => {
    if (!user || !centerId) return;

    if(myChatId) {
      setActiveChatId(myChatId);
      return;
    }

    try {
      const chatsRef = ref(db, `centers/${centerId}/anonymousChats/chats`);
      const newChatRef = push(chatsRef);
      const newChat: Partial<Chat> = {
        id: newChatRef.key!,
        initiatorId: user.uid,
        createdAt: new Date().toISOString(),
        status: 'open',
        messages: [],
        lastMessage: {
            text: "Conversación iniciada.",
            timestamp: new Date().toISOString(),
            sender: "system",
        }
      };
      await set(newChatRef, newChat);
      setActiveChatId(newChat.id!);
      toast({ title: "Chat iniciado", description: "Un moderador te responderá pronto." });
      
      const permsSnap = await get(ref(db, `centers/${centerId}/anonymousChats/permissions`));
      const mods = permsSnap.val()?.moderators || {};
      const centerSnap = await get(ref(db, `centers/${centerId}`));
      const centerData = centerSnap.val();
      
      const modIds = Object.keys(mods);
      if(!modIds.includes(centerData.ownerId)) modIds.push(centerData.ownerId);

      const notifPromises = modIds.map(modId => set(push(ref(db, `notifications/${modId}`)), {
          type: 'NEW_ANONYMOUS_CHAT',
          centerId,
          centerName: centerData.centerName,
          timestamp: new Date().toISOString(),
          read: false
      }));
      await Promise.all(notifPromises);

    } catch (error) {
      toast({ title: "Error", description: "No se pudo iniciar el chat.", variant: "destructive" });
      console.error(error);
    }
  };

  const handleSelectChat = (chatId: string) => {
    setActiveChatId(chatId);
  };
  
  const handleCloseChat = () => {
    setActiveChatId(null);
  };
  
  const isModerator = userRole === 'owner' || userRole === 'moderator';

  if (loading) {
    return <div className="flex flex-1 justify-center items-center p-4"><Loader /></div>;
  }
  
  if(activeChatId) {
      const chat = chats.find(c => c.id === activeChatId);
      return chat ? <ChatWindow chat={chat} centerId={centerId} userRole={userRole} onClose={handleCloseChat} /> : null;
  }

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <ShieldOff className="h-8 w-8" />
          Chat Anónimo
        </h2>
        {userRole === 'owner' && (
          <Dialog open={isPermissionsOpen} onOpenChange={setPermissionsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline"><Users className="mr-2"/>Gestionar Moderadores</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Moderadores del Chat</DialogTitle>
                <DialogDescription>Elige quién puede responder los chats anónimos.</DialogDescription>
              </DialogHeader>
              <PermissionsManager 
                centerId={centerId}
                potentialModerators={potentialModerators}
                onSave={() => setPermissionsOpen(false)}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
      <p className="text-muted-foreground">
        Un espacio seguro para comunicarte. Tu identidad siempre será anónima.
      </p>

      {isModerator ? (
         <div className="space-y-4">
            <h3 className="text-xl font-semibold flex items-center gap-2"><MessageCircle className="h-5 w-5"/>Conversaciones Abiertas</h3>
            <ChatList chats={chats} onSelectChat={handleSelectChat} />
             <Button onClick={handleStartChat} className="mt-4">
                <MessageSquarePlus className="mr-2"/> Iniciar mi propio chat anónimo
            </Button>
         </div>
      ) : (
        <div className="flex justify-center items-center h-64">
           <Button size="lg" onClick={handleStartChat}>
            <MessageSquarePlus className="mr-2 h-5 w-5"/> 
            {myChatId ? "Continuar mi Conversación" : "Iniciar una Nueva Conversación Anónima"}
          </Button>
        </div>
      )}

    </div>
  );
}
