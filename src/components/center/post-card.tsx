"use client";

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import type { Post } from '@/components/center/post-card';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MessageSquare, ThumbsDown, ThumbsUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { ref, runTransaction } from 'firebase/database';
import { cn } from '@/lib/utils';
import PostComments from './post-comments';

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorPhotoURL?: string;
  content: string;
  createdAt: string;
  likes: { [userId: string]: boolean };
  dislikes: { [userId: string]: boolean };
  commentsCount: number;
}


interface PostCardProps {
  post: Post;
  centerId: string;
}

export default function PostCard({ post, centerId }: PostCardProps) {
  const { user } = useAuth();
  const [showComments, setShowComments] = useState(false);
  
  const getInitials = (name: string | null | undefined) => {
    if (!name) return "A";
    const names = name.split(" ");
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name[0].toUpperCase();
  };

  const handleReaction = (reactionType: 'likes' | 'dislikes') => {
    if (!user) return;

    const postRef = ref(db, `centers/${centerId}/posts/${post.id}`);
    runTransaction(postRef, (currentPost) => {
      if (currentPost) {
        if (!currentPost.likes) currentPost.likes = {};
        if (!currentPost.dislikes) currentPost.dislikes = {};

        const oppositeReaction = reactionType === 'likes' ? 'dislikes' : 'likes';

        if (currentPost[reactionType][user.uid]) {
          currentPost[reactionType][user.uid] = null;
        } else {
          currentPost[reactionType][user.uid] = true;
          if (currentPost[oppositeReaction][user.uid]) {
            currentPost[oppositeReaction][user.uid] = null;
          }
        }
      }
      return currentPost;
    });
  };

  const likeCount = post.likes ? Object.values(post.likes).filter(Boolean).length : 0;
  const dislikeCount = post.dislikes ? Object.values(post.dislikes).filter(Boolean).length : 0;

  const userHasLiked = user && post.likes && post.likes[user.uid];
  const userHasDisliked = user && post.dislikes && post.dislikes[user.uid];


  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={post.authorPhotoURL} alt={post.authorName} />
            <AvatarFallback>{getInitials(post.authorName)}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-base font-bold">{post.authorName}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: es })}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm whitespace-pre-wrap">{post.content}</p>
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-4">
        <div className="flex gap-4">
           <Button variant="ghost" size="sm" onClick={() => handleReaction('likes')} className="flex items-center gap-2">
            <ThumbsUp className={cn("h-4 w-4", userHasLiked && "text-primary fill-primary/20")} />
            <span>{likeCount}</span>
          </Button>
           <Button variant="ghost" size="sm" onClick={() => handleReaction('dislikes')} className="flex items-center gap-2">
            <ThumbsDown className={cn("h-4 w-4", userHasDisliked && "text-destructive fill-destructive/20")} />
            <span>{dislikeCount}</span>
          </Button>
        </div>
         <Button variant="ghost" size="sm" onClick={() => setShowComments(!showComments)} className="flex items-center gap-2 text-muted-foreground">
            <MessageSquare className="h-4 w-4" />
            <span>{post.commentsCount || 0}</span>
         </Button>
      </CardFooter>
      {showComments && <PostComments centerId={centerId} postId={post.id} />}
    </Card>
  );
}
