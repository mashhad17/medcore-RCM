<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>MedCore HMS — Scheduling Grid</title>

    <script src="assets/js/theme.js"></script>

    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Lora:ital,wght@0,400;0,500;1,400&display=swap"
        rel="stylesheet" />
    <link rel="stylesheet" href="assets/css/medcore.css" />
    <style>
        .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            display: inline-block;
        }
        .status-dot.blue { background-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15); }
        .status-dot.green { background-color: #10b981; box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15); }
        .status-dot.red { background-color: #ef4444; box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15); }
        .status-dot.gray { background-color: #9ca3af; box-shadow: 0 0 0 3px rgba(156, 163, 175, 0.15); }
    </style>
    <?php require_once __DIR__ . '/bootstrap.php'; ?>
    <script src="assets/js/store.js"></script>
</head>

<body>

    <div class="app-container">
        <div class="sidebar-spacer"></div>
        <aside class="sidebar">
            <div class="sidebar-header">
                <div class="nav-icon-wrapper"><svg width="24" height="24" viewBox="0 0 30 30" fill="none">
                        <rect width="30" height="30" rx="7" fill="#4F7CAC" />
                        <rect x="12" y="5" width="6" height="20" rx="1.5" fill="white" />
                        <rect x="5" y="12" width="20" height="6" rx="1.5" fill="white" />
                    </svg></div>
                <span class="lora fade-text"
                    style="font-size:1.125rem; color:var(--text-dark); font-weight:500;">MedCore <span
                        style="font-size:0.875rem; color:var(--text-muted); font-family:'Inter', sans-serif;">HMS</span></span>
            </div>

            <nav class="nav-menu">
                <div class="nav-section-title fade-text">Reception Workspace</div>
                <a href="dashboard.php" class="nav-item">
                    <div class="nav-icon-wrapper"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="3" width="7" height="7"></rect>
                            <rect x="14" y="3" width="7" height="7"></rect>
                            <rect x="14" y="14" width="7" height="7"></rect>
                            <rect x="3" y="14" width="7" height="7"></rect>
                        </svg></div><span class="fade-text">Dashboard Hub</span>
                </a>
                <a href="schedule.php" class="nav-item active">
                    <div class="nav-icon-wrapper"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg></div><span class="fade-text">Scheduling Grid</span>
                </a>
                <a href="patients.php" class="nav-item">
                    <div class="nav-icon-wrapper"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg></div><span class="fade-text">Patient Directory</span>
                </a>
                <a href="queue.php" class="nav-item">
                    <div class="nav-icon-wrapper"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="8" y1="6" x2="21" y2="6"></line>
                            <line x1="8" y1="12" x2="21" y2="12"></line>
                            <line x1="8" y1="18" x2="21" y2="18"></line>
                            <line x1="3" y1="6" x2="3.01" y2="6"></line>
                            <line x1="3" y1="12" x2="3.01" y2="12"></line>
                            <line x1="3" y1="18" x2="3.01" y2="18"></line>
                        </svg></div><span class="fade-text">Live Clinic Queue</span>
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
                        <input type="text" class="search-input" placeholder="Search schedule..." />
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
                        style="font-size:0.875rem; font-weight:500; color:var(--text-mid); padding-right:1rem; border-right:1px solid var(--border-light);">
                        <span id="header-time">--:-- --</span>
                        <span id="header-date-text"
                            style="color:var(--text-muted); font-weight:400; margin-left:4px;"></span>
                    </div>
                    <button class="btn-primary" onclick="openBookingPanel('','','')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="2">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg> New Appointment
                    </button>
                </div>
            </header>

            <main class="scheduler-container">
                <div class="mini-calendar-panel">
                    <div class="calendar-header">
                        <div class="cal-arrow" onclick="changeMonth(-1)"><svg width="18" height="18" viewBox="0 0 24 24"
                                fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="15 18 9 12 15 6"></polyline>
                            </svg></div>
                        <span id="calendar-month-year">JUNE 2026</span>
                        <div class="cal-arrow" onclick="changeMonth(1)"><svg width="18" height="18" viewBox="0 0 24 24"
                                fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="9 18 15 12 9 6"></polyline>
                            </svg></div>
                    </div>
                    <div class="calendar-grid" id="calendar-days-grid"></div>
                </div>

                <div class="grid-area">
                    <div class="grid-header-row">
                        <div class="time-axis-spacer"></div>
                        <div class="doctor-col-header" id="doc-header-0">
                            <div class="doctor-name">Dr. Mohammed</div>
                            <div class="doctor-spec">General Practice</div>
                        </div>
                        <div class="doctor-col-header" id="doc-header-1">
                            <div class="doctor-name">Dr. Fatima</div>
                            <div class="doctor-spec">Dental Surgery</div>
                        </div>
                        <div class="doctor-col-header" id="doc-header-2">
                            <div class="doctor-name">Dr. Roger</div>
                            <div class="doctor-spec">Dermatology</div>
                        </div>
                        <div class="doctor-col-header" id="doc-header-3">
                            <div class="doctor-name">Dr. Sarah</div>
                            <div class="doctor-spec">Pediatrics</div>
                        </div>
                        <div class="doctor-col-header" id="doc-header-4">
                            <div class="doctor-name">Dr. Ali</div>
                            <div class="doctor-spec">Orthopedics</div>
                        </div>
                    </div>

                    <div class="grid-scroll-area" id="grid-scroll-container">
                        <div class="current-time-line" id="current-time-indicator">
                            <div class="current-time-dot"></div>
                        </div>
                        <div class="grid-body-layout">
                            <div class="time-axis" id="time-axis-container"></div>
                            <div class="grid-matrix">
                                <div class="horizontal-lines-container" id="horizontal-lines"></div>
                                <div class="matrix-col" id="col-0"
                                    onclick="handleColumnClick(event, 'Dr. Mohammed (General Practice)')"></div>
                                <div class="matrix-col" id="col-1"
                                    onclick="handleColumnClick(event, 'Dr. Fatima (Dental Surgery)')"></div>
                                <div class="matrix-col" id="col-2"
                                    onclick="handleColumnClick(event, 'Dr. Roger (Dermatology)')"></div>
                                <div class="matrix-col" id="col-3"
                                    onclick="handleColumnClick(event, 'Dr. Sarah (Pediatrics)')"></div>
                                <div class="matrix-col" id="col-4"
                                    onclick="handleColumnClick(event, 'Dr. Ali (Orthopedics)')"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    </div>

    <!-- APPOINTMENT QUICK-VIEW CARD -->
    <div id="quickViewBackdrop" class="panel-backdrop" onclick="closeQuickView()"></div>
    <div id="quickViewModal" class="smart-modal quick-view-modal">
        <div class="quick-view-accent"></div>
        <button class="quick-view-close" onclick="closeQuickView()" title="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        </button>
        <div id="quick-view-body"></div>
    </div>

    <!-- CONSENT WORKFLOW -->
    <div id="consentBackdrop" class="panel-backdrop" onclick="closeConsent()"></div>
    <div id="consentModal" class="smart-modal consent-modal">
        <div id="consent-body"></div>
    </div>

    <!-- INVOICE / BILLING -->
    <div id="invoiceBackdrop" class="panel-backdrop" onclick="closeInvoice()"></div>
    <div id="invoiceModal" class="smart-modal invoice-modal">
        <div id="invoice-body"></div>
    </div>

    <!-- DIGITAL SIGNATURE PAD -->
    <div id="signatureBackdrop" class="panel-backdrop" onclick="closeSignatureModal()"></div>
    <div id="signatureModal" class="smart-modal signature-modal">
        <div class="sig-modal-header">
            <span style="font-weight: 700; font-size: 1rem; color: var(--text-dark);">Digital Signature</span>
            <div style="display: flex; align-items: center; gap: 12px;">
                <button class="btn-primary" onclick="saveSignatures()">SAVE</button>
                <button class="sig-close" onclick="closeSignatureModal()" title="Close">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>
        </div>
        <div class="sig-pads">
            <div class="sig-pad-col">
                <div class="sig-pad-title">Patient Signature</div>
                <div class="sig-tabs">
                    <button class="sig-tab active" data-target="patient" data-mode="draw" onclick="setSigMode('patient','draw',this)">DRAW</button>
                    <button class="sig-tab" data-target="patient" data-mode="upload" onclick="setSigMode('patient','upload',this)">UPLOAD</button>
                </div>
                <div class="sig-canvas-wrap">
                    <canvas id="sig-canvas-patient" class="sig-canvas"></canvas>
                    <input type="file" accept="image/*" id="sig-upload-patient" style="display:none" onchange="handleSigUpload('patient', this)">
                    <button class="sig-clear-btn" onclick="clearSigCanvas('patient')">Clear</button>
                </div>
            </div>
            <div class="sig-pad-col">
                <div class="sig-pad-title">Doctor Signature</div>
                <div class="sig-tabs">
                    <button class="sig-tab active" data-target="doctor" data-mode="draw" onclick="setSigMode('doctor','draw',this)">DRAW</button>
                    <button class="sig-tab" data-target="doctor" data-mode="upload" onclick="setSigMode('doctor','upload',this)">UPLOAD</button>
                </div>
                <div class="sig-canvas-wrap">
                    <canvas id="sig-canvas-doctor" class="sig-canvas"></canvas>
                    <input type="file" accept="image/*" id="sig-upload-doctor" style="display:none" onchange="handleSigUpload('doctor', this)">
                    <button class="sig-clear-btn" onclick="clearSigCanvas('doctor')">Clear</button>
                </div>
            </div>
        </div>
    </div>

    <div id="backdrop" class="panel-backdrop" onclick="closeBookingPanel()"></div>
    <div id="bookingPanel" class="smart-modal">

        <div class="panel-header">
            <div style="display: flex; align-items: center; gap: 8px;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <span id="modal-header-text">Appointment Registration</span>
            </div>
            <button onclick="closeBookingPanel()"
                style="background:none; border:none; color:var(--text-muted); cursor:pointer;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>

        <div class="panel-context-bar">
            <div style="display: flex; gap: 12px; align-items: center;">
                <div class="context-search">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <input type="text" placeholder="Search Patient..." style="border:none; outline:none; width:100%;"
                        id="header-search-input">
                </div>
                <div style="display: flex; gap: 12px; font-size: 0.8125rem; font-weight: 500; color: var(--text-mid);">
                    <label style="display: flex; align-items: center; gap: 4px;"><input type="checkbox"
                            id="cb-new-patient" accent-color="var(--accent)" checked> New Patient</label>
                    <label style="display: flex; align-items: center; gap: 4px;"><input type="checkbox"
                            accent-color="var(--accent)"> Established Patient</label>
                </div>
            </div>
            <div class="context-info" id="insurance-context-bar" style="display: none;">
                <!-- Populated from insurance API when Payment Mode = Insurance -->
            </div>
        </div>

        <div class="erp-tabs">
            <div class="erp-tab active" onclick="switchTab('tab-appointment', this)">Appointment</div>
            <div class="erp-tab" onclick="switchTab('tab-address', this)">Address</div>
            <div class="erp-tab" onclick="switchTab('tab-highlights', this)">Patient Highlights</div>
            <div class="erp-tab" onclick="switchTab('tab-history', this)">Visit History</div>
            <div class="erp-tab" onclick="switchTab('tab-package', this)">Package History</div>
            <div class="erp-tab" onclick="switchTab('tab-item', this)">Item Consumption</div>
        </div>

        <div class="panel-split-body">

            <div class="pane-main">

                <div id="tab-appointment" class="tab-pane active">
                    <div
                        style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                        <span style="font-weight: 600; color: var(--text-dark); font-size: 0.9375rem;">Appointment
                            Information</span>
                        <span id="view-status-badge" class="status-badge badge-scheduled"
                            style="display: none;">Scheduled</span>
                    </div>

                    <div class="radio-bar">
                        <span
                            style="font-size: 0.8125rem; font-weight: 600; color: var(--text-dark); margin-right: 12px;">Payment
                            Mode</span>
                        <label class="radio-label">
                            <input type="radio" name="billing_mode" value="cash" checked
                                onclick="setBillingMode('cash')"> Cash
                        </label>
                        <label class="radio-label">
                            <input type="radio" name="billing_mode" value="insurance"
                                onclick="setBillingMode('insurance')"> Insurance
                        </label>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; margin-bottom: 1.25rem;">
                        <div>
                            <label class="modal-label">Patient Name <span style="color: var(--danger);">*</span></label>
                            <input type="text" class="input" id="reg-patient-name" placeholder="e.g. Hashir Asad"
                                required />
                        </div>
                        <div>
                            <label class="modal-label">Emirates ID / Passport No. <span
                                    style="color: var(--danger);">*</span></label>
                            <input type="text" class="input" id="reg-patient-id" placeholder="NID-XXXXXX" required />
                        </div>
                        <div>
                            <label class="modal-label">Phone Number <span style="color: var(--danger);">*</span></label>
                            <input type="tel" class="input" id="reg-patient-phone" placeholder="+971 50 000 0000"
                                required />
                        </div>
                        <div>
                            <label class="modal-label">DOB <span style="color: var(--danger);">*</span></label>
                            <input type="date" class="input" id="reg-patient-dob" required />
                        </div>
                    </div>

                    <div
                        style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; margin-bottom: 2rem; border-bottom: 1px solid var(--border-light); padding-bottom: 2rem;">
                        <div>
                            <label class="modal-label">Residential</label>
                            <select class="input" id="reg-patient-resident">
                                <option value="yes" selected>Yes</option>
                                <option value="no">No</option>
                            </select>
                        </div>
                        <div>
                            <label class="modal-label">Photo ID Type</label>
                            <select class="input">
                                <option value="eid" selected>Emirates ID</option>
                                <option value="passport">Passport</option>
                            </select>
                        </div>
                    </div>

                    <div id="insurance-details-section"
                        style="display: none; grid-template-columns: 1fr 1fr; gap: 1.25rem; margin-bottom: 2rem; border-bottom: 1px solid var(--border-light); padding-bottom: 2rem;">
                        <div>
                            <label class="modal-label">Insurance Company <span
                                    style="color: var(--danger);">*</span></label>
                            <input type="text" class="input" id="reg-insurance-company" placeholder="e.g. Porchest" />
                        </div>
                        <div>
                            <label class="modal-label">Insurance Type <span
                                    style="color: var(--danger);">*</span></label>
                            <input type="text" class="input" id="reg-insurance-type" placeholder="e.g. Comprehensive" />
                        </div>
                        <div>
                            <label class="modal-label">Expiry Date <span style="color: var(--danger);">*</span></label>
                            <input type="date" class="input" id="reg-insurance-expiry" />
                        </div>
                        <div>
                            <label class="modal-label">CoPay (AED) <span style="color: var(--danger);">*</span></label>
                            <input type="number" class="input" id="reg-insurance-copay" min="20"
                                placeholder="Min 20 AED" />
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem;">
                        <div>
                            <label class="modal-label">Attending Doctor</label>
                            <select class="input" id="panel-doc-input">
                                <option value="Dr. Mohammed (General Practice)">Dr. Mohammed (General Practice)</option>
                                <option value="Dr. Fatima (Dental Surgery)">Dr. Fatima (Dental Surgery)</option>
                                <option value="Dr. Roger (Dermatology)">Dr. Roger (Dermatology)</option>
                                <option value="Dr. Sarah (Pediatrics)">Dr. Sarah (Pediatrics)</option>
                                <option value="Dr. Ali (Orthopedics)">Dr. Ali (Orthopedics)</option>
                            </select>
                        </div>
                        <div>
                            <label class="modal-label">Date</label>
                            <input type="date" class="input" id="panel-date-input" />
                        </div>
                        <div>
                            <label class="modal-label">Time</label>
                            <select class="input" id="panel-time-input"></select>
                        </div>
                        <div>
                            <label class="modal-label">Duration</label>
                            <select class="input" id="panel-duration-input">
                                <option value="30">30 minutes</option>
                                <option value="45" selected>45 minutes</option>
                                <option value="60">60 minutes</option>
                            </select>
                        </div>
                        <div style="grid-column: span 2;">
                            <label class="modal-label">Reason for Visit</label>
                            <textarea class="input" id="panel-reason-input"
                                placeholder="Enter brief medical complaint..."
                                style="resize:vertical; min-height:60px;"></textarea>
                        </div>
                    </div>
                </div>

                <div id="tab-address" class="tab-pane">
                    <span
                        style="display: block; font-weight: 600; color: var(--text-dark); font-size: 0.9375rem; margin-bottom: 1.5rem;">Contact
                        & Address Details (UAE Format)</span>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem;">
                        <div>
                            <label class="modal-label">Building / Villa / Apt No.</label>
                            <input type="text" class="input" placeholder="e.g. Apt 402, Rose Tower" />
                        </div>
                        <div>
                            <label class="modal-label">Street Name / No.</label>
                            <input type="text" class="input" placeholder="e.g. Sheikh Zayed Road" />
                        </div>

                        <div>
                            <label class="modal-label">Area / Community</label>
                            <input type="text" class="input" placeholder="e.g. Downtown Dubai, Al Barsha" />
                        </div>
                        <div>
                            <label class="modal-label">PO Box / Makani No.</label>
                            <input type="text" class="input" placeholder="e.g. PO Box 12345" />
                        </div>

                        <div>
                            <label class="modal-label">Emirate (Province/Region)</label>
                            <select class="input">
                                <option>Abu Dhabi</option>
                                <option selected>Dubai</option>
                                <option>Sharjah</option>
                                <option>Ajman</option>
                                <option>Umm Al Quwain</option>
                                <option>Ras Al Khaimah</option>
                                <option>Fujairah</option>
                            </select>
                        </div>
                        <div>
                            <label class="modal-label">Country</label>
                            <input type="text" class="input" value="United Arab Emirates" disabled
                                style="background:var(--bg-aesthetic);" />
                        </div>

                        <div
                            style="grid-column: span 2; margin-top: 1rem; padding-top: 1rem; border-top: 1px dashed var(--border-light);">
                            <label class="modal-label">Emergency Contact Name & Relation</label>
                            <input type="text" class="input" placeholder="e.g. John Doe - Father" />
                        </div>
                    </div>
                </div>

                <div id="tab-highlights" class="tab-pane">
                    <span
                        style="display: block; font-weight: 600; color: var(--text-dark); font-size: 0.9375rem; margin-bottom: 1.5rem;">Clinical
                        Profile & Encounters</span>

                    <div
                        style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; margin-bottom: 2rem; border-bottom: 1px solid var(--border-light); padding-bottom: 2rem;">
                        <div style="grid-column: span 2;">
                            <label class="modal-label" style="color: var(--danger);">Critical Alerts / Known
                                Allergies</label>
                            <div id="dyn-allergies"
                                style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 6px; min-height: 28px;">
                            </div>
                        </div>

                        <div>
                            <label class="modal-label">Blood Group</label>
                            <div id="dyn-blood-group"
                                style="display: flex; align-items: center; margin-top: 4px; min-height: 32px;">
                            </div>
                        </div>

                        <div>
                            <label class="modal-label">Chronic Conditions</label>
                            <div id="dyn-conditions"
                                style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 4px; min-height: 32px;">
                            </div>
                        </div>

                        <div style="grid-column: span 2;">
                            <label class="modal-label">Recent Vitals <span id="dyn-vitals-date"
                                    style="text-transform: none; font-weight: 400; color: var(--text-muted);"></span></label>
                            <div id="dyn-vitals"
                                style="display: flex; gap: 2rem; margin-top: 6px; background: var(--bg-canvas); padding: 12px 16px; border-radius: 8px; border: 1px solid var(--border-light); min-height: 44px;">
                            </div>
                        </div>
                    </div>

                    <div>
                        <span
                            style="display: block; font-weight: 600; color: var(--text-dark); font-size: 0.875rem; margin-bottom: 1.25rem;">Encounter
                            History</span>
                        <div
                            style="border: 1px solid var(--border-light); border-radius: 8px; overflow: hidden; max-height: 260px; overflow-y: auto;">
                            <table
                                style="width: 100%; text-align: left; border-collapse: collapse; font-size: 0.8125rem;">
                                <thead
                                    style="background: var(--bg-aesthetic); color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; position: sticky; top: 0; z-index: 10;">
                                    <tr>
                                        <th
                                            style="padding: 10px 16px; border-bottom: 1px solid var(--border-light); width: 120px;">
                                            Date</th>
                                        <th style="padding: 10px 16px; border-bottom: 1px solid var(--border-light);">
                                            Diagnosis / Reason</th>
                                        <th style="padding: 10px 16px; border-bottom: 1px solid var(--border-light);">
                                            Attending Provider</th>
                                        <th
                                            style="padding: 10px 16px; border-bottom: 1px solid var(--border-light); text-align: right;">
                                            Action</th>
                                    </tr>
                                </thead>
                                <tbody id="dyn-encounters">
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div id="tab-history" class="tab-pane">
                    <div
                        style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                        <span style="font-weight: 600; color: var(--text-dark); font-size: 0.9375rem;">Past Clinical
                            Visits</span>
                    </div>
                    <div
                        style="border: 1px solid var(--border-light); border-radius: 8px; overflow: hidden; max-height: 340px; overflow-y: auto;">
                        <table style="width: 100%; text-align: left; border-collapse: collapse; font-size: 0.8125rem;">
                            <thead
                                style="background: var(--bg-aesthetic); color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; position: sticky; top: 0; z-index: 10;">
                                <tr>
                                    <th style="padding: 12px; border-bottom: 1px solid var(--border-light);">Date</th>
                                    <th style="padding: 12px; border-bottom: 1px solid var(--border-light);">Provider &
                                        Dept</th>
                                    <th style="padding: 12px; border-bottom: 1px solid var(--border-light);">Diagnosis
                                    </th>
                                    <th style="padding: 12px; border-bottom: 1px solid var(--border-light);">Status</th>
                                    <th
                                        style="padding: 12px; border-bottom: 1px solid var(--border-light); text-align: right;">
                                        Details</th>
                                </tr>
                            </thead>
                            <tbody id="dyn-visit-history">
                            </tbody>
                        </table>
                    </div>
                </div>

                <div id="tab-package" class="tab-pane">
                    <div
                        style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                        <span style="font-weight: 600; color: var(--text-dark); font-size: 0.9375rem;">Insurance &
                            Package History</span>
                    </div>
                    <div
                        style="border: 1px solid var(--border-light); border-radius: 8px; overflow: hidden; max-height: 340px; overflow-y: auto;">
                        <table style="width: 100%; text-align: left; border-collapse: collapse; font-size: 0.8125rem;">
                            <thead
                                style="background: var(--bg-aesthetic); color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; position: sticky; top: 0; z-index: 10;">
                                <tr>
                                    <th style="padding: 12px; border-bottom: 1px solid var(--border-light);">Insurance /
                                        Scheme</th>
                                    <th style="padding: 12px; border-bottom: 1px solid var(--border-light);">Activation
                                    </th>
                                    <th style="padding: 12px; border-bottom: 1px solid var(--border-light);">Expiration
                                    </th>
                                    <th style="padding: 12px; border-bottom: 1px solid var(--border-light);">Usage /
                                        Limits</th>
                                    <th style="padding: 12px; border-bottom: 1px solid var(--border-light);">Status</th>
                                    <th
                                        style="padding: 12px; border-bottom: 1px solid var(--border-light); text-align: right;">
                                        Details</th>
                                </tr>
                            </thead>
                            <tbody id="dyn-package-history">
                            </tbody>
                        </table>
                    </div>
                </div>

                <div id="tab-item" class="tab-pane">
                    <span
                        style="display: block; font-weight: 600; color: var(--text-dark); font-size: 0.9375rem; margin-bottom: 1.5rem;">Item
                        Consumption History</span>
                    <div style="border: 1px solid var(--border-light); border-radius: 8px; overflow: hidden;">
                        <table style="width: 100%; text-align: left; border-collapse: collapse; font-size: 0.8125rem;">
                            <thead
                                style="background: var(--bg-aesthetic); color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">
                                <tr>
                                    <th style="padding: 12px; border-bottom: 1px solid var(--border-light);">Date</th>
                                    <th style="padding: 12px; border-bottom: 1px solid var(--border-light);">Item
                                        Description</th>
                                    <th style="padding: 12px; border-bottom: 1px solid var(--border-light);">Qty</th>
                                    <th style="padding: 12px; border-bottom: 1px solid var(--border-light);">Department
                                    </th>
                                </tr>
                            </thead>
                            <tbody id="dyn-item-history">
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

            <div class="pane-sidebar">
                <div style="text-align: right; padding-bottom: 1rem; border-bottom: 1px solid var(--border-light);">
                    <div style="font-weight: 700; color: var(--text-dark); font-size: 0.9375rem;" id="side-pt-name">New
                        Patient</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;" id="side-pt-details">
                        Enter details to generate summary</div>
                </div>

                <div class="toggle-row">Toggle To Enquiry <label class="switch"><input type="checkbox"><span
                            class="slider"></span></label></div>
                <div class="toggle-row">Send SMS <label class="switch"><input type="checkbox" checked><span
                            class="slider"></span></label></div>
                <div class="toggle-row">Send WhatsApp <label class="switch"><input type="checkbox" checked><span
                            class="slider"></span></label></div>
                <div class="toggle-row">Medical Tourism Visit <label class="switch"><input type="checkbox"><span
                            class="slider"></span></label></div>

                <button class="btn-secondary"
                    style="width: 100%; justify-content: center; font-weight: 600; color: var(--accent); border-color: var(--accent);">FETCH
                    DATA FROM CARD</button>

                <div
                    style="margin-top: auto; background: var(--bg-surface); padding: 1rem; border-radius: 8px; border: 1px solid var(--border-light);">
                    <div class="finance-row"><span>Advance</span> <span
                            style="color: var(--success-text);">1,000.00</span></div>
                    <div class="finance-row" style="border-bottom: none;"><span>Overdue</span> <span
                            style="color: var(--danger);">7,156.80</span></div>
                </div>
            </div>
        </div>

        <div class="panel-footer" id="panel-footer-actions"></div>
    </div>

    <script src="assets/js/datebar.js"></script>
    <script src="assets/js/scheduler.js"></script>
</body>

</html>