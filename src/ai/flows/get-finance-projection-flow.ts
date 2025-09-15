
'use server';
/**
 * @fileOverview A flow to generate a financial projection based on transaction history.
 *
 * - getFinanceProjection - A function that returns a financial analysis and projection.
 * - GetFinanceProjectionInput - The input type for the function.
 * - GetFinanceProjectionOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TransactionSchema = z.object({
    amount: z.number(),
    type: z.enum(['income', 'expense']),
    category: z.string(),
    date: z.string(),
    description: z.string(),
});

const GetFinanceProjectionInputSchema = z.object({
  transactions: z.array(TransactionSchema).describe('Un historial de transacciones financieras.'),
  currentBalance: z.number().describe('El saldo actual.'),
});
export type GetFinanceProjectionInput = z.infer<typeof GetFinanceProjectionInputSchema>;

const GetFinanceProjectionOutputSchema = z.object({
  analysis: z.string().describe('Un análisis conciso del estado financiero actual basado en las transacciones y el saldo.'),
  recommendations: z.array(z.string()).describe('Una lista de 3 a 5 consejos o recomendaciones accionables para mejorar la salud financiera.'),
  alerts: z.array(z.string()).describe('Una lista de 1 a 3 alertas importantes sobre posibles riesgos financieros, como gastos excesivos en una categoría o un saldo peligrosamente bajo.'),
});
export type GetFinanceProjectionOutput = z.infer<typeof GetFinanceProjectionOutputSchema>;

export async function getFinanceProjection(input: GetFinanceProjectionInput): Promise<GetFinanceProjectionOutput> {
  return getFinanceProjectionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'getFinanceProjectionPrompt',
  input: {schema: GetFinanceProjectionInputSchema},
  output: {schema: GetFinanceProjectionOutputSchema},
  prompt: `Eres un asesor financiero experto para un centro de estudiantes. Tu tarea es analizar el historial de transacciones y el saldo actual para proporcionar un análisis claro, recomendaciones útiles y alertas críticas.

DATOS FINANCIEROS:
- Saldo Actual: {{currentBalance}}
- Historial de Transacciones:
{{#each transactions}}
  - {{date}}: {{description}} ({{category}}) - {{type}} de {{amount}}
{{/each}}

INSTRUCCIONES:
1.  **Análisis (analysis):** Escribe un párrafo breve (2-3 frases) que resuma la situación financiera actual. Menciona si la tendencia es positiva o negativa.
2.  **Recomendaciones (recommendations):** Proporciona una lista de 3 a 5 consejos prácticos y específicos para el centro de estudiantes. Por ejemplo, en lugar de "gastar menos", sugiere "considerar renegociar el costo de los materiales para eventos".
3.  **Alertas (alerts):** Identifica de 1 a 3 riesgos financieros clave. Si no hay riesgos graves, genera una alerta de bajo impacto como "Vigilar gastos menores en la categoría 'Varios'".

El idioma de toda la salida debe ser español.
`,
});

const getFinanceProjectionFlow = ai.defineFlow(
  {
    name: 'getFinanceProjectionFlow',
    inputSchema: GetFinanceProjectionInputSchema,
    outputSchema: GetFinanceProjectionOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error("La IA no pudo generar una proyección financiera.");
    }
    return output;
  }
);
