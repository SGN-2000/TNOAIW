
"use client";

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { Transaction } from './types';

interface FinanceChartProps {
  transactions: Transaction[];
}

const COLORS = ['#00C49F', '#FF8042']; // Green for Income, Red-Orange for Expenses

export default function FinanceChart({ transactions }: FinanceChartProps) {
  const chartData = useMemo(() => {
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    return [
      { name: 'Ingresos', value: totalIncome },
      { name: 'Gastos', value: totalExpenses },
    ];
  }, [transactions]);

  const hasData = chartData.some(data => data.value > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ingresos vs. Gastos</CardTitle>
        <CardDescription>Comparación del total de ingresos y gastos.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          {hasData ? (
            <ResponsiveContainer>
              <PieChart>
                <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8" label>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-muted-foreground">No hay datos para mostrar en el gráfico.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
