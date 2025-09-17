"use client"

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ref, get, child, update, push, set, remove } from 'firebase/database';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import Loader from '@/components/loader';
import { Copy, Shield, User, Ticket, LogOut, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CenterData {
  codes: {
    admin: string;
    student: string;
    secondary?: string;
  };
  members: {
    ownerId: string;
    admins: { [key: string]: boolean };
    adminsPlus: { [key: string]: boolean };
    students: { [key: string]: boolean };
  };
  centerName: string;
}

const CodeCard = ({ title, code, icon: Icon }: { title: string; code: string; icon: React.ElementType }) => {
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    toast({
      title: '¡Copiado!',
      description: `El código de ${title.toLowerCase()} ha sido copiado al portapapeles.`,
    });
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Icon className="h-6 w-6 text-primary" />
          <CardTitle className="text-xl">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2">
          <Input readOnly value={code} className="font-mono text-sm" />
          <Button variant="outline" size="icon" onClick={handleCopy} aria-label={`Copiar código de ${title}`}>
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};


export default function InvitePage() {
  const [centerData, setCenterData] = useState<CenterData | null>(null);
  const [userRole, setUserRole] = useState<'owner' | 'admin-plus' | 'admin' | 'student' | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogContent, setDialogContent] = useState({ title: "", description: "", onConfirm: () => {} });

  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const centerId = Array.isArray(params.centerId) ? params.centerId[0] : params.centerId;
  const { toast } = useToast();

  useEffect(() => {
    if (centerId && user) {
      const centerRef = child(ref(db), `centers/${centerId}`);
      get(centerRef).then((snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val() as CenterData;
          setCenterData(data);
          
          if (data.ownerId === user.uid) {
            setUserRole('owner');
          } else if (data.members.adminsPlus && data.members.adminsPlus[user.uid]) {
            setUserRole('admin-plus');
          } else if (data.members.admins && data.members.admins[user.uid]) {
            setUserRole('admin');
          } else {
            setUserRole('student');
          }

        } else {
          console.error("Center not found");
        }
      }).catch(error => {
        console.error("Error fetching center data:", error);
      }).finally(() => {
        setLoading(false);
      });
    }
  }, [centerId, user]);
  
  const handleLeaveCenter = () => {
    if (!user || !centerId || !centerData) return;

    const onConfirm = async () => {
        const updates: { [key: string]: any } = {};
        updates[`/centers/${centerId}/members/adminsPlus/${user.uid}`] = null;
        updates[`/centers/${centerId}/members/admins/${user.uid}`] = null;
        updates[`/centers/${centerId}/members/students/${user.uid}`] = null;
        updates[`/userProfilesInCenter/${centerId}/${user.uid}`] = null;

        try {
            await update(ref(db), updates);
            toast({
                title: "Has salido del centro",
                description: `Ya no eres miembro de ${centerData.centerName}.`
            });
            router.push('/');
        } catch (error) {
            toast({ title: "Error", description: "No se pudo procesar tu salida.", variant: "destructive" });
        }
    };

    setDialogContent({
      title: "Confirmar Salida",
      description: `¿Estás seguro de que quieres abandonar el centro "${centerData.centerName}"?`,
      onConfirm: onConfirm
    });
    setDialogOpen(true);
  };
  
  const handleDeleteCenter = () => {
    if (!user || !centerId || !centerData) return;
    
    const onConfirm = async () => {
      // 1. Get all members to notify them
      const allMemberIds = [
        centerData.ownerId,
        ...Object.keys(centerData.members.adminsPlus || {}),
        ...Object.keys(centerData.members.admins || {}),
        ...Object.keys(centerData.members.students || {}),
      ];
      const uniqueMemberIds = [...new Set(allMemberIds)];

      // 2. Prepare notifications for all members
      const newsUpdates: { [key: string]: any } = {};
      uniqueMemberIds.forEach(memberId => {
        const newNewsRef = push(ref(db, `news/${memberId}`));
        newsUpdates[newNewsRef.key!] = {
            type: 'CENTER_DELETED',
            centerName: centerData.centerName,
            timestamp: new Date().toISOString(),
            read: false,
        };
      });

      try {
        // 3. Delete center and related data
        const updates: { [key: string]: any } = {};
        updates[`/centers/${centerId}`] = null;
        updates[`/userProfilesInCenter/${centerId}`] = null;
        // Don't delete news, add to it
        await update(ref(db), { ...updates, ...newsUpdates });

        toast({
            title: "Centro Eliminado",
            description: `El centro "${centerData.centerName}" ha sido eliminado permanentemente.`
        });
        router.push('/');
      } catch (error) {
          console.error("Error deleting center:", error);
          toast({ title: "Error", description: "No se pudo eliminar el centro.", variant: "destructive" });
      }
    };

    setDialogContent({
      title: "Confirmar Eliminación",
      description: `¿Estás seguro de que quieres eliminar "${centerData.centerName}"? Esta acción es irreversible y eliminará todos los datos asociados.`,
      onConfirm: onConfirm
    });
    setDialogOpen(true);
  };


  if (loading || !centerData || !userRole) {
    return (
      <div className="flex flex-1 justify-center items-center p-4">
        <Loader />
      </div>
    );
  }

  const isAdminOrOwner = userRole === 'admin' || userRole === 'admin-plus' || userRole === 'owner';

  return (
    <>
      <div className="flex-1 space-y-8 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Invitar a Miembros</h2>
        </div>
        
        <p className="text-muted-foreground">
          Comparte estos códigos para que otros puedan unirse a tu centro de estudiantes. La visibilidad de los códigos depende de tu rol.
        </p>

        <div className="space-y-6 max-w-2xl mx-auto">
          {isAdminOrOwner && (
            <CodeCard title="Administrador" code={centerData.codes.admin} icon={Shield} />
          )}
        
          <CodeCard title="Estudiante" code={centerData.codes.student} icon={User} />

          {centerData.codes.secondary && (
            <CodeCard title="Acceso Secundario" code={centerData.codes.secondary} icon={Ticket} />
          )}
        </div>

        <div className="max-w-2xl mx-auto pt-8">
            <h3 className="text-lg font-semibold text-destructive">Zona de Peligro</h3>
            <Card className="mt-2 border-destructive">
                <CardContent className="pt-6">
                    {userRole === 'owner' ? (
                         <div className="flex justify-between items-center">
                            <div>
                                <h4 className="font-semibold">Eliminar Centro</h4>
                                <p className="text-sm text-muted-foreground">Esta acción es permanente y eliminará todo el contenido.</p>
                            </div>
                            <Button variant="destructive" onClick={handleDeleteCenter}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar
                            </Button>
                        </div>
                    ) : (
                         <div className="flex justify-between items-center">
                            <div>
                                <h4 className="font-semibold">Salir del Centro</h4>
                                <p className="text-sm text-muted-foreground">Dejarás de ser miembro de este centro.</p>
                            </div>
                            <Button variant="destructive" onClick={handleLeaveCenter}>
                                <LogOut className="mr-2 h-4 w-4" />
                                Salir
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
      </div>
       <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialogContent.title}</AlertDialogTitle>
            <AlertDialogDescription>{dialogContent.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={dialogContent.onConfirm}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
