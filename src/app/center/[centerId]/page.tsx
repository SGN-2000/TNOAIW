"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ref, onValue, off } from 'firebase/database';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import Loader from '@/components/loader';
import CreatePost from '@/components/center/create-post';
import PostCard from '@/components/center/post-card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PenSquare } from 'lucide-react';

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorPhotoURL?: string;
  content: string;
  createdAt: string;
  likes: { [userId: string]: boolean };
  dislikes: { [userId: string]: boolean };
  commentsCount: number;
}

export default function CenterDashboardPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [userRole, setUserRole] = useState<'admin' | 'student' | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreatePostOpen, setCreatePostOpen] = useState(false);

  const { user } = useAuth();
  const params = useParams();
  const centerId = Array.isArray(params.centerId) ? params.centerId[0] : params.centerId;

  // Fetch user role
  useEffect(() => {
    if (centerId && user) {
      const adminRef = ref(db, `centers/${centerId}/members/admins/${user.uid}`);
      const listener = onValue(adminRef, (snapshot) => {
        setUserRole(snapshot.exists() ? 'admin' : 'student');
      });

      return () => {
        off(adminRef, 'value', listener);
      };
    }
  }, [centerId, user]);

  // Fetch posts in real-time
  useEffect(() => {
    if (centerId) {
      const postsRef = ref(db, `centers/${centerId}/posts`);
      const listener = onValue(postsRef, (snapshot) => {
        const postsData = snapshot.val();
        const postsList: Post[] = postsData
          ? Object.keys(postsData)
              .map(key => ({ id: key, ...postsData[key] }))
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) // Sort by newest first
          : [];
        setPosts(postsList);
        setLoading(false);
      });

      return () => {
        off(postsRef, 'value', listener);
      };
    }
  }, [centerId]);

  if (loading || !userRole) {
    return (
      <div className="flex flex-1 justify-center items-center p-4">
        <Loader />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Página Principal</h2>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        {userRole === 'admin' && centerId && (
          <Dialog open={isCreatePostOpen} onOpenChange={setCreatePostOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-muted-foreground p-6 shadow-sm">
                <PenSquare className="mr-4 h-6 w-6" />
                <span className="text-lg">Crear una nueva publicación...</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
              <DialogHeader>
                <DialogTitle>Crear Publicación</DialogTitle>
              </DialogHeader>
              <CreatePost centerId={centerId} onPostCreated={() => setCreatePostOpen(false)} />
            </DialogContent>
          </Dialog>
        )}

        {posts.length > 0 ? (
          posts.map(post => (
            <PostCard key={post.id} post={post} centerId={centerId as string} />
          ))
        ) : (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <h3 className="text-xl font-semibold">No hay publicaciones todavía</h3>
            <p className="text-muted-foreground mt-2">
              {userRole === 'admin' ? '¡Crea la primera publicación para empezar!' : 'Espera a que un administrador publique algo.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
