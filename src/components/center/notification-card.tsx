"use client"

import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { MoreHorizontal, User, Shield, ShieldCheck, UserMinus, UserCog, Trophy, UserPlus, Banknote, Eye, ShieldAlert, Store, XCircle, MessageCircle, Globe, Check, Users, Swords, ClipboardCheck, CircleDollarSign } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ref, update, push, set, get, runTransaction } from "firebase/database";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";


export interface Notification {
  id: string;
  type: 'NEW_MEMBER' | 'NEW_PERMISSION' | 'ROLE_CHANGED' | 'FINANCE_VISIBILITY_CHANGED' | 'REMOVED_PERMISSION' | 'STORE_STATUS_CHANGED' | 'RESERVATION_CANCELED' | 'NEW_ANONYMOUS_CHAT' | 'NEWS_TEAM_MEMBER' | 'GROUP_INVITE' | 'TEAM_INVITE' | 'TEAM_COMPLETE' | 'TEAM_ASSIGNMENT' | 'PAYMENT_CONFIRMED' | 'NEW_EVENT';
  centerId: string;
  centerName?: string;
  subjectUserId?: string;
  subjectUserName?: string;
  permissionType?: 'COMPETITION_MANAGER' | 'FINANCE_MANAGER' | 'STORE_MANAGER' | 'ANONYMOUS_CHAT_MODERATOR' | 'NEWS_TEAM_MEMBER' | 'INTER_CENTER_CHAT';
  newRole?: 'admin-plus' | 'admin' | 'student';
  newVisibility?: 'Pública' | 'Privada';
  newStatus?: 'abierta' | 'cerrada';
  productName?: string;
  timestamp: string;
  read: boolean;
  eventId?: string;
  eventName?: string;
  teamId?: string;
  teamName?: string;
}

interface NotificationCardProps {
  notification: Notification;
  onMarkAsRead: (notificationId: string) => void;
  currentUserRole: 'owner' | 'admin-plus' | 'admin' | 'student' | null;
}

export default function NotificationCard({ notification, onMarkAsRead, currentUserRole }: NotificationCardProps) {
    const { toast } = useToast();
    const { user } = useAuth();


    const handleInteraction = () => {
        if (!notification.read) {
            onMarkAsRead(notification.id);
        }
    };
    
    const handleRoleChange = async (newRole: 'admin-plus' | 'admin' | 'student') => {
        const { centerId, subjectUserId, subjectUserName } = notification;
        if (!subjectUserId || !subjectUserName) return;

        const updates: { [key: string]: any } = {};

        updates[`/centers/${centerId}/members/adminsPlus/${subjectUserId}`] = null;
        updates[`/centers/${centerId}/members/admins/${subjectUserId}`] = null;
        updates[`/centers/${centerId}/members/students/${subjectUserId}`] = null;
        
        if (newRole === 'admin-plus') {
            updates[`/centers/${centerId}/members/adminsPlus/${subjectUserId}`] = true;
        } else if (newRole === 'admin') {
            updates[`/centers/${centerId}/members/admins/${subjectUserId}`] = true;
        } else {
            updates[`/centers/${centerId}/members/students/${subjectUserId}`] = true;
        }

        try {
            await update(ref(db), updates);
            toast({ title: "Rol actualizado", description: `El rol de ${subjectUserName} ha sido cambiado.` });
        } catch (error) {
            toast({ title: "Error", description: "No se pudo actualizar el rol.", variant: "destructive" });
        }
    };

    const handleKickMember = async () => {
        const { centerId, subjectUserId, subjectUserName, centerName } = notification;
        if (!subjectUserId || !subjectUserName || !centerName) return;

        const updates: { [key: string]: any } = {};
        updates[`/centers/${centerId}/members/adminsPlus/${subjectUserId}`] = null;
        updates[`/centers/${centerId}/members/admins/${subjectUserId}`] = null;
        updates[`/centers/${centerId}/members/students/${subjectUserId}`] = null;
        updates[`/userProfilesInCenter/${centerId}/${subjectUserId}`] = null;
        
        try {
            await update(ref(db), updates);

            const newsRef = ref(db, `news/${subjectUserId}`);
            const newNewsRef = push(newsRef);
            await set(newNewsRef, {
                type: 'EXPULSION',
                centerName: centerName,
                timestamp: new Date().toISOString(),
                read: false,
            });

            toast({ title: "Miembro expulsado", description: `${subjectUserName} ha sido eliminado del centro.` });
        } catch (error) {
            toast({ title: "Error", description: "No se pudo expulsar al miembro.", variant: "destructive" });
        }
    };
    
     const handleGroupInvite = async (accept: boolean) => {
        const { id, subjectUserId: chatId, subjectUserName: groupName, centerId: invitedCenterId } = notification;
        if (!chatId || !user || !invitedCenterId) return;

        try {
            await update(ref(db, `notifications/${user.uid}/${id}`), { read: true }); 
            
            if (accept) {
                const currentCenterSnap = await get(ref(db, `centers/${invitedCenterId}`));
                if (!currentCenterSnap.exists()) throw new Error("El centro actual no existe");
                
                const updates: { [key: string]: any } = {};
                updates[`/interCenterChats/${chatId}/members/${invitedCenterId}`] = true;
                updates[`/userInterCenterChats/${user.uid}/${chatId}`] = true;
                await update(ref(db), updates);

                const messagesRef = ref(db, `interCenterChats/${chatId}/messages`);
                const newMsgRef = push(messagesRef);
                await set(newMsgRef, {
                    id: newMsgRef.key,
                    senderId: "system",
                    senderName: "System",
                    text: `${currentCenterSnap.val().centerName} se ha unido al grupo.`,
                    timestamp: new Date().toISOString()
                });

                toast({ title: "Te has unido al grupo", description: `Ahora eres miembro de "${groupName}".` });
            } else {
                toast({ title: "Invitación rechazada", description: `Has rechazado la invitación al grupo "${groupName}".` });
            }

        } catch (error) {
             console.error("Error handling group invite:", error);
            toast({ title: "Error", description: "No se pudo procesar la invitación.", variant: "destructive" });
        }
    };
    
     const handleTeamInvite = async (accept: boolean) => {
        const { id, eventId, teamId, teamName } = notification;
        if (!eventId || !teamId || !user) return;

        try {
            await update(ref(db, `notifications/${user.uid}/${id}`), { read: true });
            
            const memberRef = ref(db, `centers/${centerId}/events/events/${eventId}/teams/${teamId}/members/${user.uid}`);
            
            if (accept) {
                await update(memberRef, { status: 'accepted' });
                toast({ title: "Invitación aceptada", description: `Te has unido al equipo "${teamName}".` });
            } else {
                await update(memberRef, { status: 'declined' });
                toast({ title: "Invitación rechazada" });
            }
        } catch (error) {
            console.error("Error handling team invite:", error);
            toast({ title: "Error", description: "No se pudo procesar la invitación.", variant: "destructive" });
        }
    };


    const roleLabels = { 'admin-plus': 'Admin Plus', 'admin': 'Admin', 'student': 'Estudiante' }
    const permissionLabels: Record<Required<Notification>['permissionType'], string> = {
        'COMPETITION_MANAGER': 'gestor de la competencia',
        'FINANCE_MANAGER': 'gestor de finanzas',
        'STORE_MANAGER': 'gestor de la tienda',
        'ANONYMOUS_CHAT_MODERATOR': 'moderador del chat anónimo',
        'NEWS_TEAM_MEMBER': 'miembro del equipo de noticias',
        'INTER_CENTER_CHAT': 'miembro del Grupo Intercambio'
    }
    
    const getIcon = () => {
        switch (notification.type) {
            case 'NEW_MEMBER': return <UserPlus className="h-6 w-6 text-primary" />;
            case 'NEW_PERMISSION':
                switch (notification.permissionType) {
                    case 'INTER_CENTER_CHAT': return <Globe className="h-6 w-6 text-blue-500" />;
                    default: return <Banknote className="h-6 w-6 text-green-600" />;
                }
            case 'REMOVED_PERMISSION': return <ShieldAlert className="h-6 w-6 text-destructive" />;
            case 'ROLE_CHANGED': return <UserCog className="h-6 w-6 text-blue-600" />;
            case 'FINANCE_VISIBILITY_CHANGED': return <Eye className="h-6 w-6 text-indigo-600" />;
            case 'STORE_STATUS_CHANGED': return <Store className="h-6 w-6 text-purple-600" />;
            case 'RESERVATION_CANCELED': return <XCircle className="h-6 w-6 text-destructive" />;
            case 'NEW_ANONYMOUS_CHAT': return <MessageCircle className="h-6 w-6 text-cyan-600" />;
            case 'GROUP_INVITE': return <Users className="h-6 w-6 text-teal-500" />;
            case 'TEAM_INVITE': return <Swords className="h-6 w-6 text-orange-500" />;
            case 'TEAM_COMPLETE': return <Users className="h-6 w-6 text-green-500" />;
            case 'TEAM_ASSIGNMENT': return <ClipboardCheck className="h-6 w-6 text-blue-500" />;
            case 'PAYMENT_CONFIRMED': return <CircleDollarSign className="h-6 w-6 text-green-600" />;
            case 'NEW_EVENT': return <Trophy className="h-6 w-6 text-yellow-500" />;
            default: return <User className="h-6 w-6" />;
        }
    }

    const renderDefaultCard = (content: React.ReactNode) => (
        <Card className={cn("shadow-sm relative", !notification.read && "bg-primary/5")} onClick={handleInteraction}>
            {!notification.read && <div className="absolute top-3 right-3 h-2.5 w-2.5 rounded-full bg-primary" />}
            <CardContent className="p-3 flex-row flex items-center gap-4 space-y-0">
                <div className="p-2 bg-muted rounded-full">{getIcon()}</div>
                <div className="flex-1">
                    {content}
                    <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true, locale: es })}
                    </p>
                </div>
            </CardContent>
        </Card>
    );

    const renderContent = () => {
        switch (notification.type) {
            case 'NEW_MEMBER':
                return (
                    <Card className={cn("shadow-sm relative", !notification.read && "bg-primary/5")}>
                         {!notification.read && <div className="absolute top-3 right-3 h-2.5 w-2.5 rounded-full bg-primary" />}
                        <CardContent className="p-3 flex-row flex items-center gap-4 space-y-0">
                            <div className="p-2 bg-muted rounded-full">{getIcon()}</div>
                            <div className="flex-1">
                                <p className="text-sm">
                                    <span className="font-semibold">{notification.subjectUserName}</span> se ha unido a {notification.centerName}.
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true, locale: es })}
                                </p>
                            </div>
                            {(currentUserRole === 'owner' || currentUserRole === 'admin-plus') && (
                            <DropdownMenu onOpenChange={(open) => { if(open) handleInteraction() }}>
                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild><Link href={`/center/${notification.centerId}/profile/${notification.subjectUserId}`}><User className="mr-2 h-4 w-4" /><span>Ver Perfil</span></Link></DropdownMenuItem>
                                    <DropdownMenuSub>
                                        <DropdownMenuSubTrigger><UserCog className="mr-2 h-4 w-4" /><span>Cambiar Rol</span></DropdownMenuSubTrigger>
                                        <DropdownMenuSubContent>
                                            {currentUserRole === 'owner' && <DropdownMenuItem onClick={() => handleRoleChange('admin-plus')}><ShieldCheck className="mr-2 h-4 w-4" /><span>Admin Plus</span></DropdownMenuItem>}
                                            <DropdownMenuItem onClick={() => handleRoleChange('admin')}><Shield className="mr-2 h-4 w-4" /><span>Admin</span></DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleRoleChange('student')}><User className="mr-2 h-4 w-4" /><span>Estudiante</span></DropdownMenuItem>
                                        </DropdownMenuSubContent>
                                    </DropdownMenuSub>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-destructive" onClick={handleKickMember}><UserMinus className="mr-2 h-4 w-4" /><span>Expulsar del Centro</span></DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            )}
                        </CardContent>
                    </Card>
                );
            case 'GROUP_INVITE':
                return (
                    <Card className={cn("shadow-sm relative", !notification.read && "bg-primary/5")}>
                        {!notification.read && <div className="absolute top-3 right-3 h-2.5 w-2.5 rounded-full bg-primary" />}
                        <CardContent className="p-3 flex flex-col gap-3">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-muted rounded-full">{getIcon()}</div>
                                <div className="flex-1">
                                    <p className="text-sm">
                                        <span className="font-semibold">{notification.centerName}</span> te ha invitado a unirte al grupo <span className="font-semibold">"{notification.subjectUserName}"</span>.
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true, locale: es })}
                                    </p>
                                </div>
                            </div>
                            {!notification.read && (
                                <div className="flex justify-end gap-2">
                                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleGroupInvite(false)}>Rechazar</Button>
                                    <Button size="sm" onClick={() => handleGroupInvite(true)}><Check className="mr-2 h-4 w-4"/>Aceptar</Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                );
            case 'TEAM_INVITE':
                 return (
                    <Card className={cn("shadow-sm relative", !notification.read && "bg-primary/5")}>
                        {!notification.read && <div className="absolute top-3 right-3 h-2.5 w-2.5 rounded-full bg-primary" />}
                        <CardContent className="p-3 flex flex-col gap-3">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-muted rounded-full">{getIcon()}</div>
                                <div className="flex-1">
                                    <p className="text-sm">
                                        <span className="font-semibold">{notification.subjectUserName}</span> te ha invitado a unirte al equipo <span className="font-semibold">"{notification.teamName}"</span> para el evento <span className="font-semibold">"{notification.eventName}"</span>.
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true, locale: es })}
                                    </p>
                                </div>
                            </div>
                            {!notification.read && (
                                <div className="flex justify-end gap-2">
                                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleTeamInvite(false)}>Rechazar</Button>
                                    <Button size="sm" onClick={() => handleTeamInvite(true)}><Check className="mr-2 h-4 w-4"/>Aceptar</Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                );
            case 'TEAM_COMPLETE':
                return renderDefaultCard(
                    <p className="text-sm">
                        ¡Equipo completo! Tu equipo <span className="font-semibold">"{notification.teamName}"</span> para el evento <span className="font-semibold">"{notification.eventName}"</span> ha alcanzado el mínimo de integrantes.
                    </p>
                );
            case 'TEAM_ASSIGNMENT':
                return renderDefaultCard(
                    <p className="text-sm">
                        Has sido asignado al equipo <span className="font-semibold">"{notification.teamName}"</span> para el evento <span className="font-semibold">"{notification.eventName}"</span>.
                    </p>
                );
            case 'NEW_PERMISSION':
                 return renderDefaultCard(<p className="text-sm">Has sido designado como <span className="font-semibold">{notification.permissionType && permissionLabels[notification.permissionType]}</span> en {notification.centerName}.</p>);
            case 'REMOVED_PERMISSION':
                 return renderDefaultCard(<p className="text-sm text-destructive">Te han quitado los permisos de <span className="font-semibold">{notification.permissionType && permissionLabels[notification.permissionType]}</span> en {notification.centerName}.</p>);
            case 'ROLE_CHANGED':
                return renderDefaultCard(<p className="text-sm">Tu rol en {notification.centerName} ha sido cambiado a <span className="font-semibold">{notification.newRole && roleLabels[notification.newRole]}</span>.</p>);
            case 'FINANCE_VISIBILITY_CHANGED':
                return renderDefaultCard(<p className="text-sm">La visibilidad de las finanzas en {notification.centerName} ha cambiado a: <span className="font-semibold">{notification.newVisibility}</span>.</p>);
            case 'STORE_STATUS_CHANGED':
                return renderDefaultCard(<p className="text-sm">La tienda de {notification.centerName} ha sido <span className="font-semibold">{notification.newStatus}</span>.</p>);
            case 'RESERVATION_CANCELED':
                return renderDefaultCard(<p className="text-sm text-destructive">Tu reserva del producto <span className="font-semibold">{notification.productName}</span> ha sido cancelada por un administrador.</p>);
            case 'NEW_ANONYMOUS_CHAT':
                return renderDefaultCard(<p className="text-sm">Un nuevo <span className="font-semibold">chat anónimo</span> ha sido iniciado en {notification.centerName}.</p>);
             case 'PAYMENT_CONFIRMED':
                return renderDefaultCard(<p className="text-sm">Se ha confirmado tu pago para el evento <span className="font-semibold">{notification.eventName}</span>.</p>);
            case 'NEW_EVENT':
                return renderDefaultCard(<p className="text-sm">¡Nuevo evento! Se ha creado el evento <span className="font-semibold">{notification.eventName}</span> en {notification.centerName}.</p>);
            default:
                return null;
        }
    }


    return renderContent();
}
