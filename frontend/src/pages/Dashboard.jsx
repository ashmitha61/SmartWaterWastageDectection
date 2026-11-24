import React, { useState, useEffect } from 'react';
import {
  Trash2,
  CheckCircle2,
  MapPin,
  Users,
  Calendar,
  Clock,
  CheckSquare,
  Scale,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  RotateCw,
  Building2,
  Shield,
  Truck,
  Layers,
  FileText,
  Activity,
  PlusCircle,
  Eye
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  CartesianGrid
} from 'recharts';
import { Link, useOutletContext } from 'react-router-dom';
import { api } from '../services/api';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import FillProgressBar from '../components/FillProgressBar';

const CATEGORY_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'];
const STATUS_COLORS = {
  Pending: '#f59e0b',
  'In Progress': '#3b82f6',
  Completed: '#10b981',
  Cancelled: '#ef4444',
};

const Dashboard = () => {
  const outletCtx = useOutletContext();
  const currentUser = outletCtx?.currentUser || {};
  const role = currentUser?.role || 'Super Admin';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({
    kpis: {
      totalBins: 0,
      activeBins: 0,
      totalLocations: 0,
      activeTeams: 0,
      todaySchedules: 0,
      pendingCollections: 0,
      completedCollections: 0,
      totalWasteCollectedKg: 0,
    },
    charts: {
      categoryWaste: [],
      monthlyWaste: [],
      teamWaste: [],
      scheduleStatus: [],
    },
    recentCollections: [],
    upcomingSchedules: [],
    urgentBins: [],
  });

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.dashboard.getStats();
      if (res.success) {
        setData(res.data);
      } else {
        setError(res.message || 'Unable to retrieve dashboard metrics.');
      }
    } catch (err) {
      console.error('Dashboard load error:', err);
      setError(err.message || 'Failed to connect to MySQL backend API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p className="loading-text">Retrieving real-time MySQL records for {role}...</p>
      </div>
    );
  }

  const { kpis, charts, recentCollections, upcomingSchedules, urgentBins } = data;

  // =========================================================================
  // 1. MUNICIPAL OFFICER DASHBOARD VIEW
  // =========================================================================
  if (role === 'Municipal Officer') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Officer Welcome Banner */}
        <div
          style={{
            padding: '22px 24px',
            background: 'linear-gradient(135deg, #065f46 0%, #047857 100%)',
            borderRadius: '16px',
            color: '#ffffff',
            boxShadow: '0 6px 20px rgba(6, 95, 70, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Building2 size={28} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#a7f3d0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Municipal Officer Portal
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '2px 0 0' }}>
                Welcome, {currentUser?.full_name || 'Municipal Officer'}
              </h2>
              <p style={{ fontSize: '0.86rem', color: '#d1fae5', margin: '4px 0 0' }}>
                Ward Sanitation Audits • Waste Segregation Compliance • Critical Fill Inspections
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <Link to="/bins" className="btn btn-secondary btn-sm" style={{ backgroundColor: '#ffffff', color: '#065f46', border: 'none', fontWeight: 700 }}>
              <Eye size={15} /> Inspect Bins
            </Link>
            <Link to="/reports" className="btn btn-secondary btn-sm" style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.4)' }}>
              <FileText size={15} /> View Reports
            </Link>
          </div>
        </div>

        {/* Critical Overfill Alert for Officer */}
        {urgentBins.length > 0 && (
          <div className="alert-banner alert-warning">
            <AlertTriangle size={20} />
            <div style={{ flex: 1 }}>
              <strong>Municipal Alert: {urgentBins.length} Bins Exceeding 80% Fill Capacity</strong>
              <div style={{ fontSize: '0.82rem', marginTop: '2px' }}>
                Inspection required for overflow risk points across city wards before next collection cycle.
              </div>
            </div>
            <Link to="/bins" className="btn btn-primary btn-sm">
              Review Bins
            </Link>
          </div>
        )}

        {/* Municipal Officer KPIs */}
        <div className="stats-grid">
          <StatCard
            title="Monitored Locations"
            value={kpis.totalLocations}
            icon={MapPin}
            color="#0284c7"
            bgColor="#e0f2fe"
            subtext="Active municipal wards & zones"
          />
          <StatCard
            title="Total City Bins"
            value={kpis.totalBins}
            icon={Trash2}
            color="#16a34a"
            bgColor="#dcfce7"
            subtext={`${kpis.activeBins} currently operational`}
          />
          <StatCard
            title="Critical Overfill Bins"
            value={urgentBins.length}
            icon={AlertTriangle}
            color="#dc2626"
            bgColor="#fee2e2"
            subtext="Bins requiring immediate action"
          />
          <StatCard
            title="Total Waste Diverted"
            value={`${Number(kpis.totalWasteCollectedKg).toLocaleString()} kg`}
            icon={Scale}
            color="#059669"
            bgColor="#d1fae5"
            subtext="City-wide collection haul"
          />
        </div>

        {/* Segregation & Waste Analysis */}
        <div className="charts-grid">
          {/* Category Segregation Breakdown */}
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Waste Segregation by Category</h3>
                <p className="card-subtitle">Audited waste volume per stream (Organic, Plastic, Paper, Metal)</p>
              </div>
            </div>
            <div style={{ height: '300px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.categoryWaste} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="category_name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(val) => [`${val} kg`, 'Collected Waste']} />
                  <Bar dataKey="total_kg" radius={[6, 6, 0, 0]}>
                    {charts.categoryWaste.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly City Trends */}
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Monthly Waste Generation Trend</h3>
                <p className="card-subtitle">Monthly municipal waste trendline</p>
              </div>
            </div>
            <div style={{ height: '300px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.monthlyWaste} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(val) => [`${val} kg`, 'Monthly Waste']} />
                  <Area type="monotone" dataKey="total_kg" stroke="#16a34a" fill="#dcfce7" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Priority Bins Inspection Table */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">High-Fill Receptacle Inspection Table</h3>
              <p className="card-subtitle">Bins prioritized for municipal overflow prevention</p>
            </div>
            <Link to="/bins" className="btn btn-secondary btn-sm">
              All Bins <ArrowRight size={14} />
            </Link>
          </div>

          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Bin Code</th>
                  <th>Category</th>
                  <th>Ward / Area</th>
                  <th>Capacity</th>
                  <th>Fill Level</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {urgentBins.map((bin) => (
                  <tr key={bin.bin_id}>
                    <td>
                      <span style={{ fontWeight: 700, color: '#15803d' }}>{bin.bin_code}</span>
                    </td>
                    <td>{bin.category_name}</td>
                    <td>{bin.area_name}</td>
                    <td>{bin.capacity_kg} kg</td>
                    <td style={{ minWidth: '150px' }}>
                      <FillProgressBar fillLevel={bin.fill_level} />
                    </td>
                    <td>
                      <StatusBadge status={bin.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. FIELD DISPATCHER DASHBOARD VIEW
  // =========================================================================
  if (role === 'Dispatcher') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Dispatcher Welcome Banner */}
        <div
          style={{
            padding: '22px 24px',
            background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)',
            borderRadius: '16px',
            color: '#ffffff',
            boxShadow: '0 6px 20px rgba(30, 58, 138, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Truck size={28} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#bfdbfe', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Field Dispatch Operations
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '2px 0 0' }}>
                Welcome, {currentUser?.full_name || 'Field Dispatcher'}
              </h2>
              <p style={{ fontSize: '0.86rem', color: '#dbeafe', margin: '4px 0 0' }}>
                Fleet Routing • Schedule Dispatching • Collection Run Logging
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <Link to="/schedules" className="btn btn-secondary btn-sm" style={{ backgroundColor: '#ffffff', color: '#1e3a8a', border: 'none', fontWeight: 700 }}>
              <PlusCircle size={15} /> Create Schedule
            </Link>
            <Link to="/records" className="btn btn-secondary btn-sm" style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.4)' }}>
              <CheckSquare size={15} /> Log Pickup
            </Link>
          </div>
        </div>

        {/* Dispatcher KPIs */}
        <div className="stats-grid">
          <StatCard
            title="Active Field Teams"
            value={kpis.activeTeams}
            icon={Users}
            color="#2563eb"
            bgColor="#dbeafe"
            subtext="Available collection squads"
          />
          <StatCard
            title="Today's Schedules"
            value={kpis.todaySchedules}
            icon={Calendar}
            color="#8b5cf6"
            bgColor="#ede9fe"
            subtext="Planned collection runs"
          />
          <StatCard
            title="Pending Runs"
            value={kpis.pendingCollections}
            icon={Clock}
            color="#d97706"
            bgColor="#fef3c7"
            subtext="Missions queued for dispatch"
          />
          <StatCard
            title="Completed Runs"
            value={kpis.completedCollections}
            icon={CheckSquare}
            color="#15803d"
            bgColor="#dcfce7"
            subtext="Fulfilled collection missions"
          />
        </div>

        {/* Live Schedules Board & Status Distribution */}
        <div className="charts-grid">
          {/* Schedule Status Distribution */}
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Route Status Distribution</h3>
                <p className="card-subtitle">Pending, active, and completed runs</p>
              </div>
            </div>
            <div style={{ height: '300px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.scheduleStatus}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={105}
                    paddingAngle={4}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {charts.scheduleStatus.map((entry) => (
                      <Cell key={`status-${entry.status}`} fill={STATUS_COLORS[entry.status] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Team Waste Collected */}
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Team Performance Haul (kg)</h3>
                <p className="card-subtitle">Total waste gathered per collection squad</p>
              </div>
            </div>
            <div style={{ height: '300px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.teamWaste} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="team_name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(val) => [`${val} kg`, 'Hauled Waste']} />
                  <Bar dataKey="total_kg" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Live Dispatch Schedule Board */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Live Dispatch Schedule Board</h3>
              <p className="card-subtitle">Active and upcoming pickup routes with bin progress</p>
            </div>
            <Link to="/schedules" className="btn btn-secondary btn-sm">
              Manage Schedules <ArrowRight size={14} />
            </Link>
          </div>

          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Time & Date</th>
                  <th>Assigned Location</th>
                  <th>Assigned Squad</th>
                  <th>Squad Contact</th>
                  <th>Bin Pickup Progress</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {upcomingSchedules.map((sch) => (
                  <tr key={sch.schedule_id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{sch.collection_date}</div>
                      <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{sch.start_time}</div>
                    </td>
                    <td>{sch.area_name}</td>
                    <td>
                      <strong>{sch.team_name}</strong>
                    </td>
                    <td>{sch.contact_number}</td>
                    <td>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#16a34a' }}>
                        {sch.collected_bins} / {sch.total_bins} bins
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={sch.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Collections Table */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Recent Verified Collections</h3>
              <p className="card-subtitle">Latest recorded waste haul records</p>
            </div>
            <Link to="/records" className="btn btn-secondary btn-sm">
              Log Record <ArrowRight size={14} />
            </Link>
          </div>

          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Bin Code</th>
                  <th>Category</th>
                  <th>Location</th>
                  <th>Quantity</th>
                  <th>Team</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {recentCollections.map((rec) => (
                  <tr key={rec.record_id}>
                    <td>
                      <span style={{ fontWeight: 700, color: '#15803d' }}>{rec.bin_code}</span>
                    </td>
                    <td>{rec.category_name}</td>
                    <td>{rec.area_name}</td>
                    <td>
                      <strong style={{ color: '#0f172a' }}>{rec.collected_quantity_kg} kg</strong>
                    </td>
                    <td>{rec.team_name}</td>
                    <td style={{ fontSize: '0.78rem', color: '#64748b' }}>{rec.remarks || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 3. SUPER ADMIN DASHBOARD VIEW (Full System Governance)
  // =========================================================================
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Admin Welcome Banner */}
      <div
        style={{
          padding: '22px 24px',
          background: 'linear-gradient(135deg, #14532d 0%, #16a34a 100%)',
          borderRadius: '16px',
          color: '#ffffff',
          boxShadow: '0 6px 20px rgba(22, 163, 74, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '12px',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Shield size={28} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#bbf7d0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Super Administrator Console
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '2px 0 0' }}>
              Welcome, {currentUser?.full_name || 'Administrator'}
            </h2>
            <p style={{ fontSize: '0.86rem', color: '#dcfce7', margin: '4px 0 0' }}>
              Full System Access • All 8 DBMS Modules • Complete Analytics & Infrastructure Controls
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadDashboardData}
          className="btn btn-secondary btn-sm"
          style={{ backgroundColor: '#ffffff', color: '#15803d', border: 'none', fontWeight: 700 }}
        >
          <RotateCw size={14} /> Refresh Live MySQL
        </button>
      </div>

      {/* Urgent Overfill Alert Banner */}
      {urgentBins.length > 0 && (
        <div className="alert-banner alert-warning">
          <AlertTriangle size={20} />
          <div style={{ flex: 1 }}>
            <strong>Attention: {urgentBins.length} Bins Require Immediate Collection</strong> (Fill level &ge; 80%).
            Dispatched teams should service these high-risk overflow points first.
          </div>
          <Link to="/schedules" className="btn btn-primary btn-sm">
            Dispatch Team
          </Link>
        </div>
      )}

      {/* 8 Dynamic Statistics retrieved from MySQL */}
      <div className="stats-grid">
        <StatCard
          title="Total Bins"
          value={kpis.totalBins}
          icon={Trash2}
          color="#16a34a"
          bgColor="#dcfce7"
          subtext="Smart receptacles in city"
        />
        <StatCard
          title="Active Bins"
          value={kpis.activeBins}
          icon={CheckCircle2}
          color="#0d9488"
          bgColor="#ccfbf1"
          subtext="Operational and online"
        />
        <StatCard
          title="Total Locations"
          value={kpis.totalLocations}
          icon={MapPin}
          color="#0284c7"
          bgColor="#e0f2fe"
          subtext="Covered zones & wards"
        />
        <StatCard
          title="Active Teams"
          value={kpis.activeTeams}
          icon={Users}
          color="#6366f1"
          bgColor="#e0e7ff"
          subtext="Field collection squads"
        />
        <StatCard
          title="Today's Schedules"
          value={kpis.todaySchedules}
          icon={Calendar}
          color="#8b5cf6"
          bgColor="#ede9fe"
          subtext="Runs scheduled today"
        />
        <StatCard
          title="Pending Runs"
          value={kpis.pendingCollections}
          icon={Clock}
          color="#d97706"
          bgColor="#fef3c7"
          subtext="Pending & in-progress"
        />
        <StatCard
          title="Completed Runs"
          value={kpis.completedCollections}
          icon={CheckSquare}
          color="#15803d"
          bgColor="#dcfce7"
          subtext="Successfully executed"
        />
        <StatCard
          title="Waste Collected"
          value={`${Number(kpis.totalWasteCollectedKg).toLocaleString()} kg`}
          icon={Scale}
          color="#059669"
          bgColor="#d1fae5"
          subtext="Total verified haul"
        />
      </div>

      {/* Charts Section: 4 Recharts */}
      <div className="charts-grid">
        {/* Chart 1: Waste by Category */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Waste Collected by Category</h3>
              <p className="card-subtitle">Aggregated weight (kg) segregated by waste class</p>
            </div>
          </div>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.categoryWaste} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="category_name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(val) => [`${val} kg`, 'Collected Waste']} />
                <Bar dataKey="total_kg" radius={[6, 6, 0, 0]}>
                  {charts.categoryWaste.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Monthly Waste Collection */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Monthly Waste Trends</h3>
              <p className="card-subtitle">Temporal trend of waste tonnage</p>
            </div>
          </div>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.monthlyWaste} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(val) => [`${val} kg`, 'Monthly Waste']} />
                <Area type="monotone" dataKey="total_kg" stroke="#16a34a" fill="#dcfce7" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Collection by Team */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Team Performance (kg)</h3>
              <p className="card-subtitle">Total waste gathered per collection squad</p>
            </div>
          </div>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.teamWaste} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="team_name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(val) => [`${val} kg`, 'Hauled Waste']} />
                <Bar dataKey="total_kg" fill="#0d9488" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Pending vs Completed Schedules */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Schedule Status Distribution</h3>
              <p className="card-subtitle">Proportion of collection missions by status</p>
            </div>
          </div>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts.scheduleStatus}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={105}
                  paddingAngle={4}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {charts.scheduleStatus.map((entry) => (
                    <Cell key={`status-${entry.status}`} fill={STATUS_COLORS[entry.status] || '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Section: Upcoming Schedules & Recent Collection Records */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px' }}>
        {/* Upcoming Schedules Card */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Upcoming Schedules</h3>
              <p className="card-subtitle">Next dispatch missions to be fulfilled</p>
            </div>
            <Link to="/schedules" className="btn btn-secondary btn-sm">
              View All <ArrowRight size={14} />
            </Link>
          </div>

          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Location</th>
                  <th>Team</th>
                  <th>Bins Progress</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {upcomingSchedules.map((sch) => (
                  <tr key={sch.schedule_id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{sch.collection_date}</div>
                      <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{sch.start_time}</div>
                    </td>
                    <td>{sch.area_name}</td>
                    <td>{sch.team_name}</td>
                    <td>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#16a34a' }}>
                        {sch.collected_bins} / {sch.total_bins} bins
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={sch.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Collections Card */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Recent Verified Collections</h3>
              <p className="card-subtitle">Latest recorded waste haul records</p>
            </div>
            <Link to="/records" className="btn btn-secondary btn-sm">
              View All <ArrowRight size={14} />
            </Link>
          </div>

          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Bin Code</th>
                  <th>Category</th>
                  <th>Location</th>
                  <th>Quantity</th>
                  <th>Team</th>
                </tr>
              </thead>
              <tbody>
                {recentCollections.map((rec) => (
                  <tr key={rec.record_id}>
                    <td>
                      <span style={{ fontWeight: 700, color: '#15803d' }}>{rec.bin_code}</span>
                    </td>
                    <td>{rec.category_name}</td>
                    <td>{rec.area_name}</td>
                    <td>
                      <strong style={{ color: '#0f172a' }}>{rec.collected_quantity_kg} kg</strong>
                    </td>
                    <td>{rec.team_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
