"use client"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Users, ArrowRight, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Event, Role } from './types';
import Link from 'next/link';

interface EventCardProps {
  event: Event;
  centerId: string;
  userRole: Role;
  onDelete: () => void;
}

export default function EventCard({ event, centerId, userRole, onDelete }: EventCardProps) {
    const isPast = new Date(event.date) < new Date();
    const totalAttendees = event.teams 
        ? Object.values(event.teams).reduce((sum, team) => sum + Object.keys(team.members).length, 0) 
        : 0;

    return (
        <Card className={cn("flex flex-col hover:shadow-lg transition-shadow relative", isPast && "bg-muted/50")}>
            {userRole === 'owner' && (
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-2 right-2 h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                    }}
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            )}
            <CardHeader>
                <CardTitle>{event.title}</CardTitle>
                <CardDescription className="line-clamp-2">{event.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-3">
                 <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{format(new Date(event.date), "d 'de' MMMM, yyyy", { locale: es })}</span>
                 </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{event.location}</span>
                 </div>
                 {event.requiresRsvp && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{totalAttendees} {totalAttendees === 1 ? 'inscrito' : 'inscritos'}</span>
                    </div>
                 )}
            </CardContent>
            <CardFooter>
                 <Button asChild className="w-full">
                    <Link href={`/center/${centerId}/events/${event.id}`}>
                        Ver Detalles <ArrowRight className="ml-2 h-4 w-4"/>
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    )
}
