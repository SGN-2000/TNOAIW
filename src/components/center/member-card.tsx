"use client"

import { Member } from "@/app/center/[centerId]/community/page";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown, Shield, User, MoreVertical, VenetianMask, UserCog, UserMinus, ShieldCheck, ArrowUp, ArrowDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";

interface MemberCardProps {
  member: Member;
  currentUserRole: 'owner' | 'admin-plus' | 'admin' | 'student' | null;
  onRoleChange: (memberId: string, newRole: 'admin-plus' | 'admin' | 'student') => void;
  onKick: (memberId: string) => void;
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

export default function MemberCard({ member, currentUserRole, onRoleChange, onKick }: MemberCardProps) {
  const { label, icon: Icon, color } = roleConfig[member.role];
  
  const canManage = 
    (currentUserRole === 'owner' && member.role !== 'owner') ||
    (currentUserRole === 'admin-plus' && (member.role === 'admin' || member.role === 'student'));

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={member.profile.photoURL} alt={`${member.profile.name} ${member.profile.surname}`} />
              <AvatarFallback>{getInitials(member.profile.name, member.profile.surname)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-base font-bold">{member.profile.name} {member.profile.surname}</CardTitle>
              <p className="text-xs text-muted-foreground">@{member.profile.username}</p>
            </div>
          </div>
          {canManage && (
             <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                
                {currentUserRole === 'owner' && member.centerProfile.documentNumber && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem disabled>
                        <VenetianMask className="mr-2 h-4 w-4" />
                        <span>DNI: {member.centerProfile.documentNumber}</span>
                    </DropdownMenuItem>
                  </>
                )}

                <DropdownMenuSeparator />
                <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                        <UserCog className="mr-2 h-4 w-4" />
                        <span>Cambiar Rol</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                         {currentUserRole === 'owner' && member.role !== 'admin-plus' && (
                             <DropdownMenuItem onClick={() => onRoleChange(member.id, 'admin-plus')}>
                                <ShieldCheck className="mr-2 h-4 w-4" />
                                <span>Ascender a Admin Plus</span>
                             </DropdownMenuItem>
                         )}
                         {(currentUserRole === 'owner' || currentUserRole === 'admin-plus') && member.role === 'student' && (
                             <DropdownMenuItem onClick={() => onRoleChange(member.id, 'admin')}>
                                <Shield className="mr-2 h-4 w-4" />
                                <span>Ascender a Admin</span>
                             </DropdownMenuItem>
                         )}
                         {(currentUserRole === 'owner' || currentUserRole === 'admin-plus') && member.role === 'admin' && (
                            <DropdownMenuItem onClick={() => onRoleChange(member.id, 'student')}>
                                <User className="mr-2 h-4 w-4" />
                                <span>Degradar a Estudiante</span>
                            </DropdownMenuItem>
                         )}
                         {currentUserRole === 'owner' && member.role === 'admin-plus' && (
                            <>
                                <DropdownMenuItem onClick={() => onRoleChange(member.id, 'admin')}>
                                    <Shield className="mr-2 h-4 w-4" />
                                    <span>Degradar a Admin</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onRoleChange(member.id, 'student')}>
                                    <User className="mr-2 h-4 w-4" />
                                    <span>Degradar a Estudiante</span>
                                </DropdownMenuItem>
                            </>
                         )}
                    </DropdownMenuSubContent>
                </DropdownMenuSub>
                
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={() => onKick(member.id)}>
                    <UserMinus className="mr-2 h-4 w-4" />
                    <span>Expulsar del Centro</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      <CardContent>
         <div className="flex justify-between items-center text-sm">
             <p className="text-muted-foreground">Curso:</p>
             <p className="font-medium">{member.centerProfile.course}</p>
         </div>
          <div className="flex justify-between items-center text-sm mt-2">
             <p className="text-muted-foreground">Rol:</p>
             <Badge className={cn("text-xs", color)}><Icon className="mr-1 h-3 w-3"/>{label}</Badge>
         </div>
      </CardContent>
    </Card>
  );
}
