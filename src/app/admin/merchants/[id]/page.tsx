"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Icon } from "@iconify/react";
import { admin } from "@/lib/apiClient";

type MerchantRecord = Record<string, unknown>;

function asRecord(value: unknown): MerchantRecord | null {
    return value !== null && typeof value === "object" && !Array.isArray(value)
        ? value as MerchantRecord
        : null;
}

function pick(record: MerchantRecord, ...keys: string[]): unknown {
    for (const key of keys) {
        if (record[key] !== undefined && record[key] !== null && record[key] !== "") return record[key];
    }
    return undefined;
}

function display(value: unknown): string {
    if (value === undefined || value === null || value === "") return "—";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (typeof value === "string" || typeof value === "number") return String(value);
    if (Array.isArray(value)) return value.map(display).join(", ");
    return JSON.stringify(value);
}

function records(record: MerchantRecord, ...keys: string[]): MerchantRecord[] {
    for (const key of keys) {
        if (Array.isArray(record[key])) {
            return (record[key] as unknown[]).map(asRecord).filter((item): item is MerchantRecord => item !== null);
        }
    }
    return [];
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="rounded-xl border border-gray-200 bg-white">
            <h2 className="border-b border-gray-100 px-5 py-4 text-sm font-bold text-gray-900">{title}</h2>
            <div className="p-5">{children}</div>
        </section>
    );
}

function Field({ label, value, href }: { label: string; value: unknown; href?: boolean }) {
    const content = display(value);
    return (
        <div className="min-w-0">
            <dt className="text-xs font-medium text-gray-500">{label}</dt>
            <dd className="mt-1 break-words text-sm text-gray-900">
                {href && content !== "—" ? (
                    <a href={content} target="_blank" rel="noreferrer" className="text-[#635BFF] underline underline-offset-2">
                        {content}
                    </a>
                ) : content}
            </dd>
        </div>
    );
}

function Fields({ items }: { items: { label: string; value: unknown; href?: boolean }[] }) {
    return (
        <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => <Field key={item.label} {...item} />)}
        </dl>
    );
}

function RecordTable({
    rows,
    columns,
    emptyMessage,
}: {
    rows: MerchantRecord[];
    columns: { label: string; keys: string[]; href?: boolean }[];
    emptyMessage: string;
}) {
    if (rows.length === 0) return <p className="text-sm text-gray-500">{emptyMessage}</p>;

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                    <tr className="border-b border-gray-100 text-xs font-semibold uppercase text-gray-500">
                        {columns.map((column) => <th key={column.label} className="px-3 py-2.5">{column.label}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, index) => (
                        <tr key={display(pick(row, "id", "_id")) === "—" ? index : display(pick(row, "id", "_id"))} className="border-b border-gray-50 last:border-0">
                            {columns.map((column) => (
                                <td key={column.label} className="max-w-xs break-words px-3 py-3 text-gray-700">
                                    <Field label="" value={pick(row, ...column.keys)} href={column.href} />
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function statusLabel(value: unknown): string {
    return display(value).replace(/_/g, " ");
}

export default function AdminMerchantDetailPage() {
    const params = useParams<{ id: string }>();
    const merchantId = params.id;
    const [merchant, setMerchant] = useState<MerchantRecord | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [retryKey, setRetryKey] = useState(0);
    const [decision, setDecision] = useState<"APPROVE" | "REJECT">("APPROVE");
    const [rejectionReason, setRejectionReason] = useState("");
    const [actionLoading, setActionLoading] = useState(false);
    const [actionFeedback, setActionFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

    useEffect(() => {
        let active = true;
        admin.merchant(merchantId)
            .then((response) => {
                const payload = response.data?.data ?? response.data;
                const detail = asRecord(payload?.merchant) ?? asRecord(payload);
                if (active) {
                    if (detail) setMerchant(detail);
                    else setError("Merchant details were not found in the response.");
                }
            })
            .catch((requestError: { message?: string }) => {
                if (active) setError(requestError.message || "Could not load merchant details.");
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => { active = false; };
    }, [merchantId, retryKey]);

    const retry = () => {
        setMerchant(null);
        setError("");
        setLoading(true);
        setRetryKey((current) => current + 1);
    };

    const submitDecision = async () => {
        if (decision === "REJECT" && !rejectionReason.trim()) {
            setActionFeedback({ type: "error", message: "Please enter a rejection reason." });
            return;
        }

        setActionLoading(true);
        setActionFeedback(null);
        try {
            await admin.decide(merchantId, {
                decision,
                rejectionReason: decision === "REJECT" ? rejectionReason.trim() : undefined,
            });
            setMerchant((current) => current
                ? { ...current, status: decision === "APPROVE" ? "ACTIVE" : "REJECTED", isActive: decision === "APPROVE" }
                : current);
            setActionFeedback({
                type: "success",
                message: decision === "APPROVE" ? "Merchant approved." : "Merchant rejected.",
            });
            setRejectionReason("");
        } catch (requestError) {
            const message = asRecord(requestError)?.message;
            setActionFeedback({
                type: "error",
                message: typeof message === "string" ? message : "Could not record the decision.",
            });
        } finally {
            setActionLoading(false);
        }
    };

    const blockMerchant = async () => {
        setActionLoading(true);
        setActionFeedback(null);
        try {
            await admin.block(merchantId);
            setMerchant((current) => current ? { ...current, status: "SUSPENDED", isActive: false } : current);
            setActionFeedback({ type: "success", message: "Merchant blocked." });
        } catch (requestError) {
            const message = asRecord(requestError)?.message;
            setActionFeedback({
                type: "error",
                message: typeof message === "string" ? message : "Could not block the merchant.",
            });
        } finally {
            setActionLoading(false);
        }
    };

    const deleteMerchant = async () => {
        const businessName = display(pick(merchant ?? {}, "businessName", "tradeName"));
        const confirmed = window.confirm(
            `Delete ${businessName}? This permanently removes the merchant account, KYC data, audit history, QR codes, payment links, and virtual accounts.`
        );
        if (!confirmed) return;

        setActionLoading(true);
        setActionFeedback(null);
        try {
            await admin.delete(merchantId);
            router.replace("/admin/merchants");
        } catch (requestError) {
            const message = asRecord(requestError)?.message;
            setActionFeedback({
                type: "error",
                message: typeof message === "string" ? message : "Could not delete the merchant.",
            });
        } finally {
            setActionLoading(false);
        }
    };

    const address = asRecord(merchant?.address) ?? merchant ?? {};
    const directors = merchant ? records(merchant, "directors", "persons", "beneficialOwners") : [];
    const qrCodes = merchant ? records(merchant, "qrCodes", "qrCodeRecords") : [];
    const paymentLinks = merchant ? records(merchant, "paymentLinks", "links") : [];
    const virtualAccounts = merchant ? records(merchant, "virtualAccounts", "bankAccounts") : [];
    const auditRows = merchant
        ? [
            ...records(merchant, "auditLog", "auditLogs"),
            ...records(merchant, "kycEvents", "verificationEvents"),
            ...records(merchant, "adminDecisions", "decisions"),
        ].sort((left, right) => {
            const leftTime = Date.parse(display(pick(left, "timestamp", "createdAt", "decidedAt")));
            const rightTime = Date.parse(display(pick(right, "timestamp", "createdAt", "decidedAt")));
            return (Number.isNaN(rightTime) ? 0 : rightTime) - (Number.isNaN(leftTime) ? 0 : leftTime);
        }).slice(0, 25)
        : [];

    const socialHandles = asRecord(merchant?.socialHandles);
    const merchantStatus = String(pick(merchant ?? {}, "status", "applicationStatus") ?? "").toUpperCase();

    return (
        <div className="mx-auto max-w-7xl px-5 py-7 md:px-8">
            <Link href="/admin/merchants" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-[#635BFF]">
                <Icon icon="solar:arrow-left-linear" width={18} />
                Back to merchants
            </Link>

            {loading ? (
                <div className="flex min-h-80 flex-col items-center justify-center gap-3 text-gray-500" role="status">
                    <Icon icon="line-md:loading-twotone-loop" className="text-3xl text-[#635BFF]" />
                    <span className="text-sm">Loading merchant details...</span>
                </div>
            ) : error ? (
                <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-6" role="alert">
                    <h1 className="font-bold text-rose-800">Unable to load merchant</h1>
                    <p className="mt-1 text-sm text-rose-700">{error}</p>
                    <button type="button" onClick={retry} className="mt-4 rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800">
                        Try again
                    </button>
                </div>
            ) : !merchant ? (
                <div className="mt-6 rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
                    No merchant details are available.
                </div>
            ) : (
                <>
                    <div className="mb-6 mt-5 flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Merchant details</p>
                            <h1 className="mt-1 text-2xl font-bold text-gray-900">{display(pick(merchant, "businessName", "tradeName"))}</h1>
                            <p className="mt-1 break-all text-xs text-gray-500">ID: {display(pick(merchant, "id", "_id")) === "—" ? merchantId : display(pick(merchant, "id", "_id"))}</p>
                        </div>
                        <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
                            {statusLabel(pick(merchant, "status", "applicationStatus"))}
                        </span>
                    </div>

                    <div className="mb-6 flex justify-end">
                        <button
                            type="button"
                            onClick={deleteMerchant}
                            disabled={actionLoading}
                            className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {actionLoading ? "Deleting..." : "Delete merchant"}
                        </button>
                    </div>

                    {merchantStatus === "ACTIVE" ? (
                        <Section title="Merchant access">
                            <div className="space-y-4">
                                <p className="text-sm text-gray-600">This merchant is active. Block access to suspend the merchant.</p>
                                {actionFeedback && (
                                    <p role="status" className={`text-sm font-medium ${actionFeedback.type === "success" ? "text-emerald-700" : "text-rose-700"}`}>
                                        {actionFeedback.message}
                                    </p>
                                )}
                                <button
                                    type="button"
                                    onClick={blockMerchant}
                                    disabled={actionLoading}
                                    className="rounded-lg bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {actionLoading ? "Blocking..." : "Block merchant"}
                                </button>
                            </div>
                        </Section>
                    ) : merchantStatus === "PENDING_REVIEW" ? (
                        <Section title="Application decision">
                            <div className="space-y-4">
                                <div className="flex flex-wrap gap-3">
                                    {(["APPROVE", "REJECT"] as const).map((option) => (
                                        <button
                                            key={option}
                                            type="button"
                                            onClick={() => {
                                                setDecision(option);
                                                setActionFeedback(null);
                                            }}
                                            disabled={actionLoading}
                                            aria-pressed={decision === option}
                                            className={`min-w-36 rounded-lg border px-5 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${decision === option
                                                ? option === "APPROVE"
                                                    ? "border-emerald-600 bg-emerald-600 text-white"
                                                    : "border-rose-600 bg-rose-600 text-white"
                                                : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"}`}
                                        >
                                            {option === "APPROVE" ? "Accept merchant" : "Reject merchant"}
                                        </button>
                                    ))}
                                </div>
                                {decision === "REJECT" && (
                                    <label className="block text-sm font-medium text-gray-700">
                                        Rejection reason
                                        <textarea
                                            value={rejectionReason}
                                            onChange={(event) => setRejectionReason(event.target.value)}
                                            rows={3}
                                            placeholder="Enter a reason for rejecting this application"
                                            className="mt-1.5 w-full rounded-lg border border-gray-200 p-3 text-sm font-normal text-gray-900 outline-none focus:border-[#635BFF] focus:ring-2 focus:ring-[#635BFF]/10"
                                        />
                                    </label>
                                )}
                                {actionFeedback && (
                                    <p role="status" className={`text-sm font-medium ${actionFeedback.type === "success" ? "text-emerald-700" : "text-rose-700"}`}>
                                        {actionFeedback.message}
                                    </p>
                                )}
                                <button
                                    type="button"
                                    onClick={submitDecision}
                                    disabled={actionLoading}
                                    className="rounded-lg bg-[#635BFF] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#5147e5] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {actionLoading ? "Submitting..." : decision === "APPROVE" ? "Confirm acceptance" : "Confirm rejection"}
                                </button>
                            </div>
                        </Section>
                    ) : null}

                    <div className="space-y-5">
                        <Section title="Basic profile">
                            <Fields items={[
                                { label: "Merchant ID", value: pick(merchant, "id", "_id") ?? merchantId },
                                { label: "Business name", value: pick(merchant, "businessName", "tradeName") },
                                { label: "Business type", value: statusLabel(merchant.businessType) },
                                { label: "Email", value: merchant.email },
                                { label: "Mobile", value: pick(merchant, "mobile", "phone") },
                                { label: "Owner name", value: pick(merchant, "ownerName", "fullName") },
                                { label: "Status", value: statusLabel(pick(merchant, "status", "applicationStatus")) },
                                { label: "KYC status", value: pick(merchant, "kycStatus", "verificationStatus") },
                            ]} />
                        </Section>

                        <Section title="Profile metadata">
                            <Fields items={[
                                { label: "Created", value: merchant.createdAt },
                                { label: "Updated", value: merchant.updatedAt },
                                { label: "MCC category", value: pick(merchant, "mccCategory", "category") },
                                { label: "Expected monthly volume", value: pick(merchant, "expectedMonthlyVolume", "monthlyVolume") },
                                { label: "Description", value: merchant.description },
                                ...Object.entries(socialHandles ?? {}).map(([platform, value]) => ({ label: `Social: ${platform}`, value, href: true })),
                            ]} />
                        </Section>

                        <Section title="Address">
                            <Fields items={[
                                { label: "Address line 1", value: pick(address, "addressLine1", "line1") },
                                { label: "Address line 2", value: pick(address, "addressLine2", "line2") },
                                { label: "City", value: pick(address, "addressCity", "city") },
                                { label: "State", value: pick(address, "addressState", "state") },
                                { label: "LGA", value: pick(address, "lga", "LGA") },
                                { label: "Country", value: pick(address, "addressCountry", "country") },
                                { label: "Proof of address", value: pick(address, "proofOfAddressUrl", "proofOfAddress", "addressProofUrl"), href: true },
                            ]} />
                        </Section>

                        <Section title="KYC verification statuses">
                            <Fields items={[
                                { label: "BVN", value: merchant.bvnStatus },
                                { label: "Face", value: pick(merchant, "faceMatchStatus", "faceStatus") },
                                { label: "NIN", value: merchant.ninStatus },
                                { label: "CAC", value: merchant.cacStatus },
                                { label: "TIN", value: merchant.tinStatus },
                                { label: "Bank", value: pick(merchant, "nubanStatus", "bankStatus") },
                            ]} />
                        </Section>

                        <Section title="Business and legal details">
                            <Fields items={[
                                { label: "CAC number", value: pick(merchant, "cacNumber", "rcNumber") },
                                { label: "TIN", value: pick(merchant, "tinNumber", "taxIdentificationNumber") },
                                { label: "SCUML number", value: pick(merchant, "scumlNumber", "scuml") },
                                { label: "Sector license", value: pick(merchant, "sectorLicense", "sectorLicenseNumber") },
                                { label: "Company verification", value: pick(merchant, "companyVerificationStatus", "companyStatus") },
                            ]} />
                        </Section>

                        <Section title="Directors / persons">
                            <RecordTable rows={directors} emptyMessage="No directors or persons are listed." columns={[
                                { label: "Full name", keys: ["fullName", "name"] },
                                { label: "Role", keys: ["role", "position"] },
                                { label: "Ownership %", keys: ["ownershipPercentage", "ownershipPercent", "ownership"] },
                                { label: "BVN", keys: ["bvn", "bvnStatus"] },
                                { label: "NIN", keys: ["nin", "ninStatus"] },
                                { label: "Status", keys: ["status", "verificationStatus"] },
                            ]} />
                        </Section>

                        <Section title="Audit log">
                            <RecordTable rows={auditRows} emptyMessage="No KYC events or admin decisions are available." columns={[
                                { label: "Event / decision", keys: ["description", "message", "event", "action", "type", "decision", "status"] },
                                { label: "Performed by", keys: ["adminName", "performedBy", "actor", "adminEmail"] },
                                { label: "Timestamp", keys: ["timestamp", "createdAt", "decidedAt"] },
                            ]} />
                        </Section>

                        <Section title="QR codes">
                            <RecordTable rows={qrCodes} emptyMessage="No QR codes have been generated." columns={[
                                { label: "Code / ID", keys: ["id", "_id", "code", "reference"] },
                                { label: "URL", keys: ["url", "qrUrl", "imageUrl"], href: true },
                                { label: "Status", keys: ["status", "active"] },
                                { label: "Created", keys: ["createdAt"] },
                            ]} />
                        </Section>

                        <Section title="Payment links">
                            <RecordTable rows={paymentLinks} emptyMessage="No payment links are available." columns={[
                                { label: "Payment link", keys: ["url", "paymentUrl", "shortUrl", "link"], href: true },
                                { label: "Reference", keys: ["id", "_id", "reference"] },
                                { label: "Active", keys: ["active", "isActive", "status"] },
                                { label: "Created", keys: ["createdAt"] },
                            ]} />
                        </Section>

                        <Section title="Virtual accounts">
                            <RecordTable rows={virtualAccounts} emptyMessage="No virtual accounts are available." columns={[
                                { label: "Bank", keys: ["bankName", "bank"] },
                                { label: "Account number", keys: ["accountNumber", "accountNo"] },
                                { label: "Account name", keys: ["accountName", "name"] },
                                { label: "Status", keys: ["status"] },
                            ]} />
                        </Section>
                    </div>
                </>
            )}
        </div>
    );
}
