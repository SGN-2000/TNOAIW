
"use client"

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ref, onValue, off, get, child } from 'firebase/database';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import Loader from '@/components/loader';
import { MessagesSquare } from 'lucide-react';
import { initializeForumData } from '@/lib/forum-helpers';
import type { Forum, Role } from '@/components/center/forum/types';
import ForumList from '@/components/center/forum/forum-list';

export default function ForumPage() {
  const [forums, setForums] = useState<Forum[]>([]);
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const centerId = Array.isArray(params.centerId) ? params.centerId[0] : params.centerId;

  useEffect(() => {
    if (!centerId || !user) return;

    const fetchData = async () => {
      setLoading(true);
      await initializeForumData(centerId);

      const centerRef = ref(db, `centers/${centerId}`);
      const centerSnap = await get(centerRef);
      if (centerSnap.exists()) {
          const centerData = centerSnap.val();
          if (user.uid === centerData.ownerId) setUserRole('owner');
          else if (centerData.members.adminsPlus && centerData.members.adminsPlus[user.uid]) setUserRole('admin-plus');
          else if (centerData.members.admins && centerData.members.admins[user.uid]) setUserRole('admin');
          else setUserRole('student');
      }

      const forumsRef = ref(db, `centers/${centerId}/forums`);
      const listener = onValue(forumsRef, (snapshot) => {
        const data = snapshot.val();
        const list: Forum[] = data ? Object.values(data) : [];
        setForums(list);
        setLoading(false);
      });
      
      return () => off(forumsRef, 'value', listener);
    };

    let cleanup: (() => void) | undefined;
    fetchData().then(c => { cleanup = c; });
    return () => cleanup?.();

  }, [centerId, user]);
  
  const handleSelectForum = (forumId: string) => {
    router.push(`/center/${centerId}/forum/${forumId}`);
  };

  if (loading || !userRole) {
    return <div className="flex flex-1 justify-center items-center p-4"><Loader /></div>;
  }

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <MessagesSquare className="h-8 w-8" />
          Foro del Centro
        </h2>
      </div>
      <p className="text-muted-foreground">
        Espacios de debate y comunicación para los diferentes grupos del centro de estudiantes.
      </p>
      
      <ForumList 
        forums={forums} 
        userRole={userRole} 
        onSelectForum={handleSelectForum} 
        currentUserId={user!.uid}
      />
    </div>
  );
}
