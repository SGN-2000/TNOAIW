"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import type { LogEntry } from "./types";
import { useMemo } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";

interface ScoreHistoryProps {
  centerId: string;
  log: LogEntry[];
}

export default function ScoreHistory({ centerId, log }: ScoreHistoryProps) {
  const sortedLog = useMemo(() => {
    // Ensure log is an array before trying to sort it
    if (!Array.isArray(log)) {
      return [];
    }
    return [...log].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [log]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial de Cambios</CardTitle>
        <CardDescription>Registro de todas las modificaciones.</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-72">
          {sortedLog.length > 0 ? (
            <div className="space-y-6">
              {sortedLog.map((entry, index) => (
                <div key={index} className="space-y-2">
                  <p className="text-sm font-medium">{entry.reason}</p>
                  <div className="space-y-1">
                    {entry.changes.map((change, cIndex) => (
                      <div key={cIndex} className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">{change.course}</span>
                        <div className={`flex items-center font-semibold ${change.points > 0 ? 'text-green-600' : 'text-destructive'}`}>
                            {change.points > 0 ? <ArrowUp className="h-3 w-3 mr-1"/> : <ArrowDown className="h-3 w-3 mr-1"/>}
                            {change.points > 0 ? `+${change.points}` : change.points} pts
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground text-right">
                    {entry.editorName} - {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true, locale: es })}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-muted-foreground">No hay cambios registrados.</p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
