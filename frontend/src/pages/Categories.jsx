import React, { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  Search,
  Edit2,
  Trash2,
  RotateCw,
  Scale,
  Trash
} from 'lucide-react';
import { api } from '../services/api';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import Toast from '../components/Toast';

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'success' });

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentCategoryId, setCurrentCategoryId] = useState(null);

  // Form Fields
  const [formData, setFormData] = useState({
    category_name: '',
    description: '',
  });

  // Delete State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const res = await api.categories.getAll({ search });
      if (res.success) {
        setCategories(res.data);
      }
    } catch (err) {
      setToast({ message: err.message || 'Failed to load categories.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadCategories();
  };

  const openCreateModal = () => {
    setIsEditing(false);
    setCurrentCategoryId(null);
    setFormData({
      category_name: '',
      description: '',
    });
    setIsFormModalOpen(true);
  };

  const openEditModal = (cat) => {
    setIsEditing(true);
    setCurrentCategoryId(cat.category_id);
    setFormData({
      category_name: cat.category_name,
      description: cat.description || '',
    });
    setIsFormModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await api.categories.update(currentCategoryId, formData);
        setToast({ message: `Waste Category '${formData.category_name}' updated successfully.`, type: 'success' });
      } else {
        await api.categories.create(formData);
        setToast({ message: `Waste Category '${formData.category_name}' added to database.`, type: 'success' });
      }
      setIsFormModalOpen(false);
      loadCategories();
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
    }
  };

  const confirmDelete = (cat) => {
    setCategoryToDelete(cat);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!categoryToDelete) return;
    try {
      await api.categories.delete(categoryToDelete.category_id);
      setToast({ message: `Waste Category '${categoryToDelete.category_name}' deleted.`, type: 'success' });
      setIsDeleteModalOpen(false);
      loadCategories();
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
            placeholder="Search categories by name or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>

        <div className="filter-controls">
          <button type="button" className="btn btn-secondary btn-sm" onClick={loadCategories}>
            <RotateCw size={15} /> Refresh
          </button>
          <button type="button" className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={16} /> Add Category
          </button>
        </div>
      </div>

      {/* Categories Grid / Table Card */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">Waste Segregation Categories ({categories.length})</h3>
            <p className="card-subtitle">Default and custom categories for municipal waste stream separation</p>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <RotateCw size={28} className="live-dot" style={{ margin: '0 auto', color: '#16a34a' }} />
            <p style={{ marginTop: '10px', color: '#64748b' }}>Loading categories from MySQL...</p>
          </div>
        ) : categories.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <Layers size={28} />
            </div>
            <h4 className="empty-title">No Categories Found</h4>
            <p className="empty-description">
              No waste categories match your search. Click "Add Category" to create a new one.
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Category ID</th>
                  <th>Category Name</th>
                  <th>Description</th>
                  <th>Assigned Bins</th>
                  <th>Total Waste Collected</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat.category_id}>
                    <td>
                      <span style={{ fontWeight: 600, color: '#64748b' }}>#{cat.category_id}</span>
                    </td>
                    <td>
                      <strong style={{ color: '#166534', fontSize: '0.94rem' }}>{cat.category_name}</strong>
                    </td>
                    <td style={{ color: '#475569', fontSize: '0.85rem', maxWidth: '320px' }}>
                      {cat.description || '—'}
                    </td>
                    <td>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: '#f1f5f9',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontWeight: 600,
                          fontSize: '0.82rem',
                        }}
                      >
                        <Trash size={13} color="#475569" />
                        {cat.total_bins} Bins
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: '#ecfdf5',
                          color: '#047857',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontWeight: 700,
                          fontSize: '0.82rem',
                        }}
                      >
                        <Scale size={13} />
                        {Number(cat.total_collected_kg || 0).toLocaleString()} kg
                      </span>
                    </td>
                    <td>
                      <div className="action-btn-group">
                        <button
                          type="button"
                          className="btn-icon edit"
                          title="Edit Category"
                          onClick={() => openEditModal(cat)}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          type="button"
                          className="btn-icon delete"
                          title="Delete Category"
                          onClick={() => confirmDelete(cat)}
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

      {/* Add / Edit Category Modal */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={isEditing ? `Edit Category: ${formData.category_name}` : 'Create New Waste Category'}
      >
        <form onSubmit={handleFormSubmit}>
          <div className="form-group">
            <label className="form-label">Category Name* (Unique)</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Hazardous Waste, E-Waste"
              value={formData.category_name}
              onChange={(e) => setFormData({ ...formData, category_name: e.target.value })}
              required
            />
          </div>

          <div className="form-group" style={{ marginTop: '16px' }}>
            <label className="form-label">Description & Segregation Guidelines</label>
            <textarea
              rows="3"
              className="form-control"
              placeholder="e.g. Batteries, paint cans, and chemical waste requiring specialized recycling."
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
              {isEditing ? 'Save Changes' : 'Save Category'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Waste Category"
        message={`Are you sure you want to delete category '${categoryToDelete?.category_name}'? The database will block this if any bins are currently assigned to it.`}
      />
    </div>
  );
};

export default Categories;
