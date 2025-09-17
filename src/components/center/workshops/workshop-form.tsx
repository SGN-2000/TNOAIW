"use client"

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ref, set, push, update } from "firebase/database";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { Workshop } from "./types";
import { Switch } from "@/components/ui/switch";

const workshopSchema = z.object({
  title: z.string().min(5, "El título debe tener al menos 5 caracteres."),
  description: z.string().min(10, "La descripción debe tener al menos 10 caracteres."),
  date: z.date({ required_error: "La fecha y hora son obligatorias." }),
  isVirtual: z.boolean().default(false),
  location: z.string().min(3, "La ubicación es obligatoria."),
  instructor: z.string().min(3, "El nombre del instructor es obligatorio."),
}).refine(data => {
    if (data.isVirtual) {
        try {
            new URL(data.location);
            return true;
        } catch (_) {
            return false;
        }
    }
    return true;
}, {
    message: "Debe ser una URL válida para talleres virtuales.",
    path: ["location"],
});


interface WorkshopFormProps {
  centerId: string;
  workshop: Workshop | null;
  onSave: () => void;
}

export default function WorkshopForm({ centerId, workshop, onSave }: WorkshopFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof workshopSchema>>({
    resolver: zodResolver(workshopSchema),
    defaultValues: workshop
      ? { ...workshop, date: new Date(workshop.date), isVirtual: workshop.isVirtual || false }
      : {
          title: "",
          description: "",
          date: undefined,
          isVirtual: false,
          location: "",
          instructor: "",
        },
  });

  const isVirtual = form.watch("isVirtual");

  const onSubmit = async (values: z.infer<typeof workshopSchema>) => {
    if (!user) return;
    
    const workshopData = {
      ...values,
      date: values.date.toISOString(),
      authorId: user.uid,
      authorName: user.displayName || 'Anónimo',
    };

    try {
      if (workshop) {
        const workshopRef = ref(db, `centers/${centerId}/workshops/workshops/${workshop.id}`);
        await update(workshopRef, workshopData);
        toast({ title: "Taller actualizado" });
      } else {
        const workshopsRef = ref(db, `centers/${centerId}/workshops/workshops`);
        const newWorkshopRef = push(workshopsRef);
        await set(newWorkshopRef, { ...workshopData, id: newWorkshopRef.key });
        toast({ title: "Taller creado" });
      }
      onSave();
    } catch (error) {
      console.error("Error saving workshop:", error);
      toast({ title: "Error", description: "No se pudo guardar el taller.", variant: "destructive" });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField control={form.control} name="title" render={({ field }) => (
            <FormItem><FormLabel>Título del Taller</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
        )}/>
        <FormField control={form.control} name="description" render={({ field }) => (
            <FormItem><FormLabel>Descripción</FormLabel><FormControl><Textarea {...field} rows={3} /></FormControl><FormMessage /></FormItem>
        )}/>
        <FormField
            control={form.control}
            name="isVirtual"
            render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                        <FormLabel>Taller Virtual</FormLabel>
                        <FormDescription>
                        Activa si el taller se realizará online.
                        </FormDescription>
                    </div>
                    <FormControl>
                        <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        />
                    </FormControl>
                </FormItem>
            )}
        />
        <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="date" render={({ field }) => (
            <FormItem className="flex flex-col"><FormLabel>Fecha y Hora</FormLabel>
                <Popover><PopoverTrigger asChild><FormControl>
                    <Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                        {field.value ? format(field.value, "PPP HH:mm", { locale: es }) : <span>Elige una fecha</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                </FormControl></PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} />
                    <div className="p-3 border-t border-border">
                        <Input
                          type="time"
                          value={field.value ? format(field.value, 'HH:mm') : ''}
                          onChange={(e) => {
                            const time = e.target.value;
                            const [hours, minutes] = time.split(':').map(Number);
                            const newDate = new Date(field.value || new Date());
                            if (!isNaN(hours) && !isNaN(minutes)) {
                              newDate.setHours(hours);
                              newDate.setMinutes(minutes);
                              field.onChange(newDate);
                            }
                          }}
                        />
                    </div>
                </PopoverContent></Popover><FormMessage />
            </FormItem>
            )}/>
            <FormField control={form.control} name="location" render={({ field }) => (
                <FormItem>
                    <FormLabel>{isVirtual ? 'URL de la Reunión' : 'Ubicación'}</FormLabel>
                    <FormControl><Input {...field} placeholder={isVirtual ? "https://meet.google.com/..." : "SUM del Colegio"} /></FormControl>
                    <FormMessage />
                </FormItem>
            )}/>
        </div>
         <FormField control={form.control} name="instructor" render={({ field }) => (
            <FormItem><FormLabel>Instructor(a)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
        )}/>
        <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onSave}>Cancelar</Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar
            </Button>
        </div>
      </form>
    </Form>
  );
}
