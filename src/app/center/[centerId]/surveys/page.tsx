"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ref, onValue, off } from 'firebase/database';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import Loader from '@/components/loader';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { BarChart2, PlusCircle } from 'lucide-react';
import SurveyCard, { Survey } from '@/components/center/surveys/survey-card';
import CreateSurveyForm from '@/components/center/surveys/create-survey-form';

export default function SurveysPage() {
    const [surveys, setSurveys] = useState<Survey[]>([]);
    const [userRole, setUserRole] = useState<'owner' | 'admin-plus' | 'admin' | 'student' | null>(null);
    const [loading, setLoading] = useState(true);
    const [isCreateSurveyOpen, setCreateSurveyOpen] = useState(false);
    
    const { user } = useAuth();
    const params = useParams();
    const centerId = Array.isArray(params.centerId) ? params.centerId[0] : params.centerId;

    useEffect(() => {
        if (!centerId || !user) return;

        const centerRef = ref(db, `centers/${centerId}`);
        const listener = onValue(centerRef, (snapshot) => {
            const centerData = snapshot.val();
            if (centerData) {
                if (user.uid === centerData.ownerId) {
                    setUserRole('owner');
                } else if (centerData.members.adminsPlus && centerData.members.adminsPlus[user.uid]) {
                    setUserRole('admin-plus');
                } else if (centerData.members.admins && centerData.members.admins[user.uid]) {
                    setUserRole('admin');
                } else {
                    setUserRole('student');
                }
            }
        });

        return () => off(centerRef, 'value', listener);
    }, [centerId, user]);

    useEffect(() => {
        if (centerId) {
            const surveysRef = ref(db, `centers/${centerId}/surveys`);
            const listener = onValue(surveysRef, (snapshot) => {
                const surveysData = snapshot.val();
                const surveysList: Survey[] = surveysData
                    ? Object.keys(surveysData)
                        .map(key => ({ id: key, ...surveysData[key] }))
                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    : [];
                setSurveys(surveysList);
                setLoading(false);
            });

            return () => off(surveysRef, 'value', listener);
        }
    }, [centerId]);

    const canCreateSurvey = userRole === 'admin' || userRole === 'admin-plus' || userRole === 'owner';

    if (loading || !userRole) {
        return <div className="flex flex-1 justify-center items-center p-4"><Loader /></div>;
    }

    return (
        <div className="flex-1 space-y-8 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Encuestas</h2>
                {canCreateSurvey && (
                    <Dialog open={isCreateSurveyOpen} onOpenChange={setCreateSurveyOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Crear Encuesta
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[625px]">
                            <DialogHeader>
                                <DialogTitle>Crear Nueva Encuesta</DialogTitle>
                            </DialogHeader>
                            <CreateSurveyForm centerId={centerId as string} onSurveyCreated={() => setCreateSurveyOpen(false)} />
                        </DialogContent>
                    </Dialog>
                )}
            </div>
             <p className="text-muted-foreground">
                Participa en las decisiones del centro o crea nuevas consultas si eres administrador.
            </p>

            <div className="space-y-6">
                {surveys.length > 0 ? (
                    surveys.map(survey => (
                        <SurveyCard key={survey.id} survey={survey} centerId={centerId as string} />
                    ))
                ) : (
                    <div className="text-center py-16 border-2 border-dashed rounded-lg">
                        <div className="flex justify-center items-center mb-4">
                            <BarChart2 className="h-12 w-12 text-muted-foreground" />
                        </div>
                        <h3 className="text-xl font-semibold">No hay encuestas activas</h3>
                        <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                            {canCreateSurvey 
                                ? '¡Sé el primero en crear una encuesta y conocer la opinión de la comunidad!' 
                                : 'Cuando un administrador cree una encuesta, la verás aquí.'
                            }
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
