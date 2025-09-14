"use client"

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect, useState } from "react";
import { ref, set, get, child } from "firebase/database";
import { addDays, format, isBefore, differenceInDays, parseISO } from "date-fns";

import MainLayout from '@/components/layout/main-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import Loader from "@/components/loader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";

const profileSchema = z.object({
  username: z.string().min(3, { message: "El nombre de usuario debe tener al menos 3 caracteres." }).max(20, { message: "El nombre de usuario no puede tener más de 20 caracteres." }),
  name: z.string().min(1, { message: "El nombre es obligatorio." }),
  surname: z.string().min(1, { message: "El apellido es obligatorio." }),
});

const EDIT_COOLDOWN_DAYS = 45;

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [nextEditDate, setNextEditDate] = useState<Date | null>(null);

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: "",
      name: "",
      surname: "",
    },
  });

  useEffect(() => {
    if (user) {
      const dbRef = ref(db);
      get(child(dbRef, `users/${user.uid}`)).then((snapshot) => {
        if (snapshot.exists()) {
          const userData = snapshot.val();
          form.reset({
            username: userData.username || "",
            name: userData.name || user.displayName?.split(' ')[0] || "",
            surname: userData.surname || user.displayName?.split(' ').slice(1).join(' ') || ""
          });

          if (userData.profileLastUpdated) {
            const lastUpdated = parseISO(userData.profileLastUpdated);
            const nextAvailableDate = addDays(lastUpdated, EDIT_COOLDOWN_DAYS);
            const now = new Date();

            if (isBefore(now, nextAvailableDate)) {
              setCanEdit(false);
              setNextEditDate(nextAvailableDate);
            } else {
              setCanEdit(true);
            }
          } else {
            setCanEdit(true);
          }

        } else {
           form.reset({
            username: "",
            name: user.displayName?.split(' ')[0] || "",
            surname: user.displayName?.split(' ').slice(1).join(' ') || "",
          });
          setCanEdit(true);
        }
      }).catch((error) => {
        console.error(error);
        toast({
          title: "Error",
          description: "No se pudo cargar tu información de perfil.",
          variant: "destructive",
        });
      }).finally(() => {
        setLoading(false);
      });
    }
  }, [user, form, toast]);

  async function onSubmit(values: z.infer<typeof profileSchema>) {
    if (!user) {
      toast({
        title: "Error",
        description: "Debes iniciar sesión para actualizar tu perfil.",
        variant: "destructive",
      });
      return;
    }
     if (!canEdit) {
      toast({
        title: "No se puede actualizar el perfil",
        description: `Debes esperar hasta el ${nextEditDate ? format(nextEditDate, 'dd/MM/yyyy') : ''} para volver a editar tu perfil.`,
        variant: "destructive",
      });
      return;
    }

    try {
      const now = new Date();
      await set(ref(db, 'users/' + user.uid), {
        username: values.username,
        name: values.name,
        surname: values.surname,
        email: user.email,
        profileLastUpdated: now.toISOString(),
      });
      toast({
        title: "Perfil Actualizado",
        description: "Tu información de perfil ha sido guardada.",
      });
      setCanEdit(false);
      setNextEditDate(addDays(now, EDIT_COOLDOWN_DAYS));

    } catch (error) {
      console.error("Error updating profile: ", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar tu perfil. Inténtalo de nuevo.",
        variant: "destructive",
      });
    }
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline text-2xl">Perfil de Usuario</CardTitle>
              <CardDescription>Administra la configuración de tu cuenta e información personal.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader />
                </div>
              ) : (
                <>
                  {!canEdit && nextEditDate && (
                    <Alert className="mb-6">
                      <Info className="h-4 w-4" />
                      <AlertTitle>No puedes editar tu perfil</AlertTitle>
                      <AlertDescription>
                        Para evitar fraudes, solo puedes cambiar tu información cada {EDIT_COOLDOWN_DAYS} días. Podrás volver a editar tu perfil el {format(nextEditDate, 'dd/MM/yyyy')}.
                      </AlertDescription>
                    </Alert>
                  )}
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <fieldset disabled={!canEdit || form.formState.isSubmitting} className="space-y-6">
                        <FormField
                          control={form.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nombre de usuario</FormLabel>
                              <FormControl>
                                <Input placeholder="ej., juan.perez" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nombre</FormLabel>
                                <FormControl>
                                  <Input placeholder="Tu primer nombre" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="surname"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Apellido</FormLabel>
                                <FormControl>
                                  <Input placeholder="Tu apellido" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </fieldset>
                      <Button type="submit" disabled={!canEdit || form.formState.isSubmitting}>
                        {form.formState.isSubmitting && <Loader className="mr-2 h-4 w-4" />}
                        Guardar Cambios
                      </Button>
                    </form>
                  </Form>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
