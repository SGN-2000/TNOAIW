"use client";

import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/main-layout';

export default function LoginPage() {
    const router = useRouter();
    // Redirect to profile page, which now handles login.
    if (typeof window !== 'undefined') {
        router.replace('/profile');
    }
    return <MainLayout><div>Redirigiendo...</div></MainLayout>;
}
