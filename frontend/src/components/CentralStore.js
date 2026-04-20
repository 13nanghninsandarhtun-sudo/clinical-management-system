import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FaWarehouse, FaTruck, FaBoxes, FaChartLine } from 'react-icons/fa';

function CentralStore() {
  const [inventory, setInventory] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [showPOForm, setShowPOForm] = useState(false);
  const [medicines, setMedicines] = useState([]);
  const [poItems, setPoItems] = useState([]);
  const [poData, setPoData] = useState({
    supplier_name: '',
    expected_delivery: ''
  });

  useEffect(() => {
    fetchInventory();
    fetchMedicines();
    fetchPurchaseOrders();
  }, []);

  const fetchInventory = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/central-store/inventory`);
      setInventory(response.data);
    } catch (error) {
      toast.error('Failed to fetch inventory');
    }
  };

  const fetchMedicines = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/medicines`);
      setMedicines(response.data);
    } catch (error) {
      toast.error('Failed to fetch medicines');
    }
  };

  const fetchPurchaseOrders = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/central-store/purchase-orders`);
      setPurchaseOrders(response.data);
    } catch (error) {
      console.error('Failed to fetch purchase orders');
    }
  };

  const addPOItem = () => {
    setPoItems([...poItems, { medicine_id: '', quantity: 1, unit_price: 0 }]);
  };

  const updatePOItem = (index, field, value) => {
    const updated = [...poItems];
    updated[index][field] = value;
    if (field === 'medicine_id') {
      const medicine = medicines.find(m => m.id === parseInt(value));
      if (medicine) {
        updated[index].unit_price = medicine.unit_price || 0;
      }
    }
    setPoItems(updated);
  };

  const removePOItem = (index) => {
    setPoItems(poItems.filter((_, i) => i !== index));
  };

  const createPurchaseOrder = async (e) => {
    e.preventDefault();
    if (poItems.length === 0) {
      toast.error('Add at least one item');
      return;
    }

    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/api/central-store/purchase-order`, {
        supplier_name: poData.supplier_name,
        expected_delivery: poData.expected_delivery,
        items: poItems
      });
      toast.success('Purchase order created successfully');
      setShowPOForm(false);
      setPoItems([]);
      setPoData({ supplier_name: '', expected_delivery: '' });
      fetchPurchaseOrders();
    } catch (error) {
      toast.error('Failed to create purchase order');
    }
  };

  const receiveStock = async (poId) => {
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/api/central-store/receive-stock`, {
        po_id: poId,
        items: poItems
      });
      toast.success('Stock received successfully');
      fetchInventory();
    } catch (error) {
      toast.error('Failed to receive stock');
    }
  };

  const lowStockItems = inventory.filter(item => item.quantity < (item.reorder_level || 50));

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Central Store Management</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Items in Stock</p>
              <p className="text-3xl font-bold">{inventory.reduce((sum, i) => sum + i.quantity, 0)}</p>
            </div>
            <FaBoxes className="text-4xl text-purple-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Low Stock Items</p>
              <p className="text-3xl font-bold text-red-500">{lowStockItems.length}</p>
            </div>
            <FaChartLine className="text-4xl text-red-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Pending Orders</p>
              <p className="text-3xl font-bold">{purchaseOrders.filter(po => po.status === 'PENDING').length}</p>
            </div>
            <FaTruck className="text-4xl text-blue-500" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inventory Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <FaWarehouse /> Store Inventory
            </h2>
            <button
              onClick={() => setShowPOForm(true)}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <FaTruck /> Create PO
            </button>
          </div>

          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left">Medicine</th>
                  <th className="px-3 py-2 text-left">Batch</th>
                  <th className="px-3 py-2 text-left">Expiry</th>
                  <th className="px-3 py-2 text-left">Quantity</th>
                  <th className="px-3 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map(item => (
                  <tr key={item.id} className="border-t">
                    <td className="px-3 py-2">{item.name}</td>
                    <td className="px-3 py-2">{item.batch_number}</td>
                    <td className="px-3 py-2">{new Date(item.expiry_date).toLocaleDateString()}</td>
                    <td className="px-3 py-2">
                      <span className={item.quantity < (item.reorder_level || 50) ? 'text-red-500 font-bold' : ''}>
                        {item.quantity}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {item.quantity < (item.reorder_level || 50) ? (
                        <span className="text-red-500 text-xs">Low Stock</span>
                      ) : (
                        <span className="text-green-500 text-xs">In Stock</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Purchase Orders Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Purchase Orders</h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {purchaseOrders.map(po => (
              <div key={po.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold">PO #{po.po_number}</p>
                    <p className="text-sm text-gray-600">Supplier: {po.supplier_name}</p>
                    <p className="text-sm">Status: 
                      <span className={`ml-1 px-2 py-0.5 rounded text-xs ${
                        po.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {po.status}
                      </span>
                    </p>
                    <p className="text-sm">Amount: ₹{po.total_amount}</p>
                  </div>
                  {po.status === 'PENDING' && (
                    <button
                      onClick={() => receiveStock(po.id)}
                      className="bg-green-500 text-white px-3 py-1 rounded text-sm"
                    >
                      Receive Stock
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Purchase Order Modal */}
      {showPOForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Create Purchase Order</h2>
            <form onSubmit={createPurchaseOrder}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <input
                  type="text"
                  placeholder="Supplier Name"
                  value={poData.supplier_name}
                  onChange={(e) => setPoData({ ...poData, supplier_name: e.target.value })}
                  className="border rounded-lg p-2"
                  required
                />
                <input
                  type="date"
                  placeholder="Expected Delivery"
                  value={poData.expected_delivery}
                  onChange={(e) => setPoData({ ...poData, expected_delivery: e.target.value })}
                  className="border rounded-lg p-2"
                  required
                />
              </div>

              <h3 className="font-bold mb-2">Order Items</h3>
              {poItems.map((item, index) => (
                <div key={index} className="grid grid-cols-4 gap-2 mb-2">
                  <select
                    value={item.medicine_id}
                    onChange={(e) => updatePOItem(index, 'medicine_id', e.target.value)}
                    className="col-span-2 border rounded-lg p-2"
                    required
                  >
                    <option value="">Select Medicine</option>
                    {medicines.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => updatePOItem(index, 'quantity', parseInt(e.target.value))}
                    className="border rounded-lg p-2"
                    required
                  />
                  <div className="flex gap-1">
                    <input
                      type="number"
                      placeholder="Unit Price"
                      value={item.unit_price}
                      onChange={(e) => updatePOItem(index, 'unit_price', parseFloat(e.target.value))}
                      className="flex-1 border rounded-lg p-2"
                      step="0.01"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => removePOItem(index)}
                      className="bg-red-500 text-white px-2 rounded"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addPOItem}
                className="text-blue-500 text-sm mb-4"
              >
                + Add Item
              </button>

              <div className="flex gap-3 mt-4">
                <button type="submit" className="flex-1 bg-green-500 text-white py-2 rounded-lg">
                  Create Order
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPOForm(false);
                    setPoItems([]);
                  }}
                  className="px-4 bg-gray-500 text-white rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CentralStore;