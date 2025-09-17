
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { GenerateFixtureOutput, Group, Match } from '@/ai/flows/generate-fixture-flow';
import { Swords, Trophy, AlertTriangle, Calendar, Clock, MapPin } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useState, useMemo } from 'react';
import { ref, update } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const scoreSchema = z.object({
  score1: z.coerce.number().int().min(0),
  score2: z.coerce.number().int().min(0),
});

interface ScoreEditorProps {
    match: Match;
    roundName: string;
    centerId: string;
    eventId: string;
    onClose: () => void;
}

const ScoreEditor = ({ match, roundName, centerId, eventId, onClose }: ScoreEditorProps) => {
    const { toast } = useToast();
    const { user } = useAuth();
    const form = useForm<z.infer<typeof scoreSchema>>({
        resolver: zodResolver(scoreSchema),
        defaultValues: {
            score1: match.score1 ?? 0,
            score2: match.score2 ?? 0,
        },
    });

    const onSubmit = async (data: z.infer<typeof scoreSchema>) => {
        if (!user) return;
        
        // This is a complex path to update, be very careful
        const eventRef = ref(db, `centers/${centerId}/events/events/${eventId}`);
        // TODO: Find the correct path to the match to update it.
        // This is complex as it can be in groups or knockout rounds.
        // For now, let's just show a toast.
        toast({ title: "Funcionalidad en desarrollo", description: "El guardado de resultados estará disponible pronto."});
        onClose();
    };

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4 items-center">
                 <div className="space-y-2 text-center">
                    <label className="font-semibold">{match.team1?.name || match.team1Placeholder}</label>
                    <Input type="number" {...form.register('score1')} className="text-center text-2xl font-bold h-12" />
                </div>
                 <div className="space-y-2 text-center">
                    <label className="font-semibold">{match.team2?.name || match.team2Placeholder}</label>
                    <Input type="number" {...form.register('score2')} className="text-center text-2xl font-bold h-12" />
                </div>
            </div>
            <div className="flex justify-end">
                <Button type="submit">Guardar Resultado</Button>
            </div>
        </form>
    )
}

const calculateStandings = (group: Group) => {
  const stats: { [teamId: string]: { name: string; pj: number; g: number; e: number; p: number; gf: number; gc: number; dg: number; pts: number } } = {};

  group.teams.forEach(team => {
    stats[team.id] = { name: team.name, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, dg: 0, pts: 0 };
  });

  group.matches.forEach(match => {
    if (match.score1 === undefined || match.score2 === undefined || !match.team1 || !match.team2) {
      return; // Skip unfinished matches
    }

    const { team1, team2, score1, score2 } = match;

    // Update played games
    stats[team1.id].pj++;
    stats[team2.id].pj++;

    // Update goals
    stats[team1.id].gf += score1;
    stats[team1.id].gc += score2;
    stats[team2.id].gf += score2;
    stats[team2.id].gc += score1;

    // Update points and W-D-L
    if (score1 > score2) { // Team 1 wins
      stats[team1.id].pts += 3;
      stats[team1.id].g++;
      stats[team2.id].p++;
    } else if (score2 > score1) { // Team 2 wins
      stats[team2.id].pts += 3;
      stats[team2.id].g++;
      stats[team1.id].p++;
    } else { // Draw
      stats[team1.id].pts += 1;
      stats[team2.id].pts += 1;
      stats[team1.id].e++;
      stats[team2.id].e++;
    }
  });

  // Calculate goal difference and sort
  return Object.values(stats)
    .map(teamStats => ({ ...teamStats, dg: teamStats.gf - teamStats.gc }))
    .sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.dg !== a.dg) return b.dg - a.dg;
      if (b.gf !== a.gf) return b.gf - a.gf;
      return a.name.localeCompare(b.name);
    });
};

const renderMatchCard = (match: Match) => (
    <Card key={match.id} className="shadow-sm">
        <CardContent className="p-3">
            <div className="flex items-center justify-between text-sm">
                <div className="font-medium text-right flex-1">{match.team1?.name || match.team1Placeholder || 'N/A'}</div>
                <Dialog>
                    <DialogTrigger asChild>
                        <div className="px-3 text-center cursor-pointer">
                            {match.score1 !== undefined && match.score2 !== undefined ? (
                                <div className="font-bold">{match.score1} - {match.score2}</div>
                            ) : (
                                <div className="text-xs text-muted-foreground"><Swords size={16}/></div>
                            )}
                        </div>
                    </DialogTrigger>
                    <DialogContent>
                        <ScoreEditor match={match} roundName="" centerId={""} eventId={""} onClose={() => {}} />
                    </DialogContent>
                </Dialog>
                <div className="font-medium text-left flex-1">{match.team2?.name || match.team2Placeholder || 'N/A'}</div>
            </div>
            {(match.date || match.time || match.location) && (
                 <div className="flex items-center justify-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground border-t pt-2 flex-wrap">
                    {match.date && <div className="flex items-center gap-1"><Calendar className="h-3 w-3"/>{format(new Date(match.date), "dd/MM/yy")}</div>}
                    {match.time && <div className="flex items-center gap-1"><Clock className="h-3 w-3"/>{match.time}</div>}
                    {match.location && <div className="flex items-center gap-1"><MapPin className="h-3 w-3"/>{match.location}</div>}
                 </div>
            )}
        </CardContent>
    </Card>
)

const GroupTable = ({ group }: { group: Group }) => {
    const standings = useMemo(() => calculateStandings(group), [group]);
    
    return (
        <div>
            <h4 className="font-semibold mb-2">{group.name}</h4>
            <div className="border rounded-lg overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="px-2">Equipo</TableHead>
                            <TableHead className="text-center px-1">Pts</TableHead>
                            <TableHead className="text-center px-1">PJ</TableHead>
                            <TableHead className="text-center px-1">G</TableHead>
                            <TableHead className="text-center px-1">E</TableHead>
                            <TableHead className="text-center px-1">P</TableHead>
                            <TableHead className="text-center px-1">DG</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {standings.map(team => (
                            <TableRow key={team.name}>
                                <TableCell className="font-medium px-2">{team.name}</TableCell>
                                <TableCell className="font-bold text-center px-1">{team.pts}</TableCell>
                                <TableCell className="text-center px-1">{team.pj}</TableCell>
                                <TableCell className="text-center px-1">{team.g}</TableCell>
                                <TableCell className="text-center px-1">{team.e}</TableCell>
                                <TableCell className="text-center px-1">{team.p}</TableCell>
                                <TableCell className="text-center px-1">{team.dg}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
             <div className="mt-4 space-y-2">
                {group.matches.map((match) => renderMatchCard(match))}
            </div>
        </div>
    );
};


interface FixtureDisplayProps {
  fixture: GenerateFixtureOutput;
  centerId: string;
  eventId: string;
}

export default function FixtureDisplay({ fixture, centerId, eventId }: FixtureDisplayProps) {
  const { groups, knockoutRounds } = fixture;

  const renderMatch = (match: Match, roundName: string) => (
    <Card key={match.id} className="shadow-sm">
        <CardContent className="p-4 flex items-center justify-between">
            <div className="text-sm font-medium text-right flex-1">{match.team1?.name || match.team1Placeholder || 'N/A'}</div>
            
            <Dialog>
                <DialogTrigger asChild>
                     <div className="px-4 text-center cursor-pointer">
                        {match.score1 !== undefined && match.score2 !== undefined ? (
                            <div className="font-bold text-lg">{match.score1} - {match.score2}</div>
                        ) : (
                            <div className="text-xs text-muted-foreground"><Swords /></div>
                        )}
                    </div>
                </DialogTrigger>
                <DialogContent>
                    <ScoreEditor match={match} roundName={roundName} centerId={centerId} eventId={eventId} onClose={() => {}} />
                </DialogContent>
            </Dialog>

            <div className="text-sm font-medium text-left flex-1">{match.team2?.name || match.team2Placeholder || 'N/A'}</div>
        </CardContent>
    </Card>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Trophy /> Fixture del Torneo</CardTitle>
        <CardDescription>Estructura de grupos y partidos del evento.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
                Se está trabajando en este apartado, las funciones son limitadas.
            </AlertDescription>
        </Alert>

        {/* Group Stage */}
        {groups && groups.length > 0 && (
          <div className="space-y-6">
            <h3 className="text-xl font-bold">Fase de Grupos</h3>
            <div className="grid md:grid-cols-2 gap-6">
              {groups.map((group) => (
                <GroupTable key={group.name} group={group} />
              ))}
            </div>
          </div>
        )}

        {/* Knockout Stage */}
        {knockoutRounds && knockoutRounds.length > 0 && (
          <div className="space-y-6">
            <Separator />
            <h3 className="text-xl font-bold">Fase Eliminatoria</h3>
            <div className="space-y-8">
              {knockoutRounds.map((round) => (
                <div key={round.name}>
                  <h4 className="font-semibold text-lg mb-4 text-center">{round.name}</h4>
                  <div className="space-y-4 max-w-2xl mx-auto">
                    {round.matches.map((match) => renderMatchCard(match))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
