
'use server';
/**
 * @fileOverview A flow to categorize a financial transaction based on its description.
 *
 * - categorizeTransaction - A function that suggests a category for a transaction.
 * - CategorizeTransactionInput - The input type for the flow.
 * - CategorizeTransactionOutput - The return type for the flow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CategorizeTransactionInputSchema = z.object({
  description: z.string().describe('The description of the financial transaction.'),
  categories: z.array(z.string()).describe('A list of available categories to choose from.'),
});
export type CategorizeTransactionInput = z.infer<typeof CategorizeTransactionInputSchema>;

const CategorizeTransactionOutputSchema = z.object({
  categoryName: z.string().describe('The most appropriate category for the transaction.'),
});
export type CategorizeTransactionOutput = z.infer<typeof CategorizeTransactionOutputSchema>;

export async function categorizeTransaction(input: CategorizeTransactionInput): Promise<CategorizeTransactionOutput> {
  return categorizeTransactionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'categorizeTransactionPrompt',
  input: {schema: CategorizeTransactionInputSchema},
  output: {schema: CategorizeTransactionOutputSchema},
  prompt: `Eres un experto en finanzas y tu tarea es categorizar una transacción.
Analiza la siguiente descripción de la transacción: "{{description}}".

Selecciona la categoría más adecuada de la siguiente lista:
{{#each categories}}
- {{{this}}}
{{/each}}

Devuelve únicamente el nombre de la categoría más apropiada en el formato de salida especificado. Si ninguna categoría parece adecuada, elige la categoría "Varios".
`,
});

const categorizeTransactionFlow = ai.defineFlow(
  {
    name: 'categorizeTransactionFlow',
    inputSchema: CategorizeTransactionInputSchema,
    outputSchema: CategorizeTransactionOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output) {
      return { categoryName: "Varios" };
    }
    return output;
  }
);
