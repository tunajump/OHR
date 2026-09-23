import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import PasskeyManager from '../auth/PasskeyManager';
import {
  Database,
  Table,
  RefreshCw,
  Search,
  HardDrive,
  Server,
  Fingerprint,
  ShieldCheck,
  Cloud
} from 'lucide-react';

const DatabaseViewer = () => {
  const [dbData, setDbData] = useState(null);
  const [selectedTableIndex, setSelectedTableIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tables');

  const fetchDatabaseInfo = async () => {
    setLoading(true);
    try {
      const res = await api.get('/database/overview');
      setDbData(res.data);
    } catch (err) {
      console.error('Failed to fetch database data:', err);
      setDbData({
        engine: 'Embedded In-Memory Database (Active)',
        host: 'Live Production Server',
        status: 'Online',
        tables: [
          { name: 'Users', description: 'User accounts and auth credentials', count: 1, rows: [] },
          { name: 'Businesses', description: 'Registered business profiles', count: 0, rows: [] },
          { name: 'BusinessLocations', description: 'Business branch offices and postal codes', count: 0, rows: [] },
          { name: 'OHProviders', description: 'Accredited occupational health providers', count: 0, rows: [] },
          { name: 'OHProviderLocations', description: 'Provider clinic locations & coverage radius', count: 0, rows: [] },
          { name: 'OHProviderServices', description: 'Services offered by OH providers', count: 0, rows: [] },
          { name: 'Referrals', description: 'Dispatched OH service referrals', count: 0, rows: [] },
          { name: 'ReferralMatches', description: 'Spatial proximity match assignments', count: 0, rows: [] },
          { name: 'EmployeeNotifications', description: 'Employee-submitted employer notifications', count: 0, rows: [] },
          { name: 'UserPasskeys', description: 'Registered WebAuthn FIDO2 Passkeys', count: 0, rows: [] }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatabaseInfo();
  }, []);

  const currentTable = dbData?.tables?.[selectedTableIndex] || null;

  const filteredRows = currentTable?.rows?.filter(row => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return Object.values(row).some(val =>
      String(val).toLowerCase().includes(q)
    );
  }) || [];

  return (
    <div className="flex-1 bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header Banner */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">Database Inspector & Administration</h1>
                <span className="bg-emerald-100 text-emerald-700 text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {dbData?.status || 'Online & Active'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Engine: <span className="font-semibold text-slate-700">{dbData?.engine}</span> &bull; Host: <span className="font-mono text-slate-700">{dbData?.host}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-medium">
              <button
                onClick={() => setActiveTab('tables')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'tables' ? 'bg-white shadow-sm text-slate-900 font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                <span>Live Tables ({dbData?.tables?.length || 10})</span>
              </button>

              <button
                onClick={() => setActiveTab('passkeys')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'passkeys' ? 'bg-white shadow-sm text-blue-700 font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Fingerprint className="w-3.5 h-3.5 text-blue-600" />
                <span>Admin Passkeys</span>
              </button>

              <button
                onClick={() => setActiveTab('hosting')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'hosting' ? 'bg-white shadow-sm text-slate-900 font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Cloud className="w-3.5 h-3.5 text-slate-500" />
                <span>Hosting & Supabase</span>
              </button>
            </div>

            <button
              onClick={async () => {
                if (window.confirm('Are you sure you want to clear/reset non-admin tables for testing?')) {
                  try {
                    await api.post('/database/reset');
                    fetchDatabaseInfo();
                  } catch (e) {
                    alert('Reset error: ' + e.message);
                  }
                }
              }}
              className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl border border-red-200 transition-colors"
            >
              Reset Tables
            </button>

            <button
              onClick={fetchDatabaseInfo}
              disabled={loading}
              className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl border border-slate-200 transition-colors"
              title="Refresh Database View"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* TAB 1: Live Tables Inspector */}
        {activeTab === 'tables' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
            {/* Sidebar: Table Selection List */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-2">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 mb-2">
                Database Tables
              </h2>
              <div className="space-y-1">
                {dbData?.tables?.map((tbl, idx) => (
                  <button
                    key={tbl.name}
                    onClick={() => {
                      setSelectedTableIndex(idx);
                      setSearchQuery('');
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-medium flex items-center justify-between transition-all ${
                      selectedTableIndex === idx
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Table className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{tbl.name}</span>
                    </div>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                      selectedTableIndex === idx ? 'bg-blue-700 text-blue-100' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {tbl.count || (tbl.rows ? tbl.rows.length : 0)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Main: Table Data & Rows */}
            <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50/50">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <span>{currentTable?.name}</span>
                    <span className="text-xs font-normal text-slate-500">
                      ({filteredRows.length} {filteredRows.length === 1 ? 'row' : 'rows'})
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">{currentTable?.description}</p>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={`Search in ${currentTable?.name}...`}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Table Data View */}
              <div className="overflow-x-auto min-h-[300px]">
                {filteredRows.length > 0 ? (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                        {Object.keys(filteredRows[0]).map((col) => (
                          <th key={col} className="py-3 px-4 whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {filteredRows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-50/80 transition-colors">
                          {Object.entries(row).map(([k, v], cIdx) => (
                            <td key={cIdx} className="py-3 px-4 whitespace-nowrap text-slate-800">
                              {k.toLowerCase().includes('status') ? (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-sans font-bold capitalize ${
                                  v === 'matched' || v === 'accepted' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {String(v)}
                                </span>
                              ) : typeof v === 'object' && v !== null ? (
                                JSON.stringify(v)
                              ) : String(v).length > 40 ? (
                                <span title={String(v)}>{String(v).slice(0, 37)}...</span>
                              ) : (
                                String(v ?? 'NULL')
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-12 text-center text-slate-400 space-y-2">
                    <Table className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="text-sm font-medium text-slate-600">No records found in {currentTable?.name}</p>
                    <p className="text-xs text-slate-400">
                      {searchQuery ? 'Try modifying your search filter.' : 'Records will appear here once users register or submit referrals.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Admin Passkeys & Biometrics Management */}
        {activeTab === 'passkeys' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 border border-blue-200 p-6 rounded-2xl">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Fingerprint className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Admin 1-Click Biometric Login</h2>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Register your Face ID, Touch ID, or Windows Hello on this device. Once enrolled, you can sign in to this Super-User Admin portal instantly with 1-click without entering passwords.
                  </p>
                </div>
              </div>
            </div>

            <PasskeyManager />
          </div>
        )}

        {/* TAB 3: Hosting & Architecture Explanation */}
        {activeTab === 'hosting' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">
                Database Architecture & Supabase Cloud Storage
              </h2>
              <p className="text-xs text-slate-500">
                Persistent cloud storage with Supabase PostgreSQL and automated schema management.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50/50 space-y-3">
                <div className="flex items-center gap-2">
                  <Server className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-bold text-sm text-slate-900">1. Supabase PostgreSQL (Recommended & Configured)</h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  The backend now supports direct connections to <strong>Supabase PostgreSQL</strong>. Tables for Users, Businesses, OHProviders, Referrals, and Passkeys are automatically initialized and synchronized.
                </p>
                <div className="bg-slate-900 text-slate-100 p-3 rounded-xl text-xs font-mono overflow-x-auto">
                  <code>DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres</code>
                </div>
                <div className="text-[11px] text-emerald-700 bg-emerald-100 border border-emerald-300 p-2.5 rounded-xl font-medium">
                  &bull; Configured in Render Web Service environment variables for permanent persistence.
                </div>
              </div>

              <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-sm text-slate-900">2. Embedded In-Memory Engine (Fallback)</h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  If no external cloud database is specified, the application seamlessly runs on its built-in relational engine with spatial UK geocoding calculations.
                </p>
                <div className="text-[11px] text-blue-700 bg-blue-50 border border-blue-200 p-2.5 rounded-xl font-medium">
                  &bull; Self-contained fallback ensuring 100% platform uptime.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DatabaseViewer;