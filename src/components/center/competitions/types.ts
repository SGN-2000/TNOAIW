export interface Score {
  course: string;
  points: number;
}

export interface Permissions {
  adminsPlusAllowed: boolean;
  managers: { [userId: string]: true };
}

export interface LogEntry {
  id: string;
  timestamp: string;
  reason: string;
  editorName: string;
  changes: {
    course: string;
    points: number;
  }[];
}

export interface Manager {
    id: string;
    name: string;
    username: string;
    role: 'admin-plus' | 'admin';
}

export interface Competition {
  scores: { [courseName: string]: number };
  permissions: Permissions;
  log: { [logId: string]: LogEntry };
}
