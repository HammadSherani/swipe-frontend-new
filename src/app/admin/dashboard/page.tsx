"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { admin } from "@/lib/apiClient";
import VerificationBadges from "../VerificationBadges";

interface Stats {
    totalMerchants: number;
    pendingReview: number;
    active: number;
    rejected: number;
    inProgress: number;
}

interface PendingMerchant {
    id: string;
    businessName?: string;
    ownerName?: string;
    email?: string;
    businessType?: string;
    submittedAt?: string;
    createdAt?: string;
    [key: string]: any;
}

const STAT_CARDS: { key: keyof Stats; label: string; icon: string }[] = [
    { key: "pendingReview", label: "Pending review", icon: "solar:clock-circle-linear" },
    { key: "active", label: "Active merchants", icon: "solar:check-circle-linear" },
    { key: "inProgress", label: "Onboarding in progress", icon: "solar:hourglass-linear" },
    { key: "rejected", label: "Rejected", icon: "solar:close-circle-linear" },
];

function initials(name?: string) {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

export default function AdminDashboardPage() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [pending, setPending] = useState<PendingMerchant[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const [statsRes, pendingRes] = await Promise.all([admin.stats(), admin.pendingReview()]);
                setStats(statsRes.data?.data ?? statsRes.data);
                const payload = pendingRes.data?.data ?? pendingRes.data;
                setPending(Array.isArray(payload) ? payload : payload?.merchants || []);
            } catch {
                // Layout chrome (nav/search/logout) still works even if this
                // fetch fails — no need for a page-blocking error state.
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    return (
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-8">
            <div className="mb-7">
                <h1 className="text-[22px] font-bold text-gray-900">Home</h1>
                <p className="text-sm text-gray-500 mt-0.5">Overview of merchant onboarding across the platform.</p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {STAT_CARDS.map((card) => (
                    <div key={card.key} className="bg-white rounded-xl border border-gray-200 p-5">
                        <div className="flex items-center gap-1.5 text-gray-500 text-xs font-medium mb-3">
                            <Icon icon={card.icon} width={15} />
                            {card.label}
                        </div>
                        <div className="text-[26px] font-bold text-gray-900 leading-none">
                            {loading ? "—" : stats?.[card.key] ?? 0}
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div>
                        <h2 className="text-sm font-bold text-gray-900">Manual review requests</h2>
                        <p className="text-xs text-gray-400 mt-0.5">Merchants waiting for your approval</p>
                    </div>
                    <Link
                        href="/admin/merchants"
                        className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#635BFF] hover:bg-[#5147e5] text-white rounded-lg font-semibold text-xs transition-colors"
                    >
                        View all
                        <Icon icon="solar:arrow-right-linear" width={13} />
                    </Link>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Icon icon="line-md:loading-twotone-loop" className="text-3xl text-[#635BFF]" />
                    </div>
                ) : pending.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <Icon icon="solar:inbox-linear" className="text-4xl text-gray-300 mb-3" />
                        <p className="text-sm font-semibold text-gray-500">No merchants pending review right now.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                                    <th className="px-6 py-3 font-semibold">Business</th>
                                    <th className="px-6 py-3 font-semibold">Owner</th>
                                    <th className="px-6 py-3 font-semibold">Type</th>
                                    <th className="px-6 py-3 font-semibold">Verification</th>
                                    <th className="px-6 py-3 font-semibold">Submitted</th>
                                    <th className="px-6 py-3 font-semibold text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pending.slice(0, 8).map((m) => (
                                    <tr key={m.id} className="border-t border-gray-100 hover:bg-gray-50/70 transition-colors">
                                        <td className="px-6 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <span className="w-8 h-8 rounded-full bg-[#635BFF]/10 text-[#635BFF] text-xs font-bold flex items-center justify-center shrink-0">
                                                    {initials(m.businessName)}
                                                </span>
                                                <div>
                                                    <div className="font-semibold text-gray-900">{m.businessName || "-"}</div>
                                                    {m.email && <div className="text-xs text-gray-400">{m.email}</div>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3.5 text-gray-600">{m.ownerName || "-"}</td>
                                        <td className="px-6 py-3.5 text-gray-600">{(m.businessType || "-").replace(/_/g, " ")}</td>
                                        <td className="px-6 py-3.5"><VerificationBadges merchant={m} /></td>
                                        <td className="px-6 py-3.5 text-gray-500 text-xs">
                                            {m.submittedAt || m.createdAt
                                                ? new Date(m.submittedAt || m.createdAt!).toLocaleDateString()
                                                : "-"}
                                        </td>
                                        <td className="px-6 py-3.5 text-right">
                                            <Link
                                                href="/admin/merchants"
                                                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md font-semibold text-xs transition-colors"
                                            >
                                                Review
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {pending.length > 8 && (
                            <div className="px-6 py-3 text-xs text-gray-400 border-t border-gray-100">
                                +{pending.length - 8} more in the full review queue
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
