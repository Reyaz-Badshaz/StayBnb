import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Home, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import authService from '../../services/authService';

const ResetPasswordPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();

  const password = watch('password', '');

  const onSubmit = async ({ password: newPassword }) => {
    if (!token) {
      toast.error('Invalid reset link');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await authService.resetPassword(token, newPassword);
      toast.success(response?.message || 'Password reset successful');
      navigate('/login');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not reset password');
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
          <h1 className="mt-4 text-2xl font-semibold text-gray-900">Reset password</h1>
          <p className="text-gray-600 mt-2">Create a new secure password for your account.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              New password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="input-field pr-11"
                {...register('password', {
                  required: 'Password is required',
                  minLength: { value: 8, message: 'At least 8 characters' },
                  validate: {
                    hasNumber: (v) => /\d/.test(v) || 'Must contain a number',
                    hasUpper: (v) => /[A-Z]/.test(v) || 'Must contain uppercase letter',
                    hasLower: (v) => /[a-z]/.test(v) || 'Must contain lowercase letter',
                  },
                })}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm new password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                className="input-field pr-11"
                {...register('confirmPassword', {
                  required: 'Confirm your password',
                  validate: (value) => value === password || 'Passwords do not match',
                })}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full btn-primary flex items-center justify-center disabled:opacity-60"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Update password'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Back to{' '}
          <Link to="/login" className="text-[#FF385C] font-medium hover:text-[#E31C5F]">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
