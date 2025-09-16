"use client";

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { ref, runTransaction } from 'firebase/database';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { format, isPast } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Clock, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export interface Survey {
    id: string;
    question: string;
    options: { text: string }[];
    authorId: string;
    authorName: string;
    createdAt: string;
    deadline: string;
    votes: { [userId: string]: number }; // userId: optionIndex
}

interface SurveyCardProps {
    survey: Survey;
    centerId: string;
}

export default function SurveyCard({ survey, centerId }: SurveyCardProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [selectedOption, setSelectedOption] = useState<string | undefined>(undefined);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isDeadlinePast = isPast(new Date(survey.deadline));

    useEffect(() => {
        if (user && survey.votes && survey.votes[user.uid] !== undefined) {
            setSelectedOption(String(survey.votes[user.uid]));
        } else {
            setSelectedOption(undefined);
        }
    }, [user, survey.votes]);

    const handleVote = async () => {
        if (!user || selectedOption === undefined) return;
        if(isDeadlinePast) {
            toast({ title: "Encuesta cerrada", description: "La fecha límite para votar ha pasado.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        const surveyRef = ref(db, `centers/${centerId}/surveys/${survey.id}/votes/${user.uid}`);
        
        try {
            await runTransaction(ref(db, `centers/${centerId}/surveys/${survey.id}/votes`), (votes) => {
                 if (!votes) {
                    votes = {};
                }
                votes[user.uid] = parseInt(selectedOption, 10);
                return votes;
            });
            toast({ title: "¡Voto registrado!", description: "Tu voto ha sido guardado correctamente." });
        } catch (error) {
            console.error("Error submitting vote:", error);
            toast({ title: "Error", description: "No se pudo registrar tu voto.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const chartData = useMemo(() => {
        const voteCounts = survey.options.map((_, index) => ({
            name: `Opción ${index + 1}`,
            text: survey.options[index].text,
            votes: 0
        }));

        if (survey.votes) {
            Object.values(survey.votes).forEach(optionIndex => {
                if (voteCounts[optionIndex]) {
                    voteCounts[optionIndex].votes++;
                }
            });
        }
        
        const totalVotes = voteCounts.reduce((sum, item) => sum + item.votes, 0);
        
        return voteCounts.map(item => ({
            ...item,
            percentage: totalVotes > 0 ? (item.votes / totalVotes) * 100 : 0
        }));

    }, [survey.options, survey.votes]);

    const userVoteIndex = user && survey.votes ? survey.votes[user.uid] : -1;

    return (
        <Card className={cn("shadow-md", isDeadlinePast && "bg-muted/50")}>
            <CardHeader>
                <CardTitle>{survey.question}</CardTitle>
                <CardDescription>
                    Creada por {survey.authorName} - {isDeadlinePast ? "Cerrada" : `Cierra el ${format(new Date(survey.deadline), "d 'de' MMMM 'a las' HH:mm", { locale: es })}`}
                </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                    <RadioGroup
                        value={selectedOption}
                        onValueChange={setSelectedOption}
                        disabled={isSubmitting || isDeadlinePast}
                    >
                        {survey.options.map((option, index) => (
                            <Label 
                                key={index} 
                                htmlFor={`${survey.id}-${index}`}
                                className={cn(
                                    "flex items-center space-x-3 border p-4 rounded-md transition-colors cursor-pointer",
                                    !isDeadlinePast && "hover:bg-accent",
                                    selectedOption === String(index) && "bg-primary/10 border-primary",
                                    isDeadlinePast && "cursor-not-allowed"
                                )}
                            >
                                <RadioGroupItem value={String(index)} id={`${survey.id}-${index}`} />
                                <span className="font-medium">{option.text}</span>
                                {userVoteIndex === index && <CheckCircle2 className="h-5 w-5 text-green-600 ml-auto"/>}
                            </Label>
                        ))}
                    </RadioGroup>
                    {!isDeadlinePast && (
                         <Button onClick={handleVote} disabled={isSubmitting || selectedOption === undefined}>
                            {isSubmitting ? "Votando..." : "Votar"}
                        </Button>
                    )}
                </div>
                 <div className="space-y-2">
                    <h4 className="font-semibold">Resultados</h4>
                    <div className="h-64">
                         <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <XAxis type="number" hide />
                                <YAxis type="category" dataKey="text" hide />
                                <Tooltip 
                                    cursor={{fill: 'transparent'}}
                                    content={({ active, payload }) => {
                                      if (active && payload && payload.length) {
                                        return (
                                          <div className="bg-background border shadow-sm rounded-md p-2">
                                            <p className="text-sm font-bold">{`${payload[0].payload.text}`}</p>
                                            <p className="text-sm text-primary">{`${payload[0].payload.votes} votos (${payload[0].value.toFixed(1)}%)`}</p>
                                          </div>
                                        );
                                      }
                                      return null;
                                    }}
                                />
                                <Bar dataKey="percentage" radius={[0, 4, 4, 0]}>
                                     {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={userVoteIndex === index ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.3)"} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </CardContent>
             <CardFooter className="border-t pt-4">
                <div className="flex items-center text-sm text-muted-foreground">
                    <Clock className="mr-2 h-4 w-4" />
                    <span>
                       {isDeadlinePast 
                           ? `La votación finalizó el ${format(new Date(survey.deadline), "d MMM yyyy", { locale: es })}`
                           : `La votación finaliza en ${format(new Date(survey.deadline), "d MMM yyyy", { locale: es })}`
                       }
                    </span>
                </div>
            </CardFooter>
        </Card>
    );
}
