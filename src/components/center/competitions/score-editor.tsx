"use client";

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ref, update, push, serverTimestamp } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Minus, Plus, Loader2 } from 'lucide-react';
import type { Score } from './types';

const scoreUpdateSchema = z.object({
  scores: z.array(z.object({
    course: z.string(),
    points: z.number().int("Los puntos deben ser números enteros."),
  })),
  reason: z.string().min(10, "La justificación debe tener al menos 10 caracteres."),
});

interface ScoreEditorProps {
  scores: Score[];
  centerId: string;
  onUpdate: () => void;
}

export default function ScoreEditor({ scores, centerId, onUpdate }: ScoreEditorProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof scoreUpdateSchema>>({
    resolver: zodResolver(scoreUpdateSchema),
    defaultValues: {
      scores: scores.map(s => ({ course: s.course, points: 0 })),
      reason: "",
    },
  });
  
  const { fields } = useFieldArray({
    control: form.control,
    name: "scores"
  });

  const onSubmit = async (data: z.infer<typeof scoreUpdateSchema>) => {
    if (!user) return;

    // Filter only the changes
    const changes = data.scores.filter(s => s.points !== 0);
    if (changes.length === 0) {
      toast({ title: "Sin cambios", description: "No se ingresaron cambios en las puntuaciones." });
      return;
    }
    
    try {
        const updates: { [key: string]: any } = {};
        const logRef = push(ref(db, `centers/${centerId}/competition/log`));
        const newLogId = logRef.key;

        // Prepare score updates
        scores.forEach((currentScore, index) => {
            const change = data.scores[index];
            if (change.points !== 0) {
                updates[`/centers/${centerId}/competition/scores/${change.course}`] = currentScore.points + change.points;
            }
        });
        
        // Prepare log entry
        if(newLogId) {
            updates[`/centers/${centerId}/competition/log/${newLogId}`] = {
                timestamp: new Date().toISOString(),
                reason: data.reason,
                editorName: user.displayName || 'Anónimo',
                changes: changes,
            };
        }

        await update(ref(db), updates);
        toast({ title: "Puntuaciones actualizadas", description: "La tabla de posiciones ha sido modificada." });
        onUpdate();
        
    } catch (error) {
        console.error(error);
        toast({ title: "Error", description: "No se pudieron actualizar las puntuaciones.", variant: "destructive" });
    }
  };
  
  const updatePoints = (index: number, delta: number) => {
    const currentPoints = form.getValues(`scores.${index}.points`);
    form.setValue(`scores.${index}.points`, currentPoints + delta, { shouldValidate: true });
  };


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-4">
          {fields.map((field, index) => (
            <FormField
              key={field.id}
              control={form.control}
              name={`scores.${index}.points`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{scores[index].course}</FormLabel>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="icon" onClick={() => updatePoints(index, -1)}><Minus className="h-4 w-4" /></Button>
                     <FormControl>
                        <Input type="number" {...field} className="text-center font-bold text-lg" onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} />
                     </FormControl>
                    <Button type="button" variant="outline" size="icon" onClick={() => updatePoints(index, 1)}><Plus className="h-4 w-4" /></Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
        </div>
        
        <FormField
            control={form.control}
            name="reason"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Justificación de los Cambios</FormLabel>
                    <FormControl>
                        <Textarea placeholder="Ej: Puntos por la competencia de cultura general." {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />
        
        <div className="flex justify-end">
            <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar Cambios
            </Button>
        </div>
      </form>
    </Form>
  );
}
