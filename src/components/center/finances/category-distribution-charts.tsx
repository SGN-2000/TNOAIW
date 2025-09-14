
"use client";

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { Transaction, Category } from './types';

interface CategoryDistributionChartsProps {
  transactions: Transaction[];
  categories: Category[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF1943', '#19A2FF', '#FFD700'];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-background border shadow-sm rounded-md p-2 text-sm">
        <p className="font-bold">{data.name}</p>
        <p>Monto: <span className="font-semibold">${data.value.toLocaleString()}</span></p>
        <p>Porcentaje: <span className="font-semibold">{data.percentage.toFixed(2)}%</span></p>
      </div>
    );
  }
  return null;
};


const renderChart = (title: string, data: any[]) => {
    const hasData = data.some(d => d.value > 0);
    return (
        <div className="w-full">
            <h3 className="text-center font-semibold mb-2">{title}</h3>
            <div className="h-64 w-full">
                {hasData ? (
                    <ResponsiveContainer>
                        <PieChart>
                            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex h-full items-center justify-center">
                        <p className="text-sm text-muted-foreground">Sin datos.</p>
                    </div>
                )}
            </div>
        </div>
    )
}

export default function CategoryDistributionCharts({ transactions, categories }: CategoryDistributionChartsProps) {
  const { incomeData, expenseData } = useMemo(() => {
    const getCategoryName = (categoryId: string) => categories.find(c => c.id === categoryId)?.name || "Sin categoría";

    const incomeByCategory: { [key: string]: number } = {};
    const expenseByCategory: { [key: string]: number } = {};

    transactions.forEach(t => {
      const categoryName = getCategoryName(t.categoryId);
      if (t.type === 'income') {
        incomeByCategory[categoryName] = (incomeByCategory[categoryName] || 0) + t.amount;
      } else {
        expenseByCategory[categoryName] = (expenseByCategory[categoryName] || 0) + t.amount;
      }
    });
    
    const totalIncome = Object.values(incomeByCategory).reduce((sum, value) => sum + value, 0);
    const totalExpense = Object.values(expenseByCategory).reduce((sum, value) => sum + value, 0);

    const incomeChartData = Object.entries(incomeByCategory).map(([name, value]) => ({ 
        name, 
        value,
        percentage: totalIncome > 0 ? (value / totalIncome) * 100 : 0
    }));
    const expenseChartData = Object.entries(expenseByCategory).map(([name, value]) => ({ 
        name, 
        value,
        percentage: totalExpense > 0 ? (value / totalExpense) * 100 : 0
    }));

    return { incomeData: incomeChartData, expenseData: expenseChartData };
  }, [transactions, categories]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribución por Categoría</CardTitle>
        <CardDescription>Desglose de ingresos y gastos por cada categoría.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col md:flex-row justify-around items-center gap-4">
        {renderChart("Ingresos", incomeData)}
        {renderChart("Gastos", expenseData)}
      </CardContent>
    </Card>
  );
}
