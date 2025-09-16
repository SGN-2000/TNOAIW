"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ref, onValue, off, query, orderByChild, limitToLast } from 'firebase/database';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import Loader from '@/components/loader';
import CreatePost from '@/components/center/create-post';
import PostCard from '@/components/center/post-card';
import QuickActions from '@/components/center/dashboard/quick-actions';
import UpcomingEvents from '@/components/center/dashboard/upcoming-events';
import RecentNews from '@/components/center/dashboard/recent-news';

import type { Post } from '@/components/center/post-card';
import type { Event } from '@/components/center/events/types';
import type { NewsArticle } from '@/app/center/[centerId]/news/page';

export default function CenterDashboardPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [userRole, setUserRole] = useState<'admin' | 'student' | null>(null);
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();
  const params = useParams();
  const centerId = Array.isArray(params.centerId) ? params.centerId[0] : params.centerId;

  useEffect(() => {
    if (!centerId || !user) {
      setLoading(false);
      return;
    }
    
    let listeners: (() => void)[] = [];

    const fetchData = async () => {
      // User Role
      const adminRef = ref(db, `centers/${centerId}/members/admins/${user.uid}`);
      const roleListener = onValue(adminRef, (snapshot) => {
        setUserRole(snapshot.exists() ? 'admin' : 'student');
      });
      listeners.push(() => off(adminRef, 'value', roleListener));

      // Posts
      const postsRef = query(ref(db, `centers/${centerId}/posts`), orderByChild('createdAt'), limitToLast(20));
      const postsListener = onValue(postsRef, (snapshot) => {
        const data = snapshot.val();
        const list: Post[] = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) : [];
        setPosts(list);
      });
      listeners.push(() => off(postsRef, 'value', postsListener));

      // Events
      const eventsRef = query(ref(db, `centers/${centerId}/events/events`), orderByChild('date'));
      const eventsListener = onValue(eventsRef, (snapshot) => {
        const data = snapshot.val();
        const list: Event[] = data ? Object.values(data) : [];
        const upcoming = list.filter(e => new Date(e.date) >= new Date());
        setEvents(upcoming.slice(0,3));
      });
       listeners.push(() => off(eventsRef, 'value', eventsListener));
      
      // News
      const newsRef = query(ref(db, `centers/${centerId}/news/articles`), orderByChild('createdAt'), limitToLast(3));
      const newsListener = onValue(newsRef, (snapshot) => {
        const data = snapshot.val();
        const list: NewsArticle[] = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) : [];
        setNews(list);
      });
      listeners.push(() => off(newsRef, 'value', newsListener));

      setLoading(false);
    };

    fetchData();

    return () => {
      listeners.forEach(cleanup => cleanup());
    };
  }, [centerId, user]);


  if (loading || !userRole) {
    return (
      <div className="flex flex-1 justify-center items-center p-4">
        <Loader />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Página Principal</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          <QuickActions />
          <div className="space-y-6">
            <h3 className="text-2xl font-bold tracking-tight">Actividad Reciente</h3>
             {userRole === 'admin' && centerId && (
                <CreatePost centerId={centerId} />
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

        {/* Sidebar */}
        <div className="space-y-8">
          <UpcomingEvents events={events} centerId={centerId} />
          <RecentNews news={news} centerId={centerId} />
        </div>
      </div>
    </div>
  );
}
