"use client";

import React, { useState } from "react";
import { merchant } from "@/lib/apiClient";
import handleError from "@/helper/handleError";
import { Field, Input, StepFooter } from "../ui";

export default function NinStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [nin, setNin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!/^\d{11}$/.test(nin)) {
      setError("NIN must be exactly 11 digits");
      return;
    }
    setLoading(true);
    try {
      await merchant.kyc.nin({ nin });
      onNext();
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Field label="National Identification Number (NIN)" error={error} hint="11-digit number from your NIN slip/card">
        <Input icon="solar:card-2-bold" value={nin} onChange={(e) => setNin(e.target.value)} maxLength={11} placeholder="12345678901" />
      </Field>

      <StepFooter onNext={submit} onBack={onBack} loading={loading} />
    </div>
  );
}
