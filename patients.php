<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>MedCore HMS — Patient Directory</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Lora:ital,wght@0,400;0,500;1,400&display=swap" rel="stylesheet" />
    
    <link rel="stylesheet" href="assets/css/medcore.css" />

    <style>
        /* Directory Specific Styles */
        .directory-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; }
        .active-pill { background: var(--success-bg); color: var(--success-text); border: 1px solid #D1FAE5; padding: 6px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; display: flex; align-items: center; gap: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.02); }
        .active-dot { width: 6px; height: 6px; background: var(--success-text); border-radius: 50%; }

        .table-card { background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(31, 41, 55, 0.04); display: flex; flex-direction: column; }
        .card-toolbar { padding: 1rem 1.5rem; border-bottom: 1px solid var(--border-light); display: flex; justify-content: flex-end; align-items: center; background: #FFFFFF; }
        
        .toolbar-filters { display: flex; gap: 1rem; align-items: center; }
        .seg-control { display: flex; background: var(--bg-canvas); border: 1px solid var(--border-light); border-radius: 8px; padding: 3px; }
        .seg-btn { padding: 6px 16px; font-size: 0.75rem; font-weight: 500; color: var(--text-mid); background: transparent; border: none; border-radius: 6px; cursor: pointer; transition: all 0.2s; }
        .seg-btn.active { background: #FFFFFF; color: var(--text-dark); box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
        
        select.dropdown-filter { font-size: 0.8125rem; font-weight: 500; padding: 8px 36px 8px 16px; border: 1px solid var(--border-light); border-radius: 8px; background-color: #F8FAFC; color: var(--text-dark); outline: none; appearance: none; background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%234B5563' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e"); background-repeat: no-repeat; background-position: right 12px center; background-size: 14px; cursor: pointer; transition: all 0.2s ease; }
        select.dropdown-filter:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(79, 124, 172, 0.15); background-color: #FFFFFF; }

        .data-table { width: 100%; border-collapse: collapse; text-align: left; }
        .data-table th { background: #FFFFFF; padding: 1rem 1.25rem; font-size: 0.6875rem; text-transform: uppercase; font-weight: 600; color: #6B7280; border-bottom: 1px solid var(--border-light); }
        .data-table td { padding: 1rem 1.25rem; border-bottom: 1px solid var(--border-light); font-size: 0.8125rem; color: var(--text-dark); vertical-align: middle; background: #FFFFFF; transition: background 0.15s ease; }
        .data-table tbody tr.main-patient-row:hover td { background: rgba(241, 245, 249, 0.6); }
        
        .mrn-text { color: var(--accent); font-weight: 600; font-size: 0.75rem; }
        .pt-name-wrap { display: flex; align-items: center; gap: 12px; }
        .pt-avatar-sm { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.6875rem; font-weight: 600; flex-shrink: 0; }
        .avatar-blue { background: #E0E7FF; color: #3730A3; }
        .avatar-orange { background: #FFEDD5; color: #B45309; }
        .avatar-green { background: #D1FAE5; color: #065F46; }
        .pt-name-text { font-weight: 600; color: var(--text-dark); font-size: 0.875rem; }

        .clinical-tag { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 4px; font-size: 0.6875rem; font-weight: 600; }
        .tag-maternity { background: #FCE7F3; color: #BE185D; border: 1px solid #FBCFE8; }
        
        .doc-badge { display: inline-flex; padding: 4px 10px; border-radius: 20px; font-size: 0.6875rem; font-weight: 600; background: #FCE7F3; color: #BE185D; }
        .doc-badge-roger { background: #FEF3C7; color: #D97706; }
        .doc-badge-ali { background: #DBEAFE; color: #1D4ED8; }
        
        .actions-cell { display: flex; align-items: center; justify-content: flex-end; gap: 6px; }
        .btn-outline { border: 1px solid var(--border-light); background: #FFFFFF; color: var(--text-dark); padding: 6px 12px; border-radius: 6px; font-size: 0.75rem; font-weight: 500; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: all 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.02); }
        .btn-outline:hover { background: var(--bg-canvas); border-color: #C8D5E3; }
        .btn-light-accent { background: var(--bg-aesthetic); color: var(--accent); border: none; padding: 6px 12px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: all 0.2s; }
        .btn-light-accent:hover { background: #D3DDEB; }
        .icon-btn { background: transparent; border: none; color: var(--text-muted); padding: 4px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: all 0.2s ease; }
        .icon-btn:hover { background: var(--bg-aesthetic); color: var(--accent); }

        .expanded-row { display: none; }
        .expanded-row.show { display: table-row; }
        .expanded-row td { padding: 0 !important; background: #F8FAFC !important; border-bottom: 1px solid var(--border-light); }
        .detail-wrapper { padding: 1.5rem 2rem 1.5rem 13.5rem; }
        .detail-container { border-left: 3px solid var(--accent); padding-left: 1.5rem; }
        .detail-label { font-size: 0.6875rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; margin-bottom: 12px; display: block; }
        .note-card { background: #FFFFFF; border: 1px solid var(--border-light); border-radius: 8px; padding: 1.25rem; box-shadow: 0 2px 8px rgba(31, 41, 55, 0.04); }
        .note-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .note-tag { background: #F1F5F9; color: #475569; font-size: 0.6875rem; font-weight: 700; padding: 3px 8px; border-radius: 4px; }
        .note-meta { font-size: 0.75rem; color: var(--text-muted); font-weight: 500; }
        .note-body { font-size: 0.875rem; color: var(--text-dark); line-height: 1.6; }

        .table-footer { padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; background: #FFFFFF; font-size: 0.8125rem; color: var(--text-muted); }
        .page-btn { padding: 6px 10px; border: 1px solid var(--border-light); background: #FFFFFF; border-radius: 6px; cursor: pointer; color: var(--text-muted); display: flex; align-items: center; }
        .page-btn.active { background: var(--accent); color: #FFFFFF; border-color: var(--accent); }

        /* ── PROFESSIONAL REFRESH ── */
        .data-table thead th { position: sticky; top: 0; z-index: 2; background: #F8FAFC; letter-spacing: 0.05em; }
        .data-table tbody tr.main-patient-row { cursor: pointer; }
        .data-table tbody tr.main-patient-row:hover td { background: #F1F6FC; }
        .pt-avatar-sm { width: 38px; height: 38px; font-size: 0.8125rem; box-shadow: inset 0 0 0 2px rgba(255,255,255,0.6); }
        .avatar-g0 { background: linear-gradient(135deg,#6366F1,#8B5CF6); color:#fff; }
        .avatar-g1 { background: linear-gradient(135deg,#F59E0B,#F97316); color:#fff; }
        .avatar-g2 { background: linear-gradient(135deg,#10B981,#059669); color:#fff; }
        .avatar-g3 { background: linear-gradient(135deg,#3B82F6,#2563EB); color:#fff; }
        .avatar-g4 { background: linear-gradient(135deg,#EC4899,#DB2777); color:#fff; }
        .pt-name-text { font-size: 0.9375rem; }
        .pt-sub { font-size: 0.6875rem; color: var(--text-muted); }
        .doc-badge { background: var(--bg-aesthetic); color: var(--accent); }
        .status-chip { display:inline-flex; align-items:center; gap:5px; padding:3px 9px; border-radius:20px; font-size:0.6875rem; font-weight:600; }
        .status-chip .dot { width:6px; height:6px; border-radius:50%; }
        .chip-active { background: var(--success-bg); color: var(--success-text); }
        .chip-active .dot { background: var(--success-text); }
        .chip-inactive { background: #F1F5F9; color: #64748B; }
        .chip-inactive .dot { background:#94A3B8; }

        .btn-outline { padding: 7px 14px; font-weight: 600; }
        .btn-outline:hover { background: var(--accent); color:#fff; border-color: var(--accent); }
        .btn-light-accent { padding: 7px 14px; }

        /* Kebab dropdown */
        .kebab-menu { position: fixed; z-index: 300; min-width: 190px; background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: 10px; box-shadow: 0 12px 30px rgba(0,0,0,0.16); padding: 6px; display: none; }
        .kebab-item { display:flex; align-items:center; gap:10px; padding:9px 12px; border-radius:7px; cursor:pointer; font-size:0.8125rem; font-weight:500; color:var(--text-dark); border:none; background:none; width:100%; text-align:left; }
        .kebab-item:hover { background: var(--bg-aesthetic); }
        .kebab-item.danger { color: var(--danger); }
        .kebab-item svg { width:15px; height:15px; color: var(--text-muted); }

        /* Notes panel */
        .note-input { width:100%; border:1px solid var(--border-light); border-radius:8px; padding:10px 12px; font-size:0.8125rem; font-family:inherit; resize:vertical; min-height:60px; outline:none; }
        .note-input:focus { border-color: var(--accent); box-shadow:0 0 0 3px rgba(79,124,172,0.12); }

        /* Profile modal */
        .profile-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px 24px; font-size:0.8125rem; color:var(--text-mid); }
        .profile-grid b { color: var(--text-dark); }
        .tagline { display:flex; flex-wrap:wrap; gap:6px; }
        .mini-tag { padding:3px 10px; border-radius:14px; font-size:0.6875rem; font-weight:600; background:var(--bg-aesthetic); color:var(--text-dark); }
        .mini-tag.alg { background:#FEF2F2; color:#DC2626; }
    </style>
    <script src="assets/js/theme.js"></script>
    <?php require_once __DIR__ . '/bootstrap.php'; ?>
    <script src="assets/js/store.js"></script>
</head>

<body>

    <div class="app-container">
        <div class="sidebar-spacer"></div>
        <aside class="sidebar">
            <div class="sidebar-header">
                <div class="nav-icon-wrapper">
                    <svg width="24" height="24" viewBox="0 0 30 30" fill="none"><rect width="30" height="30" rx="7" fill="#4F7CAC" /><rect x="12" y="5" width="6" height="20" rx="1.5" fill="white" /><rect x="5" y="12" width="20" height="6" rx="1.5" fill="white" /></svg>
                </div>
                <span class="lora fade-text" style="font-size:1.125rem; color:var(--text-dark); font-weight:500;">MedCore <span style="font-size:0.875rem; color:var(--text-muted); font-family:'Inter', sans-serif;">HMS</span></span>
            </div>

            <nav class="nav-menu">
                <div class="nav-section-title fade-text">Reception Workspace</div>
                
                <a href="dashboard.php" class="nav-item">
                    <div class="nav-icon-wrapper"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg></div>
                    <span class="fade-text">Dashboard Hub</span>
                </a>
                <a href="schedule.php" class="nav-item">
                    <div class="nav-icon-wrapper"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></div>
                    <span class="fade-text">Scheduling Grid</span>
                </a>
                <a href="patients.php" class="nav-item active">
                    <div class="nav-icon-wrapper"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg></div>
                    <span class="fade-text">Patient Directory</span>
                </a>
                <a href="queue.php" class="nav-item">
                    <div class="nav-icon-wrapper"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg></div>
                    <span class="fade-text">Live Clinic Queue</span>
                </a>
                <a href="payments.php" class="nav-item">
                    <div class="nav-icon-wrapper"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg></div>
                    <span class="fade-text">Revenue</span>
                </a>
            </nav>

            <div class="sidebar-footer" style="display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center;">
                    <div class="user-avatar">AD</div>
                    <div class="fade-text" style="overflow:hidden;">
                        <p style="font-size:0.8125rem; font-weight:600; color:var(--text-dark);">System Admin</p>
                        <p style="font-size:0.75rem; color:var(--text-muted);">ID: admin</p>
                    </div>
                </div>
                <button id="themeToggleBtn" class="fade-text" onclick="toggleTheme()" style="background: transparent; border: none; cursor: pointer; color: var(--text-muted); display: flex; align-items: center; justify-content: center; padding: 4px; border-radius: 50%; transition: color 0.2s;">
                    <svg id="themeIcon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                    </svg>
                </button>
            </div>
        </aside>

        <div class="main-wrapper">
            <header class="top-header">
                <div class="header-left">
                    <div class="search-container">
                        <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        <input type="text" id="searchInput" class="search-input" placeholder="Search by name, ID, or phone number..." onkeyup="applyFilters()" />
                    </div>
                    <button class="btn-secondary" onclick="cycleTabFilter()" title="Cycle quick filters">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg> Filters
                    </button>
                </div>
                <div class="header-actions">
                    <div style="font-size:0.875rem; font-weight:500; color:var(--text-mid); padding-right:1.5rem; border-right:1px solid var(--border-light);">
                        <span>10:24 AM</span> <span style="color:var(--text-muted); font-weight:400; margin-left:6px;">Jun 18, 2026</span>
                    </div>
                    <button class="btn-primary" onclick="window.location.href='schedule.php'">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        New Appointment
                    </button>
                </div>
            </header>

            <main class="content-area" style="padding: 2rem; overflow-y: auto;">
                <div class="directory-header">
                    <div>
                        <h1 class="lora" style="font-size: 1.75rem; font-weight: 500; color: var(--text-dark);">Patient Directory</h1>
                        <p style="font-size: 0.875rem; color: var(--text-muted); margin-top: 6px;">Real-time search index and clinical directories.</p>
                    </div>
                    <div class="active-pill">
                        <span class="active-dot"></span> <span id="activeCountText">0 Active Patients</span>
                    </div>
                </div>

                <div class="table-card">
                    <div class="card-toolbar">
                        <div class="toolbar-filters">
                            <div class="seg-control" id="statusFilterControl">
                                <button class="seg-btn active" onclick="setTabFilter('all', this)">All</button>
                                <button class="seg-btn" onclick="setTabFilter('recent', this)">Recently Viewed</button>
                                <button class="seg-btn" onclick="setTabFilter('active', this)">Active Patients</button>
                            </div>
                            <select class="dropdown-filter" id="physicianFilter" onchange="applyFilters()">
                                <option value="all">All Physicians</option>
                                <option value="Dr. Fatima">Dr. Fatima</option>
                                <option value="Dr. Roger">Dr. Roger</option>
                                <option value="Dr. Ali">Dr. Ali</option>
                            </select>
                        </div>
                    </div>

                    <table class="data-table" id="patientTable">
                        <thead>
                            <tr>
                                <th>MRN</th>
                                <th>PATIENT NAME</th>
                                <th>AGE / DOB</th>
                                <th>CONTACT INFO</th>
                                <th>LAST VISIT</th>
                                <th>ASSIGNED DOCTOR</th>
                                <th>STATUS</th>
                                <th style="text-align: right;">ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody id="patientTbody"></tbody>
                    </table>

                    <div class="table-footer">
                        <span id="visibleCountText">Showing 0 patients</span>
                        <div style="display: flex; gap: 8px;">
                            <button class="page-btn"><</button>
                            <button class="page-btn active">1</button>
                            <button class="page-btn">></button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    </div>

    <!-- Kebab action menu -->
    <div id="kebabMenu" class="kebab-menu"></div>

    <!-- Patient profile modal -->
    <div id="profileBackdrop" class="panel-backdrop" onclick="closeProfile()"></div>
    <div id="profileModal" class="smart-modal" style="max-width: 720px; max-height: 90vh;">
        <div id="profile-body" style="overflow-y:auto; max-height:90vh;"></div>
    </div>

    <script src="assets/js/patients.js"></script>
</body>
</html>