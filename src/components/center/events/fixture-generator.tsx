"use client";

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { BrainCircuit, Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateFixture } from '@/ai/flows/generate-fixture-flow';
import type { Event } from './types';
import { ref, update } from 'firebase/database';
import { db } from '@/lib/firebase';
import { Input } from '@/components/ui/input';

const fixtureSchema = z.object({
  description: z.string().min(10, 'La descripción debe tener al menos 10 caracteres.'),
  availableDates: z.array(z.object({ value: z.string().min(1, "La fecha no puede estar vacía.") })).min(1, "Debes proporcionar al menos una fecha."),
  availableTimes: z.array(z.object({ value: z.string().min(1, "La hora no puede estar vacía.") })).min(1, "Debes proporcionar al menos un horario."),
  availableLocations: z.array(z.object({ value: z.string().min(1, "El lugar no puede estar vacío.") })).min(1, "Debes proporcionar al menos un lugar."),
});

interface FixtureGeneratorProps {
  event: Event;
  centerId: string;
}

export default function FixtureGenerator({ event, centerId }: FixtureGeneratorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof fixtureSchema>>({
    resolver: zodResolver(fixtureSchema),
    defaultValues: {
      description: '',
      availableDates: [{ value: '' }],
      availableTimes: [{ value: '' }],
      availableLocations: [{ value: '' }],
    },
  });

  const { fields: dateFields, append: appendDate, remove: removeDate } = useFieldArray({ control: form.control, name: "availableDates" });
  const { fields: timeFields, append: appendTime, remove: removeTime } = useFieldArray({ control: form.control, name: "availableTimes" });
  const { fields: locationFields, append: appendLocation, remove: removeLocation } = useFieldArray({ control: form.control, name: "availableLocations" });

  const onSubmit = async (values: z.infer<typeof fixtureSchema>) => {
    setIsLoading(true);

    const participatingTeams = Object.values(event.teams || {}).map(team => ({
      id: team.id,
      name: team.name,
    }));

    if (participatingTeams.length < 2) {
      toast({ title: 'Error', description: 'Se necesitan al menos 2 equipos para generar un fixture.', variant: 'destructive' });
      setIsLoading(false);
      return;
    }
    
    try {
      const result = await generateFixture({
        teams: participatingTeams,
        description: values.description,
        classificationType: event.classification?.type === 'elimination' ? 'elimination' : 'groups',
        availableDates: values.availableDates.map(d => d.value),
        availableTimes: values.availableTimes.map(t => t.value),
        availableLocations: values.availableLocations.map(l => l.value),
      });
      
      const eventRef = ref(db, `centers/${centerId}/events/events/${event.id}`);
      await update(eventRef, { fixture: result });

      toast({ title: '¡Fixture Generado!', description: 'El fixture del torneo ha sido creado con éxito.' });
    } catch (error: any) {
      console.error(error);
      toast({ title: 'Error al generar', description: error.message || 'La IA no pudo generar el fixture. Intenta ser más específico.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-primary border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><BrainCircuit /> Generador de Fixture con IA</CardTitle>
        <CardDescription>La fecha de inscripción ha terminado. Es hora de crear el fixture del torneo.</CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="mb-6">
          <AlertTitle>¿Cómo funciona?</AlertTitle>
          <AlertDescription>
            Describe cómo quieres que sea la estructura del torneo y proporciona los días, horarios y lugares disponibles. La IA se encargará de organizar los partidos.
          </AlertDescription>
        </Alert>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Describe la estructura del torneo</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} placeholder="Ej: 4 grupos de 4, los dos primeros avanzan a cuartos de final..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid md:grid-cols-3 gap-6">
              {/* Fechas */}
              <div className="space-y-2">
                <FormLabel>Días Disponibles</FormLabel>
                {dateFields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-2">
                    <FormField control={form.control} name={`availableDates.${index}.value`} render={({ field }) => (
                      <Input type="date" {...field} />
                    )}/>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeDate(index)} disabled={dateFields.length <= 1}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => appendDate({ value: '' })}><PlusCircle className="mr-2 h-4 w-4" />Añadir Día</Button>
              </div>
              
              {/* Horarios */}
              <div className="space-y-2">
                <FormLabel>Horarios Disponibles</FormLabel>
                {timeFields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-2">
                    <FormField control={form.control} name={`availableTimes.${index}.value`} render={({ field }) => (
                      <Input type="time" {...field} />
                    )}/>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeTime(index)} disabled={timeFields.length <= 1}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => appendTime({ value: '' })}><PlusCircle className="mr-2 h-4 w-4" />Añadir Hora</Button>
              </div>
              
              {/* Lugares */}
              <div className="space-y-2">
                <FormLabel>Lugares Disponibles</FormLabel>
                {locationFields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-2">
                    <FormField control={form.control} name={`availableLocations.${index}.value`} render={({ field }) => (
                      <Input {...field} placeholder="Ej: Cancha 1" />
                    )}/>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeLocation(index)} disabled={locationFields.length <= 1}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => appendLocation({ value: '' })}><PlusCircle className="mr-2 h-4 w-4" />Añadir Lugar</Button>
              </div>
            </div>

            <Button type="submit" disabled={isLoading} className="mt-4">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generar Fixture
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
