"use client"

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ref, onValue, off, get, set, child } from 'firebase/database';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import Loader from '@/components/loader';
import ScoresTable from '@/components/center/competitions/scores-table';
import PermissionsManager from '@/components/center/competitions/permissions-manager';
import ScoreEditor from '@/components/center/competitions/score-editor';
import ScoreHistory from '@/components/center/competitions/score-history';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Trophy, Edit, Users } from 'lucide-react';
import type { Competition, Score, Manager, LogEntry } from '@/components/center/competitions/types';

const initializeCompetitionData = async (centerId: string, courses: {name: string}[]) => {
  const competitionRef = ref(db, `centers/${centerId}/competition`);
  const snapshot = await get(competitionRef);
  if (!snapshot.exists()) {
    const initialScores = courses.reduce((acc, course) => {
      acc[course.name] = 0;
      return acc;
    }, {} as { [key: string]: number });

    await set(competitionRef, {
      scores: initialScores,
      permissions: {
        adminsPlusAllowed: false,
        managers: {},
      },
      log: {},
    });
  }
};

export default function CompetitionsPage() {
  const [competitionData, setCompetitionData] = useState<Competition | null>(null);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [userRole, setUserRole] = useState<'owner' | 'admin-plus' | 'admin' | 'student' | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditorOpen, setEditorOpen] = useState(false);
  const [isPermissionsOpen, setPermissionsOpen] = useState(false);

  const { user } = useAuth();
  const params = useParams();
  const centerId = Array.isArray(params.centerId) ? params.centerId[0] : params.centerId;

  useEffect(() => {
    if (!centerId || !user) return;

    const centerRef = ref(db, `centers/${centerId}`);
    const competitionRef = ref(db, `centers/${centerId}/competition`);

    const fetchData = async () => {
      setLoading(true);
      const centerSnap = await get(centerRef);
      if (!centerSnap.exists()) {
        setLoading(false);
        return;
      }

      const centerData = centerSnap.val();
      
      // Initialize competition if it doesn't exist
      await initializeCompetitionData(centerId, centerData.courses || []);

      // Determine user role
      if (user.uid === centerData.ownerId) setUserRole('owner');
      else if (centerData.members.adminsPlus && centerData.members.adminsPlus[user.uid]) setUserRole('admin-plus');
      else if (centerData.members.admins && centerData.members.admins[user.uid]) setUserRole('admin');
      else setUserRole('student');

      // Listen for competition data changes
      const competitionListener = onValue(competitionRef, (snapshot) => {
        setCompetitionData(snapshot.val());
      });
      
      // Fetch potential managers
      const adminIds = Object.keys(centerData.members.admins || {});
      const adminPlusIds = Object.keys(centerData.members.adminsPlus || {});
      const potentialManagerIds = [...new Set([...adminIds, ...adminPlusIds])];
      
      const managerPromises = potentialManagerIds.map(async (id) => {
        const userSnap = await get(child(ref(db, 'users'), id));
        if (userSnap.exists()) {
          const userData = userSnap.val();
          return {
            id,
            name: `${userData.name} ${userData.surname}`,
            username: userData.username,
            role: adminPlusIds.includes(id) ? 'admin-plus' : 'admin'
          };
        }
        return null;
      });

      const resolvedManagers = (await Promise.all(managerPromises)).filter(Boolean) as Manager[];
      setManagers(resolvedManagers);
      setLoading(false);

      return () => {
        off(competitionRef, 'value', competitionListener);
      };
    };

    let cleanup: (() => void) | undefined;
    fetchData().then(c => { cleanup = c; });

    return () => cleanup?.();

  }, [centerId, user]);
  
  const scores: Score[] = competitionData?.scores 
    ? Object.entries(competitionData.scores).map(([course, points]) => ({ course, points }))
    : [];

  const canManageScores = userRole === 'owner' || (userRole === 'admin-plus' && competitionData?.permissions.adminsPlusAllowed && competitionData?.permissions.managers && user && competitionData.permissions.managers[user.uid]) || (competitionData?.permissions.managers && user && competitionData.permissions.managers[user.uid]);
  
  const logEntries: LogEntry[] = competitionData?.log
    ? Object.values(competitionData.log)
    : [];

  if (loading) {
    return <div className="flex flex-1 justify-center items-center p-4"><Loader /></div>;
  }
  
  if (!competitionData) {
     return <div className="flex flex-1 justify-center items-center p-4">Inicializando competencia...</div>;
  }

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Trophy className="h-8 w-8" />
          Competencia Intercursos
        </h2>
        <div className="flex gap-2">
          {canManageScores && (
            <Dialog open={isEditorOpen} onOpenChange={setEditorOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Edit className="mr-2 h-4 w-4" />
                  Modificar Puntos
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Editor de Puntuaciones</DialogTitle>
                </DialogHeader>
                <ScoreEditor 
                  scores={scores} 
                  centerId={centerId} 
                  onUpdate={() => setEditorOpen(false)}
                />
              </DialogContent>
            </Dialog>
          )}
          {userRole === 'owner' && (
             <Dialog open={isPermissionsOpen} onOpenChange={setPermissionsOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Users className="mr-2 h-4 w-4" />
                  Designar Gestores
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Gestión de Permisos</DialogTitle>
                  <DialogDescription>Elige quién puede modificar las puntuaciones.</DialogDescription>
                </DialogHeader>
                <PermissionsManager 
                  centerId={centerId} 
                  permissions={competitionData.permissions}
                  potentialManagers={managers}
                  onSave={() => setPermissionsOpen(false)}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
      <p className="text-muted-foreground">
        Sigue la tabla de posiciones de la competencia y gestiona los puntos.
      </p>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Tabla de Posiciones</CardTitle>
              <CardDescription>Puntuación actual de cada curso.</CardDescription>
            </CardHeader>
            <CardContent>
              <ScoresTable scores={scores} />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-8">
           <ScoreHistory centerId={centerId} log={logEntries} />
        </div>
      </div>
    </div>
  );
}
