"use client";

import { useState } from "react";
import MainLayout from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import Step1Details from "@/components/create-center/steps/step-1-details";
import Step2Location from "@/components/create-center/steps/step-2-location";
import Step3AccessMethod from "@/components/create-center/steps/step-3-access-method";
import Step4Identity from "@/components/create-center/steps/step-4-identity";
import { FormProvider, useForm } from "react-hook-form";
import Step5Review from "@/components/create-center/steps/step-5-review";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { ref, push, set, update } from "firebase/database";
import Loader from "@/components/loader";
import { useEffect } from "react";
import * as z from 'zod';
import { zodResolver } from "@hookform/resolvers/zod";


const steps = [
  { id: "Step 1", name: "Detalles del Centro" },
  { id: "Step 2", name: "Ubicación y Nivel" },
  { id: "Step 3", name: "Método de Acceso" },
  { id: "Step 4", name: "Identidad y Cursos" },
  { id: "Step 5", name: "Revisión" },
];

const formSchema = z.object({
  centerName: z.string().min(1, "El nombre del centro es obligatorio."),
  schoolName: z.string().min(1, "El nombre del colegio es obligatorio."),
  country: z.string().min(1, "Debes seleccionar un país."),
  province: z.string().min(1, "Debes seleccionar una provincia."),
  district: z.string().min(1, "Debes seleccionar un distrito."),
  city: z.string().min(1, "El nombre de la ciudad es obligatorio."),
  educationLevel: z.string().min(1, "Debes seleccionar un nivel educativo."),
  accessMethodDocument: z.boolean(),
  accessMethodCode: z.boolean(),
  documentType: z.string().optional(),
  documentNumber: z.string().optional(),
  representativeAnimal: z.string().min(1, "El animal representativo es obligatorio."),
  primaryColor: z.string(),
  secondaryColor: z.string(),
  tertiaryColor: z.string(),
  courses: z.array(z.object({ name: z.string().min(1, "El nombre del curso no puede estar vacío.") })).min(1, "Debes añadir al menos un curso."),
});


export type FormValues = z.infer<typeof formSchema>;


export default function CreateCenterPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const { toast } = useToast();
  const router = useRouter();
  const { user, profileComplete, loading } = useAuth();
  const methods = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      centerName: "",
      schoolName: "",
      country: "",
      province: "",
      district: "",
      city: "",
      educationLevel: "",
      accessMethodDocument: false,
      accessMethodCode: false,
      documentType: "",
      documentNumber: "",
      representativeAnimal: "",
      primaryColor: "#000000",
      secondaryColor: "#ffffff",
      tertiaryColor: "#808080",
      courses: [{ name: "" }],
    },
  });

  useEffect(() => {
    if (!loading && profileComplete === false) {
      router.push('/');
    }
  }, [loading, profileComplete, router]);

  if (loading || profileComplete === false) {
    return <div className="flex min-h-screen items-center justify-center"><Loader /></div>;
  }

  const progress = ((currentStep + 1) / steps.length) * 100;

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep + 1);
    }
  };
  
  const generateUniqueCode = (length: number): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  const onSubmit = async (data: FormValues) => {
    if (!user) {
        toast({
            title: "Error de autenticación",
            description: "Debes iniciar sesión para crear un centro.",
            variant: "destructive",
        });
        return;
    }

    try {
        const centersRef = ref(db, 'centers');
        const newCenterRef = push(centersRef);
        
        const adminCode = generateUniqueCode(20);
        const studentCode = generateUniqueCode(20);
        
        const codes = {
            admin: adminCode,
            student: studentCode,
            ...(data.accessMethodCode && { secondary: generateUniqueCode(8) }),
        };

        const centerData = {
          centerName: data.centerName,
          schoolName: data.schoolName,
          country: data.country,
          province: data.province,
          district: data.district,
          city: data.city,
          educationLevel: data.educationLevel,
          accessMethodDocument: data.accessMethodDocument,
          representativeAnimal: data.representativeAnimal,
          primaryColor: data.primaryColor,
          secondaryColor: data.secondaryColor,
          tertiaryColor: data.tertiaryColor,
          courses: data.courses,
          ownerId: user.uid,
          createdAt: new Date().toISOString(),
          members: {
              admins: {},
              adminsPlus: {},
              students: {},
          },
          codes,
        };

        // Set owner as admin initially. Can be removed if owner is not admin by default.
        (centerData.members.admins as any)[user.uid] = true;


        await set(newCenterRef, centerData);

        const userProfileUpdates: { [key: string]: any } = {};

        // Save owner's profile info within the center
        userProfileUpdates[`/userProfilesInCenter/${newCenterRef.key}/${user.uid}`] = {
            course: data.courses[0]?.name || "", // Assign first course to owner
            ...(data.accessMethodDocument && { 
              documentNumber: data.documentNumber,
              documentType: data.documentType
            })
        };

        await update(ref(db), userProfileUpdates);
        
        toast({
            title: "¡Centro Creado Exitosamente!",
            description: "Redirigiendo a la página de tu centro...",
        });

        router.push(`/center/${newCenterRef.key}`);

    } catch (error) {
        console.error("Error creating center:", error);
        toast({
            title: "Error al Crear el Centro",
            description: "Hubo un problema al guardar los datos. Inténtalo de nuevo.",
            variant: "destructive",
        });
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline text-2xl">Crear un Nuevo Centro de Estudiantes</CardTitle>
              <CardDescription>Sigue los pasos para configurar tu nuevo centro.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <Progress value={progress} className="w-full" />
                <p className="text-sm text-muted-foreground mt-2 text-center">{steps[currentStep].name}</p>
              </div>

              <FormProvider {...methods}>
                <form onSubmit={methods.handleSubmit(onSubmit)}>
                  {currentStep === 0 && <Step1Details nextStep={nextStep} />}
                  {currentStep === 1 && <Step2Location nextStep={nextStep} prevStep={prevStep} />}
                  {currentStep === 2 && <Step3AccessMethod nextStep={nextStep} prevStep={prevStep} />}
                  {currentStep === 3 && <Step4Identity nextStep={nextStep} prevStep={prevStep} />}
                  {currentStep === 4 && <Step5Review prevStep={prevStep} />}
                </form>
              </FormProvider>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
