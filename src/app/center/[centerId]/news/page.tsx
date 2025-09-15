"use client"

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ref, onValue, off, get, child, remove, set } from 'firebase/database';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import Loader from '@/components/loader';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Newspaper, Users, PlusCircle, ThumbsUp, MessageSquare, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import PermissionsManager from '@/components/center/news/permissions-manager';
import CreateNewsForm from '@/components/center/news/create-news-form';
import type { UserProfile, NewsPermissions } from '@/components/center/news/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';

export interface NewsArticle {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  likes: { [key: string]: boolean };
  dislikes: { [key: string]: boolean };
  commentsCount: number;
}

async function initializeNewsData(centerId: string) {
    const newsRef = ref(db, `centers/${centerId}/news`);
    const snapshot = await get(newsRef);
    if (!snapshot.exists()) {
        await set(newsRef, {
            permissions: {
                inCharge: null,
                members: {}
            },
            articles: {}
        });
    }
}

export default function NewsPage() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [permissions, setPermissions] = useState<NewsPermissions | null>(null);
  const [allMembers, setAllMembers] = useState<UserProfile[]>([]);
  const [userRole, setUserRole] = useState<'owner' | 'in-charge' | 'member' | 'guest'>('guest');
  const [loading, setLoading] = useState(true);
  const [isPermissionsOpen, setPermissionsOpen] = useState(false);
  const [isCreateFormOpen, setCreateFormOpen] = useState(false);
  const [articleToDelete, setArticleToDelete] = useState<NewsArticle | null>(null);

  const { user } = useAuth();
  const params = useParams();
  const centerId = Array.isArray(params.centerId) ? params.centerId[0] : params.centerId;
  const { toast } = useToast();

  useEffect(() => {
    if (!centerId || !user) {
        setLoading(false);
        return;
    };

    const centerRef = ref(db, `centers/${centerId}`);
    const articlesRef = ref(db, `centers/${centerId}/news/articles`);
    const permissionsRef = ref(db, `centers/${centerId}/news/permissions`);

    const fetchData = async () => {
        await initializeNewsData(centerId);
        
        const centerSnap = await get(centerRef);
        if (!centerSnap.exists()) {
            setLoading(false);
            return;
        }
        const centerData = centerSnap.val();
        const ownerId = centerData.ownerId;

        const usersSnap = await get(child(ref(db), 'users'));
        const allUserProfiles = usersSnap.exists() ? Object.entries(usersSnap.val()).map(([id, profile]: [string, any]) => ({ id, name: `${profile.name} ${profile.surname}`, username: profile.username })) : [];
        setAllMembers(allUserProfiles);

        const permsListener = onValue(permissionsRef, (snapshot) => {
            const perms = snapshot.val();
            setPermissions(perms);

            if (user.uid === ownerId) setUserRole('owner');
            else if (perms?.inCharge === user.uid) setUserRole('in-charge');
            else if (centerData.members.students[user.uid] || centerData.members.admins[user.uid] || centerData.members.adminsPlus[user.uid]) setUserRole('member');
            else setUserRole('guest');

            setLoading(false); // Make sure to set loading to false even if perms is null
        }, (error) => {
            console.error("Error fetching news permissions: ", error);
            setLoading(false); // Also stop loading on error
        });

        const articlesListener = onValue(articlesRef, (snapshot) => {
            const data = snapshot.val();
            const list: NewsArticle[] = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) : [];
            setArticles(list);
        });

        return () => {
            off(permissionsRef, 'value', permsListener);
            off(articlesRef, 'value', articlesListener);
        }
    }

    let cleanup: (() => void) | undefined;
    fetchData().then(c => { cleanup = c });
    return () => cleanup?.();

  }, [centerId, user]);
  
  const canManageTeam = userRole === 'owner';
  const canCreate = userRole === 'owner' || userRole === 'in-charge' || (permissions?.members && user && permissions.members[user.uid]);
  const canDelete = userRole === 'owner' || userRole === 'in-charge';

  const handleDeleteArticle = async () => {
    if (!articleToDelete) return;
    try {
        await remove(ref(db, `centers/${centerId}/news/articles/${articleToDelete.id}`));
        toast({ title: "Noticia eliminada", description: "El artículo ha sido borrado permanentemente." });
    } catch (error) {
        toast({ title: "Error", description: "No se pudo eliminar la noticia.", variant: "destructive" });
    } finally {
        setArticleToDelete(null);
    }
  }

  if (loading) {
    return <div className="flex flex-1 justify-center items-center p-4"><Loader /></div>;
  }

  return (
    <>
    <div className="flex-1 space-y-8 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Newspaper className="h-8 w-8" />
          Noticiero del Centro
        </h2>
        <div className="flex gap-2">
          {canCreate && (
             <Dialog open={isCreateFormOpen} onOpenChange={setCreateFormOpen}>
              <DialogTrigger asChild>
                <Button><PlusCircle className="mr-2"/>Crear Noticia</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Nueva Noticia</DialogTitle>
                  <DialogDescription>Redacta y publica un nuevo artículo para el centro.</DialogDescription>
                </DialogHeader>
                <CreateNewsForm centerId={centerId} onArticlePosted={() => setCreateFormOpen(false)} />
              </DialogContent>
            </Dialog>
          )}
          {canManageTeam && (
            <Dialog open={isPermissionsOpen} onOpenChange={setPermissionsOpen}>
              <DialogTrigger asChild>
                <Button variant="outline"><Users className="mr-2"/>Gestionar Equipo</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Equipo de Noticias</DialogTitle>
                  <DialogDescription>Designa al encargado y a los miembros del equipo de noticias.</DialogDescription>
                </DialogHeader>
                <PermissionsManager 
                    centerId={centerId}
                    permissions={permissions}
                    allMembers={allMembers}
                    onSave={() => setPermissionsOpen(false)}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
      <p className="text-muted-foreground">
        Mantente al día con las últimas noticias y anuncios del centro de estudiantes.
      </p>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {articles.length > 0 ? (
          articles.map(article => (
            <Card key={article.id} className="h-full flex flex-col justify-between hover:shadow-lg transition-shadow">
                <div>
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle>{article.title}</CardTitle>
                                <CardDescription>Por {article.authorName}</CardDescription>
                            </div>
                            {canDelete && (
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setArticleToDelete(article)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="line-clamp-4 text-sm text-muted-foreground">{article.content}</p>
                    </CardContent>
                </div>
                <div>
                     <CardContent>
                        <p className="text-xs text-muted-foreground">{format(new Date(article.createdAt), "d 'de' MMMM, yyyy", { locale: es })}</p>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                       <div className="flex gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1"><ThumbsUp className="h-4 w-4"/>{Object.keys(article.likes || {}).length}</span>
                            <span className="flex items-center gap-1"><MessageSquare className="h-4 w-4"/>{article.commentsCount || 0}</span>
                       </div>
                       <Button asChild variant="secondary" size="sm">
                            <Link href={`/center/${centerId}/news/${article.id}`}>
                                Leer más
                            </Link>
                       </Button>
                    </CardFooter>
                </div>
            </Card>
          ))
        ) : (
          <div className="md:col-span-2 lg:col-span-3 text-center py-16 border-2 border-dashed rounded-lg">
            <h3 className="text-xl font-semibold">No hay noticias todavía</h3>
            <p className="text-muted-foreground mt-2">
              {canCreate ? '¡Sé el primero en publicar una noticia!' : 'Cuando el equipo de noticias publique algo, aparecerá aquí.'}
            </p>
          </div>
        )}
      </div>

    </div>
    <AlertDialog open={!!articleToDelete} onOpenChange={(open) => !open && setArticleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la noticia y todos sus comentarios.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteArticle} className="bg-destructive hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
