import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FaReceipt, FaPrint, FaMoneyBill } from 'react-icons/fa';

function Cashier() {
  const [dispensingRecords, setDispensingRecords] = useState([]);
  const [billingRecords, setBillingRecords] = useState([]);
  const [selectedDispensing, setSelectedDispensing] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [discount, setDiscount] = useState(0);

  useEffect(() => {
    fetchDispensingRecords();
    fetchBillingRecords();
  }, []);

  const fetchDispensingRecords = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/dispensing`);
      setDispensingRecords(response.data);
    } catch (error) {
      console.error('Failed to fetch dispensing records');
    }
  };

  const fetchBillingRecords = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/billing`);
      setBillingRecords(response.data);
    } catch (error) {
      console.error('Failed to fetch billing records');
    }
  };

  const processBilling = async () => {
    if (!selectedDispensing) {
      toast.error('Please select a dispensing record');
      return;
    }

    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/api/billing`, {
        dispensing_id: selectedDispensing.id,
        payment_method: paymentMethod,
        discount: discount
      });
      toast.success('Billing completed successfully');
      setSelectedDispensing(null);
      setDiscount(0);
      fetchDispensingRecords();
      fetchBillingRecords();
    } catch (error) {
      toast.error('Failed to process billing');
    }
  };

  const calculateTotal = () => {
    if (!selectedDispensing) return 0;
    const subtotal = selectedDispensing.total_price || 0;
    const tax = subtotal * 0.05;
    const total = subtotal + tax - discount;
    return total.toFixed(2);
  };

  const unpaidDispensing = dispensingRecords.filter(record => !record.billed);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Cashier Dashboard</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Side - Unpaid Dispensing Records */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <FaReceipt /> Pending Billing
          </h2>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {unpaidDispensing.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No pending bills</p>
            ) : (
              unpaidDispensing.map(record => (
                <div
                  key={record.id}
                  onClick={() => setSelectedDispensing(record)}
                  className={`p-4 border rounded-lg cursor-pointer transition ${
                    selectedDispensing?.id === record.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold">Prescription: {record.prescription_number}</p>
                      <p className="text-sm text-gray-600">
                        Patient ID: {record.patient_id} | Medicine ID: {record.medicine_id}
                      </p>
                      <p className="text-sm">Quantity: {record.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">₹{record.total_price}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(record.dispensed_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side - Billing Form */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <FaMoneyBill /> Billing Details
          </h2>

          {selectedDispensing ? (
            <div className="space-y-4">
              <div className="border-b pb-4">
                <h3 className="font-bold mb-2">Prescription Details</h3>
                <p><strong>Prescription Number:</strong> {selectedDispensing.prescription_number}</p>
                <p><strong>Medicine ID:</strong> {selectedDispensing.medicine_id}</p>
                <p><strong>Quantity:</strong> {selectedDispensing.quantity}</p>
                <p><strong>Unit Price:</strong> ₹{selectedDispensing.unit_price}</p>
              </div>

              <div className="border-b pb-4">
                <h3 className="font-bold mb-2">Payment Details</h3>
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full border rounded-lg p-2"
                  >
                    <option value="CASH">Cash</option>
                    <option value="CARD">Card</option>
                    <option value="UPI">UPI</option>
                    <option value="INSURANCE">Insurance</option>
                  </select>

                  <label className="block text-sm font-medium">Discount (₹)</label>
                  <input
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                    className="w-full border rounded-lg p-2"
                    min="0"
                    step="10"
                  />
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between mb-2">
                  <span>Subtotal:</span>
                  <span>₹{selectedDispensing.total_price}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span>Tax (5%):</span>
                  <span>₹{(selectedDispensing.total_price * 0.05).toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between mb-2 text-red-600">
                    <span>Discount:</span>
                    <span>-₹{discount}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t font-bold text-lg">
                  <span>Total:</span>
                  <span>₹{calculateTotal()}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={processBilling}
                  className="flex-1 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600"
                >
                  Process Payment
                </button>
                <button
                  onClick={() => setSelectedDispensing(null)}
                  className="px-4 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">Select a dispensing record to start billing</p>
          )}
        </div>
      </div>

      {/* Billing History */}
      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Billing History</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">Invoice #</th>
                <th className="px-4 py-3 text-left">Patient</th>
                <th className="px-4 py-3 text-left">Amount</th>
                <th className="px-4 py-3 text-left">Payment Method</th>
                <th className="px-4 py-3 text-left">Date</th>
              </tr>
            </thead>
            <tbody>
              {billingRecords.map(record => (
                <tr key={record.id} className="border-t">
                  <td className="px-4 py-3">{record.invoice_number}</td>
                  <td className="px-4 py-3">{record.first_name} {record.last_name}</td>
                  <td className="px-4 py-3">₹{record.total_amount}</td>
                  <td className="px-4 py-3">{record.payment_method}</td>
                  <td className="px-4 py-3">{new Date(record.billed_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Cashier;