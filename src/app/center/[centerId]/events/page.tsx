"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";

export default function EventsPage() {
    return (
        <div className="flex-1 flex items-center justify-center p-4">
            <Card className="w-full max-w-md text-center shadow-lg">
                <CardHeader>
                    <div className="mx-auto bg-primary/10 text-primary rounded-full p-4 w-fit mb-4">
                        <Calendar className="h-10 w-10" />
                    </div>
                    <CardTitle>Eventos</CardTitle>
                    <CardDescription>Esta funcionalidad está cerrada temporalmente por mejoras.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        Estamos trabajando para mejorar la organización de torneos y actividades. ¡Vuelve pronto para ver las novedades!
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
