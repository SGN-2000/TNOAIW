"use client";

import { useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormValues } from "@/app/create-center/page";

interface Step1DetailsProps {
  nextStep: () => void;
}

const countries = [
    "Argentina", "Bolivia", "Chile", "Colombia", "Costa Rica", "Cuba", 
    "Ecuador", "El Salvador", "España", "Guatemala", "Honduras", "México", 
    "Nicaragua", "Paraguay", "Perú", "Puerto Rico", "República Dominicana", 
    "Uruguay", "Venezuela"
];

export default function Step1Details({ nextStep }: Step1DetailsProps) {
  const { control, trigger } = useFormContext<FormValues>();

  const handleNext = async () => {
    const isValid = await trigger(["centerName", "schoolName", "country"]);
    if (isValid) {
      nextStep();
    }
  };

  return (
    <div className="space-y-6">
      <FormField
        control={control}
        name="centerName"
        rules={{ required: "El nombre del centro es obligatorio." }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nombre del Centro de Estudiantes</FormLabel>
            <FormControl>
              <Input placeholder="Ej., Centro de Estudiantes 'El Futuro'" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="schoolName"
        rules={{ required: "El nombre del colegio es obligatorio." }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nombre de tu Colegio</FormLabel>
            <FormControl>
              <Input placeholder="Ej., Escuela Secundaria N°5" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
       <FormField
        control={control}
        name="country"
        rules={{ required: "Debes seleccionar un país." }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>País</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona tu país" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {countries.map((country) => (
                  <SelectItem key={country} value={country}>
                    {country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="flex justify-end">
        <Button type="button" onClick={handleNext}>
          Siguiente
        </Button>
      </div>
    </div>
  );
}
