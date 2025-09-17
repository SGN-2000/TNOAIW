"use client"

import Link from 'next/link';
import {
  Users,
  Calendar,
  MessagesSquare,
  BarChart2,
  Trophy,
  Banknote,
  Store,
  Newspaper,
  ShieldOff,
  HandHeart,
  Globe,
  Presentation
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useParams } from 'next/navigation';
import { cn } from '@/lib/utils';

const functionalities = [
  {
    name: 'Comunidad',
    icon: Users,
    description: 'Gestiona miembros y cursos.',
    href: '/community',
    disabled: false,
  },
  {
    name: 'Eventos',
    icon: Calendar,
    description: 'Organiza torneos y actividades.',
    href: '/events',
    disabled: true,
  },
   {
    name: 'Talleres',
    icon: Presentation,
    description: 'Organiza talleres y charlas.',
    href: '/workshops',
    disabled: false,
  },
  {
    name: 'Foro',
    icon: MessagesSquare,
    description: 'Debate ideas y propuestas.',
    href: '/forum',
    disabled: false,
  },
  {
    name: 'Encuestas',
    icon: BarChart2,
    description: 'Crea y comparte encuestas.',
    href: '/surveys',
    disabled: false,
  },
  {
    name: 'Competencia',
    icon: Trophy,
    description: 'Torneos y competencias internas.',
    href: '/competitions',
    disabled: false,
  },
  {
    name: 'Finanzas',
    icon: Banknote,
    description: 'Administra las finanzas del centro.',
    href: '/finances',
    disabled: false,
  },
  {
    name: 'Tienda',
    icon: Store,
    description: 'Vende merchandising y productos.',
    href: '/store',
    disabled: false,
  },
  {
    name: 'Noticiero',
    icon: Newspaper,
    description: 'Publica noticias y anuncios.',
    href: '/news',
    disabled: false,
  },
  {
    name: 'Chat Anónimo',
    icon: ShieldOff,
    description: 'Un espacio para hablar libremente.',
    href: '/anonymous-chat',
    disabled: false,
  },
  {
    name: 'Chat entre Centros',
    icon: Globe,
    description: 'Comunícate con otros centros.',
    href: '/inter-center-chat',
    disabled: false,
  },
  {
    name: 'Donaciones',
    icon: HandHeart,
    description: 'Recibe donaciones para el centro.',
    href: '/donations',
    disabled: false,
  },
];

const FunctionalityCard = ({ name, icon: Icon, description, href, disabled }: typeof functionalities[0] & { href: string }) => {
  const cardClasses = cn(
    "h-full transition-all duration-300 flex flex-col",
    disabled 
      ? 'bg-muted/50 cursor-not-allowed' 
      : 'hover:bg-card hover:shadow-lg'
  );

  const content = (
    <Card className={cardClasses}>
      <CardHeader className="flex-grow">
        <div className={cn("mx-auto mb-4 w-fit rounded-full p-4", disabled ? 'bg-muted' : 'bg-primary/10')}>
          <Icon className={cn("h-8 w-8", disabled ? 'text-muted-foreground' : 'text-primary')} />
        </div>
        <CardTitle className="text-center">{name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-center text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );

  if (disabled) {
    return <div>{content}</div>;
  }

  return <Link href={href} className="flex flex-col h-full">{content}</Link>;
};


export default function FunctionalitiesPage() {
    const params = useParams();
    const centerId = Array.isArray(params.centerId) ? params.centerId[0] : params.centerId;
    
  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Funcionalidades</h2>
      </div>
      <p className="text-muted-foreground">
        Explora y gestiona las diferentes herramientas y módulos disponibles para tu centro de estudiantes.
      </p>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {functionalities.map((func) => (
          <FunctionalityCard 
            key={func.name} 
            {...func}
            href={`/center/${centerId}${func.href}`}
            />
        ))}
      </div>
    </div>
  );
}
