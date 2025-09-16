"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HandHeart } from "lucide-react";

export default function DonationsPage() {
    return (
        <div className="flex-1 flex items-center justify-center p-4">
            <Card className="w-full max-w-md text-center shadow-lg">
                <CardHeader>
                    <div className="mx-auto bg-primary/10 text-primary rounded-full p-4 w-fit mb-4">
                        <HandHeart className="h-10 w-10" />
                    </div>
                    <CardTitle>Donaciones</CardTitle>
                    <CardDescription>Esta funcionalidad estará disponible próximamente.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        Estamos trabajando para habilitar un sistema seguro y fácil para que puedas recibir donaciones y apoyar las actividades de tu centro. ¡Vuelve pronto!
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
