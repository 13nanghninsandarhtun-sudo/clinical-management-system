import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FaSearch, FaCartPlus, FaPlus, FaBarcode } from 'react-icons/fa';

function Pharmacy() {
  const [medicines, setMedicines] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [barcode, setBarcode] = useState('');
  const [dispensingData, setDispensingData] = useState({
    patient_id: '',
    medicine_id: '',
    quantity: 1,
    prescription_number: ''
  });
  const [patients, setPatients] = useState([]);
  const [newMedicine, setNewMedicine] = useState({
    name: '',
    generic_name: '',
    category: '',
    manufacturer: '',
    barcode: '',
    unit_price: ''
  });

  useEffect(() => {
    fetchMedicines();
    fetchPatients();
  }, []);

  const fetchMedicines = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/medicines`);
      setMedicines(response.data);
    } catch (error) {
      toast.error('Failed to fetch medicines');
    }
  };

  const fetchPatients = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/patients`);
      setPatients(response.data);
    } catch (error) {
      toast.error('Failed to fetch patients');
    }
  };

  const handleMedicineSearch = async () => {
    if (!barcode) return;
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/medicines/barcode/${barcode}`);
      setDispensingData({ ...dispensingData, medicine_id: response.data.id });
      toast.success(`Medicine found: ${response.data.name}`);
      setBarcode('');
    } catch (error) {
      toast.error('Medicine not found');
    }
  };

  const handleDispense = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/api/dispense`, dispensingData);
      toast.success('Medicine dispensed successfully');
      setDispensingData({
        patient_id: '',
        medicine_id: '',
        quantity: 1,
        prescription_number: ''
      });
      fetchMedicines();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to dispense');
    }
  };

  const handleAddMedicine = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/api/medicines`, newMedicine);
      toast.success('Medicine added successfully');
      setNewMedicine({
        name: '',
        generic_name: '',
        category: '',
        manufacturer: '',
        barcode: '',
        unit_price: ''
      });
      setShowAddForm(false);
      fetchMedicines();
    } catch (error) {
      toast.error('Failed to add medicine');
    }
  };

  const filteredMedicines = medicines.filter(medicine =>
    medicine.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    medicine.barcode?.includes(searchTerm)
  );

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Pharmacy Management</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dispensing Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <FaCartPlus /> Dispense Medicine
          </h2>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Scan Barcode</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Scan or enter barcode"
                className="flex-1 border rounded-lg p-2"
                onKeyPress={(e) => e.key === 'Enter' && handleMedicineSearch()}
              />
              <button
                onClick={handleMedicineSearch}
                className="bg-blue-500 text-white px-4 rounded-lg flex items-center gap-2"
              >
                <FaBarcode /> Search
              </button>
            </div>
          </div>

          <form onSubmit={handleDispense} className="space-y-4">
            <select
              value={dispensingData.patient_id}
              onChange={(e) => setDispensingData({ ...dispensingData, patient_id: e.target.value })}
              className="w-full border rounded-lg p-2"
              required
            >
              <option value="">Select Patient</option>
              {patients.map(patient => (
                <option key={patient.id} value={patient.id}>
                  {patient.uhid} - {patient.first_name} {patient.last_name}
                </option>
              ))}
            </select>

            <select
              value={dispensingData.medicine_id}
              onChange={(e) => setDispensingData({ ...dispensingData, medicine_id: e.target.value })}
              className="w-full border rounded-lg p-2"
              required
            >
              <option value="">Select Medicine</option>
              {medicines.map(medicine => (
                <option key={medicine.id} value={medicine.id}>
                  {medicine.name} - Stock: {medicine.stock_quantity || 0} - ₹{medicine.unit_price}
                </option>
              ))}
            </select>

            <input
              type="number"
              value={dispensingData.quantity}
              onChange={(e) => setDispensingData({ ...dispensingData, quantity: parseInt(e.target.value) })}
              placeholder="Quantity"
              className="w-full border rounded-lg p-2"
              min="1"
              required
            />

            <input
              type="text"
              value={dispensingData.prescription_number}
              onChange={(e) => setDispensingData({ ...dispensingData, prescription_number: e.target.value })}
              placeholder="Prescription Number (optional)"
              className="w-full border rounded-lg p-2"
            />

            <button
              type="submit"
              className="w-full bg-green-500 text-white py-2 rounded-lg hover:bg-green-600"
            >
              Dispense Medicine
            </button>
          </form>
        </div>

        {/* Medicine List Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Medicine Inventory</h2>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-blue-500 text-white px-3 py-1 rounded-lg flex items-center gap-2 text-sm"
            >
              <FaPlus /> Add Medicine
            </button>
          </div>

          <div className="mb-4">
            <div className="relative">
              <FaSearch className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search medicines..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
              />
            </div>
          </div>

          {showAddForm && (
            <form onSubmit={handleAddMedicine} className="mb-6 p-4 border rounded-lg bg-gray-50">
              <h3 className="font-bold mb-3">Add New Medicine</h3>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Medicine Name *"
                  value={newMedicine.name}
                  onChange={(e) => setNewMedicine({ ...newMedicine, name: e.target.value })}
                  className="border rounded-lg p-2"
                  required
                />
                <input
                  type="text"
                  placeholder="Generic Name"
                  value={newMedicine.generic_name}
                  onChange={(e) => setNewMedicine({ ...newMedicine, generic_name: e.target.value })}
                  className="border rounded-lg p-2"
                />
                <input
                  type="text"
                  placeholder="Category"
                  value={newMedicine.category}
                  onChange={(e) => setNewMedicine({ ...newMedicine, category: e.target.value })}
                  className="border rounded-lg p-2"
                />
                <input
                  type="text"
                  placeholder="Manufacturer"
                  value={newMedicine.manufacturer}
                  onChange={(e) => setNewMedicine({ ...newMedicine, manufacturer: e.target.value })}
                  className="border rounded-lg p-2"
                />
                <input
                  type="text"
                  placeholder="Barcode *"
                  value={newMedicine.barcode}
                  onChange={(e) => setNewMedicine({ ...newMedicine, barcode: e.target.value })}
                  className="border rounded-lg p-2"
                  required
                />
                <input
                  type="number"
                  placeholder="Unit Price"
                  value={newMedicine.unit_price}
                  onChange={(e) => setNewMedicine({ ...newMedicine, unit_price: e.target.value })}
                  className="border rounded-lg p-2"
                  step="0.01"
                />
              </div>
              <div className="flex gap-2 mt-3">
                <button type="submit" className="bg-green-500 text-white px-4 py-1 rounded">Save</button>
                <button type="button" onClick={() => setShowAddForm(false)} className="bg-gray-500 text-white px-4 py-1 rounded">Cancel</button>
              </div>
            </form>
          )}

          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">Category</th>
                  <th className="px-3 py-2 text-left">Stock</th>
                  <th className="px-3 py-2 text-left">Price</th>
                </tr>
              </thead>
              <tbody>
                {filteredMedicines.map((medicine) => (
                  <tr key={medicine.id} className="border-t">
                    <td className="px-3 py-2">{medicine.name}</td>
                    <td className="px-3 py-2">{medicine.category || '-'}</td>
                    <td className="px-3 py-2">
                      <span className={medicine.stock_quantity < 10 ? 'text-red-500 font-bold' : ''}>
                        {medicine.stock_quantity || 0}
                      </span>
                    </td>
                    <td className="px-3 py-2">₹{medicine.unit_price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Pharmacy;