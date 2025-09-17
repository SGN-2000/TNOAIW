
'use server';
/**
 * @fileOverview A flow to generate a tournament fixture from a natural language description.
 *
 * - generateFixture - A function that creates a tournament structure.
 * - GenerateFixtureInput - The input type for the flow.
 * - GenerateFixtureOutput - The return type for the flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const TeamSchema = z.object({
  id: z.string(),
  name: z.string(),
});

const GenerateFixtureInputSchema = z.object({
  teams: z.array(TeamSchema).describe('The list of teams participating in the tournament.'),
  description: z.string().describe('A natural language description of the desired tournament format.'),
  classificationType: z.enum(['groups', 'elimination']).describe('The type of tournament classification.'),
  availableDates: z.array(z.string()).describe('List of available dates for matches (e.g., ["2024-08-10", "2024-08-11"]).'),
  availableTimes: z.array(z.string()).describe('List of available times for matches (e.g., ["14:00", "16:00"]).'),
  availableLocations: z.array(z.string()).describe('List of available locations for matches (e.g., ["Cancha 1", "Cancha 2"]).'),
});
export type GenerateFixtureInput = z.infer<typeof GenerateFixtureInputSchema>;

const MatchSchema = z.object({
  id: z.string(),
  team1: z.object({ id: z.string(), name: z.string() }).optional(),
  team2: z.object({ id: z.string(), name: z.string() }).optional(),
  team1Placeholder: z.string().optional().describe("Placeholder for team 1, e.g., '1st Group A'"),
  team2Placeholder: z.string().optional().describe("Placeholder for team 2, e.g., '2nd Group B'"),
  score1: z.number().optional(),
  score2: z.number().optional(),
  winnerId: z.string().optional(),
  date: z.string().optional().describe('Date of the match, from the available dates.'),
  time: z.string().optional().describe('Time of the match, from the available times.'),
  location: z.string().optional().describe('Location of the match, from the available locations.'),
});

const GroupSchema = z.object({
  name: z.string().describe("The name of the group, e.g., 'Group A'"),
  teams: z.array(TeamSchema),
  matches: z.array(MatchSchema),
});

const KnockoutRoundSchema = z.object({
  name: z.string().describe("The name of the round, e.g., 'Quarter-finals'"),
  matches: z.array(MatchSchema),
});

const GenerateFixtureOutputSchema = z.object({
  groups: z.array(GroupSchema).optional().describe('The group stage structure, if applicable.'),
  knockoutRounds: z.array(KnockoutRoundSchema).describe('The knockout stage structure.'),
});
export type GenerateFixtureOutput = z.infer<typeof GenerateFixtureOutputSchema>;
export type { Group, Match };

export async function generateFixture(input: GenerateFixtureInput): Promise<GenerateFixtureOutput> {
  return generateFixtureFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateFixturePrompt',
  input: { schema: GenerateFixtureInputSchema },
  output: { schema: GenerateFixtureOutputSchema },
  prompt: `You are a sports tournament organizer. Your task is to create a fixture for a tournament based on a list of teams, a user's description, and resource availability.

**IMPORTANT**: Use the exact team names provided in the 'teams' list for the matches. Do not invent new teams.

Tournament Type: {{classificationType}}
Teams: {{#each teams}}{{{this.name}}}{{#unless @last}}, {{/unless}}{{/each}}

User's format description: "{{description}}"

Available Resources:
- Dates: {{#each availableDates}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
- Times: {{#each availableTimes}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
- Locations: {{#each availableLocations}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}

Instructions:
1.  **Analyze the description**: Understand the structure (groups, knockout rounds, how many teams advance, etc.).
2.  **Distribute Teams**: If there are groups, distribute the provided teams among them as evenly as possible.
3.  **Generate and Schedule Matches**:
    *   For every match you create, assign a valid date, time, and location from the "Available Resources" lists.
    *   Distribute the matches as evenly as possible across the available resources. For example, don't schedule all matches on the same day if multiple days are available.
    *   For group stages, create a round-robin schedule where each team plays every other team in its group once.
    *   For knockout stages, create the matches for each round.
4.  **Use Placeholders**: For knockout matches that depend on group results, use the 'team1Placeholder' and 'team2Placeholder' fields (e.g., "1st Group A", "2nd Group B"). Do not assign actual teams to these matches yet, but still assign them a date, time, and location.
5.  **Output Structure**:
    *   If the type is 'groups', the output must contain both 'groups' and 'knockoutRounds' arrays.
    *   If the type is 'elimination', the output should only contain the 'knockoutRounds' array. Distribute teams directly into the first-round matches.
6.  Ensure every match has a unique ID.

Return the complete, scheduled fixture in the specified JSON format.`,
});


const generateFixtureFlow = ai.defineFlow(
  {
    name: 'generateFixtureFlow',
    inputSchema: GenerateFixtureInputSchema,
    outputSchema: GenerateFixtureOutputSchema,
  },
  async (input) => {
    // Generate test teams to simplify for the AI, but keep original IDs
    const testTeams = input.teams.map((team, i) => ({
      id: team.id, // Keep original ID
      name: `Equipo ${i + 1}`,
    }));

    const testInput = { ...input, teams: testTeams };

    const { output } = await prompt(testInput);
    if (!output) {
      throw new Error("The AI could not generate a fixture. Please try again with a more detailed description.");
    }
    
    // Map the original team names back to the fixture
    const originalTeamMap = new Map(input.teams.map(t => [t.id, t.name]));

    const replaceTeamNames = (match: Match) => {
      if (match.team1 && originalTeamMap.has(match.team1.id)) {
        match.team1.name = originalTeamMap.get(match.team1.id)!;
      }
      if (match.team2 && originalTeamMap.has(match.team2.id)) {
        match.team2.name = originalTeamMap.get(match.team2.id)!;
      }
      return match;
    };
    
    if (output.groups) {
      output.groups.forEach(group => {
        group.teams.forEach(team => {
          if (originalTeamMap.has(team.id)) {
            team.name = originalTeamMap.get(team.id)!;
          }
        });
        group.matches.forEach(replaceTeamNames);
      });
    }

    if (output.knockoutRounds) {
      output.knockoutRounds.forEach(round => {
        round.matches.forEach(replaceTeamNames);
      });
    }

    return output;
  }
);
