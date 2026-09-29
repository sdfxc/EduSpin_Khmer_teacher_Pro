import './lib/safeStorage.ts';
import 'firebase/auth';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ConfirmProvider } from './context/ConfirmContext.tsx';
import { LanguageProvider } from './context/LanguageContext.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfirmProvider>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </ConfirmProvider>
  </StrictMode>,
);
