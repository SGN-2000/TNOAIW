"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { ref, get, onValue } from 'firebase/database';
import MainLayout from '@/components/layout/main-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, BookUser, Building, School, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import Loader from '@/components/loader';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface Center {
  id: string;
  centerName: string;
  schoolName: string;
}

export default function HubPage() {
  const { user, profileComplete } = useAuth();
  const [userCenters, setUserCenters] = useState<Center[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      const centersRef = ref(db, 'centers');
      
      const listener = onValue(centersRef, (snapshot) => {
        const centers: Center[] = [];
        if (snapshot.exists()) {
          snapshot.forEach((centerSnapshot) => {
            const centerData = centerSnapshot.val();
            const centerId = centerSnapshot.key;

            if (centerId && centerData.members) {
              const allMemberIds = [
                  centerData.ownerId,
                  ...Object.keys(centerData.members.admins || {}),
                  ...Object.keys(centerData.members.adminsPlus || {}),
                  ...Object.keys(centerData.members.students || {}),
              ];
              if (allMemberIds.includes(user.uid)) {
                centers.push({
                  id: centerId,
                  centerName: centerData.centerName,
                  schoolName: centerData.schoolName,
                });
              }
            }
          });
        }
        setUserCenters(centers);
        setLoading(false);
      }, (error) => {
        console.error("Error fetching user centers:", error);
        setLoading(false);
      });

      return () => {
        // Detach the listener when the component unmounts
        //off(centersRef, 'value', listener);
      };

    } else {
        setLoading(false);
    }
  }, [user]);

  return (
    <MainLayout>
      <div className="flex-1 w-full">
        <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-foreground font-headline">Bienvenido a Wiaont</h1>
            <p className="text-muted-foreground mt-2">Tu lugar central para actividades y comunidades estudiantiles.</p>
          </header>
          
          {user && profileComplete === false && (
            <Alert variant="destructive" className="mb-8">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>¡Completa tu perfil!</AlertTitle>
              <AlertDescription>
                Para crear o unirte a un centro, primero debes completar tu información de perfil. 
                <Button variant="link" asChild className="p-0 h-auto ml-1">
                  <Link href="/profile">Ir al perfil</Link>
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2">
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle>Tus Centros de Estudiantes</CardTitle>
                  <CardDescription>Centros que has creado o a los que te has unido.</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex justify-center items-center py-12">
                      <Loader />
                    </div>
                  ) : userCenters.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {userCenters.map((center) => (
                        <Link key={center.id} href={`/center/${center.id}`} passHref>
                          <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full flex flex-col">
                            <CardHeader className="flex-grow">
                                <div className="flex items-start gap-4">
                                     <div className="bg-primary text-primary-foreground rounded-lg p-3">
                                        <Building className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg leading-tight">{center.centerName}</CardTitle>
                                        <CardDescription className="mt-1 text-xs flex items-center gap-1.5">
                                            <School className="h-3 w-3"/>
                                            {center.schoolName}
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 border-2 border-dashed rounded-lg">
                      <p className="text-muted-foreground">Aún no te has unido a ningún centro de estudiantes.</p>
                      <p className="text-sm text-muted-foreground mt-1">¡Crea o únete a uno para empezar!</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            <div className="space-y-8">
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle>Comenzar</CardTitle>
                  <CardDescription>¿Listo para empezar?</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col space-y-4">
                  <Button asChild disabled={profileComplete === false}>
                    <Link href="/create-center">
                      <Plus className="mr-2 h-4 w-4" /> Crear un Nuevo Centro
                    </Link>
                  </Button>
                  <Button asChild variant="secondary" disabled={profileComplete === false}>
                     <Link href="/join-center">
                        <BookUser className="mr-2 h-4 w-4" /> Unirse a uno Existente
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
