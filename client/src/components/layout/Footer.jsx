import { Link } from 'react-router-dom';
import { Home, Globe } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-gray-100 border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Support */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Support</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/help" className="text-gray-600 hover:text-gray-900 hover:underline">
                  Help Center
                </Link>
              </li>
              <li>
                <Link to="/aircover" className="text-gray-600 hover:text-gray-900 hover:underline">
                  AirCover
                </Link>
              </li>
              <li>
                <Link to="/safety" className="text-gray-600 hover:text-gray-900 hover:underline">
                  Safety information
                </Link>
              </li>
              <li>
                <Link to="/accessibility" className="text-gray-600 hover:text-gray-900 hover:underline">
                  Supporting people with disabilities
                </Link>
              </li>
              <li>
                <Link to="/cancellation" className="text-gray-600 hover:text-gray-900 hover:underline">
                  Cancellation options
                </Link>
              </li>
            </ul>
          </div>

          {/* Hosting */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Hosting</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/host" className="text-gray-600 hover:text-gray-900 hover:underline">
                  Host your home
                </Link>
              </li>
              <li>
                <Link to="/host/experiences" className="text-gray-600 hover:text-gray-900 hover:underline">
                  Host an Experience
                </Link>
              </li>
              <li>
                <Link to="/resources" className="text-gray-600 hover:text-gray-900 hover:underline">
                  Hosting resources
                </Link>
              </li>
              <li>
                <Link to="/community" className="text-gray-600 hover:text-gray-900 hover:underline">
                  Community forum
                </Link>
              </li>
              <li>
                <Link to="/responsible-hosting" className="text-gray-600 hover:text-gray-900 hover:underline">
                  Hosting responsibly
                </Link>
              </li>
            </ul>
          </div>

          {/* StayBnB */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">StayBnB</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/newsroom" className="text-gray-600 hover:text-gray-900 hover:underline">
                  Newsroom
                </Link>
              </li>
              <li>
                <Link to="/features" className="text-gray-600 hover:text-gray-900 hover:underline">
                  New features
                </Link>
              </li>
              <li>
                <Link to="/careers" className="text-gray-600 hover:text-gray-900 hover:underline">
                  Careers
                </Link>
              </li>
              <li>
                <Link to="/investors" className="text-gray-600 hover:text-gray-900 hover:underline">
                  Investors
                </Link>
              </li>
              <li>
                <Link to="/gift-cards" className="text-gray-600 hover:text-gray-900 hover:underline">
                  Gift cards
                </Link>
              </li>
            </ul>
          </div>

          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center space-x-2 mb-4">
              <Home className="h-8 w-8 text-[#FF385C]" />
              <span className="text-xl font-bold text-[#FF385C]">StayBnB</span>
            </Link>
            <p className="text-gray-600 text-sm mb-4">
              Book unique homes and experiences all over the world.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-600 hover:text-gray-900">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
              <a href="#" className="text-gray-600 hover:text-gray-900">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a href="#" className="text-gray-600 hover:text-gray-900">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-300 mt-8 pt-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <span>© 2024 StayBnB, Inc.</span>
              <span>·</span>
              <Link to="/terms" className="hover:underline">Terms</Link>
              <span>·</span>
              <Link to="/sitemap" className="hover:underline">Sitemap</Link>
              <span>·</span>
              <Link to="/privacy" className="hover:underline">Privacy</Link>
              <span>·</span>
              <Link to="/destinations" className="hover:underline">Your Privacy Choices</Link>
            </div>
            <div className="flex items-center gap-4 mt-4 md:mt-0">
              <button className="flex items-center text-sm text-gray-600 hover:underline">
                <Globe className="h-4 w-4 mr-2" />
                English (US)
              </button>
              <button className="text-sm text-gray-600 hover:underline">
                ₹ INR
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
