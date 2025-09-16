"use client";

import { useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Loader2, Check, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormValues } from "@/app/create-center/page";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface Step5ReviewProps {
  prevStep: () => void;
}

const ReviewItem = ({ label, value }: { label: string; value: React.ReactNode }) => (
  !value ? null :
  <div className="flex justify-between items-start py-3">
    <p className="font-medium text-sm text-muted-foreground">{label}</p>
    <div className="text-sm text-right font-medium text-foreground">{value}</div>
  </div>
);

const ColorSwatch = ({ color, name }: { color: string, name: string }) => (
  <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{name}</span>
    <div className="flex items-center gap-2">
      <div
        className="h-5 w-5 rounded-md border"
        style={{ backgroundColor: color }}
      />
      <span className="font-mono text-xs text-muted-foreground">{color.toUpperCase()}</span>
    </div>
  </div>
);

export default function Step5Review({ prevStep }: Step5ReviewProps) {
  const { getValues, formState } = useFormContext<FormValues>();
  const { isSubmitting } = formState;
  const values = getValues();

  return (
    <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>Revisión Final</CardTitle>
                <CardDescription>Revisa que toda la información sea correcta antes de crear el centro.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Detalles del Centro */}
                <div className="space-y-2">
                    <h3 className="font-semibold text-lg">Detalles del Centro</h3>
                    <div className="rounded-md border p-4 space-y-2">
                      <ReviewItem label="Nombre del Centro" value={values.centerName} />
                      <Separator />
                      <ReviewItem label="Nombre del Colegio" value={values.schoolName} />
                    </div>
                </div>

                {/* Ubicación y Nivel */}
                <div className="space-y-2">
                    <h3 className="font-semibold text-lg">Ubicación y Nivel</h3>
                    <div className="rounded-md border p-4 space-y-2">
                      <ReviewItem label="País" value={values.country} />
                      <Separator />
                      <ReviewItem label="Provincia" value={values.province} />
                      <Separator />
                      <ReviewItem label="Distrito/Partido" value={values.district} />
                      <Separator />
                      <ReviewItem label="Ciudad" value={values.city} />
                      <Separator />
                      <ReviewItem label="Nivel Educativo" value={<Badge variant="secondary">{values.educationLevel}</Badge>} />
                    </div>
                </div>
                
                {/* Identidad */}
                <div className="space-y-2">
                    <h3 className="font-semibold text-lg">Identidad y Cursos</h3>
                     <div className="rounded-md border p-4 space-y-2">
                        <ReviewItem label="Animal Representativo" value={values.representativeAnimal} />
                        <Separator />
                        <div className="space-y-3 pt-2">
                           <ColorSwatch color={values.primaryColor} name="Color Primario"/>
                           <ColorSwatch color={values.secondaryColor} name="Color Secundario"/>
                           <ColorSwatch color={values.tertiaryColor} name="Color Terciario"/>
                        </div>
                        <Separator />
                         <div>
                            <p className="font-medium text-sm text-muted-foreground pt-2">Cursos</p>
                            <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-foreground">
                                {values.courses.map((course, index) => (
                                    <li key={index}>{course.name} {index === 0 && <span className="text-xs text-muted-foreground">(Tu curso)</span>}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Método de Acceso */}
                <div className="space-y-2">
                    <h3 className="font-semibold text-lg">Método de Acceso</h3>
                     <div className="rounded-md border p-4 space-y-2">
                        <ReviewItem 
                            label="Verificar con Documento" 
                            value={values.accessMethodDocument ? <Check className="h-5 w-5 text-green-500" /> : <X className="h-5 w-5 text-destructive" />} 
                        />
                        {values.accessMethodDocument && (
                            <>
                                <Separator/>
                                <ReviewItem label="Tu N° de Documento" value="******" />
                            </>
                        )}
                        <Separator />
                        <ReviewItem 
                            label="Código de Acceso Secundario" 
                            value={values.accessMethodCode ? <Check className="h-5 w-5 text-green-500" /> : <X className="h-5 w-5 text-destructive" />} 
                        />
                    </div>
                </div>

            </CardContent>
        </Card>
        
        <div className="flex justify-between mt-8">
            <Button type="button" variant="outline" onClick={prevStep} disabled={isSubmitting}>
            Anterior
            </Button>
            <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Crear Centro
            </Button>
        </div>
    </div>
  );
}
