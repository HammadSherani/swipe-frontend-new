// Centralized API endpoint definitions
const API = {
  AUTH: {
    LOGIN: "/auth/login",
    REGISTER: "/auth/register/initiate",
    FORGOT_PASSWORD: "/auth/forgot-password",
    RESET_PASSWORD: "/auth/reset-password",
    VERIFY: "/auth/verify",
    VERIFY_OTP: "/auth/register/verify",
    RESEND_OTP: "/auth/register/resend-otp",
    LOGOUT: "/auth/logout",
    REFRESH: "/auth/refresh",
  },
  USER: {
    PROFILE: "/user/profile",
    UPDATE_PROFILE: "/user/update",
  },

  MERCHANT: {
    ME: "/merchant/me",
    GET_BANKS: "/merchant/getBanks",
    KYC: {
      STATUS: "/merchant/kyc/status",
      BVN: "/merchant/kyc/bvn",
      FACE: "/merchant/kyc/face",
      FACE_LINK: "/merchant/kyc/face/link",
      faceLinkToken: (token: string) => `/merchant/kyc/face/link/${token}`,
      NIN: "/merchant/kyc/nin",
      BUSINESS: "/merchant/kyc/business",
      ADDRESS: "/merchant/kyc/address",
      KYB: "/merchant/kyc/kyb",
      BANK: "/merchant/kyc/bank",
      SUBMIT: "/merchant/kyc/submit",
    },
  },

  ADMIN: {
    STATS: "/admin/dashboard/stats",
    PENDING_REVIEW: "/admin/merchants/pending-review",
    decide: (id: string) => `/admin/merchants/${id}/decide`,
  },
};

export default API;
