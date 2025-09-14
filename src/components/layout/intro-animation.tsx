"use client";

import Image from 'next/image';

export default function IntroAnimation() {
  return (
    <div className="fixed inset-0 bg-background z-[100] flex items-center justify-center fade-out-blur">
      <div className="zoom-in-out">
        <Image src="/Wiaont.png" alt="Wiaont Logo" width={192} height={192} />
      </div>
    </div>
  );
}
