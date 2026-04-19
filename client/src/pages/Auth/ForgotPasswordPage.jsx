import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Home, Loader2, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import authService from '../../services/authService';

const ForgotPasswordPage = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [debugResetUrl, setDebugResetUrl] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = async ({ email }) => {
    setIsSubmitting(true);
    setDebugResetUrl('');
    try {
      const response = await authService.forgotPassword(email);
      const resetUrl = response?.data?.resetUrl || '';
      if (resetUrl) {
        setDebugResetUrl(resetUrl);
      }
      setSubmitted(true);
      toast.success(response?.message || 'If the email exists, reset instructions were sent.');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not process request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full bg-white border rounded-2xl p-8 shadow-sm">
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center space-x-2">
            <Home className="h-8 w-8 text-[#FF385C]" />
            <span className="text-2xl font-bold text-[#FF385C]">StayBnB</span>
          </Link>
          <h1 className="mt-4 text-2xl font-semibold text-gray-900">Forgot your password?</h1>
          <p className="text-gray-600 mt-2">Enter your email and we will send a reset link.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="email"
                type="email"
                className="input-field pl-10"
                placeholder="you@example.com"
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address',
                  },
                })}
              />
            </div>
            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full btn-primary flex items-center justify-center disabled:opacity-60"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send reset link'}
          </button>
        </form>

        {submitted && (
          <div className="mt-4 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
            If your email is registered, reset instructions have been sent.
          </div>
        )}

        {debugResetUrl && (
          <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
            Development reset link:{' '}
            <a href={debugResetUrl} className="underline break-all">
              {debugResetUrl}
            </a>
          </div>
        )}

        <p className="mt-6 text-center text-sm text-gray-600">
          Remembered your password?{' '}
          <Link to="/login" className="text-[#FF385C] font-medium hover:text-[#E31C5F]">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
