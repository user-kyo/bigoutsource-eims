/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { Bell, X } from 'lucide-react';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import Directory from './pages/Directory';
import EmployeeProfile from './pages/EmployeeProfile';
import Departments from './pages/Departments';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Assets from './pages/Assets';
import Reports from './pages/Reports';
import AuditLogs from './pages/AuditLogs';
import UserManagement from './pages/UserManagement';
import EmployeeImportReview from './pages/EmployeeImportReview';
import { ImportIssuesButton } from './components/imports/ImportIssuesButton';
import { settingsService } from './services/settingsService';
import { userService } from './services/userService';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <SuperAdminRegistrationNotifier />
        <ImportIssuesButton />
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/directory" element={<Directory />} />
            <Route path="/employee/:id" element={<EmployeeProfile />} />
            <Route path="/departments" element={<Departments />} />
            <Route path="/assets" element={<Assets />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/logs" element={<AuditLogs />} />
            <Route path="/settings" element={<Settings />} />
            <Route element={<ProtectedRoute roles={['super_admin', 'admin', 'hr_admin']} />}>
              <Route path="/employee-imports/issues" element={<EmployeeImportReview />} />
              <Route path="/employee-imports/:batchId" element={<EmployeeImportReview />} />
            </Route>
            <Route element={<ProtectedRoute roles={['super_admin']} />}>
              <Route path="/users" element={<UserManagement />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster position="bottom-right" />
      </Router>
    </AuthProvider>
  );
}

function SuperAdminRegistrationNotifier() {
  const { user } = useAuth();
  const lastPendingCount = useRef<number | null>(null);

  useEffect(() => {
    if (user?.role !== 'super_admin') {
      toast.dismiss('pending-registration-alert');
      lastPendingCount.current = null;
      return undefined;
    }

    let isMounted = true;

    function showPendingRegistrationToast(pendingCount: number, isNewRequest: boolean) {
      toast.custom(
        (toastInstance) => (
          <div
            className={`w-80 rounded-2xl border border-amber-100 bg-white p-4 shadow-2xl transition-all ${
              toastInstance.visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-xl bg-amber-50 p-2 text-amber-700">
                <Bell className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-[#111827]">
                  {isNewRequest ? 'New account request' : 'Account request pending'}
                </p>
                <p className="mt-1 text-xs font-bold text-[#6B7280]">
                  {pendingCount} employee account{pendingCount === 1 ? '' : 's'} waiting for Super Admin approval.
                </p>
                <Link
                  to="/users"
                  onClick={() => toast.dismiss(toastInstance.id)}
                  className="mt-3 inline-flex rounded-lg bg-[#111827] px-3 py-2 text-[10px] font-black uppercase text-white hover:bg-[#374151]"
                >
                  Review Requests
                </Link>
              </div>
              <button
                type="button"
                onClick={() => toast.dismiss(toastInstance.id)}
                className="rounded-full border border-[#E5E7EB] p-1 text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#111827]"
                aria-label="Close notification"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ),
        {
          id: 'pending-registration-alert',
          duration: 10000,
        }
      );
    }

    async function checkPendingRegistrations() {
      try {
        const [settings, users] = await Promise.all([settingsService.get(), userService.list()]);
        if (!isMounted) return;

        if (!settings.notifyRegistrationAttempts) {
          toast.dismiss('pending-registration-alert');
          lastPendingCount.current = null;
          return;
        }

        const pendingCount = Array.isArray(users) ? users.filter((account) => account.status === 'pending').length : 0;
        const previousPendingCount = lastPendingCount.current;

        if (pendingCount === 0) {
          toast.dismiss('pending-registration-alert');
          lastPendingCount.current = 0;
          return;
        }

        if (previousPendingCount === null || pendingCount > previousPendingCount) {
          lastPendingCount.current = pendingCount;
          showPendingRegistrationToast(pendingCount, previousPendingCount !== null);
          return;
        }

        lastPendingCount.current = pendingCount;
      } catch (error) {
        // Avoid interrupting normal page work if the background check fails.
      }
    }

    checkPendingRegistrations();
    const intervalId = window.setInterval(checkPendingRegistrations, 60000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [user?.role]);

  return null;
}

