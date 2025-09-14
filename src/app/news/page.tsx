"use client"

import { useEffect, useState } from "react";
import { onValue, ref, off, update } from "firebase/database";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import MainLayout from "@/components/layout/main-layout";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import Loader from "@/components/loader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Newspaper, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NewsItem {
    id: string;
    type: 'EXPULSION' | 'CENTER_DELETED';
    centerName: string;
    timestamp: string;
    read: boolean;
}

const NewsItemCard = ({ item, onMarkAsRead }: { item: NewsItem, onMarkAsRead: (id: string) => void }) => {
    const getIcon = () => {
        switch(item.type) {
            case 'EXPULSION': return <Trash2 className="h-5 w-5 text-destructive" />;
            case 'CENTER_DELETED': return <Trash2 className="h-5 w-5 text-destructive" />;
            default: return <Newspaper className="h-5 w-5 text-primary" />;
        }
    }

    const getDescription = () => {
         switch(item.type) {
            case 'EXPULSION': return `Has sido expulsado del centro de estudiantes "${item.centerName}".`;
            case 'CENTER_DELETED': return `El centro de estudiantes "${item.centerName}" al que pertenecías ha sido eliminado por su propietario.`;
            default: return 'Nueva noticia.';
        }
    }

    return (
        <Card className={cn("transition-colors", !item.read && "bg-primary/5")}>
            <CardContent className="p-4 flex items-center gap-4">
                <div className="p-2 bg-muted rounded-full">
                    {getIcon()}
                </div>
                <div className="flex-1">
                    <p className="text-sm">{getDescription()}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(item.timestamp), { locale: es, addSuffix: true })}
                    </p>
                </div>
                {!item.read && (
                    <Button variant="ghost" size="icon" onClick={() => onMarkAsRead(item.id)} aria-label="Marcar como leído">
                        <Check className="h-5 w-5 text-green-600" />
                    </Button>
                )}
            </CardContent>
        </Card>
    )
}

export default function NewsPage() {
    const [news, setNews] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        };

        const newsRef = ref(db, `news/${user.uid}`);
        const listener = onValue(newsRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                const newsList = Object.keys(data)
                    .map(key => ({ id: key, ...data[key] }))
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                setNews(newsList);
            } else {
                setNews([]);
            }
            setLoading(false);
        });

        return () => off(newsRef, 'value', listener);

    }, [user]);

    const handleMarkAsRead = (itemId: string) => {
        if (!user) return;
        update(ref(db, `news/${user.uid}/${itemId}`), { read: true });
    };

    return (
        <MainLayout>
             <div className="flex-1 space-y-8 p-4 md:p-8 pt-6">
                <div className="flex items-center justify-between space-y-2">
                    <h2 className="text-3xl font-bold tracking-tight">Noticias</h2>
                </div>
                 <p className="text-muted-foreground">
                    Aquí encontrarás notificaciones importantes y actualizaciones.
                </p>

                <div className="max-w-3xl mx-auto space-y-4">
                    {loading ? (
                        <div className="flex justify-center py-12"><Loader /></div>
                    ) : news.length > 0 ? (
                        news.map(item => <NewsItemCard key={item.id} item={item} onMarkAsRead={handleMarkAsRead} />)
                    ) : (
                        <div className="text-center py-12 border-2 border-dashed rounded-lg">
                            <div className="flex justify-center items-center mb-4">
                                <Bell className="h-12 w-12 text-muted-foreground" />
                            </div>
                            <h3 className="text-xl font-semibold">No tienes noticias</h3>
                            <p className="text-muted-foreground mt-2">
                                Cuando algo importante suceda, aparecerá aquí.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </MainLayout>
    );
}
