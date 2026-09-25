"use client";

import React, { useEffect, useState } from "react";
import { merchant } from "@/lib/apiClient";
import handleError from "@/helper/handleError";
import { Field, Input, Select, StepFooter } from "../ui";

interface Bank {
  name: string;
  code: string;
}

export default function BankStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [banksLoading, setBanksLoading] = useState(true);
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const response = await merchant.getBanks();
        const list = response.data?.data ?? response.data;
        setBanks(Array.isArray(list) ? list : []);
      } catch (error) {
        handleError(error);
      } finally {
        setBanksLoading(false);
      }
    })();
  }, []);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!bankCode) e.bankCode = "Select your bank";
    if (!/^\d{10}$/.test(accountNumber)) e.accountNumber = "Account number must be exactly 10 digits";
    if (accountName.trim().length < 2) e.accountName = "Account name is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await merchant.kyc.bank({ bankCode, accountNumber, accountName: accountName.trim() });
      onNext();
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Field label="Settlement Bank" error={errors.bankCode}>
        <Select
          icon="solar:buildings-bold"
          value={bankCode}
          onChange={(e) => setBankCode(e.target.value)}
          options={banks.map((b) => ({ value: b.code, label: b.name }))}
          placeholder={banksLoading ? "Loading banks..." : "Select your bank"}
          disabled={banksLoading}
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Account Number" error={errors.accountNumber} hint="10-digit NUBAN account number">
          <Input icon="solar:card-bold" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} maxLength={10} placeholder="0123456789" />
        </Field>

        <Field label="Account Name" error={errors.accountName} hint="Must match your BVN name">
          <Input icon="solar:user-id-bold" value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="As it appears on your bank account" />
        </Field>
      </div>

      <StepFooter onNext={submit} onBack={onBack} loading={loading} />
    </div>
  );
}
