
"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Event } from './types';
import { differenceInSeconds } from 'date-fns';
import { ShieldHalf, Timer } from 'lucide-react';
import DrawAnimation from './draw-animation';

interface DrawCountdownProps {
    event: Event;
    centerId: string;
}

const calculateTimeLeft = (targetDate: Date) => {
    const now = new Date();
    const difference = differenceInSeconds(targetDate, now);

    if (difference <= 0) {
        return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
    }

    const days = Math.floor(difference / (60 * 60 * 24));
    const hours = Math.floor((difference % (60 * 60 * 24)) / (60 * 60));
    const minutes = Math.floor((difference % (60 * 60)) / 60);
    const seconds = Math.floor(difference % 60);

    return { total: difference, days, hours, minutes, seconds };
};

export default function DrawCountdown({ event, centerId }: DrawCountdownProps) {
    const drawDate = new Date(event.classification!.drawDate!);
    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft(drawDate));

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft(drawDate));
        }, 1000);

        return () => clearInterval(timer);
    }, [drawDate]);

    if (timeLeft.total <= 0) {
        return <DrawAnimation event={event} centerId={centerId} />;
    }

    const showFinalCountdown = timeLeft.total <= 30;

    return (
        <Card className="border-primary text-center">
            <CardHeader>
                <div className="mx-auto bg-primary/10 text-primary rounded-full p-4 w-fit mb-4">
                   <ShieldHalf className="h-10 w-10" />
                </div>
                <CardTitle>Sorteo del Torneo</CardTitle>
                <CardDescription>
                    {showFinalCountdown ? "¡El sorteo está a punto de comenzar!" : "El sorteo comenzará pronto. ¡Prepárate para la emoción!"}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {showFinalCountdown ? (
                    <div className="text-8xl font-bold text-primary animate-pulse">
                        {timeLeft.seconds}
                    </div>
                ) : (
                    <div className="flex justify-center items-center gap-4 text-primary">
                        <div className="text-center">
                            <div className="text-4xl font-bold">{String(timeLeft.days).padStart(2, '0')}</div>
                            <div className="text-xs">DÍAS</div>
                        </div>
                        <div className="text-4xl">:</div>
                        <div className="text-center">
                            <div className="text-4xl font-bold">{String(timeLeft.hours).padStart(2, '0')}</div>
                            <div className="text-xs">HRS</div>
                        </div>
                        <div className="text-4xl">:</div>
                        <div className="text-center">
                            <div className="text-4xl font-bold">{String(timeLeft.minutes).padStart(2, '0')}</div>
                            <div className="text-xs">MIN</div>
                        </div>
                         <div className="text-4xl">:</div>
                        <div className="text-center">
                            <div className="text-4xl font-bold">{String(timeLeft.seconds).padStart(2, '0')}</div>
                            <div className="text-xs">SEG</div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
