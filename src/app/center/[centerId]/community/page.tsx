"use client"

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ref, get, child, onValue, off, update, push, set } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import Loader from '@/components/loader';
import MemberCard from '@/components/center/member-card';
import { useToast } from '@/hooks/use-toast';
import { Crown, Shield, User, ShieldCheck } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export interface Member {
  id: string;
  role: 'owner' | 'admin-plus' | 'admin' | 'student';
  profile: {
    username: string;
    name: string;
    surname: string;
    photoURL?: string;
  };
  centerProfile: {
    course: string;
    documentNumber?: string;
  }
}

type DialogState = {
  isOpen: boolean;
  title: string;
  description: string;
  onConfirm: () => void;
}

const roleOrder = { owner: 0, 'admin-plus': 1, admin: 2, student: 3 };

export default function CommunityPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [centerName, setCenterName] = useState("");
  const [currentUserRole, setCurrentUserRole] = useState<'owner' | 'admin-plus' | 'admin' | 'student' | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogState, setDialogState] = useState<DialogState>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });

  const { user } = useAuth();
  const params = useParams();
  const centerId = Array.isArray(params.centerId) ? params.centerId[0] : params.centerId;
  const { toast } = useToast();

  useEffect(() => {
    if (!centerId || !user) return;

    const centerRef = ref(db, `centers/${centerId}`);
    const listener = onValue(centerRef, async (snapshot) => {
      if (!snapshot.exists()) {
        setLoading(false);
        return;
      }
      
      const centerData = snapshot.val();
      setCenterName(centerData.centerName || "");
      const ownerId = centerData.ownerId;
      const adminsPlus = centerData.members.adminsPlus || {};
      const admins = centerData.members.admins || {};
      const students = centerData.members.students || {};

      // Determine current user's role
      if (user.uid === ownerId) {
        setCurrentUserRole('owner');
      } else if (adminsPlus[user.uid]) {
        setCurrentUserRole('admin-plus');
      } else if (admins[user.uid]) {
        setCurrentUserRole('admin');
      } else {
        setCurrentUserRole('student');
      }

      const allMemberIds = [
        ownerId,
        ...Object.keys(adminsPlus),
        ...Object.keys(admins),
        ...Object.keys(students),
      ];
      const uniqueMemberIds = [...new Set(allMemberIds)];

      const memberPromises = uniqueMemberIds.map(async (uid) => {
        const userProfileSnap = await get(child(ref(db), `users/${uid}`));
        const centerProfileSnap = await get(child(ref(db), `userProfilesInCenter/${centerId}/${uid}`));
        
        let role: Member['role'] = 'student';
        if (uid === ownerId) role = 'owner';
        else if (adminsPlus[uid]) role = 'admin-plus';
        else if (admins[uid]) role = 'admin';

        if (userProfileSnap.exists()) {
          const userProfile = userProfileSnap.val();
          return {
            id: uid,
            role,
            profile: {
                username: userProfile.username || 'N/A',
                name: userProfile.name || '',
                surname: userProfile.surname || '',
                photoURL: userProfile.photoURL,
            },
            centerProfile: centerProfileSnap.exists() ? centerProfileSnap.val() : { course: 'N/A' },
          };
        }
        return null;
      });

      const resolvedMembers = (await Promise.all(memberPromises)).filter(Boolean) as Member[];
      
      resolvedMembers.sort((a, b) => roleOrder[a.role] - roleOrder[b.role]);
      
      setMembers(resolvedMembers);
      setLoading(false);
    });

    return () => off(centerRef, 'value', listener);
  }, [centerId, user]);

  const handleRoleChange = (memberId: string, newRole: 'admin-plus' | 'admin' | 'student') => {
    const member = members.find(m => m.id === memberId);
    if (!member) return;

    const onConfirm = async () => {
      const updates: { [key: string]: any } = {};
      const oldRole = member.role;

      // Clear all possible old roles
      updates[`/centers/${centerId}/members/adminsPlus/${memberId}`] = null;
      updates[`/centers/${centerId}/members/admins/${memberId}`] = null;
      updates[`/centers/${centerId}/members/students/${memberId}`] = null;
      
      // Set new role
      if (newRole === 'admin-plus') {
        updates[`/centers/${centerId}/members/adminsPlus/${memberId}`] = true;
      } else if (newRole === 'admin') {
        updates[`/centers/${centerId}/members/admins/${memberId}`] = true;
      } else { // student
        updates[`/centers/${centerId}/members/students/${memberId}`] = true;
      }

      try {
        await update(ref(db), updates);

        // Send notification to the user whose role was changed
        const notifRef = push(ref(db, `notifications/${memberId}`));
        await set(notifRef, {
            type: 'ROLE_CHANGED',
            centerId: centerId,
            centerName: centerName,
            newRole: newRole,
            timestamp: new Date().toISOString(),
            read: false,
        });

        toast({ title: "Rol actualizado", description: `El rol de ${member.profile.name} ha sido cambiado.` });
      } catch (error) {
        toast({ title: "Error", description: "No se pudo actualizar el rol.", variant: "destructive" });
      }
    };
    
    setDialogState({
      isOpen: true,
      title: 'Confirmar Cambio de Rol',
      description: `¿Estás seguro de que quieres cambiar el rol de ${member.profile.name} a ${newRole}?`,
      onConfirm
    });
  };

  const handleKickMember = (memberId: string) => {
     const member = members.find(m => m.id === memberId);
     if (!member) return;

     const onConfirm = async () => {
        const updates: { [key: string]: any } = {};
        updates[`/centers/${centerId}/members/adminsPlus/${memberId}`] = null;
        updates[`/centers/${centerId}/members/admins/${memberId}`] = null;
        updates[`/centers/${centerId}/members/students/${memberId}`] = null;
        updates[`/userProfilesInCenter/${centerId}/${memberId}`] = null;
        
        try {
            await update(ref(db), updates);
            
            // Send notification to the kicked user
            const newsRef = ref(db, `news/${memberId}`);
            const newNewsRef = push(newsRef);
            await set(newNewsRef, {
                type: 'EXPULSION',
                centerName: centerName,
                timestamp: new Date().toISOString(),
                read: false,
            });

            toast({ title: "Miembro expulsado", description: `${member.profile.name} ha sido eliminado del centro.` });
        } catch (error) {
            toast({ title: "Error", description: "No se pudo expulsar al miembro.", variant: "destructive" });
        }
     };

     setDialogState({
        isOpen: true,
        title: 'Confirmar Expulsión',
        description: `¿Estás seguro de que quieres expulsar a ${member.profile.name} del centro? Esta acción no se puede deshacer.`,
        onConfirm
     });
  };

  const renderSection = (title: string, role: Member['role'], Icon: React.ElementType) => {
    const filteredMembers = members.filter(m => m.role === role);
    if (filteredMembers.length === 0) return null;
    return (
      <div className="space-y-4">
        <h3 className="text-xl font-bold flex items-center gap-2 text-muted-foreground">
          <Icon className="h-5 w-5" />
          {title} ({filteredMembers.length})
        </h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredMembers.map(member => (
            <MemberCard 
              key={member.id} 
              member={member} 
              currentUserRole={currentUserRole}
              onRoleChange={handleRoleChange}
              onKick={handleKickMember}
            />
          ))}
        </div>
      </div>
    );
  }

  const renderStudentSections = () => {
    const students = members.filter(m => m.role === 'student');
    if (students.length === 0) return null;

    const studentsByCourse: { [course: string]: Member[] } = students.reduce((acc, student) => {
        const courseName = student.centerProfile.course || 'Sin curso asignado';
        if (!acc[courseName]) {
            acc[courseName] = [];
        }
        acc[courseName].push(student);
        return acc;
    }, {} as { [course: string]: Member[] });

    const sortedCourses = Object.keys(studentsByCourse).sort();

    return (
        <div className="space-y-8">
             <h3 className="text-xl font-bold flex items-center gap-2 text-muted-foreground">
              <User className="h-5 w-5" />
              Estudiantes ({students.length})
            </h3>
            {sortedCourses.map(course => (
                 <div key={course} className="space-y-4 ml-4">
                    <h4 className="font-semibold text-lg">{course} ({studentsByCourse[course].length})</h4>
                     <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {studentsByCourse[course].map(member => (
                             <MemberCard 
                                key={member.id} 
                                member={member} 
                                currentUserRole={currentUserRole}
                                onRoleChange={handleRoleChange}
                                onKick={handleKickMember}
                            />
                        ))}
                    </div>
                 </div>
            ))}
        </div>
    );
  }

  if (loading) {
    return <div className="flex flex-1 justify-center items-center p-4"><Loader /></div>;
  }

  return (
    <>
      <div className="flex-1 space-y-8 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Comunidad</h2>
        </div>
        <p className="text-muted-foreground">
          Gestiona los miembros y sus roles dentro de tu centro de estudiantes.
        </p>

        <div className="space-y-8">
          {renderSection('Propietario', 'owner', Crown)}
          {renderSection('Administradores Plus', 'admin-plus', ShieldCheck)}
          {renderSection('Administradores', 'admin', Shield)}
          {renderStudentSections()}
        </div>
      </div>
      
       <AlertDialog open={dialogState.isOpen} onOpenChange={(open) => setDialogState(s => ({ ...s, isOpen: open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialogState.title}</AlertDialogTitle>
            <AlertDialogDescription>{dialogState.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={dialogState.onConfirm}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
