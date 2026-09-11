'use client';

import { useState, useEffect } from 'react';
import { store } from '@/lib/store';

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
    showToast(checked ? 'డెమో మోడ్ ఆన్ చేయబడింది.' : 'ప్రొడక్షన్ మోడ్ ఎనేబుల్ అయింది.');
    reload();
  };

  const handleResetData = () => {
    if (confirm('అన్ని ఉత్పత్తులు, కస్టమర్లు మరియు బిల్లులను అసలు డెమో స్థితికి రీసెట్ చేయాలా?')) {
      store.resetToDefault();
      showToast('డేటా విజయవంతంగా రీసెట్ చేయబడింది.');
      reload();
    }
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    store.updateBusiness(biz);
    showToast('వ్యాపార సమాచారం సేవ్ చేయబడింది!');
  };

  return (
    <div className="view-container">
      {/* Toast Alert */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: '#065f46',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '10px',
          fontWeight: 700,
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          zIndex: 9999
        }}>
          ✓ {toastMessage}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>సెట్టింగ్స్ & నివేదికలు (Settings)</h2>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>వ్యాపార సమాచారం & AI పరిశీలన (Observability)</div>
      </div>

      {/* AI Engine & Demo Mode Card */}
      <div className="confirm-card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '15px' }}>🤖 Gemini 2.5 Flash AI ఇంజిన్ (Next.js Route)</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Andhra Pradesh Telugu Retail Voice Model</div>
          </div>
          <span className="demo-badge">
            {settings.demo_mode ? '⚡ Demo Mode Active' : '🟢 Production Ready'}
          </span>
        </div>

        <div style={{ background: 'var(--bg-subtle)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '13px' }}>డెమో మోడ్ (Demo Mode)</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>API Key లేకుండా టెస్ట్ చేయడానికి ఉపయోగపడుతుంది</div>
            </div>
            <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={settings.demo_mode}
                onChange={(e) => handleToggleDemo(e.target.checked)}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: settings.demo_mode ? 'var(--primary)' : '#cbd5e1', transition: '.3s', borderRadius: '24px' }}></span>
            </label>
          </div>
        </div>

        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
          ℹ️ Production మోడ్‌లో Next.js App Router API Route (`/api/voice`) ద్వారా Gemini 2.5 Flash API calls సర్వర్ సైడ్ ద్వారా సురక్షితంగా వెళ్తాయి. API కీలు ఎప్పటికీ బ్రౌజర్ కోడ్‌లో బయటపడవు.
        </div>
      </div>

      {/* Observability & Voice Performance Metrics */}
      <div className="confirm-card" style={{ marginBottom: '20px' }}>
        <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '4px' }}>📊 వాయిస్ లావాదేవీల పరిశీలన (Voice Observability)</div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
          రీటైలర్ల మాటలు, ఖచ్చితత్వం మరియు ప్రతిస్పందన సమయం
        </div>

        <div className="metrics-grid" style={{ marginBottom: '14px' }}>
          <div className="metric-card">
            <div className="metric-label">మొత్తం వాయిస్ కాల్స్</div>
            <div className="metric-value">{totalLogs}</div>
            <div className="metric-sub">Voice Queries</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">సగటు ఖచ్చితత్వం</div>
            <div className="metric-value" style={{ color: 'var(--primary)' }}>{avgConfidence}%</div>
            <div className="metric-sub">Avg Confidence</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">ప్రాసెసింగ్ సమయం</div>
            <div className="metric-value">{avgLatency}ms</div>
            <div className="metric-sub">Latency</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">యూజర్ సవరణలు</div>
            <div className="metric-value" style={{ color: 'var(--secondary)' }}>0</div>
            <div className="metric-sub">Corrections Needed</div>
          </div>
        </div>

        {/* Observability Logs Preview */}
        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>
          ఇటీవలి వాయిస్ ప్రశ్నలు (Recent Voice Logs)
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
          {voiceLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', fontSize: '12px', color: 'var(--text-muted)' }}>
              ఇంకా వాయిస్ రికార్డింగ్‌లు లేవు.
            </div>
          ) : (
            voiceLogs.slice(0, 5).map(log => (
              <div key={log.id} className="log-entry-card">
                <div className="log-entry-header">
                  <span style={{ fontWeight: 700, color: 'var(--primary-dark)' }}>{new Date(log.created_at).toLocaleTimeString()}</span>
                  <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>
                    {log.processing_time_ms}ms • {Math.round(log.overall_confidence * 100)}%
                  </span>
                </div>
                <div className="log-transcript">🗣️ “{log.transcript}”</div>
                <div className="log-json-preview">
                  {JSON.stringify(log.extracted_json || {})}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Business Profile Form */}
      <div className="confirm-card">
        <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '14px' }}>🏢 దుకాణం వివరాలు (Business Profile)</div>

        <form onSubmit={handleSaveProfile}>
          <div className="form-group">
            <label className="form-label">దుకాణం పేరు (Business English Name)*</label>
            <input
              type="text"
              className="form-input"
              required
              value={biz.name || ''}
              onChange={(e) => setBiz({ ...biz, name: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">తెలుగు పేరు (Telugu Name)*</label>
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
              <label className="form-label">యజమాని పేరు (Owner)</label>
              <input
                type="text"
                className="form-input"
                value={biz.owner_name || ''}
                onChange={(e) => setBiz({ ...biz, owner_name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">ఫోన్ నంబర్ (Phone)*</label>
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
            <label className="form-label">చిరునామా (Address)*</label>
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
              <label className="form-label">నగరం (City)</label>
              <input
                type="text"
                className="form-input"
                value={biz.city || ''}
                onChange={(e) => setBiz({ ...biz, city: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">GSTIN (Optional)</label>
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
              <label className="form-label">బ్యాంక్ ఖాతా (A/c No)</label>
              <input
                type="text"
                className="form-input"
                value={biz.bank_account_no || ''}
                onChange={(e) => setBiz({ ...biz, bank_account_no: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">UPI ID</label>
              <input
                type="text"
                className="form-input"
                value={biz.upi_id || ''}
                onChange={(e) => setBiz({ ...biz, upi_id: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '18px' }}>
            <button type="button" className="btn btn-danger-outline btn-sm" onClick={handleResetData}>
              🔄 డెమో డేటా రీసెట్ (Reset Data)
            </button>
            <button type="submit" className="btn btn-primary btn-sm">
              💾 సేవ్ చేయండి (Save Profile)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
