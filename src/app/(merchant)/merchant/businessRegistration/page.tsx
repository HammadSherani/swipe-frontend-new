"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import toast from "react-hot-toast";
import { auth, merchant } from "@/lib/apiClient";
import { setKycStatus, clearTokens, getRefreshToken } from "@/lib/tokenStorage";
import handleError from "@/helper/handleError";
import { STEP_ORDER, STEP_LABELS, StepKey, getVisibleSteps } from "./constants";
import BusinessStep, { BusinessData } from "./steps/BusinessStep";
import BvnStep, { BvnData } from "./steps/BvnStep";
import FaceStep from "./steps/FaceStep";
import NinStep from "./steps/NinStep";
import AddressStep, { AddressData } from "./steps/AddressStep";
import KybStep from "./steps/KybStep";
import BankStep from "./steps/BankStep";
import DecisionStep from "./steps/DecisionStep";
import { SectionHeader } from "./ui";

const EMPTY_BUSINESS: BusinessData = {
  businessName: "",
  businessType: "",
  tradeName: "",
  mccCategory: "",
  description: "",
  expectedMonthlyVolume: "",
};

const EMPTY_BVN: BvnData = { bvn: "", ownerName: "", ownerDob: "", mobile: "", consent: false };

const EMPTY_ADDRESS: AddressData = { addressLine1: "", addressLine2: "", addressCity: "", addressState: "", addressLga: "" };

function toDateInputValue(value: unknown): string {
  if (!value) return "";
  const d = new Date(value as string);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

// A plain document navigation rather than next/navigation's router.replace()/push() —
// this router has repeatedly proven unreliable in this project's Next.js build when
// firing right after a proxy-level redirect (see the login-page investigation this
// KYC flow inherited): the call succeeds with no error but the URL never changes.
// This bypasses that flakiness entirely.
function goToDashboard() {
  window.location.href = "/merchant/dashboard";
}

function goToLogin() {
  clearTokens();
  window.location.href = "/auth/login";
}

export default function BusinessRegistrationPage() {
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [stepKey, setStepKey] = useState<StepKey>("BUSINESS");
  const [businessData, setBusinessData] = useState<BusinessData>(EMPTY_BUSINESS);
  const [bvnData, setBvnData] = useState<BvnData>(EMPTY_BVN);
  const [addressData, setAddressData] = useState<AddressData>(EMPTY_ADDRESS);
  const [finalStatus, setFinalStatus] = useState<string | null>(null);

  const visibleSteps = getVisibleSteps(businessData.businessType);

  const loadInitial = async () => {
    setLoading(true);
    try {
      const [statusRes, meRes] = await Promise.all([merchant.kyc.status(), merchant.me()]);
      const status = statusRes.data?.data ?? statusRes.data;
      const me = meRes.data?.data ?? meRes.data;

      if (me) {
        setBusinessData({
          businessName: me.businessName === "Pending Onboarding" ? "" : me.businessName ?? "",
          businessType: me.businessType ?? "",
          tradeName: me.tradeName ?? "",
          mccCategory: me.mccCategory ?? "",
          description: me.description ?? "",
          expectedMonthlyVolume: me.expectedMonthlyVolume ? String(me.expectedMonthlyVolume) : "",
        });
        setBvnData((d) => ({
          ...d,
          ownerName: me.ownerName === "Pending Onboarding" ? "" : me.ownerName ?? "",
          ownerDob: toDateInputValue(me.ownerDob),
          mobile: me.mobile ?? "",
        }));
        setAddressData({
          addressLine1: me.addressLine1 === "Not Provided" ? "" : me.addressLine1 ?? "",
          addressLine2: me.addressLine2 ?? "",
          addressCity: me.addressCity ?? "",
          addressState: me.addressState ?? "",
          addressLga: me.addressLga ?? "",
        });
      }

      if (status?.nextStep === "DONE") {
        setKycStatus(status.merchantStatus === "ACTIVE" ? "APPROVED" : "UNDER_REVIEW");
        goToDashboard();
        return;
      }

      setStepKey((status?.nextStep as StepKey) ?? "BUSINESS");
    } catch (error) {
      // A token whose user/merchant no longer exists in the DB (401 on the
      // token itself, or 404 "please register first" from a stale session
      // pointing at a deleted account) means this session is dead — bounce to
      // login instead of leaving the merchant stuck on a form that can never
      // submit.
      const status = (error as { status?: number })?.status;
      if (status === 401 || status === 404) {
        goToLogin();
        return;
      }
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-derive the authoritative next step from the backend after every step
  // submission — this is what makes auto-skipped steps (Face for CAC-registered
  // businesses, KYB for individual traders) fall through correctly instead of
  // the UI guessing at the sequence itself.
  const refreshStatus = async () => {
    try {
      const response = await merchant.kyc.status();
      const status = response.data?.data ?? response.data;
      if (status?.nextStep === "DONE") {
        setKycStatus(status.merchantStatus === "ACTIVE" ? "APPROVED" : "UNDER_REVIEW");
        goToDashboard();
        return;
      }
      setStepKey((status?.nextStep as StepKey) ?? "BUSINESS");
    } catch (error) {
      handleError(error);
    }
  };

  const goBack = () => {
    const idx = visibleSteps.indexOf(stepKey as (typeof STEP_ORDER)[number]);
    if (idx > 0) setStepKey(visibleSteps[idx - 1]);
  };

  const handleDecisionSubmitted = (status: string) => {
    setKycStatus(status === "ACTIVE" ? "APPROVED" : "UNDER_REVIEW");
    setFinalStatus(status);
    toast.success(status === "ACTIVE" ? "You're approved!" : "Application submitted for review");
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await auth.logout(getRefreshToken() ?? undefined);
    } catch {
      // Always clear the local session, even if the logout request fails.
    } finally {
      goToLogin();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 text-sm text-gray-400">
        Loading your application...
      </div>
    );
  }

  if (finalStatus) {
    const approved = finalStatus === "ACTIVE";
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="max-w-md text-center flex flex-col items-center gap-4 px-6">
          <Icon
            icon={approved ? "solar:check-circle-bold" : "solar:clock-circle-bold"}
            width={56}
            className={approved ? "text-green-500" : "text-amber-500"}
          />
          <h1 className="text-xl font-semibold text-gray-900">
            {approved ? "You're all set!" : "Application submitted"}
          </h1>
          <p className="text-sm text-gray-500">
            {approved
              ? "Your merchant account is active and ready to accept payments."
              : "We're reviewing your details — this usually takes 1-2 business days. We'll notify you once it's done."}
          </p>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="mt-2 px-6 py-3 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loggingOut ? "Logging out..." : "Logout"}
          </button>
        </div>
      </div>
    );
  }

  const currentIndex = Math.max(0, visibleSteps.indexOf(stepKey as (typeof STEP_ORDER)[number]));
  const hasBusinessType = Boolean(businessData.businessType);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-2xl">
        {/* Stepper is shown only after the business type determines the flow. */}
        {hasBusinessType && (
          <div className="relative mb-8 flex items-start justify-between">
            <div className="absolute left-3.5 right-3.5 top-3.5 h-0 border-t-2 border-dashed border-gray-300" />
            {visibleSteps.map((step, i) => {
              const completed = i < currentIndex;
              const active = i === currentIndex;
              return (
                <div key={step} className="relative z-10 flex flex-1 flex-col items-center gap-1.5">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                      completed || active
                        ? "bg-violet-600 text-white"
                        : "border-2 border-gray-300 bg-white text-gray-400"
                    }`}
                  >
                    {completed ? <Icon icon="solar:check-bold" width={14} /> : i + 1}
                  </div>
                  <span
                    className={`hidden text-center text-[10px] leading-tight sm:block ${
                      completed || active ? "font-semibold text-gray-900" : "font-medium text-gray-400"
                    }`}
                  >
                    {STEP_LABELS[step]}
                  </span>
                  {active && <span className="hidden h-0.5 w-6 rounded-full bg-violet-600 sm:block" />}
                </div>
              );
            })}
          </div>
        )}

        <h1 className="text-3xl font-extrabold text-gray-900 text-center mb-1">Business Registration Form</h1>
        <p className="text-sm text-gray-500 text-center mb-8">
          Please provide accurate information to help us onboard your business.
        </p>

        <div className="bg-white border border-gray-100 rounded-2xl p-6 sm:p-8 shadow-sm">
          <SectionHeader
            number={hasBusinessType ? currentIndex + 1 : undefined}
            title={STEP_LABELS[stepKey as (typeof STEP_ORDER)[number]]}
          />

          {stepKey === "BUSINESS" && (
            <BusinessStep
              initial={businessData}
              onBusinessTypeChange={(businessType) => setBusinessData((data) => ({ ...data, businessType }))}
              onNext={(data) => {
                setBusinessData(data);
                refreshStatus();
              }}
            />
          )}

          {stepKey === "BVN" && <BvnStep initial={bvnData} onNext={(data) => { setBvnData(data); refreshStatus(); }} onBack={goBack} />}

          {stepKey === "FACE" && <FaceStep onNext={refreshStatus} onBack={goBack} />}

          {stepKey === "NIN" && <NinStep onNext={refreshStatus} onBack={goBack} />}

          {stepKey === "ADDRESS" && (
            <AddressStep
              initial={addressData}
              onNext={(data) => {
                setAddressData(data);
                refreshStatus();
              }}
              onBack={goBack}
            />
          )}

          {stepKey === "KYB" && (
            <KybStep
              businessType={businessData.businessType}
              mccCategory={businessData.mccCategory}
              onNext={refreshStatus}
              onBack={goBack}
            />
          )}

          {stepKey === "BANK" && <BankStep onNext={refreshStatus} onBack={goBack} />}

          {stepKey === "DECISION" && <DecisionStep onSubmitted={handleDecisionSubmitted} onBack={goBack} />}
        </div>
      </div>
    </div>
  );
}
