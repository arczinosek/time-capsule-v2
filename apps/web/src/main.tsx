import { QueryClient } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProviders } from './app-providers';
import './index.css';
import { createAppRouter } from './router';

const queryClient = new QueryClient();
const router = createAppRouter({ queryClient });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders queryClient={queryClient} router={router} />
  </StrictMode>,
);
