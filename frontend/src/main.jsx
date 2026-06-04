import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import ThemeProvider from './utils/ThemeContext';
import App from './App';

// Intercept all fetch requests to automatically append Authorization header if token is present
const originalFetch = window.fetch;
window.fetch = async function (url, options = {}) {
  const apiBaseUrl = import.meta.env.VITE_API_URL || '';
  let targetUrl = url;
  
  if (typeof url === 'string' && url.startsWith('/')) {
    // Prefix if it doesn't already have the server- prefix
    if (!url.startsWith('/server-')) {
      targetUrl = '/server-' + url.slice(1);
    }
    // Prepend the backend API base URL if defined
    if (apiBaseUrl) {
      targetUrl = apiBaseUrl.replace(/\/$/, '') + targetUrl;
    }
  }

  const token = localStorage.getItem('token');
  const isApiRequest = typeof targetUrl === 'string' && (
    targetUrl.startsWith('/') || 
    targetUrl.startsWith(window.location.origin) || 
    (apiBaseUrl && targetUrl.startsWith(apiBaseUrl))
  );

  if (token && isApiRequest) {
    options.headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    };
  }
  return originalFetch(targetUrl, options);
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </Router>
  </React.StrictMode>
);
