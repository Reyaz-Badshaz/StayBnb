import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Menu, Search, Globe, User, Home, LogOut, Settings, Heart, Calendar } from 'lucide-react';
import { logout } from '../../features/auth/authSlice';
import { SearchBar } from '../search';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    setIsUserMenuOpen(false);
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <Home className="h-8 w-8 text-[#FF385C]" />
            <span className="text-xl font-bold text-[#FF385C]">StayBnB</span>
          </Link>

          {/* Search Bar - Desktop */}
          <div className="hidden md:flex flex-1 justify-center px-6">
            <div className="w-full max-w-xl">
              <SearchBar variant="header" />
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-4">
          {isAuthenticated && (
              <Link
                to="/host"
                className="hidden md:block text-sm font-medium hover:bg-gray-100 px-4 py-2 rounded-full"
              >
                Switch to hosting
              </Link>
            )}

            <button className="hidden md:flex items-center justify-center p-2 hover:bg-gray-100 rounded-full">
              <Globe className="h-5 w-5" />
            </button>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center space-x-2 border border-gray-300 rounded-full p-2 hover:shadow-md transition-shadow"
              >
                <Menu className="h-5 w-5" />
                <div className="bg-gray-500 rounded-full p-1">
                  {user?.avatar ? (
                    <img src={user.avatar} alt={user.firstName} className="h-6 w-6 rounded-full" />
                  ) : (
                    <User className="h-5 w-5 text-white" />
                  )}
                </div>
              </button>

              {/* Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                  {isAuthenticated ? (
                    <>
                      <Link
                        to="/trips"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center px-4 py-3 hover:bg-gray-100"
                      >
                        <Calendar className="h-5 w-5 mr-3" />
                        <span className="font-medium">Trips</span>
                      </Link>
                      <Link
                        to="/wishlists"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center px-4 py-3 hover:bg-gray-100"
                      >
                        <Heart className="h-5 w-5 mr-3" />
                        <span>Wishlists</span>
                      </Link>
                      <hr className="my-2" />
                      <Link
                        to="/host"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center px-4 py-3 hover:bg-gray-100"
                      >
                        <Home className="h-5 w-5 mr-3" />
                        <span>Manage listings</span>
                      </Link>
                      <Link
                        to="/account"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center px-4 py-3 hover:bg-gray-100"
                      >
                        <Settings className="h-5 w-5 mr-3" />
                        <span>Account settings</span>
                      </Link>
                      <hr className="my-2" />
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-3 hover:bg-gray-100 text-left"
                      >
                        <LogOut className="h-5 w-5 mr-3" />
                        <span>Log out</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        to="/login"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="block px-4 py-3 hover:bg-gray-100 font-medium"
                      >
                        Log in
                      </Link>
                      <Link
                        to="/register"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="block px-4 py-3 hover:bg-gray-100"
                      >
                        Sign up
                      </Link>
                      <hr className="my-2" />
                      <Link
                        to="/host"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="block px-4 py-3 hover:bg-gray-100"
                      >
                        Host your home
                      </Link>
                      <Link
                        to="/help"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="block px-4 py-3 hover:bg-gray-100"
                      >
                        Help Center
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Search */}
      <div className="md:hidden px-4 pb-4">
        <button
          onClick={() => navigate('/search')}
          className="w-full flex items-center border border-gray-300 rounded-full py-3 px-4 shadow-sm"
        >
          <Search className="h-5 w-5 text-gray-500 mr-3" />
          <div className="text-left">
            <p className="text-sm font-medium">Where to?</p>
            <p className="text-xs text-gray-500">Anywhere · Any week · Add guests</p>
          </div>
        </button>
      </div>
    </header>
  );
};

export default Header;
