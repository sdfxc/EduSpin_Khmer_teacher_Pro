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
<<<<<<< HEAD
    <LanguageProvider>
      <ConfirmProvider>
        <App />
      </ConfirmProvider>
    </LanguageProvider>
=======
    <ConfirmProvider>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </ConfirmProvider>
>>>>>>> e7771433e888f909338169cfce9d59fbb2fb2f6e
  </StrictMode>,
);
