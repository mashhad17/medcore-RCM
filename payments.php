<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>MedCore HMS — Billing & Payments</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Lora:ital,wght@0,400;0,500;1,400&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="assets/css/medcore.css" />

    <style>
        .directory-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 1.5rem; flex-shrink: 0; }
        .seg { display: inline-flex; border: 1px solid var(--border-light); border-radius: 8px; overflow: hidden; }
        .seg button { background: #FFFFFF; border: none; padding: 9px 20px; font-size: 0.8125rem; font-weight: 600; color: var(--text-mid); cursor: pointer; }
        .seg button.active { background: var(--accent); color: #FFFFFF; }

        .rev-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 1rem; }
        .rev-card { background: #FFFFFF; border: 1px solid var(--border-light); border-radius: 10px; padding: 1.1rem 1.25rem; box-shadow: 0 2px 4px rgba(31,41,55,0.04); }
        .rev-doc { font-weight: 600; color: var(--text-dark); font-size: 0.9375rem; }
        .rev-dept { font-size: 0.75rem; color: var(--text-muted); margin-bottom: 10px; }
        .rev-amt { font-size: 1.5rem; font-weight: 700; color: var(--accent); }
        .rev-meta { font-size: 0.75rem; color: var(--text-muted); margin-top: 4px; }
        .rev-total { background: var(--accent); color: #FFFFFF; }
        .rev-total .rev-doc, .rev-total .rev-amt, .rev-total .rev-dept, .rev-total .rev-meta { color: #FFFFFF; }

        .pay-table { width: 100%; border-collapse: collapse; font-size: 0.8125rem; background: #FFFFFF; border: 1px solid var(--border-light); border-radius: 10px; overflow: hidden; }
        .pay-table thead { background: #4B5563; color: #FFFFFF; }
        .pay-table th { padding: 12px 14px; text-align: left; font-weight: 600; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.04em; }
        .pay-table td { padding: 12px 14px; border-bottom: 1px solid var(--border-light); color: var(--text-dark); }
        .pay-table tbody tr:nth-child(even) { background: var(--bg-aesthetic); }
        .pay-table tbody tr:hover { background: var(--info-bg); }
        .pay-pill { padding: 2px 10px; border-radius: 12px; font-size: 0.6875rem; font-weight: 700; background: var(--success-bg); color: var(--success-text); }
        select.dropdown-filter { font-size: 0.875rem; font-weight: 500; padding: 10px 36px 10px 16px; border: 1px solid var(--border-light); border-radius: 8px; background-color: #FFFFFF; outline: none; appearance: none; background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%234B5563' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e"); background-repeat: no-repeat; background-position: right 12px center; background-size: 14px; cursor: pointer; }

        /* Report sub-section tabs */
        .report-tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--border-light); margin-bottom: 1.5rem; flex-wrap: wrap; }
        .report-tab { display: flex; align-items: center; gap: 8px; padding: 12px 18px; font-size: 0.875rem; font-weight: 600; color: var(--text-muted); cursor: pointer; border: none; background: none; border-bottom: 2px solid transparent; }
        .report-tab:hover { color: var(--text-dark); }
        .report-tab.active { color: var(--accent); border-bottom-color: var(--accent); }
        .report-tab svg { width: 16px; height: 16px; }

        /* KPI cards (Statistical) */
        .kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
        .kpi-card { background: #FFFFFF; border: 1px solid var(--border-light); border-radius: 10px; padding: 1.25rem; box-shadow: 0 2px 4px rgba(31,41,55,0.04); }
        .kpi-label { font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; font-weight: 600; }
        .kpi-value { font-size: 1.75rem; font-weight: 700; color: var(--text-dark); margin-top: 6px; }
        .kpi-sub { font-size: 0.75rem; color: var(--text-muted); margin-top: 4px; }

        /* Finance method breakdown bars */
        .fin-row { display: grid; grid-template-columns: 160px 1fr 120px; gap: 14px; align-items: center; margin-bottom: 12px; }
        .fin-name { font-size: 0.875rem; font-weight: 600; color: var(--text-dark); }
        .fin-bar-track { background: var(--bg-aesthetic); border-radius: 6px; height: 14px; overflow: hidden; }
        .fin-bar-fill { background: var(--accent); height: 100%; border-radius: 6px; }
        .fin-amt { text-align: right; font-weight: 600; color: var(--text-dark); font-size: 0.875rem; }

        .link-btn { background: none; border: none; padding: 0; cursor: pointer; color: var(--accent); font-weight: 600; font-size: 0.8125rem; font-family: inherit; }
        .link-btn:hover { text-decoration: underline; }
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
                <a href="patients.php" class="nav-item">
                    <div class="nav-icon-wrapper"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg></div>
                    <span class="fade-text">Patient Directory</span>
                </a>
                <a href="queue.php" class="nav-item">
                    <div class="nav-icon-wrapper"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg></div>
                    <span class="fade-text">Live Clinic Queue</span>
                </a>
                <a href="payments.php" class="nav-item active">
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
                    <svg id="themeIcon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                </button>
            </div>
        </aside>

        <div class="main-wrapper">
            <header class="top-header">
                <div class="header-left">
                    <div class="search-container">
                        <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        <input type="text" id="paySearch" class="search-input" placeholder="Search by patient, doctor, or invoice no..." oninput="onSearch()" />
                    </div>
                </div>
                <div class="header-actions">
                    <button class="btn-primary" onclick="window.location.href='schedule.php'">+ New Invoice</button>
                </div>
            </header>

            <main class="content-area" style="padding: 2rem; overflow-y: auto;">

                <div class="directory-header">
                    <div>
                        <h1 class="lora" style="font-size: 1.75rem; font-weight: 500; color: var(--text-dark);">Revenue &amp; Reports</h1>
                        <p style="font-size: 0.875rem; color: var(--text-muted); margin-top: 6px;">Doctor-wise revenue, finance breakdown, and payment history.</p>
                    </div>
                    <div class="seg" id="period-seg">
                        <button data-period="daily" onclick="setPeriod('daily')">Daily</button>
                        <button data-period="monthly" class="active" onclick="setPeriod('monthly')">Monthly</button>
                        <button data-period="yearly" onclick="setPeriod('yearly')">Yearly</button>
                    </div>
                </div>

                <div class="report-tabs" id="report-tabs">
                    <button class="report-tab active" data-tab="revenue" onclick="setReportTab('revenue')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                        Revenue Reports
                    </button>
                    <button class="report-tab" data-tab="finance" onclick="setReportTab('finance')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
                        Finance Reports
                    </button>
                    <button class="report-tab" data-tab="daily" onclick="setReportTab('daily')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        Daily Reports
                    </button>
                    <button class="report-tab" data-tab="statistical" onclick="setReportTab('statistical')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                        Statistical Reports
                    </button>
                    <button class="report-tab" data-tab="history" onclick="setReportTab('history')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                        Payment History
                    </button>
                </div>

                <div id="report-content"></div>

            </main>
        </div>
    </div>

    <!-- PATIENT STATEMENT / INVOICE -->
    <div id="stmtBackdrop" class="panel-backdrop" onclick="closeStatement()"></div>
    <div id="stmtModal" class="smart-modal" style="max-width: 920px; max-height: 90vh;">
        <div id="stmt-body" style="overflow-y: auto; max-height: 90vh;"></div>
    </div>

    <script src="assets/js/payments.js"></script>
</body>

</html>
