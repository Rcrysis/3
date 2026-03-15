/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import PatientList from './pages/PatientList';
import Dashboard from './pages/Dashboard';
import BloodPressure from './pages/BloodPressure';
import Glucose from './pages/Glucose';
import Insulin from './pages/Insulin';
import Medications from './pages/Medications';
import Documents from './pages/Documents';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import { db } from './services/db';
import { notificationService } from './services/notifications';

// Protected Route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  if (!db.isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

export default function App() {
  useEffect(() => {
    // Check for medication reminders every minute
    const interval = setInterval(() => {
      notificationService.checkMedicationReminders();
    }, 60000);

    // Initial check
    notificationService.checkMedicationReminders();

    return () => clearInterval(interval);
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={
          <ProtectedRoute>
            <PatientList />
          </ProtectedRoute>
        } />

        <Route path="/patient/:patientId" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="bp" element={<BloodPressure />} />
          <Route path="glucose" element={<Glucose />} />
          <Route path="insulin" element={<Insulin />} />
          <Route path="medications" element={<Medications />} />
          <Route path="documents" element={<Documents />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
