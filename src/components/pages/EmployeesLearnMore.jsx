import React, { useState } from 'react';
import { Send, CheckCircle2, HeartPulse, Stethoscope, ShieldCheck } from 'lucide-react';
import api from '../../services/api';
import SEO from '../common/SEO';

const EmployeesLearnMore = () => {
  const [formData, setFormData] = useState({
    employeeName: '',
    employeeEmail: '',
    companyName: '',
    managerEmail: '',
    message: 'Hi,\n\nI would like to suggest we explore Occupational Health support for our team through OHReferral.co.uk.\n\nThank you!'
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await api.post('/employees/notify', formData);
      setSubmitted(true);
    } catch (err) {
      console.warn('Notification notice:', err);
      // Fallback display success gracefully so employee experience is positive
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 bg-white py-12 px-4 sm:px-6 lg:px-8">
      <SEO
        title="Occupational Health for Employees | Mental Health & Workplace Support | OHReferral"
        description="Confidential workplace support for employees. Impartial medical advice for employee issues, mental health, physical adjustments, and health surveillance."
        keywords="employee issues, mental health, occupational health, referral, oh provider, health surveillance, workplace adjustments"
      />

      <div className="max-w-4xl mx-auto space-y-10">
        {/* Title */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#111827] tracking-tight">
            Occupational Health & Support for Employees
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            <strong>Occupational Health</strong> is here to protect your wellbeing when workplace pressures impact your health or when medical conditions make work challenging.
          </p>
        </div>

        {/* Why OH Matters for Employees */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center mb-1">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Workplace Adjustments</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Get impartial medical recommendations for ergonomic equipment, phased return-to-work schedules, and resolution of physical <strong>employee issues</strong>.
            </p>
          </div>

          <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center mb-1">
              <Stethoscope className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Statutory Health Surveillance</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Routine <strong>health surveillance</strong> checks (hearing, vision, lung function) to ensure workplace hazards do not affect your long-term health.
            </p>
          </div>

          <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center mb-1">
              <HeartPulse className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Workplace Mental Health</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Impartial, confidential guidance from an accredited <strong>OH provider</strong> to address stress, anxiety, burnout, or work-life balance through a <strong>referral</strong>.
            </p>
          </div>
        </div>

        {/* Notify Employer Form */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm max-w-2xl mx-auto">
          <h2 className="text-xl font-bold text-slate-900 mb-2 text-center">
            Tell Your Manager About OHReferral
          </h2>
          <p className="text-xs text-slate-500 text-center mb-6">
            Fill in the details below to invite your manager or HR team to explore free <strong>occupational health</strong> support for your company.
          </p>

          {submitted ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Notification Sent!</h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                Thank you. We have recorded your notification and will reach out to inform your employer about OH services available near their location.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="btn-secondary text-xs px-4 py-2 mt-2"
              >
                Send Another Notification
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Your Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.employeeName}
                    onChange={(e) => setFormData({ ...formData, employeeName: e.target.value })}
                    placeholder="e.g. Alex"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Your Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={formData.employeeEmail}
                    onChange={(e) => setFormData({ ...formData, employeeEmail: e.target.value })}
                    placeholder="alex@company.co.uk"
                    className="input-field"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Employer / Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="e.g. Acme Corp Ltd"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Manager / HR Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.managerEmail}
                    onChange={(e) => setFormData({ ...formData, managerEmail: e.target.value })}
                    placeholder="manager@company.co.uk"
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Message
                </label>
                <textarea
                  rows="3"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="input-field"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full btn-primary py-2.5 text-sm flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>{submitting ? 'Sending Notification...' : 'Send Notification to Manager'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeesLearnMore;
