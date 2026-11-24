import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Recycle,
  Lock,
  User,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Mail,
  Phone,
  UserPlus,
  LogIn,
  Eye,
  EyeOff,
  MoveHorizontal,
  Shield,
  Building2,
  Truck
} from 'lucide-react';
import { api } from '../services/api';

const ROLES = [
  {
    id: 'admin',
    dbRole: 'Super Admin',
    label: 'Admin',
    fullTitle: 'Administrator',
    icon: Shield,
    defaultUser: 'admin',
    defaultPass: 'admin123',
  },
  {
    id: 'officer',
    dbRole: 'Municipal Officer',
    label: 'Municipal Officer',
    fullTitle: 'Municipal Officer',
    icon: Building2,
    defaultUser: 'officer',
    defaultPass: 'officer123',
  },
  {
    id: 'dispatcher',
    dbRole: 'Dispatcher',
    label: 'Dispatcher',
    fullTitle: 'Field Dispatcher',
    icon: Truck,
    defaultUser: 'dispatcher',
    defaultPass: 'dispatch123',
  },
];

const Login = ({ onLoginSuccess }) => {
  const navigate = useNavigate();

  // Tab mode: 'login' or 'register'
  const [activeTab, setActiveTab] = useState('login');

  // Selected role for Sign In
  const [selectedRole, setSelectedRole] = useState('admin');

  // Card position: 'left' (default) or 'right'
  const [cardPosition, setCardPosition] = useState('left');

  // Preview full background toggle
  const [hideCardForPreview, setHideCardForPreview] = useState(false);

  // Login form state
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');

  // Register form state
  const [fullName, setFullName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regRole, setRegRole] = useState('Super Admin');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  // Status & loading states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // When user selects a role pill in Sign In tab
  const handleRoleSelect = (roleId) => {
    setSelectedRole(roleId);
    setError('');
    const roleConfig = ROLES.find((r) => r.id === roleId);
    if (roleConfig) {
      setUsername(roleConfig.defaultUser);
      setPassword(roleConfig.defaultPass);
    }
  };

  // Phone number handler: enforce numeric only and strictly max 10 digits
  const handlePhoneChange = (e) => {
    const rawVal = e.target.value.replace(/\D/g, ''); // strip non-digits
    const trimmedVal = rawVal.slice(0, 10); // strictly max 10 digits
    setRegPhone(trimmedVal);
    setError('');
  };

  // Login handler
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await api.auth.login({ username, password });
      if (res.success) {
        if (onLoginSuccess) {
          onLoginSuccess(res.user);
        } else {
          sessionStorage.setItem('swm_user', JSON.stringify(res.user));
        }
        navigate('/');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please verify your credentials or register first.');
    } finally {
      setLoading(false);
    }
  };

  // Registration handler
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    // Client-side validations
    if (!fullName.trim() || !regUsername.trim() || !regEmail.trim() || !regPhone || !regPassword) {
      setError('Please fill in all registration fields.');
      return;
    }

    // Phone number validation: exactly 10 digits
    if (regPhone.length !== 10) {
      setError('Phone number must be of only 10 digits.');
      return;
    }

    // Phone number validation: cannot be all zeros
    if (/^0{10}$/.test(regPhone) || /^0+$/.test(regPhone)) {
      setError('Phone number must not be all 0000. Please enter a valid 10-digit mobile number.');
      return;
    }

    // Password validation
    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match. Please re-enter your password.');
      return;
    }

    setLoading(true);

    try {
      const res = await api.auth.register({
        full_name: fullName.trim(),
        username: regUsername.trim(),
        email: regEmail.trim(),
        phone_number: regPhone.trim(),
        role: regRole,
        password: regPassword,
      });

      if (res.success) {
        setSuccessMsg(`Registration successful as ${regRole}! You can now sign in with your credentials.`);

        // Switch to login tab and pre-fill username
        setUsername(regUsername.trim());
        setPassword('');
        setActiveTab('login');

        // Match the role pill
        if (regRole === 'Municipal Officer') setSelectedRole('officer');
        else if (regRole === 'Dispatcher') setSelectedRole('dispatcher');
        else setSelectedRole('admin');

        // Reset registration fields
        setFullName('');
        setRegUsername('');
        setRegEmail('');
        setRegPhone('');
        setRegPassword('');
        setRegConfirmPassword('');
      }
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const currentRoleConfig = ROLES.find((r) => r.id === selectedRole) || ROLES[0];

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        backgroundImage: "url('/login-bg.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'right center',
        backgroundRepeat: 'no-repeat',
        display: 'flex',
        alignItems: 'center',
        justifyContent: cardPosition === 'left' ? 'flex-start' : 'flex-end',
        padding: '24px max(30px, 5vw)',
        overflowY: 'auto',
        position: 'relative',
      }}
    >
      {/* Top Floating Controls: Layout Position & Full Background View */}
      <div
        style={{
          position: 'absolute',
          top: '20px',
          right: '24px',
          display: 'flex',
          gap: '10px',
          zIndex: 30,
        }}
      >
        <button
          type="button"
          onClick={() => setCardPosition((prev) => (prev === 'left' ? 'right' : 'left'))}
          title="Toggle Login Card Position (Left / Right)"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            backgroundColor: 'rgba(255, 255, 255, 0.94)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(0, 0, 0, 0.12)',
            borderRadius: '20px',
            fontSize: '0.78rem',
            fontWeight: 700,
            color: '#0f172a',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          }}
        >
          <MoveHorizontal size={14} color="#16a34a" />
          <span>Card on {cardPosition === 'left' ? 'Left' : 'Right'}</span>
        </button>

        <button
          type="button"
          onClick={() => setHideCardForPreview((prev) => !prev)}
          title="Toggle Full Background View"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            backgroundColor: hideCardForPreview ? '#16a34a' : 'rgba(255, 255, 255, 0.94)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(0, 0, 0, 0.12)',
            borderRadius: '20px',
            fontSize: '0.78rem',
            fontWeight: 700,
            color: hideCardForPreview ? '#ffffff' : '#0f172a',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          }}
        >
          {hideCardForPreview ? <EyeOff size={14} /> : <Eye size={14} color="#16a34a" />}
          <span>{hideCardForPreview ? 'Show Card' : 'Full Scene'}</span>
        </button>
      </div>

      {/* Main Solid White Card */}
      {!hideCardForPreview && (
        <div
          style={{
            width: '100%',
            maxWidth: activeTab === 'register' ? '500px' : '440px',
            backgroundColor: '#ffffff', // Completely solid white, NOT transparent
            borderRadius: '24px',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(0, 0, 0, 0.08)',
            padding: '34px 30px',
            margin: '20px 0',
            position: 'relative',
            zIndex: 20,
            transition: 'max-width 0.2s ease',
            animation: 'fadeIn 0.25s ease',
          }}
        >
          {/* Brand Header */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                margin: '0 auto 10px',
                background: 'linear-gradient(135deg, #16a34a, #14532d)',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 8px 18px rgba(22, 163, 74, 0.35)',
              }}
            >
              <Recycle size={30} strokeWidth={2.4} />
            </div>
            <h1
              style={{
                fontSize: '1.45rem',
                fontWeight: 800,
                color: '#0f172a',
                letterSpacing: '-0.02em',
                lineHeight: 1.2,
                margin: 0,
              }}
            >
              Smart Waste Management
            </h1>
          </div>

          {/* Tab Switcher: Sign In vs Register */}
          <div
            style={{
              display: 'flex',
              backgroundColor: '#f1f5f9',
              borderRadius: '12px',
              padding: '4px',
              marginBottom: '18px',
              border: '1px solid #e2e8f0',
            }}
          >
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setError('');
              }}
              style={{
                flex: 1,
                padding: '9px 12px',
                border: 'none',
                borderRadius: '9px',
                fontSize: '0.86rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                backgroundColor: activeTab === 'login' ? '#ffffff' : 'transparent',
                color: activeTab === 'login' ? '#16a34a' : '#64748b',
                boxShadow: activeTab === 'login' ? '0 2px 6px rgba(0, 0, 0, 0.08)' : 'none',
                transition: 'all 0.18s ease',
              }}
            >
              <LogIn size={15} />
              <span>Sign In</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('register');
                setError('');
                setSuccessMsg('');
              }}
              style={{
                flex: 1,
                padding: '9px 12px',
                border: 'none',
                borderRadius: '9px',
                fontSize: '0.86rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                backgroundColor: activeTab === 'register' ? '#ffffff' : 'transparent',
                color: activeTab === 'register' ? '#16a34a' : '#64748b',
                boxShadow: activeTab === 'register' ? '0 2px 6px rgba(0, 0, 0, 0.08)' : 'none',
                transition: 'all 0.18s ease',
              }}
            >
              <UserPlus size={15} />
              <span>Register</span>
            </button>
          </div>

          {/* Success Alert Message */}
          {successMsg && (
            <div
              style={{
                padding: '11px 13px',
                backgroundColor: '#dcfce7',
                color: '#15803d',
                borderRadius: '10px',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: '9px',
                marginBottom: '16px',
                borderLeft: '4px solid #16a34a',
              }}
            >
              <CheckCircle2 size={17} style={{ flexShrink: 0 }} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Error Alert Message */}
          {error && (
            <div
              style={{
                padding: '11px 13px',
                backgroundColor: '#fee2e2',
                color: '#991b1b',
                borderRadius: '10px',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: '9px',
                marginBottom: '16px',
                borderLeft: '4px solid #ef4444',
              }}
            >
              <AlertCircle size={17} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: SIGN IN FORM */}
          {activeTab === 'login' ? (
            <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {/* Role Selector: Admin, Municipal Officer, Dispatcher */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: '#475569',
                    marginBottom: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  Select Role to Sign In:
                </label>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: '8px',
                  }}
                >
                  {ROLES.map((r) => {
                    const Icon = r.icon;
                    const isSelected = selectedRole === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => handleRoleSelect(r.id)}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '5px',
                          padding: '10px 6px',
                          borderRadius: '10px',
                          border: isSelected ? '2px solid #16a34a' : '1px solid #e2e8f0',
                          backgroundColor: isSelected ? '#f0fdf4' : '#f8fafc',
                          color: isSelected ? '#15803d' : '#475569',
                          fontWeight: isSelected ? 700 : 500,
                          fontSize: '0.76rem',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          textAlign: 'center',
                        }}
                      >
                        <Icon size={18} color={isSelected ? '#16a34a' : '#64748b'} />
                        <span>{r.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="form-group">
                <label
                  className="form-label"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem' }}
                >
                  <User size={15} color="#16a34a" /> Username
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  style={{
                    height: '44px',
                    fontSize: '0.92rem',
                    backgroundColor: '#f8fafc',
                  }}
                />
              </div>

              <div className="form-group">
                <label
                  className="form-label"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem' }}
                >
                  <Lock size={15} color="#16a34a" /> Password
                </label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{
                    height: '44px',
                    fontSize: '0.92rem',
                    backgroundColor: '#f8fafc',
                  }}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px',
                  justifyContent: 'center',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  borderRadius: '10px',
                  backgroundColor: '#16a34a',
                  boxShadow: '0 4px 14px rgba(22, 163, 74, 0.35)',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  marginTop: '4px',
                }}
              >
                {loading ? 'Authenticating...' : `Sign In as ${currentRoleConfig.label}`}
                <ArrowRight size={18} />
              </button>

              <div style={{ textAlign: 'center', marginTop: '6px', fontSize: '0.82rem', color: '#64748b' }}>
                Need a new account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('register');
                    setError('');
                    setSuccessMsg('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#16a34a',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Register here
                </button>
              </div>
            </form>
          ) : (
            /* TAB 2: REGISTRATION FORM */
            <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem' }}>
                  <User size={14} color="#16a34a" /> Full Name
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Ramesh Kumar"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  style={{ height: '40px', fontSize: '0.88rem', backgroundColor: '#f8fafc' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem' }}>
                    <User size={14} color="#16a34a" /> Username
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. officer_rk"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    required
                    style={{ height: '40px', fontSize: '0.88rem', backgroundColor: '#f8fafc' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem' }}>
                    <Mail size={14} color="#16a34a" /> Official Email
                  </label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="name@smartwaste.gov.in"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    required
                    style={{ height: '40px', fontSize: '0.88rem', backgroundColor: '#f8fafc' }}
                  />
                </div>
              </div>

              {/* Role Selection in Registration */}
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem' }}>
                  <Shield size={14} color="#16a34a" /> System Role
                </label>
                <select
                  className="form-control"
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value)}
                  style={{ height: '40px', fontSize: '0.88rem', backgroundColor: '#f8fafc' }}
                >
                  <option value="Super Admin">Admin (Super Admin)</option>
                  <option value="Municipal Officer">Municipal Officer</option>
                  <option value="Dispatcher">Dispatcher (Field Dispatcher)</option>
                </select>
              </div>

              {/* Phone Number Input with 10-digit & non-zero enforcement */}
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem' }}>
                  <Phone size={14} color="#16a34a" /> Mobile Phone Number (10 Digits)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="tel"
                    className="form-control"
                    placeholder="10-digit mobile number (e.g. 9876543210)"
                    value={regPhone}
                    onChange={handlePhoneChange}
                    maxLength={10}
                    required
                    style={{
                      height: '40px',
                      fontSize: '0.88rem',
                      backgroundColor: '#f8fafc',
                      letterSpacing: '0.04em',
                    }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      color: regPhone.length === 10 && !/^0+$/.test(regPhone) ? '#16a34a' : '#94a3b8',
                    }}
                  >
                    {regPhone.length}/10 digits
                  </span>
                </div>
                <span style={{ fontSize: '0.71rem', color: '#64748b', marginTop: '2px', display: 'block' }}>
                  * Must be strictly 10 digits and cannot be all zeros (e.g. 0000000000 is invalid).
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem' }}>
                    <Lock size={14} color="#16a34a" /> Password
                  </label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="Min 6 characters"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    required
                    style={{ height: '40px', fontSize: '0.88rem', backgroundColor: '#f8fafc' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem' }}>
                    <Lock size={14} color="#16a34a" /> Confirm Password
                  </label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="Re-type password"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    required
                    style={{ height: '40px', fontSize: '0.88rem', backgroundColor: '#f8fafc' }}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '11px',
                  justifyContent: 'center',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  borderRadius: '10px',
                  backgroundColor: '#16a34a',
                  boxShadow: '0 4px 14px rgba(22, 163, 74, 0.35)',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  marginTop: '4px',
                }}
              >
                {loading ? 'Registering Account...' : 'Register Account'}
                <ArrowRight size={17} />
              </button>

              <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '0.82rem', color: '#64748b' }}>
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('login');
                    setError('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#16a34a',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Sign In
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};

export default Login;
