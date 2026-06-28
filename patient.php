<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>MedCore HMS — Patient Record</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Lora:ital,wght@0,400;0,500;1,400&display=swap" rel="stylesheet" />

    <link rel="stylesheet" href="assets/css/medcore.css" />

    <style>
        /* ── Patient Record Page ── */
        .rec-topbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
        .rec-back { display: inline-flex; align-items: center; gap: 8px; font-size: 0.8125rem; font-weight: 600; color: var(--text-mid); background: var(--bg-surface); border: 1px solid var(--border-light); padding: 8px 14px; border-radius: 8px; cursor: pointer; transition: all 0.15s; }
        .rec-back:hover { background: var(--bg-aesthetic); color: var(--text-dark); }

        /* Header card */
        .rec-head { background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: 14px; overflow: hidden; box-shadow: 0 4px 16px rgba(31,41,55,0.05); margin: 1.25rem 0; }
        .rec-head-accent { height: 5px; background: linear-gradient(90deg, var(--accent), #8B5CF6); }
        .rec-head-body { padding: 1.5rem 1.75rem; display: flex; gap: 18px; align-items: center; flex-wrap: wrap; }
        .rec-avatar { width: 64px; height: 64px; border-radius: 16px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1.25rem; color: #fff; background: linear-gradient(135deg, var(--accent), var(--accent-hover)); box-shadow: 0 6px 16px rgba(79,124,172,0.25); }
        .rec-id h1 { font-size: 1.5rem; font-weight: 600; color: var(--text-dark); line-height: 1.1; }
        .rec-id .sub { font-size: 0.8125rem; color: var(--text-muted); margin-top: 4px; }
        .rec-metrics { display: flex; gap: 12px; margin-left: auto; flex-wrap: wrap; }
        .rec-metric { background: var(--bg-aesthetic); border-radius: 10px; padding: 10px 16px; min-width: 110px; }
        .rec-metric .m-label { font-size: 0.625rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; color: var(--text-muted); }
        .rec-metric .m-val { font-size: 1.125rem; font-weight: 700; color: var(--text-dark); margin-top: 2px; }
        .rec-metric .m-val.due { color: var(--danger); }
        .rec-metric .m-val.ok { color: var(--success-text); }

        /* Tabs */
        .rec-tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--border-light); margin-bottom: 1.25rem; }
        .rec-tab { padding: 11px 18px; font-size: 0.875rem; font-weight: 600; color: var(--text-muted); background: none; border: none; border-bottom: 2px solid transparent; cursor: pointer; transition: all 0.15s; margin-bottom: -1px; }
        .rec-tab:hover { color: var(--text-dark); }
        .rec-tab.active { color: var(--accent); border-bottom-color: var(--accent); }

        .rec-panel { display: none; }
        .rec-panel.active { display: block; }

        /* Generic card */
        .rec-card { background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: 12px; padding: 1.25rem 1.5rem; box-shadow: 0 2px 8px rgba(31,41,55,0.04); margin-bottom: 1.25rem; }
        .rec-card h3 { font-size: 0.6875rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); margin-bottom: 14px; }
        .rec-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 28px; }
        .rec-kv { font-size: 0.875rem; color: var(--text-mid); }
        .rec-kv b { color: var(--text-dark); font-weight: 600; }
        .tagline { display: flex; flex-wrap: wrap; gap: 6px; }
        .mini-tag { padding: 3px 10px; border-radius: 14px; font-size: 0.6875rem; font-weight: 600; background: var(--bg-aesthetic); color: var(--text-dark); }
        .mini-tag.alg { background: #FEF2F2; color: #DC2626; }

        /* Tables */
        .rec-table { width: 100%; border-collapse: collapse; font-size: 0.8125rem; }
        .rec-table th { text-align: left; padding: 9px 12px; font-size: 0.625rem; text-transform: uppercase; letter-spacing: 0.04em; font-weight: 700; color: var(--text-muted); border-bottom: 1px solid var(--border-light); }
        .rec-table td { padding: 11px 12px; border-bottom: 1px solid var(--border-light); color: var(--text-dark); vertical-align: top; }
        .rec-table tr:last-child td { border-bottom: none; }
        .rec-table .num { text-align: right; font-variant-numeric: tabular-nums; }
        .doc-badge { display: inline-flex; padding: 3px 9px; border-radius: 20px; font-size: 0.6875rem; font-weight: 600; background: var(--bg-aesthetic); color: var(--accent); }
        .status-chip { display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px; border-radius: 20px; font-size: 0.6875rem; font-weight: 600; text-transform: capitalize; }
        .pay-paid { background: var(--success-bg); color: var(--success-text); }
        .pay-due { background: var(--danger-bg); color: var(--danger); }

        /* Per-visit billing block */
        .bill-visit { border: 1px solid var(--border-light); border-radius: 10px; margin-bottom: 14px; overflow: hidden; }
        .bill-visit-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 12px 16px; background: var(--bg-aesthetic); flex-wrap: wrap; }
        .bill-visit-head .t { font-weight: 700; color: var(--text-dark); font-size: 0.875rem; }
        .bill-visit-head .s { font-size: 0.75rem; color: var(--text-muted); }
        .bill-summary-row { display: flex; justify-content: flex-end; gap: 28px; padding: 12px 16px; border-top: 1px dashed var(--border-light); font-size: 0.8125rem; }
        .bill-summary-row .k { color: var(--text-muted); }
        .bill-summary-row .v { font-weight: 700; color: var(--text-dark); }

        .by-doc-card { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border: 1px solid var(--border-light); border-radius: 10px; margin-bottom: 8px; }
        .by-doc-card .nm { font-weight: 600; color: var(--text-dark); font-size: 0.875rem; }
        .by-doc-card .mt { font-size: 0.75rem; color: var(--text-muted); }

        .empty { color: var(--text-muted); font-size: 0.8125rem; padding: 18px; text-align: center; }

        @media print {
            .sidebar, .sidebar-spacer, .top-header, .rec-topbar, .rec-tabs { display: none !important; }
            .rec-panel { display: block !important; }
            .content-area { padding: 0 !important; }
        }
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
                    <svg id="themeIcon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                </button>
            </div>
        </aside>

        <div class="main-wrapper">
            <header class="top-header">
                <div class="header-left">
                    <button class="rec-back" onclick="window.location.href='patients.php'">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                        Patient Directory
                    </button>
                </div>
                <div class="header-actions">
                    <div style="font-size:0.875rem; font-weight:500; color:var(--text-mid); padding-right:1.5rem; border-right:1px solid var(--border-light);">
                        <span id="header-time">--:-- --</span> <span id="header-date" style="color:var(--text-muted); font-weight:400; margin-left:6px;"></span>
                    </div>
                    <button class="btn-secondary" onclick="window.print()">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                        Print Record
                    </button>
                    <button class="btn-primary" id="recBookBtn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        Book Visit
                    </button>
                </div>
            </header>

            <main class="content-area" style="padding: 2rem; overflow-y: auto;">
                <div id="record-root"></div>
            </main>
        </div>
    </div>

    <script src="assets/js/patient-record.js"></script>
</body>
</html>
