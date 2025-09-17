"use client";

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { ref, push, set } from 'firebase/database';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, PenSquare } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Card, CardContent } from '../ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';


interface CreatePostProps {
  centerId: string;
  onPostCreated?: () => void;
}

export default function CreatePost({ centerId, onPostCreated }: CreatePostProps) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    const names = name.split(" ");
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name[0].toUpperCase();
  };


  const handlePostSubmit = async () => {
    if (!user || content.trim().length < 5) {
      toast({
        title: 'Error',
        description: 'La publicación debe tener al menos 5 caracteres.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const postsRef = ref(db, `centers/${centerId}/posts`);
      const newPostRef = push(postsRef);

      await set(newPostRef, {
        authorId: user.uid,
        authorName: user.displayName || 'Anónimo',
        authorPhotoURL: user.photoURL || '',
        content: content.trim(),
        createdAt: new Date().toISOString(),
        likes: {},
        dislikes: {},
        commentsCount: 0,
      });

      setContent('');
      toast({
        title: '¡Publicación Creada!',
        description: 'Tu publicación ahora es visible para todos.',
      });
      onPostCreated?.();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error creating post:', error);
      toast({
        title: 'Error',
        description: 'No se pudo crear la publicación. Inténtalo de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
     <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Card className="shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                     <Avatar>
                        <AvatarImage src={user.photoURL ?? ''} alt={user.displayName ?? ''} />
                        <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                    </Avatar>
                    <div className="w-full text-left bg-muted h-10 rounded-full flex items-center px-4 text-muted-foreground">
                        Crear una nueva publicación...
                    </div>
                     <Button className="rounded-full h-10 w-10 p-0" size="icon"><PenSquare className="h-5 w-5" /></Button>
                  </div>
              </CardContent>
          </Card>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Crear Publicación</DialogTitle>
          </DialogHeader>
           <div className="py-4">
            <div className="flex items-start gap-4">
                <Avatar className="h-9 w-9">
                    <AvatarImage src={user.photoURL ?? ''} alt={user.displayName ?? ''} />
                    <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                </Avatar>
            <div className="w-full space-y-2">
                <Textarea
                placeholder={`¿Qué está pasando, ${user.displayName?.split(' ')[0]}?`}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={5}
                className="w-full"
                disabled={isSubmitting}
                />
                <div className="flex justify-end">
                <Button onClick={handlePostSubmit} disabled={isSubmitting || content.trim().length < 5}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Publicar
                </Button>
                </div>
            </div>
            </div>
        </div>
        </DialogContent>
      </Dialog>
  );
}
