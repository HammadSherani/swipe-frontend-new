'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import logo from '../../../../public/assets/logo.png'
import forgotPasswordImage from '../../../../public/assets/auth/forgotPassword-img.webp'
import { auth } from '../../../lib/apiClient';
import handleError from '@/helper/handleError';

interface ForgotPasswordForm {
  email: string;
}

const forgotPasswordSchema = yup.object({
  email: yup
    .string()
    .required('Email is required')
    .email('Enter a valid email address'),
});



export default function ForgotPasswordPage() {
  const [submittedValue, setSubmittedValue] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordForm>({
    resolver: yupResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ForgotPasswordForm) => {
    try {
      await auth.forgotPassword({ email: data.email });
      toast.success('Password reset link sent successfully!');
      setSubmittedValue(data.email);
      setIsSubmitted(true);
    } catch (error: any) {
      handleError(error);
      toast.error(error?.message || 'Unable to send reset link. Please try again.');
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
      {/* Left Side - Image */}
      <div className="hidden lg:block flex-1 p-2 relative overflow-hidden">
        <Image
          src={forgotPasswordImage}
            height={1000}
            width={800}

          alt="Person scanning QR code with phone"
          className="w-full h-full object-cover block rounded-2xl max-h-[97vh]"
        />
        {/* <div className="absolute bottom-0 left-0 right-0 h-[40%] bg-gradient-to-t from-primary-500 to-transparent opacity-70" /> */}
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 relative">
        {/* Back Button */}
        <Link
          href="/auth/login"
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
            Forget Password
          </h1>
          <p className="text-sm text-gray-400 text-center mb-8 max-w-[280px] mx-auto">
            Enter your email address to receive a link to reset your password
          </p>

          {!isSubmitted ? (
            /* Form */
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              {/* Email or Phone Input */}
              <div className="relative flex items-center">
                <svg className="absolute left-3.5 z-10 pointer-events-none" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
                <input
                  type="text"
                  {...register('email')}
                  placeholder="Email"
                  className="w-full py-3 pl-10 pr-3 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white outline-none transition-all duration-200 placeholder-gray-400 focus:border-primary-500 focus:ring-3 focus:ring-primary-500/10"
                />
              </div>
              {errors.email && (
                <p className="text-xs text-red-500">{errors.email.message}</p>
              )}

              {/* Continue Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white text-sm font-medium rounded-lg cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary-500/40 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? 'Sending...' : 'Continue'}
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
              <h2 className="text-lg font-semibold text-gray-800 mb-2">Check your inbox!</h2>
              <p className="text-sm text-gray-400 mb-6">
                We sent a password reset link to<br />
                <span className="text-gray-700 font-medium">{submittedValue}</span>
              </p>
              <button
                onClick={() => setIsSubmitted(false)}
                className="text-sm text-primary-500 font-medium hover:text-primary-600 hover:underline transition-colors"
              >
                Didn't receive it? Try again
              </button>
            </div>
          )}

          {/* Back to Login */}
          <p className="text-center text-sm text-gray-500 mt-6">
            Remember your password?{' '}
            <Link href="/auth/login" className="text-primary-500 font-medium hover:text-primary-600 hover:underline transition-colors">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}