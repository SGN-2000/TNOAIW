
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect, useState } from "react";
import { ref, set, push, update } from "firebase/database";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Check, ChevronsUpDown, Loader2, PlusCircle } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { categorizeTransaction } from "@/ai/flows/categorize-transaction-flow";
import type { Category, Transaction } from "./types";

const transactionSchema = z.object({
  type: z.enum(["income", "expense"], { required_error: "Debes seleccionar un tipo." }),
  amount: z.coerce.number().positive("El monto debe ser un número positivo."),
  description: z.string().min(4, "La descripción debe tener al menos 4 caracteres.").max(25, "La descripción no puede tener más de 25 caracteres."),
  date: z.date({ required_error: "La fecha es obligatoria." }),
  categoryId: z.string().min(1, "Debes seleccionar una categoría."),
});

interface TransactionFormProps {
  centerId: string;
  categories: Category[];
  onTransactionSaved: () => void;
  onCancel: () => void;
  existingTransaction?: Transaction | null;
}

export default function TransactionForm({
  centerId,
  categories,
  onTransactionSaved,
  onCancel,
  existingTransaction,
}: TransactionFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [openCategorySelector, setOpenCategorySelector] = useState(false);
  const [newCategory, setNewCategory] = useState("");

  const form = useForm<z.infer<typeof transactionSchema>>({
    resolver: zodResolver(transactionSchema),
    defaultValues: existingTransaction
      ? {
          ...existingTransaction,
          date: new Date(existingTransaction.date),
        }
      : {
          type: "expense",
          amount: 0,
          description: "",
          date: new Date(),
          categoryId: "",
        },
  });

  const descriptionWatch = form.watch("description");

  useEffect(() => {
    const handler = setTimeout(async () => {
      if (descriptionWatch && descriptionWatch.length > 10 && !form.getValues('categoryId')) {
        setIsCategorizing(true);
        try {
          const result = await categorizeTransaction({
            description: descriptionWatch,
            categories: categories.map(c => c.name),
          });
          const foundCategory = categories.find(c => c.name === result.categoryName);
          if (foundCategory) {
            form.setValue("categoryId", foundCategory.id, { shouldValidate: true });
          }
        } catch (error) {
          console.error("AI categorization failed:", error);
        } finally {
          setIsCategorizing(false);
        }
      }
    }, 1000);

    return () => clearTimeout(handler);
  }, [descriptionWatch, categories, form]);

  const handleAddCategory = async () => {
    if (!newCategory.trim() || !user) return;
    const categoryRef = ref(db, `centers/${centerId}/finances/categories`);
    const newCategoryRef = push(categoryRef);
    const newCat = { id: newCategoryRef.key!, name: newCategory.trim() };

    await set(newCategoryRef, newCat);
    form.setValue("categoryId", newCat.id);
    setNewCategory("");
    setOpenCategorySelector(false);
    toast({ title: "Categoría añadida" });
  };
  
  const onSubmit = async (values: z.infer<typeof transactionSchema>) => {
    if (!user) return;
    
    const transactionData = {
      ...values,
      date: values.date.toISOString(),
      authorId: user.uid,
    };

    try {
      if (existingTransaction) {
        // Update
        const transactionRef = ref(db, `centers/${centerId}/finances/transactions/${existingTransaction.id}`);
        await update(transactionRef, transactionData);
        toast({ title: "Transacción actualizada" });
      } else {
        // Create
        const newTransactionRef = push(ref(db, `centers/${centerId}/finances/transactions`));
        await set(newTransactionRef, { ...transactionData, id: newTransactionRef.key });
        toast({ title: "Transacción añadida" });
      }
      onTransactionSaved();
    } catch (error) {
      console.error("Error saving transaction:", error);
      toast({ title: "Error", description: "No se pudo guardar la transacción.", variant: "destructive" });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Tipo de Transacción</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex space-x-4"
                >
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl><RadioGroupItem value="expense" /></FormControl>
                    <FormLabel className="font-normal">Gasto</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl><RadioGroupItem value="income" /></FormControl>
                    <FormLabel className="font-normal">Ingreso</FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción</FormLabel>
              <FormControl>
                <Textarea placeholder="Ej: Bebidas para evento" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
                <FormItem className="flex flex-col">
                <FormLabel>Categoría</FormLabel>
                <Popover open={openCategorySelector} onOpenChange={setOpenCategorySelector}>
                    <PopoverTrigger asChild>
                    <FormControl>
                        <Button
                        variant="outline"
                        role="combobox"
                        className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                        >
                        {field.value
                            ? categories.find(c => c.id === field.value)?.name
                            : "Selecciona una categoría"}
                        {isCategorizing ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />}
                        </Button>
                    </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                            <CommandInput placeholder="Buscar o crear categoría..." />
                             <CommandList>
                                <CommandEmpty>
                                    <div className="p-4 space-y-2">
                                        <p className="text-sm text-muted-foreground">No se encontró la categoría.</p>
                                        <div className="flex items-center gap-2">
                                            <Input 
                                                value={newCategory} 
                                                onChange={(e) => setNewCategory(e.target.value)}
                                                placeholder="Nombre de la nueva categoría"
                                            />
                                            <Button onClick={handleAddCategory} size="sm">
                                                <PlusCircle className="mr-2 h-4 w-4"/> Añadir
                                            </Button>
                                        </div>
                                    </div>
                                </CommandEmpty>
                                <CommandGroup>
                                    {categories.map((category) => (
                                    <CommandItem
                                        value={category.name}
                                        key={category.id}
                                        onSelect={() => {
                                            form.setValue("categoryId", category.id)
                                            setOpenCategorySelector(false)
                                        }}
                                    >
                                        <Check className={cn("mr-2 h-4 w-4", category.id === field.value ? "opacity-100" : "opacity-0")} />
                                        {category.name}
                                    </CommandItem>
                                    ))}
                                </CommandGroup>
                             </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
                <FormMessage />
                </FormItem>
            )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Monto</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="0.00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Fecha</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                        {field.value ? format(field.value, "PPP", { locale: es }) : <span>Elige una fecha</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={form.formState.isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Guardar Transacción"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

    
    