import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../api';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Filter,
  X,
  Save,
  Barcode as BarcodeIcon,
  RefreshCw,
  MoreVertical,
  ChevronDown,
  AlertTriangle
} from 'lucide-react';
import JsBarcode from 'jsbarcode';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [categorySearch, setCategorySearch] = useState('');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [isCategoryDeleteModalOpen, setIsCategoryDeleteModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const location = useLocation();
  const barcodeCanvasRef = useRef(null);
  const categoryInputRef = useRef(null);
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    barcode: '',
    category_id: '',
    price: 0,
    cost_price: 0,
    stock: 0,
    low_stock_threshold: 10,
    expiry_date: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const filter = params.get('filter');
    if (filter === 'low-stock' || filter === 'expiring') {
      setStatusFilter(filter);
    } else {
      setStatusFilter('all');
    }
  }, [location.search]);

  useEffect(() => {
    if (isModalOpen && formData.barcode && barcodeCanvasRef.current) {
      try {
        JsBarcode(barcodeCanvasRef.current, formData.barcode, {
          format: "CODE128",
          width: 2,
          height: 50,
          displayValue: true,
          fontSize: 12
        });
      } catch (e) {
        console.error("Barcode generation failed", e);
      }
    }
  }, [formData.barcode, isModalOpen]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const p = await api.getProducts();
      const c = await api.getCategories();
      const safeProducts = Array.isArray(p) ? p : [];
      const safeCategories = Array.isArray(c) ? c : [];

      setProducts(safeProducts);
      setCategories(safeCategories);
      if (!formData.category_id && safeCategories.length > 0) {
        setFormData(prev => ({ ...prev, category_id: safeCategories[0]._id || safeCategories[0].id }));
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateBarcode = () => {
    const randomBarcode = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    setFormData({ ...formData, barcode: randomBarcode });
  };

  const handleOpenModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        ...product,
        category_id: (product.category?._id || product.category_id || (typeof product.category === 'string' ? product.category : '')),
        expiry_date: product.expiry_date ? product.expiry_date.split('T')[0] : ''
      });
      const currentCatId = product.category?._id || product.category_id || (typeof product.category === 'string' ? product.category : '');
      const cat = categories.find(c => (c._id || c.id) === currentCatId);
      setCategorySearch(cat ? cat.name : '');
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        barcode: '',
        category_id: '',
        price: 0,
        cost_price: 0,
        stock: 0,
        low_stock_threshold: 10,
        expiry_date: ''
      });
      setCategorySearch('');
    }
    setIsModalOpen(true);
  };

  // Close custom dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (categoryInputRef.current && !categoryInputRef.current.contains(event.target)) {
        setIsCategoryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDelete = (product) => {
    setProductToDelete(product);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;
    try {
      await api.deleteProduct(productToDelete._id || productToDelete.id);
      setIsDeleteModalOpen(false);
      setProductToDelete(null);
      fetchData();
    } catch (err) {
      alert('Failed to delete product');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.upsertProduct(formData);
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      alert('Failed to save product');
    }
  };

  const handleDeleteCategory = (cat, e) => {
    e.stopPropagation();
    setCategoryToDelete(cat);
    setIsCategoryDeleteModalOpen(true);
  };

  const confirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    try {
      const result = await api.deleteCategory(categoryToDelete.id || categoryToDelete._id);
      if (result.success) {
        const updatedCats = await api.getCategories();
        setCategories(updatedCats);
        if (formData.category_id === (categoryToDelete.id || categoryToDelete._id)) {
           setFormData({ ...formData, category_id: '' });
           setCategorySearch('');
        }
      } else {
        alert(result.message || 'Failed to delete category');
      }
    } catch (err) {
      alert('Failed to delete category');
    } finally {
      setIsCategoryDeleteModalOpen(false);
      setCategoryToDelete(null);
    }
  };

  const handleCreateCategory = async (name) => {
    if (!name.trim()) return;
    try {
      const result = await api.addCategory(name);
      if (result.success) {
        // Refresh categories
        const updatedCats = await api.getCategories();
        setCategories(updatedCats);
        // Select the newly created category
        setFormData(prev => ({ ...prev, category_id: result.id }));
        setCategorySearch(name);
        setIsCategoryDropdownOpen(false);
      } else {
        alert(result.message || 'Failed to create category');
      }
    } catch (err) {
      console.error('Failed to create category:', err);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.barcode && p.barcode.includes(searchTerm));
    const pCategoryId = p.category?._id || p.category_id || (typeof p.category === 'string' ? p.category : '');
    const matchesCategory = selectedCategory === 'all' || pCategoryId === selectedCategory;

    let matchesStatus = true;
    if (statusFilter === 'low-stock') {
      matchesStatus = p.stock <= p.low_stock_threshold;
    } else if (statusFilter === 'expiring') {
      if (!p.expiry_date) {
        matchesStatus = false;
      } else {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(today.getDate() + 30);
        const expiryDate = new Date(p.expiry_date);
        matchesStatus = expiryDate <= thirtyDaysFromNow && expiryDate >= today;
      }
    }

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="products-container">
      <div className="product-page-header">
        <div className="header-left">
          <h1>Inventory Management</h1>
          <p>Manage your stock levels, pricing, and product details.</p>
        </div>
        <button className="primary-add-btn" onClick={() => handleOpenModal()}>
          <Plus size={20} />
          <span>Add New Product</span>
        </button>
      </div>

      <div className="filter-shelf">
        <div className="search-wrapper">
          <Search size={20} color="#94a3b8" />
          <input
            type="text"
            placeholder="Search by name, barcode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <div className="custom-select">
            <Filter size={18} className="select-icon" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">All Categories</option>
              {categories.map(c => (
                <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>
              ))}
            </select>
            <ChevronDown size={18} className="arrow-icon" />
          </div>
        </div>
      </div>

      {statusFilter !== 'all' && (
        <div className="active-filters-bar">
          <span className="filter-badge">
            {statusFilter === 'low-stock' ? 'Low Stock Items' : 'Nearing Expiry'}
            <button onClick={() => setStatusFilter('all')}><X size={14} /></button>
          </span>
        </div>
      )}

      <div className="inventory-view-container glass-effect">
        {loading ? (
          <div className="loader-box">
            <div className="spinner"></div>
            <p>Loading Inventory...</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="desktop-table-view">
              <table className="agro-table">
                <thead>
                  <tr>
                    <th>Product Details</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Stock Level</th>
                    <th>Expiry</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map(p => (
                    <tr key={p._id || p.id}>
                      <td>
                        <div className="item-main-info">
                          <span className="item-name">{p.name}</span>
                          <span className="item-barcode">
                            <BarcodeIcon size={12} />
                            {p.barcode || 'NO BARCODE'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="category-tag">{p.category?.name || p.category_name || 'General'}</span>
                      </td>
                      <td>
                        <div className="price-stack">
                          <span className="sell-price">Rs.{p.price.toLocaleString()}</span>
                          <span className="cost-tag">Cost: Rs.{p.cost_price || 0}</span>
                        </div>
                      </td>
                      <td>
                        <div className="stock-visual">
                          <span className={`stock-count ${p.stock <= p.low_stock_threshold ? 'critical' : ''}`}>
                            {p.stock}
                          </span>
                          <div className="stock-meter">
                            <div
                              className="meter-fill"
                              style={{
                                width: `${Math.min(100, (p.stock / 100) * 100)}%`,
                                backgroundColor: p.stock <= p.low_stock_threshold ? '#ef4444' : '#16a34a'
                              }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="expiry-text">
                          {p.expiry_date ? new Date(p.expiry_date).toLocaleDateString() : 'N/A'}
                        </span>
                      </td>
                      <td>
                        {p.stock <= 0 ? (
                          <div className="status-pill error">Out of Stock</div>
                        ) : p.stock <= p.low_stock_threshold ? (
                          <div className="status-pill warning">Low Stock</div>
                        ) : (
                          <div className="status-pill success">Available</div>
                        )}
                      </td>
                      <td className="actions-cell">
                        <div className="action-buttons">
                          <button className="action-btn edit" onClick={() => handleOpenModal(p)} title="Edit">
                            <Edit2 size={16} />
                          </button>
                          <button className="action-btn delete" onClick={() => handleDelete(p)} title="Delete">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="mobile-card-view">
              {filteredProducts.map(p => (
                <div key={p._id || p.id} className="mobile-product-card">
                  <div className="card-top">
                    <div className="product-meta">
                      <span className="p-title">{p.name}</span>
                      <span className="p-category">{p.category?.name || p.category_name || 'General'}</span>
                    </div>
                    <div className="product-actions">
                      <button onClick={() => handleOpenModal(p)}><Edit2 size={18} /></button>
                      <button onClick={() => handleDelete(p)}><Trash2 size={18} /></button>
                    </div>
                  </div>
                  <div className="card-bottom">
                    <div className="metric-row">
                      <span className="label">Price</span>
                      <span className="value primary">Rs.{p.price.toLocaleString()}</span>
                    </div>
                    <div className="metric-row">
                      <span className="label">Available Stock</span>
                      <span className={`value ${p.stock <= p.low_stock_threshold ? 'critical' : 'success'}`}>
                        {p.stock} Units
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {isDeleteModalOpen && (
        <div className="agro-modal-overlay">
          <div className="agro-modal delete-modal animate-pop">
            <div className="warning-icon-box">
              <AlertTriangle size={32} />
            </div>
            <h3>Delete Product</h3>
            <p>Are you sure you want to delete <strong>{productToDelete?.name}</strong>? This action cannot be undone.</p>
            <div className="delete-actions">
              <button className="agro-btn secondary" onClick={() => setIsDeleteModalOpen(false)}>Cancel</button>
              <button className="agro-btn danger" onClick={confirmDelete}>Delete Permanently</button>
            </div>
          </div>
        </div>
      )}

      {isCategoryDeleteModalOpen && categoryToDelete && (
        <div className="agro-modal-overlay" style={{ zIndex: 4000 }}>
          <div className="agro-modal delete-modal animate-pop">
            <div className="warning-icon-box">
              <AlertTriangle size={32} />
            </div>
            <h3>Delete Category</h3>
            <p>Are you sure you want to delete <strong>"{categoryToDelete.name}"</strong>?<br/>Products in this category will be automatically moved to <strong>"General"</strong>.</p>
            <div className="delete-actions">
              <button className="agro-btn secondary" onClick={() => { setIsCategoryDeleteModalOpen(false); setCategoryToDelete(null); }}>Cancel</button>
              <button className="agro-btn danger" onClick={confirmDeleteCategory}>Delete Category</button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="agro-modal-overlay">
          <div className="agro-modal product-modal">
            <div className="modal-top">
              <div className="modal-title-group">
                <div className="title-icon">
                  {editingProduct ? <Edit2 size={24} /> : <Plus size={24} />}
                </div>
                <div>
                  <h3>{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
                  <p>{editingProduct ? `Modifying ${editingProduct.name}` : 'Fill in the details below'}</p>
                </div>
              </div>
              <button className="close-x" onClick={() => setIsModalOpen(false)}><X size={24} /></button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-section">
                <h4>Basic Information</h4>
                <div className="form-grid">
                  <div className="input-group full">
                    <label>Product Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Organic Fertilizer Premium"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="input-group" ref={categoryInputRef}>
                    <label>Category</label>
                    <div className="combo-box">
                      <input
                        type="text"
                        placeholder="Type to search or select..."
                        value={categorySearch}
                        onChange={(e) => {
                          setCategorySearch(e.target.value);
                          setIsCategoryDropdownOpen(true);
                          // Clear selected ID if typing freely
                          setFormData({ ...formData, category_id: '' });
                        }}
                        onFocus={() => setIsCategoryDropdownOpen(true)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const matches = categories.filter(c => c.name.toLowerCase().includes(categorySearch.toLowerCase()));
                            if (matches.length === 0 && categorySearch.trim()) {
                              handleCreateCategory(categorySearch);
                            }
                          }
                        }}
                      />
                      <ChevronDown size={18} className="combo-icon" onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)} />

                      {isCategoryDropdownOpen && (
                        <div className="combo-dropdown">
                          {categories
                            .filter(c => c.name.toLowerCase().includes(categorySearch.toLowerCase()))
                            .map(c => (
                              <div
                                key={c.id || c._id}
                                className="combo-item"
                                onClick={() => {
                                  setCategorySearch(c.name);
                                  setFormData({ ...formData, category_id: c.id || c._id });
                                  setIsCategoryDropdownOpen(false);
                                }}
                              >
                                <span>{c.name}</span>
                                {c.name.toLowerCase() !== 'general' && (
                                  <button 
                                    className="delete-cat-btn"
                                    onClick={(e) => handleDeleteCategory(c, e)}
                                    title="Delete Category"
                                  >
                                    <X size={14} />
                                  </button>
                                )}
                              </div>
                            ))
                          }
                          {categories.filter(c => c.name.toLowerCase().includes(categorySearch.toLowerCase())).length === 0 && (
                            categorySearch.trim() ? (
                              <div
                                className="combo-empty clickable"
                                onClick={() => handleCreateCategory(categorySearch)}
                              >
                                Press enter to create "{categorySearch}"
                              </div>
                            ) : (
                              <div className="combo-empty">No categories found. Type to create one.</div>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="input-group">
                    <label>Barcode</label>
                    <div className="barcode-input-set">
                      <input
                        type="text"
                        value={formData.barcode}
                        onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                      />
                      <button type="button" onClick={generateBarcode} className="refresh-btn">
                        <RefreshCw size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h4>Pricing & Stock</h4>
                <div className="form-grid">
                  <div className="input-group">
                    <label>Sell Price (Rs.)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div className="input-group">
                    <label>Cost Price (Rs.)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.cost_price}
                      onChange={(e) => setFormData({ ...formData, cost_price: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div className="input-group">
                    <label>Initial Stock</label>
                    <input
                      type="number"
                      required
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="input-group">
                    <label>Low Stock Alert</label>
                    <input
                      type="number"
                      value={formData.low_stock_threshold}
                      onChange={(e) => setFormData({ ...formData, low_stock_threshold: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="input-group">
                    <label>Expiry Date</label>
                    <input
                      type="date"
                      value={formData.expiry_date}
                      onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-bottom-actions">
                <button type="button" className="agro-btn secondary" onClick={() => setIsModalOpen(false)}>Discard</button>
                <button type="submit" className="agro-btn primary">
                  <Save size={18} />
                  <span>{editingProduct ? 'Update Changes' : 'Create Product'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .products-container {
          display: flex;
          flex-direction: column;
          gap: 2rem;
          animation: slideUp 0.6s ease-out;
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .product-page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .header-left h1 {
          font-size: 2.25rem;
          font-weight: 900;
          color: #1b4332;
          letter-spacing: -0.02em;
        }

        .header-left p {
          color: #64748b;
          font-size: 1.125rem;
          margin-top: 0.25rem;
        }

        .primary-add-btn {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: #1b5e20;
          color: white;
          padding: 1rem 1.75rem;
          border-radius: 1.25rem;
          font-weight: 800;
          border: none;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 10px 15px -3px rgba(27, 94, 32, 0.2);
        }

        .primary-add-btn:hover {
          background: #2e7d32;
          transform: translateY(-2px);
          box-shadow: 0 20px 25px -5px rgba(27, 94, 32, 0.3);
        }

        .filter-shelf {
          display: flex;
          justify-content: space-between;
          gap: 2rem;
          margin-bottom: 0.5rem;
        }

        .active-filters-bar {
          display: flex;
          gap: 0.75rem;
          animation: slideDown 0.3s ease-out;
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .filter-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.625rem;
          padding: 0.5rem 1rem;
          background: #fef2f2;
          color: #ef4444;
          border: 1px solid #fee2e2;
          border-radius: 2rem;
          font-size: 0.875rem;
          font-weight: 700;
        }

        .filter-badge button {
          background: none;
          border: none;
          color: #ef4444;
          display: flex;
          cursor: pointer;
          padding: 2px;
          border-radius: 50%;
          transition: background 0.2s;
        }

        .filter-badge button:hover {
          background: #fee2e2;
        }

        .search-wrapper {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 1rem;
          background: white;
          padding: 0.875rem 1.5rem;
          border-radius: 1.25rem;
          border: 1px solid #e2e8f0;
          transition: all 0.2s;
        }

        .search-wrapper:focus-within {
          border-color: #1b5e20;
          box-shadow: 0 0 0 4px rgba(27, 94, 32, 0.05);
          outline: none;
        }

        .search-wrapper input {
          border: none;
          outline: none;
          width: 100%;
          font-size: 1rem;
          font-weight: 500;
        }

        .custom-select {
          position: relative;
          display: flex;
          align-items: center;
          background: white;
          border-radius: 1.25rem;
          border: 1px solid #e2e8f0;
          padding: 0 1.25rem;
          min-width: 220px;
        }

        .custom-select select {
          appearance: none;
          background: transparent;
          border: none;
          padding: 0.875rem 2rem 0.875rem 1rem;
          width: 100%;
          font-weight: 700;
          color: #1b4332;
          cursor: pointer;
          outline: none;
        }

        .select-icon { color: #94a3b8; }
        .arrow-icon { position: absolute; right: 1.25rem; color: #94a3b8; pointer-events: none; }

        .table-wrapper {
          background: white;
          border-radius: 2rem;
          border: 1px solid #f1f5f9;
          overflow: hidden;
          box-shadow: var(--shadow-sm);
        }

        .agro-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .agro-table th {
          background: #fdfdfb;
          padding: 1.5rem;
          font-size: 0.8125rem;
          font-weight: 800;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid #f1f5f9;
        }

        .agro-table td {
          padding: 1.5rem;
          border-bottom: 1px solid #f8fafc;
          vertical-align: middle;
        }

        .agro-table tr:hover { background: #fdfdfb; }

        .item-main-info { display: flex; flex-direction: column; gap: 0.25rem; }
        .item-name { font-weight: 800; color: #1b4332; font-size: 1.125rem; }
        .item-barcode { 
          font-size: 0.75rem; 
          color: #94a3b8; 
          font-weight: 700; 
          display: flex; 
          align-items: center; 
          gap: 0.25rem; 
        }

        .category-tag {
          display: inline-block;
          padding: 0.375rem 1rem;
          background: #ecf3f0;
          color: #1b5e20;
          border-radius: 2rem;
          font-weight: 700;
          font-size: 0.8125rem;
        }

        .sell-price { font-size: 1.125rem; font-weight: 900; color: #1b4332; display: block; }
        .cost-tag { font-size: 0.75rem; color: #94a3b8; font-weight: 600; }

        .stock-visual { display: flex; flex-direction: column; gap: 0.5rem; width: 120px; }
        .stock-count { font-weight: 900; color: #1b4332; }
        .stock-count.critical { color: #ef4444; }
        
        .stock-meter {
          height: 6px;
          background: #f1f5f9;
          border-radius: 3px;
          overflow: hidden;
        }
        .meter-fill { height: 100%; border-radius: 3px; }

        .status-pill {
          display: inline-flex;
          padding: 0.375rem 1rem;
          border-radius: 2rem;
          font-size: 0.75rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.025em;
        }

        .status-pill.success { background: #f0fdf4; color: #16a34a; }
        .status-pill.warning { background: #fffbeb; color: #d97706; }
        .status-pill.error { background: #fef2f2; color: #ef4444; }

        .action-buttons { display: flex; gap: 0.5rem; opacity: 1 !important; }

        .action-btn {
          width: 40px;
          height: 40px;
          border-radius: 0.75rem;
          border: 1px solid #f1f5f9;
          background: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .action-btn.edit:hover { border-color: #fbc02d; color: #fbc02d; background: #fffbeb; }
        .action-btn.delete:hover { border-color: #ef4444; color: #ef4444; background: #fef2f2; }

        /* Modal Redesign */
        .agro-modal-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(27, 43, 30, 0.85); backdrop-filter: blur(10px);
          display: flex; align-items: center; justify-content: center; z-index: 2000;
        }

        .agro-modal {
          background: white; border-radius: 2.5rem; width: 100%; max-width: 750px;
          box-shadow: 0 40px 60px -15px rgba(0,0,0,0.4);
          animation: modalPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.1);
          display: flex; flex-direction: column;
          max-height: 90vh;
        }

        @keyframes modalPop { from { opacity: 0; scale: 0.9; } to { opacity: 1; scale: 1; } }
        .animate-pop { animation: modalPop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.1); }

        .delete-modal { max-width: 400px; padding: 2rem; text-align: center; }
        .warning-icon-box { 
          width: 64px; height: 64px; background: #fef2f2; color: #ef4444; 
          border-radius: 50%; display: flex; align-items: center; justify-content: center; 
          margin: 0 auto 1.5rem; 
        }
        .delete-modal h3 { font-size: 1.5rem; font-weight: 900; color: #1b4332; margin-bottom: 0.75rem; }
        .delete-modal p { color: #64748b; font-size: 1rem; line-height: 1.5; margin-bottom: 2rem; }
        .delete-actions { display: grid; grid-template-columns: 1fr 1.5fr; gap: 1rem; }
        
        .agro-btn.danger {
          background: #ef4444; color: white; display: flex; align-items: center; justify-content: center; gap: 0.5rem;
          padding: 0.875rem; border-radius: 1rem; font-weight: 800; border: none; cursor: pointer; transition: all 0.2s;
        }
        .agro-btn.danger:hover { background: #dc2626; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2); }

        .modal-top {
          padding: 2.5rem; border-bottom: 1px solid #f1f5f9;
          display: flex; justify-content: space-between; align-items: flex-start;
          background: #fdfdfb; border-radius: 2.5rem 2.5rem 0 0;
          flex-shrink: 0;
        }

        .modal-title-group { display: flex; gap: 1.5rem; align-items: center; }
        .title-icon {
          width: 56px; height: 56px; background: #ecf3f0; color: #1b5e20;
          border-radius: 1.25rem; display: flex; align-items: center; justify-content: center;
        }

        .modal-title-group h3 { font-size: 1.5rem; font-weight: 900; color: #1b4332; margin: 0; }
        .modal-title-group p { color: #64748b; margin-top: 0.125rem; }

        .close-x { background: none; border: none; color: #94a3b8; cursor: pointer; transition: color 0.2s; }
        .close-x:hover { color: #ef4444; }

        .modal-form { 
          padding: 2.5rem; 
          display: flex; 
          flex-direction: column; 
          gap: 2.5rem; 
          overflow-y: auto;
        }
        
        .form-section h4 {
          font-size: 0.75rem; font-weight: 800; color: #64748b;
          text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 1.5rem;
          display: flex; align-items: center; gap: 1rem;
        }
        .form-section h4::after { content: ""; flex: 1; height: 1px; background: #f1f5f9; }

        .form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; }
        .input-group.full { grid-column: span 2; }

        .input-group label {
          display: block; font-size: 0.8125rem; font-weight: 800; color: #1b4332;
          margin-bottom: 0.625rem;
        }

        .modal-form input, .modal-form select {
          width: 100%; padding: 1rem 1.25rem; border-radius: 1rem;
          border: 1px solid #e2e8f0; font-size: 1rem; font-weight: 600;
          transition: all 0.2s;
        }

        .combo-box {
          position: relative;
          display: flex;
          align-items: center;
        }

        .combo-icon {
          position: absolute;
          right: 1.25rem;
          color: #94a3b8;
          cursor: pointer;
        }

        .combo-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 1rem;
          margin-top: 0.5rem;
          max-height: 200px;
          overflow-y: auto;
          box-shadow: var(--shadow-lg);
          z-index: 10;
        }

        .combo-item {
          padding: 0.875rem 1.25rem;
          cursor: pointer;
          font-weight: 600;
          color: #1b4332;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .combo-item:hover {
          background: #f8fafc;
          color: #1b5e20;
        }

        .delete-cat-btn {
          background: none;
          border: none;
          color: #cbd5e1;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
          border-radius: 4px;
        }
        
        .delete-cat-btn:hover {
          color: #ef4444;
          background: #fee2e2;
        }

        .combo-empty {
          padding: 1rem;
          color: #94a3b8;
          font-style: italic;
          font-size: 0.875rem;
          text-align: center;
        }

        .combo-empty.clickable {
          cursor: pointer;
          color: #1b5e20;
          font-weight: 700;
          background: #f0fdf4;
          font-style: normal;
        }

        .combo-empty.clickable:hover {
          background: #dcfce7;
        }

        .barcode-input-set { display: flex; gap: 0.75rem; }
        .refresh-btn {
          padding: 0 1rem; background: #fdfdfb; border: 1px solid #e2e8f0;
          border-radius: 0.75rem; cursor: pointer; color: #1b4332; transition: all 0.2s;
        }
        .refresh-btn:hover { background: #1b5e20; color: white; border-color: #1b5e20; }

        .modal-bottom-actions {
          padding-top: 2rem; border-top: 1px solid #f1f5f9;
          display: flex; justify-content: flex-end; gap: 1rem;
        }

        .agro-btn {
          padding: 1rem 2rem; border-radius: 1.25rem; font-weight: 800; cursor: pointer;
          transition: all 0.2s; border: none; display: flex; align-items: center; gap: 0.75rem;
        }

        .agro-btn.secondary { background: #f8fafc; color: #64748b; }
        .agro-btn.secondary:hover { background: #f1f5f9; color: #1b4332; }

        .agro-btn.primary { background: #1b4332; color: white; }
        .agro-btn.primary:hover { background: #1b5e20; transform: translateY(-2px); }

        .loader-box { padding: 5rem; text-align: center; color: #94a3b8; }
        .spinner {
          width: 40px; height: 40px; border: 4px solid #f1f5f9; border-top-color: #1b5e20;
          border-radius: 50%; margin: 0 auto 1.5rem; animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Desktop Actions Visibility */
        .action-buttons { 
          display: flex; 
          gap: 0.5rem; 
          opacity: 1 !important; 
        }

        .action-btn {
          width: 40px;
          height: 40px;
          border-radius: 0.75rem;
          border: 1px solid #f1f5f9;
          background: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .action-btn.edit:hover { border-color: #fbc02d; color: #fbc02d; background: #fffbeb; }
        .action-btn.delete:hover { border-color: #ef4444; color: #ef4444; background: #fef2f2; }

        /* Responsive Logic */
        .desktop-table-view { display: block; }
        .mobile-card-view { display: none; }

        @media (max-width: 1024px) {
          .table-wrapper {
            overflow-x: auto;
          }
          .agro-table {
            min-width: 800px;
          }
        }

        @media (max-width: 768px) {
          .desktop-table-view { display: none; }
          .mobile-card-view { 
            display: flex; 
            flex-direction: column; 
            gap: 1.25rem;
          }

          .product-page-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1.5rem;
          }
          
          .filter-shelf {
            flex-direction: column;
            gap: 1rem;
          }
          
          .custom-select {
            width: 100%;
          }
          
          .form-grid {
            grid-template-columns: 1fr;
          }
          
          .input-group.full {
            grid-column: span 1;
          }

          .mobile-product-card {
            background: white;
            border-radius: 1.5rem;
            padding: 1.5rem;
            border: 1px solid #f1f5f9;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.04);
            display: flex;
            flex-direction: column;
            gap: 1.25rem;
          }

          .mobile-product-card .card-top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }

          .product-meta { display: flex; flex-direction: column; gap: 0.25rem; }
          .p-title { font-size: 1.125rem; font-weight: 800; color: #1b4332; }
          .p-category { 
            font-size: 0.75rem; 
            color: #1b5e20; 
            font-weight: 700; 
            text-transform: uppercase;
            letter-spacing: 0.025em;
            background: #ecf3f0;
            padding: 0.25rem 0.75rem;
            border-radius: 2rem;
            width: fit-content;
          }

          .product-actions { display: flex; gap: 0.75rem; }
          .product-actions button {
            width: 40px;
            height: 40px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 0.875rem;
            color: #64748b;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s;
          }

          .card-bottom { 
            display: flex; 
            flex-direction: column; 
            gap: 0.875rem;
            padding-top: 1.25rem;
            border-top: 1px solid #f8fafc;
          }

          .metric-row { display: flex; justify-content: space-between; align-items: center; }
          .metric-row .label { font-size: 0.875rem; color: #64748b; font-weight: 600; }
          .metric-row .value { font-weight: 800; font-size: 1rem; color: #1b4332; }
          .metric-row .value.primary { color: #1b5e20; font-size: 1.125rem; font-weight: 900; }
          .metric-row .value.success { color: #16a34a; }
          .metric-row .value.critical { color: #ef4444; }
        }
      `}</style>
    </div>
  );
};

export default Products;
