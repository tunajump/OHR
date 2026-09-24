import React, { useState, useEffect, useContext } from 'react';
import api from '../../services/api';
import AuthContext from '../../context/AuthContext';
import { 
  X, 
  Send, 
  AlertCircle, 
  CheckCircle2, 
  Check, 
  User, 
  Users,
  Mail, 
  Phone, 
  FileText 
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
    desc: 'Statutory medical tests (hearing, respiratory, vibration)'
  },
  {
    id: 'Preplacements',
    label: 'Preplacements',
    desc: 'Fitness for work & pre-employment health screening'
  }
];

export const parseLocationCapacity = (countRange) => {
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

const NewReferralModal = ({ isOpen, onClose, onReferralCreated, locations = [], profile = null }) => {
  const authContext = useContext(AuthContext);
  const user = authContext?.user;

  const [businessLocationId, setBusinessLocationId] = useState(locations[0]?.id || '');
  const [selectedServices, setSelectedServices] = useState(['Management Referrals']);
  const [employeeCount, setEmployeeCount] = useState(1);
  
  // Referrer contact details & Notes
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [companyWebsiteHp, setCompanyWebsiteHp] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [matchResult, setMatchResult] = useState(null);

  // Synchronize selected location and default contact details when modal opens
  useEffect(() => {
    if (isOpen) {
      if (locations && locations.length > 0) {
        const match = locations.find((l) => String(l.id) === String(businessLocationId));
        if (!match) {
          setBusinessLocationId(locations[0].id);
        }
      }
      if (!contactName) {
        setContactName(profile?.contact_person || user?.name || '');
      }
      if (!contactEmail) {
        setContactEmail(user?.email || '');
      }
      if (!contactPhone) {
        setContactPhone(profile?.phone || '');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locations, isOpen, businessLocationId, profile, user]);

  if (!isOpen) return null;

  const selectedLocation = locations.find((l) => String(l.id) === String(businessLocationId)) || locations[0];
  const maxLocationCapacity = selectedLocation ? parseLocationCapacity(selectedLocation.employee_count) : 10000;

  const handleToggleService = (serviceId) => {
    setSelectedServices((prev) => {
      const exists = prev.includes(serviceId);
      if (exists) {
        if (prev.length === 1) return prev;
        return prev.filter((s) => s !== serviceId);
      } else {
        return [...prev, serviceId];
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMatchResult(null);

    const trimmedName = contactName.trim();
    const trimmedEmail = contactEmail.trim();
    const trimmedPhone = contactPhone.trim();
    const trimmedNotes = notes.trim();

    if (!trimmedName) {
      setError('Please provide the full name of the person submitting the referral.');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      setError('Please provide a valid contact email address (e.g. name@company.co.uk).');
      return;
    }

    // Telephone validation
    const digitsOnly = trimmedPhone.replace(/[^0-9]/g, '');
    const phoneRegex = /^[+]?[\d\s().-]{10,20}$/;
    if (!trimmedPhone || digitsOnly.length < 10 || digitsOnly.length > 15 || !phoneRegex.test(trimmedPhone)) {
      setError('Please provide a valid telephone number with at least 10 digits (e.g. 020 7946 0991).');
      return;
    }

    const targetLocationId = businessLocationId || (locations[0]?.id);

    if (!targetLocationId) {
      setError('Please add a workplace location in your dashboard first.');
      return;
    }

    const parsedEmployees = parseInt(employeeCount, 10);
    if (isNaN(parsedEmployees) || parsedEmployees < 1) {
      setError('Number of employees must be at least 1.');
      return;
    }

    if (parsedEmployees > maxLocationCapacity) {
      setError(`Number of employees (${parsedEmployees}) exceeds the workplace location limit (maximum ${maxLocationCapacity} for this branch).`);
      return;
    }

    if (selectedServices.length === 0) {
      setError('Please select at least one Occupational Health service.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post('/referrals', {
        businessLocationId: targetLocationId,
        services: selectedServices,
        serviceType: selectedServices.join(', '),
        employeeCount: parsedEmployees,
        contactName: trimmedName,
        contactEmail: trimmedEmail,
        contactPhone: trimmedPhone,
        notes: trimmedNotes,
        ...(companyWebsiteHp ? { company_website_hp: companyWebsiteHp } : {})
      });

      setMatchResult(response.data);
      if (onReferralCreated) {
        onReferralCreated(response.data);
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Failed to submit referral. Please check details and try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative my-8 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
            <Send className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Create New Referral</h3>
            <p className="text-xs text-slate-500">Dispatch referral request to local accredited OH Providers</p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3.5 flex items-start gap-2.5 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Match Result Success View */}
        {matchResult ? (
          <div className="space-y-4 text-center py-2">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900">
                {matchResult.status === 'matched' ? 'Referral Matched!' : 'Referral Created'}
              </h4>
              <p className="text-xs text-slate-600 mt-1">
                {matchResult.message}
              </p>
            </div>

            {/* Selected Services Tags */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
              {(matchResult.services || selectedServices).map((svc) => (
                <span key={svc} className="badge bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold">
                  {svc}
                </span>
              ))}
            </div>

            {matchResult.matchedProvider && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-left text-xs space-y-1.5">
                <div className="font-semibold text-emerald-900 text-sm">
                  Matched Provider: {matchResult.matchedProvider.companyName}
                </div>
                <div className="text-emerald-800">
                  Provider Contact: <span className="font-medium">{matchResult.matchedProvider.contactPerson}</span> ({matchResult.matchedProvider.phone})
                </div>
                <div className="text-emerald-700 font-semibold flex items-center gap-1 pt-0.5">
                  <Check className="w-3.5 h-3.5" />
                  <span>Proximity Distance: {matchResult.matchedProvider.distance} miles away</span>
                </div>
              </div>
            )}

            <button
              onClick={() => {
                setMatchResult(null);
                onClose();
              }}
              className="w-full btn-primary py-2.5 text-sm"
            >
              Done & View Referrals
            </button>
          </div>
        ) : (
          /* Submission Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Honeypot field for anti-bot trap */}
            <div className="absolute opacity-0 pointer-events-none -left-[9999px]" aria-hidden="true">
              <label htmlFor="ref_company_website_hp">Leave empty</label>
              <input
                id="ref_company_website_hp"
                type="text"
                name="company_website_hp"
                tabIndex="-1"
                autoComplete="off"
                value={companyWebsiteHp}
                onChange={(e) => setCompanyWebsiteHp(e.target.value)}
              />
            </div>

            {/* Section A: Referrer Contact Info */}
            <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-600" />
                <span>Person Submitting Referral</span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="e.g. Jane Doe (HR Director)"
                    className="input-field input-with-icon-left text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Contact Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="email"
                      required
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
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
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="020 7946 0991"
                      className="input-field input-with-icon-left text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section B: Business Location */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Business Branch / Origin Location *
              </label>
              {locations.length > 0 ? (
                <select
                  value={businessLocationId}
                  onChange={(e) => setBusinessLocationId(e.target.value)}
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
                  No workplace locations found. Please add a workplace location in your dashboard first.
                </div>
              )}
            </div>

            {/* Section C: Multi-Service Selection */}
            <div className="space-y-2 pt-1">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Services Required *
                </label>
                <span className="text-[11px] text-blue-600 font-medium">
                  {selectedServices.length} selected
                </span>
              </div>

              <div className="space-y-2 pt-1">
                {AVAILABLE_SERVICES.map((svc) => {
                  const isChecked = selectedServices.includes(svc.id);
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
                        onChange={() => handleToggleService(svc.id)}
                        className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="text-xs font-bold">{svc.label}</div>
                        <div className="text-[11px] text-slate-500">{svc.desc}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Section D: Number of Employees Involved (Up to Location Limit) */}
            <div className="pt-1">
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Number of Employees Involved <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                  Location Headcount Limit: {maxLocationCapacity >= 10000 ? '100+' : maxLocationCapacity}
                </span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 z-10">
                  <Users className="w-4 h-4" />
                </div>
                <input
                  type="number"
                  min="1"
                  max={maxLocationCapacity}
                  required
                  value={employeeCount}
                  onChange={(e) => setEmployeeCount(e.target.value)}
                  placeholder="1"
                  className="input-field input-with-icon-left text-xs"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Specify how many employees are included in this referral request (up to {maxLocationCapacity >= 10000 ? '100+' : maxLocationCapacity} for this workplace branch).
              </p>
            </div>

            {/* Section E: Notes / Additional Explanation */}
            <div className="pt-1">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>Referral Notes & Explanation (Optional)</span>
              </label>
              <textarea
                rows="3"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Explain the background, reason for referral, employee shift pattern, relevant symptoms, or specific assessment requests for the OH clinician..."
                className="input-field text-xs py-2"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary text-xs px-4 py-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || locations.length === 0 || selectedServices.length === 0}
                className="btn-primary text-xs px-5 py-2 flex items-center gap-1.5"
              >
                {submitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Matching Provider...</span>
                  </>
                ) : (
                  <span>Submit & Match</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default NewReferralModal;
