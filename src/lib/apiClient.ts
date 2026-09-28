import axiosInstance, { setAuthToken } from "./axiosInstance";
import API from "./apiEndpoints";

type AnyObj = Record<string, any>;

export const auth = {
  login: (payload: AnyObj) => axiosInstance.post(API.AUTH.LOGIN, payload),
  register: (payload: AnyObj) => axiosInstance.post(API.AUTH.REGISTER, payload),
  forgotPassword: (payload: AnyObj) => axiosInstance.post(API.AUTH.FORGOT_PASSWORD, payload),
  resetPassword: (payload: AnyObj) => axiosInstance.post(API.AUTH.RESET_PASSWORD, payload),
  verifyOtp: (payload: AnyObj) => axiosInstance.post(API.AUTH.VERIFY_OTP, payload),
  resendOtp: (payload: AnyObj) => axiosInstance.post(API.AUTH.RESEND_OTP, payload),
  logout: (refreshToken?: string) => axiosInstance.post(API.AUTH.LOGOUT, { refreshToken }),
  verify: () => axiosInstance.get(API.AUTH.VERIFY),
};
export const merchant = {
  me: () => axiosInstance.get(API.MERCHANT.ME),
  getBanks: () => axiosInstance.get(API.MERCHANT.GET_BANKS),
  kyc: {
    status: () => axiosInstance.get(API.MERCHANT.KYC.STATUS),
    bvn: (payload: AnyObj) => axiosInstance.post(API.MERCHANT.KYC.BVN, payload),
    face: (payload: AnyObj) => axiosInstance.post(API.MERCHANT.KYC.FACE, payload),
    faceLink: {
      create: (payload: AnyObj) => axiosInstance.post(API.MERCHANT.KYC.FACE_LINK, payload),
      check: (token: string) => axiosInstance.get(API.MERCHANT.KYC.faceLinkToken(token)),
      submit: (token: string, payload: AnyObj) => axiosInstance.post(API.MERCHANT.KYC.faceLinkToken(token), payload),
    },
    nin: (payload: AnyObj) => axiosInstance.post(API.MERCHANT.KYC.NIN, payload),
    business: (payload: AnyObj) => axiosInstance.post(API.MERCHANT.KYC.BUSINESS, payload),
    address: (payload: AnyObj) => axiosInstance.post(API.MERCHANT.KYC.ADDRESS, payload),
    kyb: (payload: AnyObj) => axiosInstance.post(API.MERCHANT.KYC.KYB, payload),
    bank: (payload: AnyObj) => axiosInstance.post(API.MERCHANT.KYC.BANK, payload),
    submit: (payload: AnyObj) => axiosInstance.post(API.MERCHANT.KYC.SUBMIT, payload),
  },
};

export const admin = {
  stats: () => axiosInstance.get(API.ADMIN.STATS),
  merchants: () => axiosInstance.get(API.ADMIN.MERCHANTS),
  pendingReview: () => axiosInstance.get(API.ADMIN.PENDING_REVIEW),
  merchant: (id: string) => axiosInstance.get(API.ADMIN.merchant(id)),
  decide: (id: string, payload: AnyObj) => axiosInstance.post(API.ADMIN.decide(id), payload),
  block: (id: string) => axiosInstance.post(API.ADMIN.block(id)),
};

export const user = {
  getProfile: () => axiosInstance.get(API.USER.PROFILE),
  updateProfile: (payload: AnyObj) => axiosInstance.put(API.USER.UPDATE_PROFILE, payload),
};

export { setAuthToken };

export default { auth, user, merchant, admin };
