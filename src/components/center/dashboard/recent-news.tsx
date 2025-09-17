"use client"

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Newspaper, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import type { NewsArticle } from '@/app/center/[centerId]/news/page';

interface RecentNewsProps {
    news: NewsArticle[];
    centerId: string;
}

export default function RecentNews({ news, centerId }: RecentNewsProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Newspaper className="h-5 w-5"/>Noticias Recientes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {news.length > 0 ? (
                    news.map(article => (
                       <div key={article.id}>
                            <Link href={`/center/${centerId}/news/${article.id}`}>
                                <p className="font-semibold hover:underline">{article.title}</p>
                            </Link>
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{article.content}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Por {article.authorName} - {formatDistanceToNow(new Date(article.createdAt), { addSuffix: true, locale: es })}
                            </p>
                       </div>
                    ))
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No hay noticias recientes.</p>
                )}
                 <Button variant="outline" className="w-full" asChild>
                    <Link href={`/center/${centerId}/news`}>
                        Ver todas las noticias <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </CardContent>
        </Card>
    );
}
