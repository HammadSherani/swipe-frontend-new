"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { useRouter } from "next/navigation";
import { admin } from "@/lib/apiClient";
import VerificationBadges from "../VerificationBadges";

interface AdminMerchant {
    id: string;
    businessName?: string;
    tradeName?: string;
    ownerName?: string;
    email?: string;
    businessType?: string;
    status?: string;
    submittedAt?: string;
    createdAt?: string;
    [key: string]: any;
}

type ToastType = "success" | "error" | "info";
interface Toast { show: boolean; type: ToastType; message: string; }

function StatusBadge({ status }: { status?: string }) {
    const label = status || "UNKNOWN";
    const classes = label === "ACTIVE"
        ? "bg-emerald-50 text-emerald-700"
        : label === "REJECTED" || label === "SUSPENDED"
            ? "bg-rose-50 text-rose-700"
            : label === "PENDING_REVIEW"
                ? "bg-amber-50 text-amber-700"
                : "bg-gray-100 text-gray-700";
    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${classes}`}>
            {label.replace(/_/g, " ")}
        </span>
    );
}

export default function AdminMerchantsPage() {
    const router = useRouter();
    const [merchants, setMerchants] = useState<AdminMerchant[]>([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState<Toast>({ show: false, type: "success", message: "" });

    const showToast = (message: string, type: ToastType) => {
        setToast({ show: true, type, message });
        setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 4500);
    };

    const loadMerchants = async () => {
        setLoading(true);
        try {
            const response = await admin.merchants();
            const payload = response.data?.data ?? response.data;
            const list: AdminMerchant[] = Array.isArray(payload) ? payload : payload?.merchants || [];
            setMerchants(list);
        } catch (error: any) {
            showToast(error?.message || "Could not load merchants.", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadMerchants();
    }, []);

    const openDetails = (merchant: AdminMerchant) => {
        router.push(`/admin/merchants/${encodeURIComponent(merchant.id)}`);
    };

    return (
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-8">
            {toast.show && (
                <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-xl border text-sm font-semibold max-w-sm transition-all duration-300
                ${toast.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                        : toast.type === "error" ? "bg-rose-50 border-rose-200 text-rose-800" : "bg-blue-50 border-blue-200 text-blue-800"}`}>
                    <Icon icon={toast.type === "success" ? "solar:check-circle-bold" : toast.type === "error" ? "solar:danger-circle-bold" : "solar:info-circle-bold"} className="text-xl shrink-0" />
                    <span className="leading-tight">{toast.message}</span>
                </div>
            )}

            <div className="mb-7">
                <h1 className="text-[22px] font-bold text-gray-900">Merchants</h1>
                <p className="text-sm text-gray-500 mt-0.5">Browse merchant profiles and review their verification details.</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Icon icon="line-md:loading-twotone-loop" className="text-3xl text-[#635BFF]" />
                    </div>
                ) : merchants.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <Icon icon="solar:inbox-bold" className="text-5xl text-gray-300 mb-3" />
                        <p className="text-sm font-semibold text-gray-500">No merchants found.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 text-left text-xs font-bold text-gray-400 uppercase tracking-wide">
                                    <th className="px-6 py-4">Business</th>
                                    <th className="px-6 py-4">Owner</th>
                                    <th className="px-6 py-4">Type</th>
                                    <th className="px-6 py-4">Verification</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {merchants.map((m) => (
                                    <tr
                                        key={m.id}
                                        onClick={() => openDetails(m)}
                                        onKeyDown={(event) => {
                                            if (event.key === "Enter") openDetails(m);
                                        }}
                                        tabIndex={0}
                                        role="link"
                                        aria-label={`View details for ${m.businessName || m.id}`}
                                        className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#635BFF] cursor-pointer transition-colors"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-900">{m.businessName || "-"}</div>
                                            {m.tradeName && <div className="text-xs text-gray-400">{m.tradeName}</div>}
                                        </td>
                                        <td className="px-6 py-4 text-gray-700">
                                            <div>{m.ownerName || "-"}</div>
                                            {m.email && <div className="text-xs text-gray-400">{m.email}</div>}
                                        </td>
                                        <td className="px-6 py-4 text-gray-700">{(m.businessType || "-").replace(/_/g, " ")}</td>
                                        <td className="px-6 py-4"><VerificationBadges merchant={m} /></td>
                                        <td className="px-6 py-4"><StatusBadge status={m.status} /></td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                type="button"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    openDetails(m);
                                                }}
                                                className="px-3.5 py-2 bg-[#635BFF] hover:bg-[#5147e5] text-white rounded-lg font-bold text-xs transition-all"
                                            >
                                                View details
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

        </div>
    );
}
