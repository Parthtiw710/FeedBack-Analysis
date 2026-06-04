import React, { useState, useRef, useEffect } from 'react';
import Transition from '../utils/Transition';

function DropdownProfile({ align }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [user, setUser] = useState({
    isLoggedIn: false,
    email: 'test@example.com',
    name: 'Test Client',
    role: 'Test Account',
  });

  // Auth/Registration State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [needsName, setNeedsName] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');

  const trigger = useRef(null);
  const dropdown = useRef(null);

  // Dynamically load Google Identity Services SDK
  useEffect(() => {
    if (!document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }
  }, []);

  // Load authenticated user data on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (savedUser && token) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser({
          isLoggedIn: true,
          email: parsed.email || '',
          name: parsed.name || '',
          role: 'Developer / Client',
        });
      } catch (err) {
        console.error('Error parsing user details:', err);
      }
    } else {
      setUser({
        isLoggedIn: false,
        email: 'test@example.com',
        name: 'Test Client',
        role: 'Test Account',
      });
    }
  }, []);

  // close on click outside
  useEffect(() => {
    const clickHandler = ({ target }) => {
      if (!dropdown.current) return;
      if (!dropdownOpen || dropdown.current.contains(target) || trigger.current.contains(target)) return;
      setDropdownOpen(false);
    };
    document.addEventListener('click', clickHandler);
    return () => document.removeEventListener('click', clickHandler);
  }, [dropdownOpen]);

  // close if the esc key is pressed
  useEffect(() => {
    const keyHandler = ({ keyCode }) => {
      if (!dropdownOpen || keyCode !== 27) return;
      setDropdownOpen(false);
    };
    document.addEventListener('keydown', keyHandler);
    return () => document.removeEventListener('keydown', keyHandler);
  }, [dropdownOpen]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.reload();
  };

  const handleAuthSubmit = async (userEmail, userName = '') => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: userEmail, name: userName }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      if (data.needsName) {
        setNeedsName(true);
        setEmail(data.email);
      } else if (data.success && data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        window.location.reload();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleClick = () => {
    setError('');
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    if (!googleClientId) {
      setError('VITE_GOOGLE_CLIENT_ID is not configured in the environment.');
      return;
    }

    if (window.google?.accounts?.oauth2) {
      try {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: googleClientId,
          scope: 'https://www.googleapis.com/auth/userinfo.email',
          callback: async (tokenResponse) => {
            if (tokenResponse && tokenResponse.access_token) {
              setLoading(true);
              try {
                const userInfoRes = await fetch(
                  `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${tokenResponse.access_token}`
                );
                const userInfo = await userInfoRes.json();
                if (userInfo.email) {
                  await handleAuthSubmit(userInfo.email);
                } else {
                  throw new Error('Failed to retrieve email from Google');
                }
              } catch (err) {
                setError(err.message);
                setLoading(false);
              }
            }
          },
        });
        client.requestAccessToken();
      } catch (err) {
        console.error('Google Auth Init error:', err);
        setError('Failed to initialize Google Sign-in.');
      }
    } else {
      setError('Google SDK failed to load. Please verify your connection.');
    }
  };

  const handleNameSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    handleAuthSubmit(email, name);
  };

  return (
    <div className="relative inline-flex">
      <button
        ref={trigger}
        className="inline-flex justify-center items-center group gap-2.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700/60 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
        aria-haspopup="true"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        aria-expanded={dropdownOpen}
      >
        <div className="w-6.5 h-6.5 rounded-full bg-violet-500 text-white font-bold text-xs flex items-center justify-center shadow-xs">
          {user.name ? user.name[0].toUpperCase() : 'A'}
        </div>
        <div className="flex items-center text-xs font-semibold text-gray-700 dark:text-gray-200">
          <span className="max-w-[120px] truncate">{user.name}</span>
          <svg className="w-3 h-3 shrink-0 ml-1.5 fill-current text-gray-400 dark:text-gray-500" viewBox="0 0 12 12">
            <path d="M5.9 11.4L.5 6l1.4-1.4 4 4 4-4L11.3 6z" />
          </svg>
        </div>
      </button>

      <Transition
        className={`origin-top-right z-50 absolute top-full min-w-[260px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 py-3.5 px-4 rounded-xl shadow-lg overflow-hidden mt-1.5 ${align === 'right' ? 'right-0' : 'left-0'
          }`}
        show={dropdownOpen}
        enter="transition ease-out duration-200 transform"
        enterStart="opacity-0 -translate-y-2"
        enterEnd="opacity-100 translate-y-0"
        leave="transition ease-out duration-200"
        leaveStart="opacity-100"
        leaveEnd="opacity-0"
      >
        <div ref={dropdown}>
          {/* User Profile Info Header */}
          <div className="pb-3 mb-3 border-b border-gray-100 dark:border-gray-700/60">
            <div className="font-semibold text-sm text-gray-800 dark:text-gray-100 truncate">{user.name}</div>
            <div className="text-[11px] text-gray-400 dark:text-gray-500 font-mono mt-0.5 truncate">{user.email}</div>
            <span className="inline-block text-[10px] bg-violet-100 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 font-bold px-2 py-0.5 rounded-full mt-2 font-sans tracking-wide uppercase">
              {user.role}
            </span>
          </div>

          {/* Conditional Dropdown Body */}
          {user.isLoggedIn ? (
            <ul className="space-y-1.5">
              <li>
                <button
                  onClick={handleLogout}
                  className="w-full text-left font-bold text-xs text-rose-500 hover:text-rose-600 dark:hover:text-rose-450 flex items-center py-1.5 transition"
                >
                  Sign Out
                </button>
              </li>
            </ul>
          ) : (
            <div className="space-y-3">
              {/* Simulated/Test Mode Notice */}
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 dark:text-amber-400 rounded-lg text-xs leading-normal">
                This is a simulated/test client environment. Sign in to view your private database.
              </div>

              {error && (
                <div className="text-[11px] text-rose-500 font-medium leading-tight">
                  {error}
                </div>
              )}

              {needsName ? (
                /* Registration Name Collection Inside Dropdown */
                <form onSubmit={handleNameSubmit} className="space-y-2">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Verify name for <span className="font-semibold text-gray-700 dark:text-gray-300">{email}</span>:
                  </div>
                  <input
                    type="text"
                    placeholder="Enter name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-800 dark:text-zinc-100 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition"
                    required
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="w-full py-1.5 bg-violet-600 hover:bg-violet-750 text-white font-bold text-xs rounded-lg transition"
                  >
                    Complete Registration
                  </button>
                </form>
              ) : (
                /* Continue with Google button inside dropdown */
                <button
                  onClick={handleGoogleClick}
                  disabled={loading}
                  className="w-full py-2 px-3 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-800 dark:text-zinc-100 rounded-lg flex items-center justify-center gap-2.5 transition font-semibold text-sm cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <img
                    width="18"
                    height="18"
                    src="https://img.icons8.com/color/48/google-logo.png"
                    alt="google-logo"
                  />
                  {loading ? 'Signing in...' : 'Continue with Google'}
                </button>
              )}
            </div>
          )}
        </div>
      </Transition>
    </div>
  );
}

export default DropdownProfile;