
"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Event, Pot, Team } from './types';
import { generateFixture, GenerateFixtureOutput } from '@/ai/flows/generate-fixture-flow';
import { Loader2, ShieldHalf, Trophy } from 'lucide-react';
import { ref, update } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

interface DrawAnimationProps {
    event: Event;
    centerId: string;
}

const shuffleArray = <T,>(array: T[]): T[] => {
    return array.map(value => ({ value, sort: Math.random() }))
                 .sort((a, b) => a.sort - b.sort)
                 .map(({ value }) => value);
};

export default function DrawAnimation({ event, centerId }: DrawAnimationProps) {
    const [pots, setPots] = useState<Pot[]>(() => shuffleArray(event.pots || []).map(pot => ({ ...pot, teams: shuffleArray(pot.teams) })));
    const [drawnTeams, setDrawnTeams] = useState<{ team: { id: string; name: string; }; potName: string; }[]>([]);
    const [currentDrawing, setCurrentDrawing] = useState<{ team: { id: string; name: string; }; potName: string; } | null>(null);
    const [fixture, setFixture] = useState<GenerateFixtureOutput | null>(null);
    const [status, setStatus] = useState<'idle' | 'drawing' | 'assigning' | 'generating' | 'finished'>('idle');
    const { toast } = useToast();

    useEffect(() => {
        // Start the draw process
        const startDraw = async () => {
            const allTeamsToDraw = pots.flatMap(pot => pot.teams.map(team => ({ team, potName: pot.name })));

            for (let i = 0; i < allTeamsToDraw.length; i++) {
                const item = allTeamsToDraw[i];
                setStatus('drawing');
                setCurrentDrawing(item);
                await new Promise(res => setTimeout(res, 2000)); // Time to show the ball

                setStatus('assigning');
                setDrawnTeams(prev => [...prev, item]);
                await new Promise(res => setTimeout(res, 1000)); // Time to see assignment
            }

            setStatus('generating');
            try {
                const finalFixture = await generateFixture({
                    teams: drawnTeams.map(d => d.team),
                    description: `Fixture para ${event.title}`, // Generic description
                    classificationType: event.classification?.type as 'groups' | 'elimination',
                });
                setFixture(finalFixture);
                await update(ref(db, `centers/${centerId}/events/events/${event.id}`), { fixture: finalFixture });
                toast({ title: "¡Sorteo finalizado!", description: "El fixture ha sido generado y guardado." });
                setStatus('finished');
            } catch (e) {
                console.error(e);
                toast({ title: "Error en el sorteo", description: "No se pudo generar el fixture final.", variant: "destructive"});
                setStatus('finished'); // End anyway
            }
        };

        startDraw();

    }, [event, centerId, pots]);

    const getStatusText = () => {
        switch (status) {
            case 'drawing': return `Sacando equipo de ${currentDrawing?.potName}...`;
            case 'assigning': return `Asignando a ${currentDrawing?.team.name}...`;
            case 'generating': return 'Generando el fixture final con IA...';
            case 'finished': return 'Sorteo completado.';
            default: return 'Preparando el sorteo...';
        }
    };

    return (
        <Card className="w-full">
            <CardHeader className="text-center">
                <div className="mx-auto bg-primary/10 text-primary rounded-full p-4 w-fit mb-4">
                   <Trophy className="h-10 w-10" />
                </div>
                <CardTitle>Sorteo en Vivo</CardTitle>
                <CardDescription className="flex items-center justify-center gap-2">
                    {status !== 'finished' && <Loader2 className="animate-spin h-4 w-4"/>}
                    {getStatusText()}
                </CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-8 items-start">
                {/* Pots */}
                <div className="space-y-4">
                    <h3 className="font-semibold text-center">Bombos</h3>
                    <div className="grid grid-cols-2 gap-4">
                    {pots.map(pot => (
                        <div key={pot.id} className="p-3 border rounded-lg">
                            <h4 className="font-bold text-center mb-2">{pot.name}</h4>
                            <div className="space-y-2">
                                {pot.teams.map(team => {
                                    const isDrawn = drawnTeams.some(d => d.team.id === team.id);
                                    return (
                                        <motion.div
                                            key={team.id}
                                            animate={{ opacity: isDrawn ? 0.3 : 1, scale: isDrawn ? 0.9 : 1 }}
                                            className="bg-muted p-2 rounded-md text-sm text-center"
                                        >
                                            {team.name}
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                    </div>
                </div>

                {/* Draw Animation and Result */}
                <div className="flex flex-col items-center justify-center h-full space-y-4">
                    <AnimatePresence>
                    {status === 'drawing' && currentDrawing && (
                         <motion.div
                            key="ball"
                            initial={{ scale: 0, rotate: -360 }}
                            animate={{ scale: 1, rotate: 0 }}
                            exit={{ scale: 0, rotate: 360 }}
                            transition={{ duration: 0.5 }}
                            className="h-32 w-32 rounded-full bg-gray-200 flex items-center justify-center shadow-lg"
                        >
                           <ShieldHalf className="h-16 w-16 text-gray-500"/>
                        </motion.div>
                    )}
                    {status === 'assigning' && currentDrawing && (
                        <motion.div
                            key="paper"
                            initial={{ scale: 0.5, y: -50, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            transition={{ duration: 0.5 }}
                            className="p-6 bg-white border-2 border-primary rounded-lg shadow-2xl"
                        >
                            <p className="text-xl font-bold text-center text-primary">{currentDrawing.team.name}</p>
                        </motion.div>
                    )}
                    </AnimatePresence>
                    
                    <div className="w-full pt-4">
                        <h3 className="font-semibold text-center mb-2">Asignaciones</h3>
                        <div className="space-y-1 text-sm text-muted-foreground max-h-48 overflow-y-auto">
                            {drawnTeams.map(({team, potName}, index) => (
                                <motion.p 
                                    key={team.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.1 * index }}
                                    className="text-center"
                                >
                                    <span className="font-semibold text-foreground">{team.name}</span> (de {potName})
                                </motion.p>
                            ))}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
