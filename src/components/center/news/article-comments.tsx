"use client"

import { useEffect, useState } from "react";
import { ref, onValue, off, push, set, runTransaction } from "firebase/database";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ThumbsUp, CornerDownRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Comment } from "./types";

interface ArticleCommentsProps {
    centerId: string;
    articleId: string;
}

const getInitials = (name: string | null | undefined) => {
    if (!name) return "A";
    const names = name.split(" ");
    if (names.length > 1) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name?.[0].toUpperCase() ?? 'A';
};

const CommentCard = ({
    comment,
    centerId,
    articleId,
    parentCommentId
}: {
    comment: Comment;
    centerId: string;
    articleId: string;
    parentCommentId?: string;
}) => {
    const { user } = useAuth();
    const [isReplying, setIsReplying] = useState(false);
    const [replyContent, setReplyContent] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const commentPath = parentCommentId
        ? `centers/${centerId}/news/articles/${articleId}/comments/${parentCommentId}/replies/${comment.id}`
        : `centers/${centerId}/news/articles/${articleId}/comments/${comment.id}`;
    
    const likeCount = comment.likes ? Object.values(comment.likes).filter(Boolean).length : 0;
    const userHasLiked = user && comment.likes && comment.likes[user.uid];

    const handleLike = () => {
        if (!user) return;
        const likeRef = ref(db, `${commentPath}/likes/${user.uid}`);
        runTransaction(ref(db, `${commentPath}/likes`), (likes) => {
            if (!likes) likes = {};
            likes[user.uid] = likes[user.uid] ? null : true;
            return likes;
        });
    };

    const handleReplySubmit = async () => {
        if (!user || replyContent.trim().length === 0) return;
        
        setIsSubmitting(true);
        const repliesRef = ref(db, `centers/${centerId}/news/articles/${articleId}/comments/${comment.id}/replies`);
        const newReplyRef = push(repliesRef);

        try {
            await set(newReplyRef, {
                id: newReplyRef.key,
                authorId: user.uid,
                authorName: user.displayName || "Anónimo",
                authorPhotoURL: user.photoURL || "",
                content: replyContent.trim(),
                createdAt: new Date().toISOString(),
                likes: {},
            });
            // Update replies count
            await runTransaction(ref(db, `centers/${centerId}/news/articles/${articleId}/comments/${comment.id}/repliesCount`), (count) => (count || 0) + 1);

            setReplyContent("");
            setIsReplying(false);
        } catch (error) {
            console.error("Error submitting reply:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex items-start gap-3">
            <Avatar className="h-8 w-8">
                <AvatarImage src={comment.authorPhotoURL} alt={comment.authorName} />
                <AvatarFallback>{getInitials(comment.authorName)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
                <div className="bg-muted p-3 rounded-lg">
                    <div className="flex items-baseline gap-2">
                        <p className="font-semibold text-sm">{comment.authorName}</p>
                        <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: es })}
                        </p>
                    </div>
                    <p className="text-sm mt-1">{comment.content}</p>
                </div>
                <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                    <button onClick={handleLike} className="flex items-center gap-1 hover:text-primary">
                        <ThumbsUp className={cn("h-3 w-3", userHasLiked && "text-primary fill-primary/20")} />
                        {likeCount}
                    </button>
                    {!parentCommentId && (
                        <button onClick={() => setIsReplying(!isReplying)} className="flex items-center gap-1 hover:text-primary">
                            <CornerDownRight className="h-3 w-3" />
                            Responder
                        </button>
                    )}
                </div>
                {isReplying && (
                     <div className="mt-4 ml-4 space-y-2">
                        <Textarea 
                            placeholder={`Respondiendo a ${comment.authorName}...`}
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            rows={2}
                        />
                         <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setIsReplying(false)}>Cancelar</Button>
                            <Button size="sm" onClick={handleReplySubmit} disabled={isSubmitting || !replyContent.trim()}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                Responder
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};


export default function ArticleComments({ centerId, articleId }: ArticleCommentsProps) {
    const { user } = useAuth();
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const commentsRef = ref(db, `centers/${centerId}/news/articles/${articleId}/comments`);
        const listener = onValue(commentsRef, (snapshot) => {
            const commentsData = snapshot.val();
            const commentsList: Comment[] = commentsData
                ? Object.keys(commentsData)
                    .map(key => ({ id: key, ...commentsData[key] }))
                    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                : [];
            setComments(commentsList);
            setLoading(false);
        });
        return () => off(commentsRef, 'value', listener);
    }, [centerId, articleId]);

    const handleSubmitComment = async () => {
        if (!user || newComment.trim().length === 0) return;
        setIsSubmitting(true);
        try {
            const commentsRef = ref(db, `centers/${centerId}/news/articles/${articleId}/comments`);
            const newCommentRef = push(commentsRef);
            await set(newCommentRef, {
                id: newCommentRef.key,
                authorId: user.uid,
                authorName: user.displayName || "Anónimo",
                authorPhotoURL: user.photoURL || "",
                content: newComment.trim(),
                createdAt: new Date().toISOString(),
                likes: {},
            });
            await runTransaction(ref(db, `centers/${centerId}/news/articles/${articleId}/commentsCount`), (count) => (count || 0) + 1);
            setNewComment("");
        } catch (error) {
            console.error("Error submitting comment:", error);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <Card>
            <CardHeader><CardTitle>Comentarios ({comments.length})</CardTitle></CardHeader>
            <CardContent className="space-y-6">
                {user && (
                    <div className="flex items-start gap-4">
                        <Avatar className="h-9 w-9">
                            <AvatarImage src={user.photoURL ?? ''} alt={user.displayName ?? ''} />
                            <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                        </Avatar>
                        <div className="w-full space-y-2">
                            <Textarea
                                placeholder="Escribe un comentario..."
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                rows={2}
                                disabled={isSubmitting}
                            />
                            <div className="flex justify-end">
                                <Button
                                    onClick={handleSubmitComment}
                                    disabled={isSubmitting || newComment.trim().length === 0}
                                    size="sm"
                                >
                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Comentar
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
                <div className="space-y-4">
                    {loading && <div className="text-center text-sm text-muted-foreground">Cargando comentarios...</div>}
                    {!loading && comments.length === 0 && (
                        <div className="text-center text-sm text-muted-foreground py-4">No hay comentarios todavía.</div>
                    )}
                    {comments.map(comment => (
                        <div key={comment.id} className="space-y-4">
                           <CommentCard comment={comment} centerId={centerId} articleId={articleId} />
                            {comment.replies && (
                               <div className="ml-12 space-y-4 border-l pl-4">
                                {Object.values(comment.replies).sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).map(reply => (
                                     <CommentCard key={reply.id} comment={reply} centerId={centerId} articleId={articleId} parentCommentId={comment.id} />
                                ))}
                               </div>
                            )}
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
