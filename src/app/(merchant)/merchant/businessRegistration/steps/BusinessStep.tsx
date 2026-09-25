"use client";

import React, { useState } from "react";
import { merchant } from "@/lib/apiClient";
import handleError from "@/helper/handleError";
import { Field, Input, Select, TextArea, StepFooter } from "../ui";
import { MCC_CATEGORIES, BUSINESS_TYPES } from "../constants";

export interface BusinessData {
  businessName: string;
  businessType: string;
  tradeName: string;
  mccCategory: string;
  description: string;
  expectedMonthlyVolume: string;
}

export default function BusinessStep({
  initial,
  onNext,
}: {
  initial: BusinessData;
  onNext: (data: BusinessData) => void;
}) {
  const [data, setData] = useState<BusinessData>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const set = (field: keyof BusinessData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setData((d) => ({ ...d, [field]: e.target.value }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (data.businessName.trim().length < 2) e.businessName = "Business name is required";
    if (!data.businessType) e.businessType = "Select a business type";
    if (!data.mccCategory) e.mccCategory = "Select a business category";
    if (!data.expectedMonthlyVolume || Number(data.expectedMonthlyVolume) <= 0)
      e.expectedMonthlyVolume = "Enter your expected monthly volume";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await merchant.kyc.business({
        businessName: data.businessName.trim(),
        businessType: data.businessType,
        tradeName: data.tradeName.trim() || undefined,
        mccCategory: data.mccCategory,
        description: data.description.trim() || undefined,
        expectedMonthlyVolume: Number(data.expectedMonthlyVolume),
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
        <Field label="Business Name" error={errors.businessName}>
          <Input icon="solar:shop-2-bold" value={data.businessName} onChange={set("businessName")} placeholder="Business Name" />
        </Field>

        <Field label="Business Type" error={errors.businessType}>
          <Select icon="solar:case-bold" value={data.businessType} onChange={set("businessType")} options={BUSINESS_TYPES} placeholder="Select business type" />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Trade Name (optional)">
          <Input icon="solar:tag-bold" value={data.tradeName} onChange={set("tradeName")} placeholder="Name customers know you by" />
        </Field>

        <Field label="Business Category" error={errors.mccCategory}>
          <Select
            icon="solar:widget-5-bold"
            value={data.mccCategory}
            onChange={set("mccCategory")}
            options={MCC_CATEGORIES.map((c) => ({ value: c, label: c.replace(/_/g, " ") }))}
            placeholder="Select category"
          />
        </Field>
      </div>

      <Field label="Expected Monthly Volume (NGN)" error={errors.expectedMonthlyVolume}>
        <Input icon="solar:wallet-money-bold" type="number" min="0" value={data.expectedMonthlyVolume} onChange={set("expectedMonthlyVolume")} placeholder="500000" />
      </Field>

      <Field label="Business Description (optional)">
        <TextArea icon="solar:document-text-bold" rows={3} value={data.description} onChange={set("description")} placeholder="Describe your Business" />
      </Field>

      <StepFooter onNext={submit} loading={loading} showBack={false} />
    </div>
  );
}
