import React, { useEffect } from 'react';
import {
  Routes,
  Route,
  useLocation
} from 'react-router-dom';
import LinkPage from './Link';

import './css/style.css';
import './charts/ChartjsConfig';

// Import pages
import Dashboard from './pages/Dashboard';

function App() {
  const location = useLocation();

  useEffect(() => {
    document.querySelector('html').style.scrollBehavior = 'auto';
    window.scroll({ top: 0 });
    document.querySelector('html').style.scrollBehavior = '';
  }, [location.pathname]); // triggered on route change

  return (
    <>
      <Routes>
        <Route path="/" element={<Dashboard view="overview" />} />
        <Route path="/dashboard" element={<Dashboard view="overview" />} />
        <Route path="/submissions" element={<Dashboard view="submissions" />} />
        <Route path="/raw" element={<Dashboard view="raw" />} />
        <Route path="/nps" element={<Dashboard view="nps" />} />
        <Route path="/scores" element={<Dashboard view="scores" />} />
        <Route path="/categories" element={<Dashboard view="categories" />} />
        <Route path="/priority" element={<Dashboard view="priority" />} />
        <Route path="/volume" element={<Dashboard view="volume" />} />
        <Route path="/sentiment" element={<Dashboard view="sentiment" />} />
        <Route path="/churn" element={<Dashboard view="churn" />} />
        <Route path="/winloss" element={<Dashboard view="winloss" />} />
        <Route path="/pricing" element={<Dashboard view="pricing" />} />
        <Route path="/insights" element={<Dashboard view="insights" />} />
        <Route path="/docs" element={<Dashboard view="docs" />} />
        <Route path="/link" element={<LinkPage />} />
      </Routes>
    </>
  );
}

export default App;
