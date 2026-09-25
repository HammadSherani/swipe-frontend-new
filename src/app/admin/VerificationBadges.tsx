"use client";

import React from "react";
import { Icon } from "@iconify/react";

interface CheckFields {
    businessType?: string;
    bvnStatus?: string;
    ninStatus?: string;
    faceMatchStatus?: string;
    cacStatus?: string;
    nubanStatus?: string;
}

const STYLES: Record<string, { cls: string; icon: string; label: string }> = {
    VERIFIED: { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: "solar:check-circle-bold", label: "Verified" },
    MANUAL_REVIEW: { cls: "bg-amber-50 text-amber-700 border-amber-200", icon: "solar:eye-bold", label: "Needs review" },
    FAILED: { cls: "bg-rose-50 text-rose-700 border-rose-200", icon: "solar:close-circle-bold", label: "Failed" },
    PENDING: { cls: "bg-gray-50 text-gray-500 border-gray-200", icon: "solar:clock-circle-bold", label: "Pending" },
};

// Which checks apply mirrors the backend: Face is only required for an
// INDIVIDUAL_TRADER (auto-skipped otherwise), and CAC/KYB is skipped for one.
export function getChecks(m: CheckFields): { label: string; status: string }[] {
    const individual = m.businessType === "INDIVIDUAL_TRADER";
    return [
        { label: "BVN", status: m.bvnStatus ?? "PENDING" },
        { label: "NIN", status: m.ninStatus ?? "PENDING" },
        individual
            ? { label: "Face", status: m.faceMatchStatus ?? "PENDING" }
            : { label: "CAC", status: m.cacStatus ?? "PENDING" },
        { label: "Bank", status: m.nubanStatus ?? "PENDING" },
    ];
}

export default function VerificationBadges({ merchant }: { merchant: CheckFields }) {
    return (
        <div className="flex flex-wrap gap-1.5">
            {getChecks(merchant).map((c) => {
                const s = STYLES[c.status] ?? STYLES.PENDING;
                return (
                    <span
                        key={c.label}
                        title={`${c.label}: ${s.label}`}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold ${s.cls}`}
                    >
                        <Icon icon={s.icon} width={12} />
                        {c.label}
                    </span>
                );
            })}
        </div>
    );
}
