"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { merchant } from "@/lib/apiClient";
import handleError from "@/helper/handleError";
import { Field, Input, Select, StepFooter } from "../ui";
import { businessRequiresDirectors, requiresScuml as requiresScumlFor } from "../constants";

interface Director {
  fullName: string;
  personRole: "DIRECTOR" | "SHAREHOLDER_UBO";
  bvn: string;
  nin: string;
  ownershipPercent: string;
}

const EMPTY_DIRECTOR: Director = { fullName: "", personRole: "DIRECTOR", bvn: "", nin: "", ownershipPercent: "" };

export default function KybStep({
  businessType,
  mccCategory,
  onNext,
  onBack,
}: {
  businessType: string;
  mccCategory: string;
  onNext: () => void;
  onBack: () => void;
}) {
  const skip = businessType === "INDIVIDUAL_TRADER" || businessType === "SOLE_PROPRIETORSHIP";
  const requiresCac = businessType !== "INDIVIDUAL_TRADER" && businessType !== "SOLE_PROPRIETORSHIP";
  const requiresDirectors = businessRequiresDirectors(businessType);
  const scumlRequired = requiresScumlFor(mccCategory);

  const [cacNumber, setCacNumber] = useState("");
  const [tin, setTin] = useState("");
  const [scumlNumber, setScumlNumber] = useState("");
  const [sectorLicenseNumber, setSectorLicenseNumber] = useState("");
  const [directors, setDirectors] = useState<Director[]>([{ ...EMPTY_DIRECTOR }]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(!!skip);

  // Individual and sole proprietorship businesses never see this step — the
  // backend still accepts an empty call as a safe fallback for stale sessions.
  useEffect(() => {
    if (!skip) return;
    (async () => {
      try {
        await merchant.kyc.kyb({});
        onNext();
      } catch (error) {
        handleError(error);
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skip]);

  if (skip) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-gray-400">
        {loading ? "Skipping business verification..." : "Could not skip automatically — please retry."}
      </div>
    );
  }

  const updateDirector = (i: number, field: keyof Director, value: string) => {
    setDirectors((ds) => ds.map((d, idx) => (idx === i ? { ...d, [field]: value } : d)));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (requiresCac && !cacNumber.trim()) e.cacNumber = "CAC number is required for registered businesses";
    if (requiresDirectors && !tin.trim()) e.tin = "TIN is required for this business type";
    if (scumlRequired && !scumlNumber.trim()) e.scumlNumber = "SCUML number is required for this business category";
    if (requiresDirectors) {
      directors.forEach((d, i) => {
        if (!d.fullName.trim()) e[`director-${i}-name`] = "Name is required";
        if (!/^\d{11}$/.test(d.bvn)) e[`director-${i}-bvn`] = "BVN must be 11 digits";
        if (!/^\d{11}$/.test(d.nin)) e[`director-${i}-nin`] = "NIN must be 11 digits";
      });
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await merchant.kyc.kyb({
        ...(requiresCac ? { cacNumber: cacNumber.trim() } : {}),
        tin: tin.trim() || undefined,
        scumlNumber: scumlNumber.trim() || undefined,
        ...(requiresCac ? { sectorLicenseNumber: sectorLicenseNumber.trim() || undefined } : {}),
        directors: requiresDirectors
          ? directors.map((d) => ({
              fullName: d.fullName.trim(),
              personRole: d.personRole,
              bvn: d.bvn,
              nin: d.nin,
              ownershipPercent: d.ownershipPercent ? Number(d.ownershipPercent) : undefined,
            }))
          : undefined,
      });
      onNext();
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {requiresCac && (
        <Field label="CAC Registration Number" error={errors.cacNumber}>
          <Input icon="solar:document-bold" value={cacNumber} onChange={(e) => setCacNumber(e.target.value)} placeholder="RC1234567 or BN1234567" />
        </Field>
      )}

      {requiresDirectors && (
        <Field label="Tax Identification Number (TIN)" error={errors.tin}>
          <Input icon="solar:hashtag-square-bold" value={tin} onChange={(e) => setTin(e.target.value)} placeholder="TIN" />
        </Field>
      )}

      {scumlRequired && (
        <Field label="SCUML Number" error={errors.scumlNumber} hint="Required for this business category">
          <Input icon="solar:shield-check-bold" value={scumlNumber} onChange={(e) => setScumlNumber(e.target.value)} placeholder="SCUML number" />
        </Field>
      )}

      {requiresCac && (
        <Field label="Sector License Number (optional)" hint="e.g. PCN, NAFDAC — if applicable">
          <Input icon="solar:medal-ribbon-bold" value={sectorLicenseNumber} onChange={(e) => setSectorLicenseNumber(e.target.value)} />
        </Field>
      )}

      {requiresDirectors && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Directors / Shareholders (UBOs)</span>
            <button
              type="button"
              onClick={() => setDirectors((ds) => [...ds, { ...EMPTY_DIRECTOR }])}
              className="text-xs font-medium text-violet-600 hover:underline flex items-center gap-1"
            >
              <Icon icon="solar:add-circle-bold" width={16} /> Add person
            </button>
          </div>

          {directors.map((d, i) => (
            <div key={i} className="border border-gray-200 rounded-xl p-4 flex flex-col gap-3 relative">
              {directors.length > 1 && (
                <button
                  type="button"
                  onClick={() => setDirectors((ds) => ds.filter((_, idx) => idx !== i))}
                  className="absolute top-3 right-3 text-gray-300 hover:text-red-500"
                  aria-label="Remove"
                >
                  <Icon icon="solar:trash-bin-trash-bold" width={16} />
                </button>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Full Name" error={errors[`director-${i}-name`]}>
                  <Input icon="solar:user-bold" value={d.fullName} onChange={(e) => updateDirector(i, "fullName", e.target.value)} />
                </Field>
                <Field label="Role">
                  <Select
                    icon="solar:case-bold"
                    value={d.personRole}
                    onChange={(e) => updateDirector(i, "personRole", e.target.value)}
                    options={[
                      { value: "DIRECTOR", label: "Director" },
                      { value: "SHAREHOLDER_UBO", label: "Shareholder / UBO" },
                    ]}
                  />
                </Field>
                <Field label="BVN" error={errors[`director-${i}-bvn`]}>
                  <Input icon="solar:card-bold" value={d.bvn} onChange={(e) => updateDirector(i, "bvn", e.target.value)} maxLength={11} />
                </Field>
                <Field label="NIN" error={errors[`director-${i}-nin`]}>
                  <Input icon="solar:card-2-bold" value={d.nin} onChange={(e) => updateDirector(i, "nin", e.target.value)} maxLength={11} />
                </Field>
                <Field label="Ownership % (optional)">
                  <Input
                    icon="solar:pie-chart-2-bold"
                    type="number"
                    min="0"
                    max="100"
                    value={d.ownershipPercent}
                    onChange={(e) => updateDirector(i, "ownershipPercent", e.target.value)}
                  />
                </Field>
              </div>
            </div>
          ))}
        </div>
      )}

      <StepFooter onNext={submit} onBack={onBack} loading={loading} />
    </div>
  );
}
