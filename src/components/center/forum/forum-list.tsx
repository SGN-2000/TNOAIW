
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Forum, Role } from './types';
import { Users, Shield, Crown } from 'lucide-react';
import { useMemo } from 'react';

interface ForumListProps {
  forums: Forum[];
  userRole: Role;
  currentUserId: string;
  onSelectForum: (forumId: string) => void;
}

const getInitials = (name: string) => {
  return name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';
};

const forumConfig = {
  'general': { icon: Users, requiredRole: 'student' },
  'admins': { icon: Shield, requiredRole: 'admin' },
  'admins-plus': { icon: Crown, requiredRole: 'admin-plus' },
};

const roleHierarchy: { [key in Role]: number } = {
  'student': 0,
  'admin': 1,
  'admin-plus': 2,
  'owner': 3,
};


export default function ForumList({ forums, userRole, onSelectForum, currentUserId }: ForumListProps) {
  
  const filteredAndSortedForums = useMemo(() => {
    const userLevel = roleHierarchy[userRole];
    return forums
      .filter(forum => userLevel >= roleHierarchy[forumConfig[forum.id].requiredRole])
      .sort((a, b) => roleHierarchy[forumConfig[b.id].requiredRole] - roleHierarchy[forumConfig[a.id].requiredRole]);
  }, [forums, userRole]);
  
  const getUnreadCount = (forum: Forum) => {
    if (!forum.lastRead || !forum.lastRead[currentUserId] || !forum.messages) {
      return Object.keys(forum.messages || {}).length;
    }
    const lastReadTimestamp = new Date(forum.lastRead[currentUserId]).getTime();
    return Object.values(forum.messages).filter(msg => new Date(msg.timestamp).getTime() > lastReadTimestamp).length;
  }

  if (filteredAndSortedForums.length === 0) {
    return (
      <div className="text-center py-16 border-2 border-dashed rounded-lg">
        <h3 className="text-xl font-semibold">No hay foros disponibles</h3>
        <p className="text-muted-foreground mt-2">
          Contacta a un administrador si crees que esto es un error.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {filteredAndSortedForums.map(forum => {
        const { icon: Icon } = forumConfig[forum.id];
        const unreadCount = getUnreadCount(forum);

        return (
          <Card 
            key={forum.id} 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => onSelectForum(forum.id)}
          >
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                        <Icon className="h-8 w-8 text-primary" />
                        <div>
                            <CardTitle>{forum.name}</CardTitle>
                            <CardDescription>{forum.description}</CardDescription>
                        </div>
                    </div>
                     {unreadCount > 0 && (
                        <Badge variant="destructive" className="h-6">{unreadCount}</Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent>
              {forum.lastMessage ? (
                <div className="flex items-center gap-3 text-sm">
                  <Avatar className="h-8 w-8">
                      <AvatarFallback>{getInitials(forum.lastMessage.senderName)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 overflow-hidden">
                      <p className="font-semibold truncate">{forum.lastMessage.senderName}</p>
                      <p className="text-muted-foreground truncate">{forum.lastMessage.text}</p>
                  </div>
                   <p className="text-xs text-muted-foreground shrink-0">
                       {formatDistanceToNow(new Date(forum.lastMessage.timestamp), { addSuffix: true, locale: es })}
                   </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Aún no hay mensajes.</p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
