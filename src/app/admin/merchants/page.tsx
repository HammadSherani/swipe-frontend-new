"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { admin } from "@/lib/apiClient";
import VerificationBadges from "../VerificationBadges";

interface PendingMerchant {
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
    const label = status || "PENDING_REVIEW";
    return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700">
            {label.replace(/_/g, " ")}
        </span>
    );
}

export default function AdminMerchantsPage() {
    const [merchants, setMerchants] = useState<PendingMerchant[]>([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState<Toast>({ show: false, type: "success", message: "" });
    const [selected, setSelected] = useState<PendingMerchant | null>(null);
    const [decision, setDecision] = useState<"APPROVE" | "REJECT">("APPROVE");
    const [rejectionReason, setRejectionReason] = useState("");
    const [actionLoading, setActionLoading] = useState(false);

    const showToast = (message: string, type: ToastType) => {
        setToast({ show: true, type, message });
        setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 4500);
    };

    const loadMerchants = async () => {
        setLoading(true);
        try {
            const response = await admin.pendingReview();
            const payload = response.data?.data ?? response.data;
            const list: PendingMerchant[] = Array.isArray(payload) ? payload : payload?.merchants || [];
            setMerchants(list);
        } catch (error: any) {
            showToast(error?.message || "Could not load pending merchants.", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadMerchants();
    }, []);

    const openDecide = (merchant: PendingMerchant) => {
        setDecision("APPROVE");
        setRejectionReason("");
        setSelected(merchant);
    };

    const closeModal = () => setSelected(null);

    const submitDecision = async () => {
        if (!selected) return;
        if (decision === "REJECT" && !rejectionReason.trim()) {
            showToast("Please enter a rejection reason.", "error");
            return;
        }
        setActionLoading(true);
        try {
            await admin.decide(selected.id, {
                decision,
                rejectionReason: decision === "REJECT" ? rejectionReason : undefined,
            });
            showToast(decision === "APPROVE" ? "Merchant approved." : "Merchant rejected.", "success");
            closeModal();
            loadMerchants();
        } catch (error: any) {
            showToast(error?.message || "Could not record decision.", "error");
        } finally {
            setActionLoading(false);
        }
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
                <h1 className="text-[22px] font-bold text-gray-900">Merchant review queue</h1>
                <p className="text-sm text-gray-500 mt-0.5">Check each merchant's verification results, then approve or reject the application.</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Icon icon="line-md:loading-twotone-loop" className="text-3xl text-[#635BFF]" />
                    </div>
                ) : merchants.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <Icon icon="solar:inbox-bold" className="text-5xl text-gray-300 mb-3" />
                        <p className="text-sm font-semibold text-gray-500">No merchants pending review.</p>
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
                                    <tr key={m.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
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
                                                onClick={() => openDecide(m)}
                                                className="px-3.5 py-2 bg-[#635BFF] hover:bg-[#5147e5] text-white rounded-lg font-bold text-xs transition-all"
                                            >
                                                Review &amp; decide
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {selected && (
                <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-gray-900">Review merchant</h2>
                            <button type="button" onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                                <Icon icon="solar:close-circle-bold" className="text-xl" />
                            </button>
                        </div>
                        <p className="text-sm font-semibold text-gray-900">{selected.businessName || selected.id}</p>
                        <p className="text-xs text-gray-400 mb-3">{selected.ownerName} · {selected.email}</p>
                        <div className="mb-5"><VerificationBadges merchant={selected} /></div>

                        <div className="space-y-4">
                            <div className="flex gap-3">
                                {(["APPROVE", "REJECT"] as const).map((opt) => (
                                    <button
                                        key={opt}
                                        type="button"
                                        onClick={() => setDecision(opt)}
                                        className={`flex-1 py-2.5 rounded-xl font-bold text-sm border transition-all
                                            ${decision === opt
                                                ? opt === "APPROVE" ? "bg-emerald-500 border-emerald-500 text-white" : "bg-rose-500 border-rose-500 text-white"
                                                : "bg-white border-gray-200 text-gray-600"}`}
                                    >
                                        {opt === "APPROVE" ? "Approve" : "Reject"}
                                    </button>
                                ))}
                            </div>
                            {decision === "REJECT" && (
                                <textarea
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    placeholder="Rejection reason"
                                    rows={3}
                                    className="w-full p-3 border border-gray-200 rounded-xl text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#635BFF]/20 focus:border-[#635BFF]"
                                />
                            )}
                            <button
                                type="button"
                                onClick={submitDecision}
                                disabled={actionLoading}
                                className="w-full py-3 bg-[#635BFF] hover:bg-[#5147e5] text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50"
                            >
                                {actionLoading ? "Submitting..." : "Confirm decision"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
