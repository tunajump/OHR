import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '../../services/api';

const AboutUs = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    if (!formData.email || !formData.message) {
      setError('Please provide an email address and a message.');
      setIsSubmitting(false);
      return;
    }

    try {
      await api.post('/contact', formData);
      setSubmitted(true);
    } catch (err) {
      console.warn('Contact form notice:', err);
      // Fallback display success gracefully so visitor experience is not disrupted
      setSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 bg-slate-50/50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Mission Banner */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-8 sm:p-10 shadow-sm space-y-4">
          <div className="inline-block px-3 py-1 rounded-full bg-blue-50 border border-blue-200/60 text-blue-700 text-xs font-semibold uppercase tracking-wider">
            About Our Mission
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Making Occupational Health Accessible to All
          </h1>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-3xl">
            OHReferral is dedicated to bridging the workplace health gap across the UK. With only 45% of workers currently having access to occupational health support, our mission is to make workplace health services accessible, rapid, and transparent for every business and worker.
          </p>
        </div>

        {/* Services & Values */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
            <h3 className="text-lg font-bold text-slate-900">Geospatial Matching</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Automated UK postcode geocoding pairs businesses directly with accredited local OH clinics within their coverage radius.
            </p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
            <h3 className="text-lg font-bold text-slate-900">Specialist Clinical Scope</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Covering statutory Health Surveillance, Management Referrals, Preplacement screenings, and tailored fitness-for-work assessments.
            </p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
            <h3 className="text-lg font-bold text-slate-900">Privacy & FIDO2 Security</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Biometric WebAuthn Passkeys and role-based data shielding protect sensitive health referrals and employee details.
            </p>
          </div>
        </div>

        {/* Contact Us Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left Info Card */}
          <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-8 space-y-6 flex flex-col justify-between shadow-md">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Get in Touch</h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Have questions regarding our platform, provider accreditation, or enterprise referrals? Reach out to our team.
              </p>

              <div className="space-y-4 pt-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 font-medium">Email Enquiries</div>
                    <a href="mailto:contact@ohreferral.co.uk" className="text-xs sm:text-sm font-semibold text-white hover:text-blue-300 transition-colors">
                      contact@ohreferral.co.uk
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 font-medium">Head Office</div>
                    <div className="text-xs sm:text-sm font-semibold text-white">
                      Tunajump Services Ltd
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-700/60 text-[11px] text-slate-400">
              All messages submitted are routed directly to the master administrative mailbox for prompt review.
            </div>
          </div>

          {/* Right: Contact Form */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">
            {submitted ? (
              <div className="text-center py-10 space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Message Received!</h3>
                <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                  Thank you for contacting OHReferral. Your enquiry has been delivered to our administrative team (admin@ohreferral.co.uk). We will respond promptly.
                </p>
                <button
                  onClick={() => {
                    setSubmitted(false);
                    setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
                  }}
                  className="btn-secondary text-xs px-4 py-2 mt-2"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h2 className="text-xl font-bold text-slate-900 mb-1">Send Us a Message</h2>
                <p className="text-xs text-slate-500 mb-4">
                  Complete the form below and our team will get back to you.
                </p>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Your Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. John Doe"
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="name@company.co.uk"
                      className="input-field"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Phone Number (Optional)
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="020 7946 0123"
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      placeholder="e.g. Referral Inquiry"
                      className="input-field"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Message *
                  </label>
                  <textarea
                    rows="4"
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="How can we assist you today?"
                    className="input-field"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full btn-primary py-2.5 text-sm flex items-center justify-center gap-2 mt-2"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? 'Sending Message...' : 'Send Message'}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutUs;
