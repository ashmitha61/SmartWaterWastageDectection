import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Plus,
  Search,
  Edit2,
  Trash2,
  RotateCw,
  Building,
  Layers,
  CalendarDays
} from 'lucide-react';
import { api } from '../services/api';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import Toast from '../components/Toast';

const Locations = () => {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'success' });

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentLocationId, setCurrentLocationId] = useState(null);

  // Form Fields
  const [formData, setFormData] = useState({
    area_name: '',
    street: '',
    city: '',
    pincode: '',
    description: '',
  });

  // Delete State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState(null);

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    setLoading(true);
    try {
      const res = await api.locations.getAll({ search });
      if (res.success) {
        setLocations(res.data);
      }
    } catch (err) {
      setToast({ message: err.message || 'Failed to load locations from database.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadLocations();
  };

  const openCreateModal = () => {
    setIsEditing(false);
    setCurrentLocationId(null);
    setFormData({
      area_name: '',
      street: '',
      city: 'Hyderabad',
      pincode: '',
      description: '',
    });
    setIsFormModalOpen(true);
  };

  const openEditModal = (loc) => {
    setIsEditing(true);
    setCurrentLocationId(loc.location_id);
    setFormData({
      area_name: loc.area_name,
      street: loc.street,
      city: loc.city,
      pincode: loc.pincode,
      description: loc.description || '',
    });
    setIsFormModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await api.locations.update(currentLocationId, formData);
        setToast({ message: `Location '${formData.area_name}' updated successfully.`, type: 'success' });
      } else {
        await api.locations.create(formData);
        setToast({ message: `Location '${formData.area_name}' added to database.`, type: 'success' });
      }
      setIsFormModalOpen(false);
      loadLocations();
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
    }
  };

  const confirmDelete = (loc) => {
    setLocationToDelete(loc);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!locationToDelete) return;
    try {
      await api.locations.delete(locationToDelete.location_id);
      setToast({ message: `Location '${locationToDelete.area_name}' deleted successfully.`, type: 'success' });
      setIsDeleteModalOpen(false);
      loadLocations();
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
        <form onSubmit={handleSearchSubmit} className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search by area name, street, city, or pincode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>

        <div className="filter-controls">
          <button type="button" className="btn btn-secondary btn-sm" onClick={loadLocations}>
            <RotateCw size={15} /> Refresh
          </button>
          <button type="button" className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={16} /> Add Location
          </button>
        </div>
      </div>

      {/* Locations Table Card */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">Geographical Locations ({locations.length})</h3>
            <p className="card-subtitle">Municipal wards, commercial sectors, and residential zones</p>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <RotateCw size={28} className="live-dot" style={{ margin: '0 auto', color: '#16a34a' }} />
            <p style={{ marginTop: '10px', color: '#64748b' }}>Loading locations from database...</p>
          </div>
        ) : locations.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <MapPin size={28} />
            </div>
            <h4 className="empty-title">No Locations Found</h4>
            <p className="empty-description">
              No geographical areas found. Click "Add Location" to register a new collection zone.
            </p>
            <button type="button" className="btn btn-primary btn-sm" onClick={openCreateModal}>
              <Plus size={16} /> Add First Location
            </button>
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Area / Zone Name</th>
                  <th>Street Address</th>
                  <th>City & Pincode</th>
                  <th>Bins Installed</th>
                  <th>Active Schedules</th>
                  <th>Description</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {locations.map((loc) => (
                  <tr key={loc.location_id}>
                    <td>
                      <div style={{ fontWeight: 700, color: '#1e293b' }}>{loc.area_name}</div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>ID: #{loc.location_id}</div>
                    </td>
                    <td>{loc.street}</td>
                    <td>
                      <span style={{ fontWeight: 500 }}>{loc.city}</span> - {loc.pincode}
                    </td>
                    <td>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: '#f0fdf4',
                          color: '#166534',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontWeight: 700,
                          fontSize: '0.82rem',
                        }}
                      >
                        <Layers size={14} />
                        {loc.total_bins} Bins ({loc.active_bins || 0} Active)
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          color: '#475569',
                          fontSize: '0.82rem',
                        }}
                      >
                        <CalendarDays size={14} color="#64748b" />
                        {loc.total_schedules} Runs
                      </span>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: '#64748b', maxWidth: '220px' }}>
                      {loc.description || '—'}
                    </td>
                    <td>
                      <div className="action-btn-group">
                        <button
                          type="button"
                          className="btn-icon edit"
                          title="Edit Location"
                          onClick={() => openEditModal(loc)}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          type="button"
                          className="btn-icon delete"
                          title="Delete Location"
                          onClick={() => confirmDelete(loc)}
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

      {/* Add / Edit Location Modal */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={isEditing ? `Edit Location: ${formData.area_name}` : 'Add New Geographical Location'}
      >
        <form onSubmit={handleFormSubmit}>
          <div className="form-group">
            <label className="form-label">Area / Zone Name*</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Greenwood Campus, Cyber Heights Tech Park"
              value={formData.area_name}
              onChange={(e) => setFormData({ ...formData, area_name: e.target.value })}
              required
            />
          </div>

          <div className="form-group" style={{ marginTop: '16px' }}>
            <label className="form-label">Street / Landmark Address*</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. University North Avenue, Sector 4"
              value={formData.street}
              onChange={(e) => setFormData({ ...formData, street: e.target.value })}
              required
            />
          </div>

          <div className="form-row" style={{ marginTop: '16px' }}>
            <div className="form-group">
              <label className="form-label">City*</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Hyderabad"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Postal Pincode*</label>
              <input
                type="text"
                maxLength="10"
                className="form-control"
                placeholder="e.g. 500032"
                value={formData.pincode}
                onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '16px' }}>
            <label className="form-label">Description / Collection Notes</label>
            <textarea
              rows="3"
              className="form-control"
              placeholder="e.g. High footfall public zone, commercial food waste generated near cafeteria."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
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
              {isEditing ? 'Save Changes' : 'Save Location'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Location"
        message={`Are you sure you want to delete '${locationToDelete?.area_name}'? The database will reject this operation if any bins or schedules are linked to this location.`}
      />
    </div>
  );
};

export default Locations;
