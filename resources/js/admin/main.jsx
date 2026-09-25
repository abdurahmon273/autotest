import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './lib/auth';
import { ToastProvider } from './lib/toast';
import { ConfirmProvider } from './lib/confirm';
import { LightboxProvider } from './lib/lightbox';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import { PeopleIndex, PersonForm, PersonShow } from './pages/People';
import { StaffForm, StaffIndex, StaffShow } from './pages/Staff';
import { GroupForm, GroupShow, GroupsIndex } from './pages/Groups';
import { RoleForm, RoleShow, RolesIndex } from './pages/Roles';
import { PermissionForm, PermissionShow, PermissionsIndex } from './pages/Permissions';
import { ThemeForm, ThemesIndex } from './pages/Themes';
import { QuestionForm, QuestionShow, QuestionsIndex } from './pages/Questions';
import Profile from './pages/Profile';
import { GeneralSettings, TelegramSettings, Tests } from './pages/Settings';

const qc = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false, staleTime: 30_000 } } });

const crud = (path, Index, Form, Show) => (
    <Route path={path}>
        <Route index element={<Index />} />
        <Route path="create" element={<Form />} />
        {Show && <Route path=":id" element={<Show />} />}
        <Route path=":id/edit" element={<Form />} />
    </Route>
);

const people = kind => (
    <Route path={kind}>
        <Route index element={<PeopleIndex kind={kind} />} />
        <Route path="create" element={<PersonForm kind={kind} />} />
        <Route path=":id" element={<PersonShow kind={kind} />} />
        <Route path=":id/edit" element={<PersonForm kind={kind} />} />
    </Route>
);

createRoot(document.getElementById('app')).render(
    <StrictMode>
        <QueryClientProvider client={qc}>
            <AuthProvider>
                <ToastProvider>
                    <ConfirmProvider>
                        <LightboxProvider>
                            <BrowserRouter>
                                <Routes>
                                    <Route path="/admin/login" element={<Login />} />
                                    <Route path="/admin" element={<Layout />}>
                                        <Route index element={<Dashboard />} />
                                        {people('teachers')}
                                        {people('students')}
                                        {crud('groups', GroupsIndex, GroupForm, GroupShow)}
                                        {crud('roles', RolesIndex, RoleForm, RoleShow)}
                                        {crud('permissions', PermissionsIndex, PermissionForm, PermissionShow)}
                                        {crud('themes', ThemesIndex, ThemeForm)}
                                        {crud('questions', QuestionsIndex, QuestionForm, QuestionShow)}
                                        <Route path="tests" element={<Tests />} />
                                        <Route path="profile" element={<Profile />} />
                                        <Route path="settings/telegram" element={<TelegramSettings />} />
                                        <Route path="settings/general" element={<GeneralSettings />} />
                                        <Route path="*" element={<Navigate to="/admin" replace />} />
                                    </Route>
                                </Routes>
                            </BrowserRouter>
                        </LightboxProvider>
                    </ConfirmProvider>
                </ToastProvider>
            </AuthProvider>
        </QueryClientProvider>
    </StrictMode>,
);
