// Hospital Bed & Operating Room (OR) Scheduling Application Controller

import { BedManager } from './beds.js?v=3';
import { ORScheduler, timeToMinutes } from './scheduler.js?v=3';
import { DSAOptimizer } from './optimizer.js?v=3';
import { AuthManager } from './auth.js?v=3';
import { PrescriptionManager } from './prescriptions.js?v=3';
import { NotificationManager } from './notifications.js?v=3';
import { DSALab } from './dsaLab.js?v=3';
import { escapeHTML } from './data.js?v=3';

class App {
    constructor() {
        this.authManager = new AuthManager();
        this.bedManager = new BedManager();
        this.orScheduler = new ORScheduler(this.bedManager);
        this.dsaOptimizer = new DSAOptimizer(this.orScheduler, this.bedManager);
        this.prescriptionManager = new PrescriptionManager();
        this.notificationManager = new NotificationManager();
        this.dsaLab = new DSALab(this.orScheduler, this.bedManager);

        this.currentWardFilter = 'all';
        this.init();
    }

    init() {
        this.bindEvents();
        this.checkAuth();
    }

    /* ---------------- Authentication & Role Routing ---------------- */
    checkAuth() {
        const loginOverlay = document.getElementById('login-screen-overlay');
        const user = this.authManager.getCurrentUser();

        if (!user) {
            if (loginOverlay) loginOverlay.style.display = 'flex';
            return;
        }

        if (loginOverlay) loginOverlay.style.display = 'none';

        // Update User Profile Header
        document.getElementById('header-user-name').textContent = user.name;
        document.getElementById('header-user-role').textContent = user.role.toUpperCase();
        document.getElementById('header-user-avatar').textContent = user.avatar || user.name.substring(0, 2).toUpperCase();

        // Update Notification Bell Badge
        this.updateNotificationBadge(user);

        // Apply Role Visibility Classes
        document.body.classList.remove('role-admin', 'role-doctor', 'role-patient');
        document.body.classList.add(`role-${user.role}`);

        // Show/Hide Role-Specific Sidebar & Nav Items
        document.querySelectorAll('.role-admin-only').forEach(el => el.style.display = user.role === 'admin' ? '' : 'none');
        document.querySelectorAll('.role-doctor-only').forEach(el => el.style.display = user.role === 'doctor' ? '' : 'none');
        document.querySelectorAll('.role-patient-only').forEach(el => el.style.display = user.role === 'patient' ? '' : 'none');

        // Route to default or URL-requested tab per role
        const urlParams = new URLSearchParams(window.location.search);
        const requestedTab = urlParams.get('tab') || window.location.hash.replace('#', '');

        if (user.role === 'admin') {
            this.renderPharmacyTable();
            if (requestedTab) {
                this.switchTab(requestedTab);
            } else {
                this.switchTab('tab-beds');
            }
        } else if (user.role === 'doctor') {
            this.switchTab('tab-doctor-portal');
        } else if (user.role === 'patient') {
            this.switchTab('tab-patient-portal');
        }

        this.renderAll();
    }

    switchTab(tabId) {
        if (!tabId) return;
        const cleanTab = tabId.startsWith('tab-') ? tabId : `tab-${tabId}`;
        const navId = cleanTab.replace('tab-', 'nav-');

        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));

        const targetNavEl = document.getElementById(navId);
        const targetTabEl = document.getElementById(cleanTab);

        if (targetNavEl) targetNavEl.classList.add('active');
        if (targetTabEl) targetTabEl.classList.add('active');

        try {
            const url = new URL(window.location.href);
            url.searchParams.set('tab', cleanTab.replace('tab-', ''));
            window.history.replaceState({}, '', url.toString());
        } catch (_) {}

        if (cleanTab === 'tab-dsa-lab') {
            document.getElementById('header-page-title').textContent = 'DSA Algorithm Lab';
            document.getElementById('header-page-subtitle').textContent = 'Interactive college DSA visualizer for Priority Queues, Greedy Intervals, and Hash Direct Addressing';
            this.dsaLab?.render();
        } else if (cleanTab === 'tab-beds') {
            document.getElementById('header-page-title').textContent = 'Resource Command Center';
            document.getElementById('header-page-subtitle').textContent = 'Real-time hospital bed monitoring and operating room interval scheduler';
        } else if (cleanTab === 'tab-or') {
            document.getElementById('header-page-title').textContent = 'OR Surgery Gantt Schedule';
            document.getElementById('header-page-subtitle').textContent = 'Real-time interval timeline and conflict detection engine';
        } else if (cleanTab === 'tab-triage') {
            document.getElementById('header-page-title').textContent = 'Emergency Triage Queue';
            document.getElementById('header-page-subtitle').textContent = 'Binary Min-Heap prioritization: Priority 1 (Emergency) > Priority 2 (Urgent) > Priority 3 (Elective)';
            this.renderTriageQueue();
        } else if (cleanTab === 'tab-pharmacy') {
            document.getElementById('header-page-title').textContent = 'Central Hospital Pharmacy';
            document.getElementById('header-page-subtitle').textContent = 'Active digital e-prescriptions and medication administration log';
            this.renderPharmacyTable();
        } else if (cleanTab === 'tab-doctor-portal') {
            document.getElementById('header-page-title').textContent = 'Doctor Clinical Portal';
            document.getElementById('header-page-subtitle').textContent = 'Surgeon schedule, operating room assignments, and post-op patients';
            this.renderDoctorPortal();
        } else if (cleanTab === 'tab-patient-portal') {
            document.getElementById('header-page-title').textContent = 'Patient Health Portal';
            document.getElementById('header-page-subtitle').textContent = 'Personal admission status, bed location, and surgery schedule';
            this.renderPatientPortal();
        }
    }

    updateNotificationBadge(user) {
        const badge = document.getElementById('header-notif-badge');
        if (!badge) return;

        let count = 0;
        if (user.role === 'admin') {
            count = this.notificationManager.getPendingSurgeryRequests().length;
        } else {
            count = this.notificationManager.getUnreadCountForUser(user);
        }

        badge.textContent = count;
        badge.style.display = count > 0 ? 'flex' : 'none';
    }

    renderAll() {
        if (this.authManager.hasRole('admin')) {
            this.renderMetrics();
            this.renderBedGrid();
            this.renderGanttChart();
            this.renderTriageQueue();
            this.renderPharmacyTable();
            this.populateDropdowns();

            if (document.getElementById('tab-dsa-lab')?.classList.contains('active')) {
                this.dsaLab?.render();
            }
        }
    }

    /* ---------------- Admin Pending Approvals Hub with Live Bed Selection ---------------- */
    renderPendingApprovalsDrawer() {
        const container = document.getElementById('pending-approvals-body');
        if (!container) return;

        const requests = this.notificationManager.getPendingSurgeryRequests();
        const wardMap = Object.fromEntries(this.bedManager.wards.map(w => [w.id, w.name]));

        if (requests.length === 0) {
            container.innerHTML = `<div class="p-4 text-muted text-center">No pending surgery requests from doctors at this time.</div>`;
            return;
        }

        container.innerHTML = requests.map(req => {
            // Get live available (vacant) beds in target ward at requested time
            const availBeds = this.bedManager.getAvailableBeds(req.requiredWard);
            const wardName = wardMap[req.requiredWard] || req.requiredWard;

            let bedOptions = '';
            if (availBeds.length > 0) {
                bedOptions = availBeds.map((b, idx) => 
                    `<option value="${escapeHTML(b.id)}" ${idx === 0 ? 'selected' : ''}>Berth / Bed ${escapeHTML(b.bedNumber)} (${escapeHTML(wardName)}) - VACANT AT REQUESTED TIME</option>`
                ).join('');
            } else {
                // Fallback all available vacant beds
                const allAvail = this.bedManager.getAvailableBeds();
                bedOptions = allAvail.map(b => `<option value="${escapeHTML(b.id)}">Berth / Bed ${escapeHTML(b.bedNumber)} (${escapeHTML(b.wardId.toUpperCase())}) - VACANT</option>`).join('');
            }

            return `
                <div class="approval-card">
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="status-badge ${req.priority === 1 ? 'occupied' : 'reserved'}">${escapeHTML(req.priorityLabel)}</span>
                        <span class="text-xs text-muted"><i class="fa-solid fa-clock"></i> Requested Time: ${escapeHTML(req.requestedTime)}</span>
                    </div>
                    <div class="font-bold text-lg text-white mt-1">${escapeHTML(req.surgeryType)}</div>
                    <div class="text-xs text-muted"><i class="fa-solid fa-user"></i> Patient: <strong class="text-white">${escapeHTML(req.patientName)}</strong> (${escapeHTML(req.patientAge)}y)</div>
                    <div class="text-xs text-muted"><i class="fa-solid fa-user-doctor"></i> Surgeon: <strong class="text-violet">${escapeHTML(req.doctorName)}</strong></div>
                    
                    <!-- Live Vacant Berth Availability Indicator -->
                    <div class="stat-card p-2 mt-2 mb-2" style="background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.35);">
                        <div class="text-xs text-success font-bold d-flex align-items-center gap-2">
                            <i class="fa-solid fa-circle-check"></i>
                            <span>Live Vacant Berths Available: ${availBeds.length} open berths in ${escapeHTML(wardName)}</span>
                        </div>
                    </div>

                    <!-- Bed Selector Dropdown -->
                    <div class="form-group mb-2">
                        <label class="form-label text-xs font-bold">Select Vacant Berth to Confirm for Surgery:</label>
                        <select class="form-control approve-bed-select" id="approve-bed-select-${escapeHTML(req.id)}">
                            ${bedOptions}
                        </select>
                    </div>

                    <div class="text-xs text-muted italic bg-dark p-2 rounded">${escapeHTML(req.notes || 'Clinical notes attached.')}</div>
                    
                    <div class="d-flex gap-2 mt-3">
                        <button class="btn btn-sm btn-success flex-1 approve-request-btn" data-id="${escapeHTML(req.id)}">
                            <i class="fa-solid fa-circle-check"></i> Approve & Confirm Berth for Surgery
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        document.querySelectorAll('.approve-request-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const reqId = e.currentTarget.dataset.id;
                this.approveDoctorSurgeryRequest(reqId);
            });
        });
    }

    approveDoctorSurgeryRequest(requestId) {
        const req = this.notificationManager.getRequestById(requestId);
        if (!req) return;

        // Get selected bed from dropdown
        const bedSelect = document.getElementById(`approve-bed-select-${requestId}`);
        const selectedBedId = bedSelect ? bedSelect.value : null;
        const selectedBed = selectedBedId ? this.bedManager.getBedById(selectedBedId) : null;
        const bedNumberDisplay = selectedBed ? selectedBed.bedNumber : '302';

        // Determine best OR room
        const operatingRooms = this.orScheduler.getOperatingRooms();
        let targetOR = operatingRooms[0];
        if (req.requiredWard === 'cardiac') targetOR = operatingRooms.find(r => r.id === 'OR-2') || operatingRooms[0];
        else if (req.requiredWard === 'icu') targetOR = operatingRooms.find(r => r.id === 'OR-1') || operatingRooms[0];

        // Book surgery schedule
        const surgeryRes = this.orScheduler.scheduleSurgery({
            patientName: req.patientName,
            patientAge: req.patientAge,
            surgeryType: req.surgeryType,
            priority: req.priority,
            orId: targetOR.id,
            surgeonId: req.doctorId,
            startTime: '11:00',
            durationMinutes: req.estDuration,
            postOpBedWard: req.requiredWard,
            notes: `[APPROVED BY ADMIN] ${req.notes}`
        });

        if (!surgeryRes.success) {
            this.showToast(`Approval Error: ${surgeryRes.message}`, 'error');
            return;
        }

        // Conform the chosen vacant berth for surgery
        if (selectedBed) {
            selectedBed.status = 'reserved';
            selectedBed.patientName = req.patientName;
            selectedBed.patientAge = req.patientAge;
            selectedBed.condition = `${req.surgeryType} (Confirmed Surgery)`;
            selectedBed.doctor = req.doctorName;
            selectedBed.admitTime = req.requestedTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            selectedBed.notes = `Confirmed for ${req.surgeryType} in ${targetOR.name} at 11:00`;
            selectedBed.isSurgeryConfirmed = true;
            this.bedManager.save();
        }

        req.status = 'Approved';
        this.notificationManager.save();

        const wardName = req.requiredWard.toUpperCase();

        // 1. Send Notification to Doctor
        this.notificationManager.sendNotification({
            recipientRole: 'doctor',
            recipientName: req.doctorName,
            title: '✅ Surgery Application Approved by Admin',
            message: `Surgery for "${req.patientName}" (${req.surgeryType}) confirmed in ${targetOR.name} at 11:00. Vacant Berth ${bedNumberDisplay} has been CONFORMED & reserved in ${wardName} ward.`,
            type: 'success'
        });

        // 2. Send Notification to Patient
        this.notificationManager.sendNotification({
            recipientRole: 'patient',
            recipientName: req.patientName,
            title: '🎉 Your Surgery & Berth Confirmed!',
            message: `Your surgery (${req.surgeryType}) with ${req.doctorName} is confirmed for 11:00 in ${targetOR.name}. Berth ${bedNumberDisplay} in ${wardName} Recovery Ward is CONFORMED for your surgery.`,
            type: 'success'
        });

        this.closeModal('modal-pending-approvals');
        this.showToast(`Approved! Berth ${bedNumberDisplay} in ${wardName} CONFORMED for ${req.patientName}'s surgery. Notifications dispatched.`, 'success');
        this.renderAll();
    }

    /* ---------------- Doctor Portal Renderer ---------------- */
    renderDoctorPortal() {
        const user = this.authManager.getCurrentUser();
        if (!user || user.role !== 'doctor') return;

        document.getElementById('doc-welcome-name').textContent = `Welcome, ${user.name}`;
        document.getElementById('doc-specialty').textContent = `Specialty: ${user.specialty || 'Surgeon'}`;

        // Doctor Inbox Notifications
        const notifs = this.notificationManager.getNotificationsForUser(user);
        const inboxContainer = document.getElementById('doc-inbox-section');

        if (notifs.length === 0) {
            inboxContainer.innerHTML = `<div class="text-muted text-xs p-2">No notification updates at this time.</div>`;
        } else {
            inboxContainer.innerHTML = notifs.map(n => `
                <div class="inbox-card ${!n.read ? 'unread' : ''}">
                    <i class="fa-solid fa-bell text-primary mt-1"></i>
                    <div>
                        <strong style="color: #fff;">${escapeHTML(n.title)}</strong>
                        <div class="text-xs text-muted">${escapeHTML(n.message)}</div>
                        <div class="text-xs text-muted mt-1"><i class="fa-solid fa-clock"></i> ${escapeHTML(n.timestamp)}</div>
                    </div>
                </div>
            `).join('');
        }

        // Doctor's assigned surgeries
        const surgeries = this.orScheduler.getAllSurgeries().filter(s => s.surgeonId === user.doctorId);
        const surgeryGrid = document.getElementById('doc-surgeries-grid');

        if (surgeries.length === 0) {
            surgeryGrid.innerHTML = `<div class="text-muted p-3">No surgeries currently scheduled for today.</div>`;
        } else {
            surgeryGrid.innerHTML = surgeries.map(s => {
                const room = this.orScheduler.getOperatingRooms().find(r => r.id === s.orId);
                return `
                    <div class="triage-card">
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="status-badge ${s.priority === 1 ? 'occupied' : 'reserved'}">${escapeHTML(s.priorityLabel)}</span>
                            <span class="text-xs text-muted"><i class="fa-solid fa-clock"></i> ${escapeHTML(s.startTime)} - ${escapeHTML(s.endTime)}</span>
                        </div>
                        <div class="patient-name mt-2">${escapeHTML(s.patientName)} (${escapeHTML(s.patientAge)}y)</div>
                        <div class="text-xs text-muted"><i class="fa-solid fa-scalpel"></i> ${escapeHTML(s.surgeryType)}</div>
                        <div class="text-xs text-muted"><i class="fa-solid fa-hospital"></i> Location: ${room ? escapeHTML(room.name) : escapeHTML(s.orId)}</div>
                        <div class="mt-3 d-flex gap-2">
                            ${s.status !== 'Completed' ? `
                                <button class="btn btn-xs btn-success mark-surgery-complete-btn" data-id="${escapeHTML(s.id)}">
                                    <i class="fa-solid fa-check"></i> Complete Surgery
                                </button>
                            ` : `
                                <span class="status-badge available">Completed</span>
                            `}
                        </div>
                    </div>
                `;
            }).join('');

            document.querySelectorAll('.mark-surgery-complete-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.currentTarget.dataset.id;
                    this.orScheduler.updateSurgeryStatus(id, 'Completed');
                    this.showToast(`Surgery marked as Completed!`, 'success');
                    this.renderDoctorPortal();
                });
            });
        }

        // Doctor's Issued Prescriptions Grid
        const doctorRxs = this.prescriptionManager.getPrescriptionsByDoctor(user.doctorId);
        const rxGrid = document.getElementById('doc-prescriptions-grid');

        if (doctorRxs.length === 0) {
            rxGrid.innerHTML = `<div class="text-muted p-3">No prescriptions issued yet today.</div>`;
        } else {
            rxGrid.innerHTML = doctorRxs.map(rx => `
                <div class="prescription-card active-rx">
                    <div class="med-header">
                        <div class="med-icon-box">
                            <i class="fa-solid fa-pills"></i>
                        </div>
                        <div>
                            <div class="med-title">${escapeHTML(rx.medicineName)}</div>
                            <div class="med-dosage">${escapeHTML(rx.dosage)}</div>
                        </div>
                    </div>
                    <div class="text-xs text-muted mt-1"><i class="fa-solid fa-user"></i> Patient: <strong>${escapeHTML(rx.patientName)}</strong> (${escapeHTML(rx.patientBedNumber)})</div>
                    <div><span class="freq-tag">${escapeHTML(rx.frequency)}</span> <span class="text-xs text-muted ms-2">Duration: ${escapeHTML(rx.duration)}</span></div>
                    <div class="text-xs text-muted italic">${escapeHTML(rx.instructions)}</div>
                    <div class="rx-meta-row">
                        <span>${escapeHTML(rx.category)}</span>
                        <span><i class="fa-solid fa-clock"></i> ${escapeHTML(rx.prescribedTime)}</span>
                    </div>
                </div>
            `).join('');
        }

        // Doctor's Admitted Patients Roster
        const patientsGrid = document.getElementById('doc-patients-grid');
        const doctorBeds = this.bedManager.getAllBeds().filter(b => b.doctor === user.name && b.status === 'occupied');

        if (doctorBeds.length === 0) {
            patientsGrid.innerHTML = `<div class="text-muted p-3">No admitted patients currently under your direct care.</div>`;
        } else {
            patientsGrid.innerHTML = doctorBeds.map(b => `
                <div class="bed-card status-occupied">
                    <div class="bed-header">
                        <div class="bed-number"><i class="fa-solid fa-bed"></i> Bed ${escapeHTML(b.bedNumber)}</div>
                        <span class="status-badge occupied">Occupied</span>
                    </div>
                    <div class="patient-info">
                        <div class="patient-name">${escapeHTML(b.patientName)} (${escapeHTML(b.patientAge)}y)</div>
                        <div class="text-xs text-muted"><i class="fa-solid fa-stethoscope"></i> ${escapeHTML(b.condition)}</div>
                        <div class="text-xs text-muted"><i class="fa-solid fa-calendar"></i> Adm: ${escapeHTML(b.admitTime || 'Recent')}</div>
                    </div>
                </div>
            `).join('');
        }
    }

    /* ---------------- Patient Portal Renderer ---------------- */
    renderPatientPortal() {
        const user = this.authManager.getCurrentUser();
        if (!user || user.role !== 'patient') return;

        document.getElementById('pat-welcome-name').textContent = `Welcome, ${user.name}`;

        // Patient Inbox / Notifications Alert Box
        const notifs = this.notificationManager.getNotificationsForUser(user);
        const notifBox = document.getElementById('pat-notifications-box');

        if (notifs.length > 0) {
            notifBox.innerHTML = notifs.map(n => `
                <div class="hero-card mb-3" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(59, 130, 246, 0.15)); border-color: rgba(16, 185, 129, 0.4); padding: 18px;">
                    <div class="d-flex align-items-center gap-3">
                        <i class="fa-solid fa-circle-check text-success font-xl" style="font-size: 1.5rem;"></i>
                        <div>
                            <h4 class="font-bold text-white mb-1">${escapeHTML(n.title)}</h4>
                            <div class="text-sm text-secondary">${escapeHTML(n.message)}</div>
                            <div class="text-xs text-muted mt-1"><i class="fa-solid fa-clock"></i> ${escapeHTML(n.timestamp)}</div>
                        </div>
                    </div>
                </div>
            `).join('');
        } else {
            notifBox.innerHTML = '';
        }

        const bed = this.bedManager.getAllBeds().find(b => b.id === user.bedId || (b.patientName && b.patientName.includes(user.name)));
        const bedInfoContainer = document.getElementById('pat-bed-info');

        if (bed) {
            const ward = this.bedManager.wards.find(w => w.id === bed.wardId);
            bedInfoContainer.innerHTML = `
                <div class="font-bold text-xl text-primary mb-1">Bed ${escapeHTML(bed.bedNumber)}</div>
                <div class="text-sm text-primary font-medium">${escapeHTML(ward ? ward.name : bed.wardId)}</div>
                <div class="text-xs text-muted mt-2">Status: <span class="status-badge ${escapeHTML(bed.status)}">${escapeHTML(bed.status)}</span></div>
            `;
        } else {
            bedInfoContainer.innerHTML = `<div class="text-muted">No active bed assignment found.</div>`;
        }

        const surgery = this.orScheduler.getAllSurgeries().find(s => s.patientName.includes(user.name));
        const surgeryInfoContainer = document.getElementById('pat-surgery-info');

        if (surgery) {
            const doctor = this.orScheduler.getDoctorById(surgery.surgeonId);
            const room = this.orScheduler.getOperatingRooms().find(r => r.id === surgery.orId);
            surgeryInfoContainer.innerHTML = `
                <div class="font-bold text-lg text-white">${escapeHTML(surgery.surgeryType)}</div>
                <div class="text-sm text-muted mt-1"><i class="fa-solid fa-clock text-primary"></i> Time: ${escapeHTML(surgery.startTime)} - ${escapeHTML(surgery.endTime)}</div>
                <div class="text-sm text-muted"><i class="fa-solid fa-hospital text-violet"></i> Location: ${escapeHTML(room ? room.name : surgery.orId)}</div>
                <div class="text-sm text-muted"><i class="fa-solid fa-user-doctor text-success"></i> Surgeon: ${escapeHTML(doctor ? doctor.name : 'Attending Surgeon')}</div>
            `;
        } else {
            surgeryInfoContainer.innerHTML = `<div class="text-muted">No upcoming surgery scheduled today.</div>`;
        }

        const patientRxs = this.prescriptionManager.getPrescriptionsByPatient(user.name);
        const patRxGrid = document.getElementById('pat-prescriptions-grid');

        if (patientRxs.length === 0) {
            patRxGrid.innerHTML = `<div class="text-muted p-3">No active prescriptions currently issued for you.</div>`;
        } else {
            patRxGrid.innerHTML = patientRxs.map(rx => `
                <div class="prescription-card active-rx">
                    <div class="med-header">
                        <div class="med-icon-box">
                            <i class="fa-solid fa-capsules"></i>
                        </div>
                        <div>
                            <div class="med-title">${escapeHTML(rx.medicineName)}</div>
                            <div class="med-dosage">${escapeHTML(rx.dosage)}</div>
                        </div>
                    </div>
                    <div><span class="freq-tag">${escapeHTML(rx.frequency)}</span> <span class="text-xs text-muted ms-2">Duration: ${escapeHTML(rx.duration)}</span></div>
                    <div class="text-xs text-muted italic mt-1"><i class="fa-solid fa-circle-info text-primary"></i> ${escapeHTML(rx.instructions)}</div>
                    <div class="rx-meta-row">
                        <span><i class="fa-solid fa-user-doctor text-success"></i> ${escapeHTML(rx.doctorName)}</span>
                        <span><i class="fa-solid fa-clock"></i> ${escapeHTML(rx.prescribedTime)}</span>
                    </div>
                </div>
            `).join('');
        }
    }

    /* ---------------- Instant Patient Search Bar & Profile Drawer ---------------- */
    handlePatientSearch(query) {
        const resultsBox = document.getElementById('patient-search-results');
        if (!resultsBox) return;

        if (!query || query.trim().length === 0) {
            resultsBox.classList.remove('active');
            return;
        }

        const q = query.toLowerCase().trim();
        const beds = this.bedManager.getAllBeds().filter(b => b.patientName);
        const surgeries = this.orScheduler.getAllSurgeries();
        const registeredUsers = this.authManager.registeredUsers.filter(u => u.role === 'patient');

        const matchesMap = new Map();

        beds.forEach(b => {
            if (b.patientName.toLowerCase().includes(q)) {
                matchesMap.set(b.patientName, {
                    name: b.patientName,
                    age: b.patientAge,
                    condition: b.condition,
                    bedNumber: b.bedNumber,
                    wardId: b.wardId,
                    doctor: b.doctor
                });
            }
        });

        surgeries.forEach(s => {
            if (s.patientName.toLowerCase().includes(q) && !matchesMap.has(s.patientName)) {
                matchesMap.set(s.patientName, {
                    name: s.patientName,
                    age: s.patientAge,
                    condition: s.surgeryType,
                    surgery: s
                });
            }
        });

        registeredUsers.forEach(u => {
            if (u.name.toLowerCase().includes(q) && !matchesMap.has(u.name)) {
                matchesMap.set(u.name, {
                    name: u.name,
                    age: u.patientAge || 'N/A',
                    condition: u.condition || 'Admitted'
                });
            }
        });

        const matches = Array.from(matchesMap.values());

        if (matches.length === 0) {
            resultsBox.innerHTML = `<div class="p-3 text-muted text-xs">No matching patient found for "${escapeHTML(query)}".</div>`;
        } else {
            resultsBox.innerHTML = matches.map(m => `
                <div class="search-result-item" data-patient-name="${escapeHTML(m.name)}">
                    <div>
                        <strong style="color: #fff;">${escapeHTML(m.name)}</strong> ${m.age ? `(${escapeHTML(m.age)}y)` : ''}
                        <div class="text-xs text-muted">${escapeHTML(m.condition || 'Patient Record')}</div>
                    </div>
                    <span class="status-badge available" style="font-size: 0.7rem;">View Details</span>
                </div>
            `).join('');

            document.querySelectorAll('.search-result-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    const patName = e.currentTarget.dataset.patientName;
                    resultsBox.classList.remove('active');
                    document.getElementById('patient-search-input').value = patName;
                    this.openPatientDetailsModal(patName);
                });
            });
        }

        resultsBox.classList.add('active');
    }

    openPatientDetailsModal(patientName) {
        const modal = document.getElementById('modal-patient-details');
        const container = document.getElementById('patient-detail-body');
        if (!modal || !container) return;

        const bed = this.bedManager.getAllBeds().find(b => b.patientName && b.patientName.toLowerCase().includes(patientName.toLowerCase()));
        const surgery = this.orScheduler.getAllSurgeries().find(s => s.patientName.toLowerCase().includes(patientName.toLowerCase()));
        const prescriptions = this.prescriptionManager.getPrescriptionsByPatient(patientName);
        const wardMap = Object.fromEntries(this.bedManager.wards.map(w => [w.id, w.name]));

        const attendingDoctor = bed?.doctor || (surgery ? this.orScheduler.getDoctorById(surgery.surgeonId)?.name : 'Dr. Ananya Sharma');

        document.getElementById('patient-detail-title').innerHTML = `<i class="fa-solid fa-address-card text-primary"></i> Profile: ${escapeHTML(patientName)}`;

        container.innerHTML = `
            <div class="hero-card mb-3" style="padding: 20px;">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h4 class="font-heading text-lg font-bold" style="color: #fff;">${escapeHTML(patientName)}</h4>
                        <div class="text-xs text-muted">Condition: <strong class="text-white">${escapeHTML(bed?.condition || surgery?.surgeryType || 'Hospital Care')}</strong></div>
                    </div>
                    <span class="status-badge ${bed ? escapeHTML(bed.status) : 'reserved'}">${escapeHTML(bed ? bed.status : 'Scheduled')}</span>
                </div>
            </div>

            <div class="profile-meta-grid">
                <div class="meta-item">
                    <div class="meta-label">Bed Location</div>
                    <div class="meta-value text-primary">${bed ? `Bed ${escapeHTML(bed.bedNumber)}` : 'Unassigned'}</div>
                    <div class="text-xs text-muted">${bed ? escapeHTML(wardMap[bed.wardId] || bed.wardId) : 'N/A'}</div>
                </div>

                <div class="meta-item">
                    <div class="meta-label">Attending Doctor</div>
                    <div class="meta-value text-violet">${escapeHTML(attendingDoctor)}</div>
                </div>

                <div class="meta-item">
                    <div class="meta-label">Admission Time</div>
                    <div class="meta-value text-success">${escapeHTML(bed?.admitTime || 'Active')}</div>
                </div>
            </div>

            ${surgery ? `
                <div class="stat-card mb-3" style="flex-direction: column; align-items: flex-start; padding: 16px;">
                    <div class="text-xs text-muted uppercase font-bold mb-1"><i class="fa-solid fa-scalpel text-primary"></i> Scheduled OR Surgery</div>
                    <div class="font-bold text-white">${escapeHTML(surgery.surgeryType)}</div>
                    <div class="text-xs text-muted mt-1">Time: <strong class="text-white">${escapeHTML(surgery.startTime)} - ${escapeHTML(surgery.endTime)}</strong> | OR: <strong class="text-white">${escapeHTML(surgery.orId)}</strong></div>
                </div>
            ` : ''}

            <div class="section-header mt-3 mb-2">
                <h4 class="section-title text-sm"><i class="fa-solid fa-capsules text-success"></i> Active Prescribed Medications (${prescriptions.length})</h4>
            </div>

            ${prescriptions.length === 0 ? `
                <div class="text-muted text-xs p-2">No active medications currently prescribed.</div>
            ` : `
                <div class="prescription-grid" style="grid-template-columns: 1fr;">
                    ${prescriptions.map(rx => `
                        <div class="prescription-card active-rx" style="padding: 14px;">
                            <div class="med-header">
                                <div class="med-icon-box" style="width: 32px; height: 32px; font-size: 0.9rem;">
                                    <i class="fa-solid fa-pills"></i>
                                </div>
                                <div>
                                    <div class="med-title" style="font-size: 0.95rem;">${escapeHTML(rx.medicineName)} (${escapeHTML(rx.dosage)})</div>
                                    <div class="text-xs text-muted"><span class="freq-tag">${escapeHTML(rx.frequency)}</span> | Duration: ${escapeHTML(rx.duration)}</div>
                                </div>
                            </div>
                            <div class="text-xs text-muted italic mt-1">${escapeHTML(rx.instructions)}</div>
                        </div>
                    `).join('')}
                </div>
            `}
        `;

        this.openModal('modal-patient-details');
    }

    /* ---------------- Central Pharmacy Table (Admin) ---------------- */
    renderPharmacyTable() {
        const tableBody = document.getElementById('pharmacy-records-table');
        if (!tableBody) return;

        const prescriptions = this.prescriptionManager.getAllPrescriptions();

        if (prescriptions.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="8" class="text-muted text-center">No active medication records found.</td></tr>`;
            return;
        }

        tableBody.innerHTML = prescriptions.map(rx => `
            <tr>
                <td><strong class="text-primary">${escapeHTML(rx.id)}</strong></td>
                <td><strong>${escapeHTML(rx.patientName)}</strong></td>
                <td><span class="status-badge occupied">${escapeHTML(rx.patientBedNumber)}</span></td>
                <td><span class="med-title" style="font-size: 0.9rem;">${escapeHTML(rx.medicineName)}</span> <div class="text-xs text-muted">${escapeHTML(rx.dosage)}</div></td>
                <td><span class="freq-tag">${escapeHTML(rx.frequency)}</span> <div class="text-xs text-muted">Dur: ${escapeHTML(rx.duration)}</div></td>
                <td>${escapeHTML(rx.doctorName)}</td>
                <td class="text-xs text-muted">${escapeHTML(rx.prescribedTime)}</td>
                <td><span class="status-badge available">${escapeHTML(rx.status)}</span></td>
            </tr>
        `).join('');
    }

    /* ---------------- Metrics Dashboard (Admin) ---------------- */
    renderMetrics() {
        const bedMetrics = this.bedManager.getMetrics();
        const orMetrics = this.orScheduler.getMetrics();

        document.getElementById('metric-bed-occupancy').textContent = `${bedMetrics.occupancyRate}%`;
        document.getElementById('metric-beds-available').textContent = `${bedMetrics.available} / ${bedMetrics.total}`;
        document.getElementById('metric-or-utilization').textContent = `${orMetrics.utilizationRate}%`;
        document.getElementById('metric-triage-count').textContent = orMetrics.triageCount;

        const badge = document.getElementById('triage-badge');
        if (badge) badge.textContent = orMetrics.triageCount;
    }

    /* ---------------- Bed Management ---------------- */
    renderBedGrid() {
        const grid = document.getElementById('bed-grid');
        if (!grid) return;

        const beds = this.bedManager.getBedsByWard(this.currentWardFilter);
        const wardMap = Object.fromEntries(this.bedManager.wards.map(w => [w.id, w.name]));

        grid.innerHTML = beds.map(bed => {
            const wardName = wardMap[bed.wardId] || bed.wardId;
            let actionBtn = '';

            if (bed.status === 'available') {
                actionBtn = `<button class="btn btn-xs btn-primary allocate-bed-btn" data-id="${escapeHTML(bed.id)}">
                                <i class="fa-solid fa-user-plus"></i> Allocate Bed
                            </button>`;
            } else if (bed.status === 'occupied') {
                actionBtn = `<button class="btn btn-xs btn-secondary discharge-bed-btn" data-id="${escapeHTML(bed.id)}">
                                <i class="fa-solid fa-right-from-bracket"></i> Discharge
                            </button>`;
            } else if (bed.status === 'cleaning') {
                actionBtn = `<button class="btn btn-xs btn-success mark-clean-btn" data-id="${escapeHTML(bed.id)}">
                                <i class="fa-solid fa-broom"></i> Mark Clean
                            </button>`;
            } else if (bed.status === 'reserved') {
                actionBtn = `
                    <div class="d-flex gap-1">
                        <button class="btn btn-xs btn-success admit-reserved-bed-btn" data-id="${escapeHTML(bed.id)}" title="Admit patient to berth post-surgery">
                            <i class="fa-solid fa-hospital-user"></i> Admit Post-Op
                        </button>
                        <button class="btn btn-xs btn-secondary discharge-bed-btn" data-id="${escapeHTML(bed.id)}" title="Release berth reservation">
                            <i class="fa-solid fa-xmark"></i> Release
                        </button>
                    </div>
                `;
            }

            return `
                <div class="bed-card status-${escapeHTML(bed.status)}">
                    <div class="bed-header">
                        <div class="bed-number"><i class="fa-solid fa-bed"></i> Bed ${escapeHTML(bed.bedNumber)}</div>
                        <span class="status-badge ${escapeHTML(bed.status)}">
                            ${bed.status === 'reserved' ? '<i class="fa-solid fa-circle-check"></i> Confirmed Surgery' : escapeHTML(bed.status)}
                        </span>
                    </div>
                    <div class="patient-info">
                        <div class="text-xs text-muted mb-1">${escapeHTML(wardName)}</div>
                        ${bed.patientName ? `
                            <div class="patient-name">${escapeHTML(bed.patientName)} ${bed.patientAge ? `(${escapeHTML(bed.patientAge)}y)` : ''}</div>
                            <div class="text-xs text-muted mt-1"><i class="fa-solid fa-stethoscope"></i> ${escapeHTML(bed.condition || 'Admitted')}</div>
                            <div class="text-xs text-muted"><i class="fa-solid fa-user-doctor"></i> ${escapeHTML(bed.doctor || 'Unassigned Doctor')}</div>
                        ` : `
                            <div class="text-muted italic">${escapeHTML(bed.notes || 'Vacant & Ready')}</div>
                        `}
                    </div>
                    <div class="bed-actions">
                        ${actionBtn}
                    </div>
                </div>
            `;
        }).join('');

        this.bindBedActions();
    }

    bindBedActions() {
        document.querySelectorAll('.allocate-bed-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const bedId = e.currentTarget.dataset.id;
                this.openAllocateModal(bedId);
            });
        });

        document.querySelectorAll('.discharge-bed-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const bedId = e.currentTarget.dataset.id;
                const res = this.bedManager.dischargeBed(bedId);
                this.showToast(res.message, res.success ? 'success' : 'error');
                this.renderAll();
            });
        });

        document.querySelectorAll('.mark-clean-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const bedId = e.currentTarget.dataset.id;
                const res = this.bedManager.markClean(bedId);
                this.showToast(res.message, 'success');
                this.renderAll();
            });
        });

        document.querySelectorAll('.admit-reserved-bed-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const bedId = e.currentTarget.dataset.id;
                const bed = this.bedManager.getBedById(bedId);
                if (bed) {
                    bed.status = 'occupied';
                    bed.condition = bed.condition ? bed.condition.replace('(Confirmed Surgery)', '(Post-Op Recovery)') : 'Post-Op Recovery';
                    this.bedManager.save();
                    this.showToast(`Berth ${bed.bedNumber} updated to Post-Op Occupied for ${bed.patientName}.`, 'success');
                    this.renderAll();
                }
            });
        });
    }

    /* ---------------- OR Gantt Chart Timeline ---------------- */
    renderGanttChart() {
        const container = document.getElementById('gantt-rows');
        if (!container) return;

        const rooms = this.orScheduler.getOperatingRooms();
        const surgeries = this.orScheduler.getAllSurgeries();
        const doctors = this.orScheduler.getDoctors();

        const START_HOUR = 8;
        const TOTAL_MINUTES = 12 * 60;

        container.innerHTML = rooms.map(room => {
            const roomSurgeries = surgeries.filter(s => s.orId === room.id && s.status !== 'Cancelled');

            const blocks = roomSurgeries.map(s => {
                const sMin = timeToMinutes(s.startTime) - (START_HOUR * 60);
                const duration = s.durationMinutes;

                const leftPercent = Math.max(0, (sMin / TOTAL_MINUTES) * 100);
                const widthPercent = Math.min(100 - leftPercent, (duration / TOTAL_MINUTES) * 100);

                const surgeon = doctors.find(d => d.id === s.surgeonId);
                const surgeonName = surgeon ? surgeon.name.split(' ')[1] : 'Doc';

                return `
                    <div class="surgery-block priority-${s.priority}" 
                         style="left: ${leftPercent}%; width: ${widthPercent}%;"
                         title="${escapeHTML(s.patientName)} - ${escapeHTML(s.surgeryType)} (${escapeHTML(s.startTime)} - ${escapeHTML(s.endTime)}) [Surgeon: ${surgeon ? escapeHTML(surgeon.name) : 'Unassigned'}]">
                        <strong>${escapeHTML(s.patientName)}</strong>
                        <span>${escapeHTML(s.surgeryType.substring(0, 18))}... | Dr. ${escapeHTML(surgeonName)}</span>
                    </div>
                `;
            }).join('');

            return `
                <div class="gantt-room-row">
                    <div class="room-meta">
                        <div class="room-name">${room.name}</div>
                        <div class="room-spec">${room.specialty}</div>
                    </div>
                    <div class="timeline-track">
                        ${blocks}
                    </div>
                </div>
            `;
        }).join('');
    }

    /* ---------------- Triage Queue (Powered by Binary Min-Heap) ---------------- */
    renderTriageQueue() {
        const grid = document.getElementById('triage-grid');
        const rootBanner = document.getElementById('triage-heap-root-banner');
        const root = this.orScheduler.triageHeap.peek();
        const heapSize = this.orScheduler.triageHeap.size();

        if (rootBanner) {
            if (root) {
                rootBanner.innerHTML = `
                    <div class="hero-card p-3" style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.16), rgba(245, 158, 11, 0.12)); border-color: rgba(239, 68, 68, 0.45);">
                        <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
                            <div class="d-flex align-items-center gap-3">
                                <div style="background: rgba(239, 68, 68, 0.2); color: #ef4444; width: 42px; height: 42px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">
                                    <i class="fa-solid fa-bolt"></i>
                                </div>
                                <div>
                                    <div class="d-flex align-items-center gap-2">
                                        <span class="text-xs font-bold text-emergency uppercase">Min-Heap Root Node [0] — Top Clinical Urgency</span>
                                        <span class="status-badge ${root.priority === 1 ? 'occupied' : 'reserved'}">Priority ${root.priority}: ${escapeHTML(root.priorityLabel)}</span>
                                        <span class="text-xs text-muted">Total Heap Cases: ${heapSize}</span>
                                    </div>
                                    <div class="font-bold text-lg text-white mt-1">${escapeHTML(root.patientName)} (${escapeHTML(root.patientAge || '35')}y) — ${escapeHTML(root.condition)}</div>
                                    <div class="text-xs text-secondary mt-1">
                                        <i class="fa-solid fa-hospital text-primary"></i> Required Specialty: <strong>${escapeHTML(root.requiredORSpecialty)}</strong> | 
                                        <i class="fa-solid fa-clock text-warning"></i> Est. Duration: <strong>${escapeHTML(root.estDuration)} mins</strong>
                                    </div>
                                </div>
                            </div>
                            <div class="d-flex gap-2">
                                <button class="btn btn-emergency btn-xs" id="btn-banner-extract-root">
                                    <i class="fa-solid fa-hand-holding-medical"></i> Extract & Schedule Immediate Surgery
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                rootBanner.innerHTML = `
                    <div class="stat-card p-3">
                        <span class="text-xs text-muted"><i class="fa-solid fa-circle-check text-success"></i> Binary Min-Heap Priority Queue is currently empty.</span>
                    </div>
                `;
            }
        }

        if (!grid) return;
        const queue = this.orScheduler.getTriageQueue();

        if (queue.length === 0) {
            grid.innerHTML = `<div class="text-muted p-4">No pending triage cases in heap queue.</div>`;
            return;
        }

        grid.innerHTML = queue.map((item, idx) => `
            <div class="triage-card ${item.priority === 1 ? 'emergency' : ''}">
                <div class="d-flex justify-content-between align-items-center">
                    <div class="d-flex align-items-center gap-2">
                        <span class="status-badge ${item.priority === 1 ? 'occupied' : 'reserved'}">${escapeHTML(item.priorityLabel)}</span>
                        <span class="text-xs text-muted font-mono">Rank #${idx + 1}</span>
                    </div>
                    <span class="text-xs text-muted"><i class="fa-solid fa-clock"></i> Est: ${escapeHTML(item.estDuration)} min</span>
                </div>
                <div class="patient-name mt-2">${escapeHTML(item.patientName)} (${escapeHTML(item.patientAge)}y)</div>
                <div class="text-xs text-muted"><i class="fa-solid fa-notes-medical"></i> ${escapeHTML(item.condition)}</div>
                <div class="text-xs text-muted"><i class="fa-solid fa-hospital"></i> Req: ${escapeHTML(item.requiredORSpecialty)}</div>
                <div class="mt-3 d-flex gap-2">
                    <button class="btn btn-xs btn-primary flex-1 schedule-triage-btn" data-id="${escapeHTML(item.id)}">
                        <i class="fa-solid fa-calendar-plus"></i> Schedule
                    </button>
                    ${item.priority === 1 ? `
                        <button class="btn btn-xs btn-emergency emergency-override-btn" data-id="${escapeHTML(item.id)}">
                            <i class="fa-solid fa-bolt"></i> Emergency Override
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('');

        this.bindTriageActions();
    }

    bindTriageActions() {
        document.querySelectorAll('.schedule-triage-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const triageId = e.currentTarget.dataset.id;
                const triageItem = this.orScheduler.getTriageQueue().find(t => t.id === triageId);
                if (triageItem) {
                    this.openScheduleModalWithTriage(triageItem);
                }
            });
        });

        document.querySelectorAll('.emergency-override-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const triageId = e.currentTarget.dataset.id;
                const triageItem = this.orScheduler.getTriageQueue().find(t => t.id === triageId);
                if (triageItem) {
                    this.runEmergencyOverride(triageItem);
                }
            });
        });

        // Banner and header triage action triggers
        const handleExtractRoot = () => {
            const root = this.orScheduler.triageHeap.peek();
            if (!root) {
                this.showToast('No emergency cases in queue.', 'error');
                return;
            }
            const res = this.orScheduler.extractNextEmergency();
            if (res && res.extracted) {
                this.showToast(`Extracted top emergency: ${res.extracted.patientName} (P${res.extracted.priority}) via Min-Heap sinkDown!`, 'success');
                this.openScheduleModalWithTriage(res.extracted);
                this.renderAll();
                this.dsaLab?.render();
            }
        };

        document.getElementById('btn-banner-extract-root')?.addEventListener('click', handleExtractRoot);
        document.getElementById('btn-triage-extract-root')?.addEventListener('click', handleExtractRoot);

        document.getElementById('btn-triage-view-dsa-lab')?.addEventListener('click', () => {
            this.switchTab('tab-dsa-lab');
        });
    }

    /* ---------------- Dropdown Helpers ---------------- */
    populateDropdowns() {
        const surgeonSelect = document.getElementById('surgery-surgeon');
        const roomSelect = document.getElementById('surgery-or');
        const wardSelect = document.getElementById('surgery-postop-ward');
        const rxPatientSelect = document.getElementById('rx-patient-name');
        const allocateDocSelect = document.getElementById('allocate-doctor-select');
        const reqPatientSelect = document.getElementById('req-patient-select');

        const doctors = this.orScheduler.getDoctors();

        if (surgeonSelect) {
            surgeonSelect.innerHTML = doctors.map(d =>
                `<option value="${d.id}">${d.name} (${d.specialty})</option>`
            ).join('');
        }

        if (allocateDocSelect) {
            allocateDocSelect.innerHTML = doctors.map(d =>
                `<option value="${d.name}">${d.name} (${d.specialty})</option>`
            ).join('');
        }

        if (roomSelect) {
            roomSelect.innerHTML = this.orScheduler.getOperatingRooms().map(r =>
                `<option value="${r.id}">${r.name} (${r.specialty})</option>`
            ).join('');
        }

        if (wardSelect) {
            wardSelect.innerHTML = this.bedManager.wards.map(w =>
                `<option value="${w.id}">${w.name}</option>`
            ).join('');
        }

        if (rxPatientSelect) {
            const occupiedBeds = this.bedManager.getAllBeds().filter(b => b.status === 'occupied' || b.status === 'reserved');
            rxPatientSelect.innerHTML = occupiedBeds.map(b =>
                `<option value="${escapeHTML(b.patientName)}" data-bed="${escapeHTML(b.bedNumber)}" data-ward="${escapeHTML(b.wardId)}">${escapeHTML(b.patientName)} (Bed ${escapeHTML(b.bedNumber)} - ${escapeHTML(b.wardId.toUpperCase())})</option>`
            ).join('');
        }

        if (reqPatientSelect) {
            const user = this.authManager.getCurrentUser();
            let patientBeds = this.bedManager.getAllBeds().filter(b => b.status === 'occupied');
            if (user && user.role === 'doctor') {
                const docBeds = patientBeds.filter(b => b.doctor === user.name);
                if (docBeds.length > 0) patientBeds = docBeds;
            }
            reqPatientSelect.innerHTML = patientBeds.map(b =>
                `<option value="${escapeHTML(b.patientName)}" data-age="${escapeHTML(b.patientAge)}" data-condition="${escapeHTML(b.condition)}">${escapeHTML(b.patientName)} (${escapeHTML(b.patientAge)}y - Bed ${escapeHTML(b.bedNumber)})</option>`
            ).join('');
        }
    }

    /* ---------------- Modals & User Actions ---------------- */
    openAllocateModal(bedId) {
        const bed = this.bedManager.getBedById(bedId);
        if (!bed) return;

        this.populateDropdowns();
        document.getElementById('allocate-bed-id').value = bedId;
        document.getElementById('allocate-bed-title').textContent = `Allocate Bed ${bed.bedNumber}`;
        this.openModal('modal-allocate-bed');
    }

    openScheduleModalWithTriage(triageItem) {
        document.getElementById('surgery-triage-id').value = triageItem.id;
        document.getElementById('surgery-patient-name').value = triageItem.patientName;
        document.getElementById('surgery-patient-age').value = triageItem.patientAge;
        document.getElementById('surgery-type').value = triageItem.condition;
        document.getElementById('surgery-priority').value = triageItem.priority;
        document.getElementById('surgery-duration').value = triageItem.estDuration;

        this.openModal('modal-schedule-surgery');
    }

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('active');
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.remove('active');
    }

    /* ---------------- DSA Algorithm Execution Triggers ---------------- */
    runDSAOptimization() {
        const terminal = document.getElementById('dsa-log-terminal');
        this.openModal('modal-dsa-terminal');

        terminal.innerHTML = `<div>Starting DSA Greedy Interval Scheduling Algorithm...</div>`;

        setTimeout(() => {
            const res = this.dsaOptimizer.autoOptimizeSchedule();
            terminal.innerHTML = res.logs.map(log => `<div>${log}</div>`).join('');
            this.showToast(`DSA Optimizer complete: ${res.assignedCount} surgeries scheduled.`, 'success');
            this.renderAll();
        }, 600);
    }

    runEmergencyOverride(triageItem) {
        const terminal = document.getElementById('dsa-log-terminal');
        this.openModal('modal-dsa-terminal');

        terminal.innerHTML = `<div>Initiating Emergency Override Solver...</div>`;

        setTimeout(() => {
            const res = this.dsaOptimizer.handleEmergencyOverride(triageItem);
            terminal.innerHTML = res.logs.map(log => `<div>${log}</div>`).join('');
            this.showToast(`Emergency Override Executed for ${triageItem.patientName}!`, 'success');
            this.renderAll();
        }, 600);
    }

    /* ---------------- Event Listeners ---------------- */
    bindEvents() {
        // Notification Bell Click Listener
        document.getElementById('btn-header-notif')?.addEventListener('click', () => {
            const user = this.authManager.getCurrentUser();
            if (user && user.role === 'admin') {
                this.renderPendingApprovalsDrawer();
                this.openModal('modal-pending-approvals');
            } else if (user) {
                this.notificationManager.markAllAsRead(user);
                this.updateNotificationBadge(user);
                this.showToast('All notifications marked as read.', 'success');
            }
        });

        // Patient Search Input Listener
        const searchInput = document.getElementById('patient-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.handlePatientSearch(e.target.value);
            });

            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const firstMatch = document.querySelector('.search-result-item');
                    if (firstMatch) {
                        firstMatch.click();
                    }
                }
            });
        }

        // Close search dropdown on click outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.header-search-box')) {
                document.getElementById('patient-search-results')?.classList.remove('active');
            }
        });

        // Login Role Selector Tabs
        document.querySelectorAll('.role-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                document.querySelectorAll('.role-tab').forEach(t => t.classList.remove('active'));
                e.currentTarget.classList.add('active');

                const role = e.currentTarget.dataset.loginRole;
                document.getElementById('login-active-role').value = role;

                const usernameInput = document.getElementById('login-username');
                if (role === 'admin') usernameInput.value = 'admin';
                else if (role === 'doctor') usernameInput.value = 'dr.ananya';
                else if (role === 'patient') usernameInput.value = 'rohan.sharma';
            });
        });

        // Login Form Submit
        document.getElementById('form-login')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('login-username').value;
            const role = document.getElementById('login-active-role').value;

            const res = this.authManager.login(username, 'pass', role);
            if (res.success) {
                this.showToast(`Welcome ${res.user.name}! Login successful.`, 'success');
                this.checkAuth();
            }
        });

        // 1-Click Demo Login Buttons
        document.getElementById('demo-login-admin')?.addEventListener('click', () => {
            this.authManager.loginAsDemo('admin');
            this.showToast('Logged in as Hospital Office Admin', 'success');
            this.checkAuth();
        });

        document.getElementById('demo-login-doctor')?.addEventListener('click', () => {
            this.authManager.loginAsDemo('doctor');
            this.showToast('Logged in as Dr. Ananya Sharma (Surgeon)', 'success');
            this.checkAuth();
        });

        document.getElementById('demo-login-patient')?.addEventListener('click', () => {
            this.authManager.loginAsDemo('patient');
            this.showToast('Logged in as Patient Rohan Sharma', 'success');
            this.checkAuth();
        });

        // Logout Button
        document.getElementById('btn-logout')?.addEventListener('click', () => {
            this.authManager.logout();
            this.showToast('Signed out successfully.', 'success');
            this.checkAuth();
        });

        // Navigation View Switching
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const targetTab = e.currentTarget.dataset.tab;
                this.switchTab(targetTab);
                // Auto close mobile sidebar when navigating on smaller screens
                document.querySelector('.sidebar')?.classList.remove('mobile-open');
                document.getElementById('sidebar-backdrop')?.classList.remove('active');
            });
        });

        // Mobile Sidebar Toggle Buttons & Backdrop
        const mobileToggleBtn = document.getElementById('btn-mobile-sidebar-toggle');
        const sidebarEl = document.querySelector('.sidebar');
        const sidebarBackdrop = document.getElementById('sidebar-backdrop');

        if (mobileToggleBtn && sidebarEl) {
            mobileToggleBtn.addEventListener('click', () => {
                sidebarEl.classList.toggle('mobile-open');
                sidebarBackdrop?.classList.toggle('active', sidebarEl.classList.contains('mobile-open'));
            });
        }

        if (sidebarBackdrop && sidebarEl) {
            sidebarBackdrop.addEventListener('click', () => {
                sidebarEl.classList.remove('mobile-open');
                sidebarBackdrop.classList.remove('active');
            });
        }

        // Ward Filter Chips
        document.querySelectorAll('.filter-chip').forEach(chip => {
            chip.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.currentWardFilter = e.currentTarget.dataset.ward;
                this.renderBedGrid();
            });
        });

        // Modal Close Buttons
        document.querySelectorAll('.close-btn, .cancel-modal-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.currentTarget.closest('.modal-overlay');
                if (modal) modal.classList.remove('active');
            });
        });

        // Form Submit: Bed Allocation (Admin Assigns Doctor to Patient)
        document.getElementById('form-allocate-bed')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const bedId = document.getElementById('allocate-bed-id').value;
            const patientName = document.getElementById('allocate-patient-name').value;
            const patientAge = document.getElementById('allocate-patient-age').value;
            const condition = document.getElementById('allocate-condition').value;
            const doctorSelect = document.getElementById('allocate-doctor-select');
            const doctorName = doctorSelect ? doctorSelect.value : 'Dr. Ananya Sharma';

            const res = this.bedManager.allocateBed(bedId, { patientName, patientAge, condition, doctor: doctorName });
            
            // Notify Doctor that patient has been assigned
            this.notificationManager.sendNotification({
                recipientRole: 'doctor',
                recipientName: doctorName,
                title: '👤 New Patient Assigned',
                message: `Patient ${patientName} (${condition}) allocated to Bed ${bedId.split('-')[1]} under your care.`,
                type: 'info'
            });

            this.showToast(res.message, res.success ? 'success' : 'error');
            this.closeModal('modal-allocate-bed');
            this.renderAll();
        });

        // Form Submit: Doctor Request / Apply for Surgery
        document.getElementById('form-request-surgery')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const user = this.authManager.getCurrentUser();
            const patientSelect = document.getElementById('req-patient-select');
            const selectedOpt = patientSelect.options[patientSelect.selectedIndex];

            const reqData = {
                patientName: patientSelect.value,
                patientAge: selectedOpt ? selectedOpt.dataset.age : 35,
                condition: selectedOpt ? selectedOpt.dataset.condition : 'Pre-Op',
                surgeryType: document.getElementById('req-surgery-type').value,
                priority: document.getElementById('req-priority').value,
                estDuration: document.getElementById('req-duration').value,
                requiredWard: document.getElementById('req-ward').value,
                notes: document.getElementById('req-notes').value,
                doctorId: user ? user.doctorId || 'DOC-101' : 'DOC-101',
                doctorName: user ? user.name : 'Dr. Ananya Sharma'
            };

            const res = this.notificationManager.addSurgeryRequest(reqData);
            this.showToast(res.message, 'success');
            this.closeModal('modal-request-surgery');
            this.checkAuth();
        });

        // Form Submit: Schedule Surgery (Direct Admin Schedule)
        document.getElementById('form-schedule-surgery')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const surgeryData = {
                triageId: document.getElementById('surgery-triage-id').value,
                patientName: document.getElementById('surgery-patient-name').value,
                patientAge: document.getElementById('surgery-patient-age').value,
                surgeryType: document.getElementById('surgery-type').value,
                priority: document.getElementById('surgery-priority').value,
                orId: document.getElementById('surgery-or').value,
                surgeonId: document.getElementById('surgery-surgeon').value,
                startTime: document.getElementById('surgery-start-time').value,
                durationMinutes: document.getElementById('surgery-duration').value,
                postOpBedWard: document.getElementById('surgery-postop-ward').value,
                notes: document.getElementById('surgery-notes').value
            };

            const res = this.orScheduler.scheduleSurgery(surgeryData);
            if (res.success) {
                this.showToast(res.message, 'success');
                this.closeModal('modal-schedule-surgery');
                this.renderAll();
            } else {
                this.showToast(res.message, 'error');
            }
        });

        // Form Submit: Prescribe Medication
        document.getElementById('form-prescribe-med')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const user = this.authManager.getCurrentUser();
            const patientSelect = document.getElementById('rx-patient-name');
            const selectedOpt = patientSelect.options[patientSelect.selectedIndex];

            const rxData = {
                patientName: patientSelect.value,
                patientBedNumber: selectedOpt ? selectedOpt.dataset.bed : 'Bed 302',
                wardId: selectedOpt ? selectedOpt.dataset.ward : 'surgical',
                medicineName: document.getElementById('rx-medicine-name').value,
                category: document.getElementById('rx-category').value,
                dosage: document.getElementById('rx-dosage').value,
                frequency: document.getElementById('rx-frequency').value,
                duration: document.getElementById('rx-duration').value,
                instructions: document.getElementById('rx-instructions').value,
                doctorId: user ? user.doctorId || 'DOC-101' : 'DOC-101',
                doctorName: user ? user.name : 'Dr. Ananya Sharma'
            };

            const res = this.prescriptionManager.addPrescription(rxData);
            this.showToast(res.message, 'success');
            this.closeModal('modal-prescribe-med');

            if (user && user.role === 'doctor') {
                this.renderDoctorPortal();
            } else {
                this.renderAll();
            }
        });

        // Form Submit: Register New Doctor
        document.getElementById('form-register-doctor')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('reg-doc-name').value;
            const specialty = document.getElementById('reg-doc-specialty').value;
            const username = document.getElementById('reg-doc-username').value;

            const res = this.authManager.registerDoctor({ name, specialty, username });
            this.showToast(res.message, 'success');
            this.closeModal('modal-register-doctor');
            this.renderAll();
        });

        // Form Submit: Register New Patient
        document.getElementById('form-register-patient')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('reg-pat-name').value;
            const age = document.getElementById('reg-pat-age').value;
            const username = document.getElementById('reg-pat-username').value;
            const condition = document.getElementById('reg-pat-condition').value;

            const res = this.authManager.registerPatient({ name, age, username, condition });
            this.showToast(res.message, 'success');
            this.closeModal('modal-register-patient');
            this.renderAll();
        });

        // Form Submit: Add New Bed
        document.getElementById('form-add-bed')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const wardId = document.getElementById('add-bed-ward').value;
            const bedNumber = document.getElementById('add-bed-number').value;
            const notes = document.getElementById('add-bed-notes').value;

            const res = this.bedManager.addNewBed(wardId, bedNumber, notes);
            if (res.success) {
                this.showToast(res.message, 'success');
                this.closeModal('modal-add-bed');
                this.renderAll();
            } else {
                this.showToast(res.message, 'error');
            }
        });

        // Action Trigger Buttons for Registration Modals
        document.getElementById('btn-open-request-surgery-modal')?.addEventListener('click', () => {
            this.populateDropdowns();
            this.openModal('modal-request-surgery');
        });

        document.getElementById('btn-open-register-doctor')?.addEventListener('click', () => {
            this.openModal('modal-register-doctor');
        });

        document.getElementById('btn-open-register-patient')?.addEventListener('click', () => {
            this.openModal('modal-register-patient');
        });

        document.getElementById('btn-open-add-bed')?.addEventListener('click', () => {
            this.openModal('modal-add-bed');
        });

        document.getElementById('btn-open-schedule-modal')?.addEventListener('click', () => {
            document.getElementById('surgery-triage-id').value = '';
            this.openModal('modal-schedule-surgery');
        });

        document.getElementById('btn-open-emergency-modal')?.addEventListener('click', () => {
            this.openModal('modal-add-emergency');
        });

        document.getElementById('btn-open-prescribe-modal')?.addEventListener('click', () => {
            this.populateDropdowns();
            this.openModal('modal-prescribe-med');
        });

        document.getElementById('btn-run-dsa-optimizer')?.addEventListener('click', () => {
            this.runDSAOptimization();
        });

        // Form Submit: Emergency Triage Registration (Inserts into Binary Min-Heap Priority Queue)
        document.getElementById('form-add-emergency')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const triageData = {
                patientName: document.getElementById('emg-patient-name').value,
                patientAge: document.getElementById('emg-patient-age').value,
                priority: document.getElementById('emg-priority').value,
                condition: document.getElementById('emg-condition').value,
                requiredORSpecialty: document.getElementById('emg-specialty').value,
                estDuration: document.getElementById('emg-duration').value,
                requiredBedWard: document.getElementById('emg-ward').value
            };

            const res = this.orScheduler.addEmergencyTriage(triageData);
            this.showToast(res.message, 'success');
            this.closeModal('modal-add-emergency');
            document.getElementById('form-add-emergency')?.reset();
            this.renderAll();
            this.dsaLab?.render();
        });

        // Registration Dropdown Menu Click Toggle
        const regBtn = document.getElementById('btn-registration-menu');
        const regMenu = regBtn?.nextElementSibling;
        regBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            regMenu?.classList.toggle('active');
        });
        document.addEventListener('click', () => {
            regMenu?.classList.remove('active');
        });

        // Sidebar Footer DSA Lab Shortcut
        document.getElementById('btn-sidebar-dsa-lab')?.addEventListener('click', () => {
            this.switchTab('tab-dsa-lab');
        });
    }

    showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const iconClass = type === 'error' ? 'fa-solid fa-circle-exclamation text-emergency' : 'fa-solid fa-circle-check text-success';
        toast.innerHTML = `
            <i class="${iconClass}"></i>
            <span>${escapeHTML(message)}</span>
        `;
        container.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 4000);
    }
}

// Robust Global App Initialization on DOM Load or Module Execution
function initApp() {
    if (!window.app) {
        window.app = new App();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
