"use client";

import React, { useState } from "react";
import { merchant } from "@/lib/apiClient";
import handleError from "@/helper/handleError";
import { Checkbox, StepFooter } from "../ui";

export default function DecisionStep({
  onSubmitted,
  onBack,
}: {
  onSubmitted: (status: string) => void;
  onBack: () => void;
}) {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyConsentAccepted, setPrivacyConsentAccepted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!termsAccepted || !privacyConsentAccepted) {
      setError("You must accept both to continue");
      return;
    }
    setLoading(true);
    try {
      const response = await merchant.kyc.submit({ termsAccepted: true, privacyConsentAccepted: true });
      const payload = response.data?.data ?? response.data;
      onSubmitted(payload?.status ?? "PENDING_REVIEW");
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-500">
        Review your details in the previous steps, then accept the terms below to submit your application.
      </p>

      <div className="flex flex-col gap-3 border border-gray-200 rounded-xl p-4">
        <Checkbox
          checked={termsAccepted}
          onChange={setTermsAccepted}
          label="I accept the Terms & Conditions of using Swipe as a merchant."
        />
        <Checkbox
          checked={privacyConsentAccepted}
          onChange={setPrivacyConsentAccepted}
          label="I consent to my data being processed in line with the NDPA privacy policy."
        />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}

      <StepFooter onNext={submit} onBack={onBack} loading={loading} nextLabel="Submit Application" nextIcon="solar:check-circle-bold" />
    </div>
  );
}
