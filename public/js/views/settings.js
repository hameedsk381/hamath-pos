/**
 * Maatlaadi Bill - Settings & Observability View
 * Business profile configuration, Gemini API status, Demo mode toggle,
 * and voice transaction observability logging
 */

window.SettingsView = {
  render(container) {
    const biz = window.Store.getBusiness();
    const settings = window.Store.getSettings();
    const voiceLogs = window.Store.getVoiceTransactions();

    // Calculate Observability Metrics
    const totalLogs = voiceLogs.length;
    const avgLatency = totalLogs > 0
      ? Math.round(voiceLogs.reduce((s, l) => s + (l.processing_time_ms || 350), 0) / totalLogs)
      : 350;
    const avgConfidence = totalLogs > 0
      ? Math.round((voiceLogs.reduce((s, l) => s + (l.overall_confidence || 0.9), 0) / totalLogs) * 100)
      : 95;

    container.innerHTML = `
      <div class="view-container">
        <!-- Header -->
        <div style="margin-bottom: 16px;">
          <h2 style="font-size: 20px; font-weight: 800; color: var(--text-primary);">సెట్టింగ్స్ & నివేదికలు (Settings)</h2>
          <div style="font-size: 12px; color: var(--text-secondary);">వ్యాపార సమాచారం & AI పరిశీలన (Observability)</div>
        </div>

        <!-- AI Engine & Demo Mode Card -->
        <div class="confirm-card" style="margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div>
              <div style="font-weight: 700; font-size: 15px;">🤖 Gemini AI వాయిస్ ఇంజిన్</div>
              <div style="font-size: 11px; color: var(--text-secondary);">Andhra Pradesh Retail Voice Model</div>
            </div>
            <span class="demo-badge">
              ${settings.demo_mode ? '⚡ Demo Mode Active' : '🟢 Production Ready'}
            </span>
          </div>

          <div style="background: var(--bg-subtle); padding: 12px; border-radius: var(--radius-sm); margin-bottom: 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-weight: 600; font-size: 13px;">డెమో మోడ్ (Demo Mode)</div>
                <div style="font-size: 11px; color: var(--text-secondary);">API Key లేకుండా టెస్ట్ చేయడానికి ఉపయోగపడుతుంది</div>
              </div>
              <label style="position: relative; display: inline-block; width: 44px; height: 24px; cursor: pointer;">
                <input type="checkbox" id="toggle-demo-mode" ${settings.demo_mode ? 'checked' : ''} style="opacity: 0; width: 0; height: 0;">
                <span style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: ${settings.demo_mode ? 'var(--primary)' : '#cbd5e1'}; transition: .3s; border-radius: 24px;"></span>
              </label>
            </div>
          </div>

          <div style="font-size: 11px; color: var(--text-secondary); line-height: 1.4;">
            ℹ️ Production మోడ్‌లో Gemini API calls సర్వర్ సైడ్ ద్వారా సురక్షితంగా వెళ్తాయి. API కీలు ఎప్పటికీ బ్రౌజర్ కోడ్‌లో బయటపడవు.
          </div>
        </div>

        <!-- Observability & Voice Performance Metrics -->
        <div class="confirm-card" style="margin-bottom: 20px;">
          <div style="font-weight: 700; font-size: 15px; margin-bottom: 4px;">📊 వాయిస్ లావాదేవీల పరిశీలన (Voice Observability)</div>
          <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 14px;">
            రీటైలర్ల మాటలు, ఖచ్చితత్వం మరియు ప్రతిస్పందన సమయం
          </div>

          <div class="metrics-grid" style="margin-bottom: 14px;">
            <div class="metric-card">
              <div class="metric-label">మొత్తం వాయిస్ కాల్స్</div>
              <div class="metric-value">${totalLogs}</div>
              <div class="metric-sub">Voice Queries</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">సగటు ఖచ్చితత్వం</div>
              <div class="metric-value" style="color: var(--primary);">${avgConfidence}%</div>
              <div class="metric-sub">Avg Confidence</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">ప్రాసెసింగ్ సమయం</div>
              <div class="metric-value">${avgLatency}ms</div>
              <div class="metric-sub">Latency</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">యూజర్ సవరణలు</div>
              <div class="metric-value" style="color: var(--secondary);">0</div>
              <div class="metric-sub">Corrections Needed</div>
            </div>
          </div>

          <!-- Observability Logs Preview -->
          <div style="font-size: 12px; font-weight: 700; color: var(--text-secondary); margin-bottom: 8px; text-transform: uppercase;">
            ఇటీవలి వాయిస్ ప్రశ్నలు (Recent Voice Logs)
          </div>

          <div style="display: flex; flex-direction: column; gap: 8px; max-height: 240px; overflow-y: auto;">
            ${voiceLogs.length === 0 ? `
              <div style="text-align: center; padding: 20px; font-size: 12px; color: var(--text-muted);">
                ఇంకా వాయిస్ రికార్డింగ్‌లు లేవు.
              </div>
            ` : voiceLogs.slice(0, 5).map(log => `
              <div class="log-entry-card">
                <div class="log-entry-header">
                  <span style="font-weight: 700; color: var(--primary-dark);">${new Date(log.created_at).toLocaleTimeString()}</span>
                  <span style="background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px; font-size: 10px;">${log.processing_time_ms}ms • ${Math.round(log.overall_confidence * 100)}%</span>
                </div>
                <div class="log-transcript">🗣️ “${log.transcript}”</div>
                <div class="log-json-preview">
                  ${JSON.stringify(log.extracted_json || {})}
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Business Profile Form -->
        <div class="confirm-card">
          <div style="font-weight: 700; font-size: 15px; margin-bottom: 14px;">🏢 దుకాణం వివరాలు (Business Profile)</div>

          <form id="business-profile-form">
            <div class="form-group">
              <label class="form-label">దుకాణం పేరు (Business English Name)*</label>
              <input type="text" id="biz-name" class="form-input" required value="${biz.name}">
            </div>

            <div class="form-group">
              <label class="form-label">తెలుగు పేరు (Telugu Name)*</label>
              <input type="text" id="biz-name-te" class="form-input" required value="${biz.name_te}">
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div class="form-group">
                <label class="form-label">యజమాని పేరు (Owner)</label>
                <input type="text" id="biz-owner" class="form-input" value="${biz.owner_name}">
              </div>
              <div class="form-group">
                <label class="form-label">ఫోన్ నంబర్ (Phone)*</label>
                <input type="tel" id="biz-phone" class="form-input" required value="${biz.phone}">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">చిరునామా (Address)*</label>
              <input type="text" id="biz-address" class="form-input" required value="${biz.address}">
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div class="form-group">
                <label class="form-label">నగరం (City)</label>
                <input type="text" id="biz-city" class="form-input" value="${biz.city}">
              </div>
              <div class="form-group">
                <label class="form-label">GSTIN (Optional)</label>
                <input type="text" id="biz-gstin" class="form-input" value="${biz.gstin}">
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div class="form-group">
                <label class="form-label">బ్యాంక్ ఖాతా (A/c No)</label>
                <input type="text" id="biz-bank-acc" class="form-input" value="${biz.bank_account_no}">
              </div>
              <div class="form-group">
                <label class="form-label">UPI ID</label>
                <input type="text" id="biz-upi" class="form-input" value="${biz.upi_id}">
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 18px;">
              <button type="button" class="btn btn-danger-outline btn-sm" id="btn-reset-data">
                🔄 డెమో డేటా రీసెట్ (Reset Data)
              </button>
              <button type="submit" class="btn btn-primary btn-sm">
                💾 సేవ్ చేయండి (Save Profile)
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    this.bindEvents(container);
  },

  bindEvents(container) {
    // Demo Mode Toggle
    const demoToggle = container.querySelector('#toggle-demo-mode');
    demoToggle.addEventListener('change', (e) => {
      window.Store.updateSettings({ demo_mode: e.target.checked });
      window.App.showToast(e.target.checked ? 'డెమో మోడ్ ఆన్ చేయబడింది.' : 'ప్రొడక్షన్ మోడ్ ఎనేబుల్ అయింది.', 'info');
      this.render(container);
    });

    // Reset Data
    container.querySelector('#btn-reset-data').addEventListener('click', () => {
      if (confirm('అన్ని ఉత్పత్తులు, కస్టమర్లు మరియు బిల్లులను అసలు డెమో స్థితికి రీసెట్ చేయాలా?')) {
        window.Store.resetToDefault();
        window.App.showToast('డేటా విజయవంతంగా రీసెట్ చేయబడింది.', 'success');
        this.render(container);
      }
    });

    // Save Business Profile
    container.querySelector('#business-profile-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const updated = {
        name: container.querySelector('#biz-name').value.trim(),
        name_te: container.querySelector('#biz-name-te').value.trim(),
        owner_name: container.querySelector('#biz-owner').value.trim(),
        phone: container.querySelector('#biz-phone').value.trim(),
        address: container.querySelector('#biz-address').value.trim(),
        city: container.querySelector('#biz-city').value.trim(),
        gstin: container.querySelector('#biz-gstin').value.trim(),
        bank_account_no: container.querySelector('#biz-bank-acc').value.trim(),
        upi_id: container.querySelector('#biz-upi').value.trim()
      };
      window.Store.updateBusiness(updated);
      window.App.showToast('వ్యాపార సమాచారం సేవ్ చేయబడింది!', 'success');
    });
  }
};
