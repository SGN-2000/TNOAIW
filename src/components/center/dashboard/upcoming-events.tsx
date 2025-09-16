"use client"

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, ArrowRight, MapPin } from "lucide-react";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Event } from '@/components/center/events/types';

interface UpcomingEventsProps {
    events: Event[];
    centerId: string;
}

export default function UpcomingEvents({ events, centerId }: UpcomingEventsProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5"/>Próximos Eventos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {events.length > 0 ? (
                    events.map(event => (
                        <div key={event.id}>
                           <Link href={`/center/${centerId}/events/${event.id}`}>
                                <p className="font-semibold hover:underline">{event.title}</p>
                           </Link>
                           <div className="text-sm text-muted-foreground space-y-1 mt-1">
                                <div className="flex items-center gap-1.5">
                                    <Calendar className="h-4 w-4" />
                                    <span>{format(new Date(event.date), "eeee, d 'de' MMMM, HH:mm", { locale: es })}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <MapPin className="h-4 w-4" />
                                    <span>{event.location}</span>
                                </div>
                           </div>
                        </div>
                    ))
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No hay eventos próximos.</p>
                )}

                <Button variant="outline" className="w-full" asChild>
                    <Link href={`/center/${centerId}/events`}>
                        Ver todos los eventos <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </CardContent>
        </Card>
    );
}
