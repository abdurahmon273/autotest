import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LangProvider } from './lib';
import Layout from './components/Layout';
import Home from './pages/Home';
import Theme from './pages/Theme';

const qc = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } });

createRoot(document.getElementById('app')).render(
    <StrictMode>
        <QueryClientProvider client={qc}>
            <LangProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/app" element={<Layout />}>
                        <Route index element={<Home />} />
                        <Route path="theme/:id" element={<Theme />} />
                        <Route path="*" element={<Navigate to="/app" replace />} />
                    </Route>
                </Routes>
            </BrowserRouter>
            </LangProvider>
        </QueryClientProvider>
    </StrictMode>,
);
