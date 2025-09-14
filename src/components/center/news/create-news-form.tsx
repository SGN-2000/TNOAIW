"use client"

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ref, set, push } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const articleSchema = z.object({
  title: z.string().min(5, "El título debe tener al menos 5 caracteres.").max(100, "El título no puede superar los 100 caracteres."),
  content: z.string().min(20, "El contenido debe tener al menos 20 caracteres."),
});

interface CreateNewsFormProps {
  centerId: string;
  onArticlePosted: () => void;
}

export default function CreateNewsForm({ centerId, onArticlePosted }: CreateNewsFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof articleSchema>>({
    resolver: zodResolver(articleSchema),
    defaultValues: {
      title: "",
      content: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof articleSchema>) => {
    if (!user) {
        toast({ title: "Error", description: "Debes iniciar sesión para publicar.", variant: "destructive" });
        return;
    }

    try {
      const articlesRef = ref(db, `centers/${centerId}/news/articles`);
      const newArticleRef = push(articlesRef);
      
      await set(newArticleRef, {
        ...values,
        authorId: user.uid,
        authorName: user.displayName || 'Anónimo',
        createdAt: new Date().toISOString(),
        likes: {},
        dislikes: {},
        commentsCount: 0,
      });

      toast({ title: "Noticia Publicada", description: "El artículo ya es visible para todos." });
      onArticlePosted();
    } catch (error) {
      console.error("Error creating article:", error);
      toast({ title: "Error", description: "No se pudo publicar la noticia.", variant: "destructive" });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Título de la Noticia</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Nuevas Actividades en el Centro" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contenido del Artículo</FormLabel>
              <FormControl>
                <Textarea placeholder="Escribe el cuerpo de la noticia aquí..." {...field} rows={10} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onArticlePosted} disabled={form.formState.isSubmitting}>Cancelar</Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Publicar Noticia"}
            </Button>
        </div>
      </form>
    </Form>
  );
}
