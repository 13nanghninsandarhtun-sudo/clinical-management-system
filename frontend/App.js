// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import PatientRegistration from './components/PatientRegistration';
import Pharmacy from './components/Pharmacy';
import Cashier from './components/Cashier';
import CentralStore from './components/CentralStore';
import { AuthProvider, useAuth } from './contexts/AuthContext';

const PrivateRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" />;
  }
  
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-100">
          <Toaster position="top-right" />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            } />
            <Route path="/patients" element={
              <PrivateRoute allowedRoles={['admin', 'doctor', 'receptionist']}>
                <PatientRegistration />
              </PrivateRoute>
            } />
            <Route path="/pharmacy" element={
              <PrivateRoute allowedRoles={['admin', 'pharmacist']}>
                <Pharmacy />
              </PrivateRoute>
            } />
            <Route path="/cashier" element={
              <PrivateRoute allowedRoles={['admin', 'cashier']}>
                <Cashier />
              </PrivateRoute>
            } />
            <Route path="/central-store" element={
              <PrivateRoute allowedRoles={['admin']}>
                <CentralStore />
              </PrivateRoute>
            } />
            <Route path="/" element={<Navigate to="/dashboard" />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}
app.get('/api/dispensing', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.*, 
             CASE WHEN b.id IS NOT NULL THEN true ELSE false END as billed
      FROM dispensing_records d
      LEFT JOIN billing_records b ON d.id = b.dispensing_id
      ORDER BY d.dispensed_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dispensing records' });
  }
});

// Add purchase orders GET endpoint
app.get('/api/central-store/purchase-orders', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT po.*, u.username as created_by_name
      FROM purchase_orders po
      LEFT JOIN users u ON po.created_by = u.id
      ORDER BY po.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch purchase orders' });
  }
});

export default App;