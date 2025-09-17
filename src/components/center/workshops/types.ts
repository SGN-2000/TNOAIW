
export interface Workshop {
    id: string;
    title: string;
    description: string;
    date: string; // ISO string
    isVirtual: boolean;
    location: string; // Physical address or URL
    instructor: string;
    authorId: string;
    authorName: string;
}

export type Role = 'owner' | 'manager' | 'student';

export interface Manager {
    id: string;
    name: string;
    username: string;
    role: 'admin' | 'admin-plus';
}
