"use client"

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ref, onValue, off, update, get } from "firebase/database";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import Loader from "@/components/loader";
import { Bell, CheckCheck } from "lucide-react";
import NotificationCard, { Notification } from "@/components/center/notification-card";
import { Button } from "@/components/ui/button";

export default function NotificationsPage() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const params = useParams();
    const centerId = Array.isArray(params.centerId) ? params.centerId[0] : params.centerId;
    const [userRole, setUserRole] = useState<'owner' | 'admin-plus' | 'admin' | 'student' | null>(null);

    useEffect(() => {
         if (!centerId || !user) {
            setLoading(false);
            return;
        };

        const centerRef = ref(db, `centers/${centerId}`);
        get(centerRef).then(snapshot => {
            if (snapshot.exists()) {
                const centerData = snapshot.val();
                let role: 'owner' | 'admin-plus' | 'admin' | 'student' = 'student';
                if (centerData.ownerId === user.uid) role = 'owner';
                else if (centerData.members.adminsPlus && centerData.members.adminsPlus[user.uid]) role = 'admin-plus';
                else if (centerData.members.admins && centerData.members.admins[user.uid]) role = 'admin';
                setUserRole(role);
            }
             setLoading(false);
        });
    }, [user, centerId]);

    useEffect(() => {
        if (!user) return;

        const notificationsRef = ref(db, `notifications/${user.uid}`);
        const listener = onValue(notificationsRef, (snapshot) => {
            const notificationsData = snapshot.val();
            if (snapshot.exists()) {
                const allNotifications = Object.keys(notificationsData)
                    .map(key => ({ ...notificationsData[key], id: key })) as Notification[];
                
                const centerNotifications = allNotifications
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

                setNotifications(centerNotifications);
            } else {
                setNotifications([]);
            }
             setLoading(false);
        });

        return () => off(notificationsRef, 'value', listener);

    }, [user]);


    const handleMarkAsRead = (notificationId: string) => {
        if (!user) return;
        const notificationRef = ref(db, `notifications/${user.uid}/${notificationId}`);
        update(notificationRef, { read: true });
    }
    
    const filteredNotifications = notifications.filter(n => n.centerId === centerId || (!n.centerId && n.type !== 'EXPULSION' && n.type !== 'CENTER_DELETED'));
    const hasUnread = filteredNotifications.some(n => !n.read);

    const handleMarkAllAsRead = () => {
        if (!user) return;
        const updates: { [key: string]: any } = {};
        filteredNotifications.forEach(notif => {
            if (!notif.read) {
                updates[`/notifications/${user.uid}/${notif.id}/read`] = true;
            }
        });
        if (Object.keys(updates).length > 0) {
            update(ref(db), updates);
        }
    }

    if (loading) {
        return <div className="flex flex-1 justify-center items-center p-4"><Loader /></div>;
    }


    return (
        <div className="flex-1 space-y-8 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Notificaciones</h2>
                 {hasUnread && (
                    <Button variant="outline" size="sm" onClick={handleMarkAllAsRead}>
                        <CheckCheck className="mr-2 h-4 w-4" />
                        Marcar todas como leídas
                    </Button>
                )}
            </div>
            
            <div className="max-w-2xl mx-auto space-y-4">
                {filteredNotifications.length > 0 ? (
                    filteredNotifications.map(notif => (
                        <NotificationCard 
                            key={notif.id} 
                            notification={notif} 
                            onMarkAsRead={() => handleMarkAsRead(notif.id)}
                            currentUserRole={userRole}
                        />
                    ))
                ) : (
                    <div className="text-center py-12 border-2 border-dashed rounded-lg">
                        <div className="flex justify-center items-center mb-4">
                            <Bell className="h-12 w-12 text-muted-foreground" />
                        </div>
                        <h3 className="text-xl font-semibold">No tienes notificaciones</h3>
                        <p className="text-muted-foreground mt-2">
                           Aquí aparecerán las nuevas alertas y avisos.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
