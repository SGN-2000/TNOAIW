"use client"

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import type { CenterProfile, Chat } from './types';
import { createGroupChat } from '@/lib/inter-center-chat-helpers';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';

const groupSchema = z.object({
  name: z.string().min(3, "El nombre del grupo debe tener al menos 3 caracteres."),
  membersToInvite: z.array(z.string()).min(1, "Debes seleccionar al menos un centro para invitar."),
});

interface CreateGroupProps {
  allCenters: CenterProfile[];
  currentCenterId: string;
  onGroupCreated: (chat: Chat) => void;
  directChats: Chat[];
}

export default function CreateGroup({ allCenters, currentCenterId, onGroupCreated, directChats }: CreateGroupProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof groupSchema>>({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      name: "",
      membersToInvite: [],
    },
  });

  const onSubmit = async (values: z.infer<typeof groupSchema>) => {
    setIsSubmitting(true);
    try {
        const newGroup = await createGroupChat(currentCenterId, values.name, values.membersToInvite);
        toast({ title: "Invitaciones Enviadas", description: `Se han enviado las invitaciones para el grupo "${values.name}".` });
        onGroupCreated(newGroup);
    } catch (error) {
        console.error(error);
        toast({ title: "Error", description: "No se pudo crear el grupo.", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const centersYouCanInvite = allCenters.filter(center => {
      // Must be a different center
      if(center.id === currentCenterId) return false;
      // Must have a direct chat with them
      return directChats.some(chat => chat.type === 'direct' && chat.members[center.id]);
  });


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
         <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>¿Cómo funciona?</AlertTitle>
            <AlertDescription>
              Para poder invitar a un centro a un grupo, primero debes haber iniciado una conversación directa con ellos.
            </AlertDescription>
        </Alert>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del Grupo</FormLabel>
              <FormControl><Input placeholder="Ej: Grupo de Debate Regional" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="membersToInvite"
          render={() => (
            <FormItem>
              <FormLabel>Invitar Centros al Grupo</FormLabel>
               <ScrollArea className="h-64 border rounded-md">
                 <div className="p-4 space-y-2">
                    {centersYouCanInvite.length > 0 ? centersYouCanInvite.map(center => (
                        <FormField
                            key={center.id}
                            control={form.control}
                            name="membersToInvite"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                    <FormControl>
                                        <Checkbox
                                            checked={field.value?.includes(center.id)}
                                            onCheckedChange={(checked) => {
                                                return checked
                                                ? field.onChange([...field.value, center.id])
                                                : field.onChange(field.value?.filter(id => id !== center.id));
                                            }}
                                        />
                                    </FormControl>
                                    <FormLabel className="font-normal">{center.centerName}</FormLabel>
                                </FormItem>
                            )}
                        />
                    )) : (
                        <p className="text-sm text-muted-foreground text-center py-4">No tienes chats directos para invitar a grupos.</p>
                    )}
                 </div>
               </ScrollArea>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Enviar Invitaciones"}
            </Button>
        </div>
      </form>
    </Form>
  );
}
