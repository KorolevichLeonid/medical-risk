import { createRoot } from 'react-dom/client';
import { PublicClientApplication } from '@azure/msal-browser';
import { msalConfig } from './authConfig';
import App from './App';

const msalInstance = new PublicClientApplication(msalConfig);

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <App msalInstance={msalInstance} />
);