import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import ThemeProvider from './utils/ThemeContext';
import App from './App';

// Intercept all fetch requests to automatically append Authorization header if token is present
const originalFetch = window.fetch;
window.fetch = async function (url, options = {}) {
  let targetUrl = url;
  if (typeof url === 'string' && url.startsWith('/') && !url.startsWith('/server-')) {
    targetUrl = '/server-' + url.slice(1);
  }

  const token = localStorage.getItem('token');
  if (token && typeof targetUrl === 'string' && (targetUrl.startsWith('/') || targetUrl.startsWith(window.location.origin))) {
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
