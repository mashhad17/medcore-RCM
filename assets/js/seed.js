/* ─────────────────────────────────────────────────
   MEDCORE HMS · SHARED DEMO SEED
   Canonical default appointment data, used by any page so the
   directory / scheduler / queue all share the same patients
   regardless of which page is opened first. Synced to MySQL via
   store.js the moment it is written.
   ───────────────────────────────────────────────── */

function medcoreFormatDateKey(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function medcoreDefaultAppointments(todayStr) {
    return [
        {
            id: 'app-1', patientName: 'Kavya Shanil', mrn: 'MRN-2026-0009', nid: '784-1994-103115-2', phone: '+971 50 765 4321', resident: 'yes', doctorName: 'Dr. Mohammed (General Practice)', colIndex: 0, date: todayStr, startHour: 9, startMinute: 30, duration: 45, reason: 'Routine checkup and vitals assessment.', status: 'arrived',
            clinicalProfile: null
        },
        {
            id: 'app-3', patientName: 'Zain Ahmed', mrn: 'MRN-2026-0007', nid: '784-1984-088412-1', phone: '+971 52 321 7479', resident: 'yes', doctorName: 'Dr. Fatima (Dental Surgery)', colIndex: 1, date: todayStr, startHour: 10, startMinute: 0, duration: 60, reason: 'Root Canal treatment follow-up.', status: 'warning',
            clinicalProfile: {
                bloodGroup: "O+",
                allergies: ["Penicillin", "Peanuts (Severe)"],
                conditions: ["Asthma", "Type 2 Diabetes"],
                vitals: { date: "May 28, 2026", bp: "135/85", hr: "82 bpm", weight: "88 kg" },
                encounters: [
                    { date: "May 28, 2026", diagnosis: "Root Canal Prep", status: "Follow-up Reqd", doctor: "Dr. Fatima", dept: "Dental Surgery" },
                    { date: "Jan 12, 2026", diagnosis: "Acute Contact Dermatitis", status: "Resolved", doctor: "Dr. Roger", dept: "Dermatology" }
                ],
                packages: [
                    { name: "Sukoon Insurance - Silver Classic", activationDate: "Jan 01, 2026", expiryDate: "Dec 31, 2026", usage: "In-Patient: 100% | Out-Patient: 20% CoPay", status: "Active" }
                ],
                items: [
                    { date: "Jan 12, 2026", description: "Lidocaine Injection 2% (Anesthesia)", qty: "2 Vials", dept: "Dental Surgery" },
                    { date: "Nov 05, 2025", description: "Sterile Gauze Pad 4x4", qty: "3 Packs", dept: "Dermatology" }
                ]
            }
        },
        {
            id: 'app-4', patientName: 'Ameem Siddiqui', mrn: 'MRN-2026-0008', nid: '784-1997-223344-9', phone: '+971 56 889 9000', resident: 'yes', doctorName: 'Dr. Roger (Dermatology)', colIndex: 2, date: todayStr, startHour: 9, startMinute: 0, duration: 30, reason: 'Skin Rash Consultation.', status: 'completed',
            clinicalProfile: {
                bloodGroup: "B+",
                allergies: ["Latex"],
                conditions: ["None reported"],
                vitals: { date: "Jun 01, 2026", bp: "118/75", hr: "68 bpm", weight: "72 kg" },
                encounters: [
                    { date: "Jun 01, 2026", diagnosis: "Minor Wrist Fracture", status: "Resolved", doctor: "Dr. Ali", dept: "Orthopedics" },
                    { date: "Feb 14, 2025", diagnosis: "General Checkup", status: "Completed", doctor: "Dr. Mohammed", dept: "General Practice" }
                ],
                packages: [
                    { name: "DHA Essential Benefits Plan (EBP)", activationDate: "Mar 15, 2025", expiryDate: "Mar 14, 2026", usage: "General: 3 / 5 Visits", status: "Expired" },
                    { name: "GIG Gulf Comprehensive Care", activationDate: "Mar 15, 2026", expiryDate: "Mar 14, 2027", usage: "Unlimited", status: "Active" }
                ],
                items: [
                    { date: "Jun 01, 2026", description: "Topical Hydrocortisone Cream 1%", qty: "1 Tube", dept: "Dermatology" },
                    { date: "Feb 14, 2025", description: "Disposable Examination Gloves", qty: "1 Pack", dept: "General Practice" }
                ]
            }
        },
        {
            id: 'app-seed-5', patientName: 'Sara Khan', mrn: 'MRN-2026-0006', nid: '784-1995-663829-2', phone: '+971 50 663 8290', resident: 'yes', doctorName: 'Dr. Fatima (Dental Surgery)', colIndex: 1, date: '2026-06-10', startHour: 11, startMinute: 0, duration: 45, reason: 'Dental exam and scale.', status: 'completed',
            clinicalProfile: {
                bloodGroup: "A-", allergies: ["Ibuprofen"], conditions: ["Hypertension"],
                vitals: { date: "Jun 10, 2026", bp: "140/90", hr: "78 bpm", weight: "65 kg" },
                encounters: [{ date: "Jun 10, 2026", diagnosis: "Dental Checkup", status: "Completed", doctor: "Dr. Fatima", dept: "Dental Surgery" }],
                packages: [{ name: "Daman (Thiqa Plan)", activationDate: "Jan 01, 2026", expiryDate: "Dec 31, 2026", usage: "Unlimited", status: "Active" }]
            }
        },
        {
            id: 'app-seed-6', patientName: 'Mohammed Ali', mrn: 'MRN-2026-0014', nid: '784-1990-551207-3', phone: '+971 55 120 7733', resident: 'yes', doctorName: 'Dr. Ali (Orthopedics)', colIndex: 4, date: '2026-06-05', startHour: 15, startMinute: 0, duration: 30, reason: 'Knee pain assessment.', status: 'completed',
            clinicalProfile: {
                bloodGroup: "AB+", allergies: [], conditions: ["Osteoarthritis"],
                vitals: { date: "Jun 05, 2026", bp: "128/82", hr: "74 bpm", weight: "90 kg" },
                encounters: [{ date: "Jun 05, 2026", diagnosis: "Knee Pain", status: "Completed", doctor: "Dr. Ali", dept: "Orthopedics" }],
                packages: []
            }
        }
    ];
}

function medcoreSeedAppointmentsIfEmpty() {
    try {
        const stored = localStorage.getItem('medcore_appointments');
        if (stored && JSON.parse(stored).length > 0) return false;
        localStorage.setItem('medcore_appointments', JSON.stringify(medcoreDefaultAppointments(medcoreFormatDateKey(new Date()))));
        return true;
    } catch (e) { return false; }
}
