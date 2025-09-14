"use client";

import { useFormContext, useFieldArray, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { FormValues } from "@/app/create-center/page";
import { PlusCircle, Trash2, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";

interface Step4IdentityProps {
  nextStep: () => void;
  prevStep: () => void;
}

export default function Step4Identity({ nextStep, prevStep }: Step4IdentityProps) {
  const { control, register, trigger, formState: { errors } } = useFormContext<FormValues>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: "courses",
  });
  
  const handleNext = async () => {
    const isValid = await trigger(["representativeAnimal", "primaryColor", "secondaryColor", "tertiaryColor", "courses"]);
    if (isValid) {
      nextStep();
    }
  };

  return (
    <div className="space-y-6">
      <FormField
        control={control}
        name="representativeAnimal"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Animal Representativo</FormLabel>
            <FormControl>
              <Input placeholder="Ej., Dragón, Tigre, Fénix..." {...field} />
            </FormControl>
             <FormDescription>
              Puede ser cualquier animal: real, mitológico o extinto.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FormField
          control={control}
          name="primaryColor"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Color Primario</FormLabel>
              <FormControl>
                <Input type="color" {...field} className="p-1 h-10"/>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="secondaryColor"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Color Secundario</FormLabel>
              <FormControl>
                 <Input type="color" {...field} className="p-1 h-10"/>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="tertiaryColor"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Color Terciario</FormLabel>
              <FormControl>
                 <Input type="color" {...field} className="p-1 h-10"/>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div>
        <Label>Cursos del Colegio</Label>
         <p className="text-sm text-muted-foreground mt-1 mb-2">
            Añade los cursos de tu colegio. El primer curso de la lista será asignado automáticamente como tu curso.
          </p>
        <div className="space-y-4 mt-2">
          {fields.map((field, index) => (
            <div key={field.id} className="flex items-center gap-2">
              <Input
                {...register(`courses.${index}.name`)}
                placeholder={index === 0 ? "Tu curso (ej., 5to A)" : `Nombre del curso ${index + 1}`}
                className="flex-grow"
              />
              <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length <= 1}>
                <Trash2 className="h-4 w-4 text-destructive" />
                 <span className="sr-only">Eliminar curso</span>
              </Button>
            </div>
          ))}
          {errors.courses && <p className="text-sm font-medium text-destructive">{errors.courses.message || (errors.courses as any)?.[0]?.name.message}</p>}
        </div>
         <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => append({ name: "" })}
        >
            <PlusCircle className="mr-2 h-4 w-4" />
            Añadir Curso
        </Button>
      </div>


      <div className="flex justify-between mt-8">
        <Button type="button" variant="outline" onClick={prevStep}>
          Anterior
        </Button>
        <Button type="button" onClick={handleNext}>
          Siguiente
        </Button>
      </div>
    </div>
  );
}
