import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { User, CreditCard, Shield, Bell, Globe, HelpCircle, LogOut, ChevronRight, Edit2, CheckCircle } from 'lucide-react';
import { logout, updateProfile } from '../../features/auth/authSlice';
import toast from 'react-hot-toast';

const AccountPage = () => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const settingKey = location.pathname.startsWith('/account/')
    ? location.pathname.replace('/account/', '').split('/')[0]
    : '';
  const hasActiveSetting = Boolean(settingKey);
  const [isSaving, setIsSaving] = useState(false);
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    bio: '',
    work: '',
  });
  const [preferencesForm, setPreferencesForm] = useState({
    language: 'en',
    currency: 'INR',
  });
  const [notificationsForm, setNotificationsForm] = useState({
    email: true,
    push: true,
    sms: false,
  });

  useEffect(() => {
    if (!user) return;

    setProfileForm({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      phone: user.phone || '',
      bio: user.bio || '',
      work: user.work || '',
    });

    setPreferencesForm({
      language: user.preferences?.language || 'en',
      currency: user.preferences?.currency || 'INR',
    });

    setNotificationsForm({
      email: user.preferences?.notifications?.email ?? true,
      push: user.preferences?.notifications?.push ?? true,
      sms: user.preferences?.notifications?.sms ?? false,
    });
  }, [user]);

  const saveProfile = async () => {
    setIsSaving(true);
    try {
      await dispatch(updateProfile(profileForm)).unwrap();
      toast.success('Personal info updated');
    } catch (error) {
      toast.error(error || 'Could not update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const savePreferences = async () => {
    setIsSaving(true);
    try {
      await dispatch(updateProfile({
        preferences: {
          ...user?.preferences,
          ...preferencesForm,
          notifications: {
            ...user?.preferences?.notifications,
            ...notificationsForm,
          },
        },
      })).unwrap();
      toast.success('Preferences updated');
    } catch (error) {
      toast.error(error || 'Could not update preferences');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    toast.success('Logged out successfully');
    navigate('/');
  };

  const menuSections = [
    {
      title: 'Account settings',
      items: [
        {
          icon: User,
          label: 'Personal info',
          description: 'Provide personal details and how we can reach you',
          link: '/account/personal-info',
        },
        {
          icon: Shield,
          label: 'Login & security',
          description: 'Update your password and secure your account',
          link: '/account/security',
        },
        {
          icon: CreditCard,
          label: 'Payments & payouts',
          description: 'Review payments, payouts, coupons, and gift cards',
          link: '/account/payments',
        },
        {
          icon: Bell,
          label: 'Notifications',
          description: 'Choose notification preferences',
          link: '/account/notifications',
        },
        {
          icon: Globe,
          label: 'Global preferences',
          description: 'Set your default language, currency, and timezone',
          link: '/account/preferences',
        },
      ],
    },
    {
      title: 'Hosting',
      items: [
        {
          icon: CheckCircle,
          label: 'Become a Host',
          description: 'Start hosting and earn money',
          link: '/host',
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          icon: HelpCircle,
          label: 'Get help',
          description: 'Get help from our support team',
          link: '/account/help',
        },
      ],
    },
  ];

  const renderSettingContent = () => {
    if (settingKey === 'personal-info') {
      return (
        <div className="bg-white border rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-semibold">Personal info</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input className="input-field" placeholder="First name" value={profileForm.firstName} onChange={(e) => setProfileForm((prev) => ({ ...prev, firstName: e.target.value }))} />
            <input className="input-field" placeholder="Last name" value={profileForm.lastName} onChange={(e) => setProfileForm((prev) => ({ ...prev, lastName: e.target.value }))} />
            <input className="input-field md:col-span-2" placeholder="Phone number" value={profileForm.phone} onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))} />
            <input className="input-field md:col-span-2" placeholder="Work" value={profileForm.work} onChange={(e) => setProfileForm((prev) => ({ ...prev, work: e.target.value }))} />
            <textarea className="input-field md:col-span-2 min-h-28" placeholder="Bio" value={profileForm.bio} onChange={(e) => setProfileForm((prev) => ({ ...prev, bio: e.target.value }))} />
          </div>
          <button onClick={saveProfile} disabled={isSaving} className="btn-primary disabled:opacity-60">
            {isSaving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      );
    }

    if (settingKey === 'notifications') {
      return (
        <div className="bg-white border rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-semibold">Notifications</h2>
          {[
            ['email', 'Email notifications'],
            ['push', 'Push notifications'],
            ['sms', 'SMS notifications'],
          ].map(([key, label]) => (
            <label key={key} className="flex items-center justify-between border rounded-lg px-4 py-3">
              <span>{label}</span>
              <input
                type="checkbox"
                checked={notificationsForm[key]}
                onChange={(e) => setNotificationsForm((prev) => ({ ...prev, [key]: e.target.checked }))}
                className="h-4 w-4"
              />
            </label>
          ))}
          <button onClick={savePreferences} disabled={isSaving} className="btn-primary disabled:opacity-60">
            {isSaving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      );
    }

    if (settingKey === 'preferences') {
      return (
        <div className="bg-white border rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-semibold">Global preferences</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select className="input-field" value={preferencesForm.language} onChange={(e) => setPreferencesForm((prev) => ({ ...prev, language: e.target.value }))}>
              <option value="en">English</option>
              <option value="hi">Hindi</option>
            </select>
            <select className="input-field" value={preferencesForm.currency} onChange={(e) => setPreferencesForm((prev) => ({ ...prev, currency: e.target.value }))}>
              <option value="INR">INR (₹)</option>
              <option value="USD">USD ($)</option>
            </select>
          </div>
          <button onClick={savePreferences} disabled={isSaving} className="btn-primary disabled:opacity-60">
            {isSaving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      );
    }

    if (settingKey === 'security') {
      return (
        <div className="bg-white border rounded-xl p-6 space-y-2">
          <h2 className="text-xl font-semibold">Login & security</h2>
          <p className="text-gray-600">Password reset and security updates are available from the login flow.</p>
          <button onClick={() => navigate('/login')} className="btn-secondary">Go to login</button>
        </div>
      );
    }

    if (settingKey === 'payments') {
      return (
        <div className="bg-white border rounded-xl p-6 space-y-2">
          <h2 className="text-xl font-semibold">Payments & payouts</h2>
          <p className="text-gray-600">Payment methods and payout setup will appear here in the next update.</p>
        </div>
      );
    }

    if (settingKey === 'help') {
      return (
        <div className="bg-white border rounded-xl p-6 space-y-2">
          <h2 className="text-xl font-semibold">Get help</h2>
          <p className="text-gray-600">For support, email us at support@staybnb.in.</p>
        </div>
      );
    }

    return (
      <div className="bg-white border rounded-xl p-6">
        <p className="text-gray-600">This setting page is not available.</p>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Profile Header */}
      <div className="flex items-center gap-6 mb-10">
        <div className="relative">
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={user.firstName}
              className="w-24 h-24 rounded-full object-cover"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white text-3xl font-semibold">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
          )}
          <button className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-lg border hover:bg-gray-50 transition">
            <Edit2 className="w-4 h-4 text-gray-700" />
          </button>
        </div>
        <div>
          <h1 className="text-2xl font-semibold">
            {user?.firstName} {user?.lastName}
          </h1>
          <p className="text-gray-500">{user?.email}</p>
          <div className="flex items-center gap-3 mt-2">
            {user?.isEmailVerified ? (
              <span className="flex items-center gap-1 text-sm text-green-600">
                <CheckCircle className="w-4 h-4" />
                Email verified
              </span>
            ) : (
              <span className="text-sm text-amber-600">Email not verified</span>
            )}
            {user?.isSuperhost && (
              <span className="px-2 py-1 bg-rose-100 text-rose-700 rounded-full text-xs font-medium">
                Superhost
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Menu Sections / Setting Content */}
      {hasActiveSetting ? (
        <div className="space-y-6">
          <Link to="/account" className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900">
            <ChevronRight className="w-4 h-4 rotate-180" />
            Back to account settings
          </Link>
          {renderSettingContent()}
        </div>
      ) : (
        <div className="space-y-8">
        {menuSections.map((section) => (
          <div key={section.title}>
            <h2 className="text-lg font-semibold mb-4">{section.title}</h2>
            <div className="bg-white border rounded-xl overflow-hidden divide-y">
              {section.items.map((item) => (
                <Link
                  key={item.label}
                  to={item.link}
                  className="flex items-center gap-4 p-4 hover:bg-gray-50 transition"
                >
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-5 h-5 text-gray-700" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.label}</p>
                    <p className="text-sm text-gray-500">{item.description}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </Link>
              ))}
            </div>
          </div>
        ))}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full p-4 text-left text-red-600 hover:bg-red-50 rounded-xl transition"
        >
          <LogOut className="w-6 h-6" />
          <span className="font-medium">Log out</span>
        </button>
      </div>
      )}

      {/* Footer Links */}
      <div className="mt-12 pt-8 border-t text-center text-sm text-gray-500">
        <div className="flex justify-center gap-6">
          <a href="#" className="hover:underline">Privacy</a>
          <a href="#" className="hover:underline">Terms</a>
          <a href="#" className="hover:underline">Sitemap</a>
        </div>
        <p className="mt-4">© 2024 StayBnB, Inc.</p>
      </div>
    </div>
  );
};

export default AccountPage;
