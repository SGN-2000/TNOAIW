"use client"

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import { ref, update, set, push, get } from 'firebase/database';
import { db } from '@/lib/firebase';
import type { CenterProfile, Chat } from './types';
import { useToast } from '@/hooks/use-toast';

const manageGroupSchema = z.object({
  members: z.array(z.string()),
});

interface ManageGroupProps {
  chat: Chat;
  allCenters: CenterProfile[];
  currentCenterId: string;
  onClose: () => void;
  directChats: Chat[];
}

export default function ManageGroup({ chat, allCenters, currentCenterId, onClose, directChats }: ManageGroupProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof manageGroupSchema>>({
    resolver: zodResolver(manageGroupSchema),
    defaultValues: {
      members: Object.keys(chat.members).filter(id => id !== chat.createdBy), // Pre-select current members, excluding creator
    },
  });

  const onSubmit = async (values: z.infer<typeof manageGroupSchema>) => {
    setIsSubmitting(true);
    
    const newMemberIds = [chat.createdBy, ...values.members]; // Always include creator
    const oldMemberIds = Object.keys(chat.members);
    
    const addedMembers = newMemberIds.filter(id => !oldMemberIds.includes(id));
    const removedMembers = oldMemberIds.filter(id => !newMemberIds.includes(id));
    
    const newMembersObject = newMemberIds.reduce((acc, id) => ({ ...acc, [id]: true }), {});

    try {
        // Send invitations to added members
        const creatorCenter = allCenters.find(c => c.id === currentCenterId);
        const notificationPromises = addedMembers.map(async (centerId) => {
            const centerSnap = await get(ref(db, `centers/${centerId}`));
            if (centerSnap.exists()) {
                const ownerId = centerSnap.val().ownerId;
                const notifRef = push(ref(db, `notifications/${ownerId}`));
                await set(notifRef, {
                    type: 'GROUP_INVITE',
                    centerId: centerId, 
                    centerName: creatorCenter?.centerName || "Un centro",
                    subjectUserId: chat.id, 
                    subjectUserName: chat.name, 
                    timestamp: new Date().toISOString(),
                    read: false,
                });
            }
        });
        await Promise.all(notificationPromises);

        // Remove members directly from group and their user-chat links
        const updates: {[key: string]: any} = {};
        removedMembers.forEach(id => {
            updates[`/interCenterChats/${chat.id}/members/${id}`] = null;
            // Also need to get ownerId to remove from userInterCenterChats, this is complex here.
            // For now, let's just remove from the group.
        });
        await update(ref(db), updates);

        if (addedMembers.length > 0) toast({ title: "Invitaciones enviadas"});
        if (removedMembers.length > 0) toast({ title: "Miembros eliminados"});
        if (addedMembers.length === 0 && removedMembers.length === 0) toast({ title: "Sin cambios"});
        
        onClose();
    } catch (error) {
        console.error(error);
        toast({ title: "Error", description: "No se pudo actualizar el grupo.", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };

  // Centers you can invite are those you have a direct chat with, excluding the group creator
  const centersToSelect = allCenters.filter(center => {
      if(center.id === chat.createdBy) return false;
      return directChats.some(dChat => dChat.type === 'direct' && dChat.members[center.id]);
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
        <FormField
          control={form.control}
          name="members"
          render={() => (
            <FormItem>
              <FormLabel>Gestionar Miembros</FormLabel>
               <ScrollArea className="h-64 border rounded-md">
                 <div className="p-4 space-y-2">
                    {centersToSelect.length > 0 ? centersToSelect.map(center => (
                        <FormField
                            key={center.id}
                            control={form.control}
                            name="members"
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
                    )) : <p className="text-muted-foreground text-sm text-center py-4">No hay otros centros con los que tengas un chat directo.</p>}
                 </div>
               </ScrollArea>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Guardar Cambios"}
            </Button>
        </div>
      </form>
    </Form>
  );
}
