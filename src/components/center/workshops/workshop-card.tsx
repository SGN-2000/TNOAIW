"use client"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, User, Trash2, Edit, Laptop } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Workshop } from './types';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

interface WorkshopCardProps {
  workshop: Workshop;
  canManage: boolean;
  onEdit: (workshop: Workshop) => void;
  onDelete: (workshop: Workshop) => void;
}

export default function WorkshopCard({ workshop, canManage, onEdit, onDelete }: WorkshopCardProps) {
    const isPast = new Date(workshop.date) < new Date();

    return (
        <Card className={cn("flex flex-col hover:shadow-lg transition-shadow relative", isPast && "bg-muted/50")}>
            {canManage && (
                <div className="absolute top-2 right-2 flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(workshop)}>
                        <Edit className="h-4 w-4" />
                    </Button>
                     <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10" onClick={() => onDelete(workshop)}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            )}
            <CardHeader>
                <CardTitle>{workshop.title}</CardTitle>
                <CardDescription className="line-clamp-3">{workshop.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-3">
                 <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{format(new Date(workshop.date), "eeee, d 'de' MMMM, yyyy 'a las' HH:mm 'hs'", { locale: es })}</span>
                 </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {workshop.isVirtual ? <Laptop className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
                    {workshop.isVirtual ? (
                        <Link href={workshop.location} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">
                            Enlace a la reunión
                        </Link>
                    ) : (
                        <span>{workshop.location}</span>
                    )}
                 </div>
                 <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>A cargo de: {workshop.instructor}</span>
                 </div>
            </CardContent>
             <CardFooter>
                 <Badge variant={isPast ? 'secondary' : 'default'}>{isPast ? 'Finalizado' : 'Próximamente'}</Badge>
            </CardFooter>
        </Card>
    )
}
