"use client";

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

const ANIMATION_SESSION_KEY = 'wiaont_intro_shown';

export default function IntroAnimation() {
  const [showAnimation, setShowAnimation] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(ANIMATION_SESSION_KEY)) {
      setShowAnimation(false);
    } else {
      setShowAnimation(true);
      sessionStorage.setItem(ANIMATION_SESSION_KEY, 'true');
    }
  }, []);

  if (!showAnimation) {
    return null;
  }

  return (
    <div className={cn(
      "fixed inset-0 bg-background z-[100] flex items-center justify-center",
      showAnimation && "fade-out-blur"
    )}>
      <div className={cn(showAnimation && "zoom-in")}>
        <Image src="/Wiaont.png" alt="Wiaont Logo" width={128} height={128} />
      </div>
    </div>
  );
}
