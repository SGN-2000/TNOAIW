"use client"

import { useState } from 'react';
import { Star } from 'lucide-react';
import MainLayout from '@/components/layout/main-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const StarRating = ({ rating, setRating }: { rating: number; setRating: (rating: number) => void }) => {
  return (
    <div className="flex items-center space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => setRating(star)}
          className="focus:outline-none focus:ring-2 focus:ring-ring rounded-sm"
          aria-label={`Calificar con ${star} de 5 estrellas`}
        >
          <Star
            className={cn(
              "h-8 w-8 transition-colors",
              rating >= star ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground hover:text-yellow-300"
            )}
          />
        </button>
      ))}
    </div>
  );
};

export default function FeedbackPage() {
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState('');
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log({ rating, message });
    toast({
      title: "Comentarios Enviados",
      description: "¡Gracias por ayudarnos a mejorar!",
    });
    setRating(0);
    setMessage('');
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline text-2xl">Soporte y Comentarios</CardTitle>
              <CardDescription>Valoramos tu opinión. Dinos cómo podemos mejorar.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="feedback-message">Tus Comentarios</Label>
                  <Textarea
                    id="feedback-message"
                    placeholder="Comparte tus mensajes, quejas o solicitudes de funciones..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={5}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Califica nuestro sitio web</Label>
                  <StarRating rating={rating} setRating={setRating} />
                </div>
                <Button type="submit" className="w-full">Enviar Comentarios</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
