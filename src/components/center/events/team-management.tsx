

"use client"

import { useState, useEffect } from 'react';
import type { Event, Team, CenterMember } from './types';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { User, Crown, PlusCircle, Send, Trash2, Check, X, Clock, Loader2, UserPlus, Pencil, Save, AlertTriangle } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ref, set, push, update, remove } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';


interface TeamManagementProps {
    event: Event;
    centerId: string;
    canManage: boolean;
    allCenterMembers: CenterMember[];
}

const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';
};

const TeamCard = ({ team, event, centerId, allCenterMembers }: { team: Team, event: Event, centerId: string, allCenterMembers: CenterMember[] }) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [openInvite, setOpenInvite] = useState(false);
    
    const isLeader = user?.uid === team.leaderId;
    const teamMembers = Object.values(team.members);
    const acceptedCount = teamMembers.filter(m => m.status === 'accepted').length;
    const canInvite = isLeader && acceptedCount < (event.teamSize?.max || 0);

    const allEventMembers = new Set(Object.values(event.teams || {}).flatMap(t => Object.keys(t.members)));
    const invitableMembers = allCenterMembers.filter(m => !allEventMembers.has(m.id));

    const handleInvite = async (memberToInvite: CenterMember) => {
        if (!user) return;
        setOpenInvite(false);
        const memberRef = ref(db, `centers/${centerId}/events/events/${event.id}/teams/${team.id}/members/${memberToInvite.id}`);
        const notificationRef = push(ref(db, `notifications/${memberToInvite.id}`));
        
        try {
            await set(memberRef, {
                id: memberToInvite.id,
                name: `${memberToInvite.profile.name} ${memberToInvite.profile.surname}`,
                status: 'pending'
            });

            await set(notificationRef, {
                type: 'TEAM_INVITE',
                centerId: centerId,
                subjectUserId: user.uid,
                subjectUserName: user.displayName,
                eventId: event.id,
                eventName: event.title,
                teamId: team.id,
                teamName: team.name,
                timestamp: new Date().toISOString(),
                read: false,
            });
            
            toast({ title: "Invitación enviada", description: `Se ha invitado a ${memberToInvite.profile.name} al equipo.` });

        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "No se pudo enviar la invitación.", variant: "destructive" });
        }
    }
    
    const handleRemoveMember = async (memberId: string) => {
         await set(ref(db, `centers/${centerId}/events/events/${event.id}/teams/${team.id}/members/${memberId}`), null);
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex justify-between items-center">
                    {team.name}
                    {event.teamSize && <Badge>{acceptedCount} / {event.teamSize?.max}</Badge>}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {teamMembers.map(member => (
                    <div key={member.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                             <Avatar className="h-7 w-7"><AvatarFallback>{getInitials(member.name)}</AvatarFallback></Avatar>
                             <span>{member.name}</span>
                             {member.id === team.leaderId && <Crown className="h-4 w-4 text-yellow-500"/>}
                        </div>
                        <div className="flex items-center gap-2">
                            {member.status === 'accepted' && <Check className="h-4 w-4 text-green-500" />}
                            {member.status === 'pending' && <Clock className="h-4 w-4 text-yellow-500" />}
                            {member.status === 'declined' && <X className="h-4 w-4 text-destructive" />}
                            {isLeader && member.id !== user?.uid && (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-6 w-6"><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader><AlertDialogTitle>¿Eliminar miembro?</AlertDialogTitle><AlertDialogDescription>¿Seguro que quieres eliminar a {member.name} del equipo?</AlertDialogDescription></AlertDialogHeader>
                                        <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleRemoveMember(member.id)}>Eliminar</AlertDialogAction></AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            )}
                        </div>
                    </div>
                ))}
            </CardContent>
            {canInvite && (
                 <CardFooter>
                     <Popover open={openInvite} onOpenChange={setOpenInvite}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full"><PlusCircle className="mr-2 h-4 w-4"/>Invitar Miembro</Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0">
                            <Command>
                                <CommandInput placeholder="Buscar miembro..." />
                                <CommandList>
                                <CommandEmpty>No hay miembros para invitar.</CommandEmpty>
                                <CommandGroup>
                                    {invitableMembers.map((member) => (
                                    <CommandItem key={member.id} onSelect={() => handleInvite(member)} value={`${member.profile.name} ${member.profile.surname}`}>
                                        {`${member.profile.name} ${member.profile.surname}`}
                                    </CommandItem>
                                    ))}
                                </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                 </CardFooter>
            )}
        </Card>
    )
}

const ManagerTeamBuilder = ({ event, centerId, allCenterMembers }: { event: Event; centerId: string; allCenterMembers: CenterMember[] }) => {
    const [teams, setTeams] = useState<Team[]>(Object.values(event.teams || {}));
    const [editingTeamName, setEditingTeamName] = useState<{ [key: string]: string }>({});
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();
    const [unassignedMembers, setUnassignedMembers] = useState<CenterMember[]>([]);

    useEffect(() => {
        const assignedMemberIds = new Set(teams.flatMap(t => t.members ? Object.keys(t.members) : []));
        setUnassignedMembers(allCenterMembers.filter(m => !assignedMemberIds.has(m.id)));
    }, [teams, allCenterMembers]);


    const handleCreateTeam = () => {
        const newTeamId = push(ref(db)).key!;
        const newTeam: Team = {
            id: newTeamId,
            name: `Equipo ${teams.length + 1}`,
            leaderId: '',
            members: {},
        };
        setTeams(prev => [...prev, newTeam]);
    };

    const handleTeamNameChange = (teamId: string, newName: string) => {
        setTeams(prev => prev.map(t => t.id === teamId ? { ...t, name: newName } : t));
    };

    const handleAssignMember = (member: CenterMember, teamId: string) => {
        setTeams(prev => prev.map(team => {
            if (team.id === teamId) {
                const newMembers = { ...team.members };
                newMembers[member.id] = { id: member.id, name: `${member.profile.name} ${member.profile.surname}`, status: 'accepted', paymentStatus: 'pending' };
                return { ...team, members: newMembers };
            }
            return team;
        }));
    };

    const handleUnassignMember = (memberId: string) => {
         setTeams(prev => prev.map(team => {
            const newMembers = { ...team.members };
            delete newMembers[memberId];
            return { ...team, members: newMembers };
        }));
    };
    
    const handleDeleteTeam = (teamId: string) => {
        setTeams(prev => prev.filter(t => t.id !== teamId));
    }
    
    const handleSaveChanges = async () => {
        setIsSaving(true);
        const teamsObject = teams.reduce((acc, team) => {
            acc[team.id] = team;
            return acc;
        }, {} as {[key: string]: Team});

        try {
            await set(ref(db, `centers/${centerId}/events/events/${event.id}/teams`), teamsObject);

            const notificationPromises = teams.flatMap(team =>
                Object.values(team.members)
                .map(member =>
                    set(push(ref(db, `notifications/${member.id}`)), {
                        type: 'TEAM_ASSIGNMENT',
                        centerId,
                        eventName: event.title,
                        teamName: team.name,
                        timestamp: new Date().toISOString(),
                        read: false
                    })
                )
            );
            await Promise.all(notificationPromises);

            toast({ title: 'Equipos guardados', description: 'La conformación de equipos ha sido actualizada.' });
        } catch (error) {
            console.error(error);
            toast({ title: 'Error', description: 'No se pudieron guardar los equipos.', variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    }


    return (
        <div className="space-y-6">
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h3 className="text-xl font-semibold">Equipos Creados</h3>
                    <div className='flex gap-2'>
                        <Button onClick={handleCreateTeam} variant="outline"><PlusCircle className="mr-2"/>Crear Equipo</Button>
                        <Button onClick={handleSaveChanges} disabled={isSaving}>
                           {isSaving && <Loader2 className="mr-2 animate-spin"/>}
                           Guardar Cambios
                        </Button>
                    </div>
                </div>
                {teams.length === 0 && (
                     <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>No hay equipos creados</AlertTitle>
                        <AlertDescription>
                            Crea equipos y asígnales miembros. Los participantes no serán notificados hasta que guardes los cambios.
                        </AlertDescription>
                    </Alert>
                )}
                <div className="grid md:grid-cols-2 gap-4">
                     {teams.map(team => (
                        <Card key={team.id}>
                            <CardHeader>
                                <div className="flex justify-between items-center gap-2">
                                    <div className="flex items-center gap-2 flex-grow">
                                        {editingTeamName[team.id] !== undefined ? (
                                            <Input 
                                                value={editingTeamName[team.id]}
                                                onChange={(e) => setEditingTeamName(prev => ({ ...prev, [team.id]: e.target.value }))}
                                                className="h-8"
                                            />
                                        ) : <CardTitle>{team.name}</CardTitle>}
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                                            if (editingTeamName[team.id] !== undefined) {
                                                handleTeamNameChange(team.id, editingTeamName[team.id]);
                                                setEditingTeamName(prev => { const newState = {...prev}; delete newState[team.id]; return newState; });
                                            } else {
                                                setEditingTeamName(prev => ({...prev, [team.id]: team.name}));
                                            }
                                        }}>
                                            {editingTeamName[team.id] !== undefined ? <Save className="h-4 w-4"/> : <Pencil className="h-4 w-4"/>}
                                        </Button>
                                    </div>
                                     <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="h-4 w-4"/></Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader><AlertDialogTitle>¿Eliminar equipo "{team.name}"?</AlertDialogTitle><AlertDialogDescription>Los miembros volverán a la lista de no asignados.</AlertDialogDescription></AlertDialogHeader>
                                            <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteTeam(team.id)}>Eliminar</AlertDialogAction></AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {team.members && Object.values(team.members).map(member => (
                                    <div key={member.id} className="flex justify-between items-center text-sm">
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-6 w-6 text-xs"><AvatarFallback>{getInitials(member.name)}</AvatarFallback></Avatar>
                                            <span>{member.name}</span>
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleUnassignMember(member.id)}>
                                            <X className="h-4 w-4"/>
                                        </Button>
                                    </div>
                                ))}
                                {(!team.members || Object.keys(team.members).length === 0) && <p className="text-xs text-muted-foreground text-center p-2">Equipo vacío</p>}
                            </CardContent>
                             <CardFooter>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" size="sm" className="w-full"><UserPlus className="mr-2 h-4 w-4"/>Añadir Miembro</Button>
                                    </PopoverTrigger>
                                     <PopoverContent className="w-[250px] p-0">
                                        <Command>
                                            <CommandInput placeholder="Buscar miembro..." />
                                            <CommandList>
                                            <CommandEmpty>No hay miembros disponibles.</CommandEmpty>
                                            <CommandGroup>
                                                {unassignedMembers.map((member) => (
                                                <CommandItem key={member.id} onSelect={() => handleAssignMember(member, team.id)}>
                                                    {`${member.profile.name} ${member.profile.surname}`}
                                                </CommandItem>
                                                ))}
                                            </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                             </CardFooter>
                        </Card>
                     ))}
                </div>
            </div>

             <Accordion type="single" collapsible>
                <AccordionItem value="unassigned-members">
                    <AccordionTrigger>Miembros sin Equipo ({unassignedMembers.length})</AccordionTrigger>
                    <AccordionContent>
                        <Card>
                             <CardContent className="pt-6 max-h-96 overflow-y-auto space-y-2">
                                {unassignedMembers.map(member => (
                                    <div key={member.id} className="flex items-center justify-between p-2 border rounded-md">
                                         <div className="flex items-center gap-2">
                                            <Avatar className="h-7 w-7"><AvatarFallback>{getInitials(`${member.profile.name} ${member.profile.surname}`)}</AvatarFallback></Avatar>
                                            <span className="text-sm">{member.profile.name} {member.profile.surname}</span>
                                        </div>
                                    </div>
                                ))}
                                 {unassignedMembers.length === 0 && <p className="text-sm text-center text-muted-foreground p-4">Todos los miembros han sido asignados.</p>}
                            </CardContent>
                        </Card>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
    )
}


export default function TeamManagement({ event, centerId, canManage, allCenterMembers }: TeamManagementProps) {
    const teams = event.teams ? Object.values(event.teams) : [];

    if (event.teamFormation === 'manager') {
        if (canManage) {
            return <ManagerTeamBuilder event={event} centerId={centerId} allCenterMembers={allCenterMembers} />;
        }
        return (
             <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {teams.map(team => (
                    <Card key={team.id}>
                        <CardHeader>
                            <CardTitle>{team.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-2">
                                {Object.values(team.members).map(member => (
                                    <li key={member.id} className="flex items-center gap-2 text-sm">
                                        <Avatar className="h-7 w-7"><AvatarFallback>{getInitials(member.name)}</AvatarFallback></Avatar>
                                        {member.name}
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                ))}
             </div>
        )
    }
    
    if (teams.length === 0) {
         return (
            <div className="text-center py-16 border-2 border-dashed rounded-lg">
                <h3 className="text-xl font-semibold">No hay equipos creados</h3>
                <p className="text-muted-foreground mt-2">
                    ¡Sé el primero en crear un equipo para este evento!
                </p>
            </div>
        );
    }

    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {teams.map(team => (
                <TeamCard key={team.id} team={team} event={event} centerId={centerId} allCenterMembers={allCenterMembers} />
            ))}
        </div>
    );
}
