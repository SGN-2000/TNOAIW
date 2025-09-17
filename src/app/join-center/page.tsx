"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { ref, get, update, child, push, set } from "firebase/database";
import MainLayout from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import Loader from "@/components/loader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BookUser, ArrowRight, ShieldQuestion, PenSquare } from "lucide-react";
import { documentFormats, CountryKey } from "@/lib/document-formats";

type Step = "enterCode" | "confirm" | "rejoinConfirm" | "verify" | "selectCourse" | "final";

interface CenterData {
    centerName: string;
    schoolName: string;
    country: CountryKey;
    accessMethodDocument: boolean;
    courses: { name: string }[];
    ownerId: string;
    members: {
        admins: { [key: string]: boolean };
        adminsPlus: { [key: string]: boolean };
        students: { [key: string]: boolean };
    }
}

interface FoundCenter {
    id: string;
    data: CenterData;
    role: "admin" | "student";
}


export default function JoinCenterPage() {
    const [step, setStep] = useState<Step>("enterCode");
    const [isLoading, setIsLoading] = useState(false);
    const [code, setCode] = useState("");
    const [foundCenter, setFoundCenter] = useState<FoundCenter | null>(null);
    const [documentNumber, setDocumentNumber] = useState("");
    const [documentType, setDocumentType] = useState("");
    const [selectedCourse, setSelectedCourse] = useState("");
    const [formError, setFormError] = useState<string | null>(null);

    const { user, profileComplete, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        if (!authLoading && (!user || profileComplete === false)) {
            router.push('/profile');
        }
    }, [authLoading, user, profileComplete, router]);

    if (authLoading || !user || profileComplete === false) {
        return (
            <MainLayout>
                <div className="flex flex-1 justify-center items-center p-4">
                    <Loader />
                </div>
            </MainLayout>
        );
    }

    const handleSearchCode = async () => {
        if (code.trim().length === 0) {
            setFormError("Por favor, ingresa un código.");
            return;
        }
        setIsLoading(true);
        setFormError(null);

        try {
            const centersRef = ref(db, 'centers');
            const snapshot = await get(centersRef);

            if (!snapshot.exists()) {
                toast({ title: "Error", description: "No se encontraron centros.", variant: "destructive" });
                setIsLoading(false);
                return;
            }

            let centerFound: FoundCenter | null = null;
            let wasMember = false;
            snapshot.forEach((centerSnapshot) => {
                const centerId = centerSnapshot.key;
                const centerData = centerSnapshot.val();

                if (centerData.codes) {
                    let role: "admin" | "student" | null = null;
                    if (centerData.codes.admin === code) role = 'admin';
                    else if (centerData.codes.student === code) role = 'student';
                    else if (centerData.codes.secondary === code) role = 'student';

                    if (role && centerId) {
                        const allMemberIds = [
                            centerData.ownerId,
                            ...Object.keys(centerData.members.admins || {}),
                            ...Object.keys(centerData.members.adminsPlus || {}),
                            ...Object.keys(centerData.members.students || {}),
                        ];
                        const isMember = allMemberIds.includes(user.uid);
                        
                        if(isMember) {
                             toast({ title: "Ya eres miembro", description: `Ya perteneces al centro "${centerData.centerName}".`, variant: "destructive" });
                             centerFound = null;
                             return; 
                        }

                        centerFound = { id: centerId, data: centerData, role };
                        // Check if user was a member before by checking userProfilesInCenter
                        get(child(ref(db), `userProfilesInCenter/${centerId}/${user.uid}`)).then(profileSnap => {
                            if (profileSnap.exists()) {
                                wasMember = true;
                            }
                        });
                        return;
                    }
                }
            });

            if (centerFound) {
                setFoundCenter(centerFound);
                if (wasMember) {
                    setStep("rejoinConfirm");
                } else {
                    setStep("confirm");
                }
            } else {
                if(!toast.isActive('already-member-toast')) {
                     toast({ id: 'invalid-code-toast', title: "Código Inválido", description: "No se encontró ningún centro con ese código o ya eres miembro.", variant: "destructive" });
                }
            }
        } catch (error) {
            console.error("Error searching for center:", error);
            toast({ title: "Error de Red", description: "No se pudo conectar a la base de datos.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleConfirmation = (confirm: boolean) => {
        if (!confirm) {
            setStep("enterCode");
            setFoundCenter(null);
            setCode("");
            return;
        }

        if (foundCenter?.data.accessMethodDocument) {
            const docInfo = documentFormats[foundCenter.data.country];
            if (docInfo) {
                setDocumentType(docInfo.name);
            }
            setStep("verify");
        } else {
            setStep("selectCourse");
        }
    };

    const handleVerification = () => {
         if (!foundCenter) return;
         const docInfo = documentFormats[foundCenter.data.country];
         const validationRegex = new RegExp(docInfo.regex);

         if (!validationRegex.test(documentNumber)) {
            setFormError(`El número de documento no tiene un formato válido para ${foundCenter.data.country}.`);
            return;
        }

        setFormError(null);
        setStep("selectCourse");
    }
    
    const handleJoinCenter = async () => {
        if(selectedCourse.trim().length === 0){
             setFormError("Debes seleccionar un curso.");
             return;
        }
        if (!foundCenter || !user) return;

        setIsLoading(true);
        setFormError(null);

        try {
            const memberPath = foundCenter.role === 'admin' ? 'admins' : 'students';
            const updates: { [key: string]: any } = {};
            
            updates[`/centers/${foundCenter.id}/members/${memberPath}/${user.uid}`] = true;
            
            const userProfileInCenter: {course: string; documentNumber?: string; documentType?: string} = {
                course: selectedCourse,
            };

            if (foundCenter.data.accessMethodDocument) {
                userProfileInCenter.documentNumber = documentNumber;
                userProfileInCenter.documentType = documentType;
            }
            
            updates[`/userProfilesInCenter/${foundCenter.id}/${user.uid}`] = userProfileInCenter;

            await update(ref(db), updates);

            // Create notifications for owner and admin-plus
            const recipientIds = [foundCenter.data.ownerId, ...Object.keys(foundCenter.data.members.adminsPlus || {})];
            const uniqueRecipientIds = [...new Set(recipientIds)];
            
            const notificationPromises = uniqueRecipientIds.map(recipientId => {
                const notificationsRef = ref(db, `notifications/${recipientId}`);
                const newNotificationRef = push(notificationsRef);
                return set(newNotificationRef, {
                    type: 'NEW_MEMBER',
                    centerId: foundCenter.id,
                    centerName: foundCenter.data.centerName,
                    subjectUserId: user.uid,
                    subjectUserName: user.displayName,
                    timestamp: new Date().toISOString(),
                    read: false,
                });
            });

            await Promise.all(notificationPromises);

            toast({
                title: "¡Te has unido con éxito!",
                description: `Bienvenido a ${foundCenter.data.centerName}.`,
            });
            router.push(`/center/${foundCenter.id}`);

        } catch(error) {
             console.error("Error joining center:", error);
            toast({ title: "Error", description: "No se pudo completar la unión. Inténtalo de nuevo.", variant: "destructive" });
             setIsLoading(false);
        }
    };

    const docInfo = foundCenter ? documentFormats[foundCenter.data.country] : null;

    return (
        <MainLayout>
            <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <div className="max-w-2xl mx-auto">
                    <Card className="shadow-lg">
                        <CardHeader>
                            <CardTitle className="font-headline text-2xl flex items-center gap-2">
                                <BookUser className="h-6 w-6" /> Unirse a un Centro Existente
                            </CardTitle>
                             <CardDescription>Sigue los pasos para unirte a tu centro de estudiantes.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">

                            {/* Step 1: Enter Code */}
                            {step === "enterCode" && (
                                <div className="space-y-4">
                                     <Label htmlFor="join-code">Código de Invitación</Label>
                                     <div className="flex gap-2">
                                        <Input
                                            id="join-code"
                                            placeholder="Pega el código aquí..."
                                            value={code}
                                            onChange={(e) => setCode(e.target.value)}
                                            disabled={isLoading}
                                        />
                                        <Button onClick={handleSearchCode} disabled={isLoading}>
                                            {isLoading ? <Loader className="h-4 w-4" /> : "Buscar"}
                                        </Button>
                                    </div>
                                    {formError && <p className="text-sm text-destructive">{formError}</p>}
                                </div>
                            )}

                            {/* Step 2: Confirmation */}
                            {step === "confirm" && foundCenter && (
                                <div className="space-y-4 text-center">
                                    <Alert>
                                        <PenSquare className="h-4 w-4" />
                                        <AlertTitle>Confirmar Unión</AlertTitle>
                                        <AlertDescription>
                                           Te estás uniendo al centro: <span className="font-bold">{foundCenter.data.centerName}</span> de la institución <span className="font-bold">{foundCenter.data.schoolName}</span>.
                                        </AlertDescription>
                                    </Alert>
                                     <p>¿Deseas continuar?</p>
                                    <div className="flex justify-center gap-4">
                                        <Button variant="outline" onClick={() => handleConfirmation(false)}>No, cancelar</Button>
                                        <Button onClick={() => handleConfirmation(true)}>Sí, continuar</Button>
                                    </div>
                                </div>
                            )}
                            
                             {/* Step 2.5: Re-join Confirmation */}
                            {step === "rejoinConfirm" && foundCenter && (
                                <div className="space-y-4 text-center">
                                    <Alert variant="destructive">
                                        <PenSquare className="h-4 w-4" />
                                        <AlertTitle>Confirmar Reincorporación</AlertTitle>
                                        <AlertDescription>
                                           Parece que ya fuiste miembro de <span className="font-bold">{foundCenter.data.centerName}</span>. ¿Deseas volver a unirte?
                                        </AlertDescription>
                                    </Alert>
                                     <p>¿Deseas continuar?</p>
                                    <div className="flex justify-center gap-4">
                                        <Button variant="outline" onClick={() => handleConfirmation(false)}>No, cancelar</Button>
                                        <Button onClick={() => handleConfirmation(true)}>Sí, volver a unirme</Button>
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Verification */}
                            {step === 'verify' && foundCenter && docInfo && (
                                <div className="space-y-4">
                                     <Alert variant="destructive">
                                        <ShieldQuestion className="h-4 w-4" />
                                        <AlertTitle>Se requiere verificación</AlertTitle>
                                        <AlertDescription>
                                           Este centro requiere que los miembros verifiquen su identidad. Ingresa tu número de documento para continuar.
                                        </AlertDescription>
                                    </Alert>
                                    <Label htmlFor="document-number">{docInfo.name}</Label>
                                    <Input
                                        id="document-number"
                                        placeholder={docInfo.format}
                                        value={documentNumber}
                                        onChange={(e) => setDocumentNumber(e.target.value)}
                                        type={docInfo.type}
                                    />
                                    {formError && <p className="text-sm text-destructive">{formError}</p>}
                                    <Button onClick={handleVerification} className="w-full">
                                        Siguiente <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </div>
                            )}

                            {/* Step 4: Select Course */}
                            {step === 'selectCourse' && foundCenter && (
                                <div className="space-y-4">
                                    <Label htmlFor="course-select">Selecciona tu curso</Label>
                                     <Select onValueChange={setSelectedCourse} value={selectedCourse}>
                                        <SelectTrigger id="course-select">
                                            <SelectValue placeholder="Elige un curso de la lista" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {foundCenter.data.courses.map((course, index) => (
                                                <SelectItem key={index} value={course.name}>
                                                    {course.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                     {formError && <p className="text-sm text-destructive">{formError}</p>}
                                    <Button onClick={handleJoinCenter} disabled={isLoading} className="w-full">
                                        {isLoading ? <Loader className="h-4 w-4" /> : "Finalizar y Unirme"}
                                    </Button>
                                </div>
                            )}

                        </CardContent>
                    </Card>
                </div>
            </div>
        </MainLayout>
    );
}
