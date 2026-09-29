"use client";

import React, { useState } from "react";
import { merchant } from "@/lib/apiClient";
import handleError from "@/helper/handleError";
import { Field, Input, Checkbox, StepFooter } from "../ui";

export interface BvnData {
  bvn: string;
  ownerName: string;
  ownerDob: string; // yyyy-mm-dd (date input value)
  mobile: string;
  consent: boolean;
}

export default function BvnStep({
  initial,
  onNext,
  onBack,
}: {
  initial: BvnData;
  onNext: (data: BvnData) => void;
  onBack: () => void;
}) {
  const [data, setData] = useState<BvnData>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const today = new Date();
  const todayValue = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const minimumDob = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
  const minimumDobValue = `${minimumDob.getFullYear()}-${String(minimumDob.getMonth() + 1).padStart(2, "0")}-${String(minimumDob.getDate()).padStart(2, "0")}`;

  const set = (field: keyof BvnData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setData((d) => ({ ...d, [field]: e.target.value }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!/^\d{11}$/.test(data.bvn)) e.bvn = "BVN must be exactly 11 digits";
    if (data.ownerName.trim().length < 2) e.ownerName = "Owner name is required";
    if (!data.ownerDob) e.ownerDob = "Date of birth is required";
    else if (data.ownerDob > todayValue) e.ownerDob = "Date of birth cannot be in the future";
    else if (data.ownerDob > minimumDobValue) e.ownerDob = "Owner must be at least 18 years old";
    if (!/^(?:\+234|234|0)[789][01]\d{8}$/.test(data.mobile))
      e.mobile = "Invalid Nigerian mobile number format. Use 080... or +234...";
    if (!data.consent) e.consent = "Consent to BVN verification is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await merchant.kyc.bvn({
        bvn: data.bvn,
        ownerName: data.ownerName.trim(),
        ownerDob: new Date(data.ownerDob).toISOString(),
        mobile: data.mobile.trim(),
        consent: true,
      });
      onNext(data);
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Bank Verification Number (BVN)" error={errors.bvn} hint="11-digit number issued by your bank">
          <Input icon="solar:card-bold" value={data.bvn} onChange={set("bvn")} maxLength={11} placeholder="22233344455" />
        </Field>

        <Field label="Owner Full Name" error={errors.ownerName} hint="Must match the name on your BVN record">
          <Input icon="solar:user-bold" value={data.ownerName} onChange={set("ownerName")} placeholder="As it appears on your BVN" />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Owner Date of Birth" error={errors.ownerDob}>
          <Input
            icon="solar:calendar-bold"
            type="date"
            max={minimumDobValue}
            value={data.ownerDob}
            onChange={(e) => {
              set("ownerDob")(e);
              setErrors((current) => ({
                ...current,
                ownerDob:
                  e.target.value > todayValue
                    ? "Date of birth cannot be in the future"
                    : e.target.value > minimumDobValue
                      ? "Owner must be at least 18 years old"
                      : "",
              }));
            }}
          />
        </Field>

        <Field label="Mobile Number" error={errors.mobile}>
          <Input icon="solar:phone-bold" value={data.mobile} onChange={set("mobile")} placeholder="08012345678" />
        </Field>
      </div>

      <Checkbox
        checked={data.consent}
        onChange={(checked) => setData((d) => ({ ...d, consent: checked }))}
        label="I consent to my BVN details being verified with NIBSS for identity verification purposes."
      />
      {errors.consent && <p className="text-xs text-red-500 -mt-2">{errors.consent}</p>}

      <StepFooter onNext={submit} onBack={onBack} loading={loading} />
    </div>
  );
}
