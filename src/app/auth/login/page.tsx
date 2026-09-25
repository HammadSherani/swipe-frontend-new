'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import loginImage from '../../../../public/assets/auth/login-img.webp';
import logo from '../../../../public/assets/logo.png';
import { auth } from '../../../lib/apiClient';
import { setTokens, setKycStatus } from '@/lib/tokenStorage';
import { getCurrentUser } from '@/helper/currentUser';
import handleError from '@/helper/handleError';

interface FormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

const schema = yup.object({
  email: yup.string().trim().required('Email or phone is required').test(
    'email-or-mobile',
    'Enter a valid email or Nigerian phone number',
    (value) => !!value && (yup.string().email().isValidSync(value) || /^(?:\+234|234|0)[789][01]\d{8}$/.test(value)),
  ),
  password: yup.string().required('Password is required'),
  rememberMe: yup.boolean().default(false),
});

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      if (token) {
        router.replace(getCurrentUser()?.role === 'ADMIN' ? '/admin/merchants' : '/merchant/dashboard');
      }
    }
  }, [router]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: yupResolver(schema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      const identifier = data.email.trim();
      const loginPayload = yup.string().email().isValidSync(identifier)
        ? { email: identifier, password: data.password }
        : { mobile: identifier, password: data.password };
      const response = await auth.login(loginPayload);
      const payload = response.data?.data ?? response.data;
      console.log('Login response:', response);
      console.log('Login payload:', payload);
      // Registered but never finished OTP verification: the backend has just sent a
      // fresh OTP instead of issuing tokens — continue on the verification screen.
      if (payload?.requiresVerification) {
        localStorage.setItem('pendingEmail', payload.email);
        localStorage.setItem('pendingMobile', payload.mobile);
        toast(payload.message ?? 'Please verify your account to continue.');
        window.location.href = '/auth/verify-otp';
        return;
      }
      const accessToken = payload?.accessToken ?? payload?.token;
      const refreshToken = payload?.refreshToken;
      const user = payload?.user;

      if (!accessToken) {
        throw new Error('Login response did not include an access token.');
      }
      setTokens(accessToken, refreshToken);
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
      }

      // Hard navigations below: router.push stalls on the login page when the target
      // sits behind proxy.ts's redirect (a merchant awaiting approval has no
      // kycStatus cookie on a fresh login), which left users stuck with no feedback.
      if (user?.role === 'ADMIN') {
        toast.success('Login successful!');
        window.location.href = '/admin/dashboard';
      } else if (payload?.redirectTo === 'KYC_ONBOARDING') {
        toast.success('Login successful! Let\'s finish your verification.');
        window.location.href = '/merchant/businessRegistration';
      } else {
        // Verification is submitted. Anything but APPROVED means the account is still
        // with the admin team — say so, and tell proxy.ts not to bounce to the KYC form.
        const approved = user?.kycStatus === 'APPROVED';
        setKycStatus(approved ? 'APPROVED' : 'UNDER_REVIEW');
        if (approved) {
          toast.success('Login successful!');
          window.location.href = '/merchant/dashboard';
        } else {
          // Brief pause so the message can be read before the page changes.
          if (user?.kycStatus === 'REJECTED') {
            toast.error('Your application was not approved. Opening your dashboard for details.');
          } else {
            toast.success('Login successful. Your account is awaiting admin approval.');
          }
          setTimeout(() => {
            window.location.href = '/merchant/dashboard';
          }, 1800);
        }
      }
    } catch (error: any) {
      handleError(error);
      console.error('Login error:', error);
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
      {/* Left Side - Image */}
      <div className="hidden lg:block flex-1 relative p-2 overflow-hidden">
        <Image
          src={loginImage}
          height={1000}
          width={800}
          alt="Person scanning QR code with phone"
          loading="eager"
          className="w-full h-full max-h-[95vh] object-cover block rounded-2xl"
        />
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8">
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
            Login to your account
          </h1>
          <p className="text-sm text-gray-400 text-center mb-8">
            Access your dashboard to manage orders and menu.
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
            {/* Email */}
            <div className="relative flex items-center">
              <svg className="absolute left-3.5 z-10 pointer-events-none" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              <input
                type="text"
                {...register('email')}
                placeholder="Email or Phone"
                className="w-full py-3 pl-10 pr-3 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white outline-none transition-all duration-200 placeholder-gray-400 focus:border-primary-500 focus:ring-3 focus:ring-primary-500/10"
              />
            </div>
            {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}

            {/* Password */}
            <div className="relative flex items-center">
              <svg className="absolute left-3.5 z-10 pointer-events-none" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input
                type={showPassword ? 'text' : 'password'}
                {...register('password')}
                placeholder="Password"
                className="w-full py-3 pl-10 pr-10 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white outline-none transition-all duration-200 placeholder-gray-400 focus:border-primary-500 focus:ring-3 focus:ring-primary-500/10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3.5 z-10 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                )}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('rememberMe')}
                  className="w-4 h-4 border border-gray-300 rounded text-primary-500 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-500">Remember me</span>
              </label>
              <Link
                href="/auth/forgot-password"
                className="text-sm text-gray-800 font-medium hover:text-primary-600 transition-colors"
              >
                Forgot Password?
              </Link>
            </div>

            {/* Login Button - REMOVED cursor-pointer */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-medium rounded-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 mt-2 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? 'Logging in...' : 'Login'}
            </button>
          </form>

          {/* Sign Up Link */}
          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account?{' '}
            <Link href="/auth/register" className="text-primary-500 font-medium hover:text-primary-600 hover:underline transition-colors">
              Join us today.
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
