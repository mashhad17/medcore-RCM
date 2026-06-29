<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>MedCore HMS — Dashboard Hub</title>

    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Lora:ital,wght@0,400;0,500;1,400&display=swap"
        rel="stylesheet" />

    <link rel="stylesheet" href="assets/css/medcore.css" />

    <script src="assets/js/theme.js"></script>

    <style>
        .dashboard-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 1.5rem;
        }

        .active-pill {
            background: var(--success-bg);
            color: var(--success-text);
            border: 1px solid rgba(52, 211, 153, 0.3);
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 0.75rem;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 6px;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
        }

        .active-dot {
            width: 6px;
            height: 6px;
            background: var(--success-text);
            border-radius: 50%;
        }

        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 1.25rem;
            margin-bottom: 1.5rem;
        }

        .metric-card {
            position: relative;
            overflow: hidden;
            background: var(--bg-surface);
            border: 1px solid var(--border-light);
            border-radius: 14px;
            padding: 1.3rem 1.4rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 2px 10px rgba(15, 23, 42, 0.04);
            transition: background-color 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }

        /* Color-coded accent bar per metric */
        .metric-card::before {
            content: "";
            position: absolute;
            top: 0; left: 0; right: 0;
            height: 3px;
            background: var(--metric-accent, var(--accent));
            opacity: 0.9;
        }
        .metrics-grid .metric-card:nth-child(1) { --metric-accent: var(--info-text); }
        .metrics-grid .metric-card:nth-child(2) { --metric-accent: var(--success-text); }
        .metrics-grid .metric-card:nth-child(3) { --metric-accent: var(--warning-text); }
        .metrics-grid .metric-card:nth-child(4) { --metric-accent: var(--danger); }
        .metrics-grid .metric-card:nth-child(5) { --metric-accent: var(--accent); }

        .metric-clickable {
            cursor: pointer;
        }

        .metric-clickable:hover {
            transform: translateY(-3px);
            box-shadow: 0 12px 24px rgba(15, 23, 42, 0.1);
            border-color: var(--metric-accent, var(--accent));
        }

        .metric-clickable:focus-visible {
            outline: 2px solid var(--accent);
            outline-offset: 2px;
        }

        /* ── Metric detail modal ── */
        .metric-modal-backdrop {
            position: fixed;
            inset: 0;
            background: rgba(15, 23, 42, 0.45);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            padding: 1.5rem;
        }

        .metric-modal-backdrop.open {
            display: flex;
        }

        .metric-modal {
            background: var(--bg-surface);
            border: 1px solid var(--border-light);
            border-radius: 12px;
            width: 100%;
            max-width: 560px;
            max-height: 80vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25);
            overflow: hidden;
        }

        .metric-modal-header {
            padding: 1.25rem 1.5rem;
            border-bottom: 1px solid var(--border-light);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .metric-modal-title {
            font-family: 'Lora', serif;
            font-size: 1.125rem;
            font-weight: 600;
            color: var(--text-dark);
        }

        .metric-modal-close {
            background: none;
            border: none;
            cursor: pointer;
            color: var(--text-muted);
            display: flex;
            padding: 4px;
            border-radius: 6px;
        }

        .metric-modal-close:hover {
            color: var(--danger);
            background: var(--bg-aesthetic);
        }

        .metric-modal-body {
            padding: 1rem 1.5rem 1.5rem;
            overflow-y: auto;
        }

        .metric-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 12px 14px;
            border: 1px solid var(--border-light);
            border-radius: 8px;
            background: var(--bg-board);
            margin-bottom: 10px;
            cursor: pointer;
            transition: background 0.15s ease, border-color 0.15s ease;
        }

        .metric-row:hover {
            background: var(--bg-surface);
            border-color: var(--accent);
        }

        .metric-row-name {
            font-size: 0.875rem;
            font-weight: 600;
            color: var(--text-dark);
        }

        .metric-row-sub {
            font-size: 0.75rem;
            color: var(--text-muted);
            margin-top: 2px;
        }

        .metric-row-status {
            font-size: 0.6875rem;
            font-weight: 600;
            padding: 4px 10px;
            border-radius: 20px;
            white-space: nowrap;
            text-transform: capitalize;
        }

        .metric-empty {
            text-align: center;
            padding: 2.5rem 0;
            color: var(--text-muted);
            font-size: 0.875rem;
        }

        .metric-label {
            font-size: 0.6875rem;
            font-weight: 600;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 4px;
        }

        .metric-value {
            font-size: 2rem;
            font-weight: 600;
            color: var(--text-dark);
            font-family: 'Lora', serif;
            line-height: 1.1;
        }

        .metric-icon {
            width: 46px;
            height: 46px;
            border-radius: 13px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04);
        }

        .hub-grid {
            display: grid;
            grid-template-columns: 1fr 320px;
            gap: 1.5rem;
            align-items: start;
        }

        .base-card {
            background: var(--bg-surface);
            border: 1px solid var(--border-light);
            border-radius: 14px;
            box-shadow: 0 2px 12px rgba(15, 23, 42, 0.04);
            overflow: hidden;
            transition: background-color 0.2s ease;
        }

        .card-header {
            padding: 1.25rem 1.5rem;
            border-bottom: 1px solid var(--border-light);
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: var(--bg-surface);
            transition: background-color 0.2s ease;
        }

        .card-title {
            font-weight: 600;
            color: var(--text-dark);
            font-size: 1.0625rem;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .checklist-body {
            padding: 1.5rem;
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
        }

        .check-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 16px;
            border: 1px solid var(--border-light);
            border-radius: 8px;
            background: var(--bg-board);
            cursor: pointer;
            transition: all 0.2s;
        }

        .check-item:hover {
            background: var(--bg-surface);
            border-color: var(--text-muted);
        }

        .check-item input[type="checkbox"] {
            width: 18px;
            height: 18px;
            accent-color: var(--accent);
            cursor: pointer;
        }

        .check-text {
            font-size: 0.875rem;
            color: var(--text-dark);
            font-weight: 500;
            flex: 1;
        }

        .check-item.completed {
            opacity: 0.5;
        }

        .check-item.completed .check-text {
            text-decoration: line-through;
            color: var(--text-muted);
        }

        .add-task-row {
            display: flex;
            gap: 8px;
            margin-top: 0.5rem;
        }

        .task-input {
            flex: 1;
            padding: 0.625rem 1rem;
            border: 1px solid var(--border-light);
            border-radius: 6px;
            font-size: 0.8125rem;
            outline: none;
            background: var(--bg-surface);
            color: var(--text-dark);
        }

        .task-input:focus {
            border-color: var(--accent);
        }

        .activity-body {
            padding: 1.5rem;
            display: flex;
            flex-direction: column;
            gap: 1.25rem;
        }

        .activity-item {
            display: flex;
            align-items: flex-start;
            gap: 12px;
        }

        .time-badge {
            background: var(--bg-aesthetic);
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.6875rem;
            font-weight: 600;
            color: var(--text-muted);
            white-space: nowrap;
            flex-shrink: 0;
            margin-top: 2px;
        }

        .activity-text {
            font-size: 0.875rem;
            color: var(--text-dark);
            font-weight: 500;
            line-height: 1.4;
        }

        .activity-author {
            color: var(--text-muted);
            font-weight: 400;
            font-size: 0.8125rem;
            margin-left: 4px;
        }

        .clear-btn {
            background: none;
            border: none;
            color: var(--text-muted);
            font-size: 0.8125rem;
            font-weight: 500;
            cursor: pointer;
            transition: color 0.2s;
        }

        .clear-btn:hover {
            color: var(--danger);
        }

        .warnings-body {
            padding: 1.25rem;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .alert-card {
            padding: 1rem;
            border-radius: 8px;
            border: 1px solid transparent;
        }

        .alert-warning {
            background: var(--warning-bg);
            border-color: rgba(251, 191, 36, 0.3);
        }

        .alert-info {
            background: var(--info-bg);
            border-color: rgba(96, 165, 250, 0.3);
        }

        .alert-success {
            background: var(--success-bg);
            border-color: rgba(52, 211, 153, 0.3);
        }

        .alert-header {
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 600;
            font-size: 0.875rem;
            margin-bottom: 4px;
        }

        .alert-warning .alert-header {
            color: var(--warning-text);
        }

        .alert-info .alert-header {
            color: var(--info-text);
        }

        .alert-success .alert-header {
            color: var(--success-text);
        }

        .alert-text {
            font-size: 0.8125rem;
            color: var(--text-dark);
            line-height: 1.5;
        }
        .provider-panel {
            background: var(--bg-surface);
            border-radius: 14px;
            box-shadow: 0 2px 12px rgba(15, 23, 42, 0.04);
            padding: 20px;
            border: 1px solid var(--border-light);
        }

        .provider-panel-header {
            display: flex;
            flex-direction: column;
            gap: 4px;
            margin-bottom: 16px;
        }

        .provider-panel-title {
            font-weight: 600;
            color: var(--text-dark);
            font-size: 1.0625rem;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .provider-panel-summary {
            font-size: 12px;
            color: var(--text-muted);
            display: flex;
            align-items: center;
            gap: 6px;
            margin-left: 26px;
        }

        .provider-list {
            display: flex;
            flex-direction: column;
        }

        .provider-row {
            display: flex;
            align-items: center;
            padding: 10px 12px;
            border-radius: 10px;
            border-bottom: 1px solid var(--border-light);
            transition: background 0.2s ease, transform 0.15s ease;
            cursor: pointer;
        }

        .provider-row:last-child {
            border-bottom: none;
        }

        .provider-row:hover {
            background: var(--bg-aesthetic);
            transform: translateX(2px);
        }

        .provider-row-avatar {
            width: 38px;
            height: 38px;
            border-radius: 50%;
            background: linear-gradient(135deg, var(--accent), var(--accent-hover));
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 13px;
            flex-shrink: 0;
            margin-right: 12px;
            box-shadow: 0 3px 8px rgba(15, 23, 42, 0.14);
        }

        .provider-row-info {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        .provider-row-name {
            font-weight: 600;
            font-size: 14px;
            color: var(--text-dark);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .provider-row-spec {
            font-size: 12px;
            color: var(--text-muted);
            margin-top: 2px;
        }

        .provider-row-status {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 12px;
            color: var(--success-text);
            font-weight: 600;
        }

        .provider-row-status.status-neutral {
            color: var(--text-muted);
        }

        @keyframes pulse-ring {
            0% { transform: scale(0.8); opacity: 1; }
            100% { transform: scale(2); opacity: 0; }
        }

        .pulse-dot {
            position: relative;
            display: inline-block;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background-color: #10B981;
            flex-shrink: 0;
        }

        .pulse-dot::before {
            content: '';
            position: absolute;
            inset: 0;
            border-radius: 50%;
            background-color: #10B981;
            animation: pulse-ring 1.5s ease-out infinite;
        }

        .solid-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background-color: #9CA3AF;
            flex-shrink: 0;
        }

        /* Fast-Track Widget CSS */
        .widget-input {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid var(--border-light);
            border-radius: 6px;
            font-size: 14px;
            color: var(--text-dark);
            background: var(--bg-surface);
            outline: none;
            transition: border-color 0.2s;
        }
        .widget-input:focus {
            border-color: var(--accent);
        }
        .widget-btn {
            width: 100%;
            padding: 10px;
            background: var(--accent);
            color: #fff;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: opacity 0.2s;
            margin-top: 4px;
        }
        .widget-btn:hover {
            opacity: 0.9;
        }

        /* Mini Live-Queue Tracker */
        .queue-tracker-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .queue-tracker-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 16px;
            background: var(--bg-board);
            border: 1px solid var(--border-light);
            border-radius: 8px;
        }
        .queue-tracker-info {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }
        .queue-tracker-name {
            font-weight: 600;
            font-size: 14px;
            color: var(--text-dark);
        }
        .queue-tracker-doc {
            font-size: 12px;
            color: var(--text-muted);
        }
        .queue-tracker-time {
            font-size: 14px;
            font-weight: 700;
            padding: 4px 10px;
            border-radius: 20px;
        }
        .time-green { background: rgba(16, 185, 129, 0.1); color: #10B981; }
        .time-yellow { background: rgba(245, 158, 11, 0.1); color: #F59E0B; }
        .time-red { background: rgba(239, 68, 68, 0.1); color: #EF4444; }
        /* In-consultation badge: matches the Live Clinic Queue "In Consultation" lane. */
        .time-consult { background: rgba(59, 130, 246, 0.12); color: #3B82F6; }
        /* Billing/checkout badge: doctor finished, patient awaiting payment. */
        .time-billing { background: rgba(139, 92, 246, 0.12); color: #8B5CF6; }
        /* Walk-in inline validation / result message */
        .walkin-message {
            display: none;
            font-size: 0.8125rem;
            font-weight: 500;
            margin-top: 2px;
        }

        /* Global async error banner */
        .dashboard-error {
            display: none;
            align-items: center;
            gap: 10px;
            background: var(--danger-bg);
            border: 1px solid rgba(239, 68, 68, 0.3);
            color: var(--danger);
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 0.875rem;
            font-weight: 500;
            margin-bottom: 1.25rem;
        }

        @media (max-width: 1100px) {
            .metrics-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 560px) {
            .metrics-grid { grid-template-columns: 1fr; }
        }
    </style>
    <!-- Reception Dashboard reads live state from the database via
         api/dashboard/summary.php (no localStorage). -->
</head>

<body>

    <div class="app-container">
        <div class="sidebar-spacer"></div>
        <aside class="sidebar">
            <div class="sidebar-header">
                <div class="nav-icon-wrapper">
                    <svg width="24" height="24" viewBox="0 0 30 30" fill="none">
                        <rect width="30" height="30" rx="7" fill="#4F7CAC" />
                        <rect x="12" y="5" width="6" height="20" rx="1.5" fill="white" />
                        <rect x="5" y="12" width="20" height="6" rx="1.5" fill="white" />
                    </svg>
                </div>
                <span class="lora fade-text"
                    style="font-size:1.125rem; color:var(--text-dark); font-weight:500;">MedCore <span
                        style="font-size:0.875rem; color:var(--text-muted); font-family:'Inter', sans-serif;">HMS</span></span>
            </div>

            <nav class="nav-menu">
                <div class="nav-section-title fade-text">Reception Workspace</div>

                <a href="dashboard.php" class="nav-item active">
                    <div class="nav-icon-wrapper">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke-width="2"
                            stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="3" width="7" height="7"></rect>
                            <rect x="14" y="3" width="7" height="7"></rect>
                            <rect x="14" y="14" width="7" height="7"></rect>
                            <rect x="3" y="14" width="7" height="7"></rect>
                        </svg>
                    </div>
                    <span class="fade-text">Dashboard Hub</span>
                </a>

                <a href="schedule.php" class="nav-item">
                    <div class="nav-icon-wrapper">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke-width="2"
                            stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                    </div>
                    <span class="fade-text">Scheduling Grid</span>
                </a>

                <a href="patients.php" class="nav-item">
                    <div class="nav-icon-wrapper">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke-width="2"
                            stroke-linecap="round" stroke-linejoin="round">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                    </div>
                    <span class="fade-text">Patient Directory</span>
                </a>

                <a href="queue.php" class="nav-item">
                    <div class="nav-icon-wrapper">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke-width="2"
                            stroke-linecap="round" stroke-linejoin="round">
                            <line x1="8" y1="6" x2="21" y2="6"></line>
                            <line x1="8" y1="12" x2="21" y2="12"></line>
                            <line x1="8" y1="18" x2="21" y2="18"></line>
                            <line x1="3" y1="6" x2="3.01" y2="6"></line>
                            <line x1="3" y1="12" x2="3.01" y2="12"></line>
                            <line x1="3" y1="18" x2="3.01" y2="18"></line>
                        </svg>
                    </div>
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
                <button id="themeToggleBtn" class="fade-text" onclick="toggleTheme()"
                    style="background: transparent; border: none; cursor: pointer; color: var(--text-muted); display: flex; align-items: center; justify-content: center; padding: 4px; border-radius: 50%; transition: color 0.2s;">
                    <svg id="themeIcon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                    </svg>
                </button>
            </div>
        </aside>

        <div class="main-wrapper">

            <header class="top-header">
                <div class="header-left">
                    <div class="search-container">
                        <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                        <input type="text" class="search-input"
                            placeholder="Search by patient name, ID, or phone number..." />
                    </div>
                </div>

                <div class="header-actions">
                    <span class="viewing-badge"></span>
                    <div class="date-nav">
                        <button class="date-nav-btn" id="viewDatePrev" title="Previous day">&lsaquo;</button>
                        <input type="date" class="date-nav-input" id="viewDate" />
                        <button class="date-nav-btn" id="viewDateNext" title="Next day">&rsaquo;</button>
                        <button class="date-nav-today" id="viewDateToday">Today</button>
                    </div>
                    <div
                        style="font-size:0.875rem; font-weight:500; color:var(--text-mid); padding-right:1.5rem; border-right:1px solid var(--border-light);">
                        <span id="header-time">--:-- --</span> <span id="header-date"
                            style="color:var(--text-muted); font-weight:400; margin-left:6px;"></span>
                    </div>
                    <button class="btn-primary" onclick="window.location.href='schedule.php'">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="2">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        New Appointment
                    </button>
                </div>
            </header>

            <main class="content-area" style="padding: 2rem; overflow-y: auto;">

                <div class="dashboard-header">
                    <div>
                        <h1 class="lora" style="font-size: 1.75rem; font-weight: 500; color: var(--text-dark);">
                            Reception Shift Control</h1>
                        <p style="font-size: 0.875rem; color: var(--text-muted); margin-top: 6px;">Mission control
                            center for receptionist operations and alerts.</p>
                    </div>
                    <div class="active-pill">
                        <span class="active-dot"></span> Shift Active
                    </div>
                </div>

                <div class="dashboard-error" id="dashboardError" role="alert">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    Live data is unavailable — showing the last known state. Retrying…
                </div>

                <div class="metrics-grid">
                    <div class="metric-card metric-clickable" role="button" tabindex="0"
                        onclick="openMetricDetail('total')" onkeypress="if(event.key==='Enter')openMetricDetail('total')">
                        <div>
                            <div class="metric-label">Total Appointments</div>
                            <div class="metric-value" id="metric-total">0</div>
                        </div>
                        <div class="metric-icon" style="background: var(--info-bg); color: var(--info-text);">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                stroke-width="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                        </div>
                    </div>
                    <div class="metric-card metric-clickable" role="button" tabindex="0"
                        onclick="openMetricDetail('checkedin')" onkeypress="if(event.key==='Enter')openMetricDetail('checkedin')">
                        <div>
                            <div class="metric-label">Checked-In</div>
                            <div class="metric-value" style="color: var(--success-text);" id="metric-checkedin">0</div>
                        </div>
                        <div class="metric-icon" style="background: var(--success-bg); color: var(--success-text);">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                stroke-width="2">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </div>
                    </div>
                    <div class="metric-card metric-clickable" role="button" tabindex="0"
                        onclick="openMetricDetail('pending')" onkeypress="if(event.key==='Enter')openMetricDetail('pending')">
                        <div>
                            <div class="metric-label">Pending Arrivals</div>
                            <div class="metric-value" style="color: var(--warning-text);" id="metric-pending">0</div>
                        </div>
                        <div class="metric-icon" style="background: var(--warning-bg); color: var(--warning-text);">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                        </div>
                    </div>
                    <div class="metric-card metric-clickable" role="button" tabindex="0"
                        onclick="openMetricDetail('cancelled')" onkeypress="if(event.key==='Enter')openMetricDetail('cancelled')">
                        <div>
                            <div class="metric-label">Cancellations</div>
                            <div class="metric-value" style="color: var(--danger);" id="metric-cancelled">0</div>
                        </div>
                        <div class="metric-icon" style="background: var(--danger-bg); color: var(--danger);">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="15" y1="9" x2="9" y2="15"></line>
                                <line x1="9" y1="9" x2="15" y2="15"></line>
                            </svg>
                        </div>
                    </div>
                    <div class="metric-card metric-clickable" role="button" tabindex="0"
                        onclick="openMetricDetail('completed')" onkeypress="if(event.key==='Enter')openMetricDetail('completed')">
                        <div>
                            <div class="metric-label">Completed</div>
                            <div class="metric-value" style="color: var(--accent);" id="metric-completed">0</div>
                        </div>
                        <div class="metric-icon" style="background: var(--bg-aesthetic); color: var(--accent);">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                stroke-width="2">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                            </svg>
                        </div>
                    </div>
                </div>

                <div class="hub-grid">
                    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
                        
                        <!-- Mini Live-Queue Tracker -->
                        <div class="base-card">
                            <div class="card-header">
                                <div class="card-title">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--accent);">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <polyline points="12 6 12 12 16 14"></polyline>
                                    </svg>
                                    <span id="nextUpTitle">Next Up (Waiting Room)</span>
                                </div>
                            </div>
                            <div class="activity-body">
                                <div class="queue-tracker-list" id="miniQueueTracker">
                                    <div style="text-align: center; color: var(--text-muted); font-size: 13px;">Loading queue...</div>
                                </div>
                            </div>
                        </div>

                        <!-- Live Shift Activity -->
                        <div class="base-card">
                            <div class="card-header">
                                <div class="card-title">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                        stroke-width="2" style="color: var(--accent);">
                                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                                    </svg>
                                    Live Shift Activity
                                </div>
                                <button class="clear-btn" onclick="clearActivityLog()">Clear Log</button>
                            </div>
                            <div class="activity-body" id="activityLogContainer">
                            </div>
                        </div>
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
                        
                        <!-- Fast-Track Walk-In Widget -->
                        <div class="provider-panel" id="walkInPanel">
                            <div class="provider-panel-header">
                                <div class="provider-panel-title">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--accent);">
                                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                                    </svg>
                                    Quick Walk-In
                                </div>
                                <div class="provider-panel-summary">
                                    Fast-track to waiting room
                                </div>
                            </div>
                            <div style="display: flex; flex-direction: column; gap: 12px;">
                                <input type="text" id="walkin-name" class="widget-input" placeholder="Patient Name" autocomplete="off" />
                                <input type="tel" id="walkin-phone" class="widget-input" placeholder="Phone Number" autocomplete="off" />
                                <select id="walkin-doctor" class="widget-input">
                                    <option value="Dr. Mohammed (General Practice)">Dr. Mohammed (General Practice)</option>
                                    <option value="Dr. Fatima (Dental Surgery)">Dr. Fatima (Dental Surgery)</option>
                                    <option value="Dr. Roger (Dermatology)">Dr. Roger (Dermatology)</option>
                                    <option value="Dr. Sarah (Pediatrics)">Dr. Sarah (Pediatrics)</option>
                                    <option value="Dr. Ali (Orthopedics)">Dr. Ali (Orthopedics)</option>
                                    <option value="Unassigned">Unassigned</option>
                                </select>
                                <button class="widget-btn" onclick="processWalkIn()">
                                    Send to Waiting Room
                                </button>
                                <div class="walkin-message" id="walkin-message" role="status" aria-live="polite"></div>
                            </div>
                        </div>

                        <!-- Provider Status Board -->
                        <div class="provider-panel">
                            <div class="provider-panel-header">
                                <div class="provider-panel-title">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                        stroke-width="2" style="color: var(--accent);">
                                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                                        <circle cx="9" cy="7" r="4"></circle>
                                        <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                    </svg>
                                    Provider Status Board
                                </div>
                                <div class="provider-panel-summary" id="provider-status-summary">
                                    <!-- Populated via JS -->
                                </div>
                            </div>
                            <div class="provider-list" id="providerStatusContainer">
                                <!-- Populated via JS -->
                            </div>
                        </div>
                    </div>
                </div>

            </main>
        </div>
    </div>

    <!-- METRIC DETAIL MODAL -->
    <div id="metricModalBackdrop" class="metric-modal-backdrop" onclick="if(event.target===this)closeMetricDetail()">
        <div class="metric-modal" role="dialog" aria-modal="true" aria-labelledby="metricModalTitle">
            <div class="metric-modal-header">
                <span class="metric-modal-title" id="metricModalTitle">Appointments</span>
                <button class="metric-modal-close" onclick="closeMetricDetail()" title="Close">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
            <div class="metric-modal-body" id="metricModalBody"></div>
        </div>
    </div>

    <script src="assets/js/datebar.js"></script>
    <script src="assets/js/dashboard.js"></script>

</body>

</html>