
"use client"

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ref, set, push, update, get } from "firebase/database";
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
import type { Event } from "./types";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const eventSchema = z.object({
  title: z.string().min(5, "El título debe tener al menos 5 caracteres."),
  description: z.string().min(10, "La descripción debe tener al menos 10 caracteres."),
  date: z.date({ required_error: "La fecha y hora son obligatorias." }),
  location: z.string().min(3, "La ubicación es obligatoria."),
  requiresRsvp: z.boolean().default(true),
  
  // Registration type fields
  registrationType: z.enum(['free', 'paid']).default('free'),
  cost: z.coerce.number().optional(),
  registrationDeadline: z.date().optional(),

  // Team fields
  participationType: z.enum(['individual', 'team'], { required_error: "Debes seleccionar un tipo de participación."}),
  teamFormation: z.enum(['participant', 'manager']).optional(),
  teamSize: z.object({
    min: z.coerce.number().int().min(1, "El mínimo debe ser al menos 1."),
    max: z.coerce.number().int().min(1, "El máximo debe ser al menos 1."),
  }).optional(),

  // Classification fields
  classification: z.object({
    enabled: z.boolean().default(false),
    type: z.enum(['table', 'groups', 'elimination']).optional(),
    drawDate: z.date().optional(),
    groupsConfig: z.object({
        drawType: z.enum(['random', 'manual']),
        usePots: z.boolean().optional(),
        knockoutDrawType: z.enum(['random', 'manual']).optional(),
        knockoutUsePots: z.boolean().optional(),
    }).optional(),
  }).optional(),

}).refine(data => {
    if (data.participationType === 'team' && data.teamFormation === 'participant') {
        return !!data.teamSize;
    }
    return true;
}, {
    message: "Debes definir el tamaño del equipo.",
    path: ['teamSize'],
}).refine(data => {
    if (data.participationType === 'team' && data.teamFormation === 'participant' && data.teamSize) {
        return data.teamSize.max >= data.teamSize.min;
    }
    return true;
}, {
    message: "El tamaño máximo no puede ser menor que el mínimo.",
    path: ['teamSize.max'],
}).refine(data => {
    if (data.registrationType === 'paid') {
        return data.cost !== undefined && data.cost > 0 && data.registrationDeadline !== undefined;
    }
    return true;
}, {
    message: "El costo y la fecha límite de inscripción son obligatorios para eventos de pago.",
    path: ['cost'], // You can point to any relevant field
}).refine(data => {
    if (data.classification?.enabled && data.classification.drawDate && data.registrationDeadline) {
        return data.classification.drawDate > data.registrationDeadline;
    }
    return true;
}, {
    message: "La fecha del sorteo debe ser posterior a la fecha límite de inscripción.",
    path: ['classification.drawDate'],
}).refine(data => {
    if (data.classification?.enabled && data.classification.drawDate) {
        return data.date > data.classification.drawDate;
    }
    return true;
}, {
    message: "La fecha del evento debe ser posterior a la fecha del sorteo.",
    path: ['date'],
});


interface EventFormProps {
  centerId: string;
  event: Event | null;
  onSave: () => void;
}

export default function EventForm({ centerId, event, onSave }: EventFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof eventSchema>>({
    resolver: zodResolver(eventSchema),
    defaultValues: event
      ? { 
          ...event, 
          date: new Date(event.date), 
          teamFormation: event.teamFormation || 'participant',
          registrationType: event.registrationType || 'free',
          registrationDeadline: event.registrationDeadline ? new Date(event.registrationDeadline) : undefined,
          classification: event.classification ? {
              ...event.classification,
              drawDate: event.classification.drawDate ? new Date(event.classification.drawDate) : undefined,
          } : { enabled: false, type: 'table', groupsConfig: { drawType: 'manual' } }
        }
      : {
          title: "",
          description: "",
          date: undefined,
          location: "",
          requiresRsvp: true,
          registrationType: "free",
          cost: 0,
          registrationDeadline: undefined,
          participationType: "individual",
          teamFormation: "participant",
          teamSize: { min: 2, max: 4 },
          classification: { enabled: false, type: 'table', drawDate: undefined, groupsConfig: { drawType: 'manual', usePots: false, knockoutDrawType: 'manual', knockoutUsePots: false } },
        },
  });
  
  const participationType = form.watch('participationType');
  const teamFormation = form.watch('teamFormation');
  const requiresRsvp = form.watch('requiresRsvp');
  const registrationType = form.watch('registrationType');
  const classificationEnabled = form.watch('classification.enabled');
  const classificationType = form.watch('classification.type');
  const drawType = form.watch('classification.groupsConfig.drawType');
  const knockoutDrawType = form.watch('classification.groupsConfig.knockoutDrawType');


  const onSubmit = async (values: z.infer<typeof eventSchema>) => {
    if (!user) return;
    
    try {
      let eventData: any = {
        ...values,
        date: values.date.toISOString(),
        registrationDeadline: values.registrationDeadline?.toISOString(),
        authorId: user.uid,
        authorName: user.displayName || 'Anónimo',
      };
      
      if (values.participationType === 'individual') {
        delete eventData.teamFormation;
        delete eventData.teamSize;
      }
      
      if (values.participationType === 'team' && values.teamFormation === 'manager') {
         delete eventData.teamSize;
      }
      
      if (!values.requiresRsvp) {
        delete eventData.registrationType;
        delete eventData.cost;
        delete eventData.registrationDeadline;
      }
      
       if (values.registrationType === 'free') {
        delete eventData.cost;
      }
      
       if (!values.classification?.enabled) {
        eventData.classification = { enabled: false };
      } else {
        eventData.classification.drawDate = values.classification.drawDate?.toISOString();
      }


      if (event) {
        const eventRef = ref(db, `centers/${centerId}/events/events/${event.id}`);
        await update(eventRef, eventData);
        toast({ title: "Evento actualizado" });
      } else {
        const eventsRef = ref(db, `centers/${centerId}/events/events`);
        const newEventRef = push(eventsRef);
        await set(newEventRef, { ...eventData, id: newEventRef.key });
        
        const centerSnap = await get(ref(db, `centers/${centerId}`));
        const centerData = centerSnap.val();
        const allMemberIds = [
            centerData.ownerId,
            ...Object.keys(centerData.members.admins || {}),
            ...Object.keys(centerData.members.adminsPlus || {}),
            ...Object.keys(centerData.members.students || {}),
        ];
        const uniqueMemberIds = [...new Set(allMemberIds)];

        const notificationPromises = uniqueMemberIds.map(memberId => {
          if (memberId === user.uid) return null;
          const notifRef = push(ref(db, `notifications/${memberId}`));
          return set(notifRef, {
              type: 'NEW_EVENT',
              centerId: centerId,
              centerName: centerData.centerName,
              eventName: values.title,
              timestamp: new Date().toISOString(),
              read: false,
          });
        }).filter(Boolean);
        await Promise.all(notificationPromises);

        toast({ title: "Evento creado y notificaciones enviadas" });
      }
      onSave();
    } catch (error) {
      console.error("Error saving event:", error);
      toast({ title: "Error", description: "No se pudo guardar el evento.", variant: "destructive" });
    }
  };

  return (
    <ScrollArea className="max-h-[80vh] pr-6">
        <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem><FormLabel>Título del Evento</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Descripción</FormLabel><FormControl><Textarea {...field} rows={3} /></FormControl><FormMessage /></FormItem>
            )}/>
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
                    <FormItem><FormLabel>Ubicación</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
            </div>
             <FormField
                control={form.control}
                name="requiresRsvp"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                        <FormLabel>Requerir inscripción</FormLabel>
                        <FormDescription>
                        Si se activa, los miembros podrán inscribirse.
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

            {requiresRsvp && (
                 <div className="space-y-4 p-4 border rounded-lg">
                    <FormField control={form.control} name="registrationType" render={({ field }) => (
                        <FormItem className="space-y-2"><FormLabel>Tipo de Inscripción</FormLabel>
                            <FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">
                                <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="free" /></FormControl><FormLabel className="font-normal">Gratuita</FormLabel></FormItem>
                                <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="paid" /></FormControl><FormLabel className="font-normal">De Pago</FormLabel></FormItem>
                            </RadioGroup></FormControl><FormMessage />
                        </FormItem>
                    )}/>
                    
                    {registrationType === 'paid' && (
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="cost" render={({ field }) => (
                                <FormItem><FormLabel>Costo por Persona</FormLabel><FormControl><Input type="number" min={0} {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                        </div>
                    )}
                    
                    <FormField control={form.control} name="registrationDeadline" render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel>Fecha Límite de Inscripción</FormLabel>
                             <Popover><PopoverTrigger asChild><FormControl>
                                <Button variant={"outline"} className={cn("w-[240px] pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
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
                            </PopoverContent></Popover>
                            <FormDescription>
                                {registrationType === 'paid' ? "Fecha límite para inscribirse y pagar." : "Fecha límite para inscribirse."}
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}/>

                    <FormField control={form.control} name="participationType" render={({ field }) => (
                        <FormItem className="space-y-3 pt-4 border-t"><FormLabel>Tipo de Participación</FormLabel>
                            <FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">
                                <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="individual" /></FormControl><FormLabel className="font-normal">Individual</FormLabel></FormItem>
                                <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="team" /></FormControl><FormLabel className="font-normal">En Equipo</FormLabel></FormItem>
                            </RadioGroup></FormControl><FormMessage />
                        </FormItem>
                    )}/>
                    
                    {participationType === 'team' && (
                        <div className="space-y-4 p-4 border rounded-lg bg-background">
                            <FormField control={form.control} name="teamFormation" render={({ field }) => (
                                <FormItem className="space-y-2"><FormLabel>¿Quién arma los equipos?</FormLabel>
                                    <FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">
                                        <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="participant" /></FormControl><FormLabel className="font-normal">Los participantes</FormLabel></FormItem>
                                        <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="manager" /></FormControl><FormLabel className="font-normal">Un gestor</FormLabel></FormItem>
                                    </RadioGroup></FormControl><FormMessage />
                                </FormItem>
                            )}/>

                            {teamFormation === 'participant' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField control={form.control} name="teamSize.min" render={({ field }) => (
                                        <FormItem><FormLabel>Mínimo por equipo</FormLabel><FormControl><Input type="number" min={1} {...field} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={form.control} name="teamSize.max" render={({ field }) => (
                                        <FormItem><FormLabel>Máximo por equipo</FormLabel><FormControl><Input type="number" min={1} {...field} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                </div>
                            )}
                        </div>
                    )}
                 </div>
            )}
            
            <FormField
                control={form.control}
                name="classification.enabled"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                        <FormLabel>Activar Clasificación / Fixture</FormLabel>
                        <FormDescription>
                          Organiza el evento como un torneo.
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

            {classificationEnabled && (
                <div className="space-y-4 p-4 border rounded-lg">
                     <FormField
                        control={form.control}
                        name="classification.type"
                        render={({ field }) => (
                            <FormItem className="space-y-3">
                            <FormLabel>Formato del Torneo</FormLabel>
                            <FormControl>
                                <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="space-y-2">
                                <FormItem className="flex items-center space-x-2">
                                    <RadioGroupItem value="table" id="table" />
                                    <Label htmlFor="table">Tabla de Posiciones</Label>
                                </FormItem>
                                <FormItem className="flex items-center space-x-2">
                                    <RadioGroupItem value="groups" id="groups" />
                                    <Label htmlFor="groups">Grupos y Eliminatoria</Label>
                                </FormItem>
                                <FormItem className="flex items-center space-x-2">
                                    <RadioGroupItem value="elimination" id="elimination" />
                                    <Label htmlFor="elimination">Eliminatoria Directa</Label>
                                </FormItem>
                                </RadioGroup>
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    
                    {classificationType && classificationType !== 'table' && (
                        <FormField
                            control={form.control}
                            name="classification.drawDate"
                            render={({ field }) => (
                            <FormItem className="flex flex-col"><FormLabel>Fecha y Hora del Sorteo</FormLabel>
                                <Popover><PopoverTrigger asChild><FormControl>
                                    <Button variant="outline" className={cn("w-[240px] pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                        {field.value ? format(field.value, "PPP HH:mm", { locale: es }) : <span>Elige fecha de sorteo</span>}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </FormControl></PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} />
                                    <div className="p-3 border-t border-border">
                                        <Input type="time" value={field.value ? format(field.value, 'HH:mm') : ''} onChange={(e) => {
                                            const time = e.target.value; const [hours, minutes] = time.split(':').map(Number);
                                            const newDate = new Date(field.value || new Date());
                                            if (!isNaN(hours) && !isNaN(minutes)) { newDate.setHours(hours); newDate.setMinutes(minutes); field.onChange(newDate); }
                                        }}/>
                                    </div>
                                </PopoverContent></Popover>
                                <FormMessage />
                            </FormItem>
                        )}/>
                    )}

                    {classificationType === 'elimination' && (
                         <div className="space-y-4 p-4 border rounded-lg bg-background">
                            <h4 className="font-semibold">Configuración de Sorteo</h4>
                             <FormField control={form.control} name="classification.groupsConfig.drawType" render={({ field }) => (
                                <FormItem className="space-y-2"><FormLabel>Método de Sorteo del Cuadro</FormLabel>
                                    <FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">
                                        <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="random" /></FormControl><FormLabel className="font-normal">Sorteo Automático</FormLabel></FormItem>
                                        <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="manual" /></FormControl><FormLabel className="font-normal">Armado Manual</FormLabel></FormItem>
                                    </RadioGroup></FormControl>
                                     <FormDescription>Si es manual, lo armarás después de que cierren las inscripciones.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            {drawType === 'random' && (
                                <FormField control={form.control} name="classification.groupsConfig.usePots" render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                    <div className="space-y-1 leading-none">
                                        <FormLabel>Usar Bombos (Cabezas de serie)</FormLabel>
                                    </div>
                                </FormItem>
                                )}/>
                            )}
                        </div>
                    )}
                    
                    {classificationType === 'groups' && (
                        <div className="space-y-4 p-4 border rounded-lg bg-background">
                            <h4 className="font-semibold">Configuración de Sorteo</h4>
                             <FormField control={form.control} name="classification.groupsConfig.drawType" render={({ field }) => (
                                <FormItem className="space-y-2"><FormLabel>Método de Sorteo de Grupos</FormLabel>
                                    <FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">
                                        <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="random" /></FormControl><FormLabel className="font-normal">Sorteo Automático</FormLabel></FormItem>
                                        <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="manual" /></FormControl><FormLabel className="font-normal">Armado Manual</FormLabel></FormItem>
                                    </RadioGroup></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            {drawType === 'random' && (
                                <div className="space-y-4 pl-2">
                                     <FormField control={form.control} name="classification.groupsConfig.usePots" render={({ field }) => (
                                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel>Usar Bombos (Cabezas de serie)</FormLabel>
                                            </div>
                                        </FormItem>
                                     )}/>
                                </div>
                            )}
                            
                            {(drawType === 'manual' || drawType === 'random') && (
                                <FormField control={form.control} name="classification.groupsConfig.knockoutDrawType" render={({ field }) => (
                                <FormItem className="space-y-2 pt-4 border-t"><FormLabel>Sorteo para Fase Eliminatoria</FormLabel>
                                    <FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">
                                        <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="random" /></FormControl><FormLabel className="font-normal">Por Sorteo</FormLabel></FormItem>
                                        <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="manual" /></FormControl><FormLabel className="font-normal">Manual</FormLabel></FormItem>
                                    </RadioGroup></FormControl>
                                    <FormDescription>Elige cómo se determinarán los cruces de la fase eliminatoria (ej. 1º A vs 2º B).</FormDescription>
                                    <FormMessage />
                                </FormItem>
                                )}/>
                            )}
                            
                            {knockoutDrawType === 'random' && (
                                 <FormField control={form.control} name="classification.groupsConfig.knockoutUsePots" render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-3 space-y-0 pl-2">
                                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                    <div className="space-y-1 leading-none">
                                        <FormLabel>Usar Bombos</FormLabel>
                                         <FormDescription>Ej: Ganadores de grupo en un bombo, segundos en otro.</FormDescription>
                                    </div>
                                </FormItem>
                                )}/>
                            )}
                        </div>
                    )}
                </div>
            )}


            <div className="flex justify-end gap-2 sticky bottom-0 bg-background py-4">
                <Button type="button" variant="outline" onClick={onSave}>Cancelar</Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar Evento
                </Button>
            </div>
        </form>
        </Form>
    </ScrollArea>
  );
}
