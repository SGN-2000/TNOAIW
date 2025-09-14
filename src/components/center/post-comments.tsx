"use client"

import { useEffect, useState } from "react"
import { ref, push, set, onValue, off, runTransaction, serverTimestamp } from "firebase/database"
import { useAuth } from "@/hooks/use-auth"
import { db } from "@/lib/firebase"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar"
import { Button } from "../ui/button"
import { Textarea } from "../ui/textarea"
import { Loader2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { Card, CardContent } from "../ui/card"

interface PostCommentsProps {
    centerId: string;
    postId: string;
}

interface Comment {
    id: string;
    authorId: string;
    authorName: string;
    authorPhotoURL?: string;
    content: string;
    createdAt: string;
}

const getInitials = (name: string | null | undefined) => {
    if (!name) return "A";
    const names = name.split(" ");
    if (names.length > 1) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name?.[0].toUpperCase() ?? 'A';
};


export default function PostComments({ centerId, postId }: PostCommentsProps) {
    const { user } = useAuth();
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const commentsRef = ref(db, `centers/${centerId}/posts/${postId}/comments`);
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
    }, [centerId, postId]);

    const handleSubmitComment = async () => {
        if (!user || newComment.trim().length === 0) return;

        setIsSubmitting(true);
        try {
            const commentsRef = ref(db, `centers/${centerId}/posts/${postId}/comments`);
            const newCommentRef = push(commentsRef);

            await set(newCommentRef, {
                authorId: user.uid,
                authorName: user.displayName || "Anónimo",
                authorPhotoURL: user.photoURL || "",
                content: newComment.trim(),
                createdAt: new Date().toISOString(),
            });

            // Update comments count on the post
            const postRef = ref(db, `centers/${centerId}/posts/${postId}`);
            await runTransaction(postRef, (post) => {
                if (post) {
                    post.commentsCount = (post.commentsCount || 0) + 1;
                }
                return post;
            });

            setNewComment("");

        } catch (error) {
            console.error("Error submitting comment:", error);
        } finally {
            setIsSubmitting(false);
        }
    }


    return (
        <div className="border-t">
            <CardContent className="pt-6 space-y-6">
                {/* Add Comment Form */}
                {user && (
                    <div className="flex items-start gap-4">
                         <Avatar className="h-9 w-9">
                            <AvatarImage src={user.photoURL ?? ''} alt={user.displayName ?? ''}/>
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
                
                {/* Comments List */}
                <div className="space-y-4">
                    {loading && <div className="text-center text-sm text-muted-foreground">Cargando comentarios...</div>}
                    {!loading && comments.length === 0 && (
                        <div className="text-center text-sm text-muted-foreground py-4">No hay comentarios todavía.</div>
                    )}
                    {comments.map(comment => (
                        <div key={comment.id} className="flex items-start gap-3">
                             <Avatar className="h-8 w-8">
                                <AvatarImage src={comment.authorPhotoURL} alt={comment.authorName}/>
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
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </div>
    )
}
