import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Scale,
  Calendar,
  Layers,
  MapPin,
  Users,
  Printer,
  RotateCw,
  TrendingUp,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { api } from '../services/api';
import StatCard from '../components/StatCard';
import Toast from '../components/Toast';

const CATEGORY_COLORS = ['#16a34a', '#2563eb', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'];

const Reports = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('category'); // 'category', 'location', 'team', 'daily', 'monthly'
  const [toast, setToast] = useState({ message: '', type: 'success' });

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const res = await api.reports.getAnalytics();
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      setToast({ message: err.message || 'Failed to load report analytics from MySQL.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <RotateCw size={36} className="live-dot" style={{ margin: '0 auto 16px', color: '#16a34a' }} />
        <h3 style={{ fontSize: '1.1rem', color: '#1e293b' }}>Generating SQL Analytical Reports...</h3>
        <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '6px' }}>
          Computing JOIN, SUM, COUNT, AVG, and GROUP BY metrics from MySQL
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="empty-state">
        <AlertCircle size={36} color="#ef4444" />
        <h4 className="empty-title">Analytics Unavailable</h4>
        <p className="empty-description">Could not load report queries from backend database.</p>
        <button type="button" className="btn btn-primary btn-sm" onClick={loadReports}>
          Retry Query
        </button>
      </div>
    );
  }

  const { summary, wasteByCategory, wasteByLocation, wasteByTeam, dailyReport, monthlyReport, schedulesSummary } = data;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'success' })}
      />

      {/* Top Header & Export Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}>
            Executive Municipal Waste Reports
          </h2>
          <p style={{ fontSize: '0.84rem', color: '#64748b' }}>
            Comprehensive analytics derived from relational MySQL queries for DBMS evaluation
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={loadReports} title="Recalculate Queries">
            <RotateCw size={15} /> Recalculate
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={handlePrint}>
            <Printer size={15} /> Print Report
          </button>
        </div>
      </div>

      {/* Summary KPI Cards using SQL Aggregate Functions */}
      <div className="stats-grid">
        <StatCard
          title="Total Waste Collected"
          value={`${Number(summary?.total_waste_kg || 0).toLocaleString()} kg`}
          icon={Scale}
          color="#15803d"
          bgColor="#dcfce7"
          subtext="SUM(collected_quantity_kg)"
        />
        <StatCard
          title="Total Collections"
          value={summary?.total_collection_events || 0}
          icon={Calendar}
          color="#0284c7"
          bgColor="#e0f2fe"
          subtext="COUNT(record_id)"
        />
        <StatCard
          title="Average Haul Per Run"
          value={`${summary?.avg_waste_per_collection_kg || 0} kg`}
          icon={TrendingUp}
          color="#7c3aed"
          bgColor="#f3e8ff"
          subtext="AVG(collected_quantity_kg)"
        />
        <StatCard
          title="Serviced Bins / Areas"
          value={`${summary?.distinct_bins_serviced || 0} / ${summary?.distinct_locations_serviced || 0}`}
          icon={MapPin}
          color="#b45309"
          bgColor="#fef3c7"
          subtext="COUNT(DISTINCT)"
        />
      </div>

      {/* Navigation Tabs for Different Report Dimensions */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #e2e8f0', paddingBottom: '2px', flexWrap: 'wrap' }}>
        {[
          { key: 'category', label: 'By Category', icon: Layers },
          { key: 'location', label: 'By Location', icon: MapPin },
          { key: 'team', label: 'By Squad / Team', icon: Users },
          { key: 'daily', label: 'Daily Collection Trend', icon: Calendar },
          { key: 'monthly', label: 'Monthly Report', icon: TrendingUp },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontSize: '0.88rem',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#15803d' : '#64748b',
                borderBottom: isActive ? '3px solid #15803d' : '3px solid transparent',
                marginBottom: '-2px',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: Waste Collected By Category */}
      {activeTab === 'category' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="charts-grid">
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Waste Distribution by Category</h3>
              </div>
              <div style={{ height: '320px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={wasteByCategory}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="category_name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(val) => [`${val} kg`, 'Waste Collected']} />
                    <Bar dataKey="total_kg" radius={[6, 6, 0, 0]}>
                      {wasteByCategory.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Category Proportions (%)</h3>
              </div>
              <div style={{ height: '320px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={wasteByCategory}
                      dataKey="total_kg"
                      nameKey="category_name"
                      cx="50%"
                      cy="50%"
                      outerRadius={105}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                    >
                      {wasteByCategory.map((_, index) => (
                        <Cell key={`pie-cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val) => [`${val} kg`, 'Weight']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Waste Category SQL Summary Table</h3>
            </div>
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Category ID</th>
                    <th>Category Name</th>
                    <th>Total Pickups (COUNT)</th>
                    <th>Total Weight (SUM kg)</th>
                    <th>Average Weight (AVG kg)</th>
                    <th>Percentage of Municipal Haul</th>
                  </tr>
                </thead>
                <tbody>
                  {wasteByCategory.map((cat) => (
                    <tr key={cat.category_id}>
                      <td>#{cat.category_id}</td>
                      <td>
                        <strong style={{ color: '#15803d' }}>{cat.category_name}</strong>
                      </td>
                      <td>{cat.total_pickups} pickups</td>
                      <td>
                        <strong>{Number(cat.total_kg).toLocaleString()} kg</strong>
                      </td>
                      <td>{cat.avg_kg_per_pickup} kg</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ flex: 1, height: '6px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${cat.percentage_of_total || 0}%`, background: '#16a34a' }} />
                          </div>
                          <span style={{ fontWeight: 700, fontSize: '0.8rem' }}>{cat.percentage_of_total || 0}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Waste Collected By Location */}
      {activeTab === 'location' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Total Collected Waste by Geographical Area</h3>
            </div>
            <div style={{ height: '320px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={wasteByLocation}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="area_name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(val) => [`${val} kg`, 'Waste Weight']} />
                  <Bar dataKey="total_kg" fill="#0284c7" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Location Analytical Breakdown</h3>
            </div>
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Location ID</th>
                    <th>Area Name</th>
                    <th>City / Pincode</th>
                    <th>Bins Installed</th>
                    <th>Collections Done</th>
                    <th>Total Waste (kg)</th>
                    <th>Avg Waste / Pickup</th>
                  </tr>
                </thead>
                <tbody>
                  {wasteByLocation.map((loc) => (
                    <tr key={loc.location_id}>
                      <td>#{loc.location_id}</td>
                      <td><strong>{loc.area_name}</strong></td>
                      <td>{loc.city} - {loc.pincode}</td>
                      <td>{loc.total_bins_installed} bins</td>
                      <td>{loc.total_collections} runs</td>
                      <td><strong style={{ color: '#0284c7' }}>{Number(loc.total_kg).toLocaleString()} kg</strong></td>
                      <td>{loc.avg_kg} kg</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Waste Collected By Team */}
      {activeTab === 'team' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Crew Waste Throughput & Performance</h3>
            </div>
            <div style={{ height: '320px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={wasteByTeam}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="team_name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(val) => [`${val} kg`, 'Collected Waste']} />
                  <Bar dataKey="total_kg_collected" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Collection Teams Productivity Table</h3>
            </div>
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Team ID</th>
                    <th>Team Name</th>
                    <th>Leader</th>
                    <th>Crew Size</th>
                    <th>Total Pickups</th>
                    <th>Total Waste Collected (kg)</th>
                    <th>Average Per Run</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {wasteByTeam.map((t) => (
                    <tr key={t.team_id}>
                      <td>#{t.team_id}</td>
                      <td><strong>{t.team_name}</strong></td>
                      <td>{t.team_leader}</td>
                      <td>{t.team_size} members</td>
                      <td>{t.total_collections_done}</td>
                      <td><strong style={{ color: '#15803d' }}>{Number(t.total_kg_collected).toLocaleString()} kg</strong></td>
                      <td>{t.avg_kg_per_run} kg</td>
                      <td>{t.team_status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Daily Collection Report */}
      {activeTab === 'daily' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Daily Collection Trend (Last 14 Days)</h3>
            </div>
            <div style={{ height: '320px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyReport}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="formatted_date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(val) => [`${val} kg`, 'Daily Waste']} />
                  <Line type="monotone" dataKey="daily_total_kg" stroke="#16a34a" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Daily Log Audit</h3>
            </div>
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Pickups Count</th>
                    <th>Daily Haul (kg)</th>
                    <th>Active Teams</th>
                    <th>Bins Cleared</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyReport.map((d) => (
                    <tr key={d.collection_date}>
                      <td><strong>{d.formatted_date}</strong></td>
                      <td>{d.collections_count} events</td>
                      <td><strong style={{ color: '#16a34a' }}>{d.daily_total_kg} kg</strong></td>
                      <td>{d.active_teams} squads</td>
                      <td>{d.bins_cleared} bins</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: Monthly Report */}
      {activeTab === 'monthly' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Monthly Aggregated Report</h3>
            </div>
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Total Collections (COUNT)</th>
                    <th>Total Weight Collected (SUM kg)</th>
                    <th>Average Weight / Pickup (AVG kg)</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyReport.map((m) => (
                    <tr key={m.month_key}>
                      <td><strong>{m.month_name}</strong></td>
                      <td>{m.total_pickups} pickups</td>
                      <td><strong style={{ color: '#15803d' }}>{Number(m.monthly_total_kg).toLocaleString()} kg</strong></td>
                      <td>{m.avg_pickup_weight_kg} kg</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Schedule Status Performance Summary */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Schedule Execution Efficiency</h3>
            </div>
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Schedule Status</th>
                    <th>Count</th>
                    <th>Percentage (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {schedulesSummary.map((s) => (
                    <tr key={s.status}>
                      <td><strong>{s.status}</strong></td>
                      <td>{s.total_schedules} runs</td>
                      <td>{s.percentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
