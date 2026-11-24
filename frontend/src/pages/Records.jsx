import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  Plus,
  Search,
  Filter,
  Trash2,
  RotateCw,
  Scale,
  Calendar,
  Download,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { api } from '../services/api';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import Toast from '../components/Toast';

const Records = () => {
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({ totalCollectedKg: 0, averageCollectedKg: 0, totalRecords: 0 });
  const [bins, setBins] = useState([]);
  const [teams, setTeams] = useState([]);
  const [locations, setLocations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [search, setSearch] = useState('');

  // Log Collection Modal
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    bin_id: '',
    team_id: '',
    schedule_id: '',
    collected_quantity_kg: '',
    collection_datetime: new Date().toISOString().slice(0, 16),
    remarks: '',
    reset_fill_level: 0,
  });

  const [selectedBinDetails, setSelectedBinDetails] = useState(null);

  // Delete Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);

  useEffect(() => {
    loadLookups();
    loadRecords();
  }, []);

  const loadLookups = async () => {
    try {
      const [binsRes, teamsRes, locRes, catRes, schRes] = await Promise.all([
        api.bins.getAll(),
        api.teams.getAll(),
        api.locations.getAll(),
        api.categories.getAll(),
        api.schedules.getAll({ status: 'In Progress' }),
      ]);
      if (binsRes.success) setBins(binsRes.data);
      if (teamsRes.success) setTeams(teamsRes.data);
      if (locRes.success) setLocations(locRes.data);
      if (catRes.success) setCategories(catRes.data);
      if (schRes.success) setSchedules(schRes.data);
    } catch (err) {
      console.error('Failed to load lookup data:', err);
    }
  };

  const loadRecords = async () => {
    setLoading(true);
    try {
      const params = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (selectedTeam) params.team_id = selectedTeam;
      if (selectedLocation) params.location_id = selectedLocation;
      if (selectedCategory) params.category_id = selectedCategory;
      if (search) params.search = search;

      const res = await api.records.getAll(params);
      if (res.success) {
        setRecords(res.data);
        if (res.summary) setSummary(res.summary);
      }
    } catch (err) {
      setToast({ message: err.message || 'Failed to fetch collection logs.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleBinSelectChange = (binId) => {
    const selected = bins.find((b) => b.bin_id === parseInt(binId, 10));
    setSelectedBinDetails(selected || null);

    // Auto-calculate suggested quantity based on current fill level and capacity
    let suggestedQty = '';
    if (selected) {
      const estimatedWeight = ((parseFloat(selected.fill_level) / 100) * parseFloat(selected.capacity_kg)).toFixed(1);
      suggestedQty = estimatedWeight > 0 ? estimatedWeight : '';
    }

    setFormData((prev) => ({
      ...prev,
      bin_id: binId,
      collected_quantity_kg: suggestedQty,
    }));
  };

  const openLogModal = () => {
    const defaultBin = bins.length > 0 ? bins[0] : null;
    setSelectedBinDetails(defaultBin);

    let initialQty = '';
    if (defaultBin) {
      const est = ((parseFloat(defaultBin.fill_level) / 100) * parseFloat(defaultBin.capacity_kg)).toFixed(1);
      initialQty = est > 0 ? est : '';
    }

    setFormData({
      bin_id: defaultBin ? defaultBin.bin_id : '',
      team_id: teams.length > 0 ? teams[0].team_id : '',
      schedule_id: '',
      collected_quantity_kg: initialQty,
      collection_datetime: new Date().toISOString().slice(0, 16),
      remarks: '',
      reset_fill_level: 0,
    });
    setIsLogModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    if (!formData.bin_id || !formData.team_id || !formData.collected_quantity_kg) {
      setToast({ message: 'Bin, Team, and Collected Quantity (kg) are required.', type: 'error' });
      return;
    }

    const qty = parseFloat(formData.collected_quantity_kg);
    if (selectedBinDetails && qty > parseFloat(selectedBinDetails.capacity_kg)) {
      setToast({
        message: `Validation Error: Collected weight (${qty} kg) cannot exceed bin maximum capacity (${selectedBinDetails.capacity_kg} kg).`,
        type: 'error',
      });
      return;
    }

    try {
      const res = await api.records.create(formData);
      setToast({
        message: res.message || 'Collection recorded and MySQL transaction committed.',
        type: 'success',
      });
      setIsLogModalOpen(false);
      loadRecords();
      loadLookups(); // Refresh bins fill levels
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
    }
  };

  const confirmDelete = (rec) => {
    setRecordToDelete(rec);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!recordToDelete) return;
    try {
      await api.records.delete(recordToDelete.record_id);
      setToast({ message: `Record #${recordToDelete.record_id} deleted.`, type: 'success' });
      setIsDeleteModalOpen(false);
      loadRecords();
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
      setIsDeleteModalOpen(false);
    }
  };

  // Export Records as CSV
  const exportToCSV = () => {
    if (records.length === 0) {
      setToast({ message: 'No records to export.', type: 'error' });
      return;
    }

    const headers = ['Record ID,Collection Date Time,Bin Code,Waste Category,Location,Collected Quantity (kg),Assigned Team,Remarks'];
    const rows = records.map((r) =>
      [
        r.record_id,
        `"${r.collection_datetime}"`,
        r.bin_code,
        `"${r.category_name}"`,
        `"${r.area_name}"`,
        r.collected_quantity_kg,
        `"${r.team_name}"`,
        `"${(r.remarks || '').replace(/"/g, '""')}"`,
      ].join(',')
    );

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `smart_waste_collections_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'success' })}
      />

      {/* Summary KPI Cards for Records */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        <div className="stat-card" style={{ padding: '16px 20px' }}>
          <div className="stat-icon-wrapper" style={{ background: '#dcfce7', color: '#16a34a', width: '44px', height: '44px' }}>
            <Scale size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Verified Haul</span>
            <span className="stat-value" style={{ fontSize: '1.4rem' }}>{summary.totalCollectedKg.toLocaleString()} kg</span>
          </div>
        </div>

        <div className="stat-card" style={{ padding: '16px 20px' }}>
          <div className="stat-icon-wrapper" style={{ background: '#e0f2fe', color: '#0284c7', width: '44px', height: '44px' }}>
            <ClipboardList size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Clearances</span>
            <span className="stat-value" style={{ fontSize: '1.4rem' }}>{summary.totalRecords} Events</span>
          </div>
        </div>

        <div className="stat-card" style={{ padding: '16px 20px' }}>
          <div className="stat-icon-wrapper" style={{ background: '#fef3c7', color: '#d97706', width: '44px', height: '44px' }}>
            <CheckCircle2 size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Average Pickup</span>
            <span className="stat-value" style={{ fontSize: '1.4rem' }}>{summary.averageCollectedKg} kg</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <form onSubmit={(e) => { e.preventDefault(); loadRecords(); }} className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search by bin code, location, or remarks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>

        <div className="filter-controls">
          <input
            type="date"
            className="select-control"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            title="Start Date"
          />

          <input
            type="date"
            className="select-control"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            title="End Date"
          />

          <select
            className="select-control"
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
          >
            <option value="">All Locations</option>
            {locations.map((loc) => (
              <option key={loc.location_id} value={loc.location_id}>
                {loc.area_name}
              </option>
            ))}
          </select>

          <select
            className="select-control"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.category_id} value={cat.category_id}>
                {cat.category_name}
              </option>
            ))}
          </select>

          <select
            className="select-control"
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
          >
            <option value="">All Teams</option>
            {teams.map((t) => (
              <option key={t.team_id} value={t.team_id}>
                {t.team_name}
              </option>
            ))}
          </select>

          <button type="button" className="btn btn-secondary btn-sm" onClick={loadRecords}>
            <Filter size={15} /> Apply
          </button>

          <button type="button" className="btn btn-secondary btn-sm" onClick={exportToCSV} title="Export CSV for viva">
            <Download size={15} /> CSV
          </button>

          <button type="button" className="btn btn-primary" onClick={openLogModal}>
            <Plus size={16} /> Record Collection
          </button>
        </div>
      </div>

      {/* Main Records Table Card */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">Collection Records Audit Log ({records.length})</h3>
            <p className="card-subtitle">Permanent historical log with capacity verification and transactions</p>
          </div>
          <button type="button" className="btn-icon" onClick={loadRecords} title="Refresh Records">
            <RotateCw size={17} />
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <RotateCw size={28} className="live-dot" style={{ margin: '0 auto', color: '#16a34a' }} />
            <p style={{ marginTop: '10px', color: '#64748b' }}>Loading verified collections from MySQL...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <ClipboardList size={28} />
            </div>
            <h4 className="empty-title">No Collection Records Found</h4>
            <p className="empty-description">
              No collection events match your filters. Click "Record Collection" to log a bin pickup.
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Record ID</th>
                  <th>Date & Time</th>
                  <th>Bin Code</th>
                  <th>Category</th>
                  <th>Location</th>
                  <th>Collected (kg)</th>
                  <th>Team</th>
                  <th>Schedule Ref</th>
                  <th>Remarks</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.record_id}>
                    <td>
                      <strong style={{ color: '#15803d' }}>#{r.record_id}</strong>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.collection_datetime}</div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: '#047857' }}>{r.bin_code}</span>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Cap: {r.capacity_kg} kg</div>
                    </td>
                    <td>{r.category_name}</td>
                    <td>{r.area_name}</td>
                    <td>
                      <span
                        style={{
                          background: '#dcfce7',
                          color: '#15803d',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                        }}
                      >
                        {r.collected_quantity_kg} kg
                      </span>
                    </td>
                    <td>{r.team_name}</td>
                    <td>
                      {r.schedule_id ? (
                        <span style={{ fontSize: '0.78rem', color: '#0369a1', fontWeight: 600 }}>
                          Schedule #{r.schedule_id}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>On-demand</span>
                      )}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: '#475569', maxWidth: '200px' }}>
                      {r.remarks || '—'}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn-icon delete"
                        title="Delete Record (Audit Correction)"
                        onClick={() => confirmDelete(r)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Collection Modal */}
      <Modal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        title="Record Waste Collection (MySQL Transaction)"
        size="lg"
      >
        <form onSubmit={handleFormSubmit}>
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: '8px',
              color: '#065f46',
              fontSize: '0.82rem',
              marginBottom: '16px',
            }}
          >
            <strong>DBMS Transaction Note:</strong> Submitting this form runs an atomic MySQL transaction that:
            (1) Inserts into <code>collection_records</code>, (2) Resets the bin's fill level, and (3) Marks the bin as collected in <code>schedule_bins</code> and auto-completes the schedule if all bins are done.
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Select Bin Code*</label>
              <select
                className="form-control"
                value={formData.bin_id}
                onChange={(e) => handleBinSelectChange(e.target.value)}
                required
              >
                <option value="">Select Bin</option>
                {bins.map((b) => (
                  <option key={b.bin_id} value={b.bin_id}>
                    {b.bin_code} - {b.area_name} ({b.category_name}, Fill: {b.fill_level}%)
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Responsible Team*</label>
              <select
                className="form-control"
                value={formData.team_id}
                onChange={(e) => setFormData({ ...formData, team_id: e.target.value })}
                required
              >
                <option value="">Select Collection Team</option>
                {teams.map((t) => (
                  <option key={t.team_id} value={t.team_id}>
                    {t.team_name} (Leader: {t.team_leader})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedBinDetails && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '10px',
                padding: '10px 14px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                margin: '12px 0',
                fontSize: '0.8rem',
              }}
            >
              <div><strong>Capacity:</strong> {selectedBinDetails.capacity_kg} kg</div>
              <div><strong>Current Fill:</strong> {selectedBinDetails.fill_level}%</div>
              <div><strong>Waste Type:</strong> {selectedBinDetails.category_name}</div>
              <div><strong>Location:</strong> {selectedBinDetails.area_name}</div>
            </div>
          )}

          <div className="form-row" style={{ marginTop: '14px' }}>
            <div className="form-group">
              <label className="form-label">
                Collected Weight in kg* (Max: {selectedBinDetails ? `${selectedBinDetails.capacity_kg} kg` : 'Bin Capacity'})
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max={selectedBinDetails ? selectedBinDetails.capacity_kg : 2000}
                className="form-control"
                placeholder="e.g. 75.5"
                value={formData.collected_quantity_kg}
                onChange={(e) => setFormData({ ...formData, collected_quantity_kg: e.target.value })}
                required
              />
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                Enforced check: Collected quantity cannot exceed bin capacity.
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Link to Active Schedule (Optional)</label>
              <select
                className="form-control"
                value={formData.schedule_id}
                onChange={(e) => setFormData({ ...formData, schedule_id: e.target.value })}
              >
                <option value="">None (Ad-hoc pickup)</option>
                {schedules.map((s) => (
                  <option key={s.schedule_id} value={s.schedule_id}>
                    Schedule #{s.schedule_id} - {s.area_name} ({s.team_name})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row" style={{ marginTop: '14px' }}>
            <div className="form-group">
              <label className="form-label">Collection Date & Time*</label>
              <input
                type="datetime-local"
                className="form-control"
                value={formData.collection_datetime}
                onChange={(e) => setFormData({ ...formData, collection_datetime: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">New Bin Fill Level (%) After Collection</label>
              <input
                type="number"
                min="0"
                max="100"
                className="form-control"
                value={formData.reset_fill_level}
                onChange={(e) => setFormData({ ...formData, reset_fill_level: e.target.value })}
              />
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                Default is 0% (fully emptied receptacle).
              </span>
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '14px' }}>
            <label className="form-label">Remarks / Operator Log</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Cleared morning rush overflow; compactor truck #04 dispatched."
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
            />
          </div>

          <div className="modal-footer" style={{ margin: '24px -24px -24px -24px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsLogModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Execute Transaction & Save Record
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Record Confirmation */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Collection Log"
        message={`Are you sure you want to remove Collection Record #${recordToDelete?.record_id}? This is an audit action.`}
      />
    </div>
  );
};

export default Records;
