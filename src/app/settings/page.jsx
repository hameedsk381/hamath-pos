'use client';

import { useState, useEffect } from 'react';
import { store } from '@/lib/store';
import { 
  SettingsIcon, 
  BarChartIcon, 
  CheckCircleIcon, 
  RefreshCwIcon, 
  MicIcon 
} from '@/components/Icons';

export default function SettingsPage() {
  const [biz, setBiz] = useState(null);
  const [settings, setSettings] = useState(null);
  const [voiceLogs, setVoiceLogs] = useState([]);
  const [toastMessage, setToastMessage] = useState(null);

  const reload = () => {
    setBiz(store.getBusiness());
    setSettings(store.getSettings());
    setVoiceLogs(store.getVoiceTransactions());
  };

  useEffect(() => {
    reload();
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  if (!biz || !settings) return null;

  const totalLogs = voiceLogs.length;
  const avgLatency = totalLogs > 0
    ? Math.round(voiceLogs.reduce((s, l) => s + (l.processing_time_ms || 350), 0) / totalLogs)
    : 350;
  const avgConfidence = totalLogs > 0
    ? Math.round((voiceLogs.reduce((s, l) => s + (l.overall_confidence || 0.9), 0) / totalLogs) * 100)
    : 95;

  const handleToggleDemo = (checked) => {
    store.updateSettings({ demo_mode: checked });
    showToast(checked ? 'Demo mode activated.' : 'Production AI mode activated.');
    reload();
  };

  const handleResetData = () => {
    if (confirm('Reset all catalog products, customer ledgers, and transactions to default demo state?')) {
      store.resetToDefault();
      showToast('Workspace data reset successfully.');
      reload();
    }
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    store.updateBusiness(biz);
    showToast('Business configuration saved.');
  };

  return (
    <div className="view-container">
      {/* Toast Alert */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: 'var(--slate-900)',
          color: '#ffffff',
          padding: '12px 18px',
          borderRadius: 'var(--radius-md)',
          fontSize: '13px',
          fontWeight: 600,
          boxShadow: 'var(--shadow-lg)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <CheckCircleIcon size={16} style={{ color: '#22c55e' }} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--slate-900)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <SettingsIcon size={22} style={{ color: 'var(--primary-dark)' }} />
          System Settings & Enterprise Observability
        </h1>
        <div style={{ fontSize: '12px', color: 'var(--slate-500)', marginTop: '2px' }}>
          సెట్టింగ్స్ & నివేదికలు • Business Profile & Gemini AI Pipeline Configuration
        </div>
      </div>

      {/* AI Engine & Mode Toggle Card */}
      <div className="confirm-card" style={{ marginBottom: '20px', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-xs)', background: '#ffffff', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--slate-900)' }}>Gemini 2.5 Flash Speech-to-Intent Engine</div>
            <div style={{ fontSize: '11px', color: 'var(--slate-500)' }}>Next.js App Router API Route (`/api/voice`) • Andhra Pradesh Telugu Retail Model</div>
          </div>
          <span className="demo-badge" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {settings.demo_mode ? 'Demo Mode Active' : 'Production Active'}
          </span>
        </div>

        <div style={{ background: 'var(--slate-50)', padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: '14px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--slate-800)' }}>Offline / Synthetic Demo Fallback</div>
              <div style={{ fontSize: '11px', color: 'var(--slate-500)' }}>Useful for offline demonstrations without GEMINI_API_KEY environment variable</div>
            </div>
            <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={settings.demo_mode}
                onChange={(e) => handleToggleDemo(e.target.checked)}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: settings.demo_mode ? 'var(--primary-dark)' : '#cbd5e1', transition: '.2s', borderRadius: '24px' }}></span>
            </label>
          </div>
        </div>

        <div style={{ fontSize: '11px', color: 'var(--slate-500)', lineHeight: 1.5 }}>
          In Production mode, requests are securely streamed through the Next.js server-side endpoint. API credentials and secret keys are never exposed in browser runtime code.
        </div>
      </div>

      {/* Observability & Voice Performance Metrics */}
      <div className="confirm-card" style={{ marginBottom: '20px', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-xs)', background: '#ffffff', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <BarChartIcon size={18} style={{ color: 'var(--primary-dark)' }} />
          <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--slate-900)' }}>Real-Time Voice Observability & Telemetry</div>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--slate-500)', marginBottom: '14px' }}>
          Retailer Telugu acoustic accuracy, intent parsing latency, and confidence tracking
        </div>

        <div className="metrics-grid" style={{ marginBottom: '14px' }}>
          <div className="metric-card">
            <div className="metric-label">Total Voice Dispatches</div>
            <div className="metric-value">{totalLogs}</div>
            <div className="metric-sub">Voice STT Invocations</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Average Confidence</div>
            <div className="metric-value" style={{ color: 'var(--primary-dark)' }}>{avgConfidence}%</div>
            <div className="metric-sub">Intent Accuracy Metric</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Average Latency</div>
            <div className="metric-value">{avgLatency}ms</div>
            <div className="metric-sub">End-to-End Parse Time</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Active Engine</div>
            <div className="metric-value" style={{ fontSize: '16px', color: '#16a34a' }}>Gemini 2.5</div>
            <div className="metric-sub">Multimodal Flash API</div>
          </div>
        </div>

        {/* Observability Logs Preview */}
        <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--slate-500)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Recent Voice Telemetry Logs
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
          {voiceLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', fontSize: '12px', color: 'var(--slate-400)', background: 'var(--slate-50)', borderRadius: 'var(--radius-md)' }}>
              No voice interactions logged yet in this session.
            </div>
          ) : (
            voiceLogs.slice(0, 5).map(log => (
              <div key={log.id} className="log-entry-card" style={{ background: 'var(--slate-50)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '10px 12px' }}>
                <div className="log-entry-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 700, color: 'var(--slate-800)', fontSize: '12px' }}>{new Date(log.created_at).toLocaleTimeString()}</span>
                  <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 600 }}>
                    {log.processing_time_ms}ms • {Math.round(log.overall_confidence * 100)}% Match
                  </span>
                </div>
                <div className="log-transcript" style={{ fontSize: '13px', color: 'var(--slate-700)', fontStyle: 'italic', marginBottom: '4px' }}>
                  “{log.transcript}”
                </div>
                <div className="log-json-preview" style={{ fontSize: '11px', color: 'var(--slate-500)', background: '#ffffff', padding: '6px', borderRadius: '4px', border: '1px solid var(--border-subtle)', overflowX: 'auto' }}>
                  {JSON.stringify(log.extracted_json || {})}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Business Profile Form */}
      <div className="confirm-card" style={{ border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-xs)', background: '#ffffff', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
        <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--slate-900)', marginBottom: '14px' }}>Store & Legal Entity Profile</div>

        <form onSubmit={handleSaveProfile}>
          <div className="form-group">
            <label className="form-label">Business Name (English)*</label>
            <input
              type="text"
              className="form-input"
              required
              value={biz.name || ''}
              onChange={(e) => setBiz({ ...biz, name: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Business Telugu Name (వ్యాపార పేరు)*</label>
            <input
              type="text"
              className="form-input"
              required
              value={biz.name_te || ''}
              onChange={(e) => setBiz({ ...biz, name_te: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="form-group">
              <label className="form-label">Owner / Proprietor Name</label>
              <input
                type="text"
                className="form-input"
                value={biz.owner_name || ''}
                onChange={(e) => setBiz({ ...biz, owner_name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number*</label>
              <input
                type="tel"
                className="form-input"
                required
                value={biz.phone || ''}
                onChange={(e) => setBiz({ ...biz, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Store Address*</label>
            <input
              type="text"
              className="form-input"
              required
              value={biz.address || ''}
              onChange={(e) => setBiz({ ...biz, address: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="form-group">
              <label className="form-label">City / Town</label>
              <input
                type="text"
                className="form-input"
                value={biz.city || ''}
                onChange={(e) => setBiz({ ...biz, city: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">GSTIN (Tax ID)</label>
              <input
                type="text"
                className="form-input"
                value={biz.gstin || ''}
                onChange={(e) => setBiz({ ...biz, gstin: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="form-group">
              <label className="form-label">Bank Account Number</label>
              <input
                type="text"
                className="form-input"
                value={biz.bank_account_no || ''}
                onChange={(e) => setBiz({ ...biz, bank_account_no: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">UPI ID for Payments</label>
              <input
                type="text"
                className="form-input"
                value={biz.upi_id || ''}
                onChange={(e) => setBiz({ ...biz, upi_id: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '18px' }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={handleResetData} style={{ color: '#ef4444', borderColor: '#fca5a5' }}>
              Reset Workspace Data
            </button>
            <button type="submit" className="btn btn-primary btn-sm">
              Save Store Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
