"use client";

import { useRouter } from 'next/navigation';
import React, { useEffect } from 'react'
import { clearTokens, getAccessToken } from '@/lib/tokenStorage';
import { getCurrentUser } from '@/helper/currentUser';

function MerchantLayout({ children }: { children: React.ReactNode }) {

    const router = useRouter();

    useEffect(() => {
        const token = getAccessToken();

        if (!token) {
            router.push("/auth/login");
            return;
        }

        const user = getCurrentUser();
        if (!user) {
            clearTokens();
            router.push("/auth/login");
            return;
        }

        if (user.role !== "MERCHANT") {
            router.push("/");
        }
    }, [router]);

    return (
        <div>
            {children}
        </div>
    )
}

export default MerchantLayout
