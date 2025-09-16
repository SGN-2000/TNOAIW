"use client"

import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Calendar, BarChart2, Banknote } from "lucide-react";

const actions = [
  {
    name: 'Eventos',
    icon: Calendar,
    href: '/events',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
  },
  {
    name: 'Encuestas',
    icon: BarChart2,
    href: '/surveys',
     color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
   {
    name: 'Finanzas',
    icon: Banknote,
    href: '/finanzas',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  {
    name: 'Comunidad',
    icon: Users,
    href: '/community',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
];

export default function QuickActions() {
    const params = useParams();
    const centerId = Array.isArray(params.centerId) ? params.centerId[0] : params.centerId;
    
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {actions.map(action => (
                <Link key={action.name} href={`/center/${centerId}${action.href}`}>
                    <Card className="hover:bg-primary/5 hover:shadow-lg transition-all text-center">
                        <CardContent className="p-4">
                             <div className={`mx-auto ${action.bgColor} ${action.color} rounded-full p-3 w-fit mb-2`}>
                                <action.icon className="h-6 w-6" />
                            </div>
                            <p className="text-sm font-semibold">{action.name}</p>
                        </CardContent>
                    </Card>
                </Link>
            ))}
        </div>
    )
}
