import React from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from './context/AuthContext';
import App from './App';

const container = document.getElementById('root');
const root = createRoot(container);
root.render(
  <AuthProvider>
    <App />
  </AuthProvider>
);
