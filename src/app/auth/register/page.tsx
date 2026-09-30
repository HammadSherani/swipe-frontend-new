'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import registerImage from '../../../../public/assets/auth/register-img.webp';
import Image from 'next/image';
import logo from '../../../../public/assets/logo.png';
import { auth } from '../../../lib/apiClient';
import { clearTokens, getAccessToken } from '@/lib/tokenStorage';
import { getCurrentUser } from '@/helper/currentUser';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import handleError from '@/helper/handleError';

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  password: string;
  confirmPassword: string;
}

const schema = yup.object({
  firstName: yup.string().required('First name is required'),
  lastName: yup.string().required('Last name is required'),
  email: yup.string().email('Enter a valid email').required('Email is required'),
  mobile: yup
    .string()
    .required('Mobile number is required')
    .matches(/^\+234[0-9]{10}$/, 'Enter a valid Nigerian mobile number (10 digits after +234)'),
  password: yup
    .string()
    .required('Password is required')
    .min(8, 'Password must be at least 8 characters'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password')], 'Passwords must match')
    .required('Confirm password is required'),
});

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'USER' | 'MERCHANT' | null>('MERCHANT');
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = getAccessToken();
      if (token) {
        const user = getCurrentUser();
        if (!user) {
          clearTokens();
          return;
        }
        router.push(user.role === 'ADMIN' ? '/admin/merchants' : '/merchant/businessRegistration');
      }
    }
  }, [router]);

  const [mobileDigits, setMobileDigits] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: yupResolver(schema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      mobile: '',
      password: '',
      confirmPassword: '',
    },
  });

  const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let digitsOnly = e.target.value.replace(/\D/g, '');
    // Users often retype the country code or a leading 0 out of habit even though
    // the "+234" prefix is already fixed to the left of the input — strip it so it
    // isn't double-counted (and doesn't end up duplicated as +234234... on submit).
    if (digitsOnly.startsWith('234')) digitsOnly = digitsOnly.slice(3);
    else if (digitsOnly.startsWith('0')) digitsOnly = digitsOnly.slice(1);
    digitsOnly = digitsOnly.slice(0, 10);
    setMobileDigits(digitsOnly);
    // Only re-validate live once an error is already showing (so it clears as the user fixes it);
    // otherwise wait for blur so the error doesn't flash while they're still typing.
    setValue('mobile', digitsOnly ? `+234${digitsOnly}` : '', { shouldValidate: !!errors.mobile, shouldDirty: true });
  };

  const handleMobileBlur = () => {
    if (mobileDigits) trigger('mobile');
  };

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    const { confirmPassword, ...payload } = data;
    const payloadWithRole = { ...payload, role: selectedRole } as any;

    try {
      await auth.register(payloadWithRole);
      toast.success('Registration successful! Please verify your account.');

      // store pending data for OTP page
      localStorage.setItem('pendingEmail', payload.email);
      localStorage.setItem('pendingMobile', payload.mobile);
      if (selectedRole) localStorage.setItem('pendingRole', selectedRole);

      // Hard navigation: router.push has silently failed to navigate after an awaited
      // API call in this project's Next.js build, leaving the user on the form with a
      // pending registration and no OTP screen.
      window.location.href = '/auth/verify-otp';
    } catch (error: any) {
      if (error?.data?.code === 'OTP_PENDING') {
        toast.success('OTP sent! Please verify your account.');

        // store here also
        localStorage.setItem('pendingEmail', payload.email);
        localStorage.setItem('pendingMobile', payload.mobile);
        if (selectedRole) localStorage.setItem('pendingRole', selectedRole);

        window.location.href = '/auth/verify-otp';
        return;
      } else {
        handleError(error);
      }
      console.error('Register error:', error);
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
      {/* Left Side - Image */}
      <div className="hidden lg:block flex-1 relative overflow-hidden p-2">
        <Image
          src={registerImage}
          height={1000}
          width={800}
          alt="Business woman with phone"
          className="w-full h-full max-h-[95vh] object-cover block rounded-2xl"
        />
        {/* <div className="absolute bottom-0 left-0 right-0 h-[40%] bg-gradient-to-t from-primary-500 to-transparent opacity-70" /> */}
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-2">
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

          {!selectedRole ? (
            <>
              <h2 className="text-2xl font-semibold text-gray-800 text-center mb-6">
                Which describes you best?
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {/* User */}
                <button
                  type="button"
                  onClick={() => setSelectedRole("USER")}
                  className="w-full p-6 border border-gray-200 rounded-lg bg-white text-left hover:shadow-md transition"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-20 w-20 rounded-lg bg-gradient-to-br from-green-100 to-green-50 flex items-center justify-center">
                      <svg
                        width="48"
                        height="48"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#0f172a"
                        strokeWidth="1.5"
                      >
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>

                    <div>
                      <div className="text-lg font-medium text-gray-800">
                        User →
                      </div>
                      {/* <div className="text-sm text-gray-400">
                        Browse and purchase services
                      </div> */}
                    </div>
                  </div>
                </button>

                {/* Merchant */}
                <button
                  type="button"
                  onClick={() => setSelectedRole("MERCHANT")}
                  className="w-full p-6 border border-gray-200 rounded-lg bg-white text-left hover:shadow-md transition"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-20 w-20 rounded-lg bg-gradient-to-br from-green-100 to-green-50 flex items-center justify-center">
                      <svg
                        width="48"
                        height="48"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#0f172a"
                        strokeWidth="1.5"
                      >
                        <path d="M3 9l1-4h16l1 4" />
                        <path d="M5 10v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8" />
                        <path d="M9 14h6" />
                      </svg>
                    </div>

                    <div>
                      <div className="text-lg font-medium text-gray-800">
                        Merchant →
                      </div>
                      {/* <div className="text-sm text-gray-400">
                        Sell products and services
                      </div> */}
                    </div>
                  </div>
                </button>
              </div>

              <p className="text-center text-sm text-gray-500">
                Already have an account?{" "}
                <Link
                  href="/auth/login"
                  className="text-primary-500 font-medium hover:text-primary-600 hover:underline"
                >
                  Log in
                </Link>
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <h1 className="text-2xl font-semibold text-gray-800">Create an Account</h1>
                {/* <button
                  type="button"
                  onClick={() => setSelectedRole(null)}
                  className="text-sm text-primary-500 hover:underline"
                >
                  Change role
                </button> */}
              </div>
              {/* <p className="text-sm text-gray-400 mb-3">Creating account as <strong className="text-gray-700">{selectedRole === 'USER' ? 'User' : 'Merchant'}</strong></p> */}

              {/* Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
                <div className="relative flex items-center">
                  <svg
                    className="absolute left-3.5 z-10 pointer-events-none"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#9ca3af"
                    strokeWidth="2"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>

                  <input
                    type="text"
                    {...register('firstName')}
                    placeholder="First name"
                    className="w-full py-3 pl-10 pr-3 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white outline-none transition-all duration-200 placeholder-gray-400 focus:border-primary-500 focus:ring-3 focus:ring-primary-500/10"
                  />
                </div>
                {errors.firstName && <p className="text-xs text-red-500">{errors.firstName.message}</p>}

                <div className="relative flex items-center">
                  <svg className="absolute left-3.5 z-10 pointer-events-none" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <input
                    type="text"
                    {...register('lastName')}
                    placeholder="Last name"
                    className="w-full py-3 pl-10 pr-3 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white outline-none transition-all duration-200 placeholder-gray-400 focus:border-primary-500 focus:ring-3 focus:ring-primary-500/10"
                  />
                </div>
                {errors.lastName && <p className="text-xs text-red-500">{errors.lastName.message}</p>}

                <div className="relative flex items-center">
                  <svg className="absolute left-3.5 z-10 pointer-events-none" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                  <input
                    type="email"
                    {...register('email')}
                    placeholder="Email"
                    className="w-full py-3 pl-10 pr-3 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white outline-none transition-all duration-200 placeholder-gray-400 focus:border-primary-500 focus:ring-3 focus:ring-primary-500/10"
                  />
                </div>
                {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}

                <div className="relative flex items-center">
                  <svg className="absolute left-3.5 z-10 pointer-events-none" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  <span className="absolute left-9 z-10 pl-2 pr-2 border-r border-gray-300 text-sm font-medium text-gray-600 pointer-events-none">
                    +234
                  </span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={mobileDigits}
                    onChange={handleMobileChange}
                    onBlur={handleMobileBlur}
                    maxLength={10}
                    placeholder="8012345678"
                    className="w-full py-3 pl-24 pr-3 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white outline-none transition-all duration-200 placeholder-gray-400 focus:border-primary-500 focus:ring-3 focus:ring-primary-500/10"
                  />
                </div>
                {errors.mobile && <p className="text-xs text-red-500">{errors.mobile.message}</p>}

                <div className="relative flex items-center">
                  <svg className="absolute left-3.5 z-10 pointer-events-none" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    {...register('password')}
                    placeholder="Password"
                    className="w-full py-3 pl-10 pr-12 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white outline-none transition-all duration-200 placeholder-gray-400 focus:border-primary-500 focus:ring-3 focus:ring-primary-500/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-500 transition hover:text-gray-700"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.46 10.46 0 0 1 12 19.5C7.11 19.5 3.19 16.36 1.5 12c.74-1.75 1.82-3.31 3.18-4.62" />
                        <path d="M9.88 9.88a3 3 0 0 0 4.24 4.24" />
                        <path d="M1 1l22 22" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1.5 12C3.19 16.36 7.11 19.5 12 19.5c4.89 0 8.81-3.14 10.5-7.5A17.72 17.72 0 0 0 19.38 6.38" />
                        <path d="M22.5 12C20.81 7.64 16.89 4.5 12 4.5S3.19 7.64 1.5 12" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}

                <div className="relative flex items-center">
                  <svg className="absolute left-3.5 z-10 pointer-events-none" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    {...register('confirmPassword')}
                    placeholder="Confirm Password"
                    className="w-full py-3 pl-10 pr-12 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white outline-none transition-all duration-200 placeholder-gray-400 focus:border-primary-500 focus:ring-3 focus:ring-primary-500/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-500 transition hover:text-gray-700"
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirmPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.46 10.46 0 0 1 12 19.5C7.11 19.5 3.19 16.36 1.5 12c.74-1.75 1.82-3.31 3.18-4.62" />
                        <path d="M9.88 9.88a3 3 0 0 0 4.24 4.24" />
                        <path d="M1 1l22 22" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1.5 12C3.19 16.36 7.11 19.5 12 19.5c4.89 0 8.81-3.14 10.5-7.5A17.72 17.72 0 0 0 19.38 6.38" />
                        <path d="M22.5 12C20.81 7.64 16.89 4.5 12 4.5S3.19 7.64 1.5 12" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>}
                {serverError && <p className="text-sm text-red-500">{serverError}</p>}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white text-sm font-medium rounded-lg cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary-500/40 active:translate-y-0 mt-2 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  Sign Up
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
