"use client";

import React, { useState } from "react";
import { merchant } from "@/lib/apiClient";
import handleError from "@/helper/handleError";
import { compressImageToBase64 } from "@/helper/fileToBase64";
import { Field, Input, Select, ImageDropInput, StepFooter } from "../ui";
import { NIGERIAN_STATES } from "../constants";

export interface AddressData {
  addressLine1: string;
  addressLine2: string;
  addressCity: string;
  addressState: string;
  addressLga: string;
}

export default function AddressStep({
  initial,
  proofRequired,
  onNext,
  onBack,
}: {
  initial: AddressData;
  proofRequired: boolean;
  onNext: (data: AddressData) => void;
  onBack: () => void;
}) {
  const [data, setData] = useState<AddressData>(initial);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const set = (field: keyof AddressData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => setData((d) => ({ ...d, [field]: e.target.value }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (data.addressLine1.trim().length < 5) e.addressLine1 = "Enter a valid address";
    if (data.addressCity.trim().length < 2) e.addressCity = "City is required";
    if (!data.addressState) e.addressState = "Select a state";
    if (data.addressLga.trim().length < 2) e.addressLga = "LGA is required";
    if (proofRequired && !proofFile) e.proof = "Proof of address is required for this business type";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const proofOfAddressImage = proofFile ? await compressImageToBase64(proofFile) : undefined;
      await merchant.kyc.address({
        addressLine1: data.addressLine1.trim(),
        addressLine2: data.addressLine2.trim() || undefined,
        addressCity: data.addressCity.trim(),
        addressState: data.addressState,
        addressLga: data.addressLga.trim(),
        addressCountry: "Nigeria",
        proofOfAddressImage,
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
        <Field label="Address Line 1" error={errors.addressLine1}>
          <Input icon="solar:map-point-bold" value={data.addressLine1} onChange={set("addressLine1")} placeholder="Street address" />
        </Field>

        <Field label="Address Line 2 (optional)">
          <Input icon="solar:home-2-bold" value={data.addressLine2} onChange={set("addressLine2")} placeholder="Apartment, suite, etc." />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="City" error={errors.addressCity}>
          <Input icon="solar:city-bold" value={data.addressCity} onChange={set("addressCity")} placeholder="Ikeja" />
        </Field>
        <Field label="State" error={errors.addressState}>
          <Select
            icon="solar:flag-bold"
            value={data.addressState}
            onChange={set("addressState")}
            options={NIGERIAN_STATES.map((s) => ({ value: s, label: s }))}
            placeholder="Select state"
          />
        </Field>
      </div>

      <Field label="Local Government Area (LGA)" error={errors.addressLga}>
        <Input icon="solar:point-on-map-bold" value={data.addressLga} onChange={set("addressLga")} placeholder="e.g. Ikeja" />
      </Field>

      {proofRequired && (
        <Field label="Proof of Address" error={errors.proof} hint="Utility bill or bank statement, no older than 3 months">
          <ImageDropInput
            previewLabel="Click to upload proof of address"
            fileName={proofFile?.name}
            onFile={(f) => {
              setProofFile(f);
              setErrors((e) => ({ ...e, proof: "" }));
            }}
          />
        </Field>
      )}

      <StepFooter onNext={submit} onBack={onBack} loading={loading} />
    </div>
  );
}
