import MainLayout from '@/components/layout/main-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';

export default function NgsPage() {
  return (
    <MainLayout>
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <Card className="shadow-lg text-center">
            <CardHeader>
              <CardTitle className="font-headline text-2xl">Acerca de Negroni Studios</CardTitle>
              <CardDescription>Los creadores de Wiaont.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-foreground">
                Esta aplicación es orgullosamente desarrollada y mantenida por Negroni Studios.
                Nos especializamos en crear soluciones web innovadoras y fáciles de usar.
              </p>
              <p className="text-muted-foreground">
                Descubre más sobre nuestros proyectos y servicios visitando nuestro sitio web oficial.
              </p>
              <Button asChild>
                <Link href="https://ngstudiios.github.io/WP/" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Visitar Negroni Studios
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
