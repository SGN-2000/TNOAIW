
import type { GenerateFixtureOutput } from '@/ai/flows/generate-fixture-flow';

export interface Rsvp {
    id: string;
    name: string;
    timestamp: string;
    paymentStatus: 'pending' | 'paid';
}

export interface TeamMember {
    id: string;
    name: string;
    status: 'pending' | 'accepted' | 'declined';
    paymentStatus: 'pending' | 'paid';
}

export interface Team {
    id: string;
    name: string;
    leaderId: string;
    members: { [userId: string]: TeamMember };
}

export interface Pot {
    id: string;
    name: string;
    teams: { id: string; name: string }[];
}

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string; // ISO string
  location: string;
  authorId: string;
  authorName: string;
  
  requiresRsvp: boolean;
  registrationType?: 'free' | 'paid';
  cost?: number;
  currency?: string;
  registrationDeadline?: string; // ISO string

  participationType: 'individual' | 'team';
  
  rsvps?: { [userId: string]: Rsvp };

  teamFormation?: 'participant' | 'manager';
  teamSize?: {
      min: number;
      max: number;
  };
  teams?: { [teamId: string]: Team };

  classification?: {
    enabled: boolean;
    type?: 'table' | 'groups' | 'elimination';
    drawDate?: string;
    groupsConfig?: {
      drawType: 'random' | 'manual';
      usePots?: boolean;
      knockoutDrawType?: 'random' | 'manual';
      knockoutUsePots?: boolean;
    }
  };
  
  fixture?: GenerateFixtureOutput;
  pots?: Pot[];
}

export interface EventPermissions {
    managers: { [userId: string]: true };
}

export interface EventsData {
    events: { [eventId: string]: Event };
    permissions: EventPermissions;
}

export interface Manager {
  id: string;
  name: string;
  username: string;
  role: 'admin' | 'admin-plus';
}

export type Role = 'owner' | 'manager' | 'member';

export interface CenterMember {
    id: string;
    profile: {
        name: string;
        surname: string;
        username: string;
    };
}
