"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Medal, ArrowUp, ArrowDown, Minus } from "lucide-react";
import type { Score } from "./types";
import { useMemo } from "react";

interface ScoresTableProps {
  scores: Score[];
}

const getRankContent = (rank: number) => {
  if (rank === 0) return <Medal className="h-5 w-5 text-yellow-500" />;
  if (rank === 1) return <Medal className="h-5 w-5 text-gray-400" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-yellow-700" />;
  return rank + 1;
};

export default function ScoresTable({ scores }: ScoresTableProps) {
  const sortedScores = useMemo(() => {
    return [...scores].sort((a, b) => b.points - a.points);
  }, [scores]);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[50px] text-center">Pos.</TableHead>
          <TableHead>Curso</TableHead>
          <TableHead className="text-right">Puntos</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedScores.map((score, index) => (
          <TableRow key={score.course}>
            <TableCell className="font-bold text-center">{getRankContent(index)}</TableCell>
            <TableCell className="font-medium">{score.course}</TableCell>
            <TableCell className="text-right font-semibold text-lg">{score.points}</TableCell>
          </TableRow>
        ))}
         {sortedScores.length === 0 && (
            <TableRow>
                <TableCell colSpan={3} className="h-24 text-center">
                    No hay cursos para mostrar.
                </TableCell>
            </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
