"use client"

import { useMemo } from 'react';
import type { Team, Rsvp } from './types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, Users } from 'lucide-react';
import Link from 'next/link';

interface RegisteredUsersListProps {
    teams: Team[];
    rsvps: Rsvp[];
    participationType: 'individual' | 'team';
}

const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase() || '?';
}

export default function RegisteredUsersList({ teams, rsvps, participationType }: RegisteredUsersListProps) {
    
    const allMembers = useMemo(() => {
        if (participationType === 'team') {
            const memberMap = new Map<string, { id: string, name: string, teamName: string }>();
            teams.forEach(team => {
                if (team.members) { // Check if team.members exists
                    Object.values(team.members).forEach(member => {
                        if (member.status === 'accepted') {
                            memberMap.set(member.id, { ...member, teamName: team.name });
                        }
                    });
                }
            });
            return Array.from(memberMap.values()).sort((a,b) => a.name.localeCompare(b.name));
        } else {
            return [...rsvps].sort((a,b) => a.name.localeCompare(b.name));
        }
    }, [teams, rsvps, participationType]);

    if (allMembers.length === 0) {
        return (
            <div className="text-center py-16 border-2 border-dashed rounded-lg">
                <div className="flex justify-center items-center mb-4">
                    <Users className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold">Nadie se ha inscrito todavía</h3>
                <p className="text-muted-foreground mt-2">
                    Cuando los miembros se inscriban, aparecerán aquí.
                </p>
            </div>
        );
    }
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Lista de Inscritos ({allMembers.length})</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {allMembers.map(member => (
                        <div key={member.id} className="flex items-center gap-3 p-2 border rounded-md">
                            <Avatar className="h-8 w-8">
                                <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="text-sm font-semibold">{member.name}</p>
                                {participationType === 'team' && 'teamName' in member && (
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Users className="h-3 w-3"/>
                                        {member.teamName}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
