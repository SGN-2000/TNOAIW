'use server';
/**
 * @fileOverview A flow to get districts/municipalities for a given country and province.
 *
 * - getDistricts - A function that returns a list of districts.
 * - GetDistrictsInput - The input type for the getDistricts function.
 * - GetDistrictsOutput - The return type for the getDistricts function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GetDistrictsInputSchema = z.object({
  country: z.string().describe('The country.'),
  province: z.string().describe('The province, state, or department.'),
});
export type GetDistrictsInput = z.infer<typeof GetDistrictsInputSchema>;

const GetDistrictsOutputSchema = z.array(z.string()).describe('A list of districts, municipalities, or partidos.');
export type GetDistrictsOutput = z.infer<typeof GetDistrictsOutputSchema>;

export async function getDistricts(input: GetDistrictsInput): Promise<GetDistrictsOutput> {
  return getDistrictsFlow(input);
}

const getDistrictsPrompt = ai.definePrompt({
  name: 'getDistrictsPrompt',
  input: {schema: GetDistrictsInputSchema},
  output: {
    format: 'json',
    schema: GetDistrictsOutputSchema,
  },
  prompt: `You are an expert geographer. The user wants a list of the primary administrative divisions (such as districts, municipalities, or partidos) for a specific province/state within a country.

Given the country '{{{country}}}' and the province/state '{{{province}}}', return a JSON array of strings, where each string is the name of an administrative division.

For example, for the province of 'Buenos Aires' in 'Argentina', you would return a list of its "partidos". For 'Madrid' in 'España', you would return its districts.

Return only the JSON array.
`,
});

const getDistrictsFlow = ai.defineFlow(
  {
    name: 'getDistrictsFlow',
    inputSchema: GetDistrictsInputSchema,
    outputSchema: GetDistrictsOutputSchema,
  },
  async (input) => {
    const {output} = await getDistrictsPrompt(input);
    if (!output) {
      return [];
    }
    // The model should return a sorted list, but we sort it just in case.
    return output.sort();
  }
);
