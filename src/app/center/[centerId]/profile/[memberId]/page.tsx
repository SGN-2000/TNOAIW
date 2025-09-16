"use client"

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ref, get, child } from "firebase/database";
import { db } from "@/lib/firebase";
import Loader from "@/components/loader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Crown, ShieldCheck, Shield, User, GraduationCap, Calendar, AtSign } from "lucide-react";

interface MemberProfile {
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
    };
    center: {
        ownerId: string;
        members: {
             admins: { [key: string]: boolean };
             adminsPlus: { [key: string]: boolean };
        }
    }
}

const roleConfig = {
  owner: { label: "Propietario", icon: Crown, color: "bg-yellow-500 text-white" },
  'admin-plus': { label: "Admin Plus", icon: ShieldCheck, color: "bg-green-500 text-white" },
  admin: { label: "Admin", icon: Shield, color: "bg-blue-500 text-white" },
  student: { label: "Estudiante", icon: User, color: "bg-gray-500 text-white" },
};

const getInitials = (name: string, surname: string) => {
    const firstInitial = name?.[0] || '';
    const lastInitial = surname?.[0] || '';
    return `${firstInitial}${lastInitial}`.toUpperCase();
};

export default function MemberProfilePage() {
    const [member, setMember] = useState<MemberProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const params = useParams();
    const centerId = Array.isArray(params.centerId) ? params.centerId[0] : params.centerId;
    const memberId = Array.isArray(params.memberId) ? params.memberId[0] : params.memberId;

    useEffect(() => {
        if (!centerId || !memberId) return;

        const fetchData = async () => {
            try {
                const centerSnap = await get(child(ref(db), `centers/${centerId}`));
                const userSnap = await get(child(ref(db), `users/${memberId}`));
                const centerProfileSnap = await get(child(ref(db), `userProfilesInCenter/${centerId}/${memberId}`));
                
                if (!centerSnap.exists() || !userSnap.exists() || !centerProfileSnap.exists()) {
                    // Handle not found
                    setLoading(false);
                    return;
                }

                const centerData = centerSnap.val();
                const userData = userSnap.val();
                const centerProfileData = centerProfileSnap.val();

                let role: MemberProfile['role'] = 'student';
                if (centerData.ownerId === memberId) role = 'owner';
                else if (centerData.members.adminsPlus && centerData.members.adminsPlus[memberId]) role = 'admin-plus';
                else if (centerData.members.admins && centerData.members.admins[memberId]) role = 'admin';

                setMember({
                    id: memberId,
                    role,
                    profile: {
                        username: userData.username,
                        name: userData.name,
                        surname: userData.surname,
                        photoURL: userData.photoURL
                    },
                    centerProfile: {
                        course: centerProfileData.course
                    },
                    center: {
                        ownerId: centerData.ownerId,
                        members: centerData.members,
                    }
                });

            } catch (error) {
                console.error("Error fetching member profile:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [centerId, memberId]);

    if (loading) {
        return <div className="flex flex-1 justify-center items-center p-4"><Loader /></div>;
    }

    if (!member) {
        return <div className="flex flex-1 justify-center items-center p-4">Perfil no encontrado.</div>
    }

    const { label, icon: RoleIcon, color } = roleConfig[member.role];

    return (
        <div className="flex-1 space-y-8 p-4 md:p-8 pt-6">
             <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Perfil de Miembro</h2>
            </div>
            <div className="max-w-2xl mx-auto">
                 <Card className="shadow-lg">
                    <CardHeader className="items-center text-center">
                        <Avatar className="h-24 w-24 mb-4">
                            <AvatarImage src={member.profile.photoURL} alt={`${member.profile.name} ${member.profile.surname}`} />
                            <AvatarFallback className="text-4xl">{getInitials(member.profile.name, member.profile.surname)}</AvatarFallback>
                        </Avatar>
                        <CardTitle className="text-2xl">{member.profile.name} {member.profile.surname}</CardTitle>
                        <CardDescription>
                            <div className="flex items-center justify-center gap-2 mt-1">
                                <AtSign className="h-4 w-4 text-muted-foreground"/>
                                <span>{member.profile.username}</span>
                            </div>
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between items-center p-3 border rounded-md">
                            <div className="flex items-center gap-3 text-muted-foreground">
                                <RoleIcon className="h-5 w-5" />
                                <span className="font-medium">Rol</span>
                            </div>
                            <Badge className={color}>{label}</Badge>
                        </div>
                         <div className="flex justify-between items-center p-3 border rounded-md">
                            <div className="flex items-center gap-3 text-muted-foreground">
                                <GraduationCap className="h-5 w-5" />
                                <span className="font-medium">Curso</span>
                            </div>
                            <span className="font-semibold text-foreground">{member.centerProfile.course}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
