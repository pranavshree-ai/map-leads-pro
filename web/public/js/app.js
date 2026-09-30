/**
 * MapsLead Studio Pro - Interactive Client Application
 */

(function () {
  'use strict';

  // Application State
  const state = {
    jobs: [],
    activeJobId: null,
    activeJobTimer: null,
    activeJobSeconds: 0,
    currentLeadData: null,
    filteredLeads: [],
    activeFilter: 'all',
    searchQuery: '',
    sortColumn: 'title',
    sortAsc: true,
    viewMode: 'table', // 'table' | 'cards'
    isDarkTheme: true
  };

  // DOM Elements
  const DOM = {
    engineBeacon: document.getElementById('engine-beacon'),
    engineStatusText: document.getElementById('engine-status-text'),
    totalJobsCount: document.getElementById('total-jobs-count'),
    activeJobsCount: document.getElementById('active-jobs-count'),
    btnRefreshJobs: document.getElementById('btn-refresh-jobs'),
    btnThemeToggle: document.getElementById('btn-theme-toggle'),

    // Scrape Form
    scrapeForm: document.getElementById('scrape-form'),
    locationInput: document.getElementById('location-input'),
    geoStatusBadge: document.getElementById('geo-status-badge'),
    btnManualCoords: document.getElementById('btn-manual-coords'),
    coordsDrawer: document.getElementById('coords-drawer'),
    latInput: document.getElementById('lat-input'),
    lonInput: document.getElementById('lon-input'),
    resolvedGeoText: document.getElementById('resolved-geo-text'),
    keywordsInput: document.getElementById('keywords-input'),
    keywordCountBadge: document.getElementById('keyword-count-badge'),
    depthSlider: document.getElementById('depth-slider'),
    depthDisplay: document.getElementById('depth-display'),
    emailToggle: document.getElementById('email-toggle'),
    socialsToggle: document.getElementById('socials-toggle'),
    fastmodeToggle: document.getElementById('fastmode-toggle'),
    radiusInput: document.getElementById('radius-input'),
    zoomInput: document.getElementById('zoom-input'),
    maxtimeSelect: document.getElementById('maxtime-select'),
    proxiesInput: document.getElementById('proxies-input'),
    btnStartScrape: document.getElementById('btn-start-scrape'),

    // Active Mission Card
    liveMissionCard: document.getElementById('live-mission-card'),
    activeQueryTitle: document.getElementById('active-query-title'),
    activeQuerySub: document.getElementById('active-query-sub'),
    missionElapsedTimer: document.getElementById('mission-elapsed-timer'),
    activeStatusBadge: document.getElementById('active-status-badge'),
    activeStatusDetail: document.getElementById('active-status-detail'),

    // Jobs Pipeline Table
    historySearch: document.getElementById('history-search'),
    jobsTableBody: document.getElementById('jobs-table-body'),

    // Lead Explorer Modal
    leadExplorerModal: document.getElementById('lead-explorer-modal'),
    modalJobTitle: document.getElementById('modal-job-title'),
    modalJobMeta: document.getElementById('modal-job-meta'),
    modalStatTotal: document.getElementById('modal-stat-total'),
    modalStatEmails: document.getElementById('modal-stat-emails'),
    modalStatPhones: document.getElementById('modal-stat-phones'),
    modalStatWebsites: document.getElementById('modal-stat-websites'),
    modalStatRating: document.getElementById('modal-stat-rating'),
    leadFilterSearch: document.getElementById('lead-filter-search'),
    quickFilterChips: document.querySelectorAll('.filter-chip'),
    viewModeTable: document.getElementById('view-mode-table'),
    viewModeCards: document.getElementById('view-mode-cards'),
    leadsTableContainer: document.getElementById('leads-table-container'),
    leadsCardsContainer: document.getElementById('leads-cards-container'),
    leadsTableBody: document.getElementById('leads-table-body'),
    modalShowingCount: document.getElementById('modal-showing-count'),
    btnCloseModal: document.getElementById('btn-close-modal'),
    btnCloseModalBottom: document.getElementById('btn-close-modal-bottom'),
    btnExportCsv: document.getElementById('btn-export-csv'),
    btnExportJson: document.getElementById('btn-export-json'),
    btnCopyClipboard: document.getElementById('btn-copy-clipboard'),

    // Toast Shelf
    toastContainer: document.getElementById('toast-container')
  };

  // Toast Notification Utility
  function showToast(message, type = 'info', duration = 3500) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '⚠️';

    toast.innerHTML = `<span>${icon}</span><span>${escapeHtml(message)}</span>`;
    DOM.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease-out';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Format Elapsed Time (MM:SS)
  function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  // Initialize System
  async function init() {
    bindEvents();
    loadTheme();
    await checkEngineHealth();
    await fetchJobs();

    // Auto-refresh jobs and health periodically
    setInterval(fetchJobs, 6000);
    setInterval(checkEngineHealth, 12000);
  }

  // Bind Event Listeners
  function bindEvents() {
    // Theme toggle
    DOM.btnThemeToggle.addEventListener('click', toggleTheme);

    // Refresh jobs
    DOM.btnRefreshJobs.addEventListener('click', async () => {
      DOM.btnRefreshJobs.style.transform = 'rotate(180deg)';
      await fetchJobs();
      setTimeout(() => { DOM.btnRefreshJobs.style.transform = 'none'; }, 300);
      showToast('Dashboard refreshed', 'info');
    });

    // Smart Geocoding
    let geocodeTimeout;
    DOM.locationInput.addEventListener('input', () => {
      clearTimeout(geocodeTimeout);
      geocodeTimeout = setTimeout(() => {
        performGeocode(DOM.locationInput.value);
      }, 700);
    });

    // Toggle Manual Coordinates Drawer
    DOM.btnManualCoords.addEventListener('click', () => {
      DOM.coordsDrawer.classList.toggle('hidden');
    });

    // Quick City Chips
    document.querySelectorAll('.preset-chips button[data-city]').forEach(btn => {
      btn.addEventListener('click', () => {
        DOM.locationInput.value = btn.dataset.city;
        DOM.latInput.value = btn.dataset.lat;
        DOM.lonInput.value = btn.dataset.lon;
        DOM.resolvedGeoText.textContent = `Coordinates locked: ${btn.dataset.lat}, ${btn.dataset.lon}`;
        DOM.geoStatusBadge.textContent = 'Locked ✓';
        DOM.geoStatusBadge.className = 'badge badge-success';
        showToast(`Target set to ${btn.dataset.city}`, 'info');
      });
    });

    // Keyword Count and Presets
    DOM.keywordsInput.addEventListener('input', updateKeywordCount);
    document.querySelectorAll('.kw-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        const kw = btn.dataset.kw;
        const current = DOM.keywordsInput.value.trim();
        if (!current) {
          DOM.keywordsInput.value = kw;
        } else if (!current.includes(kw)) {
          DOM.keywordsInput.value = `${current}\n${kw}`;
        }
        updateKeywordCount();
      });
    });

    // Depth Slider Update
    DOM.depthSlider.addEventListener('input', () => {
      const val = parseInt(DOM.depthSlider.value, 10);
      const approx = val * 8;
      DOM.depthDisplay.textContent = `Depth: ${val} (~${approx}-${approx * 2} leads)`;
    });

    // Form Submission (Launch Mission)
    DOM.scrapeForm.addEventListener('submit', handleScrapeSubmit);

    // History Table Search
    DOM.historySearch.addEventListener('input', () => {
      renderJobsTable(DOM.historySearch.value.trim().toLowerCase());
    });

    // Lead Explorer Modal Events
    DOM.btnCloseModal.addEventListener('click', closeLeadExplorer);
    DOM.btnCloseModalBottom.addEventListener('click', closeLeadExplorer);
    DOM.leadExplorerModal.addEventListener('click', (e) => {
      if (e.target === DOM.leadExplorerModal) closeLeadExplorer();
    });

    // Search inside Lead Explorer
    DOM.leadFilterSearch.addEventListener('input', () => {
      state.searchQuery = DOM.leadFilterSearch.value.trim().toLowerCase();
      applyLeadFilters();
    });

    // Filter Chips
    DOM.quickFilterChips.forEach(chip => {
      chip.addEventListener('click', () => {
        DOM.quickFilterChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        state.activeFilter = chip.dataset.filter;
        applyLeadFilters();
      });
    });

    // View Mode Toggle (Table vs Cards)
    DOM.viewModeTable.addEventListener('click', () => switchViewMode('table'));
    DOM.viewModeCards.addEventListener('click', () => switchViewMode('cards'));

    // Export Handlers
    DOM.btnExportCsv.addEventListener('click', exportLeadsCSV);
    DOM.btnExportJson.addEventListener('click', exportLeadsJSON);
    DOM.btnCopyClipboard.addEventListener('click', copyLeadsClipboard);

    // Table Header Sorting
    document.querySelectorAll('.lead-data-table th.sortable').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.dataset.sort;
        if (state.sortColumn === col) {
          state.sortAsc = !state.sortAsc;
        } else {
          state.sortColumn = col;
          state.sortAsc = true;
        }
        applyLeadFilters();
      });
    });
  }

  // Geocoding Helper
  async function performGeocode(locationText) {
    if (!locationText || locationText.trim().length < 2) return;

    DOM.geoStatusBadge.textContent = 'Resolving...';
    DOM.geoStatusBadge.className = 'badge badge-warning';

    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(locationText)}`);
      if (!res.ok) throw new Error('Location not found');
      
      const data = await res.json();
      DOM.latInput.value = data.lat;
      DOM.lonInput.value = data.lon;
      DOM.resolvedGeoText.textContent = `Resolved: ${data.displayName}`;
      DOM.geoStatusBadge.textContent = 'Resolved ✓';
      DOM.geoStatusBadge.className = 'badge badge-success';
    } catch (err) {
      DOM.geoStatusBadge.textContent = 'Manual Needed';
      DOM.geoStatusBadge.className = 'badge badge-danger';
      DOM.resolvedGeoText.textContent = 'Could not resolve automatically. Set coordinates below.';
      DOM.coordsDrawer.classList.remove('hidden');
    }
  }

  // Update Keyword Count Badge
  function updateKeywordCount() {
    const raw = DOM.keywordsInput.value.trim();
    const count = raw ? raw.split('\n').filter(k => k.trim().length > 0).length : 0;
    DOM.keywordCountBadge.textContent = `${count} keyword${count === 1 ? '' : 's'}`;
  }

  // Check Backend Engine Health
  async function checkEngineHealth() {
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      if (data.engineStatus === 'connected') {
        DOM.engineBeacon.className = 'status-beacon beacon-online';
        DOM.engineStatusText.textContent = 'Online';
      } else {
        DOM.engineBeacon.className = 'status-beacon beacon-offline';
        DOM.engineStatusText.textContent = 'Connecting...';
      }
    } catch {
      DOM.engineBeacon.className = 'status-beacon beacon-offline';
      DOM.engineStatusText.textContent = 'Disconnected';
    }
  }

  // Fetch Jobs Pipeline
  async function fetchJobs() {
    try {
      const res = await fetch('/api/v1/jobs');
      if (!res.ok) return;

      const jobs = await res.json();
      state.jobs = Array.isArray(jobs) ? jobs : [];
      
      // Update Stat Pills
      DOM.totalJobsCount.textContent = state.jobs.length;
      const activeCount = state.jobs.filter(j => j.Status === 'working' || j.status === 'working').length;
      DOM.activeJobsCount.textContent = activeCount;

      renderJobsTable(DOM.historySearch.value.trim().toLowerCase());

      // Track active job if polling
      if (state.activeJobId) {
        const currentActive = state.jobs.find(j => (j.id || j.ID) === state.activeJobId);
        if (currentActive) {
          const status = currentActive.Status || currentActive.status;
          if (status === 'ok') {
            stopActiveMissionTracker(true);
          } else if (status === 'failed') {
            stopActiveMissionTracker(false);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to fetch jobs:', err);
    }
  }

  // Render Jobs Table
  function renderJobsTable(filterQuery = '') {
    const tbody = DOM.jobsTableBody;
    const filtered = state.jobs.filter(j => {
      if (!filterQuery) return true;
      const name = (j.name || j.Name || '').toLowerCase();
      const id = (j.id || j.ID || '').toLowerCase();
      return name.includes(filterQuery) || id.includes(filterQuery);
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr class="empty-row">
          <td colspan="5">
            <div class="empty-state">
              <p>${filterQuery ? 'No jobs match your filter' : 'No jobs recorded yet. Launch your first mission!'}</p>
            </div>
          </td>
        </tr>`;
      return;
    }

    // Sort descending by creation date or ID
    filtered.sort((a, b) => (b.id || b.ID || '').localeCompare(a.id || a.ID || ''));

    tbody.innerHTML = filtered.map(job => {
      const id = job.id || job.ID || 'unknown';
      const name = job.name || job.Name || 'Maps Scrape';
      const status = (job.Status || job.status || 'unknown').toLowerCase();
      const date = job.date || job.Date || job.created_at || 'Just now';

      let statusBadge = `<span class="badge badge-subtle">${escapeHtml(status)}</span>`;
      if (status === 'ok') {
        statusBadge = `<span class="badge badge-success">✓ Completed</span>`;
      } else if (status === 'working') {
        statusBadge = `<span class="badge badge-warning">⚡ In Progress</span>`;
      } else if (status === 'failed') {
        statusBadge = `<span class="badge badge-danger">✗ Failed</span>`;
      }

      return `
        <tr>
          <td>
            <div class="job-name-cell">
              <span class="job-name-text">${escapeHtml(name)}</span>
              <span class="job-id-text">${escapeHtml(id.slice(0, 14))}...</span>
            </div>
          </td>
          <td>
            <div class="job-meta-cell">
              <span class="job-keywords-text">Scraped Listings</span>
              <span class="job-coords-text">${escapeHtml(date)}</span>
            </div>
          </td>
          <td>
            <span class="job-coords-text">${escapeHtml(date)}</span>
          </td>
          <td>${statusBadge}</td>
          <td class="text-right">
            <div class="action-buttons-group">
              ${status === 'ok' ? `
                <button class="btn-action-icon btn-explore" data-id="${id}" title="Explore Leads in Browser">
                  👁️ Explore
                </button>
                <a href="/api/v1/jobs/${id}/download" download="leads-${id.slice(0, 8)}.csv" class="btn-action-icon" title="Download CSV">
                  📥 CSV
                </a>
              ` : ''}
              <button class="btn-action-icon btn-action-delete" data-id="${id}" title="Delete Job">
                🗑️
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Attach Event Listeners to Action Buttons
    tbody.querySelectorAll('.btn-explore').forEach(btn => {
      btn.addEventListener('click', () => openLeadExplorer(btn.dataset.id));
    });

    tbody.querySelectorAll('.btn-action-delete').forEach(btn => {
      btn.addEventListener('click', () => deleteJob(btn.dataset.id));
    });
  }

  // Handle Scrape Submission
  async function handleScrapeSubmit(e) {
    e.preventDefault();

    const location = DOM.locationInput.value.trim();
    const lat = DOM.latInput.value.trim();
    const lon = DOM.lonInput.value.trim();
    const rawKeywords = DOM.keywordsInput.value.trim();

    if (!rawKeywords) {
      showToast('Please enter at least one keyword', 'error');
      return;
    }
    if (!lat || !lon) {
      showToast('Valid latitude & longitude required. Geocoding...', 'error');
      await performGeocode(location);
      return;
    }

    const keywords = rawKeywords.split('\n')
      .map(k => k.trim())
      .filter(k => k.length > 0)
      .map(k => (location && !k.toLowerCase().includes(location.toLowerCase()) ? `${k} in ${location}` : k));

    const depth = parseInt(DOM.depthSlider.value, 10);
    const email = DOM.emailToggle.checked;
    const fastMode = DOM.fastmodeToggle.checked;
    const radius = parseFloat(DOM.radiusInput.value) || 10000;
    const zoom = parseInt(DOM.zoomInput.value, 10) || 15;
    const maxTime = parseInt(DOM.maxtimeSelect.value, 10) || 300;

    let proxies = null;
    const rawProxies = DOM.proxiesInput.value.trim();
    if (rawProxies) {
      proxies = rawProxies.split('\n').map(p => p.trim()).filter(p => p.length > 0);
    }

    const payload = {
      name: `${keywords[0].slice(0, 24)} (${location || 'Local'})`,
      keywords: keywords,
      lang: 'en',
      zoom: zoom,
      lat: String(lat),
      lon: String(lon),
      fast_mode: fastMode,
      radius: radius,
      depth: depth,
      email: email,
      max_time: maxTime,
      proxies: proxies
    };

    DOM.btnStartScrape.disabled = true;
    DOM.btnStartScrape.innerHTML = `<span>Dispatching Mission...</span>`;

    try {
      const res = await fetch('/api/v1/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Failed to start job');
      }

      const data = await res.json();
      const jobId = data.id || data.ID;

      showToast(`Mission Launched! Job ID: ${jobId.slice(0, 8)}`, 'success');
      startActiveMissionTracker(jobId, `${keywords[0]} in ${location}`);
      await fetchJobs();
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error', 5000);
    } finally {
      DOM.btnStartScrape.disabled = false;
      DOM.btnStartScrape.innerHTML = `
        <span class="btn-shimmer"></span>
        <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
        <span>Launch Scrape Mission</span>
      `;
    }
  }

  // Active Mission Tracker
  function startActiveMissionTracker(jobId, title) {
    state.activeJobId = jobId;
    state.activeJobSeconds = 0;

    DOM.activeQueryTitle.textContent = title;
    DOM.activeQuerySub.textContent = `Resolving Google Maps places for Job ${jobId.slice(0, 8)}...`;
    DOM.liveMissionCard.classList.remove('hidden');

    clearInterval(state.activeJobTimer);
    state.activeJobTimer = setInterval(() => {
      state.activeJobSeconds++;
      DOM.missionElapsedTimer.textContent = formatTime(state.activeJobSeconds);
    }, 1000);
  }

  function stopActiveMissionTracker(isSuccess) {
    clearInterval(state.activeJobTimer);
    DOM.liveMissionCard.classList.add('hidden');
    
    if (isSuccess) {
      showToast(`Scrape mission finished successfully!`, 'success', 5000);
      if (state.activeJobId) {
        openLeadExplorer(state.activeJobId);
      }
    } else {
      showToast('Scrape mission stopped or failed.', 'error', 4000);
    }
    state.activeJobId = null;
  }

  // Delete Job
  async function deleteJob(id) {
    if (!confirm('Are you sure you want to delete this job and its scraped leads?')) return;

    try {
      const res = await fetch(`/api/v1/jobs/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Job removed from pipeline', 'info');
        await fetchJobs();
      } else {
        throw new Error('Failed to delete job');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  // Open Lead Explorer Modal
  async function openLeadExplorer(jobId) {
    const job = state.jobs.find(j => (j.id || j.ID) === jobId);
    const jobTitle = job ? (job.name || job.Name) : 'Scraped Leads';

    DOM.modalJobTitle.textContent = jobTitle;
    DOM.modalJobMeta.textContent = `Job ID: ${jobId.slice(0, 12)} • Loading leads...`;
    DOM.leadExplorerModal.classList.remove('hidden');
    DOM.leadsTableBody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding: 40px;">Extracting and qualifying leads...</td></tr>`;

    try {
      const res = await fetch(`/api/leads/${jobId}`);
      if (!res.ok) throw new Error('Could not load leads for this job');

      const data = await res.json();
      state.currentLeadData = data;
      state.currentJobId = jobId;

      // Update Ribbon Stats
      DOM.modalStatTotal.textContent = data.stats.total;
      DOM.modalStatEmails.textContent = data.stats.withEmail;
      DOM.modalStatPhones.textContent = data.stats.withPhone;
      DOM.modalStatWebsites.textContent = data.stats.withWebsite;
      DOM.modalStatRating.textContent = `${data.stats.avgRating} ★`;
      DOM.modalJobMeta.textContent = `Job ID: ${jobId.slice(0, 12)} • ${data.stats.total} Qualified Places`;

      applyLeadFilters();
    } catch (err) {
      DOM.leadsTableBody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding: 40px; color: var(--accent-rose);">Failed to load leads: ${err.message}</td></tr>`;
      showToast(err.message, 'error');
    }
  }

  function closeLeadExplorer() {
    DOM.leadExplorerModal.classList.add('hidden');
  }

  // Apply Search, Filters and Sorting to Leads
  function applyLeadFilters() {
    if (!state.currentLeadData || !state.currentLeadData.leads) return;

    let leads = [...state.currentLeadData.leads];

    // Filter by Search Query
    if (state.searchQuery) {
      leads = leads.filter(l => {
        const title = (l.title || '').toLowerCase();
        const cat = (l.category || '').toLowerCase();
        const addr = (l.address || '').toLowerCase();
        const email = (l.email || '').toLowerCase();
        return title.includes(state.searchQuery) || 
               cat.includes(state.searchQuery) || 
               addr.includes(state.searchQuery) ||
               email.includes(state.searchQuery);
      });
    }

    // Filter by Chip Selection
    if (state.activeFilter === 'has-email') {
      leads = leads.filter(l => l.email && l.email.trim().length > 0);
    } else if (state.activeFilter === 'has-phone') {
      leads = leads.filter(l => l.phone && l.phone.trim().length > 0);
    } else if (state.activeFilter === 'has-website') {
      leads = leads.filter(l => l.website && l.website.trim().length > 0);
    } else if (state.activeFilter === 'top-rated') {
      leads = leads.filter(l => l.rating >= 4.5);
    }

    // Sorting
    leads.sort((a, b) => {
      let valA = a[state.sortColumn] || '';
      let valB = b[state.sortColumn] || '';

      if (state.sortColumn === 'rating' || state.sortColumn === 'reviews') {
        valA = parseFloat(valA) || 0;
        valB = parseFloat(valB) || 0;
      } else {
        valA = String(valA).toLowerCase();
        valB = String(valB).toLowerCase();
      }

      if (valA < valB) return state.sortAsc ? -1 : 1;
      if (valA > valB) return state.sortAsc ? 1 : -1;
      return 0;
    });

    state.filteredLeads = leads;
    DOM.modalShowingCount.textContent = `Showing ${leads.length} of ${state.currentLeadData.leads.length} leads`;

    renderLeadsView();
  }

  // Render Leads (Table or Card View)
  function renderLeadsView() {
    if (state.viewMode === 'table') {
      DOM.leadsTableContainer.classList.remove('hidden');
      DOM.leadsCardsContainer.classList.add('hidden');
      renderLeadsTable();
    } else {
      DOM.leadsTableContainer.classList.add('hidden');
      DOM.leadsCardsContainer.classList.remove('hidden');
      renderLeadsCards();
    }
  }

  function renderLeadsTable() {
    const tbody = DOM.leadsTableBody;
    if (state.filteredLeads.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding: 40px; color: var(--text-muted);">No leads match the selected criteria.</td></tr>`;
      return;
    }

    tbody.innerHTML = state.filteredLeads.map(l => {
      const email = l.email ? `<span class="email-pill">${escapeHtml(l.email)}</span>` : '<span class="text-muted">—</span>';
      const phone = l.phone ? `<a href="tel:${escapeHtml(l.phone)}" class="contact-link">📞 ${escapeHtml(l.phone)}</a>` : '<span class="text-muted">—</span>';
      const website = l.website ? `<a href="${escapeHtml(l.website)}" target="_blank" rel="noopener" class="contact-link">🌐 Visit</a>` : '<span class="text-muted">—</span>';
      const rating = l.rating > 0 ? `<span class="lead-rating-badge">★ ${l.rating}</span> <span class="reviews-count">(${l.reviews})</span>` : '<span class="text-muted">No reviews</span>';

      return `
        <tr>
          <td>
            <div class="lead-title-cell">
              <span class="lead-company-name">${escapeHtml(l.title)}</span>
              <span class="lead-category-tag">${escapeHtml(l.category || 'Local Business')}</span>
            </div>
          </td>
          <td>${rating}</td>
          <td>${phone}</td>
          <td>${email}</td>
          <td>${website}</td>
          <td><p class="address-text" title="${escapeHtml(l.address)}">${escapeHtml(l.address || '—')}</p></td>
          <td class="text-right">
            <button class="btn-action-icon btn-copy-lead" data-info="${escapeHtml(l.title)} | ${escapeHtml(l.phone)} | ${escapeHtml(l.email)}" title="Copy Info">
              📋
            </button>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.btn-copy-lead').forEach(btn => {
      btn.addEventListener('click', () => {
        navigator.clipboard.writeText(btn.dataset.info);
        showToast('Lead info copied to clipboard', 'info');
      });
    });
  }

  function renderLeadsCards() {
    const container = DOM.leadsCardsContainer;
    if (state.filteredLeads.length === 0) {
      container.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1;"><p>No leads match the selected criteria.</p></div>`;
      return;
    }

    container.innerHTML = state.filteredLeads.map(l => {
      const rating = l.rating > 0 ? `★ ${l.rating} (${l.reviews})` : 'Unrated';
      return `
        <div class="lead-card">
          <div class="card-header">
            <div>
              <h4 class="card-company">${escapeHtml(l.title)}</h4>
              <span class="lead-category-tag">${escapeHtml(l.category || 'Local Business')}</span>
            </div>
            <span class="lead-rating-badge">${rating}</span>
          </div>

          <div class="card-details-list">
            ${l.phone ? `<div class="card-detail-item"><span>📞</span> <a href="tel:${escapeHtml(l.phone)}" class="contact-link">${escapeHtml(l.phone)}</a></div>` : ''}
            ${l.email ? `<div class="card-detail-item"><span>✉️</span> <span class="email-pill">${escapeHtml(l.email)}</span></div>` : ''}
            ${l.website ? `<div class="card-detail-item"><span>🌐</span> <a href="${escapeHtml(l.website)}" target="_blank" rel="noopener" class="contact-link">${escapeHtml(l.website.replace(/^https?:\/\//, ''))}</a></div>` : ''}
            <div class="card-detail-item"><span>📍</span> <span class="address-text">${escapeHtml(l.address || 'Address unlisted')}</span></div>
          </div>

          <div class="card-footer">
            <button class="btn btn-secondary btn-sm btn-copy-card" data-copy="${escapeHtml(l.title)} - ${escapeHtml(l.phone)} - ${escapeHtml(l.email)}">
              Copy Lead
            </button>
            ${l.googleUrl ? `<a href="${escapeHtml(l.googleUrl)}" target="_blank" rel="noopener" class="btn btn-secondary btn-sm">Maps ↗</a>` : ''}
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.btn-copy-card').forEach(btn => {
      btn.addEventListener('click', () => {
        navigator.clipboard.writeText(btn.dataset.copy);
        showToast('Lead info copied', 'info');
      });
    });
  }

  // Switch View Mode (Table vs Cards)
  function switchViewMode(mode) {
    state.viewMode = mode;
    if (mode === 'table') {
      DOM.viewModeTable.classList.add('active');
      DOM.viewModeCards.classList.remove('active');
    } else {
      DOM.viewModeTable.classList.remove('active');
      DOM.viewModeCards.classList.add('active');
    }
    renderLeadsView();
  }

  // Export Leads Handlers
  function exportLeadsCSV() {
    if (!state.filteredLeads || state.filteredLeads.length === 0) {
      showToast('No leads to export', 'error');
      return;
    }

    const headers = ['title', 'category', 'phone', 'email', 'website', 'rating', 'reviews', 'address'];
    const csvRows = [headers.join(',')];

    state.filteredLeads.forEach(l => {
      const row = headers.map(h => `"${String(l[h] || '').replace(/"/g, '""')}"`);
      csvRows.push(row.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `leads-export-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${state.filteredLeads.length} leads as CSV`, 'success');
  }

  function exportLeadsJSON() {
    if (!state.filteredLeads || state.filteredLeads.length === 0) {
      showToast('No leads to export', 'error');
      return;
    }

    const blob = new Blob([JSON.stringify(state.filteredLeads, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `leads-export-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${state.filteredLeads.length} leads as JSON`, 'success');
  }

  function copyLeadsClipboard() {
    if (!state.filteredLeads || state.filteredLeads.length === 0) return;
    const text = state.filteredLeads.map(l => `${l.title}\t${l.phone}\t${l.email}\t${l.website}\t${l.address}`).join('\n');
    navigator.clipboard.writeText(text);
    showToast('Copied leads table to clipboard', 'success');
  }

  // Theme Management
  function toggleTheme() {
    state.isDarkTheme = !state.isDarkTheme;
    document.body.classList.toggle('light-theme', !state.isDarkTheme);
    localStorage.setItem('mapslead-theme', state.isDarkTheme ? 'dark' : 'light');
    showToast(`${state.isDarkTheme ? 'Dark' : 'Light'} theme activated`, 'info', 2000);
  }

  function loadTheme() {
    const saved = localStorage.getItem('mapslead-theme');
    if (saved === 'light') {
      state.isDarkTheme = false;
      document.body.classList.add('light-theme');
    }
  }

  // Auto-Start
  document.addEventListener('DOMContentLoaded', init);

})();
