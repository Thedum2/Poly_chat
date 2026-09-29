import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import OAuthCallback from './components/OAuthCallback';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {window.location.pathname.replace(/\/$/, '') === '/callback' ? <OAuthCallback /> : <App />}
  </React.StrictMode>
);
