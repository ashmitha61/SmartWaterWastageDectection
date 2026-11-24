import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  RotateCw,
  Eye,
  CheckCircle,
  Clock,
  MapPin,
  Users,
  CheckSquare,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import Toast from '../components/Toast';

const Schedules = () => {
  const [schedules, setSchedules] = useState([]);
  const [locations, setLocations] = useState([]);
  const [teams, setTeams] = useState([]);
  const [availableBins, setAvailableBins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingBins, setLoadingBins] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  // Filters
  const [filterDate, setFilterDate] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterTeam, setFilterTeam] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');

  // Form Modal
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentScheduleId, setCurrentScheduleId] = useState(null);

  const [formData, setFormData] = useState({
    collection_date: new Date().toISOString().slice(0, 10),
    start_time: '08:00',
    location_id: '',
    team_id: '',
    status: 'Pending',
    bin_ids: [],
  });

  // Schedule Details Modal (to see assigned bins and collection progress)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [scheduleDetail, setScheduleDetail] = useState(null);

  // Delete Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState(null);

  useEffect(() => {
    loadLookups();
    loadSchedules();
  }, []);

  const loadLookups = async () => {
    try {
      const [locRes, teamRes] = await Promise.all([
        api.locations.getAll(),
        api.teams.getAll(),
      ]);
      if (locRes.success) setLocations(locRes.data);
      if (teamRes.success) setTeams(teamRes.data);
    } catch (err) {
      console.error('Lookup load error:', err);
    }
  };

  const loadSchedules = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterDate) params.date = filterDate;
      if (filterLocation) params.location_id = filterLocation;
      if (filterTeam) params.team_id = filterTeam;
      if (filterStatus) params.status = filterStatus;
      if (search) params.search = search;

      const res = await api.schedules.getAll(params);
      if (res.success) {
        setSchedules(res.data);
      }
    } catch (err) {
      setToast({ message: err.message || 'Failed to load schedules from database.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // When location changes in the form, load bins located at that area
  const handleLocationChange = async (locationId) => {
    setFormData((prev) => ({ ...prev, location_id: locationId, bin_ids: [] }));
    if (!locationId) {
      setAvailableBins([]);
      return;
    }
    setLoadingBins(true);
    try {
      const res = await api.schedules.getAvailableBins(locationId);
      if (res.success) {
        setAvailableBins(res.data || []);
      }
    } catch (err) {
      console.error('Error fetching bins for location:', err);
    } finally {
      setLoadingBins(false);
    }
  };

  const openCreateModal = () => {
    setIsEditing(false);
    setCurrentScheduleId(null);
    const initialLocation = locations.length > 0 ? locations[0].location_id : '';
    setFormData({
      collection_date: new Date().toISOString().slice(0, 10),
      start_time: '08:00',
      location_id: initialLocation,
      team_id: teams.length > 0 ? teams[0].team_id : '',
      status: 'Pending',
      bin_ids: [],
    });
    if (initialLocation) {
      handleLocationChange(initialLocation);
    }
    setIsFormModalOpen(true);
  };

  const openEditModal = async (sch) => {
    setIsEditing(true);
    setCurrentScheduleId(sch.schedule_id);

    try {
      const detailRes = await api.schedules.getById(sch.schedule_id);
      if (detailRes.success) {
        const schData = detailRes.data;
        const currentBinIds = (schData.assignedBins || []).map((b) => b.bin_id);

        setFormData({
          collection_date: schData.collection_date,
          start_time: schData.start_time,
          location_id: schData.location_id,
          team_id: schData.team_id,
          status: schData.status,
          bin_ids: currentBinIds,
        });

        // Load available bins for location
        const binsRes = await api.schedules.getAvailableBins(schData.location_id);
        if (binsRes.success) {
          setAvailableBins(binsRes.data || []);
        }
        setIsFormModalOpen(true);
      }
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
    }
  };

  const toggleBinSelection = (binId) => {
    setFormData((prev) => {
      const exists = prev.bin_ids.includes(binId);
      if (exists) {
        return { ...prev, bin_ids: prev.bin_ids.filter((id) => id !== binId) };
      } else {
        return { ...prev, bin_ids: [...prev.bin_ids, binId] };
      }
    });
  };

  const selectAllBins = () => {
    const allIds = availableBins.map((b) => b.bin_id);
    setFormData((prev) => ({ ...prev, bin_ids: allIds }));
  };

  const clearBinSelection = () => {
    setFormData((prev) => ({ ...prev, bin_ids: [] }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    if (formData.bin_ids.length === 0) {
      setToast({ message: 'Please select at least one bin for this schedule run.', type: 'error' });
      return;
    }

    try {
      if (isEditing) {
        await api.schedules.update(currentScheduleId, formData);
        setToast({ message: `Schedule #${currentScheduleId} updated successfully.`, type: 'success' });
      } else {
        const res = await api.schedules.create(formData);
        setToast({ message: res.message || 'Collection schedule registered.', type: 'success' });
      }
      setIsFormModalOpen(false);
      loadSchedules();
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
    }
  };

  const viewScheduleDetails = async (sch) => {
    try {
      const res = await api.schedules.getById(sch.schedule_id);
      if (res.success) {
        setScheduleDetail(res.data);
        setIsDetailModalOpen(true);
      }
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
    }
  };

  const confirmDelete = (sch) => {
    setScheduleToDelete(sch);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!scheduleToDelete) return;
    try {
      await api.schedules.delete(scheduleToDelete.schedule_id);
      setToast({ message: `Schedule #${scheduleToDelete.schedule_id} deleted.`, type: 'success' });
      setIsDeleteModalOpen(false);
      loadSchedules();
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
      setIsDeleteModalOpen(false);
    }
  };

  return (
    <div>
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'success' })}
      />

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <form onSubmit={(e) => { e.preventDefault(); loadSchedules(); }} className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search by area or team..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>

        <div className="filter-controls">
          <input
            type="date"
            className="select-control"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            title="Filter by Date"
          />

          <select
            className="select-control"
            value={filterLocation}
            onChange={(e) => setFilterLocation(e.target.value)}
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
            value={filterTeam}
            onChange={(e) => setFilterTeam(e.target.value)}
          >
            <option value="">All Teams</option>
            {teams.map((t) => (
              <option key={t.team_id} value={t.team_id}>
                {t.team_name}
              </option>
            ))}
          </select>

          <select
            className="select-control"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          <button type="button" className="btn btn-secondary btn-sm" onClick={loadSchedules}>
            <Filter size={15} /> Filter
          </button>

          <button type="button" className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={16} /> Create Schedule
          </button>
        </div>
      </div>

      {/* Schedules Table Card */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">Collection Schedules ({schedules.length})</h3>
            <p className="card-subtitle">
              Planned runs with many-to-many bin assignments (via <code>schedule_bins</code>)
            </p>
          </div>
          <button type="button" className="btn-icon" onClick={loadSchedules} title="Refresh Schedules">
            <RotateCw size={17} />
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <RotateCw size={28} className="live-dot" style={{ margin: '0 auto', color: '#16a34a' }} />
            <p style={{ marginTop: '10px', color: '#64748b' }}>Querying schedules from MySQL...</p>
          </div>
        ) : schedules.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <CalendarDays size={28} />
            </div>
            <h4 className="empty-title">No Schedules Found</h4>
            <p className="empty-description">
              No collection schedules match the criteria. Click "Create Schedule" to assign teams to bins.
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Schedule ID</th>
                  <th>Date & Start Time</th>
                  <th>Location Zone</th>
                  <th>Assigned Team</th>
                  <th>Bins Assigned</th>
                  <th>Completion Progress</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((sch) => {
                  const total = sch.total_assigned_bins || 0;
                  const collected = sch.collected_bins || 0;
                  const percent = total > 0 ? ((collected / total) * 100).toFixed(0) : 0;

                  return (
                    <tr key={sch.schedule_id}>
                      <td>
                        <strong style={{ color: '#15803d' }}>#{sch.schedule_id}</strong>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{sch.collection_date}</div>
                        <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{sch.start_time}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{sch.area_name}</div>
                        <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{sch.city}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{sch.team_name}</div>
                        <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Leader: {sch.team_leader}</div>
                      </td>
                      <td>
                        <span
                          style={{
                            background: '#f1f5f9',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                          }}
                        >
                          {total} Bins Mapped
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: collected === total && total > 0 ? '#16a34a' : '#d97706' }}>
                            {collected} / {total} ({percent}%)
                          </span>
                        </div>
                      </td>
                      <td>
                        <StatusBadge status={sch.status} />
                      </td>
                      <td>
                        <div className="action-btn-group">
                          <button
                            type="button"
                            className="btn-icon"
                            title="View Assigned Bins"
                            onClick={() => viewScheduleDetails(sch)}
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            type="button"
                            className="btn-icon edit"
                            title="Edit Schedule"
                            onClick={() => openEditModal(sch)}
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            type="button"
                            className="btn-icon delete"
                            title="Delete Schedule"
                            onClick={() => confirmDelete(sch)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Schedule Modal */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={isEditing ? `Edit Schedule #${currentScheduleId}` : 'Create Collection Schedule'}
        size="lg"
      >
        <form onSubmit={handleFormSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Collection Date*</label>
              <input
                type="date"
                className="form-control"
                value={formData.collection_date}
                onChange={(e) => setFormData({ ...formData, collection_date: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Start Time*</label>
              <input
                type="time"
                className="form-control"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-row" style={{ marginTop: '16px' }}>
            <div className="form-group">
              <label className="form-label">Location (Ward/Sector)*</label>
              <select
                className="form-control"
                value={formData.location_id}
                onChange={(e) => handleLocationChange(e.target.value)}
                required
              >
                <option value="">Select Location</option>
                {locations.map((loc) => (
                  <option key={loc.location_id} value={loc.location_id}>
                    {loc.area_name} ({loc.city})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Assigned Collection Team*</label>
              <select
                className="form-control"
                value={formData.team_id}
                onChange={(e) => setFormData({ ...formData, team_id: e.target.value })}
                required
              >
                <option value="">Select Team</option>
                {teams.map((t) => (
                  <option key={t.team_id} value={t.team_id}>
                    {t.team_name} (Leader: {t.team_leader})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '16px' }}>
            <label className="form-label">Schedule Status</label>
            <select
              className="form-control"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="Pending">Pending (Scheduled)</option>
              <option value="In Progress">In Progress (Active Run)</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {/* Many-to-Many Bin Selection for this Schedule */}
          <div style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label className="form-label" style={{ margin: 0 }}>
                Select Bins to Assign ({formData.bin_ids.length} selected)*
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                  onClick={selectAllBins}
                >
                  Select All
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                  onClick={clearBinSelection}
                >
                  Clear
                </button>
              </div>
            </div>

            {loadingBins ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                Fetching bins at selected location...
              </div>
            ) : availableBins.length === 0 ? (
              <div
                style={{
                  padding: '16px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  color: '#991b1b',
                  fontSize: '0.84rem',
                }}
              >
                No active bins currently registered at this location. Please choose another location or register bins first.
              </div>
            ) : (
              <div
                style={{
                  maxHeight: '200px',
                  overflowY: 'auto',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '8px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: '8px',
                }}
              >
                {availableBins.map((bin) => {
                  const isChecked = formData.bin_ids.includes(bin.bin_id);
                  return (
                    <label
                      key={bin.bin_id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        backgroundColor: isChecked ? '#f0fdf4' : '#ffffff',
                        border: isChecked ? '1px solid #86efac' : '1px solid #e2e8f0',
                        cursor: 'pointer',
                        fontSize: '0.82rem',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleBinSelection(bin.bin_id)}
                      />
                      <div>
                        <div style={{ fontWeight: 700, color: '#166534' }}>{bin.bin_code}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          {bin.category_name} &bull; Fill: {bin.fill_level}%
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="modal-footer" style={{ margin: '24px -24px -24px -24px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsFormModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {isEditing ? 'Update Schedule' : 'Commit Schedule to MySQL'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Schedule Detail Modal showing assigned bins */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={`Schedule Details: Run #${scheduleDetail?.schedule_id}`}
        size="lg"
      >
        {scheduleDetail && (
          <div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px',
                backgroundColor: '#f8fafc',
                padding: '16px',
                borderRadius: '10px',
                marginBottom: '20px',
              }}
            >
              <div>
                <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Collection Date</span>
                <div style={{ fontWeight: 700 }}>{scheduleDetail.collection_date}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Start Time</span>
                <div style={{ fontWeight: 700 }}>{scheduleDetail.start_time}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Location</span>
                <div style={{ fontWeight: 700 }}>{scheduleDetail.area_name} ({scheduleDetail.city})</div>
              </div>
              <div>
                <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Assigned Team</span>
                <div style={{ fontWeight: 700 }}>{scheduleDetail.team_name}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Status</span>
                <div><StatusBadge status={scheduleDetail.status} /></div>
              </div>
            </div>

            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '12px' }}>
              Assigned Bins for this Run ({scheduleDetail.assignedBins?.length || 0})
            </h4>

            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Bin Code</th>
                    <th>Category</th>
                    <th>Capacity</th>
                    <th>Current Fill</th>
                    <th>Collection State</th>
                    <th>Collected Time</th>
                  </tr>
                </thead>
                <tbody>
                  {(scheduleDetail.assignedBins || []).map((b) => (
                    <tr key={b.bin_id}>
                      <td style={{ fontWeight: 700, color: '#15803d' }}>{b.bin_code}</td>
                      <td>{b.category_name}</td>
                      <td>{b.capacity_kg} kg</td>
                      <td>{b.fill_level}%</td>
                      <td>
                        {b.is_collected ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: '#dcfce7',
                              color: '#15803d',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                            }}
                          >
                            <CheckCircle size={14} /> Collected ({b.collected_quantity_kg || 0} kg)
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: '#fef3c7',
                              color: '#b45309',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                            }}
                          >
                            <Clock size={14} /> Pending
                          </span>
                        )}
                      </td>
                      <td style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        {b.collected_at || 'Awaiting collection'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Schedule Confirmation */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Schedule"
        message={`Are you sure you want to delete Schedule #${scheduleToDelete?.schedule_id}? This will also remove associated entries from the schedule_bins mapping table.`}
      />
    </div>
  );
};

export default Schedules;
