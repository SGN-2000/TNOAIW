"use client"

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ref, onValue, off, runTransaction } from 'firebase/database';
import { db } from '@/lib/firebase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Loader from '@/components/loader';
import { Calendar, User, ThumbsUp, ThumbsDown } from 'lucide-react';
import type { NewsArticle } from '../page';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import ArticleComments from '@/components/center/news/article-comments';

export default function NewsArticlePage() {
  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();
  const params = useParams();
  const centerId = Array.isArray(params.centerId) ? params.centerId[0] : params.centerId;
  const newsId = Array.isArray(params.newsId) ? params.newsId[0] : params.newsId;

  useEffect(() => {
    if (!centerId || !newsId) {
      setLoading(false);
      return;
    }

    const articleRef = ref(db, `centers/${centerId}/news/articles/${newsId}`);
    const listener = onValue(articleRef, (snapshot) => {
      if (snapshot.exists()) {
        setArticle({ id: snapshot.key, ...snapshot.val() });
      } else {
        setArticle(null);
      }
      setLoading(false);
    });

    return () => off(articleRef, 'value', listener);
  }, [centerId, newsId]);

  const handleReaction = (reactionType: 'likes' | 'dislikes') => {
    if (!user || !article) return;

    const articleRef = ref(db, `centers/${centerId}/news/articles/${article.id}`);
    runTransaction(articleRef, (currentArticle) => {
      if (currentArticle) {
        if (!currentArticle.likes) currentArticle.likes = {};
        if (!currentArticle.dislikes) currentArticle.dislikes = {};

        const oppositeReaction = reactionType === 'likes' ? 'dislikes' : 'likes';

        if (currentArticle[reactionType][user.uid]) {
          currentArticle[reactionType][user.uid] = null;
        } else {
          currentArticle[reactionType][user.uid] = true;
          if (currentArticle[oppositeReaction][user.uid]) {
            currentArticle[oppositeReaction][user.uid] = null;
          }
        }
      }
      return currentArticle;
    });
  };

  if (loading) {
    return <div className="flex flex-1 justify-center items-center p-4"><Loader /></div>;
  }

  if (!article) {
    return <div className="flex flex-1 justify-center items-center p-4">Artículo no encontrado.</div>;
  }
  
  const likeCount = article.likes ? Object.values(article.likes).filter(Boolean).length : 0;
  const dislikeCount = article.dislikes ? Object.values(article.dislikes).filter(Boolean).length : 0;
  const userHasLiked = user && article.likes && article.likes[user.uid];
  const userHasDisliked = user && article.dislikes && article.dislikes[user.uid];

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 pt-6">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-4xl font-bold">{article.title}</CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm mt-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>Por {article.authorName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{format(new Date(article.createdAt), "d 'de' MMMM, yyyy", { locale: es })}</span>
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-base leading-relaxed">{article.content}</p>
          </CardContent>
          <CardFooter className="flex justify-start gap-4 border-t pt-4">
             <Button variant="ghost" size="sm" onClick={() => handleReaction('likes')} className="flex items-center gap-2">
              <ThumbsUp className={cn("h-4 w-4", userHasLiked && "text-primary fill-primary/20")} />
              <span>{likeCount}</span>
            </Button>
             <Button variant="ghost" size="sm" onClick={() => handleReaction('dislikes')} className="flex items-center gap-2">
              <ThumbsDown className={cn("h-4 w-4", userHasDisliked && "text-destructive fill-destructive/20")} />
              <span>{dislikeCount}</span>
            </Button>
          </CardFooter>
        </Card>
        
        <div className="mt-8">
            <ArticleComments centerId={centerId} articleId={article.id} />
        </div>
      </div>
    </div>
  );
}
