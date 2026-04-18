import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import {
  TrendingUp,
  Package,
  AlertTriangle,
  Clock,
  DollarSign
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const Dashboard = ({ user }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalSalesToday: 0,
    totalProducts: 0,
    lowStockItems: 0,
    nearingExpiry: 0
  });
  const [alerts, setAlerts] = useState({
    lowStock: [],
    expiring: [],
    overdueDebts: []
  });
  const [salesData, setSalesData] = useState([]);
  const [period, setPeriod] = useState(7);
  const [loadingChart, setLoadingChart] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const s = await api.getStats();
        const low = await api.getLowStockAlerts();
        const exp = await api.getExpiringAlerts();
        const overdue = await api.getOverdueDebts();
        setStats(s);
        setAlerts({ lowStock: low, expiring: exp, overdueDebts: overdue });

        // Fetch Sales Data for Chart
        setLoadingChart(true);
        const report = await api.getSalesReport({ period: 'daily' });
        setSalesData(report || []);
        setLoadingChart(false);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);


  const cards = [
    {
      label: "Today's Sales",
      value: `Rs.${stats.totalSalesToday.toLocaleString()}`,
      icon: DollarSign,
      color: "#2d6a4f",
      bg: "#ecf3f0",
      path: "/reports?tab=history"
    },
    {
      label: "Total Products",
      value: stats.totalProducts,
      icon: Package,
      color: "#d4a017",
      bg: "#fffbeb",
      path: "/products"
    },
    {
      label: "Low Stock Items",
      value: stats.lowStockItems,
      icon: AlertTriangle,
      color: "#b45309",
      bg: "#fff7ed",
      path: "/products?filter=low-stock"
    },
    {
      label: "Nearing Expiry",
      value: stats.nearingExpiry,
      icon: Clock,
      color: "#991b1b",
      bg: "#fef2f2",
      path: "/products?filter=expiring"
    },
  ];

  const chartConfig = {
    labels: salesData.slice(-period).map(d => d.label),
    datasets: [
      {
        fill: true,
        label: 'Daily Sales (Rs.)',
        data: salesData.slice(-period).map(d => d.value),
        borderColor: '#2d6a4f',
        backgroundColor: 'rgba(45, 106, 79, 0.08)',
        borderWidth: 3,
        pointBackgroundColor: '#2d6a4f',
        pointBorderColor: '#fff',
        pointHoverRadius: 6,
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1b4332',
        padding: 12,
        cornerRadius: 10,
        displayColors: false
      }
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { weight: '600' } } },
      y: { grid: { color: '#f1f5f9' }, ticks: { weight: '600', callback: (v) => 'Rs.' + v.toLocaleString() } }
    }
  };

  return (
    <div className="dashboard-wrapper">
      <div className="dashboard-welcome">
        <div className="welcome-text">
          <h1>Good day, {user.full_name.split(' ')[0]}!</h1>
          <p>Here's an overview of your agricultural business today.</p>
        </div>
        <div className="date-badge">
          <Clock size={16} />
          <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
        </div>
      </div>

      <div className="stats-container">
        {cards.map((card, idx) => (
          <div
            key={idx}
            className="premium-stat-card clickable"
            onClick={() => navigate(card.path)}
          >
            <div className="card-top">
              <span className="card-label">{card.label}</span>
              <div className="card-icon" style={{ backgroundColor: card.bg, color: card.color }}>
                <card.icon size={20} />
              </div>
            </div>
            <div className="card-bottom">
              <span className="card-value">{card.value}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-grid">
        <div className="glass-card main-chart">
          <div className="card-header">
            <h3>Sales Performance</h3>
            <select
              className="period-select"
              value={period}
              onChange={(e) => setPeriod(parseInt(e.target.value))}
            >
              <option value={7}>Last 7 Days</option>
              <option value={30}>Last 30 Days</option>
            </select>
          </div>
          <div className="chart-area">
            {loadingChart ? (
              <div className="loader-box">
                <div className="spinner"></div>
                <p>Analyzing Sales...</p>
              </div>
            ) : salesData.length === 0 ? (
              <div className="empty-chart">
                <TrendingUp size={48} className="fade-icon" />
                <p>No growth data available yet.</p>
              </div>
            ) : (
              <Line data={chartConfig} options={chartOptions} />
            )}
          </div>
        </div>

        <div className="glass-card alerts-panel">
          <div className="card-header">
            <h3>Priority Alerts</h3>
            <span className="alert-count">{alerts.lowStock.length + alerts.expiring.length + alerts.overdueDebts.length}</span>
          </div>
          <div className="alerts-scroll">
            {alerts.lowStock.length === 0 && alerts.expiring.length === 0 ? (
              <div className="no-alerts">
                <Package size={32} />
                <p>Everything is on track!</p>
              </div>
            ) : (
              <div className="alerts-stack">
                {alerts.overdueDebts.map(c => (
                  <div key={`debt-${c._id || c.id}`} className="agro-alert debt">
                    <div className="alert-indicator"></div>
                    <div className="alert-content">
                      <span className="alert-title">Payment Overdue: {c.name}</span>
                      <span className="alert-desc">Promised on {new Date(c.promise_date).toLocaleDateString()} • Balance: Rs.{c.total_debt.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
                {alerts.lowStock.map(p => (
                  <div key={`low-${p.id}`} className="agro-alert low">
                    <div className="alert-indicator"></div>
                    <div className="alert-content">
                      <span className="alert-title">{p.name}</span>
                      <span className="alert-desc">Stock running low: {p.stock} units remaining</span>
                    </div>
                  </div>
                ))}
                {alerts.expiring.map(p => (
                  <div key={`exp-${p.id}`} className="agro-alert exp">
                    <div className="alert-indicator"></div>
                    <div className="alert-content">
                      <span className="alert-title">{p.name}</span>
                      <span className="alert-desc">Nearing expiry: {new Date(p.expiry_date).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .dashboard-wrapper {
          display: flex;
          flex-direction: column;
          gap: 2.5rem;
          animation: pageFade 0.6s ease-out;
        }

        @keyframes pageFade {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .dashboard-welcome {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }

        .welcome-text h1 {
          font-size: 2rem;
          color: #1b4332;
          font-weight: 800;
          letter-spacing: -0.03em;
        }

        .welcome-text p {
          color: #64748b;
          font-size: 1.1rem;
          margin-top: 0.25rem;
        }

        .date-badge {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          background: white;
          padding: 0.625rem 1.25rem;
          border-radius: 2rem;
          border: 1px solid #e2e8f0;
          color: #1b4332;
          font-weight: 700;
          font-size: 0.875rem;
          box-shadow: var(--shadow-sm);
        }

        .stats-container {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1.5rem;
        }

        .premium-stat-card {
          background: white;
          padding: 1.5rem;
          border-radius: 1.5rem;
          border: 1px solid #f1f5f9;
          box-shadow: var(--shadow-sm);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .premium-stat-card:hover {
          transform: translateY(-5px);
          box-shadow: var(--shadow-lg);
          border-color: #1b5e20;
        }

        .premium-stat-card.clickable {
          cursor: pointer;
        }

        .card-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1.5rem;
        }

        .card-label {
          font-size: 0.875rem;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .card-icon {
          width: 44px;
          height: 44px;
          border-radius: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .card-bottom {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }

        .card-value {
          font-size: 2rem;
          font-weight: 800;
          color: #1b4332;
          letter-spacing: -0.025em;
        }

        .trend-up {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          color: #16a34a;
          font-size: 0.8125rem;
          font-weight: 700;
          background: #f0fdf4;
          padding: 0.25rem 0.625rem;
          border-radius: 2rem;
        }

        .dashboard-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 1.5rem;
        }

        @media (max-width: 1024px) {
          .dashboard-grid { grid-template-columns: 1fr; }
        }

        .glass-card {
          background: white;
          border-radius: 1.5rem;
          border: 1px solid #f1f5f9;
          box-shadow: var(--shadow-sm);
          padding: 1.75rem;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .card-header h3 {
          font-size: 1.25rem;
          font-weight: 800;
          color: #1b4332;
        }

        .period-select {
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
          font-weight: 700;
          color: #1b4332;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 0.75rem;
          cursor: pointer;
        }

        .chart-area {
          height: 300px;
          background: #fdfdfb;
          border-radius: 1.25rem;
          border: 2px dashed #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .empty-chart {
          text-align: center;
          color: #94a3b8;
        }

        .fade-icon {
          margin-bottom: 1rem;
          opacity: 0.3;
        }

        .alert-count {
          background: #fef2f2;
          color: #ef4444;
          font-weight: 800;
          padding: 0.25rem 0.75rem;
          border-radius: 2rem;
          font-size: 0.8125rem;
        }

        .alerts-stack {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .agro-alert {
          display: flex;
          gap: 1rem;
          padding: 1rem;
          background: #f8fafc;
          border-radius: 1rem;
          border: 1px solid #f1f5f9;
          transition: all 0.2s;
        }

        .agro-alert:hover {
          border-color: #1b4332;
          background: white;
          box-shadow: var(--shadow-sm);
        }

        .alert-indicator {
          width: 4px;
          border-radius: 2px;
        }

        .agro-alert.low .alert-indicator { background: #fbc02d; }
        .agro-alert.exp .alert-indicator { background: #ef4444; }
        .agro-alert.debt .alert-indicator { background: #7c3aed; }
        .agro-alert.debt:hover { border-color: #7c3aed; }

        .alert-content {
          display: flex;
          flex-direction: column;
        }

        .alert-title {
          font-weight: 700;
          color: #1b4332;
          font-size: 0.95rem;
        }

        .alert-desc {
          font-size: 0.8125rem;
          color: #64748b;
          margin-top: 0.125rem;
        }

        .no-alerts {
          height: 200px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #cbd5e1;
          gap: 1rem;
        }
        @media (max-width: 640px) {
          .dashboard-welcome {
            flex-direction: column;
            align-items: flex-start;
            gap: 1.5rem;
          }
          
          .welcome-text h1 {
            font-size: 1.75rem;
          }

          .premium-stat-card {
            padding: 1.25rem;
          }

          .card-value {
            font-size: 1.5rem;
          }

          .chart-area {
            height: 250px;
          }
        }
      `}</style>

    </div>
  );
};

export default Dashboard;
