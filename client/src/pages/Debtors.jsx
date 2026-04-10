import React, { useState, useEffect } from 'react';
import api from '../api';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Save,
  UserPlus,
  Phone,
  Mail,
  User as UserIcon,
  Banknote,
  CheckCircle2
} from 'lucide-react';

const Debtors = ({ user }) => {
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [selectedDebtor, setSelectedDebtor] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [loading, setLoading] = useState(true);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    total_debt: 0,
    promise_date: ''
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const data = await api.getCustomers();
      setCustomers(data || []);
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (customer = null) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        name: customer.name,
        phone: customer.phone || '',
        email: customer.email || '',
        total_debt: customer.total_debt || 0,
        promise_date: customer.promise_date ? customer.promise_date.split('T')[0] : ''
      });
    } else {
      setEditingCustomer(null);
      setFormData({
        name: '',
        phone: '',
        email: '',
        total_debt: 0,
        promise_date: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleDelete = (customer) => {
    setCustomerToDelete(customer);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!customerToDelete) return;
    try {
      await api.deleteCustomer(customerToDelete._id || customerToDelete.id);
      setIsDeleteModalOpen(false);
      setCustomerToDelete(null);
      fetchCustomers();
    } catch (err) {
      alert('Failed to delete customer');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCustomer) {
        await api.updateCustomer(editingCustomer._id || editingCustomer.id, formData);
      } else {
        await api.addCustomer(formData);
      }
      setIsModalOpen(false);
      fetchCustomers();
    } catch (err) {
      alert('Failed to save customer');
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDebtor || !paymentAmount) return;
    try {
      const res = await api.processCustomerPayment(
        selectedDebtor._id || selectedDebtor.id,
        parseFloat(paymentAmount),
        user?._id || user?.id
      );
      if (res.success) {
        setIsPaymentModalOpen(false);
        setPaymentAmount('');
        fetchCustomers();
      } else {
        alert('Payment failed: ' + res.message);
      }
    } catch (err) {
      alert('Failed to process payment');
    }
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.phone && c.phone.includes(searchTerm))
  );

  return (
    <div className="debtors-container">
      <div className="debtors-header">
        <div className="header-left">
          <h1>Debtors Management</h1>
          <p>Register and manage customers authorized for credit sales.</p>
        </div>
        <button className="primary-add-btn" onClick={() => handleOpenModal()}>
          <UserPlus size={20} />
          <span>Add New Debtor</span>
        </button>
      </div>

      <div className="filter-shelf">
        <div className="search-wrapper">
          <Search size={20} color="#94a3b8" />
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="inventory-view-container glass-effect">
        {loading ? (
          <div className="loader-box">
            <div className="spinner"></div>
            <p>Loading Debtors...</p>
          </div>
        ) : (
          <div className="table-responsive-wrapper">
            <div className="desktop-table-view">
              <table className="agro-table">
                <thead>
                  <tr>
                    <th>Customer Details</th>
                    <th>Phone Number</th>
                    <th>Email Address</th>
                    <th>Current Debt</th>
                    <th>Registration Date</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                        No debtors found. Add your first credit customer to get started.
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map(c => (
                      <tr key={c._id || c.id}>
                        <td>
                          <div className="item-main-info">
                            <span className="item-name">{c.name}</span>
                            <span className="item-barcode">ID: {(c._id || c.id).slice(-6).toUpperCase()}</span>
                          </div>
                        </td>
                        <td>
                          <div className="contact-info">
                            <Phone size={14} color="#1b5e20" />
                            <span>{c.phone || 'No phone'}</span>
                          </div>
                        </td>
                        <td>
                          <div className="contact-info">
                            <Mail size={14} color="#1b5e20" />
                            <span>{c.email || 'No email'}</span>
                          </div>
                        </td>
                        <td>
                          <div className={`debt-badge ${Math.max(0, c.total_debt) > 0 ? 'active' : ''}`}>
                            Rs.{Math.max(0, c.total_debt || 0).toLocaleString()}
                          </div>
                        </td>
                        <td>
                          <span className="date-tag">
                            {new Date(c.created_at).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="actions-cell">
                          <div className="action-buttons">
                            <button
                              className="action-btn pay"
                              onClick={() => { setSelectedDebtor(c); setIsPaymentModalOpen(true); }}
                              title="Log Payment"
                            >
                              <Banknote size={16} />
                            </button>
                            <button className="action-btn edit" onClick={() => handleOpenModal(c)} title="Edit">
                              <Edit2 size={16} />
                            </button>
                            <button className="action-btn delete" onClick={() => handleDelete(c)} title="Delete">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="agro-modal-overlay">
          <div className="agro-modal debtor-modal animate-pop">
            <div className="modal-top">
              <div className="modal-title-group">
                <div className="title-icon">
                  <UserIcon size={24} />
                </div>
                <div>
                  <h3>{editingCustomer ? 'Edit Debtor' : 'Register New Debtor'}</h3>
                  <p>{editingCustomer ? `Modifying ${editingCustomer.name}` : 'Allow a new customer to buy on credit'}</p>
                </div>
              </div>
              <button className="close-x" onClick={() => setIsModalOpen(false)}><X size={24} /></button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-section">
                <div className="form-grid">
                  <div className="input-group full">
                    <label>Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. John Doe"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="input-group">
                    <label>Phone Number</label>
                    <input
                      type="text"
                      placeholder="e.g. +94 77 123 4567"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div className="input-group">
                    <label>Email Address</label>
                    <input
                      type="email"
                      placeholder="john@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div className="input-group full">
                    <label>Initial Debt Amount (Rs.)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.total_debt}
                      onChange={(e) => setFormData({ ...formData, total_debt: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="input-group full">
                    <label>Promise Payment Date</label>
                    <input
                      type="date"
                      value={formData.promise_date}
                      onChange={(e) => setFormData({ ...formData, promise_date: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-bottom-actions">
                <button type="button" className="agro-btn secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="agro-btn primary">
                  <Save size={18} />
                  <span>{editingCustomer ? 'Update Debtor' : 'Register Debtor'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {isPaymentModalOpen && (
        <div className="agro-modal-overlay">
          <div className="agro-modal payment-modal animate-pop">
            <div className="modal-top">
              <div className="modal-title-group">
                <div className="title-icon">
                  <Banknote size={24} />
                </div>
                <div>
                  <h3>Manage Debt</h3>
                  <p>Settling balance for <strong>{selectedDebtor?.name}</strong></p>
                </div>
              </div>
              <button className="close-x" onClick={() => setIsPaymentModalOpen(false)}><X size={24} /></button>
            </div>

            <form onSubmit={handlePaymentSubmit} className="modal-form">
              <div className="debt-summary-box">
                <span className="summary-label">Available Debt</span>
                <span className="summary-value">Rs.{Math.max(0, selectedDebtor?.total_debt || 0).toLocaleString()}</span>
              </div>

              <div className="input-group">
                <label>Amount to Deduct (Rs.)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="Enter payment amount..."
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="modal-bottom-actions">
                <button type="button" className="agro-btn secondary" onClick={() => setIsPaymentModalOpen(false)}>Cancel</button>
                <button type="submit" className="agro-btn primary">
                  <CheckCircle2 size={18} />
                  <span>Log Payment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="agro-modal-overlay">
          <div className="agro-modal delete-modal animate-pop">
            <div className="warning-icon-box">
              <Trash2 size={32} />
            </div>
            <h3>Remove Debtor?</h3>
            <p>Are you sure you want to remove <strong>{customerToDelete?.name}</strong>? This customer will no longer be able to perform credit sales.</p>
            <div className="delete-actions">
              <button className="agro-btn secondary" onClick={() => setIsDeleteModalOpen(false)}>Cancel</button>
              <button className="agro-btn danger" onClick={confirmDelete}>Remove Customer</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .debtors-container {
          display: flex;
          flex-direction: column;
          gap: 2rem;
          animation: slideUp 0.6s ease-out;
        }

        .debtors-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .header-left h1 {
          font-size: 2.25rem;
          font-weight: 900;
          color: #1b4332;
        }

        .header-left p { color: #64748b; font-size: 1.125rem; }

        .debt-badge { font-weight: 800; font-size: 1rem; color: #94a3b8; }
        .debt-badge.active { color: #ef4444; }

        .contact-info { display: flex; align-items: center; gap: 0.5rem; color: #1b4332; font-weight: 600; }
        .date-tag { font-size: 0.875rem; color: #64748b; font-weight: 700; background: #f8fafc; padding: 0.25rem 0.75rem; border-radius: 1rem; }

        .search-wrapper {
          flex: 1; display: flex; align-items: center; gap: 1rem;
          background: white; padding: 0.875rem 1.5rem; border-radius: 1.25rem; border: 1px solid #e2e8f0;
        }
        .search-wrapper input { border: none; outline: none; width: 100%; font-size: 1rem; font-weight: 500; }

        .inventory-view-container { background: white; border-radius: 2rem; border: 1px solid #f1f5f9; overflow: hidden; }
        .agro-table { width: 100%; border-collapse: collapse; text-align: left; }
        .agro-table th { background: #fdfdfb; padding: 1.5rem; font-size: 0.8125rem; font-weight: 800; color: #64748b; text-transform: uppercase; border-bottom: 1px solid #f1f5f9; }
        .agro-table td { padding: 1.5rem; border-bottom: 1px solid #f8fafc; }
        .agro-table tr:hover { background: #fdfdfb; }

        .item-main-info { display: flex; flex-direction: column; }
        .item-name { font-weight: 800; color: #1b4332; font-size: 1.125rem; }
        .item-barcode { font-size: 0.75rem; color: #94a3b8; font-weight: 700; }

        .action-buttons { display: flex; gap: 0.5rem; }
        .action-btn { width: 40px; height: 40px; border-radius: 0.75rem; border: 1px solid #f1f5f9; background: white; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .action-btn.pay:hover { border-color: #1b5e20; color: #1b5e20; background: #ecf3f0; }
        .action-btn.edit:hover { border-color: #fbc02d; color: #fbc02d; background: #fffbeb; }
        .action-btn.delete:hover { border-color: #ef4444; color: #ef4444; background: #fef2f2; }

        .primary-add-btn {
          display: flex; align-items: center; gap: 0.75rem; background: #1b5e20; color: white;
          padding: 1rem 1.75rem; border-radius: 1.25rem; font-weight: 800; border: none; cursor: pointer;
          transition: all 0.3s; box-shadow: 0 10px 15px -3px rgba(27, 94, 32, 0.2);
        }
        .primary-add-btn:hover { background: #2e7d32; transform: translateY(-2px); }

        .agro-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(27, 43, 30, 0.8); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 2000; }
        .agro-modal { background: white; border-radius: 2.5rem; width: 100%; max-width: 600px; padding: 0; box-shadow: 0 40px 60px -15px rgba(0,0,0,0.3); }
        .modal-top { padding: 2.5rem; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
        .modal-title-group { display: flex; gap: 1.5rem; align-items: center; }
        .title-icon { width: 48px; height: 48px; background: #ecf3f0; color: #1b5e20; border-radius: 1rem; display: flex; align-items: center; justify-content: center; }
        .modal-title-group h3 { font-size: 1.5rem; font-weight: 900; color: #1b4332; margin: 0; }
        .modal-title-group p { color: #64748b; font-size: 0.95rem; }
        .close-x { background: none; border: none; color: #94a3b8; cursor: pointer; }
        .modal-form { padding: 2.5rem; display: flex; flex-direction: column; gap: 2rem; }

        .debt-summary-box { 
          background: #fdfdfb; border: 1px dashed #e2e8f0; border-radius: 1.25rem; 
          padding: 1.5rem; display: flex; justify-content: space-between; align-items: center;
        }
        .summary-label { font-weight: 700; color: #64748b; }
        .summary-value { font-size: 1.5rem; font-weight: 900; color: #ef4444; }

        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
        .input-group.full { grid-column: span 2; }
        .input-group label { display: block; font-size: 0.8125rem; font-weight: 800; color: #1b4332; margin-bottom: 0.5rem; }
        .input-group input { width: 100%; padding: 0.875rem 1.25rem; border-radius: 1rem; border: 1px solid #e2e8f0; font-size: 1rem; font-weight: 600; }

        .modal-bottom-actions { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1rem; }
        .agro-btn { padding: 0.875rem 1.75rem; border-radius: 1rem; font-weight: 800; cursor: pointer; border: none; display: flex; align-items: center; gap: 0.75rem; transition: all 0.2s; }
        .agro-btn.secondary { background: #f8fafc; color: #64748b; }
        .agro-btn.primary { background: #1b4332; color: white; }
        .agro-btn.primary:hover { background: #1b5e20; transform: translateY(-2px); }
        .agro-btn.danger { background: #ef4444; color: white; }

        .delete-modal { max-width: 400px; text-align: center; padding: 2.5rem; }
        .warning-icon-box { width: 64px; height: 64px; background: #fef2f2; color: #ef4444; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; }
        .delete-actions { display: grid; grid-template-columns: 1fr 1.5fr; gap: 1rem; margin-top: 1.5rem; }

        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes modalPop { from { opacity: 0; scale: 0.9; } to { opacity: 1; scale: 1; } }
        .animate-pop { animation: modalPop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.1) forwards; }

        @media (max-width: 768px) {
          .debtors-header { flex-direction: column; align-items: flex-start; gap: 1.5rem; }
          .header-left h1 { font-size: 1.75rem; }
          .header-left p { font-size: 1rem; }
          .primary-add-btn { width: 100%; justify-content: center; }
          .search-wrapper { padding: 0.75rem 1rem; }
          .table-responsive-wrapper { overflow-x: auto; -webkit-overflow-scrolling: touch; }
          .agro-table { min-width: 800px; }
          .inventory-view-container { border-radius: 1.25rem; }
          .agro-table th, .agro-table td { padding: 1rem; }
          .modal-form { padding: 1.5rem; gap: 1.5rem; }
          .modal-top { padding: 1.5rem; }
          .form-grid { grid-template-columns: 1fr; }
          .input-group.full { grid-column: span 1; }
          .modal-bottom-actions { flex-direction: column; }
          .modal-bottom-actions button { width: 100%; }
        }
      `}</style>
    </div>
  );
};

export default Debtors;
