import React, { useState, useEffect } from 'react';
import api from './api';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import POS from './pages/POS';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Debtors from './pages/Debtors';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session (if implemented)
    const savedUser = localStorage.getItem('pos_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);

    // Global fix to prevent scroll from changing number inputs
    const handleWheel = (e) => {
      if (document.activeElement.type === 'number') {
        document.activeElement.blur();
      }
    };
    window.addEventListener('wheel', handleWheel, { passive: true });
    return () => window.removeEventListener('wheel', handleWheel);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('pos_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('pos_user');
  };

  const handleSwitchUser = async () => {
    const isCurrentlyAdmin = user?.username === 'admin';
    const switchTarget = isCurrentlyAdmin 
      ? { username: 'employee', password: 'employee123' }
      : { username: 'admin', password: 'admin123' };

    try {
      const result = await api.login(switchTarget);
      if (result.success) {
        handleLogin(result.user);
      }
    } catch (err) {
      console.error('Switch user failed:', err);
    }
  };

  if (loading) return <div className="loading-screen">Loading...</div>;

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={user ? <Navigate to="/" /> : <Login onLogin={handleLogin} />} 
        />
        <Route 
          path="/*" 
          element={user ? <Layout user={user} onLogout={handleLogout} onSwitchUser={handleSwitchUser} /> : <Navigate to="/login" />}
        >
          <Route index element={<Dashboard user={user} />} />
          <Route path="products" element={<Products />} />
          <Route path="pos" element={<POS user={user} />} />
          <Route path="reports" element={<Reports />} />
          <Route path="debtors" element={<Debtors user={user} />} />
          <Route path="settings" element={<Settings user={user} />} />
        </Route>
      </Routes>
    </Router>
  );
}





export default App;

