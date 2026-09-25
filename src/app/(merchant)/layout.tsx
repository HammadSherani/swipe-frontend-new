"use client";

import { useRouter } from 'next/navigation';
import React, { useEffect } from 'react'
import { jwtDecode } from "jwt-decode";

interface TokenPayload {
    id: string;
    email: string;
    role: string;
    exp: number;
    kycStatus: string;
}

function MerchantLayout({ children }: { children: React.ReactNode }) {

    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem("token") || localStorage.getItem("accessToken");

        if (!token) {
            router.push("/auth/login");
            return;
        }

        try {
            const decoded = jwtDecode<TokenPayload>(token);

            console.log(decoded.id);
            console.log(decoded.email);
            console.log(decoded.role);
            console.log(decoded.kycStatus);

            if (decoded.role !== "MERCHANT") {
                router.push("/");
            }
        } catch (error) {
            localStorage.removeItem("accessToken");
            localStorage.removeItem("token");
            router.push("/auth/login");
        }
    }, [router]);

    return (
        <div>
            {children}
        </div>
    )
}

export default MerchantLayout