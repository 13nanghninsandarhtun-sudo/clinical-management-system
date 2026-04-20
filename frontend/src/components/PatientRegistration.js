import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FaSave, FaList, FaSearch, FaUserPlus } from 'react-icons/fa';

function PatientRegistration() {
  const [patients, setPatients] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: '',
    phone: '',
    email: '',
    address: '',
    emergency_contact: '',
    blood_group: '',
    allergies: '',
    medical_history: {
      diagnosis: '',
      medications: '',
      surgeries: '',
      chronic_conditions: '',
      family_history: ''
    }
  });

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/patients`);
      setPatients(response.data);
    } catch (error) {
      toast.error('Failed to fetch patients');
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleMedicalHistoryChange = (e) => {
    setFormData({
      ...formData,
      medical_history: {
        ...formData.medical_history,
        [e.target.name]: e.target.value
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/api/patients`, formData);
      toast.success('Patient registered successfully');
      setFormData({
        first_name: '',
        last_name: '',
        date_of_birth: '',
        gender: '',
        phone: '',
        email: '',
        address: '',
        emergency_contact: '',
        blood_group: '',
        allergies: '',
        medical_history: {
          diagnosis: '',
          medications: '',
          surgeries: '',
          chronic_conditions: '',
          family_history: ''
        }
      });
      setShowForm(false);
      fetchPatients();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Registration failed');
    }
  };

  const filteredPatients = patients.filter(patient =>
    `${patient.first_name} ${patient.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.uhid?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Patient Registration</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-600"
        >
          <FaUserPlus />
          {showForm ? 'View Patients' : 'Register New Patient'}
        </button>
      </div>

      {showForm ? (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">New Patient Registration</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                name="first_name"
                placeholder="First Name *"
                value={formData.first_name}
                onChange={handleChange}
                className="border rounded-lg p-2"
                required
              />
              <input
                type="text"
                name="last_name"
                placeholder="Last Name *"
                value={formData.last_name}
                onChange={handleChange}
                className="border rounded-lg p-2"
                required
              />
              <input
                type="date"
                name="date_of_birth"
                placeholder="Date of Birth *"
                value={formData.date_of_birth}
                onChange={handleChange}
                className="border rounded-lg p-2"
                required
              />
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="border rounded-lg p-2"
                required
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              <input
                type="tel"
                name="phone"
                placeholder="Phone *"
                value={formData.phone}
                onChange={handleChange}
                className="border rounded-lg p-2"
                required
              />
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
                className="border rounded-lg p-2"
              />
              <input
                type="text"
                name="address"
                placeholder="Address"
                value={formData.address}
                onChange={handleChange}
                className="border rounded-lg p-2"
              />
              <input
                type="text"
                name="emergency_contact"
                placeholder="Emergency Contact"
                value={formData.emergency_contact}
                onChange={handleChange}
                className="border rounded-lg p-2"
              />
              <select
                name="blood_group"
                value={formData.blood_group}
                onChange={handleChange}
                className="border rounded-lg p-2"
              >
                <option value="">Blood Group</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>
              <input
                type="text"
                name="allergies"
                placeholder="Allergies"
                value={formData.allergies}
                onChange={handleChange}
                className="border rounded-lg p-2"
              />
            </div>

            <div className="border-t pt-4 mt-4">
              <h3 className="font-bold mb-3">Medical History</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <textarea
                  name="diagnosis"
                  placeholder="Diagnosis"
                  value={formData.medical_history.diagnosis}
                  onChange={handleMedicalHistoryChange}
                  className="border rounded-lg p-2"
                  rows="3"
                />
                <textarea
                  name="medications"
                  placeholder="Current Medications"
                  value={formData.medical_history.medications}
                  onChange={handleMedicalHistoryChange}
                  className="border rounded-lg p-2"
                  rows="3"
                />
                <textarea
                  name="surgeries"
                  placeholder="Previous Surgeries"
                  value={formData.medical_history.surgeries}
                  onChange={handleMedicalHistoryChange}
                  className="border rounded-lg p-2"
                  rows="3"
                />
                <textarea
                  name="chronic_conditions"
                  placeholder="Chronic Conditions"
                  value={formData.medical_history.chronic_conditions}
                  onChange={handleMedicalHistoryChange}
                  className="border rounded-lg p-2"
                  rows="3"
                />
                <textarea
                  name="family_history"
                  placeholder="Family History"
                  value={formData.medical_history.family_history}
                  onChange={handleMedicalHistoryChange}
                  className="border rounded-lg p-2 col-span-2"
                  rows="3"
                />
              </div>
            </div>

            <button
              type="submit"
              className="bg-green-500 text-white px-6 py-2 rounded-lg flex items-center gap-2 hover:bg-green-600"
            >
              <FaSave /> Register Patient
            </button>
          </form>
        </div>
      ) : (
        <div>
          <div className="mb-4 flex gap-2">
            <div className="relative flex-1">
              <FaSearch className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or UHID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
              />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">UHID</th>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">DOB</th>
                  <th className="px-4 py-3 text-left">Gender</th>
                  <th className="px-4 py-3 text-left">Phone</th>
                  <th className="px-4 py-3 text-left">Blood Group</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map((patient) => (
                  <tr key={patient.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3">{patient.uhid}</td>
                    <td className="px-4 py-3">{patient.first_name} {patient.last_name}</td>
                    <td className="px-4 py-3">{new Date(patient.date_of_birth).toLocaleDateString()}</td>
                    <td className="px-4 py-3">{patient.gender}</td>
                    <td className="px-4 py-3">{patient.phone}</td>
                    <td className="px-4 py-3">{patient.blood_group || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default PatientRegistration;