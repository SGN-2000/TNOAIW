
"use client";

import { useEffect, useState } from 'react';
import { getFinanceProjection, GetFinanceProjectionOutput } from '@/ai/flows/get-finance-projection-flow';
import type { Transaction, Category } from './types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Lightbulb, AlertTriangle, ArrowRight, BrainCircuit } from 'lucide-react';
import Loader from '@/components/loader';

interface FinanceProjectionProps {
  centerId: string;
  transactions: Transaction[];
  categories: Category[];
}

export default function FinanceProjection({ centerId, transactions, categories }: FinanceProjectionProps) {
  const [projection, setProjection] = useState<GetFinanceProjectionOutput | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name || "Varios";
  };


  useEffect(() => {
    const handler = setTimeout(() => {
        async function fetchProjection() {
            if (transactions.length < 3) {
                setError("Se necesitan al menos 3 transacciones para generar una proyección.");
                setLoading(false);
                return;
            }
            
            setLoading(true);
            setError(null);
            
            try {
                const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
                const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

                const result = await getFinanceProjection({
                transactions: transactions.map(t => ({
                    amount: t.amount,
                    type: t.type,
                    category: getCategoryName(t.categoryId),
                    date: t.date,
                    description: t.description,
                })),
                currentBalance: totalIncome - totalExpenses,
                });
                setProjection(result);
            } catch (e) {
                console.error("Error fetching finance projection:", e);
                setError("No se pudo generar la proyección. Inténtalo más tarde.");
            } finally {
                setLoading(false);
            }
        }

        fetchProjection();
    }, 2000); // 2-second debounce

    return () => {
        clearTimeout(handler);
    };
  }, [transactions, centerId, categories]);

  const renderContent = () => {
    if (loading) {
      return <div className="flex items-center justify-center p-8"><Loader /> <p className="ml-4">Analizando finanzas...</p></div>;
    }
    if (error) {
      return <div className="p-8 text-center text-muted-foreground">{error}</div>;
    }
    if (!projection) {
      return <div className="p-8 text-center text-muted-foreground">No hay datos de proyección disponibles.</div>;
    }
    return (
      <div className="space-y-6">
        <div>
          <h4 className="font-semibold text-lg flex items-center gap-2"><BrainCircuit className="h-5 w-5"/>Análisis General</h4>
          <p className="text-sm text-muted-foreground mt-1">{projection.analysis}</p>
        </div>
        <div>
          <h4 className="font-semibold text-lg flex items-center gap-2"><Lightbulb className="h-5 w-5 text-yellow-500"/>Consejos</h4>
          <ul className="list-disc pl-5 mt-2 space-y-2 text-sm">
            {projection.recommendations.map((rec, index) => <li key={index}>{rec}</li>)}
          </ul>
        </div>
        {projection.alerts.length > 0 && (
          <div>
            <h4 className="font-semibold text-lg flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive"/>Alertas</h4>
            <ul className="list-disc pl-5 mt-2 space-y-2 text-sm">
              {projection.alerts.map((alert, index) => <li key={index} className="text-amber-700">{alert}</li>)}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Proyección Financiera IA</CardTitle>
        <CardDescription>Análisis y predicciones generadas por inteligencia artificial.</CardDescription>
      </CardHeader>
      <CardContent>
        {renderContent()}
         <Alert variant="destructive" className="mt-8 text-center">
            <AlertTitle className="font-bold text-lg">Descargo de Responsabilidad</AlertTitle>
            <AlertDescription className="text-black font-semibold">
                Esta proyección es generada por inteligencia artificial y debe ser usada como guía. Negroni Studios no se hace responsable de pérdidas o de ganancias.
            </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
