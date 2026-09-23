import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import NewReferralModal from '../referrals/NewReferralModal';
import { 
  Building2, 
  MapPin, 
  Plus, 
  Send, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  RefreshCw,
  X,
  Users,
  Compass,
  Edit2,
  Trash2,
  Check,
  CheckCheck,
  CheckSquare,
  Lock,
  XCircle,
  User, 
  Mail, 
  Phone, 
  FileText,
  ArrowRight,
  Stethoscope,
  ShieldCheck
} from 'lucide-react';

const AVAILABLE_SERVICES = [
  {
    id: 'Management Referrals',
    label: 'Management Referrals',
    desc: 'Manager-led health & attendance assessments'
  },
  {
    id: 'Health Surveillance',
    label: 'Health Surveillance',
    desc: 'Statutory health screening (Audiometry, Spirometry, Skin, HAVS)'
  },
  {
    id: 'Preplacements',
    label: 'Preplacements',
    desc: 'Fitness for work & pre-employment health screening'
  }
];

const parseLocationCapacity = (countRange) => {
  if (!countRange) return 10000;
  if (typeof countRange === 'number') return countRange;
  const str = String(countRange).trim();
  if (str === '> 100' || str === '100+' || str === '250+' || str.includes('>')) return 10000;
  const parts = str.split('-');
  if (parts.length === 2) {
    const maxVal = parseInt(parts[1], 10);
    if (!isNaN(maxVal)) return maxVal;
  }
  const parsed = parseInt(str, 10);
  return isNaN(parsed) ? 10000 : parsed;
};

const BusinessDashboard = () => {
  const { user } = useAuth();

  const [referrals, setReferrals] = useState([]);
  const [locations, setLocations] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Referral Modal States
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);
  const [isEditReferralModalOpen, setIsEditReferralModalOpen] = useState(false);
  const [editingReferral, setEditingReferral] = useState(null);
  const [editReferralServices, setEditReferralServices] = useState(['Management Referrals']);
  const [editReferralLocationId, setEditReferralLocationId] = useState('');
  const [editReferralEmployeeCount, setEditReferralEmployeeCount] = useState(1);
  const [editReferralContactName, setEditReferralContactName] = useState('');
  const [editReferralContactEmail, setEditReferralContactEmail] = useState('');
  const [editReferralContactPhone, setEditReferralContactPhone] = useState('');
  const [editReferralNotes, setEditReferralNotes] = useState('');
  const [editReferralLoading, setEditReferralLoading] = useState(false);
  const [editReferralError, setEditReferralError] = useState('');

  // Provider Selection Modal States
  const [isSelectProviderModalOpen, setIsSelectProviderModalOpen] = useState(false);
  const [providerReviewReferral, setProviderReviewReferral] = useState(null);
  const [selectedProviderIds, setSelectedProviderIds] = useState([]);
  const [selectProviderLoading, setSelectProviderLoading] = useState(false);
  const [selectProviderError, setSelectProviderError] = useState('');

  // Location Modal States
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [locationModalError, setLocationModalError] = useState('');
  const [locationModalLoading, setLocationModalLoading] = useState(false);
  const [newLocation, setNewLocation] = useState({
    address: '',
    city: '',
    state: '',
    country: 'United Kingdom',
    postalCode: '',
    employeeCount: '11-50',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [refRes, locRes, profRes] = await Promise.allSettled([
        api.get('/referrals'),
        api.get('/business/locations'),
        api.get('/business/profile')
      ]);

      if (refRes.status === 'fulfilled') {
        setReferrals(Array.isArray(refRes.value.data) ? refRes.value.data : []);
      }
      if (locRes.status === 'fulfilled') {
        setLocations(Array.isArray(locRes.value.data) ? locRes.value.data : []);
      }
      if (profRes.status === 'fulfilled') {
        setProfile(profRes.value.data);
      }
    } catch (err) {
      console.warn('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Location Handlers
  const handleOpenAddLocationModal = () => {
    setEditingLocation(null);
    setLocationModalError('');
    setNewLocation({
      address: '',
      city: '',
      state: '',
      country: 'United Kingdom',
      postalCode: '',
      employeeCount: '11-50',
    });
    setIsLocationModalOpen(true);
  };

  const handleOpenEditLocationModal = (loc) => {
    setEditingLocation(loc);
    setLocationModalError('');
    setNewLocation({
      address: loc.address || '',
      city: loc.city || '',
      state: loc.state || '',
      country: loc.country || 'United Kingdom',
      postalCode: loc.postal_code || '',
      employeeCount: loc.employee_count || '11-50',
    });
    setIsLocationModalOpen(true);
  };

  const handleCloseLocationModal = () => {
    setLocationModalError('');
    setEditingLocation(null);
    setIsLocationModalOpen(false);
  };

  const handleSaveLocation = async (e) => {
    e.preventDefault();
    setLocationModalError('');
    setLocationModalLoading(true);

    try {
      if (editingLocation) {
        await api.put(`/business/location/${editingLocation.id}`, newLocation);
        setSuccessMsg('Workplace location updated successfully.');
      } else {
        await api.post('/business/location', newLocation);
        setSuccessMsg('Workplace location added successfully.');
      }
      handleCloseLocationModal();
      fetchData();
    } catch (err) {
      setLocationModalError(
        err.response?.data?.message || 'Invalid UK postcode or location details. Please provide a valid UK postcode.'
      );
    } finally {
      setLocationModalLoading(false);
    }
  };

  const handleDeleteLocation = async (locId) => {
    if (!window.confirm('Are you sure you want to remove this workplace location?')) return;
    try {
      await api.delete(`/business/location/${locId}`);
      setSuccessMsg('Location removed.');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Error removing location.');
    }
  };

  // Referral Edit & Delete Handlers
  const handleOpenEditReferralModal = (ref) => {
    setEditingReferral(ref);
    setEditReferralError('');
    setEditReferralLocationId(ref.business_location_id || (locations[0]?.id || ''));
    
    // Parse service types
    let initialServices = ['Management Referrals'];
    if (ref.service_type) {
      initialServices = ref.service_type.split(',').map((s) => s.trim()).filter(Boolean);
    }
    setEditReferralServices(initialServices.length > 0 ? initialServices : ['Management Referrals']);
    setEditReferralEmployeeCount(ref.employee_count || 1);
    setEditReferralContactName(ref.contact_name || profile?.contact_person || user?.name || '');
    setEditReferralContactEmail(ref.contact_email || user?.email || '');
    setEditReferralContactPhone(ref.contact_phone || profile?.phone || '');
    setEditReferralNotes(ref.notes || '');
    setIsEditReferralModalOpen(true);
  };

  const handleToggleEditReferralService = (serviceId) => {
    setEditReferralServices((prev) => {
      const exists = prev.includes(serviceId);
      if (exists) {
        if (prev.length === 1) return prev;
        return prev.filter((s) => s !== serviceId);
      } else {
        return [...prev, serviceId];
      }
    });
  };

  const handleSaveEditReferral = async (e) => {
    e.preventDefault();
    setEditReferralError('');
    if (!editingReferral) return;

    if (editReferralServices.length === 0) {
      setEditReferralError('Please select at least one service.');
      return;
    }

    const trimmedName = editReferralContactName.trim();
    const trimmedEmail = editReferralContactEmail.trim();
    const trimmedPhone = editReferralContactPhone.trim();
    const trimmedNotes = editReferralNotes.trim();

    if (!trimmedName) {
      setEditReferralError('Please provide the full name of the person submitting the referral.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      setEditReferralError('Please provide a valid contact email address (e.g. name@company.co.uk).');
      return;
    }

    const digitsOnly = trimmedPhone.replace(/[^0-9]/g, '');
    const phoneRegex = /^[+]?[\d\s().-]{10,20}$/;
    if (!trimmedPhone || digitsOnly.length < 10 || digitsOnly.length > 15 || !phoneRegex.test(trimmedPhone)) {
      setEditReferralError('Please provide a valid telephone number with at least 10 digits (e.g. 020 7946 0991).');
      return;
    }

    const targetLoc = locations.find((l) => String(l.id) === String(editReferralLocationId)) || locations[0];
    const maxCapacity = targetLoc ? parseLocationCapacity(targetLoc.employee_count) : 10000;
    const parsedEmployees = parseInt(editReferralEmployeeCount, 10);
    if (isNaN(parsedEmployees) || parsedEmployees < 1) {
      setEditReferralError('Number of employees must be at least 1.');
      return;
    }
    if (parsedEmployees > maxCapacity) {
      setEditReferralError(`Number of employees (${parsedEmployees}) exceeds the workplace location limit (maximum ${maxCapacity} for this branch).`);
      return;
    }

    setEditReferralLoading(true);
    try {
      const res = await api.put(`/referrals/${editingReferral.id}`, {
        businessLocationId: editReferralLocationId,
        services: editReferralServices,
        employeeCount: parsedEmployees,
        contactName: trimmedName,
        contactEmail: trimmedEmail,
        contactPhone: trimmedPhone,
        notes: trimmedNotes,
      });

      setSuccessMsg(res.data.message || `Referral #${editingReferral.id} updated successfully.`);
      setIsEditReferralModalOpen(false);
      setEditingReferral(null);
      fetchData();
    } catch (err) {
      setEditReferralError(err.response?.data?.message || 'Failed to update referral.');
    } finally {
      setEditReferralLoading(false);
    }
  };

  const handleDeleteReferral = async (refId, status) => {
    const actionLabel = status === 'matched' ? 'cancel & delete matched' : 'delete pending';
    if (!window.confirm(`Are you sure you want to ${actionLabel} Referral #${refId}?`)) {
      return;
    }

    try {
      await api.delete(`/referrals/${refId}`);
      setSuccessMsg(`Referral #${refId} has been successfully deleted.`);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || `Failed to delete Referral #${refId}.`);
    }
  };

  const handleOpenSelectProviderModal = (referral) => {
    setProviderReviewReferral(referral);
    const alreadySelected = (referral.interested_providers || [])
      .filter((p) => p.status === 'selected' || p.status === 'accepted')
      .map((p) => p.provider_id);
    setSelectedProviderIds(alreadySelected.length > 0 ? alreadySelected : []);
    setSelectProviderError('');
    setIsSelectProviderModalOpen(true);
  };

  const handleToggleProviderSelection = (providerId) => {
    setSelectedProviderIds((prev) =>
      prev.includes(providerId) ? prev.filter((id) => id !== providerId) : [...prev, providerId]
    );
  };

  const handleSelectAllProviders = () => {
    if (!providerReviewReferral?.interested_providers) return;
    const allIds = providerReviewReferral.interested_providers.map((p) => p.provider_id);
    setSelectedProviderIds(allIds);
  };

  const handleDeselectAllProviders = () => {
    setSelectedProviderIds([]);
  };

  const handleSaveSelectedProviders = async () => {
    if (!providerReviewReferral) return;
    if (selectedProviderIds.length === 0) {
      setSelectProviderError('Please select at least one provider to work with.');
      return;
    }
    setSelectProviderError('');
    setSelectProviderLoading(true);
    try {
      const res = await api.post(`/referrals/${providerReviewReferral.id}/select-providers`, {
        providerIds: selectedProviderIds
      });
      setSuccessMsg(res.data.message || `${selectedProviderIds.length} provider(s) selected and awarded successfully!`);
      setIsSelectProviderModalOpen(false);
      setProviderReviewReferral(null);
      fetchData();
    } catch (err) {
      setSelectProviderError(err.response?.data?.message || 'Failed to select providers.');
    } finally {
      setSelectProviderLoading(false);
    }
  };

  const handleCloseReferral = async (referralId) => {
    if (!window.confirm(`Are you sure you want to mark Referral #${referralId} as closed?`)) {
      return;
    }
    try {
      const res = await api.post(`/referrals/${referralId}/close`);
      setSuccessMsg(res.data.message || `Referral #${referralId} has been successfully closed.`);
      if (isSelectProviderModalOpen && providerReviewReferral?.id === referralId) {
        setIsSelectProviderModalOpen(false);
        setProviderReviewReferral(null);
      }
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || `Failed to close Referral #${referralId}.`);
    }
  };

  return (
    <div className="flex-1 bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Top Header Card */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-inner">
              <Building2 className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900">
                  {profile?.company_name || user?.organizationName || 'Business Dashboard'}
                </h1>
                <span className="badge badge-blue">Business Account</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Contact: <span className="font-semibold text-slate-700">{profile?.contact_person || user?.name || 'HR Lead'}</span> &bull; Email: <span className="font-semibold text-slate-700">{user?.email}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleOpenAddLocationModal}
              className="btn-secondary text-xs px-3.5 py-2 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Add Location
            </button>
            <button
              id="new-referral-btn"
              onClick={() => setIsReferralModalOpen(true)}
              className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5 shadow-sm"
            >
              <Send className="w-4 h-4" />
              New Referral
            </button>
            <button
              onClick={fetchData}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Global Notifications / Alerts */}
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* SECTION 1: Registered Workplace Locations */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                <span>Workplace Locations & Employee Headcounts</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage your office, warehouse, and branch locations for referral matching.
              </p>
            </div>

            <button
              onClick={handleOpenAddLocationModal}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Location</span>
            </button>
          </div>

          {locations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {locations.map((loc) => (
                <div 
                  key={loc.id}
                  className="p-5 rounded-2xl border border-slate-200/90 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">{loc.address || 'Branch Office'}</h3>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">
                          {loc.city && `${loc.city}, `}{loc.postal_code}
                        </p>
                      </div>
                      <span className="badge badge-blue text-[11px] font-bold flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        <span>{loc.employee_count || '11-50'}</span>
                      </span>
                    </div>

                    {/* Geocoded coordinates indicator */}
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1">
                      <Compass className="w-3.5 h-3.5 text-slate-400" />
                      {loc.latitude && loc.longitude ? (
                        <span>Geocoded: {Number(loc.latitude).toFixed(4)}, {Number(loc.longitude).toFixed(4)}</span>
                      ) : (
                        <span className="text-amber-600">Pending geocoding</span>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/70 flex justify-end gap-2">
                    <button
                      onClick={() => handleOpenEditLocationModal(loc)}
                      className="text-xs text-slate-600 hover:text-blue-600 flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-100"
                      title="Edit Location"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleDeleteLocation(loc.id)}
                      className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 px-2 py-1 rounded hover:bg-red-50"
                      title="Remove Location"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 border border-dashed border-slate-200 rounded-2xl text-center space-y-3">
              <MapPin className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs sm:text-sm text-slate-600">
                No workplace locations recorded yet. Add your main headquarters or operational branches.
              </p>
              <button
                onClick={handleOpenAddLocationModal}
                className="btn-secondary text-xs px-4 py-2 inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add First Location</span>
              </button>
            </div>
          )}
        </div>

        {/* SECTION 2: Referral Status Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">{referrals.length}</div>
              <div className="text-xs text-slate-500">Total Referrals</div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-700">
                {referrals.filter((r) => r.status === 'matched').length}
              </div>
              <div className="text-xs text-slate-500">Matched Providers</div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-700">
                {referrals.filter((r) => r.status === 'pending').length}
              </div>
              <div className="text-xs text-slate-500">Pending Matching</div>
            </div>
          </div>
        </div>

        {/* SECTION 3: Referrals Table Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
            <h2 className="text-base font-bold text-slate-900">Recent Referrals</h2>
            <span className="text-xs text-slate-500 font-medium">Real-time status & management</span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading referrals...</div>
          ) : referrals.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Send className="w-6 h-6" />
              </div>
              <div className="text-sm font-semibold text-slate-700">No Referrals Registered Yet</div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Create your first Occupational Health referral to instantly match with nearby accredited providers.
              </p>
              <button
                onClick={() => setIsReferralModalOpen(true)}
                className="btn-primary text-xs px-4 py-2 mt-2"
              >
                Create First Referral
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3.5 px-6">ID</th>
                    <th className="py-3.5 px-6">Service Type(s)</th>
                    <th className="py-3.5 px-6">Referrer & Notes</th>
                    <th className="py-3.5 px-6">Assigned Provider</th>
                    <th className="py-3.5 px-6">Status</th>
                    <th className="py-3.5 px-6">Date</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {referrals.map((ref) => (
                    <tr key={ref.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 font-mono font-medium text-slate-900">
                        #{ref.id}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-800 flex flex-wrap gap-1">
                          {ref.service_type?.split(',').map((svc) => (
                            <span key={svc.trim()} className="badge bg-slate-100 text-slate-700 text-[11px]">
                              {svc.trim()}
                            </span>
                          )) || 'Management Referral'}
                        </div>
                        <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1 mt-1">
                          <Users className="w-3 h-3 text-slate-400" />
                          <span>{ref.employee_count || 1} {(ref.employee_count || 1) === 1 ? 'employee' : 'employees'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 max-w-[200px]">
                        <div className="text-slate-900 font-semibold truncate">
                          {ref.contact_name || 'HR Referrer'}
                        </div>
                        {ref.contact_email && (
                          <div className="text-[11px] text-slate-500 truncate">{ref.contact_email}</div>
                        )}
                        {ref.notes && (
                          <div className="text-[11px] text-slate-600 bg-slate-100/80 rounded px-2 py-0.5 mt-1 line-clamp-1 italic" title={ref.notes}>
                            &ldquo;{ref.notes}&rdquo;
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {(ref.selected_providers && ref.selected_providers.length > 0) ? (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                              <span>
                                {ref.selected_providers.length === 1
                                  ? ref.selected_providers[0].company_name
                                  : `${ref.selected_providers.length} Providers Assigned`}
                              </span>
                            </div>
                            {ref.selected_providers.length > 1 ? (
                              <div className="text-[11px] text-slate-700 font-medium space-y-0.5">
                                {ref.selected_providers.map((p) => (
                                  <div key={p.provider_id} className="text-slate-800">
                                    &bull; <span className="font-semibold">{p.company_name}</span> {p.contact_person && `(${p.contact_person})`}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-[11px] text-slate-600">
                                {ref.selected_providers[0].contact_person && (
                                  <div>Lead: {ref.selected_providers[0].contact_person}</div>
                                )}
                                {ref.selected_providers[0].phone && (
                                  <div className="flex items-center gap-1 text-slate-500">
                                    <Phone className="w-3 h-3 text-slate-400" />
                                    <span>{ref.selected_providers[0].phone}</span>
                                  </div>
                                )}
                              </div>
                            )}
                            {ref.status !== 'closed' && ref.interested_providers && ref.interested_providers.length > 0 && (
                              <button
                                onClick={() => handleOpenSelectProviderModal(ref)}
                                className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold underline block"
                              >
                                Manage Providers ({ref.selected_providers.length} of {ref.interested_providers.length})
                              </button>
                            )}
                          </div>
                        ) : ref.selected_provider || ref.provider_name ? (
                          <div className="space-y-0.5">
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                              <span>{ref.selected_provider?.company_name || ref.provider_name}</span>
                            </div>
                            {ref.selected_provider?.contact_person && (
                              <div className="text-[11px] text-slate-600 font-medium">
                                Lead: {ref.selected_provider.contact_person}
                              </div>
                            )}
                            {ref.selected_provider?.phone && (
                              <div className="text-[11px] text-slate-500 flex items-center gap-1">
                                <Phone className="w-3 h-3 text-slate-400" />
                                <span>{ref.selected_provider.phone}</span>
                              </div>
                            )}
                          </div>
                        ) : ref.interested_providers && ref.interested_providers.length > 0 ? (
                          <div className="space-y-1.5">
                            <span className="badge bg-blue-50 text-blue-700 border border-blue-200 font-bold flex items-center gap-1 w-fit">
                              <Users className="w-3 h-3" />
                              <span>{ref.interested_providers.length} {ref.interested_providers.length === 1 ? 'Provider' : 'Providers'} Interested</span>
                            </span>
                            {ref.status !== 'closed' && (
                              <button
                                onClick={() => handleOpenSelectProviderModal(ref)}
                                className="btn-primary py-1 px-2.5 text-[11px] font-semibold flex items-center gap-1 shadow-2xs"
                              >
                                <span>Choose Provider(s)</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Awaiting provider requests...</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`badge ${
                            ref.status === 'closed' || ref.status === 'completed'
                              ? 'bg-slate-100 text-slate-700 border border-slate-300'
                              : ref.status === 'matched'
                              ? 'badge-green'
                              : 'badge-amber'
                          }`}
                        >
                          {ref.status === 'closed' ? 'Closed' : ref.status === 'matched' ? 'Matched' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                        {ref.created_at ? new Date(ref.created_at).toLocaleDateString() : 'Today'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {ref.status === 'pending' && (
                            <button
                              onClick={() => handleOpenEditReferralModal(ref)}
                              className="p-1.5 text-slate-600 hover:text-blue-600 rounded hover:bg-blue-50 transition-colors"
                              title="Edit Pending Referral"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {ref.status !== 'closed' && ref.status !== 'completed' && (
                            <button
                              onClick={() => handleCloseReferral(ref.id)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors"
                              title="Mark Referral as Closed"
                            >
                              <CheckSquare className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteReferral(ref.id, ref.status)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                            title="Delete Referral"
                          >
                            <Trash2 className="w-4 h-4" />
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
      </div>

      {/* New Referral Modal */}
      <NewReferralModal
        isOpen={isReferralModalOpen}
        onClose={() => setIsReferralModalOpen(false)}
        onReferralCreated={() => {
          fetchData();
        }}
        locations={locations}
        profile={profile}
      />

      {/* Edit Pending Referral Modal */}
      {isEditReferralModalOpen && editingReferral && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative my-8 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                setIsEditReferralModalOpen(false);
                setEditingReferral(null);
              }}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                <Edit2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Edit Pending Referral #{editingReferral.id}</h3>
                <p className="text-xs text-slate-500">Update services, branch location, contact info, or notes</p>
              </div>
            </div>

            {editReferralError && (
              <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3.5 flex items-start gap-2.5 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <span>{editReferralError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEditReferral} className="space-y-4">
              {/* Referrer Contact Section */}
              <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  <span>Person Submitting Referral</span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Full Name *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <User className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="text"
                      required
                      value={editReferralContactName}
                      onChange={(e) => setEditReferralContactName(e.target.value)}
                      placeholder="e.g. Jane Doe (HR Director)"
                      className="input-field input-with-icon-left text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Contact Email *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Mail className="w-3.5 h-3.5" />
                      </div>
                      <input
                        type="email"
                        required
                        value={editReferralContactEmail}
                        onChange={(e) => setEditReferralContactEmail(e.target.value)}
                        placeholder="jane@company.co.uk"
                        className="input-field input-with-icon-left text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Telephone Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Phone className="w-3.5 h-3.5" />
                      </div>
                      <input
                        type="tel"
                        required
                        value={editReferralContactPhone}
                        onChange={(e) => setEditReferralContactPhone(e.target.value)}
                        placeholder="020 7946 0991"
                        className="input-field input-with-icon-left text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Branch Location */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Business Branch / Origin Location *
                </label>
                {locations.length > 0 ? (
                  <select
                    value={editReferralLocationId}
                    onChange={(e) => setEditReferralLocationId(e.target.value)}
                    className="input-field text-xs"
                    required
                  >
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.address}, {loc.city} ({loc.postal_code || loc.postalCode})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                    No workplace locations found.
                  </div>
                )}
              </div>

              {/* Services Required */}
              <div className="space-y-2 pt-1">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Occupational Health Services Required *
                  </label>
                  <span className="text-[11px] text-blue-600 font-medium">
                    {editReferralServices.length} selected
                  </span>
                </div>

                <div className="space-y-2 pt-1">
                  {AVAILABLE_SERVICES.map((svc) => {
                    const isChecked = editReferralServices.includes(svc.id);
                    return (
                      <label
                        key={svc.id}
                        className={`flex items-start gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-blue-50/70 border-blue-300 text-blue-950 shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleEditReferralService(svc.id)}
                          className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <div className="text-xs font-bold">{svc.label}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{svc.desc}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Number of Employees Involved */}
              <div className="pt-1">
                {(() => {
                  const editTargetLoc = locations.find((l) => String(l.id) === String(editReferralLocationId)) || locations[0];
                  const editMaxCapacity = editTargetLoc ? parseLocationCapacity(editTargetLoc.employee_count) : 10000;
                  return (
                    <>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                          Number of Employees Involved <span className="text-red-500">*</span>
                        </label>
                        {editTargetLoc && (
                          <span className="text-[11px] text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                            Location Headcount Limit: {editMaxCapacity >= 10000 ? '100+' : editMaxCapacity}
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 z-10">
                          <Users className="w-4 h-4" />
                        </div>
                        <input
                          type="number"
                          min="1"
                          max={editMaxCapacity}
                          required
                          value={editReferralEmployeeCount}
                          onChange={(e) => setEditReferralEmployeeCount(e.target.value)}
                          placeholder="1"
                          className="input-field input-with-icon-left text-xs"
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Specify how many employees are included in this referral (up to {editMaxCapacity >= 10000 ? '100+' : editMaxCapacity} for this branch).
                      </p>
                    </>
                  );
                })()}
              </div>

              {/* Notes */}
              <div className="pt-1">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  <span>Referral Notes & Explanation (Optional)</span>
                </label>
                <textarea
                  rows="3"
                  value={editReferralNotes}
                  onChange={(e) => setEditReferralNotes(e.target.value)}
                  placeholder="Explain background, shift patterns, symptoms, or specific assessment requests..."
                  className="input-field text-xs py-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditReferralModalOpen(false);
                    setEditingReferral(null);
                  }}
                  className="btn-secondary text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editReferralLoading || editReferralServices.length === 0}
                  className="btn-primary text-xs px-5 py-2 flex items-center gap-1.5"
                >
                  {editReferralLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save & Update</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Location Modal */}
      {isLocationModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingLocation ? 'Edit Workplace Location' : 'Add Business Branch Location'}
                  </h3>
                  <p className="text-xs text-slate-500">Record workplace branch & postal code</p>
                </div>
              </div>
              <button
                onClick={handleCloseLocationModal}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {locationModalError && (
              <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3.5 flex items-start gap-2.5 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <span>{locationModalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveLocation} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Street Address</label>
                <input
                  type="text"
                  required
                  value={newLocation.address}
                  onChange={(e) => setNewLocation({ ...newLocation, address: e.target.value })}
                  placeholder="e.g. 10 Downing Street"
                  className="input-field"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={newLocation.city}
                    onChange={(e) => setNewLocation({ ...newLocation, city: e.target.value })}
                    placeholder="e.g. London"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">UK Postcode *</label>
                  <input
                    type="text"
                    required
                    value={newLocation.postalCode}
                    onChange={(e) => setNewLocation({ ...newLocation, postalCode: e.target.value })}
                    placeholder="e.g. SW1A 2AA"
                    className={`input-field ${locationModalError ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Employee Count</label>
                <select
                  value={newLocation.employeeCount}
                  onChange={(e) => setNewLocation({ ...newLocation, employeeCount: e.target.value })}
                  className="input-field"
                >
                  <option value="1-10">1-10 Employees</option>
                  <option value="11-50">11-50 Employees</option>
                  <option value="51-100">51-100 Employees</option>
                  <option value="> 100">&gt; 100 Employees</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseLocationModal}
                  className="btn-secondary text-xs px-3.5 py-2"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={locationModalLoading}
                  className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5"
                >
                  {locationModalLoading && (
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
                  <span>{editingLocation ? 'Save Changes' : 'Save Location'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review & Select Matching Provider Modal */}
      {isSelectProviderModalOpen && providerReviewReferral && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative space-y-6">
            <button
              onClick={() => {
                setIsSelectProviderModalOpen(false);
                setProviderReviewReferral(null);
              }}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Select Provider(s) for Referral #{providerReviewReferral.id}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select <strong>one or more</strong> accredited providers to work with. Selected providers will receive your company and referrer contact details.
                </p>
              </div>
            </div>

            {selectProviderError && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-3.5 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-red-700">{selectProviderError}</div>
              </div>
            )}

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-700 space-y-1">
              <div className="font-semibold text-slate-900">Referral Request Details:</div>
              <div><strong>Services:</strong> {providerReviewReferral.service_type}</div>
              <div><strong>Employees:</strong> {providerReviewReferral.employee_count || 1} employees involved</div>
              {providerReviewReferral.status === 'closed' && (
                <div className="text-amber-800 font-semibold mt-1">Status: Marked as Closed</div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Applicant Providers ({providerReviewReferral.interested_providers?.length || 0})
                </div>
                {providerReviewReferral.interested_providers && providerReviewReferral.interested_providers.length > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllProviders}
                      className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={handleDeselectAllProviders}
                      className="text-[11px] text-slate-500 hover:text-slate-700 font-semibold"
                    >
                      Deselect All
                    </button>
                  </div>
                )}
              </div>

              {providerReviewReferral.interested_providers && providerReviewReferral.interested_providers.length > 0 ? (
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {providerReviewReferral.interested_providers.map((prov) => {
                    const isChecked = selectedProviderIds.includes(prov.provider_id);
                    return (
                      <div
                        key={prov.provider_id}
                        onClick={() => handleToggleProviderSelection(prov.provider_id)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                          isChecked
                            ? 'border-blue-500 bg-blue-50/50 shadow-xs'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="pt-0.5">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleProviderSelection(prov.provider_id)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-slate-900">{prov.company_name}</span>
                              <span className="badge bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-semibold">
                                {prov.distance ? `${Number(prov.distance).toFixed(1)} miles away` : 'Within clinic radius'}
                              </span>
                              {prov.status === 'selected' && (
                                <span className="badge bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold">
                                  Currently Selected
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-600">
                              Lead Contact: <span className="font-medium text-slate-800">{prov.contact_person || 'Clinic Lead'}</span>
                            </div>
                            {prov.phone && (
                              <div className="text-xs text-slate-500 flex items-center gap-1">
                                <Phone className="w-3 h-3 text-slate-400" />
                                <span>{prov.phone}</span>
                              </div>
                            )}
                            {prov.email && (
                              <div className="text-xs text-slate-500 flex items-center gap-1">
                                <Mail className="w-3 h-3 text-slate-400" />
                                <span>{prov.email}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleProviderSelection(prov.provider_id);
                          }}
                          className={`py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
                            isChecked
                              ? 'bg-blue-600 text-white shadow-xs hover:bg-blue-700'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                          }`}
                        >
                          {isChecked ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Selected</span>
                            </>
                          ) : (
                            <span>Select Provider</span>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  No providers have requested consideration yet. As soon as providers in your area review this job, they will appear here.
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                {providerReviewReferral.status !== 'closed' && (
                  <button
                    type="button"
                    onClick={() => handleCloseReferral(providerReviewReferral.id)}
                    className="text-xs text-slate-600 hover:text-red-700 font-semibold inline-flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-red-50 border border-slate-200 transition-colors"
                  >
                    <XCircle className="w-4 h-4 text-slate-500 hover:text-red-600" />
                    <span>Mark Referral as Closed</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsSelectProviderModalOpen(false);
                    setProviderReviewReferral(null);
                  }}
                  className="btn-secondary text-xs px-4 py-2"
                >
                  Cancel
                </button>
                {providerReviewReferral.interested_providers && providerReviewReferral.interested_providers.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSaveSelectedProviders}
                    disabled={selectProviderLoading || selectedProviderIds.length === 0}
                    className="btn-primary text-xs px-4 py-2 font-semibold inline-flex items-center gap-1.5 shadow-xs hover:shadow-sm disabled:opacity-50"
                  >
                    {selectProviderLoading ? (
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {selectedProviderIds.length > 0
                        ? `Save & Assign ${selectedProviderIds.length} Selected Provider${selectedProviderIds.length === 1 ? '' : 's'}`
                        : 'Select Providers'}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessDashboard;
