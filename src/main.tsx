import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import LehbarApp from './LehbarApp.tsx';

// Routing minimal par chemin : /lehbar = démo prospect emballage, sinon site Taylr.
const isLehbar = window.location.pathname.toLowerCase().startsWith('/lehbar');

createRoot(document.getElementById('root')!).render(
  <StrictMode>{isLehbar ? <LehbarApp /> : <App />}</StrictMode>
);
