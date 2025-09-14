"use client";

import { useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { FormValues } from "@/app/create-center/page";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck, Ticket } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { documentFormats, CountryKey } from "@/lib/document-formats";
import { useEffect } from "react";

interface Step3AccessMethodProps {
  nextStep: () => void;
  prevStep: () => void;
}

export default function Step3AccessMethod({ nextStep, prevStep }: Step3AccessMethodProps) {
  const { control, trigger, watch, setValue } = useFormContext<FormValues>();
  const accessMethodDocument = watch("accessMethodDocument");
  const selectedCountry = watch("country") as CountryKey;
  
  const docInfo = documentFormats[selectedCountry] || null;

  useEffect(() => {
    if (docInfo) {
      setValue("documentType", docInfo.name);
    }
  }, [docInfo, setValue]);


  const handleNext = async () => {
    const fieldsToValidate: (keyof FormValues)[] = ["accessMethodDocument", "accessMethodCode"];
    if (accessMethodDocument) {
        fieldsToValidate.push('documentNumber');
    }
    const isValid = await trigger(fieldsToValidate);
    if (isValid) {
      nextStep();
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <FormLabel>¿Qué se pedirá para unirse a este centro?</FormLabel>
        <FormDescription>
            Elige cómo los nuevos miembros se verificarán para unirse. Por defecto, todos los centros tienen un código de acceso principal.
        </FormDescription>
      </div>

      <div className="space-y-4">
        <FormField
          control={control}
          name="accessMethodDocument"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
               <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(checked) => {
                    field.onChange(checked);
                    if (!checked) {
                      setValue("documentNumber", "");
                      setValue("documentType", "");
                    }
                  }}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="flex items-center">
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Verificar con Documento
                </FormLabel>
                <FormDescription>
                  Los miembros deberán verificar su identidad con su documento.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />
         <FormField
          control={control}
          name="accessMethodCode"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
               <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="flex items-center">
                  <Ticket className="mr-2 h-4 w-4" />
                   Añadir un código de acceso secundario
                </FormLabel>
                <FormDescription>
                  Genera un código adicional de 8 caracteres para otra capa de seguridad.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />
      </div>
      
      {accessMethodDocument && docInfo && (
        <Card>
            <CardContent className="pt-6">
                 <FormField
                    control={control}
                    name="documentNumber"
                    rules={{ 
                      required: "Tu número de documento es obligatorio.",
                      pattern: {
                        value: new RegExp(docInfo.regex),
                        message: `Formato de documento inválido para ${selectedCountry}.`
                      }
                    }}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Tu Número de {docInfo.name}</FormLabel>
                             <FormDescription>
                                Como propietario, debes verificar tu identidad. Esto no se compartirá públicamente.
                            </FormDescription>
                            <FormControl className="mt-2">
                                <Input 
                                  placeholder={docInfo.format} 
                                  {...field} 
                                  type={docInfo.type}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </CardContent>
        </Card>
      )}

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
