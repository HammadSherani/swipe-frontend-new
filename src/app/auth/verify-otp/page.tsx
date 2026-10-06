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

export default function VerifyOtpPage() {
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const router = useRouter();

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

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

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto-focus next
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newOtp = ['', '', '', '', '', ''];

    pasted.split('').forEach((digit, i) => {
      if (i < 6) newOtp[i] = digit;
    });

    setOtp(newOtp);

    const focusIndex = Math.min(pasted.length, 5);
    otpRefs.current[focusIndex]?.focus();
  };

  const handleResend = async () => {
    if (!canResend || isResending) return;

    const resendEmail = email || localStorage.getItem('pendingEmail') || '';
    const resendMobile = mobile || localStorage.getItem('pendingMobile') || '';
    if (!resendEmail || !resendMobile) {
      toast.error('Registration details are missing. Please register again.');
      return;
    }

    const payload = {
      email: resendEmail,
      mobile: resendMobile,
    };

    try {
      setIsResending(true);
      await auth.resendOtp(payload);
      setTimer(30);
      setCanResend(false);
      setOtp(['', '', '', '', '', '']);
      toast.success('OTP resent successfully!');
    } catch (error) {
      handleError(error);
    } finally {
      setIsResending(false);
    }
  };

  const handleVerify = async () => {
    if (isVerifying) return;

    const code = otp.join('');
    if (code.length !== 6) return;

    const verifyEmail = email || localStorage.getItem('pendingEmail') || '';
    const verifyMobile = mobile || localStorage.getItem('pendingMobile') || '';
    if (!verifyEmail || !verifyMobile) {
      toast.error('Registration details are missing. Please register again.');
      return;
    }

    const payload = {
      email: verifyEmail,
      emailOtp: code,
      mobile: verifyMobile,
      mobileOtp: code,
    };

    try {
      setIsVerifying(true);
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
    } finally {
      setIsVerifying(false);
    }
  };

  const isComplete = otp.every((digit) => digit !== '');


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
            We have sent one OTP to your mobile number and email
          </p>

          {/* Shared OTP Section */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-medium text-gray-700">Enter OTP</span>
            </div>
            <div className="flex justify-center gap-2 mb-3">
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <input
                  key={`otp-${index}`}
                  ref={(el) => { otpRefs.current[index] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={otp[index]}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  className="w-12 h-14 text-center text-lg font-semibold border-2 border-gray-200 rounded-lg outline-none transition-all duration-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 text-gray-800 placeholder-gray-300"
                  placeholder="-"
                />
              ))}
            </div>
            <p className="text-center text-xs text-gray-400">
              This OTP is for both your email and mobile number.
            </p>
          </div>

          <div className="mb-6 text-center">
            <button
              onClick={handleResend}
              disabled={!canResend || isResending}
              className={`px-6 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${canResend
                ? 'bg-primary-500 text-white hover:bg-primary-600'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
            >
              {isResending ? 'Sending...' : canResend ? 'Resend OTP' : `Resend OTP in ${timer}s`}
            </button>
          </div>

          {/* Verify Button */}
          <button
            onClick={handleVerify}
            disabled={!isComplete || isVerifying}
            aria-busy={isVerifying}
            className={`w-full py-3.5 text-white text-sm font-medium rounded-lg transition-all duration-200 ${isVerifying
              ? 'cursor-not-allowed bg-gradient-to-r from-primary-500 to-primary-600 opacity-75'
              : isComplete
                ? 'cursor-pointer bg-gradient-to-r from-primary-500 to-primary-600 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary-500/40 active:translate-y-0'
                : 'cursor-not-allowed bg-gray-300'
              }`}
          >
            {isVerifying ? (
              <span className="inline-flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Verifying...
              </span>
            ) : 'Verify'}
          </button>
        </div>
      </div>
    </div>
  );
}