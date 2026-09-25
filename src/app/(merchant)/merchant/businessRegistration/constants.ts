// Mirrors backend/src/config/restricted-mcc.ts — keep in sync if that file changes.
export const MCC_CATEGORIES = [
  "RETAIL",
  "GROCERY_STORES",
  "RESTAURANTS",
  "FASHION_APPAREL",
  "ELECTRONICS",
  "PHARMACY_HEALTH",
  "BEAUTY_SALON",
  "AUTOMOTIVE",
  "EDUCATION_SERVICES",
  "TRANSPORTATION_LOGISTICS",
  "HOTELS_HOSPITALITY",
  "AGRICULTURE",
  "CONSTRUCTION",
  "MANUFACTURING",
  "ENTERTAINMENT_MEDIA",
  "TELECOMMUNICATIONS",
  "PROFESSIONAL_SERVICES",
  "REAL_ESTATE",
  "JEWELRY_PRECIOUS_METALS",
  "LEGAL_SERVICES",
  "ACCOUNTING_SERVICES",
  "CASINO_GAMING",
  "OTHER",
];

// DNFBP categories — require a SCUML number at the KYB step (backend: requiresScuml()).
const DNFBP_MCC_CATEGORIES = [
  "REAL_ESTATE",
  "JEWELRY_PRECIOUS_METALS",
  "LEGAL_SERVICES",
  "ACCOUNTING_SERVICES",
  "CASINO_GAMING",
];

export function requiresScuml(mccCategory: string): boolean {
  return DNFBP_MCC_CATEGORIES.includes(mccCategory);
}

export const BUSINESS_TYPES = [
  { value: "INDIVIDUAL_TRADER", label: "Individual Trader (no CAC registration)" },
  { value: "SOLE_PROPRIETORSHIP", label: "Sole Proprietorship (CAC Business Name)" },
  { value: "PARTNERSHIP", label: "Partnership (CAC registered)" },
  { value: "LIMITED_LIABILITY", label: "Limited Liability (Ltd / LLC)" },
  { value: "INCORPORATED_TRUSTEES", label: "Incorporated Trustees (NGO / Association)" },
];

export function businessRequiresDirectors(businessType: string): boolean {
  return businessType === "PARTNERSHIP" || businessType === "LIMITED_LIABILITY";
}

export const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "Gombe", "Imo",
  "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos",
  "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers",
  "Sokoto", "Taraba", "Yobe", "Zamfara", "FCT",
];

// Steps in the exact order the backend gates them (kyc.service.ts#getKycStatus).
export const STEP_ORDER = [
  "BUSINESS",
  "BVN",
  "FACE",
  "NIN",
  "ADDRESS",
  "KYB",
  "BANK",
  "DECISION",
] as const;

export type StepKey = (typeof STEP_ORDER)[number] | "DONE";

// The stepper only shows steps that will actually happen for this merchant —
// Face is gated to INDIVIDUAL_TRADER only, KYB is skipped for INDIVIDUAL_TRADER
// (mirrors backend/src/modules/merchant/kyc.service.ts: faceRequired() and the
// INDIVIDUAL_TRADER branch in submitKybStep). Until a business type is picked
// (first visit to step 1) neither can be ruled out yet, so both stay visible.
export function getVisibleSteps(businessType: string): (typeof STEP_ORDER)[number][] {
  return STEP_ORDER.filter((step) => {
    if (step === "FACE") return !businessType || businessType === "INDIVIDUAL_TRADER";
    if (step === "KYB") return !businessType || businessType !== "INDIVIDUAL_TRADER";
    return true;
  });
}

export const STEP_LABELS: Record<(typeof STEP_ORDER)[number], string> = {
  BUSINESS: "Business",
  BVN: "BVN",
  FACE: "Face",
  NIN: "NIN",
  ADDRESS: "Address",
  KYB: "Statutory (KYB)",
  BANK: "Bank",
  DECISION: "Review & Submit",
};
