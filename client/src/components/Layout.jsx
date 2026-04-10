import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../api';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  BarChart3,
  Settings,
  LogOut,
  Bell,
  User,
  Menu,
  X,
  Users
} from 'lucide-react';

const Layout = ({ user, onLogout, onSwitchUser }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [alerts, setAlerts] = useState({ lowStock: [], expiring: [], overdueDebts: [] });
  const notifRef = useRef(null);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const [low, exp, debts] = await Promise.all([
          api.getLowStockAlerts(),
          api.getExpiringAlerts(),
          api.getOverdueDebts()
        ]);
        setAlerts({
          lowStock: Array.isArray(low) ? low : [],
          expiring: Array.isArray(exp) ? exp : [],
          overdueDebts: Array.isArray(debts) ? debts : []
        });
      } catch (err) {
        console.error('Failed to fetch alerts:', err);
      }
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60000);
    return () => clearInterval(interval);
  }, []);

  const totalAlerts = alerts.lowStock.length + alerts.expiring.length + alerts.overdueDebts.length;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu when location changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: ShoppingCart, label: 'POS Terminal', path: '/pos' },
    { icon: Package, label: 'Products', path: '/products' },
    { icon: BarChart3, label: 'Reports', path: '/reports' },
    { icon: Users, label: 'Debtors', path: '/debtors' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  return (
    <div className="layout">
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div className="mobile-overlay" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="logo-placeholder">T</div>
          <div className="brand-text">
            <span className="brand-name">AGRO TREE</span>
            <span className="brand-sub">FERTILIZERS</span>
          </div>
          <button className="mobile-close-btn" onClick={() => setIsMobileMenuOpen(false)}>
            <X size={24} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            >
              <item.icon size={22} className="nav-icon" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button onClick={onLogout} className="logout-btn">
            <LogOut size={20} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-container">
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-toggle" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu size={24} />
            </button>
            <h2 className="page-title">
              {menuItems.find(i => i.path === location.pathname)?.label || 'Dashboard'}
            </h2>
          </div>
          <div className="topbar-right">
            <div className="action-buttons relative" ref={notifRef}>
              <button
                className="icon-btn"
                title="Notifications"
                onClick={() => setIsNotifOpen(!isNotifOpen)}
              >
                <Bell size={20} />
                {totalAlerts > 0 && <span className="notification-dot"></span>}
              </button>

              {isNotifOpen && (
                <div className="notification-dropdown">
                  <div className="dropdown-header">
                    <h3>Notifications</h3>
                    <span className="badge">{totalAlerts} New</span>
                  </div>
                  <div className="dropdown-body">
                    {totalAlerts === 0 ? (
                      <div className="empty-notif">
                        <Bell size={24} className="fade-icon" />
                        <p>No new alerts</p>
                      </div>
                    ) : (
                      <>
                        {alerts.overdueDebts.map(c => {
                          const diff = Math.ceil((new Date(c.promise_date) - new Date()) / (1000 * 60 * 60 * 24));
                          const daysText = diff === 0 ? 'Today' : (diff > 0 ? `in ${diff} days` : `${Math.abs(diff)} days overdue`);
                          return (
                            <div key={`debt-${c._id || c.id}`} className="notif-item debt">
                              <div className="notif-indicator"></div>
                              <div className="notif-content">
                                <span className="notif-title">Payment {diff < 0 ? 'Overdue' : 'Upcoming'}: {c.name}</span>
                                <span className="notif-desc">Due {daysText} • Rs.{c.total_debt.toLocaleString()}</span>
                              </div>
                            </div>
                          );
                        })}
                        {alerts.lowStock.map(p => (
                          <div key={`low-${p.id}`} className="notif-item warning">
                            <div className="notif-indicator"></div>
                            <div className="notif-content">
                              <span className="notif-title">Low Stock: {p.name}</span>
                              <span className="notif-desc">Only {p.stock} units remaining</span>
                            </div>
                          </div>
                        ))}
                        {alerts.expiring.map(p => (
                          <div key={`exp-${p.id}`} className="notif-item error">
                            <div className="notif-indicator"></div>
                            <div className="notif-content">
                              <span className="notif-title">Expiring: {p.name}</span>
                              <span className="notif-desc">Expires on {p.expiry_date}</span>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div
              className="user-profile"
              onClick={onSwitchUser}
              title={`Switch to ${user.username === 'admin' ? 'Employee' : 'Administrator'}`}
            >
              <div className="user-info desktop-only">
                <span className="user-name">{user.full_name}</span>
                <span className="user-role">{user.role}</span>
              </div>
              <div className="avatar-circle">
                {user.full_name.charAt(0)}
              </div>
            </div>
          </div>
        </header>

        <section className="content-area">
          <div className="content-scroll">
            <Outlet />
          </div>
        </section>
      </main>

      <style>{`
        .layout {
          display: flex;
          height: 100vh;
          background-color: var(--bg-page);
          overflow: hidden;
        }

        .mobile-overlay {
          display: none;
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(27, 43, 30, 0.4);
          backdrop-filter: blur(4px);
          z-index: 900;
        }

        .sidebar {
          width: 280px;
          background-color: white;
          border-right: 1px solid #f1f5f9;
          display: flex;
          flex-direction: column;
          padding: 2rem 1.25rem;
          z-index: 1000;
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .sidebar-brand {
          display: flex;
          align-items: center;
          gap: 0.875rem;
          margin-bottom: 3.5rem;
          padding-left: 0.5rem;
          position: relative;
        }

        .mobile-close-btn {
          display: none;
          position: absolute;
          right: 0;
          background: none;
          border: none;
          color: #64748b;
          cursor: pointer;
        }

        .logo-placeholder {
          width: 40px;
          height: 40px;
          background: var(--primary);
          color: var(--accent);
          border-radius: 0.875rem;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 1.25rem;
          transform: rotate(-10deg);
          box-shadow: 0 4px 12px rgba(6, 78, 59, 0.2);
        }

        .brand-text {
          display: flex;
          flex-direction: column;
          line-height: 1;
        }

        .brand-name {
          font-size: 1rem;
          font-weight: 800;
          color: #1b4332;
          letter-spacing: -0.025em;
        }

        .brand-sub {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--accent);
          letter-spacing: 0.1em;
          margin-top: 0.125rem;
        }

        .sidebar-nav {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.875rem 1.125rem;
          color: #64748b;
          text-decoration: none;
          border-radius: 1rem;
          font-weight: 600;
          font-size: 0.95rem;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .nav-icon {
          transition: transform 0.2s;
        }

        .nav-item:hover {
          background-color: #f8fafc;
          color: #1b5e20;
        }

        .nav-item:hover .nav-icon {
          transform: translateX(3px);
        }

        .nav-item.active {
          background-color: #f0fdf4;
          color: #1b5e20;
          position: relative;
        }

        .nav-item.active::after {
          content: "";
          position: absolute;
          right: 0.75rem;
          width: 6px;
          height: 6px;
          background: #fbc02d;
          border-radius: 50%;
        }

        .sidebar-footer {
          margin-top: auto;
          padding-top: 1.5rem;
          border-top: 1px solid #f1f5f9;
        }

        .logout-btn {
          display: flex;
          align-items: center;
          gap: 0.875rem;
          padding: 0.875rem 1.125rem;
          width: 100%;
          background: transparent;
          border: none;
          color: #ef4444;
          cursor: pointer;
          font-weight: 700;
          border-radius: 1rem;
          transition: all 0.2s;
        }

        .logout-btn:hover {
          background-color: #fef2f2;
        }

        .main-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background-color: #fdfdfb;
        }

        .topbar {
          height: 80px;
          padding: 0 2.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background-color: rgba(253, 253, 251, 0.8);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid #f1f5f9;
          z-index: 50;
        }

        .mobile-toggle {
          display: none;
          background: none;
          border: none;
          color: #1b4332;
          cursor: pointer;
          padding: 0.5rem;
          margin-left: -0.5rem;
        }

        .page-title {
          font-size: 1.5rem;
          font-weight: 800;
          color: #1b4332;
          letter-spacing: -0.025em;
        }

        .topbar-right {
          display: flex;
          align-items: center;
          gap: 2rem;
        }

        .icon-btn {
          width: 44px;
          height: 44px;
          background: white;
          border: 1px solid #e2e8f0;
          color: #64748b;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 0.875rem;
          position: relative;
          transition: all 0.2s;
        }

        .icon-btn:hover {
          border-color: #1b5e20;
          color: #1b5e20;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }

        .relative { position: relative; }

        .notification-dropdown {
          position: absolute;
          top: 120%;
          right: 0;
          width: 320px;
          background: white;
          border-radius: 1.25rem;
          border: 1px solid #e2e8f0;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
          z-index: 100;
          overflow: hidden;
          animation: slideDown 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .dropdown-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem;
          border-bottom: 1px solid #f1f5f9;
          background: #fdfdfb;
        }

        .dropdown-header h3 {
          margin: 0;
          font-size: 1rem;
          font-weight: 800;
          color: #1b4332;
        }

        .dropdown-header .badge {
          background: #fef2f2;
          color: #ef4444;
          padding: 0.25rem 0.625rem;
          border-radius: 1rem;
          font-size: 0.75rem;
          font-weight: 800;
        }

        .dropdown-body {
          max-height: 350px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }

        .empty-notif {
          padding: 3rem 1.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
          color: #94a3b8;
        }

        .fade-icon { opacity: 0.3; }

        .notif-item {
          display: flex;
          gap: 1rem;
          padding: 1rem 1.25rem;
          border-bottom: 1px solid #f8fafc;
          transition: background 0.2s;
        }

        .notif-item:hover { background: #fdfdfb; }

        .notif-indicator {
          width: 4px;
          border-radius: 2px;
          flex-shrink: 0;
        }

        .notif-item.warning .notif-indicator { background: #fbc02d; }
        .notif-item.error .notif-indicator { background: #ef4444; }
        .notif-item.debt .notif-indicator { background: #7c3aed; }

        .notif-content {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .notif-title {
          font-size: 0.875rem;
          font-weight: 700;
          color: #1b4332;
        }

        .notif-desc {
          font-size: 0.8125rem;
          color: #64748b;
        }

        .notification-dot {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 8px;
          height: 8px;
          background-color: #ef4444;
          border: 2px solid white;
          border-radius: 50%;
        }

        .user-profile {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding-left: 2rem;
          border-left: 1px solid #e2e8f0;
          cursor: pointer;
          transition: all 0.2s;
        }

        .user-profile:hover {
          opacity: 0.8;
          transform: translateY(-1px);
        }

        .user-info {
          display: flex;
          flex-direction: column;
          text-align: right;
        }

        .user-name {
          font-size: 0.95rem;
          font-weight: 700;
          color: #1b4332;
        }

        .user-role {
          font-size: 0.75rem;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .avatar-circle {
          width: 44px;
          height: 44px;
          background: #ecf3f0;
          color: #1b5e20;
          border-radius: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 1.125rem;
          border: 1px solid #d1fae5;
        }

        .content-area {
          flex: 1;
          overflow: hidden;
          padding: 2rem 2.5rem;
        }

        .content-scroll {
          height: 100%;
          overflow-y: auto;
          padding-right: 0.5rem;
        }

        /* Responsive Breakpoints */
        @media (max-width: 1024px) {
          .sidebar {
            position: fixed;
            left: 0;
            top: 0;
            bottom: 0;
            transform: translateX(-100%);
            box-shadow: 10px 0 25px rgba(0,0,0,0.1);
          }
          
          .sidebar.open {
            transform: translateX(0);
          }

          .mobile-overlay {
            display: block;
          }

          .mobile-toggle {
            display: block;
          }

          .mobile-close-btn {
            display: block;
          }

          .topbar {
            padding: 0 1.25rem;
          }

          .content-area {
            padding: 1.25rem;
          }
        }

        @media (max-width: 640px) {
          .desktop-only {
            display: none;
          }

          .notification-dropdown {
            position: fixed;
            top: 70px;
            left: 1rem;
            right: 1rem;
            width: auto;
          }
          
          .user-profile {
            padding-left: 0;
            border-left: none;
          }

          .page-title {
            font-size: 1.25rem;
          }

          .header-meta h1 {
            font-size: 1.75rem !important;
          }

          .header-meta p {
            font-size: 0.95rem !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Layout;
