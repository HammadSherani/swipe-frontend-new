"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { getCurrentUser } from "@/helper/currentUser";
import { auth } from "@/lib/apiClient";
import { getRefreshToken, clearTokens } from "@/lib/tokenStorage";

const NAV_LINKS = [
    { href: "/admin/dashboard", label: "Home", icon: "solar:home-2-bold" },
    { href: "/admin/merchants", label: "Merchants", icon: "solar:shop-bold" },
];

function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [loggingOut, setLoggingOut] = useState(false);
    const [email, setEmail] = useState<string | undefined>(undefined);

    useEffect(() => {
        const user = getCurrentUser();

        if (!user) {
            clearTokens();
            router.push("/auth/login");
            return;
        }

        if (user.role !== "ADMIN") {
            router.push("/");
            return;
        }

        setEmail(user.email);
    }, [router]);

    const handleLogout = async () => {
        setLoggingOut(true);
        try {
            await auth.logout(getRefreshToken() ?? undefined);
        } catch {
            // Clear the local session regardless — a dead/expired token should
            // never leave an admin stuck unable to log out.
        } finally {
            clearTokens();
            window.location.href = "/auth/login";
        }
    };

    return (
        <div className="min-h-screen flex bg-[#F6F9FC]">
            {/* Sidebar */}
            <aside className="w-60 shrink-0 bg-white border-r border-gray-200 flex flex-col">
                <div className="h-16 flex items-center gap-2 px-5 border-b border-gray-100">
                    <span className="w-7 h-7 rounded-md bg-[#635BFF] flex items-center justify-center">
                        <Icon icon="solar:card-bold" width={16} className="text-white" />
                    </span>
                    <span className="font-extrabold text-gray-900 tracking-tight">Swipe</span>
                    <span className="text-[10px] font-bold text-gray-400 bg-gray-100 rounded px-1.5 py-0.5 ml-auto">
                        Admin
                    </span>
                </div>

                <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
                    {NAV_LINKS.map((link) => {
                        const active = pathname?.startsWith(link.href);
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                                    active
                                        ? "bg-[#635BFF]/10 text-[#635BFF]"
                                        : "text-gray-600 hover:bg-gray-50"
                                }`}
                            >
                                <Icon icon={link.icon} width={17} />
                                {link.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-3 border-t border-gray-100">
                    <div className="flex items-center gap-2 px-2 py-2 mb-1">
                        <span className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                            {email?.[0]?.toUpperCase() ?? "A"}
                        </span>
                        <span className="text-xs font-semibold text-gray-600 truncate">{email ?? "Admin"}</span>
                    </div>
                    <button
                        type="button"
                        onClick={handleLogout}
                        disabled={loggingOut}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                        <Icon icon="solar:logout-3-bold" width={17} />
                        {loggingOut ? "Logging out..." : "Log out"}
                    </button>
                </div>
            </aside>

            {/* Main column */}
            <div className="flex-1 min-w-0 flex flex-col">
                <header className="h-16 bg-white border-b border-gray-200 flex items-center gap-4 px-6">
                    <div className="relative flex-1 max-w-md">
                        <Icon
                            icon="solar:magnifer-linear"
                            width={16}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />
                        <input
                            type="text"
                            placeholder="Search merchants..."
                            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#635BFF] focus:ring-2 focus:ring-[#635BFF]/10 bg-[#F6F9FC]"
                        />
                    </div>
                    <button className="text-gray-400 hover:text-gray-600 transition-colors">
                        <Icon icon="solar:bell-bold" width={19} />
                    </button>
                </header>

                <main className="flex-1">{children}</main>
            </div>
        </div>
    );
}

export default AdminLayout;
