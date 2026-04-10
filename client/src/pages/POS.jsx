import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  Banknote,
  MoreHorizontal,
  X,
  CheckCircle2,
  ChevronRight,
  Package
} from 'lucide-react';

const POS = ({ user }) => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [cashReceived, setCashReceived] = useState(0);
  const [cashError, setCashError] = useState('');
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [lastSaleData, setLastSaleData] = useState(null);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const barcodeRef = useRef('');

  useEffect(() => {
    fetchProducts();

    // Barcode scanner listener (simulates keyboard input)
    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        if (barcodeRef.current.length > 2) {
          handleBarcodeScan(barcodeRef.current);
          barcodeRef.current = '';
        }
      } else if (e.key.length === 1) {
        barcodeRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fetchProducts = async () => {
    try {
      const [p, c, cust] = await Promise.all([
        api.getProducts(),
        api.getCategories(),
        api.getCustomers()
      ]);
      setProducts(Array.isArray(p) ? p : []);
      setCategories(Array.isArray(c) ? c : []);
      setCustomers(Array.isArray(cust) ? cust : []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleBarcodeScan = async (barcode) => {
    try {
      const product = await api.getProductByBarcode(barcode);
      if (product) {
        addToCart(product);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const addToCart = (product) => {
    if (product.stock <= 0) {
      alert('Product out of stock!');
      return;
    }

    setCart(prevCart => {
      const productId = product._id || product.id;
      const existing = prevCart.find(item => (item._id || item.id) === productId);
      if (existing) {
        if (existing.quantity >= product.stock) {
          alert('Cannot add more than available stock!');
          return prevCart;
        }
        return prevCart.map(item =>
          (item._id || item.id) === productId ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id, delta) => {
    setCart(prevCart => prevCart.map(item => {
      if ((item._id || item.id) === id) {
        const newQty = item.quantity + delta;
        if (newQty <= 0) return item;
        if (newQty > item.stock) {
          alert('Insufficient stock!');
          return item;
        }
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (id) => {
    setCart(prevCart => prevCart.filter(item => (item._id || item.id) !== id));
  };

  const calculateSubtotal = () => cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const calculateTotal = () => calculateSubtotal() - discount;

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    if (paymentMethod === 'cash') {
      if (!cashReceived || cashReceived < 0) {
        setCashError('Please enter the given amount!');
        return;
      }
      if (cashReceived < calculateTotal()) {
        setCashError('Amount is less than total payable!');
        return;
      }
    }

    setCashError('');

    const saleData = {
      items: cart,
      total_amount: calculateTotal(),
      discount: discount,
      tax: 0,
      payment_method: paymentMethod,
      cashier_id: user._id || user.id,
      customer_id: selectedCustomer ? (selectedCustomer._id || selectedCustomer.id) : null
    };

    try {
      const result = await api.processSale(saleData);
      if (result.success) {
        const finishedSale = { ...saleData, saleId: result.saleId, cashier_name: user.full_name };
        setLastSaleData(finishedSale);

        setCart([]);
        setDiscount(0);
        fetchProducts();

        setIsCheckoutOpen(false);
        setIsMobileCartOpen(false);
        setCashReceived(0);
        setIsReceiptModalOpen(true);
      } else {
        alert('Checkout failed: ' + result.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.barcode && p.barcode.includes(searchTerm));
    const pCategoryId = p.category?._id || p.category_id || (typeof p.category === 'string' ? p.category : '');
    const matchesCategory = !selectedCategory || pCategoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="pos-wrapper">
      <div className="pos-main">
        <header className="pos-header">
          <div className="pos-search-bar">
            <Search size={22} className="search-icon" />
            <input
              type="text"
              placeholder="Search or scan barcode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="category-chips no-scrollbar">
            <button
              className={`chip ${!selectedCategory ? 'active' : ''}`}
              onClick={() => setSelectedCategory(null)}
            >
              All Items
            </button>
            {categories.map(cat => (
              <button
                key={cat._id || cat.id}
                className={`chip ${selectedCategory === (cat._id || cat.id) ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat._id || cat.id)}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </header>

        <div className="product-list-area">
          <div className="agro-list-view">
            {filteredProducts.map(p => (
              <div
                key={p._id || p.id}
                className={`agro-list-item ${p.stock <= 0 ? 'out-of-stock' : ''}`}
                onClick={() => p.stock > 0 && addToCart(p)}
              >
                <div className="item-name-group">
                  <span className="item-name">{p.name}</span>
                  <span className="item-category-minimal">{(p.category?.name || p.category_name || 'General')}</span>
                </div>

                <div className="item-stock-group">
                  <span className={`stock-indicator ${p.stock < 10 ? 'low' : ''}`}></span>
                  <span className="stock-text">{p.stock} Units <br /> Available</span>
                </div>

                <div className="item-price-group">
                  <span className="item-price">Rs.{p.price.toFixed(2)}</span>
                  <div className="add-quick-btn">
                    <Plus size={18} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating Cart Button for Mobile */}
      {cart.length > 0 && !isMobileCartOpen && (
        <button className="mobile-cart-fab" onClick={() => setIsMobileCartOpen(true)}>
          <div className="fab-icon">
            <ShoppingCart size={24} />
            <span className="fab-badge">{cart.length}</span>
          </div>
          <div className="fab-info">
            <span className="fab-label">View Order</span>
            <span className="fab-total">Rs.{calculateTotal().toFixed(2)}</span>
          </div>
          <ChevronRight size={20} />
        </button>
      )}

      {/* Sidebar (Responsive Overlay for Mobile) */}
      <aside className={`order-sidebar ${isMobileCartOpen ? 'mobile-open' : ''}`}>
        <div className="order-header">
          <div className="order-title">
            <ShoppingCart size={24} />
            <h2>Current Order</h2>
          </div>
          <div className="order-header-actions">
            <button className="clear-order" onClick={() => setCart([])} title="Clear All">
              <Trash2 size={20} />
            </button>
            <button className="mobile-close-cart" onClick={() => setIsMobileCartOpen(false)}>
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="order-items-list">
          {cart.length === 0 ? (
            <div className="no-order">
              <ShoppingCart size={48} className="fade-icon" />
              <h3>Your cart is empty</h3>
              <p>Items you select will appear here</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item._id || item.id} className="order-item-card">
                <div className="item-details">
                  <span className="item-name">{item.name}</span>
                  <span className="item-price-each">Rs.{item.price.toFixed(2)}</span>
                </div>
                <div className="item-actions">
                  <div className="qty-picker">
                    <button onClick={() => updateQuantity(item._id || item.id, -1)}><Minus size={14} /></button>
                    <span className="qty-val">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item._id || item.id, 1)}><Plus size={14} /></button>
                  </div>
                  <span className="item-total-price">Rs.{(item.price * item.quantity).toFixed(2)}</span>
                  <button className="remove-btn" onClick={() => removeFromCart(item._id || item.id)}><X size={14} /></button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="order-checkout-section">
          <div className="pricing-rows">
            <div className="price-row">
              <span>Subtotal</span>
              <span>Rs.{calculateSubtotal().toFixed(2)}</span>
            </div>
            <div className="price-row">
              <span>Discount</span>
              <input
                type="number"
                className="inline-discount"
                value={discount}
                onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
              />
            </div>
            <div className="grand-total">
              <span className="total-label">Payable</span>
              <span className="total-value">Rs.{calculateTotal().toFixed(2)}</span>
            </div>
          </div>

          <button
            className="process-btn"
            disabled={cart.length === 0}
            onClick={() => setIsCheckoutOpen(true)}
          >
            <span>Proceed to Payment</span>
            <CheckCircle2 size={22} />
          </button>
        </div>
      </aside>

      {/* Modals remain mostly same but ensured responsiveness */}
      {isCheckoutOpen && (
        <div className="agro-modal-overlay">
          <div className="agro-modal checkout-view">
            <div className="modal-header">
              <h3>Secure Checkout</h3>
              <button className="close-modal" onClick={() => {
                setIsCheckoutOpen(false);
                setCashReceived(0);
                setSelectedCustomer(null);
                setCustomerSearch('');
              }}><X size={24} /></button>
            </div>
            <div className="payable-display">
              <span className="payable-label">Total to Pay</span>
              <h1 className="payable-value">Rs.{calculateTotal().toFixed(2)}</h1>
            </div>
            <div className="method-selection">
              <button className={`method-chip ${paymentMethod === 'cash' ? 'active' : ''}`} onClick={() => setPaymentMethod('cash')}>
                <Banknote size={24} /> <span>Cash</span>
              </button>
              <button className={`method-chip ${paymentMethod === 'credit' ? 'active' : ''}`} onClick={() => setPaymentMethod('credit')}>
                <CreditCard size={24} /> <span>Credit</span>
              </button>
            </div>

            {paymentMethod === 'cash' && (
              <div className="cash-calculator-area">
                <div className="input-group">
                  <label className="input-label">Cash Received (Rs.)</label>
                  <input
                    type="number"
                    placeholder="Enter amount..."
                    className={`cash-input ${cashError ? 'error-border' : ''}`}
                    value={cashReceived || ''}
                    onChange={(e) => {
                      setCashReceived(parseFloat(e.target.value) || 0);
                      setCashError('');
                    }}
                    onFocus={(e) => e.target.select()}
                  />
                  {cashError && <span className="cash-error-msg">{cashError}</span>}
                </div>
                <div className="balance-box">
                  <span className="balance-label">Change to Return</span>
                  <span className={`balance-value ${cashReceived - calculateTotal() >= 0 ? 'success' : 'pending'}`}>
                    Rs.{Math.max(0, cashReceived - calculateTotal()).toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {paymentMethod === 'credit' && (
              <div className="customer-selection-area">
                <label className="input-label">Select Customer (Debtor)</label>
                <div className="customer-search-box">
                  <Search size={18} className="search-box-icon" />
                  <input
                    type="text"
                    placeholder="Search by name or phone..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                  />
                </div>

                <div className="customer-results no-scrollbar">
                  {customerSearch.length > 0 ? (
                    <>
                      {customers
                        .filter(c =>
                          c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                          (c.phone && c.phone.includes(customerSearch))
                        )
                        .slice(0, 5)
                        .map(c => (
                          <div
                            key={c._id || c.id}
                            className={`customer-item ${selectedCustomer?._id === c._id ? 'selected' : ''}`}
                            onClick={() => setSelectedCustomer(c)}
                          >
                            <div className="cust-info">
                              <span className="cust-name">{c.name}</span>
                            </div>
                            {selectedCustomer?._id === c._id && <CheckCircle2 size={18} />}
                          </div>
                        ))
                      }
                      {customers.filter(c =>
                        c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                        (c.phone && c.phone.includes(customerSearch))
                      ).length === 0 && (
                          <div className="no-cust-found">No registered debtors found matching "{customerSearch}"</div>
                        )}
                    </>
                  ) : (
                    <div className="search-prompt">Type a name or phone to find a debtor...</div>
                  )}
                </div>
              </div>
            )}

            <button
              className="finalize-payment-btn"
              onClick={handleCheckout}
              disabled={paymentMethod === 'credit' && !selectedCustomer}
            >
              Complete Transaction
            </button>
          </div>
        </div>
      )}

      {/* Receipt Choice Modal */}
      {isReceiptModalOpen && (
        <div className="agro-modal-overlay">
          <div className="agro-modal status-modal animate-pop">
            <div className="status-icon success">
              <CheckCircle2 size={64} />
            </div>
            <h2>Transaction Complete</h2>
            <p>The sale has been successfully logged.</p>

            <div className="receipt-action-grid">
              <button className="agro-btn secondary" onClick={() => {
                setIsReceiptModalOpen(false);
                setIsSuccessOpen(true);
              }}>
                Skip Receipt
              </button>
              <button className="agro-btn primary" onClick={async () => {
                await api.printReceipt(lastSaleData);
                setIsReceiptModalOpen(false);
                setIsSuccessOpen(true);
              }}>
                <Package size={20} />
                <span>Print Receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {isSuccessOpen && (
        <div className="agro-modal-overlay">
          <div className="agro-modal status-modal">
            <CheckCircle2 size={64} color="#1b5e20" />
            <h2>Payment Success</h2>
            <p>Transaction has been logged successfully.</p>
            <button className="finish-btn" onClick={() => setIsSuccessOpen(false)}>Done</button>
          </div>
        </div>
      )}

      <style>{`
        .customer-selection-area { margin-top: 1.5rem; display: flex; flex-direction: column; gap: 0.75rem; }
        .customer-search-box { 
          display: flex; align-items: center; gap: 0.75rem; background: #f8fafc; 
          padding: 0.75rem 1rem; border-radius: 1rem; border: 1px solid #e2e8f0; 
        }
        .customer-search-box input { background: transparent; border: none; outline: none; flex: 1; font-weight: 600; color: #1b4332; }
        .customer-results { max-height: 180px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.5rem; }
        .customer-item { 
          display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1rem; 
          background: white; border: 1px solid #f1f5f9; border-radius: 0.75rem; cursor: pointer; transition: all 0.2s;
        }
        .customer-item:hover { background: #fdfdfb; border-color: #1b5e20; }
        .customer-item.selected { background: #ecf3f0; border-color: #1b5e20; }
        .cust-name { display: block; font-weight: 800; color: #1b4332; font-size: 1.1rem; }
        .search-prompt { text-align: center; padding: 2rem; color: #94a3b8; font-size: 0.875rem; font-weight: 600; border: 2px dashed #f1f5f9; border-radius: 1.25rem; }
        .no-cust-found { text-align: center; padding: 1.5rem; color: #ef4444; font-size: 0.875rem; font-weight: 700; }
        .finalize-payment-btn:disabled { opacity: 0.5; cursor: not-allowed; filter: grayscale(1); }

        .cash-error-msg { color: #ef4444; font-size: 0.8125rem; font-weight: 700; margin-top: 0.5rem; display: block; text-align: center; }
        .error-border { border-color: #ef4444 !important; background: #fef2f2 !important; }

        .cash-calculator-area { margin-top: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
        .cash-input { 
          width: 100%; padding: 1rem 1.25rem; border-radius: 1rem; border: 1px solid #e2e8f0; 
          font-size: 1.5rem; font-weight: 800; color: #1b4332; text-align: center;
        }
        .balance-box { 
          background: #f8fafc; padding: 1.25rem; border-radius: 1.25rem; 
          display: flex; justify-content: space-between; align-items: center; border: 1px dashed #e2e8f0;
        }
        .balance-label { font-weight: 700; color: #64748b; font-size: 0.875rem; }
        .balance-value { font-size: 1.25rem; font-weight: 900; }
        .balance-value.success { color: #16a34a; }
        .balance-value.pending { color: #94a3b8; }

        .receipt-action-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 2rem; width: 100%; }

        .agro-btn {
          padding: 1rem 1.5rem;
          border-radius: 1.25rem;
          font-weight: 800;
          font-size: 0.95rem;
          cursor: pointer;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .agro-btn.primary {
          background: #1b4332;
          color: white;
          box-shadow: 0 4px 15px rgba(27, 67, 50, 0.2);
        }

        .agro-btn.primary:hover {
          background: #2d6a4f;
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(27, 67, 50, 0.3);
        }

        .agro-btn.secondary {
          background: #f1f5f9;
          color: #64748b;
        }

        .agro-btn.secondary:hover {
          background: #e2e8f0;
          color: #1b4332;
        }

        .pos-wrapper {
          display: grid;
          grid-template-columns: 1fr 400px;
          gap: 2rem;
          height: calc(100vh - 120px);
          position: relative;
        }

        .pos-main { display: flex; flex-direction: column; gap: 1.5rem; height: 100%; overflow: hidden; }
        .pos-header { display: flex; flex-direction: column; gap: 1rem; }
        
        .pos-search-bar {
          display: flex; align-items: center; gap: 1rem;
          background: rgba(255, 255, 255, 0.7); 
          backdrop-filter: blur(8px);
          padding: 1rem 1.5rem;
          border-radius: 1.5rem; 
          border: 1px solid rgba(255, 255, 255, 0.5);
          box-shadow: var(--shadow-sm);
        }

        .pos-search-bar input { background: transparent; border: none; outline: none; width: 100%; font-size: 1.125rem; font-weight: 600; color: var(--primary); }

        .category-chips { display: flex; gap: 0.75rem; overflow-x: auto; padding-bottom: 0.5rem; }
        .chip {
          padding: 0.625rem 1.25rem; background: white; border: 1px solid #e5e7eb;
          border-radius: 2rem; font-size: 0.875rem; font-weight: 700; color: #6b7280;
          white-space: nowrap; cursor: pointer; transition: all 0.2s;
        }
        .chip.active { background: var(--primary); color: white; border-color: var(--primary); box-shadow: 0 4px 12px rgba(6, 78, 59, 0.2); }

        .product-list-area { flex: 1; overflow-y: auto; padding-right: 0.5rem; display: flex; flex-direction: column; }
        .agro-list-view {
          display: flex; flex-direction: column; gap: 0.75rem; padding-bottom: 2rem;
        }

        .agro-list-item {
          background: white; 
          border-radius: 1.25rem; 
          border: 1px solid #f3f4f6;
          padding: 1.25rem 1.75rem; 
          cursor: pointer; 
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); 
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: relative;
        }

        .agro-list-item:hover:not(.out-of-stock) { 
          background: #fdfdfb;
          border-color: var(--primary-light); 
          box-shadow: 0 10px 15px -3px rgba(6, 78, 59, 0.05);
          transform: scale(1.005);
        }

        .item-name-group {
          flex: 1; display: flex; flex-direction: column; gap: 0.25rem;
        }

        .item-name { 
          font-size: 1.125rem; 
          font-weight: 800; 
          color: var(--primary); 
          margin: 0;
        }

        .item-category-minimal {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .item-stock-group {
          flex: 0.8;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .stock-indicator {
          width: 8px; height: 8px; border-radius: 50%; background: #16a34a;
        }
        .stock-indicator.low { background: #d97706; }

        .stock-text {
          font-size: 0.8125rem;
          line-height: 1.25;
          font-weight: 700;
          color: var(--text-muted);
        }

        .item-price-group {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        .item-price { 
          font-size: 1.25rem; 
          font-weight: 900; 
          color: var(--primary); 
        }

        .add-quick-btn {
          width: 40px; height: 40px;
          background: #ecf3f0;
          color: var(--primary);
          border-radius: 1rem;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s;
        }

        .agro-list-item:hover .add-quick-btn {
          background: var(--primary);
          color: white;
          transform: rotate(90deg);
        }

        .out-of-stock { 
          opacity: 0.5; 
          filter: grayscale(1);
          cursor: not-allowed; 
        }

        .order-sidebar {
          background: white; 
          border-radius: 2rem; 
          border: 1px solid #f1f5f9;
          display: flex; flex-direction: column; overflow: hidden;
          box-shadow: var(--shadow-sm);
        }

        .order-header { 
          padding: 1.75rem; 
          border-bottom: 1px solid #f3f4f6; 
          display: flex; 
          justify-content: space-between; 
          align-items: center;
          background: #fdfdfb;
        }
        .order-title h2 { font-size: 1.25rem; font-weight: 900; color: var(--primary); margin: 0; }
        .order-header-actions { display: flex; gap: 0.5rem; }
        .clear-order { background: #fef2f2; color: #ef4444; border: none; padding: 0.5rem; border-radius: 0.75rem; cursor: pointer; }
        .mobile-close-cart { display: none; background: none; border: none; color: #64748b; }

        .order-items-list { flex: 1; overflow-y: auto; padding: 1.25rem; display: flex; flex-direction: column; gap: 0.75rem; }
        .no-order { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: #cbd5e1; gap: 0.5rem; }
        .order-item-card { padding-bottom: 0.75rem; border-bottom: 1px solid #f8fafc; }
        .item-details { display: flex; justify-content: space-between; margin-bottom: 0.5rem; }
        .item-name { font-weight: 700; color: var(--primary); font-size: 0.95rem; }
        .item-price-each { font-size: 0.75rem; color: var(--text-muted); }
        
        .item-actions { display: flex; align-items: center; justify-content: space-between; }
        .qty-picker { display: flex; align-items: center; gap: 0.75rem; background: #f8fafc; padding: 0.25rem 0.5rem; border-radius: 0.75rem; }
        .qty-picker button { width: 24px; height: 24px; background: white; border: 1px solid #e2e8f0; border-radius: 0.5rem; display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .qty-val { font-weight: 800; font-size: 0.875rem; color: var(--primary); }
        .item-total-price { font-weight: 800; color: var(--primary); font-size: 0.95rem; }
        .remove-btn { color: #cbd5e1; background: none; border: none; cursor: pointer; }
        .remove-btn:hover { color: #ef4444; }

        .order-checkout-section { padding: 1.75rem; background: #fdfdfb; border-top: 1px solid #f3f4f6; }
        .pricing-rows { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1.5rem; }
        .price-row { display: flex; justify-content: space-between; color: var(--text-muted); font-size: 0.875rem; font-weight: 600; }
        .inline-discount { width: 60px; border: none; background: #f1f5f9; padding: 0.25rem; border-radius: 0.4rem; text-align: right; font-weight: 800; color: var(--primary); }
        
        .grand-total { margin-top: 1rem; padding-top: 1rem; border-top: 1px dashed #e5e7eb; display: flex; justify-content: space-between; align-items: center; }
        .total-value { font-size: 1.75rem; font-weight: 950; color: var(--primary); }

        .process-btn { width: 100%; padding: 1rem; background: var(--primary); color: white; border: none; border-radius: 1rem; font-size: 1rem; font-weight: 800; display: flex; align-items: center; justify-content: center; gap: 0.75rem; cursor: pointer; box-shadow: 0 4px 12px rgba(6, 78, 59, 0.2); transition: all 0.2s; }
        .process-btn:hover:not(:disabled) { background: var(--primary-light); transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgba(6, 78, 59, 0.3); }

        .mobile-cart-fab {
          display: none;
          position: fixed; bottom: 1.5rem; left: 1.5rem; right: 1.5rem;
          background: var(--primary); color: white; border: none; border-radius: 1.25rem;
          padding: 0.75rem 1.25rem; align-items: center; justify-content: space-between;
          box-shadow: 0 10px 25px rgba(0,0,0,0.2); z-index: 100;
        }
        .fab-icon { position: relative; }
        .fab-badge { position: absolute; top: -8px; right: -8px; background: var(--accent); color: var(--primary-dark); font-size: 0.625rem; font-weight: 900; width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid var(--primary); }
        .fab-info { display: flex; flex-direction: column; align-items: flex-start; flex: 1; margin-left: 1rem; }
        .fab-label { font-size: 0.75rem; font-weight: 600; opacity: 0.8; }
        .fab-total { font-weight: 800; font-size: 1.125rem; }

        @media (max-width: 1024px) {
          .pos-wrapper { grid-template-columns: 1fr; }
          .order-sidebar {
            position: fixed; top: 0; right: 0; bottom: 0;
            width: 100%; max-width: 450px; border-radius: 0;
            transform: translateX(100%); z-index: 2000;
          }
          .order-sidebar.mobile-open { transform: translateX(0); }
          .mobile-cart-fab { display: flex; }
          .mobile-close-cart { display: block; }
        }

        .agro-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(2, 44, 34, 0.6); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 3000; padding: 1rem; }
        .agro-modal { background: white; border-radius: 2rem; width: 100%; max-width: 450px; padding: 2.5rem; position: relative; box-shadow: var(--shadow-premium); max-height: 95vh; overflow-y: auto; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
        .close-modal { background: #f8fafc; border: none; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #94a3b8; cursor: pointer; transition: all 0.2s; }
        .close-modal:hover { background: #fee2e2; color: #ef4444; }
        .payable-display { text-align: center; margin-bottom: 2rem; }
        .payable-value { font-size: 3rem; font-weight: 950; color: var(--primary); }
        .method-selection { display: flex; flex-direction: column; gap: 1rem; margin-bottom: 2rem; }
        .method-chip { display: flex; align-items: center; gap: 1rem; padding: 1.25rem; border: 1px solid #e5e7eb; border-radius: 1.25rem; background: #fdfdfb; cursor: pointer; font-weight: 800; color: var(--primary); transition: all 0.2s; }
        .method-chip.active { border-color: var(--primary); background: var(--sky); box-shadow: 0 4px 12px rgba(6, 78, 59, 0.05); }
        .finalize-payment-btn { width: 100%; padding: 1.25rem; background: var(--primary); color: white; border: none; border-radius: 1.25rem; font-weight: 900; cursor: pointer; transition: all 0.2s; margin-bottom: 1rem; }
        .finalize-payment-btn:hover:not(:disabled) { background: var(--primary-dark); transform: scale(1.02); }
        .status-modal { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 1.5rem; }
        .finish-btn { width: 100%; padding: 1rem; background: var(--primary); color: white; border: none; border-radius: 1rem; font-weight: 800; cursor: pointer; }

        @media (max-width: 480px) {
          .agro-modal { padding: 1.5rem; }
          .payable-value { font-size: 2.25rem; }
        }

        @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        .animate-in { animation: slideUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
      `}</style>
    </div>
  );
};

export default POS;
