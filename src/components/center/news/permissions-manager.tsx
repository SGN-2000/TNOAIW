"use client"

import { useState } from 'react';
import { ref, update, set, push, get } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, Crown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { NewsPermissions, UserProfile } from './types';

interface PermissionsManagerProps {
  centerId: string;
  permissions: NewsPermissions | null;
  allMembers: UserProfile[];
  onSave: () => void;
}

const getInitials = (name: string) => {
    const names = name.split(" ");
    return names.length > 1 ? `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase() : name[0]?.toUpperCase() || '?';
};

export default function PermissionsManager({ centerId, permissions, allMembers, onSave }: PermissionsManagerProps) {
  const [inCharge, setInCharge] = useState<string | null>(permissions?.inCharge || null);
  const [selectedMembers, setSelectedMembers] = useState<string[]>(Object.keys(permissions?.members || {}));
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!inCharge) {
        toast({ title: "Error", description: "Debes designar a un encargado.", variant: "destructive" });
        return;
    }
    setIsSaving(true);
    
    const newPermissions = {
      inCharge,
      members: selectedMembers.reduce((acc, id) => ({ ...acc, [id]: true }), {} as { [userId: string]: true })
    };

    try {
        await set(ref(db, `centers/${centerId}/news/permissions`), newPermissions);
        
        const centerNameSnapshot = await get(ref(db, `centers/${centerId}/centerName`));
        const centerName = centerNameSnapshot.val();

        // Naive notification: notify everyone on the new list
        const newTeam = [...new Set([inCharge, ...selectedMembers])];
        const notificationPromises = newTeam.map(memberId => {
            const notifRef = push(ref(db, `notifications/${memberId}`));
            return set(notifRef, {
                type: 'NEW_PERMISSION',
                permissionType: 'NEWS_TEAM_MEMBER',
                centerId: centerId,
                centerName: centerName,
                timestamp: new Date().toISOString(),
                read: false,
            });
        });
        await Promise.all(notificationPromises);

        toast({ title: "Equipo de Noticias Actualizado" });
        onSave();
    } catch(e) {
        console.error(e);
        toast({ title: "Error", description: "No se pudieron guardar los cambios.", variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  };

  const handleMemberSelect = (memberId: string, checked: boolean) => {
    if (memberId === inCharge) return; // Cannot unselect the person in charge

    if (checked) {
        if (selectedMembers.length < 10) {
            setSelectedMembers(prev => [...prev, memberId]);
        } else {
            toast({ title: "Límite Alcanzado", description: "El equipo no puede tener más de 10 miembros.", variant: "destructive" });
        }
    } else {
        setSelectedMembers(prev => prev.filter(id => id !== memberId));
    }
  };


  const personInChargeProfile = allMembers.find(m => m.id === inCharge);

  return (
    <div className="space-y-6 pt-4">
        {/* Select Person in Charge */}
        <div>
            <Label className="flex items-center gap-2 mb-2"><Crown className="h-4 w-4 text-yellow-500" />Encargado del Equipo</Label>
             <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                        {personInChargeProfile ? (
                            <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                    <AvatarFallback>{getInitials(personInChargeProfile.name)}</AvatarFallback>
                                </Avatar>
                                <span>{personInChargeProfile.name}</span>
                            </div>
                        ) : "Seleccionar encargado"}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                        <CommandInput placeholder="Buscar miembro..." />
                        <CommandList>
                            <CommandEmpty>No se encontraron usuarios.</CommandEmpty>
                            <CommandGroup>
                            {allMembers.map(member => (
                                <CommandItem key={member.id} onSelect={() => {
                                    setInCharge(member.id);
                                    if (!selectedMembers.includes(member.id)) {
                                        handleMemberSelect(member.id, true);
                                    }
                                }}>
                                    {member.name}
                                </CommandItem>
                            ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
        
        {/* Select Team Members */}
        <div>
             <Label className="mb-2 block">Miembros del Equipo <Badge variant="secondary">{selectedMembers.length} / 10</Badge></Label>
            <ScrollArea className="h-64 border rounded-md">
                <div className="p-2 space-y-1">
                    {allMembers.map(member => (
                        <div key={member.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-accent">
                             <Checkbox
                                id={`member-${member.id}`}
                                checked={selectedMembers.includes(member.id)}
                                onCheckedChange={(checked) => handleMemberSelect(member.id, !!checked)}
                                disabled={isSaving || member.id === inCharge}
                            />
                            <Avatar className="h-8 w-8">
                                <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <label htmlFor={`member-${member.id}`} className="text-sm font-medium leading-none">
                                    {member.name}
                                </label>
                                <p className="text-xs text-muted-foreground">@{member.username}</p>
                            </div>
                            {member.id === inCharge && <Crown className="h-4 w-4 text-yellow-500"/>}
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>

        <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onSave} disabled={isSaving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isSaving || !inCharge}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Guardar Cambios"}
            </Button>
        </div>
    </div>
  );
}
