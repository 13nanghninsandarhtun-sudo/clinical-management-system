// src/components/Dashboard.js
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FaUsers, FaPills, FaMoneyBill, FaWarehouse, FaSignOutAlt } from 'react-icons/fa';
import axios from 'axios';

function Dashboard() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState({
    patients: 0,
    medicines: 0,
    bills: 0
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [patients, medicines, bills] = await Promise.all([
        axios.get(`${process.env.REACT_APP_API_URL}/api/patients`),
        axios.get(`${process.env.REACT_APP_API_URL}/api/medicines`),
        axios.get(`${process.env.REACT_APP_API_URL}/api/billing`)
      ]);
      
      setStats({
        patients: patients.data.length,
        medicines: medicines.data.length,
        bills: bills.data.length
      });
    } catch (error) {
      console.error('Failed to fetch stats', error);
    }
  };

  const modules = [
    { name: 'Patient Registration', icon: FaUsers, path: '/patients', roles: ['admin', 'doctor', 'receptionist'], color: 'bg-blue-500' },
    { name: 'Pharmacy', icon: FaPills, path: '/pharmacy', roles: ['admin', 'pharmacist'], color: 'bg-green-500' },
    { name: 'Cashier', icon: FaMoneyBill, path: '/cashier', roles: ['admin', 'cashier'], color: 'bg-yellow-500' },
    { name: 'Central Store', icon: FaWarehouse, path: '/central-store', roles: ['admin'], color: 'bg-purple-500' }
  ];

  const accessibleModules = modules.filter(module => 
    module.roles.includes(user?.role) || user?.role === 'admin'
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800">Clinical Management System</h1>
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">Welcome, {user?.full_name} ({user?.role})</span>
              <button
                onClick={logout}
                className="flex items-center space-x-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
              >
                <FaSignOutAlt />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Total Patients</p>
                <p className="text-3xl font-bold">{stats.patients}</p>
              </div>
              <FaUsers className="text-4xl text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Medicines in Stock</p>
                <p className="text-3xl font-bold">{stats.medicines}</p>
              </div>
              <FaPills className="text-4xl text-green-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Total Bills</p>
                <p className="text-3xl font-bold">{stats.bills}</p>
              </div>
              <FaMoneyBill className="text-4xl text-yellow-500" />
            </div>
          </div>
        </div>
        
        <h2 className="text-xl font-bold mb-4">Available Modules</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {accessibleModules.map((module, index) => (
            <Link
              key={index}
              to={module.path}
              className={`${module.color} rounded-lg shadow-lg p-6 text-white hover:opacity-90 transition duration-200`}
            >
              <module.icon className="text-4xl mb-3" />
              <h3 className="text-xl font-bold">{module.name}</h3>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;