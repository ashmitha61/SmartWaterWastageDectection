import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  RotateCw,
  Phone,
  UserCheck,
  UserPlus,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { api } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import Toast from '../components/Toast';

const Teams = () => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'success' });

  // Team Form Modal
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isEditingTeam, setIsEditingTeam] = useState(false);
  const [currentTeamId, setCurrentTeamId] = useState(null);
  const [teamFormData, setTeamFormData] = useState({
    team_name: '',
    team_leader: '',
    contact_number: '',
    status: 'Active',
  });

  // Team Delete Modal
  const [isDeleteTeamModalOpen, setIsDeleteTeamModalOpen] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState(null);

  // Team Members Roster Modal
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // New Member Sub-Form
  const [newMemberData, setNewMemberData] = useState({
    member_name: '',
    phone_number: '',
    role: 'Waste Collector',
  });

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (selectedStatus) params.status = selectedStatus;

      const res = await api.teams.getAll(params);
      if (res.success) {
        setTeams(res.data);
      }
    } catch (err) {
      setToast({ message: err.message || 'Failed to load teams.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadTeams();
  };

  const openCreateTeamModal = () => {
    setIsEditingTeam(false);
    setCurrentTeamId(null);
    setTeamFormData({
      team_name: '',
      team_leader: '',
      contact_number: '',
      status: 'Active',
    });
    setIsTeamModalOpen(true);
  };

  const openEditTeamModal = (team) => {
    setIsEditingTeam(true);
    setCurrentTeamId(team.team_id);
    setTeamFormData({
      team_name: team.team_name,
      team_leader: team.team_leader,
      contact_number: team.contact_number,
      status: team.status,
    });
    setIsTeamModalOpen(true);
  };

  const handleTeamSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditingTeam) {
        await api.teams.update(currentTeamId, teamFormData);
        setToast({ message: `Team '${teamFormData.team_name}' updated.`, type: 'success' });
      } else {
        await api.teams.create(teamFormData);
        setToast({ message: `Team '${teamFormData.team_name}' created in database.`, type: 'success' });
      }
      setIsTeamModalOpen(false);
      loadTeams();
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
    }
  };

  const confirmDeleteTeam = (team) => {
    setTeamToDelete(team);
    setIsDeleteTeamModalOpen(true);
  };

  const handleDeleteTeam = async () => {
    if (!teamToDelete) return;
    try {
      await api.teams.delete(teamToDelete.team_id);
      setToast({ message: `Team '${teamToDelete.team_name}' removed.`, type: 'success' });
      setIsDeleteTeamModalOpen(false);
      loadTeams();
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
      setIsDeleteTeamModalOpen(false);
    }
  };

  // Manage Team Members
  const openTeamMembersModal = async (team) => {
    setSelectedTeam(team);
    setIsMembersModalOpen(true);
    loadTeamMembers(team.team_id);
  };

  const loadTeamMembers = async (teamId) => {
    setLoadingMembers(true);
    try {
      const res = await api.teams.getMembers(teamId);
      if (res.success) {
        setTeamMembers(res.data);
      }
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newMemberData.member_name.trim() || !newMemberData.phone_number.trim()) {
      setToast({ message: 'Name and phone number are required for team members.', type: 'error' });
      return;
    }

    try {
      await api.teams.addMember(selectedTeam.team_id, newMemberData);
      setToast({ message: `Member ${newMemberData.member_name} added to team.`, type: 'success' });
      setNewMemberData({ member_name: '', phone_number: '', role: 'Waste Collector' });
      loadTeamMembers(selectedTeam.team_id);
      loadTeams(); // Update total members count
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
    }
  };

  const handleDeleteMember = async (memberId) => {
    try {
      await api.teams.deleteMember(memberId);
      setToast({ message: 'Team member removed.', type: 'success' });
      loadTeamMembers(selectedTeam.team_id);
      loadTeams();
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
            placeholder="Search teams by name, team leader, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>

        <div className="filter-controls">
          <select
            className="select-control"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="On Duty">On Duty</option>
            <option value="Inactive">Inactive</option>
          </select>

          <button type="button" className="btn btn-secondary btn-sm" onClick={loadTeams}>
            <RotateCw size={15} /> Apply
          </button>

          <button type="button" className="btn btn-primary" onClick={openCreateTeamModal}>
            <Plus size={16} /> Add Team
          </button>
        </div>
      </div>

      {/* Teams Grid / Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">Collection Teams & Field Personnel ({teams.length})</h3>
            <p className="card-subtitle">Manage municipal crews, assigned team leaders, and personnel rosters</p>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <RotateCw size={28} className="live-dot" style={{ margin: '0 auto', color: '#16a34a' }} />
            <p style={{ marginTop: '10px', color: '#64748b' }}>Loading teams from MySQL...</p>
          </div>
        ) : teams.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <Users size={28} />
            </div>
            <h4 className="empty-title">No Teams Found</h4>
            <p className="empty-description">
              No collection squads match your filter. Click "Add Team" to register a new crew.
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Team Name</th>
                  <th>Team Leader</th>
                  <th>Contact Phone</th>
                  <th>Crew Size</th>
                  <th>Schedules Assigned</th>
                  <th>Total Waste Picked</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((team) => (
                  <tr key={team.team_id}>
                    <td>
                      <div style={{ fontWeight: 700, color: '#15803d', fontSize: '0.92rem' }}>
                        {team.team_name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>ID: #{team.team_id}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <UserCheck size={15} color="#059669" />
                        <span style={{ fontWeight: 600 }}>{team.team_leader}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569' }}>
                        <Phone size={14} color="#64748b" />
                        <span>{team.contact_number}</span>
                      </div>
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => openTeamMembersModal(team)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: '#f0fdf4',
                          border: '1px solid #bbf7d0',
                          color: '#166534',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                        }}
                      >
                        <Users size={14} />
                        {team.total_members} Members
                        <ChevronRight size={13} />
                      </button>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.84rem', fontWeight: 600, color: '#334155' }}>
                        {team.total_schedules} Runs
                      </span>
                    </td>
                    <td>
                      <strong style={{ color: '#0f172a' }}>
                        {Number(team.total_collected_kg || 0).toLocaleString()} kg
                      </strong>
                    </td>
                    <td>
                      <StatusBadge status={team.status} />
                    </td>
                    <td>
                      <div className="action-btn-group">
                        <button
                          type="button"
                          className="btn-icon"
                          title="Manage Crew Members"
                          onClick={() => openTeamMembersModal(team)}
                        >
                          <UserPlus size={16} />
                        </button>
                        <button
                          type="button"
                          className="btn-icon edit"
                          title="Edit Team"
                          onClick={() => openEditTeamModal(team)}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          type="button"
                          className="btn-icon delete"
                          title="Delete Team"
                          onClick={() => confirmDeleteTeam(team)}
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

      {/* Add / Edit Team Modal */}
      <Modal
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        title={isEditingTeam ? `Edit Team: ${teamFormData.team_name}` : 'Register New Collection Team'}
      >
        <form onSubmit={handleTeamSubmit}>
          <div className="form-group">
            <label className="form-label">Team Name*</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Green Eco Warriors, Clean City Patrol"
              value={teamFormData.team_name}
              onChange={(e) => setTeamFormData({ ...teamFormData, team_name: e.target.value })}
              required
            />
          </div>

          <div className="form-row" style={{ marginTop: '16px' }}>
            <div className="form-group">
              <label className="form-label">Team Leader Name*</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Ramesh Kumar"
                value={teamFormData.team_leader}
                onChange={(e) => setTeamFormData({ ...teamFormData, team_leader: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Contact Phone Number*</label>
              <input
                type="text"
                className="form-control"
                placeholder="+91 98765 43210"
                value={teamFormData.contact_number}
                onChange={(e) => setTeamFormData({ ...teamFormData, contact_number: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '16px' }}>
            <label className="form-label">Operational Status</label>
            <select
              className="form-control"
              value={teamFormData.status}
              onChange={(e) => setTeamFormData({ ...teamFormData, status: e.target.value })}
            >
              <option value="Active">Active (Ready for Schedule)</option>
              <option value="On Duty">On Duty (In Field)</option>
              <option value="Inactive">Inactive (Off-shift)</option>
            </select>
          </div>

          <div className="modal-footer" style={{ margin: '24px -24px -24px -24px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsTeamModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {isEditingTeam ? 'Save Changes' : 'Register Team'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Team Modal */}
      <ConfirmModal
        isOpen={isDeleteTeamModalOpen}
        onClose={() => setIsDeleteTeamModalOpen(false)}
        onConfirm={handleDeleteTeam}
        title="Delete Collection Team"
        message={`Are you sure you want to remove team '${teamToDelete?.team_name}'? The database will restrict deletion if there are active schedules or historical collection logs linked to this squad.`}
      />

      {/* Team Members Management Section (Modal) */}
      <Modal
        isOpen={isMembersModalOpen}
        onClose={() => setIsMembersModalOpen(false)}
        title={`Crew Roster: ${selectedTeam?.team_name}`}
        size="lg"
      >
        <div>
          {/* Add Member Form */}
          <div
            style={{
              padding: '16px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              marginBottom: '20px',
            }}
          >
            <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#1e293b', marginBottom: '12px' }}>
              Add Team Member to {selectedTeam?.team_name}
            </h4>
            <form onSubmit={handleAddMember}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr auto', gap: '10px', alignItems: 'flex-end' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Member Name*</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Full Name"
                    value={newMemberData.member_name}
                    onChange={(e) => setNewMemberData({ ...newMemberData, member_name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Phone Number*</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Phone"
                    value={newMemberData.phone_number}
                    onChange={(e) => setNewMemberData({ ...newMemberData, phone_number: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Role</label>
                  <select
                    className="form-control"
                    value={newMemberData.role}
                    onChange={(e) => setNewMemberData({ ...newMemberData, role: e.target.value })}
                  >
                    <option value="Waste Collector">Waste Collector</option>
                    <option value="Driver">Driver / Operator</option>
                    <option value="Compactor Specialist">Compactor Specialist</option>
                    <option value="Segregation Assistant">Segregation Assistant</option>
                  </select>
                </div>
                <button type="submit" className="btn btn-primary btn-sm" style={{ height: '40px' }}>
                  <Plus size={15} /> Add
                </button>
              </div>
            </form>
          </div>

          {/* Members List */}
          {loadingMembers ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>Loading crew members...</div>
          ) : teamMembers.length === 0 ? (
            <div className="empty-state" style={{ padding: '20px' }}>
              <p>No members registered in this crew yet. Use the form above to add members.</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Member Name</th>
                    <th>Phone</th>
                    <th>Designated Role</th>
                    <th>Date Added</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {teamMembers.map((m) => (
                    <tr key={m.member_id}>
                      <td style={{ fontWeight: 600 }}>{m.member_name}</td>
                      <td>{m.phone_number}</td>
                      <td>
                        <span
                          style={{
                            background: '#e0f2fe',
                            color: '#0369a1',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                          }}
                        >
                          {m.role}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        {m.created_at ? m.created_at.slice(0, 10) : '—'}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn-icon delete"
                          title="Remove Member"
                          onClick={() => handleDeleteMember(m.member_id)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default Teams;
