'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import verifyOtpImg from '../../../../public/assets/auth/verifyOtp-img.webp'
import Image from 'next/image';
import logo from '../../../../public/assets/logo.png'
import { auth } from '@/lib/apiClient';
import { setTokens } from '@/lib/tokenStorage';
import handleError from '@/helper/handleError';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface OtpState {
  mobile: string[];
  email: string[];
}

export default function VerifyOtpPage() {
  const [otp, setOtp] = useState<OtpState>({
    mobile: ['', '', '', '', '', ''],
    email: ['', '', '', '', '', ''],
  });
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const router = useRouter();

  const mobileRefs = useRef<(HTMLInputElement | null)[]>([]);
  const emailRefs = useRef<(HTMLInputElement | null)[]>([]);

  // ✅ Load email & mobile from localStorage on mount
  useEffect(() => {
    const storedEmail = localStorage.getItem('pendingEmail');
    const storedMobile = localStorage.getItem('pendingMobile');

    if (!storedEmail || !storedMobile) {
      // User came directly without registration
      router.push('/auth/register');
      return;
    }

    setEmail(storedEmail);
    setMobile(storedMobile);
  }, [router]);

  // Timer countdown
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer((t) => t - 1), 1000);
      return () => clearInterval(interval);
    } else {
      setCanResend(true);
    }
  }, [timer]);

  const handleChange = (type: 'mobile' | 'email', index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = { ...otp, [type]: [...otp[type]] };
    newOtp[type][index] = value.slice(-1);
    setOtp(newOtp);

    // Auto-focus next
    if (value && index < 5) {
      const refs = type === 'mobile' ? mobileRefs : emailRefs;
      refs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (type: 'mobile' | 'email', index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    const refs = type === 'mobile' ? mobileRefs : emailRefs;
    const currentOtp = otp[type];

    if (e.key === 'Backspace' && !currentOtp[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (type: 'mobile' | 'email', e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newOtp = { ...otp, [type]: [...otp[type]] };

    pasted.split('').forEach((digit, i) => {
      if (i < 6) newOtp[type][i] = digit;
    });

    setOtp(newOtp);

    const refs = type === 'mobile' ? mobileRefs : emailRefs;
    const focusIndex = Math.min(pasted.length, 5);
    refs.current[focusIndex]?.focus();
  };

  const handleResend = async () => {
    if (!canResend) return;

    // ✅ Use stored email/mobile
    const payload = {
      email,
      mobile,
      type: "email" // or "mobile" or "both"
    }

    try {
      await auth.resendOtp(payload);
      setTimer(30);
      setCanResend(false);
      setOtp({
        mobile: ['', '', '', '', '', ''],
        email: ['', '', '', '', '', ''],
      });
      toast.success('OTP resent successfully!');
    } catch (error) {
      handleError(error);
    }
  };

  const handleVerify = async () => {
    const mobileCode = otp.mobile.join('');
    const emailCode = otp.email.join('');
    if (mobileCode.length !== 6 || emailCode.length !== 6) return;

    // ✅ Use stored email/mobile
    const payload = {
      email,
      emailOtp: emailCode,
      mobile,
      mobileOtp: mobileCode,
    }

    try {
      const response = await auth.verifyOtp(payload);
      const resData = response.data?.data ?? response.data;
      const accessToken = resData?.accessToken;
      const refreshToken = resData?.refreshToken;
      const user = resData?.user;

      if (!accessToken) {
        throw new Error('Verification response did not include an access token.');
      }

      // setTokens writes both localStorage (what axios/client code reads) and
      // the mirrored cookies proxy.ts needs — using setAuthToken here (as this
      // page did before) only wrote localStorage, so the very next navigation
      // to /merchant/businessRegistration got bounced back to /auth/login by
      // the middleware, which can only see cookies.
      setTokens(accessToken, refreshToken);
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
      }

      toast.success('Registration successful!');

      // ✅ Clean storage
      localStorage.removeItem('pendingEmail');
      localStorage.removeItem('pendingMobile');

      if (user?.role === 'ADMIN') {
        router.push('/admin/dashboard');
      } else if (resData?.redirectTo === 'KYC_ONBOARDING') {
        router.push('/merchant/businessRegistration');
      } else {
        router.push('/merchant/dashboard');
      }

    } catch (error) {
      // Expired OTP: the pending registration is kept server-side, so let the user
      // request a new one right away instead of waiting out the resend timer.
      if ((error as { data?: { error?: { code?: string } } })?.data?.error?.code === 'OTP_EXPIRED') {
        setTimer(0);
        setCanResend(true);
      }
      handleError(error);
    }
  };

  const isMobileComplete = otp.mobile.every((digit) => digit !== '');
  const isEmailComplete = otp.email.every((digit) => digit !== '');
  const isComplete = isMobileComplete && isEmailComplete;


  return (
    <div className="flex min-h-screen bg-white">
      {/* Left Side - Image */}
      <div className="hidden lg:block flex-1 relative p-2 overflow-hidden">
        <Image
          src={verifyOtpImg}
          height={1000}
          width={800}
          alt="Person using kiosk with phone"
          className="w-full h-full max-h-[95vh] object-cover block rounded-2xl"
        />
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 relative">
        {/* Back Button */}
        <Link
          href="/auth/register"
          className="absolute top-6 left-6 w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>

        <div className="w-full max-w-[420px]">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <Image
              src={logo}
              width={100}
              height={100}
              alt="Swipe Logo"
              className="w-32 h-auto object-contain block"
            />
          </div>

          {/* Heading */}
          <h1 className="text-2xl font-semibold text-gray-800 text-center mb-2">
            Verify OTP
          </h1>
          <p className="text-sm text-gray-400 text-center mb-6">
            We have sent a OTP to your mobile number and email
          </p>

          {/* Mobile OTP Section */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              <span className="text-sm font-medium text-gray-700">Mobile OTP</span>
            </div>
            <div className="flex justify-center gap-2 mb-3">
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <input
                  key={`mobile-${index}`}
                  ref={(el) => { mobileRefs.current[index] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={otp.mobile[index]}
                  onChange={(e) => handleChange('mobile', index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown('mobile', index, e)}
                  onPaste={(e) => handlePaste('mobile', e)}
                  className="w-12 h-14 text-center text-lg font-semibold border-2 border-gray-200 rounded-lg outline-none transition-all duration-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 text-gray-800 placeholder-gray-300"
                  placeholder="-"
                />
              ))}
            </div>
            {/* <p className="text-center text-xs text-gray-400">
              <span>OTP sent to mobile</span>
            </p> */}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">and</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Email OTP Section */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              <span className="text-sm font-medium text-gray-700">Email OTP</span>
            </div>
            <div className="flex justify-center gap-2 mb-3">
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <input
                  key={`email-${index}`}
                  ref={(el) => { emailRefs.current[index] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={otp.email[index]}
                  onChange={(e) => handleChange('email', index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown('email', index, e)}
                  onPaste={(e) => handlePaste('email', e)}
                  className="w-12 h-14 text-center text-lg font-semibold border-2 border-gray-200 rounded-lg outline-none transition-all duration-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 text-gray-800 placeholder-gray-300"
                  placeholder="-"
                />
              ))}
            </div>
            {/* <p className="text-center text-xs text-gray-400">
              <span>OTP sent to email</span>
            </p> */}
          </div>

          <div className="mb-6 text-center">
            <button
              onClick={handleResend}
              disabled={!canResend}
              className={`px-6 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${canResend
                ? 'bg-primary-500 text-white hover:bg-primary-600'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
            >
              Resend OTP
            </button>
          </div>

          {/* Verify Button */}
          <button
            onClick={handleVerify}
            disabled={!isComplete}
            className={`w-full py-3.5 text-white text-sm font-medium rounded-lg cursor-pointer transition-all duration-200 ${isComplete
              ? 'bg-gradient-to-r from-primary-500 to-primary-600 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary-500/40 active:translate-y-0'
              : 'bg-gray-300 cursor-not-allowed'
              }`}
          >
            Verify
          </button>
        </div>
      </div>
    </div>
  );
}