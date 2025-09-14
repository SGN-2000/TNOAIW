"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { ref, push, set } from "firebase/database";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, PlusCircle, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

const surveySchema = z.object({
  question: z.string().min(10, "La pregunta debe tener al menos 10 caracteres."),
  options: z.array(
    z.object({
      text: z.string().min(1, "La opción no puede estar vacía."),
    })
  ).min(2, "Debes tener al menos 2 opciones."),
  deadline: z.date({
    required_error: "La fecha límite es obligatoria.",
  }),
});

interface CreateSurveyFormProps {
  centerId: string;
  onSurveyCreated?: () => void;
}

export default function CreateSurveyForm({ centerId, onSurveyCreated }: CreateSurveyFormProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    
    const form = useForm<z.infer<typeof surveySchema>>({
        resolver: zodResolver(surveySchema),
        defaultValues: {
            question: "",
            options: [{ text: "" }, { text: "" }],
            deadline: undefined,
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "options",
    });

    const onSubmit = async (values: z.infer<typeof surveySchema>) => {
        if (!user) return;

        try {
            const surveysRef = ref(db, `centers/${centerId}/surveys`);
            const newSurveyRef = push(surveysRef);
            
            await set(newSurveyRef, {
                question: values.question,
                options: values.options,
                deadline: values.deadline.toISOString(),
                createdAt: new Date().toISOString(),
                authorId: user.uid,
                authorName: user.displayName || 'Anónimo',
                votes: {},
            });

            toast({
                title: "Encuesta Creada",
                description: "La encuesta ya está disponible para que todos voten.",
            });
            onSurveyCreated?.();
        } catch (error) {
            console.error("Error creating survey:", error);
            toast({
                title: "Error",
                description: "No se pudo crear la encuesta.",
                variant: "destructive",
            });
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                    control={form.control}
                    name="question"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Pregunta de la Encuesta</FormLabel>
                            <FormControl>
                                <Textarea placeholder="Ej: ¿Qué día prefieren para la reunión general?" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div>
                    <FormLabel>Opciones de Respuesta</FormLabel>
                    <div className="space-y-2 mt-2">
                        {fields.map((field, index) => (
                            <FormField
                                key={field.id}
                                control={form.control}
                                name={`options.${index}.text`}
                                render={({ field }) => (
                                    <FormItem className="flex items-center gap-2">
                                        <FormControl>
                                            <Input placeholder={`Opción ${index + 1}`} {...field} />
                                        </FormControl>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => remove(index)}
                                            disabled={fields.length <= 2}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </FormItem>
                                )}
                            />
                        ))}
                    </div>
                     <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => append({ text: "" })}
                    >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Añadir Opción
                    </Button>
                </div>
                
                 <FormField
                    control={form.control}
                    name="deadline"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                        <FormLabel>Fecha Límite</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                            <FormControl>
                                <Button
                                variant={"outline"}
                                className={cn(
                                    "w-[240px] pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                )}
                                >
                                {field.value ? (
                                    format(field.value, "PPP", { locale: es })
                                ) : (
                                    <span>Elige una fecha</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => date < new Date() || date < new Date("1900-01-01")}
                                initialFocus
                            />
                            </PopoverContent>
                        </Popover>
                        <FormDescription>
                            Después de esta fecha, nadie podrá votar.
                        </FormDescription>
                        <FormMessage />
                        </FormItem>
                    )}
                    />

                <div className="flex justify-end">
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? "Creando..." : "Crear Encuesta"}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
