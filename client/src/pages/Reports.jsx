import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../api';
import {
  BarChart3,
  History,
  Download,
  FileText,
  Table as TableIcon,
  Calendar,
  ChevronRight,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  X,
  Printer
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  Filler
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const Reports = () => {
  const [activeTab, setActiveTab] = useState('history');
  const [history, setHistory] = useState([]);
  const [reportData, setReportData] = useState([]);
  const [bestSellers, setBestSellers] = useState([]);
  const [period, setPeriod] = useState('daily');
  const [loading, setLoading] = useState(true);
  const [analyticsSummary, setAnalyticsSummary] = useState({
    avgTransaction: 0,
    totalOrders: 0,
    growthRate: 0,
    totalRevenue: 0
  });
  const [selectedSale, setSelectedSale] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [historyPeriod, setHistoryPeriod] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab && (tab === 'history' || tab === 'analysis')) {
      setActiveTab(tab);
    }
  }, [location.search]);

  useEffect(() => {
    fetchData();
  }, [period, activeTab, selectedMonth, selectedYear, historyPeriod, startDate, endDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'history') {
        const data = await api.getSalesHistory({ 
          month: selectedMonth, 
          year: selectedYear,
          period: historyPeriod === 'all' ? null : historyPeriod,
          startDate: historyPeriod === 'custom' ? startDate : null,
          endDate: historyPeriod === 'custom' ? endDate : null
        });
        setHistory(data);
      } else if (activeTab === 'analysis') {
        const sales = await api.getSalesReport({ period });
        const best = await api.getBestSellers();
        const summary = await api.getAnalyticsSummary();
        setReportData(sales);
        setBestSellers(best);
        setAnalyticsSummary(summary);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.setTextColor(27, 67, 50);
    doc.text('AKS AGRO LANKA - Sales Report', 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);

    const tableData = history.map(h => [
      `#INV-${String(h.id).padStart(5, '0')}`,
      new Date(h.created_at).toLocaleString(),
      h.cashier_name,
      h.payment_method.toUpperCase(),
      `Rs.${h.total_amount.toLocaleString()}`
    ]);

    autoTable(doc, {
      startY: 35,
      head: [['Invoice ID', 'Date & Time', 'Cashier', 'Method', 'Total Amount']],
      body: tableData,
      headStyles: { fillColor: [27, 94, 32] },
      alternateRowStyles: { fillColor: [248, 250, 252] }
    });

    doc.save(`aks-agro-sales-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportToExcel = () => {
    const exportData = history.map(h => ({
      'Invoice ID': `#INV-${h.id}`,
      'Date': new Date(h.created_at).toLocaleString(),
      'Cashier': h.cashier_name,
      'Payment Method': h.payment_method,
      'Total Amount': h.total_amount
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sales History");
    XLSX.writeFile(workbook, `aks-agro-sales-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const downloadSalePDF = (sale) => {
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.setTextColor(27, 67, 50);
    doc.text('AKS AGRO LANKA', 105, 25, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('Quality Agricultural Solutions', 105, 32, { align: 'center' });

    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Invoice No: #INV-${sale.id}`, 20, 50);
    doc.text(`Date: ${new Date(sale.created_at).toLocaleString()}`, 20, 58);
    doc.text(`Cashier: ${sale.cashier_name}`, 20, 66);
    doc.text(`Customer: ${sale.customer_name || 'Walk-in'}`, 20, 74);

    const tableData = sale.items.map(item => [
      item.name,
      item.quantity,
      `Rs.${item.unit_price.toFixed(2)}`,
      `Rs.${item.subtotal.toFixed(2)}`
    ]);

    autoTable(doc, {
      startY: 85,
      head: [['Product', 'Qty', 'Unit Price', 'Subtotal']],
      body: tableData,
      headStyles: { fillColor: [27, 94, 32] }
    });

    const finalY = doc.lastAutoTable.finalY + 10;
    doc.text(`Subtotal: Rs.${(sale.total_amount + (sale.discount || 0)).toFixed(2)}`, 140, finalY);
    doc.text(`Discount: - Rs.${(sale.discount || 0).toFixed(2)}`, 140, finalY + 8);

    doc.setFontSize(14);
    doc.text(`Grand Total: Rs.${sale.total_amount.toFixed(2)}`, 140, finalY + 18);

    doc.setFontSize(10);
    doc.text(`Paid via ${sale.payment_method.toUpperCase()}`, 105, finalY + 35, { align: 'center' });
    doc.text('Thank you for your business!', 105, finalY + 42, { align: 'center' });

    doc.save(`Invoice-${sale.id}.pdf`);
  };

  const chartData = {
    labels: reportData.map(d => d.label),
    datasets: [
      {
        fill: true,
        label: 'Revenue (Rs.)',
        data: reportData.map(d => d.value),
        backgroundColor: 'rgba(27, 94, 32, 0.08)',
        borderColor: '#1b5e20',
        borderWidth: 3,
        pointBackgroundColor: '#1b5e20',
        pointBorderColor: '#fff',
        pointHoverRadius: 6,
        tension: 0.4
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
        titleFont: { size: 14, weight: 'bold' },
        bodyFont: { size: 14 },
        padding: 12,
        cornerRadius: 10,
        displayColors: false
      }
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { weight: '600' } } },
      y: { grid: { color: '#f1f5f9' }, ticks: { font: { weight: '600' }, callback: (v) => 'Rs.' + v.toLocaleString() } }
    }
  };

  return (
    <div className="reports-wrapper">
      <div className="reports-nav-shelf">
        <div className="tab-buttons">
          <button
            className={activeTab === 'history' ? 'active' : ''}
            onClick={() => setActiveTab('history')}
          >
            <History size={20} />
            <span>Sales History</span>
          </button>
          <button
            className={activeTab === 'analysis' ? 'active' : ''}
            onClick={() => setActiveTab('analysis')}
          >
            <BarChart3 size={20} />
            <span>Advanced Analytics</span>
          </button>
        </div>

        <div className="reports-actions">
          {activeTab === 'history' && (
            <div className="history-filters">
              <div className="filter-group">
                <select 
                  value={historyPeriod} 
                  onChange={(e) => setHistoryPeriod(e.target.value)}
                  className="filter-select period-type"
                >
                  <option value="all">All Transactions</option>
                  <option value="today">Today</option>
                  <option value="weekly">This Week</option>
                  <option value="monthly">By Month/Year</option>
                  <option value="custom">Custom Range</option>
                </select>

                {historyPeriod === 'monthly' && (
                  <>
                    <select 
                      value={selectedMonth} 
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="filter-select"
                    >
                      <option value="">All Months</option>
                      {[...Array(12)].map((_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {new Date(0, i).toLocaleString('default', { month: 'long' })}
                        </option>
                      ))}
                    </select>
                    <select 
                      value={selectedYear} 
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className="filter-select"
                    >
                      {[...Array(5)].map((_, i) => {
                        const year = new Date().getFullYear() - i;
                        return <option key={year} value={year}>{year}</option>;
                      })}
                    </select>
                  </>
                )}

                {historyPeriod === 'custom' && (
                  <div className="date-range-inputs">
                    <input 
                      type="date" 
                      value={startDate} 
                      onChange={(e) => setStartDate(e.target.value)} 
                      className="filter-select"
                    />
                    <span>to</span>
                    <input 
                      type="date" 
                      value={endDate} 
                      onChange={(e) => setEndDate(e.target.value)} 
                      className="filter-select"
                    />
                  </div>
                )}
              </div>
              <div className="export-cluster">
                <button onClick={exportToPDF} className="export-pill pdf">
                  <FileText size={18} />
                  <span>PDF Report</span>
                </button>
                <button onClick={exportToExcel} className="export-pill excel">
                  <TableIcon size={18} />
                  <span>Excel Data</span>
                </button>
              </div>
            </div>
          )}
          {activeTab === 'analysis' && (
            <div className="period-pill-group">
              <button className={period === 'daily' ? 'active' : ''} onClick={() => setPeriod('daily')}>Daily</button>
              <button className={period === 'weekly' ? 'active' : ''} onClick={() => setPeriod('weekly')}>Weekly</button>
              <button className={period === 'monthly' ? 'active' : ''} onClick={() => setPeriod('monthly')}>Monthly</button>
            </div>
          )}
        </div>
      </div>

      <div className="reports-main-stage">
        {loading ? (
          <div className="loading-state">
            <div className="loader-ring"></div>
            <p>Gathering Intelligence...</p>
          </div>
        ) : activeTab === 'history' ? (
          <div className="history-stage animate-fade">
            <div className="glass-table-container">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Invoice / ID</th>
                    <th>Date & Timestamp</th>
                    <th>Cashier</th>
                    <th>Method</th>
                    <th className="text-right">Total Amount</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(h => (
                    <tr key={h._id || h.id} onClick={() => setSelectedSale(h)} style={{ cursor: 'pointer' }}>
                      <td>
                        <div className="invoice-tag">#INV-{h.id || (h._id ? h._id.toString().slice(-6).toUpperCase() : '???')}</div>
                      </td>
                      <td>
                        <div className="timestamp-stack">
                          <span className="date-part">{new Date(h.created_at).toLocaleDateString()}</span>
                          <span className="time-part">{new Date(h.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </td>
                      <td>
                        <div className="cashier-row">
                          <div className="mini-avatar">{h.cashier_name.charAt(0)}</div>
                          <span>{h.cashier_name}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`method-pill ${h.payment_method}`}>
                          {h.payment_method}
                        </span>
                      </td>
                      <td className="text-right">
                        <span className="amount-bold">Rs.{h.total_amount.toLocaleString()}</span>
                      </td>
                      <td>
                        <div className="action-cell">
                          <button 
                            className="details-btn print-direct" 
                            title="Quick Print"
                            onClick={(e) => {
                              e.stopPropagation();
                              api.printReceipt({
                                ...h,
                                saleId: h._id,
                                cashier_name: h.cashier_name
                              });
                            }}
                          >
                            <Printer size={18} />
                          </button>
                          <button className="details-btn">
                            <ChevronRight size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="analysis-stage animate-fade">
            <div className="analysis-top-row">
              <div className="analysis-card main-chart">
                <div className="card-top">
                  <div>
                    <h3>Revenue Insights</h3>
                    <p>Financial growth trend for the selected period</p>
                  </div>
                  <div className={`trend-indicator ${parseFloat(analyticsSummary.growthRate) >= 0 ? 'up' : 'down'}`}>
                    {parseFloat(analyticsSummary.growthRate) >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                    <span>{parseFloat(analyticsSummary.growthRate) >= 0 ? '+' : ''}{analyticsSummary.growthRate}%</span>
                  </div>
                </div>
                <div className="chart-frame">
                  <Line data={chartData} options={chartOptions} />
                </div>
              </div>

              <div className="analysis-card stats-overview">
                <h3>Performance Metrics</h3>
                <div className="metric-list">
                  <div className="metric-item">
                    <span className="metric-label">Avg. Transaction</span>
                    <span className="metric-value">Rs. {analyticsSummary.avgTransaction.toLocaleString()}</span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-label">Total Orders</span>
                    <span className="metric-value">{analyticsSummary.totalOrders}</span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-label">Growth Rate</span>
                    <span className={`metric-value ${parseFloat(analyticsSummary.growthRate) >= 0 ? 'positive' : 'negative'}`}>
                      {parseFloat(analyticsSummary.growthRate) >= 0 ? '+' : ''}{analyticsSummary.growthRate}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="analysis-card best-sellers">
              <div className="card-top">
                <h3>Top Performing Inventory</h3>
                <button className="text-link">View All <ChevronRight size={16} /></button>
              </div>
              <div className="products-rank-grid">
                {bestSellers.slice(0, 5).map((item, idx) => (
                  <div key={item._id || item.id || idx} className="rank-item">
                    <div className="rank-number">0{idx + 1}</div>
                    <div className="rank-details">
                      <span className="rank-name">{item.name}</span>
                      <span className="rank-stats">{item.total_qty} units sold</span>
                    </div>
                    <div className="rank-value">Rs.{item.total_revenue.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedSale && (
        <div className="agro-modal-overlay">
          <div className="agro-modal receipt-modal animate-pop">
            <button className="modal-close-corner" onClick={() => setSelectedSale(null)}>
              <X size={20} />
            </button>
            <div className="receipt-content">
              <div className="receipt-header">
                <div className="biz-branding">
                  <TrendingUp size={32} color="#1b5e20" />
                  <h2>AKS AGRO LANKA</h2>
                  <p>Quality Agricultural Solutions</p>
                </div>
                <div className="receipt-meta">
                  <div className="meta-row">
                    <span>Invoice No:</span>
                    <strong>#INV-{selectedSale.id || (selectedSale._id ? selectedSale._id.toString().slice(-6).toUpperCase() : '???')}</strong>
                  </div>
                  <div className="meta-row">
                    <span>Date:</span>
                    <strong>{new Date(selectedSale.created_at).toLocaleString()}</strong>
                  </div>
                </div>
              </div>

              <div className="receipt-people">
                <div className="person-box">
                  <span className="p-label">Cashier</span>
                  <span className="p-value">{selectedSale.cashier_name}</span>
                </div>
                <div className="person-box">
                  <span className="p-label">Customer</span>
                  <span className="p-value">{selectedSale.customer_name || 'N/A'}</span>
                </div>
              </div>

              <div className="receipt-table-wrapper">
                <table className="receipt-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th className="text-center">Qty</th>
                      <th className="text-right">Price</th>
                      <th className="text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSale.items.map((item, idx) => (
                      <tr key={idx}>
                        <td>{item.name}</td>
                        <td className="text-center">{item.quantity}</td>
                        <td className="text-right">Rs.{item.unit_price.toFixed(2)}</td>
                        <td className="text-right">Rs.{item.subtotal.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="receipt-financials">
                <div className="f-row">
                  <span>Subtotal</span>
                  <span>Rs.{(selectedSale.total_amount + (selectedSale.discount || 0)).toFixed(2)}</span>
                </div>
                <div className="f-row">
                  <span>Discount</span>
                  <span className="neg">- Rs.{(selectedSale.discount || 0).toFixed(2)}</span>
                </div>
                <div className="f-total-row">
                  <span>Grand Total</span>
                  <span className="total-val">Rs.{selectedSale.total_amount.toFixed(2)}</span>
                </div>
              </div>

              <div className="receipt-footer">
                <div className="p-method-badge">
                  {selectedSale.payment_method === 'repayment' ? 'Debt Settlement' : `Paid via ${selectedSale.payment_method.toUpperCase()}`}
                </div>
                <p>Thank you for your business!</p>
              </div>
            </div>

            <div className="modal-actions-tray">
              <button className="agro-btn secondary" onClick={() => setSelectedSale(null)}>Close</button>
              <button className="agro-btn border-btn" onClick={() => downloadSalePDF(selectedSale)}>
                <FileText size={18} />
                <span>Download PDF</span>
              </button>
              <button className="agro-btn primary" onClick={() => {
                api.printReceipt({
                  ...selectedSale,
                  saleId: selectedSale._id,
                  cashier_name: selectedSale.cashier_name
                });
              }}>
                <Printer size={18} />
                <span>Print Receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .reports-wrapper {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .animate-fade {
          animation: fadeIn 0.5s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .reports-nav-shelf {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: white;
          padding: 0.75rem;
          border-radius: 1.5rem;
          border: 1px solid #f1f5f9;
          box-shadow: var(--shadow-sm);
        }

        .tab-buttons {
          display: flex;
          gap: 0.5rem;
        }

        .tab-buttons button {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.875rem 1.5rem;
          border-radius: 1rem;
          border: none;
          background: transparent;
          color: #64748b;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }

        .tab-buttons button.active {
          background: #f0fdf4;
          color: #1b5e20;
        }

        .export-cluster {
          display: flex;
          gap: 0.75rem;
        }

        .export-pill {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          padding: 0.75rem 1.25rem;
          border-radius: 1rem;
          border: 1px solid #e2e8f0;
          background: white;
          font-weight: 700;
          font-size: 0.875rem;
          color: #1b4332;
          cursor: pointer;
          transition: all 0.2s;
        }

        .export-pill:hover {
          border-color: #1b5e20;
          background: #fdfdfb;
        }

        .period-pill-group {
          background: #f8fafc;
          padding: 0.375rem;
          border-radius: 0.875rem;
          display: flex;
          gap: 0.25rem;
        }

        .period-pill-group button {
          padding: 0.5rem 1.25rem;
          border: none;
          background: transparent;
          border-radius: 0.625rem;
          font-weight: 700;
          color: #64748b;
          cursor: pointer;
        }

        .period-pill-group button.active {
          background: white;
          color: #1b4332;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }

        .history-filters {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        .filter-group {
          display: flex;
          gap: 0.5rem;
        }

        .filter-select {
          padding: 0.625rem 1rem;
          border-radius: 0.875rem;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          color: #1b4332;
          font-weight: 600;
          font-size: 0.875rem;
          outline: none;
          cursor: pointer;
          transition: all 0.2s;
        }

        .filter-select:hover, .filter-select:focus {
          border-color: #1b5e20;
          background: white;
        }

        .filter-select.period-type {
          background: #1b5e20;
          color: white;
          border-color: #1b5e20;
        }

        .date-range-inputs {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: #64748b;
          font-weight: 700;
        }

        .glass-table-container {
          background: white;
          border-radius: 2rem;
          border: 1px solid #f1f5f9;
          overflow: hidden;
          box-shadow: var(--shadow-sm);
        }

        .history-table { width: 100%; border-collapse: collapse; text-align: left; }
        .history-table th { 
          background: #fdfdfb; 
          padding: 1.5rem; 
          color: #64748b; 
          font-size: 0.8125rem; 
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid #f1f5f9; 
        }
        .history-table td { padding: 1.25rem 1.5rem; border-bottom: 1px solid #f8fafc; vertical-align: middle; }
        .history-table tr:hover { background: #fdfdfb; }

        .invoice-tag {
          font-weight: 800;
          color: #1b4332;
          background: #ecf3f0;
          padding: 0.375rem 0.75rem;
          border-radius: 0.625rem;
          font-size: 0.875rem;
          display: inline-block;
        }

        .timestamp-stack { display: flex; flex-direction: column; }
        .date-part { font-weight: 700; color: #1b4332; }
        .time-part { font-size: 0.8125rem; color: #94a3b8; font-weight: 600; }

        .cashier-row { display: flex; align-items: center; gap: 0.75rem; font-weight: 700; color: #1b4332; }
        .mini-avatar { 
          width: 32px; height: 32px; background: #f1f5f9; color: #1b5e20; 
          border-radius: 0.5rem; display: flex; align-items: center; justify-content: center;
          font-weight: 900; font-size: 0.875rem;
        }

        .method-pill {
          font-size: 0.75rem;
          font-weight: 800;
          padding: 0.375rem 0.75rem;
          border-radius: 2rem;
          text-transform: uppercase;
          letter-spacing: 0.025em;
        }
        .method-pill.cash { background: #f0fdf4; color: #16a34a; }
        .method-pill.credit { background: #fffbe6; color: #d97706; }
        .method-pill.repayment { background: #f5f3ff; color: #7c3aed; }
        .method-pill.card { background: #eff6ff; color: #3b82f6; }
        .method-pill.other { background: #f1f5f9; color: #64748b; }

        .amount-bold { font-size: 1.125rem; font-weight: 900; color: #1b4332; }
        .text-right { text-align: right; }

        .details-btn { 
          background: none; border: none; color: #cbd5e1; cursor: pointer; padding: 0.5rem; 
          border-radius: 0.5rem; transition: all 0.2s;
        }
        .details-btn:hover { background: #f1f5f9; color: #1b5e20; }
        
        .action-cell {
          display: flex;
          gap: 0.5rem;
          justify-content: flex-end;
        }

        .details-btn.print-direct:hover {
          background: #ecf3f0;
          color: #1b5e20;
        }

        .analysis-top-row {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .analysis-card {
          background: white;
          padding: 2rem;
          border-radius: 2rem;
          border: 1px solid #f1f5f9;
          box-shadow: var(--shadow-sm);
        }

        .card-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 2rem;
        }

        .card-top h3 { font-size: 1.25rem; font-weight: 800; color: #1b4332; margin: 0; }
        .card-top p { color: #64748b; margin-top: 0.25rem; font-size: 0.95rem; }

        .trend-indicator {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.5rem 0.875rem;
          border-radius: 2rem;
          font-weight: 800;
          font-size: 0.875rem;
        }
        .trend-indicator.up { background: #f0fdf4; color: #16a34a; }

        .text-link {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          background: transparent;
          border: none;
          color: #1b5e20;
          font-weight: 800;
          font-size: 0.875rem;
          cursor: pointer;
          padding: 0.5rem 0.75rem;
          border-radius: 0.75rem;
          transition: all 0.2s;
        }
        .text-link:hover {
          background: #f0fdf4;
        }

        .chart-frame { height: 350px; }

        .metric-list { display: flex; flex-direction: column; gap: 1.5rem; margin-top: 1rem; }
        .metric-item { display: flex; flex-direction: column; gap: 0.25rem; padding-bottom: 1.25rem; border-bottom: 1px solid #f8fafc; }
        .metric-label { font-size: 0.875rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
        .metric-value { font-size: 1.75rem; font-weight: 900; color: #1b4332; }
        .metric-value.positive { color: #16a34a; }

        .products-rank-grid { display: flex; flex-direction: column; gap: 1rem; margin-top: 1rem; }
        .rank-item {
          display: flex; align-items: center; gap: 1.5rem; padding: 1.25rem;
          background: #fdfdfb; border-radius: 1.25rem; border: 1px solid #f1f5f9;
          transition: transform 0.2s;
        }
        .rank-item:hover { transform: translateX(10px); border-color: #1b5e20; }
        .rank-number { 
          font-size: 1.5rem; font-weight: 900; color: #cbd5e1; min-width: 40px;
        }
        .rank-details { flex: 1; display: flex; flex-direction: column; }
        .rank-name { font-weight: 800; color: #1b4332; font-size: 1.125rem; }
        .rank-stats { font-size: 0.875rem; color: #64748b; font-weight: 600; }
        .rank-value { font-size: 1.25rem; font-weight: 900; color: #1b5e20; }

        .loading-state { height: 400px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.5rem; color: #94a3b8; font-weight: 700; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes modalPop { from { opacity: 0; scale: 0.9; } to { opacity: 1; scale: 1; } }
        .animate-pop { animation: modalPop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.1) forwards; }

        .agro-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(27, 43, 30, 0.8); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 2000; }
        .agro-modal { background: white; border-radius: 2.5rem; width: 100%; max-width: 600px; padding: 0; box-shadow: 0 40px 60px -15px rgba(0,0,0,0.3); }

        /* Receipt Modal Styles */
        .receipt-modal { max-width: 500px; padding: 0; overflow: hidden; max-height: 95vh; display: flex; flex-direction: column; position: relative; }
        .receipt-content { padding: 2rem 3rem; background: #fff; overflow-y: auto; flex: 1; }
        
        .receipt-header { text-align: center; margin-bottom: 2.5rem; border-bottom: 2px dashed #f1f5f9; padding-bottom: 2rem; }
        .biz-branding h2 { font-size: 1.5rem; font-weight: 900; color: #1b4332; margin: 0.5rem 0 0; }
        .biz-branding p { font-size: 0.875rem; color: #64748b; font-weight: 600; }
        
        .receipt-meta { display: flex; justify-content: space-between; margin-top: 1.5rem; font-size: 0.8125rem; color: #64748b; text-align: left; }
        .meta-row { display: flex; flex-direction: column; gap: 0.25rem; }
        .meta-row strong { color: #1b4332; font-size: 0.95rem; }

        .receipt-people { 
          display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; 
          background: #fdfdfb; padding: 1.25rem; border-radius: 1rem; margin-bottom: 2rem;
        }
        .person-box { display: flex; flex-direction: column; }
        .p-label { font-size: 0.75rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; }
        .p-value { font-weight: 800; color: #1b4332; }

        .receipt-table { width: 100%; border-collapse: collapse; margin-bottom: 2rem; }
        .receipt-table th { text-align: left; font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; padding: 0.75rem 0; border-bottom: 1px solid #f1f5f9; }
        .receipt-table td { padding: 0.875rem 0; font-size: 0.95rem; font-weight: 700; color: #1b4332; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }

        .receipt-financials { border-top: 2px dashed #f1f5f9; padding-top: 1.5rem; display: flex; flex-direction: column; gap: 0.75rem; }
        .f-row { display: flex; justify-content: space-between; font-weight: 700; color: #64748b; }
        .f-row .neg { color: #ef4444; }
        .f-total-row { 
          display: flex; justify-content: space-between; align-items: center; 
          margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #f1f5f9;
        }
        .f-total-row span { font-weight: 800; color: #1b4332; }
        .total-val { font-size: 1.75rem; font-weight: 900; color: #1b5e20; }

        .receipt-footer { text-align: center; margin-top: 2.5rem; color: #94a3b8; }
        .p-method-badge { 
          display: inline-block; padding: 0.5rem 1rem; background: #ecf3f0; 
          color: #1b5e20; border-radius: 2rem; font-size: 0.8125rem; margin-bottom: 1rem;
        }

        .modal-actions-tray { 
          background: #f8fafc; padding: 1.25rem 2rem; 
          display: flex; justify-content: flex-end; gap: 0.75rem;
          border-top: 1px solid #f1f5f9;
          flex-shrink: 0;
        }

        .agro-btn {
          padding: 0.75rem 1.5rem; border-radius: 1rem; font-weight: 800; font-size: 0.9rem;
          cursor: pointer; border: none; display: flex; align-items: center; justify-content: center; gap: 0.75rem; transition: all 0.2s;
        }
        .agro-btn.primary { background: #1b4332; color: white; }
        .agro-btn.secondary { background: #f1f5f9; color: #64748b; }
        .agro-btn.border-btn { background: white; border: 1px solid #e2e8f0; color: #1b4332; }
        .agro-btn.border-btn:hover { border-color: #1b4332; background: #fdfdfb; }

        .modal-close-corner { 
          position: absolute; top: 1.5rem; right: 1.5rem; width: 40px; height: 40px; 
          background: #f8fafc; border: none; border-radius: 50%; color: #94a3b8; 
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          transition: all 0.2s; z-index: 2100;
        }
        .modal-close-corner:hover { background: #fee2e2; color: #ef4444; }

        @media (max-width: 1024px) {
          .glass-table-container { overflow-x: auto; }
          .history-table { min-width: 700px; }
          .analysis-top-row { grid-template-columns: 1fr; }
        }

        @media (max-width: 768px) {
          .reports-nav-shelf { flex-direction: column; gap: 1rem; align-items: stretch; }
          .tab-buttons { flex-direction: column; width: 100%; }
          .tab-buttons button { justify-content: center; }
          .history-filters { flex-direction: column; gap: 1rem; }
          .export-cluster, .period-pill-group, .filter-group { justify-content: center; width: 100%; }
          .filter-select { flex: 1; }
          .chart-frame { height: 250px; }
          .analysis-card { padding: 1.25rem; }
        }
      `}</style>
    </div>
  );
};

export default Reports;
