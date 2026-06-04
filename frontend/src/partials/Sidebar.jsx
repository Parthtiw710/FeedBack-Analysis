import React, { useState, useEffect, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";

function Sidebar({ sidebarOpen, setSidebarOpen, variant = 'default' }) {
  const location = useLocation();
  const { pathname } = location;

  const trigger = useRef(null);
  const sidebar = useRef(null);

  const [apiKeys, setApiKeys] = useState([]);
  const [copiedKey, setCopiedKey] = useState('');
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [keyError, setKeyError] = useState('');

  const isTestClient = !localStorage.getItem('token');

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    setLoadingKeys(true);
    try {
      const res = await fetch('/api-keys');
      const data = await res.json();
      if (data.success) {
        setApiKeys(data.apiKeys || []);
      }
    } catch (err) {
      console.error('Error fetching API keys:', err);
    } finally {
      setLoadingKeys(false);
    }
  };

  const handleCreateKey = async () => {
    setKeyError('');
    try {
      const res = await fetch('/api-keys', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setApiKeys([...apiKeys, data.apiKey]);
      } else {
        setKeyError(data.error || 'Failed to generate API key');
        setTimeout(() => setKeyError(''), 4000);
      }
    } catch (err) {
      console.error('Error generating API key:', err);
      setKeyError('Error generating API key');
      setTimeout(() => setKeyError(''), 4000);
    }
  };

  const handleRevokeKey = async (keyToDelete) => {
    setKeyError('');
    try {
      const res = await fetch('/api-keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: keyToDelete })
      });
      const data = await res.json();
      if (data.success) {
        setApiKeys(apiKeys.filter(k => k !== keyToDelete));
      } else {
        setKeyError(data.error || 'Failed to revoke API key');
        setTimeout(() => setKeyError(''), 4000);
      }
    } catch (err) {
      console.error('Error revoking API key:', err);
      setKeyError('Error revoking API key');
      setTimeout(() => setKeyError(''), 4000);
    }
  };

  const copyToClipboard = (key) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 2000);
  };

  // Close on click outside (mobile only)
  useEffect(() => {
    const clickHandler = ({ target }) => {
      if (!sidebar.current || !trigger.current) return;
      if (!sidebarOpen || sidebar.current.contains(target) || trigger.current.contains(target)) return;
      setSidebarOpen(false);
    };
    document.addEventListener("click", clickHandler);
    return () => document.removeEventListener("click", clickHandler);
  }, [sidebarOpen]);

  // Close if the ESC key is pressed
  useEffect(() => {
    const keyHandler = ({ keyCode }) => {
      if (!sidebarOpen || keyCode !== 27) return;
      setSidebarOpen(false);
    };
    document.addEventListener("keydown", keyHandler);
    return () => document.removeEventListener("keydown", keyHandler);
  }, [sidebarOpen]);

  return (
    <div className="min-w-fit">
      {/* Sidebar backdrop (mobile only) */}
      <div
        className={`fixed inset-0 bg-gray-900/30 z-40 lg:hidden lg:z-auto transition-opacity duration-200 ${
          sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden="true"
      ></div>

      {/* Sidebar container */}
      <div
        id="sidebar"
        ref={sidebar}
        className={`flex flex-col absolute z-40 left-0 top-0 lg:static lg:left-auto lg:top-auto lg:translate-x-0 h-dvh overflow-y-auto no-scrollbar w-64 shrink-0 bg-white dark:bg-gray-800 p-4 transition-all duration-200 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-64"
        } ${variant === 'v2' ? 'border-r border-gray-200 dark:border-gray-700/60' : 'rounded-r-2xl shadow-xs'}`}
      >
        {/* Sidebar header */}
        <div className="flex justify-between mb-8 pr-3 sm:px-2 items-center">
          {/* Close button (mobile only) */}
          <button
            ref={trigger}
            className="lg:hidden text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-controls="sidebar"
            aria-expanded={sidebarOpen}
          >
            <span className="sr-only">Close sidebar</span>
            <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M10.7 18.7l1.4-1.4L7.8 13H20v-2H7.8l4.3-4.3-1.4-1.4L4 12z" />
            </svg>
          </button>

          {/* Logo */}
          <NavLink end to="/" className="block">
            <div className="flex items-center gap-2">
              <svg className="fill-violet-500 w-8 h-8 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
                <path d="M31.956 14.8C31.372 6.92 25.08.628 17.2.044V5.76a9.04 9.04 0 0 0 9.04 9.04h5.716ZM14.8 26.24v5.716C6.92 31.372.63 25.08.044 17.2H5.76a9.04 9.04 0 0 1 9.04 9.04Zm11.44-9.04h5.716c-.584 7.88-6.876 14.172-14.756 14.756V26.24a9.04 9.04 0 0 1 9.04-9.04ZM.044 14.8C.63 6.92 6.92.628 14.8.044V5.76a9.04 9.04 0 0 1-9.04 9.04H.044Z" />
              </svg>
              <span className="font-extrabold text-lg text-gray-800 dark:text-gray-100 tracking-wider">FeedSense</span>
            </div>
          </NavLink>
        </div>

        {/* Links Navigation */}
        <div className="space-y-6">
          <div>
            <ul className="space-y-1">
              {/* Dashboard / Overview */}
              <li>
                <NavLink
                  end
                  to="/"
                  className={({ isActive }) =>
                    `flex items-center w-full px-3 py-2 rounded-lg font-medium text-sm transition duration-150 ${
                      isActive
                        ? "bg-violet-100 dark:bg-violet-600/10 text-violet-600 dark:text-violet-400"
                        : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                    }`
                  }
                >
                  <svg className="w-5 h-5 mr-3 shrink-0 fill-current" viewBox="0 0 16 16">
                    <path d="M5.936.278A7.983 7.983 0 0 1 8 0a8 8 0 1 1-8 8c0-.722.104-1.413.278-2.064a1 1 0 1 1 1.932.516A5.99 5.99 0 0 0 2 8a6 6 0 1 0 6-6c-.53 0-1.045.076-1.548.21A1 1 0 1 1 5.936.278Z" />
                    <path d="M6.068 7.482A2.003 2.003 0 0 0 8 10a2 2 0 1 0-.518-3.932L3.707 2.293a1 1 0 0 0-1.414 1.414l3.775 3.775Z" />
                  </svg>
                  <span>Overview Dashboard</span>
                </NavLink>
              </li>
            </ul>
          </div>

          {/* Section: Core */}
          <div>
            <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3 mb-2">Core</h3>
            <ul className="space-y-1">
              <li>
                <NavLink
                  to="/submissions"
                  className={({ isActive }) =>
                    `flex items-center w-full px-3 py-2 rounded-lg font-medium text-sm transition duration-150 ${
                      isActive
                        ? "bg-violet-100 dark:bg-violet-600/10 text-violet-600 dark:text-violet-400"
                        : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                    }`
                  }
                >
                  <svg className="w-5 h-5 mr-3 shrink-0 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Submissions</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/raw"
                  className={({ isActive }) =>
                    `flex items-center w-full px-3 py-2 rounded-lg font-medium text-sm transition duration-150 ${
                      isActive
                        ? "bg-violet-100 dark:bg-violet-600/10 text-violet-600 dark:text-violet-400"
                        : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                    }`
                  }
                >
                  <svg className="w-5 h-5 mr-3 shrink-0 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Raw Data</span>
                </NavLink>
              </li>
            </ul>
          </div>

          {/* Section: Analytics */}
          <div>
            <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3 mb-2">Analytics</h3>
            <ul className="space-y-1">
              <li>
                <NavLink
                  to="/nps"
                  className={({ isActive }) =>
                    `flex items-center w-full px-3 py-2 rounded-lg font-medium text-sm transition duration-150 ${
                      isActive
                        ? "bg-violet-100 dark:bg-violet-600/10 text-violet-600 dark:text-violet-400"
                        : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                    }`
                  }
                >
                  <svg className="w-5 h-5 mr-3 shrink-0 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>NPS Score</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/scores"
                  className={({ isActive }) =>
                    `flex items-center w-full px-3 py-2 rounded-lg font-medium text-sm transition duration-150 ${
                      isActive
                        ? "bg-violet-100 dark:bg-violet-600/10 text-violet-600 dark:text-violet-400"
                        : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                    }`
                  }
                >
                  <svg className="w-5 h-5 mr-3 shrink-0 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
                  </svg>
                  <span>Form Scores</span>
                </NavLink>
              </li>
            </ul>
          </div>

          {/* Section: Dimensions */}
          <div>
            <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3 mb-2">Dimensions</h3>
            <ul className="space-y-1">
              <li>
                <NavLink
                  to="/categories"
                  className={({ isActive }) =>
                    `flex items-center w-full px-3 py-2 rounded-lg font-medium text-sm transition duration-150 ${
                      isActive
                        ? "bg-violet-100 dark:bg-violet-600/10 text-violet-600 dark:text-violet-400"
                        : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                    }`
                  }
                >
                  <svg className="w-5 h-5 mr-3 shrink-0 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Categories</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/priority"
                  className={({ isActive }) =>
                    `flex items-center w-full px-3 py-2 rounded-lg font-medium text-sm transition duration-150 ${
                      isActive
                        ? "bg-violet-100 dark:bg-violet-600/10 text-violet-600 dark:text-violet-400"
                        : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                    }`
                  }
                >
                  <svg className="w-5 h-5 mr-3 shrink-0 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>Priorities</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/volume"
                  className={({ isActive }) =>
                    `flex items-center w-full px-3 py-2 rounded-lg font-medium text-sm transition duration-150 ${
                      isActive
                        ? "bg-violet-100 dark:bg-violet-600/10 text-violet-600 dark:text-violet-400"
                        : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                    }`
                  }
                >
                  <svg className="w-5 h-5 mr-3 shrink-0 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  <span>Volume Trend</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/sentiment"
                  className={({ isActive }) =>
                    `flex items-center w-full px-3 py-2 rounded-lg font-medium text-sm transition duration-150 ${
                      isActive
                        ? "bg-violet-100 dark:bg-violet-600/10 text-violet-600 dark:text-violet-400"
                        : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                    }`
                  }
                >
                  <svg className="w-5 h-5 mr-3 shrink-0 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <span>Sentiment Breakdown</span>
                </NavLink>
              </li>
            </ul>
          </div>

          {/* Section: Outcomes */}
          <div>
            <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3 mb-2">Outcomes</h3>
            <ul className="space-y-1">
              <li>
                <NavLink
                  to="/churn"
                  className={({ isActive }) =>
                    `flex items-center w-full px-3 py-2 rounded-lg font-medium text-sm transition duration-150 ${
                      isActive
                        ? "bg-violet-100 dark:bg-violet-600/10 text-violet-600 dark:text-violet-400"
                        : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                    }`
                  }
                >
                  <svg className="w-5 h-5 mr-3 shrink-0 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span>Churn Reasons</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/winloss"
                  className={({ isActive }) =>
                    `flex items-center w-full px-3 py-2 rounded-lg font-medium text-sm transition duration-150 ${
                      isActive
                        ? "bg-violet-100 dark:bg-violet-600/10 text-violet-600 dark:text-violet-400"
                        : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                    }`
                  }
                >
                  <svg className="w-5 h-5 mr-3 shrink-0 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Win / Loss Outcomes</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/pricing"
                  className={({ isActive }) =>
                    `flex items-center w-full px-3 py-2 rounded-lg font-medium text-sm transition duration-150 ${
                      isActive
                        ? "bg-violet-100 dark:bg-violet-600/10 text-violet-600 dark:text-violet-400"
                        : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                    }`
                  }
                >
                  <svg className="w-5 h-5 mr-3 shrink-0 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Pricing Perceptions</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/insights"
                  className={({ isActive }) =>
                    `flex items-center w-full px-3 py-2 rounded-lg font-medium text-sm transition duration-150 ${
                      isActive
                        ? "bg-violet-100 dark:bg-violet-600/10 text-violet-600 dark:text-violet-400"
                        : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                    }`
                  }
                >
                  <svg className="w-5 h-5 mr-3 shrink-0 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 9.172V5L8 4z" />
                  </svg>
                  <span>AI Insights</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/docs"
                  className={({ isActive }) =>
                    `flex items-center w-full px-3 py-2 rounded-lg font-medium text-sm transition duration-150 ${
                      isActive
                        ? "bg-violet-100 dark:bg-violet-600/10 text-violet-600 dark:text-violet-400"
                        : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                    }`
                  }
                >
                  <svg className="w-5 h-5 mr-3 shrink-0 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <span>Documentation</span>
                </NavLink>
              </li>
            </ul>
          </div>

          {/* Section: Developer Settings / API Keys */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700/60 mt-4">
            <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3 mb-3">API Keys</h3>
            <div className="px-3">
              {loadingKeys ? (
                <div className="text-xs text-gray-400">Loading keys...</div>
              ) : apiKeys.length === 0 ? (
                <div className="text-xs text-gray-400 dark:text-gray-500 mb-3 italic">No API keys generated.</div>
              ) : (
                <div className="space-y-2 mb-3 max-h-36 overflow-y-auto pr-1 no-scrollbar">
                  {apiKeys.map((key, index) => (
                    <div key={index} className="flex items-center justify-between gap-1 p-2 bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800 rounded-lg text-xs">
                      <span className="font-mono text-[10px] text-gray-700 dark:text-gray-300 truncate w-32" title={key.includes('•') ? 'API Key (Hidden)' : key}>
                        {key}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {!key.includes('•') && (
                          <button
                            onClick={() => copyToClipboard(key)}
                            className="text-gray-400 hover:text-violet-500 dark:hover:text-violet-400 transition"
                            title="Copy Key"
                          >
                            {copiedKey === key ? (
                              <span className="text-[10px] text-green-500 font-bold">Copied!</span>
                            ) : (
                              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                                <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
                              </svg>
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => handleRevokeKey(key)}
                          className="text-gray-400 hover:text-rose-500 dark:hover:text-rose-450 transition"
                          title="Revoke Key"
                        >
                          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {keyError && (
                <div className="text-[10px] text-rose-500 font-medium leading-tight mb-2.5 px-0.5 animate-fadeIn">
                  {keyError}
                </div>
              )}
              <button
                onClick={handleCreateKey}
                disabled={isTestClient}
                className={`w-full py-2 px-3 text-white font-bold text-xs rounded-lg shadow-sm transition flex items-center justify-center gap-1.5 ${
                  isTestClient
                    ? "bg-gray-300 dark:bg-gray-800 text-gray-500 dark:text-gray-500 cursor-not-allowed border border-gray-200 dark:border-gray-700/60"
                    : "bg-violet-600 hover:bg-violet-700 cursor-pointer"
                }`}
                title={isTestClient ? "API key generation is disabled in the simulated test environment" : "Generate API Key"}
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                </svg>
                {isTestClient ? "Disabled in Test Env" : "Generate API Key"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;
