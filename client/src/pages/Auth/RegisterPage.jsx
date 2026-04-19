import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Home, Loader2, Check, X } from 'lucide-react';
import { register as registerUser, socialLogin, clearError } from '../../features/auth/authSlice';
import { authService as authApiService } from '../../services';
import oauthService from '../../services/oauthService';
import toast from 'react-hot-toast';

const RegisterPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [socialLoading, setSocialLoading] = useState(null);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpRequested, setOtpRequested] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isLoading, error } = useSelector((state) => state.auth);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();

  const password = watch('password', '');
  const watchedEmail = watch('email', '');
  const watchedPhone = watch('phone', '');
  const watchedFirstName = watch('firstName', '');

  const passwordRequirements = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'Contains a number', met: /\d/.test(password) },
    { label: 'Contains uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'Contains lowercase letter', met: /[a-z]/.test(password) },
  ];

  // Initialize OAuth providers
  useEffect(() => {
    const initOAuth = async () => {
      try {
        await oauthService.initializeGoogle(handleGoogleCallback);
        await oauthService.initializeApple();
      } catch (err) {
        console.warn('OAuth init error:', err);
      }
    };
    initOAuth();
  }, []);

  const handleGoogleCallback = async (response) => {
    setSocialLoading('google');
    try {
      const result = await dispatch(socialLogin({
        provider: 'google',
        token: response.credential,
      }));
      
      if (socialLogin.fulfilled.match(result)) {
        toast.success('Account created!');
        navigate('/');
      } else {
        toast.error(result.payload || 'Google sign-up failed');
      }
    } catch {
      toast.error('Google sign-up failed');
    } finally {
      setSocialLoading(null);
    }
  };

  const handleGoogleSignUp = async () => {
    setSocialLoading('google');
    try {
      await oauthService.signInWithGoogle();
    } catch (err) {
      if (!err.message.includes('dismissed') && !err.message.includes('cancelled')) {
        toast.error('Google sign-up failed');
      }
      setSocialLoading(null);
    }
  };

  const handleAppleSignUp = async () => {
    setSocialLoading('apple');
    try {
      const appleResponse = await oauthService.signInWithApple();
      const result = await dispatch(socialLogin({
        provider: 'apple',
        token: appleResponse.idToken,
        code: appleResponse.code,
        user: appleResponse.user,
      }));
      
      if (socialLogin.fulfilled.match(result)) {
        toast.success('Account created!');
        navigate('/');
      } else {
        toast.error(result.payload || 'Apple sign-up failed');
      }
    } catch (err) {
      if (!err.message.includes('cancelled')) {
        toast.error('Apple sign-up failed');
      }
    } finally {
      setSocialLoading(null);
    }
  };

  const onSubmit = async (data) => {
    if (!data.signupOtp) {
      toast.error('Please enter OTP to complete sign up');
      return;
    }

    dispatch(clearError());
    const result = await dispatch(registerUser(data));
    if (registerUser.fulfilled.match(result)) {
      toast.success('Account created successfully!');
      navigate('/');
    } else {
      toast.error(result.payload || 'Registration failed');
    }
  };

  const handleSendOtp = async () => {
    if (!watchedEmail || !watchedPhone) {
      toast.error('Enter your email and phone number first');
      return;
    }

    setOtpLoading(true);
    try {
      const response = await authApiService.requestSignupOtp({
        email: watchedEmail,
        phone: watchedPhone,
        firstName: watchedFirstName,
      });

      setOtpRequested(true);
      toast.success(response?.message || 'OTP sent to your email');
      if (response?.data?.otp) {
        toast.success(`Dev OTP: ${response.data.otp}`);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to send OTP');
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo */}
        <div className="text-center">
          <Link to="/" className="inline-flex items-center space-x-2">
            <Home className="h-10 w-10 text-[#FF385C]" />
            <span className="text-2xl font-bold text-[#FF385C]">StayBnB</span>
          </Link>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">Create an account</h2>
          <p className="mt-2 text-gray-600">Start your journey with us</p>
        </div>

        {/* Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                  First name
                </label>
                <input
                  id="firstName"
                  type="text"
                  {...register('firstName', {
                    required: 'First name is required',
                    minLength: { value: 2, message: 'At least 2 characters' },
                  })}
                  className="input-field"
                  placeholder="John"
                />
                {errors.firstName && (
                  <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                  Last name
                </label>
                <input
                  id="lastName"
                  type="text"
                  {...register('lastName', {
                    required: 'Last name is required',
                    minLength: { value: 2, message: 'At least 2 characters' },
                  })}
                  className="input-field"
                  placeholder="Doe"
                />
                {errors.lastName && (
                  <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address',
                  },
                })}
                className="input-field"
                placeholder="john@example.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone number
              </label>
              <input
                id="phone"
                type="tel"
                autoComplete="tel"
                {...register('phone', {
                  required: 'Phone number is required',
                  pattern: {
                    value: /^[6-9]\d{9}$/,
                    message: 'Enter a valid 10-digit Indian phone number',
                  },
                })}
                className="input-field"
                placeholder="9876543210"
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
              )}
            </div>

            {/* Sign-up OTP */}
            <div>
              <label htmlFor="signupOtp" className="block text-sm font-medium text-gray-700 mb-1">
                OTP verification
              </label>
              <div className="flex gap-2">
                <input
                  id="signupOtp"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  {...register('signupOtp', {
                    required: 'OTP is required',
                    pattern: {
                      value: /^\d{6}$/,
                      message: 'Enter a valid 6-digit OTP',
                    },
                  })}
                  className="input-field flex-1"
                  placeholder="Enter 6-digit OTP"
                />
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={otpLoading}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {otpLoading ? 'Sending...' : otpRequested ? 'Resend OTP' : 'Send OTP'}
                </button>
              </div>
              {errors.signupOtp && (
                <p className="mt-1 text-sm text-red-600">{errors.signupOtp.message}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                We send an OTP to your email for signup verification.
              </p>
            </div>

            {/* Aadhaar Number */}
            <div>
              <label htmlFor="aadhaarNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Aadhaar number
              </label>
              <input
                id="aadhaarNumber"
                type="text"
                inputMode="numeric"
                maxLength={12}
                {...register('aadhaarNumber', {
                  required: 'Aadhaar number is required',
                  pattern: {
                    value: /^\d{12}$/,
                    message: 'Aadhaar number must be 12 digits',
                  },
                })}
                className="input-field"
                placeholder="123412341234"
              />
              {errors.aadhaarNumber && (
                <p className="mt-1 text-sm text-red-600">{errors.aadhaarNumber.message}</p>
              )}
            </div>

            {/* PAN Card Number */}
            <div>
              <label htmlFor="panCardNumber" className="block text-sm font-medium text-gray-700 mb-1">
                PAN card number
              </label>
              <input
                id="panCardNumber"
                type="text"
                autoCapitalize="characters"
                maxLength={10}
                {...register('panCardNumber', {
                  required: 'PAN card number is required',
                  setValueAs: (value) => (value || '').toUpperCase(),
                  pattern: {
                    value: /^[A-Z]{5}[0-9]{4}[A-Z]$/,
                    message: 'Enter a valid PAN card number',
                  },
                })}
                className="input-field"
                placeholder="ABCDE1234F"
              />
              {errors.panCardNumber && (
                <p className="mt-1 text-sm text-red-600">{errors.panCardNumber.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  {...register('password', {
                    required: 'Password is required',
                    minLength: { value: 8, message: 'At least 8 characters' },
                    validate: {
                      hasNumber: (v) => /\d/.test(v) || 'Must contain a number',
                      hasUpper: (v) => /[A-Z]/.test(v) || 'Must contain uppercase letter',
                      hasLower: (v) => /[a-z]/.test(v) || 'Must contain lowercase letter',
                    },
                  })}
                  className="input-field pr-12"
                  placeholder="Create a password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              {/* Password Requirements */}
              {password && (
                <div className="mt-2 space-y-1">
                  {passwordRequirements.map((req, index) => (
                    <div key={index} className="flex items-center text-sm">
                      {req.met ? (
                        <Check className="h-4 w-4 text-green-500 mr-2" />
                      ) : (
                        <X className="h-4 w-4 text-gray-300 mr-2" />
                      )}
                      <span className={req.met ? 'text-green-600' : 'text-gray-500'}>
                        {req.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Date of Birth */}
            <div>
              <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-1">
                Date of birth
              </label>
              <input
                id="dateOfBirth"
                type="date"
                {...register('dateOfBirth', {
                  required: 'Date of birth is required',
                  validate: (value) => {
                    const age = Math.floor((new Date() - new Date(value)) / 31557600000);
                    return age >= 18 || 'You must be at least 18 years old';
                  },
                })}
                className="input-field"
              />
              {errors.dateOfBirth && (
                <p className="mt-1 text-sm text-red-600">{errors.dateOfBirth.message}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                You need to be at least 18 years old to sign up
              </p>
            </div>
          </div>

          {/* Terms */}
          <p className="text-sm text-gray-500">
            By selecting Agree and continue, I agree to StayBnB's{' '}
            <Link to="/terms" className="text-[#FF385C] hover:underline">
              Terms of Service
            </Link>
            ,{' '}
            <Link to="/privacy" className="text-[#FF385C] hover:underline">
              Privacy Policy
            </Link>
            , and{' '}
            <Link to="/nondiscrimination" className="text-[#FF385C] hover:underline">
              Nondiscrimination Policy
            </Link>
            .
          </p>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full btn-primary flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Creating account...
              </>
            ) : (
              'Agree and continue'
            )}
          </button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 text-gray-500">or sign up with</span>
            </div>
          </div>

          {/* Social Login */}
          <div className="grid grid-cols-2 gap-4">
            {/* Google Sign-Up */}
            <button
              type="button"
              onClick={handleGoogleSignUp}
              disabled={socialLoading !== null}
              className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {socialLoading === 'google' ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Google
                </>
              )}
            </button>
            
            {/* Apple Sign-Up */}
            <button
              type="button"
              onClick={handleAppleSignUp}
              disabled={socialLoading !== null}
              className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {socialLoading === 'apple' ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                  Apple
                </>
              )}
            </button>
          </div>

          {/* Login Link */}
          <p className="text-center text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="text-[#FF385C] hover:text-[#E31C5F] font-medium">
              Log in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;
