import React, { useState, useEffect } from 'react';
import {
  Trash2,
  Plus,
  Search,
  Filter,
  Edit2,
  History,
  RotateCw,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import FillProgressBar from '../components/FillProgressBar';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import Toast from '../components/Toast';

const Bins = () => {
  const [bins, setBins] = useState([]);
  const [locations, setLocations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  // Filters and Search
  const [search, setSearch] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentBinId, setCurrentBinId] = useState(null);

  // Form Fields
  const [formData, setFormData] = useState({
    bin_code: '',
    location_id: '',
    category_id: '',
    capacity_kg: '',
    fill_level: 0,
    status: 'Active',
  });

  // Delete Confirmation Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [binToDelete, setBinToDelete] = useState(null);

  // Collection History Modal for Individual Bin
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [binHistory, setBinHistory] = useState({ binCode: '', records: [] });

  useEffect(() => {
    loadLookups();
    loadBins();
  }, []);

  const loadLookups = async () => {
    try {
      const [locRes, catRes] = await Promise.all([
        api.locations.getAll(),
        api.categories.getAll(),
      ]);
      if (locRes.success) setLocations(locRes.data);
      if (catRes.success) setCategories(catRes.data);
    } catch (err) {
      console.error('Failed to load lookup data:', err);
    }
  };

  const loadBins = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (selectedLocation) params.location_id = selectedLocation;
      if (selectedCategory) params.category_id = selectedCategory;
      if (selectedStatus) params.status = selectedStatus;

      const res = await api.bins.getAll(params);
      if (res.success) {
        setBins(res.data);
      }
    } catch (err) {
      setToast({ message: err.message || 'Failed to fetch bins from database.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadBins();
  };

  const openCreateModal = () => {
    setIsEditing(false);
    setCurrentBinId(null);
    setFormData({
      bin_code: '',
      location_id: locations.length > 0 ? locations[0].location_id : '',
      category_id: categories.length > 0 ? categories[0].category_id : '',
      capacity_kg: '100',
      fill_level: 0,
      status: 'Active',
    });
    setIsFormModalOpen(true);
  };

  const openEditModal = (bin) => {
    setIsEditing(true);
    setCurrentBinId(bin.bin_id);
    setFormData({
      bin_code: bin.bin_code,
      location_id: bin.location_id,
      category_id: bin.category_id,
      capacity_kg: bin.capacity_kg,
      fill_level: bin.fill_level,
      status: bin.status,
    });
    setIsFormModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    if (!formData.bin_code.trim()) {
      setToast({ message: 'Bin code cannot be empty.', type: 'error' });
      return;
    }

    try {
      if (isEditing) {
        await api.bins.update(currentBinId, formData);
        setToast({ message: `Bin ${formData.bin_code} updated successfully.`, type: 'success' });
      } else {
        await api.bins.create(formData);
        setToast({ message: `New Bin ${formData.bin_code} created successfully.`, type: 'success' });
      }
      setIsFormModalOpen(false);
      loadBins();
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
    }
  };

  const confirmDelete = (bin) => {
    setBinToDelete(bin);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!binToDelete) return;
    try {
      await api.bins.delete(binToDelete.bin_id);
      setToast({ message: `Bin ${binToDelete.bin_code} deleted successfully.`, type: 'success' });
      setIsDeleteModalOpen(false);
      loadBins();
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
      setIsDeleteModalOpen(false);
    }
  };

  const viewBinHistory = async (bin) => {
    try {
      const res = await api.records.getByBin(bin.bin_id);
      if (res.success) {
        setBinHistory({
          binCode: bin.bin_code,
          records: res.data || [],
        });
        setIsHistoryModalOpen(true);
      }
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
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
        <form onSubmit={handleSearchSubmit} className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search by bin code, location, or waste type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>

        <div className="filter-controls">
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
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Maintenance">Maintenance</option>
          </select>

          <button type="button" className="btn btn-secondary btn-sm" onClick={loadBins} title="Apply Filters">
            <Filter size={15} /> Apply
          </button>

          <button type="button" className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={16} /> Add New Bin
          </button>
        </div>
      </div>

      {/* Main Bins Table Card */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">Waste Bins Inventory ({bins.length})</h3>
            <p className="card-subtitle">Live status, capacity, and fill levels mapped from MySQL</p>
          </div>
          <button type="button" className="btn-icon" onClick={loadBins} title="Refresh Bins">
            <RotateCw size={17} />
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <RotateCw size={28} className="live-dot" style={{ margin: '0 auto', color: '#16a34a' }} />
            <p style={{ marginTop: '10px', color: '#64748b' }}>Loading bins from MySQL...</p>
          </div>
        ) : bins.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <Trash2 size={28} />
            </div>
            <h4 className="empty-title">No Bins Found</h4>
            <p className="empty-description">
              No waste bins match your search or filter criteria. Click "Add New Bin" to create one.
            </p>
            <button type="button" className="btn btn-primary btn-sm" onClick={openCreateModal}>
              <Plus size={16} /> Add First Bin
            </button>
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Bin Code</th>
                  <th>Location & City</th>
                  <th>Category</th>
                  <th>Capacity (kg)</th>
                  <th>Current Fill Level</th>
                  <th>Total Collections</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bins.map((bin) => (
                  <tr key={bin.bin_id}>
                    <td>
                      <div style={{ fontWeight: 700, color: '#15803d' }}>{bin.bin_code}</div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>ID: #{bin.bin_id}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{bin.area_name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{bin.street}, {bin.city}</div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 500 }}>{bin.category_name}</span>
                    </td>
                    <td>
                      <strong>{bin.capacity_kg} kg</strong>
                    </td>
                    <td>
                      <FillProgressBar level={bin.fill_level} />
                    </td>
                    <td>
                      <span style={{ fontSize: '0.82rem', color: '#475569' }}>
                        {bin.total_collections} runs ({Number(bin.total_collected_kg || 0).toFixed(1)} kg)
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={bin.status} />
                    </td>
                    <td>
                      <div className="action-btn-group">
                        <button
                          type="button"
                          className="btn-icon"
                          title="View Collection History"
                          onClick={() => viewBinHistory(bin)}
                        >
                          <History size={16} />
                        </button>
                        <button
                          type="button"
                          className="btn-icon edit"
                          title="Edit Bin"
                          onClick={() => openEditModal(bin)}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          type="button"
                          className="btn-icon delete"
                          title="Delete Bin"
                          onClick={() => confirmDelete(bin)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Bin Modal */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={isEditing ? `Edit Bin: ${formData.bin_code}` : 'Register New Waste Bin'}
      >
        <form onSubmit={handleFormSubmit}>
          <div className="form-group">
            <label className="form-label">Bin Code (Unique Receptacle Identifier)*</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. BIN-ORG-101"
              value={formData.bin_code}
              onChange={(e) => setFormData({ ...formData, bin_code: e.target.value.toUpperCase() })}
              required
            />
            <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
              Enforced by MySQL UNIQUE constraint to prevent duplicate registrations.
            </span>
          </div>

          <div className="form-row" style={{ marginTop: '16px' }}>
            <div className="form-group">
              <label className="form-label">Location (Zone/Street)*</label>
              <select
                className="form-control"
                value={formData.location_id}
                onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
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
              <label className="form-label">Waste Category*</label>
              <select
                className="form-control"
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                required
              >
                <option value="">Select Category</option>
                {categories.map((cat) => (
                  <option key={cat.category_id} value={cat.category_id}>
                    {cat.category_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row" style={{ marginTop: '16px' }}>
            <div className="form-group">
              <label className="form-label">Capacity in kg*</label>
              <input
                type="number"
                step="0.5"
                min="10"
                max="2000"
                className="form-control"
                placeholder="e.g. 100"
                value={formData.capacity_kg}
                onChange={(e) => setFormData({ ...formData, capacity_kg: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Fill Level (0 - 100%)</label>
              <input
                type="number"
                step="1"
                min="0"
                max="100"
                className="form-control"
                placeholder="0"
                value={formData.fill_level}
                onChange={(e) => setFormData({ ...formData, fill_level: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '16px' }}>
            <label className="form-label">Bin Status</label>
            <select
              className="form-control"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="Active">Active (In Service)</option>
              <option value="Inactive">Inactive</option>
              <option value="Maintenance">Maintenance Required</option>
            </select>
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
              {isEditing ? 'Save Changes' : 'Create Bin in MySQL'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Waste Bin"
        message={`Are you sure you want to delete bin '${binToDelete?.bin_code}'? If it is referenced in active collection logs or schedules, MySQL will reject the operation for referential integrity.`}
      />

      {/* Individual Bin Collection History Modal */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title={`Collection Audit History: ${binHistory.binCode}`}
        size="lg"
      >
        {binHistory.records.length === 0 ? (
          <div className="empty-state">
            <AlertCircle size={28} color="#94a3b8" />
            <p>No historical collections logged for this bin yet.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Collection Time</th>
                  <th>Quantity Collected</th>
                  <th>Team Assigned</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {binHistory.records.map((r) => (
                  <tr key={r.record_id}>
                    <td>{r.collection_datetime}</td>
                    <td>
                      <strong style={{ color: '#16a34a' }}>{r.collected_quantity_kg} kg</strong>
                    </td>
                    <td>{r.team_name}</td>
                    <td style={{ fontSize: '0.8rem', color: '#64748b' }}>{r.remarks || 'Standard clearance'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Bins;
