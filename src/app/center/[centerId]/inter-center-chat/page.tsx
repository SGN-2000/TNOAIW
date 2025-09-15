"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ref, onValue, off, get, child, Unsubscribe } from 'firebase/database';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import Loader from '@/components/loader';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Globe, Users, MessageSquare, MessageSquarePlus, ArrowLeft } from 'lucide-react';
import { initializeInterCenterChat, createDirectChat } from '@/lib/inter-center-chat-helpers';
import type { Role, Member, CenterProfile, Chat } from '@/components/center/inter-center-chat/types';
import PermissionsManager from '@/components/center/inter-center-chat/permissions-manager';
import CenterSearch from '@/components/center/inter-center-chat/center-search';
import ChatList from '@/components/center/inter-center-chat/chat-list';
import ChatWindow from '@/components/center/inter-center-chat/chat-window';
import { useToast } from '@/hooks/use-toast';
import CreateGroup from '@/components/center/inter-center-chat/create-group';
import { cn } from '@/lib/utils';

export default function InterCenterChatPage() {
  const [userRole, setUserRole] = useState<Role>('member');
  const [loading, setLoading] = useState(true);
  const [isPermissionsOpen, setPermissionsOpen] = useState(false);
  const [isCreateGroupOpen, setCreateGroupOpen] = useState(false);
  const [potentialMembers, setPotentialMembers] = useState<Member[]>([]);
  const [allCenters, setAllCenters] = useState<CenterProfile[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [view, setView] = useState<'list' | 'chat'>('list');
  
  const { user } = useAuth();
  const params = useParams();
  const { toast } = useToast();
  const centerId = Array.isArray(params.centerId) ? params.centerId[0] : params.centerId;

  useEffect(() => {
    if (!centerId || !user) return;
    
    let permsListener: Unsubscribe;
    let centersListener: Unsubscribe;
    let userChatsListener: Unsubscribe;

    const fetchData = async () => {
      setLoading(true);
      await initializeInterCenterChat(centerId);
      
      const centerRef = ref(db, `centers/${centerId}`);
      const centerSnap = await get(centerRef);
      if (!centerSnap.exists()) { setLoading(false); return; }
      const centerData = centerSnap.val();

      const permsRef = ref(db, `centers/${centerId}/interCenterChat/permissions`);
      permsListener = onValue(permsRef, (snapshot) => {
        const perms = snapshot.val();
        if (user.uid === centerData.ownerId) setUserRole('owner');
        else if (perms?.exchangeGroup && perms.exchangeGroup[user.uid]) setUserRole('exchangeMember');
        else setUserRole('member');
      });
      
      const adminIds = Object.keys(centerData.members.admins || {});
      const adminPlusIds = Object.keys(centerData.members.adminsPlus || {});
      const potentialMemberIds = [...new Set([...adminIds, ...adminPlusIds, centerData.ownerId])];

      const memberPromises = potentialMemberIds.map(async (id) => {
        const userSnap = await get(child(ref(db, 'users'), id));
        if (userSnap.exists()) {
          const userData = userSnap.val();
          return { id, name: `${userData.name} ${userData.surname}`, username: userData.username };
        }
        return null;
      });
      const resolvedMembers = (await Promise.all(memberPromises)).filter(Boolean) as Member[];
      setPotentialMembers(resolvedMembers);
      
      const allCentersRef = ref(db, 'centers');
      centersListener = onValue(allCentersRef, (snapshot) => {
        const centersData = snapshot.val();
        const centersList: CenterProfile[] = centersData ? Object.keys(centersData).map(key => ({
            id: key,
            ...centersData[key]
        })) : [];
        setAllCenters(centersList);
      });

      const userChatsRef = ref(db, `userInterCenterChats/${user.uid}`);
      userChatsListener = onValue(userChatsRef, async (snapshot) => {
            if (!snapshot.exists()) {
                setChats([]);
                setLoading(false);
                return;
            }
            const chatIds = snapshot.val();
            const chatPromises = Object.keys(chatIds).map(chatId => get(ref(db, `interCenterChats/${chatId}`)));
            const chatSnaps = await Promise.all(chatPromises);
            const chatsData = chatSnaps
                .map(snap => snap.val() as Chat)
                .filter(Boolean)
                .filter(chat => chat.members && chat.members[centerId])
                .sort((a,b) => new Date(b.lastMessage?.timestamp || b.createdAt).getTime() - new Date(a.lastMessage?.timestamp || a.createdAt).getTime());
            setChats(chatsData);
        });

      setLoading(false);
    };

    fetchData();

    return () => {
        permsListener?.();
        centersListener?.();
        userChatsListener?.();
    };

  }, [centerId, user]);
  
  const handleStartDirectChat = async (targetCenter: CenterProfile) => {
    if(!centerId || !user) return;
    try {
        const currentCenterProfile = allCenters.find(c => c.id === centerId);
        if (!currentCenterProfile) throw new Error("No se pudo encontrar el perfil del centro actual.");
        
        const newChat = await createDirectChat(centerId, currentCenterProfile.centerName, targetCenter.id, targetCenter.centerName);
        setActiveChat(newChat);
        setView('chat');
    } catch (error: any) {
        toast({ title: "Error", description: error.message || "No se pudo iniciar el chat.", variant: "destructive" });
    }
  }

  const handleSelectChat = (chat: Chat) => {
    setActiveChat(chat);
    setView('chat');
  }
  
  const handleBackToList = () => {
    setActiveChat(null);
    setView('list');
  }

  const canParticipate = userRole === 'owner' || userRole === 'exchangeMember';
  const directChats = chats.filter(c => c.type === 'direct');

  if (loading) {
    return <div className="flex flex-1 justify-center items-center p-4"><Loader /></div>;
  }
  
  if (!canParticipate) {
    return (
        <div className="flex flex-1 justify-center items-center p-4 text-center">
            <div className="space-y-2">
                <h2 className="text-2xl font-bold">Acceso Restringido</h2>
                <p className="text-muted-foreground">No eres parte del "Grupo Intercambio" de este centro.</p>
            </div>
        </div>
    )
  }

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div className="flex items-center gap-2">
            {view === 'chat' && (
                <Button variant="ghost" size="icon" onClick={handleBackToList} className="h-8 w-8">
                    <ArrowLeft/>
                </Button>
            )}
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Globe className="h-8 w-8" />
              Chat entre Centros
            </h2>
        </div>
      </div>
      
       {view === 'list' && (
         <>
          <div className="flex flex-col md:flex-row gap-2">
                <Dialog open={isCreateGroupOpen} onOpenChange={setCreateGroupOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline"><MessageSquarePlus className="mr-2"/>Crear Grupo</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Crear Nuevo Grupo</DialogTitle>
                        </DialogHeader>
                        <CreateGroup
                            allCenters={allCenters}
                            currentCenterId={centerId}
                            directChats={directChats}
                            onGroupCreated={(chat) => {
                                setActiveChat(chat);
                                setCreateGroupOpen(false);
                                setView('chat');
                            }}
                        />
                    </DialogContent>
                </Dialog>
                {userRole === 'owner' && (
                <Dialog open={isPermissionsOpen} onOpenChange={setPermissionsOpen}>
                    <DialogTrigger asChild>
                    <Button variant="outline"><Users className="mr-2"/>Gestionar Grupo Intercambio</Button>
                    </DialogTrigger>
                    <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Grupo Intercambio</DialogTitle>
                        <DialogDescription>Elige quién puede buscar y chatear con otros centros.</DialogDescription>
                    </DialogHeader>
                    <PermissionsManager
                        centerId={centerId}
                        potentialMembers={potentialMembers}
                        onSave={() => setPermissionsOpen(false)}
                    />
                    </DialogContent>
                </Dialog>
                )}
            </div>
            <p className="text-muted-foreground">
                Conéctate, colabora y crea lazos con otros centros de estudiantes.
            </p>
        </>
       )}


        <div>
            {view === 'list' ? (
                 <div className="grid grid-cols-1 gap-8">
                    <div className="space-y-4">
                        <h3 className="text-xl font-semibold flex items-center gap-2"><MessageSquare className="h-5 w-5"/>Mis Chats</h3>
                        <ChatList chats={chats} onSelectChat={handleSelectChat} allCenters={allCenters} currentCenterId={centerId} activeChatId={activeChat?.id} />
                    </div>
                    <div className="pt-8">
                        <CenterSearch allCenters={allCenters} onStartChat={handleStartDirectChat} currentCenterId={centerId} />
                    </div>
                 </div>
            ) : activeChat && (
                <ChatWindow
                    key={activeChat.id}
                    chat={activeChat}
                    currentCenterId={centerId}
                    allCenters={allCenters}
                    directChats={directChats}
                    onClose={handleBackToList}
                />
            )}
        </div>
    </div>
  );
}
