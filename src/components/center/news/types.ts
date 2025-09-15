
export interface NewsPermissions {
  inCharge: string; // The user ID of the person in charge
  members: { [userId: string]: true };
}

export interface UserProfile {
    id: string;
    name: string;
    username: string;
}

export interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  authorPhotoURL?: string;
  content: string;
  createdAt: string;
  likes: { [userId: string]: boolean };
  repliesCount?: number;
  replies?: { [replyId: string]: Comment };
}
