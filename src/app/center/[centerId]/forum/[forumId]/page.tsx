
"use client"

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ref, onValue, off, get, child, update, serverTimestamp } from 'firebase/database';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import Loader from '@/components/loader';
import { MessagesSquare, ArrowLeft } from 'lucide-react';
import type { Forum, Role } from '@/components/center/forum/types';
import { Button } from '@/components/ui/button';
import ForumChatWindow from '@/components/center/forum/forum-chat-window';

export default function ForumChatPage() {
  const [forum, setForum] = useState<Forum | null>(null);
  const [loading, setLoading] = useState(true);
  
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const centerId = Array.isArray(params.centerId) ? params.centerId[0] : params.centerId;
  const forumId = Array.isArray(params.forumId) ? params.forumId[0] : params.forumId;

  useEffect(() => {
    if (!centerId || !forumId || !user) {
      setLoading(false);
      return;
    }

    // Update lastRead timestamp for the current user when they enter the chat.
    const lastReadRef = ref(db, `centers/${centerId}/forums/${forumId}/lastRead/${user.uid}`);
    update(ref(db), {
      [`centers/${centerId}/forums/${forumId}/lastRead/${user.uid}`]: new Date().toISOString()
    });

    const forumRef = ref(db, `centers/${centerId}/forums/${forumId}`);
    const listener = onValue(forumRef, (snapshot) => {
      if (snapshot.exists()) {
        const forumData = snapshot.val();
        setForum({ id: snapshot.key, ...forumData });
      } else {
        setForum(null);
      }
      setLoading(false);
    });

    return () => off(forumRef, 'value', listener);

  }, [centerId, forumId, user]);
  
  if (loading) {
    return <div className="flex flex-1 justify-center items-center p-4"><Loader /></div>;
  }

  if (!forum) {
    return <div className="flex flex-1 justify-center items-center p-4">Foro no encontrado.</div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] p-4 md:p-8 pt-6">
       <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft />
          </Button>
          <div className="flex items-center gap-3">
             <MessagesSquare className="h-7 w-7" />
             <h2 className="text-2xl font-bold tracking-tight">{forum.name}</h2>
          </div>
        </div>
      <p className="text-muted-foreground ml-16 mb-6">{forum.description}</p>
      
      <div className="flex-1 overflow-hidden">
        <ForumChatWindow 
          forum={forum} 
          centerId={centerId}
        />
      </div>
    </div>
  );
}
