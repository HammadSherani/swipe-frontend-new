'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import resetPasswordImage from '../../../../public/assets/auth/resetPassword-img.webp';
import { auth } from '../../../lib/apiClient';
import handleError from '@/helper/handleError';

interface ResetPasswordForm {
  password: string;
  confirmPassword: string;
}

const resetPasswordSchema = yup.object({
  password: yup
    .string()
    .required('New password is required')
    .min(8, 'Password must be at least 8 characters'),
  confirmPassword: yup
    .string()
    .required('Confirm password is required')
    .oneOf([yup.ref('password')], 'Passwords must match'),
});

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const email = searchParams.get('email') || '';
  const mobile = searchParams.get('mobile') || '';
  const otp = searchParams.get('otp') || '';

  useEffect(() => {
    setIsReady(true);
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordForm>({
    resolver: yupResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: ResetPasswordForm) => {
    setResetError(null);

    if (!otp || (!email && !mobile)) {
      setResetError('Invalid reset link. Please request a new one.');
      return;
    }

    const payload: Record<string, string> = {
      otp,
      newPassword: data.password,
    };

    if (email) {
      payload.email = decodeURIComponent(email);
    } else if (mobile) {
      payload.mobile = decodeURIComponent(mobile);
    }

    try {
      await auth.resetPassword(payload);
      toast.success('Password reset successful. Please login again.');
      setIsSubmitted(true);
    } catch (error: any) {
      handleError(error);
      setResetError(error?.message || 'Unable to reset password. Please try again.');
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
      {/* Left Side - Image */}
      <div className="hidden lg:block flex-1 p-2 relative overflow-hidden">
        <Image
          src={resetPasswordImage}
          alt="Person using payment terminal with phone"
          className="w-full h-full object-cover block rounded-2xl max-h-[97vh]"
        />
        {/* <div className="absolute bottom-0 left-0 right-0 h-[40%] bg-gradient-to-t from-primary-500 to-transparent opacity-70" /> */}
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 relative">
        {/* Back Button */}
        <Link
          href="/auth/forgot-password"
          className="absolute top-6 left-6 w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>

        <div className="w-full max-w-[420px]">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="flex items-center">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <rect width="28" height="28" rx="6" fill="#8b5cf6" />
                <path d="M8 14L12 10L16 14L20 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M8 18L12 14L16 18L20 14" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-2xl font-bold text-gray-800">Swipe</span>
          </div>

          {/* Heading */}
          <h1 className="text-2xl font-semibold text-gray-800 text-center mb-2">
            Create new password
          </h1>
          <p className="text-sm text-gray-400 text-center mb-8 max-w-[320px] mx-auto">
            Create a strong password to keep your account secure.
          </p>

          {!isSubmitted ? (
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <div className="relative flex items-center">
                <svg className="absolute left-3.5 z-10 pointer-events-none" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input
                  type="password"
                  {...register('password')}
                  placeholder="New password"
                  className="w-full py-3 pl-10 pr-3 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white outline-none transition-all duration-200 placeholder-gray-400 focus:border-primary-500 focus:ring-3 focus:ring-primary-500/10"
                />
              </div>
              {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}

              <div className="relative flex items-center">
                <svg className="absolute left-3.5 z-10 pointer-events-none" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input
                  type="password"
                  {...register('confirmPassword')}
                  placeholder="Confirm password"
                  className="w-full py-3 pl-10 pr-3 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white outline-none transition-all duration-200 placeholder-gray-400 focus:border-primary-500 focus:ring-3 focus:ring-primary-500/10"
                />
              </div>
              {errors.confirmPassword && <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>}

              {resetError && <p className="text-xs text-red-500">{resetError}</p>}

              <button
                type="submit"
                disabled={isSubmitting || !isReady}
                className="w-full py-3.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white text-sm font-medium rounded-lg cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary-500/40 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          ) : (
            /* Success State */
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-primary-100 rounded-full flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-800 mb-2">Password updated!</h2>
              <p className="text-sm text-gray-400 mb-6">
                Your password has been successfully reset.
              </p>
              <Link
                href="/auth/login"
                className="inline-block w-full py-3.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white text-sm font-medium rounded-lg text-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary-500/40 active:translate-y-0"
              >
                Go to Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ResetPasswordContent;