// DSA Algorithm Lab Controller
// Provides interactive visualizers for:
// 1. Binary Min-Heap Priority Queue (Emergency Triage)
// 2. Greedy Interval Scheduling & Conflict Detection (OR Gantt Timeline)
// 3. Best-Fit Ward Bed Allocation & O(1) Direct Address Hash Lookups

import { BinaryHeapPriorityQueue } from './priorityQueue.js?v=3';
import { timeToMinutes, minutesToTime } from './scheduler.js?v=3';
import { escapeHTML } from './data.js?v=3';

export class DSALab {
    constructor(orScheduler, bedManager) {
        this.orScheduler = orScheduler;
        this.bedManager = bedManager;
        this.activeAlgoTab = 'heap'; // 'heap', 'greedy', 'bestfit'

        // Lab Heap Instance (clone of hospital heap for safe experimentation)
        this.labHeap = new BinaryHeapPriorityQueue();
        this.initLabHeap();

        // Greedy Interval State
        this.greedyIntervals = [];
        this.initGreedyIntervals();
    }

    initLabHeap() {
        const liveTriage = this.orScheduler.getTriageQueue();
        if (liveTriage && liveTriage.length > 0) {
            this.labHeap.heapify(liveTriage);
        } else {
            this.labHeap.heapify([
                { id: 'TRG-001', patientName: 'Varun Deshmukh', patientAge: 61, condition: 'Aortic Aneurysm', priority: 1, priorityLabel: 'Emergency', requiredORSpecialty: 'Cardiothoracic', estDuration: 180 },
                { id: 'TRG-002', patientName: 'Shruti Iyer', patientAge: 27, condition: 'Acute Appendicitis', priority: 1, priorityLabel: 'Emergency', requiredORSpecialty: 'General & Trauma', estDuration: 90 },
                { id: 'TRG-003', patientName: 'Gopalakrishnan Nair', patientAge: 67, condition: 'Cervical Spondylosis', priority: 3, priorityLabel: 'Elective', requiredORSpecialty: 'Neurosurgery', estDuration: 120 },
                { id: 'TRG-004', patientName: 'Meera Rajput', patientAge: 35, condition: 'Gallbladder Stones', priority: 2, priorityLabel: 'Urgent', requiredORSpecialty: 'General & Trauma', estDuration: 75 }
            ]);
        }
    }

    initGreedyIntervals() {
        this.greedyIntervals = [
            { id: 'JOB-1', patientName: 'Rohan Sharma', surgeryType: 'Laparoscopic Cholecystectomy', start: '09:00', end: '11:00', room: 'OR-1', priority: 2 },
            { id: 'JOB-2', patientName: 'Kavita Joshi', surgeryType: 'Lumbar Microdiscectomy', start: '10:30', end: '12:30', room: 'OR-1', priority: 3 }, // overlaps with JOB-1
            { id: 'JOB-3', patientName: 'Suresh Kumar', surgeryType: 'Coronary Bypass (CABG)', start: '11:15', end: '14:30', room: 'OR-1', priority: 1 },
            { id: 'JOB-4', patientName: 'Alok Nandan', surgeryType: 'Knee Arthroplasty', start: '14:45', end: '17:00', room: 'OR-1', priority: 3 },
            { id: 'JOB-5', patientName: 'Preeti Saxena', surgeryType: 'Hernia Repair', start: '15:30', end: '17:30', room: 'OR-1', priority: 2 }  // overlaps with JOB-4
        ];
    }

    render() {
        const container = document.getElementById('dsa-lab-container');
        if (!container) return;

        container.innerHTML = `
            <!-- DSA Lab Top Tabs -->
            <div class="dsa-lab-nav">
                <button class="dsa-lab-tab-btn ${this.activeAlgoTab === 'heap' ? 'active' : ''}" data-lab-tab="heap">
                    <i class="fa-solid fa-sitemap"></i>
                    <span>1. Binary Min-Heap Priority Queue</span>
                    <span class="dsa-badge">Triage</span>
                </button>
                <button class="dsa-lab-tab-btn ${this.activeAlgoTab === 'greedy' ? 'active' : ''}" data-lab-tab="greedy">
                    <i class="fa-solid fa-chart-gantt"></i>
                    <span>2. Greedy Interval Scheduling (EFT)</span>
                    <span class="dsa-badge">OR Gantt</span>
                </button>
                <button class="dsa-lab-tab-btn ${this.activeAlgoTab === 'bestfit' ? 'active' : ''}" data-lab-tab="bestfit">
                    <i class="fa-solid fa-bed"></i>
                    <span>3. Best-Fit Bed Allocation & Hash Map</span>
                    <span class="dsa-badge">Ward Match</span>
                </button>
            </div>

            <!-- Content Panel -->
            <div class="dsa-lab-content" id="dsa-lab-active-view">
                ${this.renderActiveView()}
            </div>
        `;

        this.bindEvents();
    }

    renderActiveView() {
        if (this.activeAlgoTab === 'heap') {
            return this.renderHeapView();
        } else if (this.activeAlgoTab === 'greedy') {
            return this.renderGreedyView();
        } else if (this.activeAlgoTab === 'bestfit') {
            return this.renderBestFitView();
        }
        return '';
    }

    /* =========================================================================
       1. BINARY MIN-HEAP PRIORITY QUEUE VIEW
       ========================================================================= */
    renderHeapView() {
        const heapItems = this.labHeap.toArray();
        const root = this.labHeap.peek();
        const logs = this.labHeap.traceLogs;

        return `
            <!-- Algorithm Metadata Banner -->
            <div class="algo-meta-banner">
                <div class="d-flex justify-content-between align-items-center flex-wrap gap-3">
                    <div>
                        <div class="d-flex align-items-center gap-2">
                            <span class="algo-type-tag">DATA STRUCTURE: COMPLETE BINARY TREE</span>
                            <span class="algo-urgency-tag"><i class="fa-solid fa-heart-pulse"></i> Clinical Priority Engine</span>
                        </div>
                        <h2 class="algo-title mt-1">Binary Min-Heap Emergency Triage Priority Queue</h2>
                        <p class="algo-desc">
                            In a critical emergency department, arriving patients cannot be treated strictly first-come, first-served (FIFO). 
                            A <strong>Binary Min-Heap</strong> organizes clinical urgencies such that the most critical life-threatening case 
                            (Priority 1: Emergency) always bubbles up to the <strong>Root Node ($Index = 0$)</strong> in $O(\\log N)$ time, 
                            guaranteeing instant $O(1)$ next-patient access.
                        </p>
                    </div>

                    <!-- Big-O Badges -->
                    <div class="dsa-complexity-grid">
                        <div class="complexity-pill">
                            <span class="pill-label">Insert (Bubble Up)</span>
                            <span class="pill-value text-success">O(log N)</span>
                        </div>
                        <div class="complexity-pill">
                            <span class="pill-label">Extract-Min (Sink Down)</span>
                            <span class="pill-value text-success">O(log N)</span>
                        </div>
                        <div class="complexity-pill">
                            <span class="pill-label">Peek Top Emergency</span>
                            <span class="pill-value text-primary">O(1)</span>
                        </div>
                        <div class="complexity-pill">
                            <span class="pill-label">Auxiliary Space</span>
                            <span class="pill-value text-violet">O(1)</span>
                        </div>
                    </div>
                </div>

                <!-- College Student Explanation Box -->
                <div class="student-guide-box mt-3">
                    <i class="fa-solid fa-graduation-cap text-violet font-lg"></i>
                    <div>
                        <strong>College DSA Concept — Array Implementation of Complete Binary Tree:</strong>
                        <p class="text-xs text-secondary mt-1">
                            For any element at index <code>i</code>: 
                            Parent Index = <code>⌊(i - 1) / 2⌋</code> | 
                            Left Child = <code>2i + 1</code> | 
                            Right Child = <code>2i + 2</code>. 
                            Min-Heap Property: <code>Priority(Parent) ≤ Priority(Children)</code>. 
                            Tie-breaking: When priorities match, earlier arrival timestamp wins (FIFO).
                        </p>
                    </div>
                </div>
            </div>

            <!-- Interactive Control Bar -->
            <div class="algo-action-toolbar">
                <div class="d-flex gap-2 flex-wrap">
                    <button class="btn btn-primary" id="btn-lab-extract-min">
                        <i class="fa-solid fa-hand-holding-medical"></i> Extract-Min (Treat Root Emergency)
                    </button>
                    <button class="btn btn-secondary" id="btn-lab-insert-sample">
                        <i class="fa-solid fa-plus"></i> + Insert Random Emergency Case
                    </button>
                    <button class="btn btn-secondary" id="btn-lab-heapify-sample">
                        <i class="fa-solid fa-layer-group"></i> Run O(N) Bottom-Up Heapify
                    </button>
                    <button class="btn btn-secondary" id="btn-lab-reset-heap">
                        <i class="fa-solid fa-rotate-left"></i> Sync with Live Hospital Triage
                    </button>
                </div>

                <!-- Custom Case Quick Input Drawer -->
                <div class="d-flex align-items-center gap-2 mt-2">
                    <input type="text" class="form-control" id="lab-custom-patient" placeholder="Patient Name (e.g. Rahul Sen)" style="max-width: 180px;">
                    <select class="form-control" id="lab-custom-priority" style="max-width: 140px;">
                        <option value="1">P1 - Emergency</option>
                        <option value="2" selected>P2 - Urgent</option>
                        <option value="3">P3 - Elective</option>
                    </select>
                    <input type="text" class="form-control" id="lab-custom-condition" placeholder="Clinical Diagnosis" style="max-width: 200px;">
                    <button class="btn btn-success btn-xs" id="btn-lab-insert-custom">
                        <i class="fa-solid fa-user-plus"></i> Insert into Heap
                    </button>
                </div>
            </div>

            <!-- Visualization Workspace -->
            <div class="dsa-viz-grid">
                <!-- Dual Viz: Tree & Array -->
                <div class="viz-card">
                    <div class="viz-card-header">
                        <h4 class="font-bold text-white"><i class="fa-solid fa-sitemap text-primary"></i> Complete Binary Tree Representation</h4>
                        <span class="text-xs text-muted">Heap Size: ${heapItems.length} Nodes</span>
                    </div>

                    <!-- Tree Container -->
                    <div class="heap-tree-canvas" id="heap-tree-canvas">
                        ${this.renderHeapTreeNodes(heapItems)}
                    </div>

                    <!-- Array / Contiguous Memory Representation -->
                    <div class="viz-card-header mt-4">
                        <h4 class="font-bold text-white"><i class="fa-solid fa-memory text-accent-teal"></i> Contiguous Memory Buffer (Array Layout)</h4>
                        <span class="text-xs text-muted">Zero-Indexed Heap Buffer</span>
                    </div>
                    <div class="heap-array-strip" id="heap-array-strip">
                        ${this.renderHeapArrayStrip(heapItems)}
                    </div>
                </div>

                <!-- Live Algorithmic Execution Trace Console -->
                <div class="viz-card">
                    <div class="viz-card-header">
                        <h4 class="font-bold text-white"><i class="fa-solid fa-terminal text-success"></i> Step-by-Step DSA Decision Trace</h4>
                        <button class="btn btn-xs btn-secondary" id="btn-clear-lab-logs">Clear Log</button>
                    </div>
                    
                    <div class="dsa-trace-terminal" id="heap-trace-terminal">
                        ${logs.length === 0 ? `
                            <div class="text-muted text-xs">// Ready. Click "Extract-Min" or "Insert" above to view live bubble-up/sink-down swaps.</div>
                        ` : logs.map(l => `<div>${l}</div>`).join('')}
                    </div>

                    <!-- Peek Card -->
                    <div class="root-peek-card mt-3">
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="text-xs uppercase font-bold text-muted">Root Node [Index 0] — O(1) Next Patient Up</span>
                            <span class="status-badge ${root ? (root.priority === 1 ? 'occupied' : 'reserved') : 'available'}">
                                ${root ? `P${root.priority} ${root.priorityLabel}` : 'Empty'}
                            </span>
                        </div>
                        ${root ? `
                            <div class="font-bold text-lg text-white mt-1">${escapeHTML(root.patientName)} (${escapeHTML(root.patientAge || '35')}y)</div>
                            <div class="text-xs text-secondary"><i class="fa-solid fa-notes-medical"></i> Condition: ${escapeHTML(root.condition)}</div>
                            <div class="text-xs text-muted mt-1"><i class="fa-solid fa-hospital"></i> Required Specialty: ${escapeHTML(root.requiredORSpecialty || 'General & Trauma')}</div>
                        ` : `<div class="text-muted text-xs mt-1">Heap is currently empty.</div>`}
                    </div>
                </div>
            </div>
        `;
    }

    renderHeapTreeNodes(items) {
        if (!items || items.length === 0) {
            return `<div class="p-4 text-center text-muted">Heap is empty. Insert a patient to generate the binary tree.</div>`;
        }

        // Group by levels (Level 0: 1 node, Level 1: 2 nodes, Level 2: 4 nodes...)
        const levels = [];
        let currentIdx = 0;
        let levelNum = 0;

        while (currentIdx < items.length) {
            const countInLevel = Math.pow(2, levelNum);
            const levelNodes = [];
            for (let i = 0; i < countInLevel && currentIdx < items.length; i++) {
                levelNodes.push({ index: currentIdx, item: items[currentIdx] });
                currentIdx++;
            }
            levels.push(levelNodes);
            levelNum++;
        }

        return `
            <div class="heap-tree-levels">
                ${levels.map((lvl, lIdx) => `
                    <div class="heap-tree-level" data-level="${lIdx}">
                        <div class="level-indicator">L${lIdx}</div>
                        <div class="level-nodes-row">
                            ${lvl.map(node => `
                                <div class="heap-node priority-${node.item.priority}" id="heap-node-${node.index}">
                                    <div class="node-idx">[${node.index}]</div>
                                    <div class="node-priority">P${node.item.priority}</div>
                                    <div class="node-name">${escapeHTML((node.item.patientName || 'Patient').split(' ')[0])}</div>
                                    <div class="node-cond">${escapeHTML((node.item.condition || '').substring(0, 16))}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderHeapArrayStrip(items) {
        if (!items || items.length === 0) {
            return `<div class="text-muted text-xs">Array buffer is empty.</div>`;
        }

        return items.map((item, index) => {
            const parentIdx = index === 0 ? '-' : Math.floor((index - 1) / 2);
            return `
                <div class="array-cell priority-${item.priority}">
                    <div class="array-idx">[${index}]</div>
                    <div class="array-val font-bold">P${item.priority}</div>
                    <div class="array-name">${escapeHTML((item.patientName || 'Patient').split(' ')[0])}</div>
                    <div class="array-meta">P:${parentIdx}</div>
                </div>
            `;
        }).join('');
    }

    /* =========================================================================
       2. GREEDY INTERVAL SCHEDULING (EARLIEST FINISH TIME) VIEW
       ========================================================================= */
    renderGreedyView() {
        // Run greedy EFT algorithm on test intervals
        const trace = this.runGreedyEFT(this.greedyIntervals);

        return `
            <!-- Algorithm Metadata Banner -->
            <div class="algo-meta-banner">
                <div class="d-flex justify-content-between align-items-center flex-wrap gap-3">
                    <div>
                        <div class="d-flex align-items-center gap-2">
                            <span class="algo-type-tag">ALGORITHM: GREEDY PARADIGM</span>
                            <span class="algo-urgency-tag"><i class="fa-solid fa-calendar-check"></i> Operating Room Optimization</span>
                        </div>
                        <h2 class="algo-title mt-1">Greedy Interval Scheduling & Conflict Detection (EFT)</h2>
                        <p class="algo-desc">
                            Operating rooms are finite, high-cost hospital assets. Given a set of overlapping surgery requests 
                            $S = \\{[s_1, e_1], [s_2, e_2], \\dots, [s_n, e_n]\\}$, the <strong>Greedy Earliest Finish Time (EFT)</strong> 
                            algorithm computes a maximum-cardinality subset of mutually compatible, non-overlapping surgical intervals 
                            in $O(N \\log N)$ time.
                        </p>
                    </div>

                    <!-- Big-O Badges -->
                    <div class="dsa-complexity-grid">
                        <div class="complexity-pill">
                            <span class="pill-label">Sorting Phase</span>
                            <span class="pill-value text-success">O(N log N)</span>
                        </div>
                        <div class="complexity-pill">
                            <span class="pill-label">Linear Greedy Scan</span>
                            <span class="pill-value text-success">O(N)</span>
                        </div>
                        <div class="complexity-pill">
                            <span class="pill-label">Total Time Complexity</span>
                            <span class="pill-value text-primary">O(N log N)</span>
                        </div>
                        <div class="complexity-pill">
                            <span class="pill-label">Auxiliary Space</span>
                            <span class="pill-value text-violet">O(1)</span>
                        </div>
                    </div>
                </div>

                <!-- College Student Explanation Box -->
                <div class="student-guide-box mt-3">
                    <i class="fa-solid fa-graduation-cap text-violet font-lg"></i>
                    <div>
                        <strong>College DSA Proof of Optimality (Greedy Stays Ahead):</strong>
                        <p class="text-xs text-secondary mt-1">
                            By selecting the surgery with the <strong>Earliest Finish Time</strong> that starts after the previous surgery finishes (+ 15-minute cleaning buffer), 
                            we leave the maximum possible remaining time for subsequent surgeries. Mathematical induction proves that no other strategy 
                            can schedule more compatible surgical procedures.
                        </p>
                    </div>
                </div>
            </div>

            <!-- Interactive Action Bar -->
            <div class="algo-action-toolbar">
                <div class="d-flex gap-2 flex-wrap">
                    <button class="btn btn-primary" id="btn-run-greedy-simulation">
                        <i class="fa-solid fa-play"></i> Re-Run Greedy Scheduling Engine
                    </button>
                    <button class="btn btn-secondary" id="btn-load-hospital-surgeries">
                        <i class="fa-solid fa-download"></i> Load Live Hospital Surgeries
                    </button>
                    <button class="btn btn-secondary" id="btn-reset-greedy-samples">
                        <i class="fa-solid fa-rotate-left"></i> Reset Sample Dataset
                    </button>
                </div>
            </div>

            <!-- Visualization Grid -->
            <div class="dsa-viz-grid">
                <!-- Interval Timeline & Candidate Table -->
                <div class="viz-card">
                    <div class="viz-card-header">
                        <h4 class="font-bold text-white"><i class="fa-solid fa-list-check text-primary"></i> Surgical Interval Candidates & Greedy Verdict</h4>
                        <span class="text-xs text-muted">Turnaround Buffer: 15 Mins</span>
                    </div>

                    <!-- Intervals Table -->
                    <table class="pharmacy-table mb-4">
                        <thead>
                            <tr>
                                <th>Task ID</th>
                                <th>Patient & Procedure</th>
                                <th>Time Interval</th>
                                <th>Duration</th>
                                <th>Finish Time</th>
                                <th>Greedy Verdict</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${trace.sortedCandidates.map(c => `
                                <tr style="background: ${c.accepted ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)'};">
                                    <td><strong class="text-white">${c.id}</strong></td>
                                    <td>
                                        <div class="font-bold text-white">${c.patientName}</div>
                                        <div class="text-xs text-muted">${c.surgeryType}</div>
                                    </td>
                                    <td><code>${c.start} - ${c.end}</code></td>
                                    <td>${c.duration} mins</td>
                                    <td><span class="text-primary font-bold">${c.end}</span></td>
                                    <td>
                                        ${c.accepted ?
                `<span class="status-badge available"><i class="fa-solid fa-circle-check"></i> SCHEDULED</span>` :
                `<span class="status-badge occupied"><i class="fa-solid fa-triangle-exclamation"></i> CONFLICT (REJECTED)</span>`
            }
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>

                    <!-- Visual Gantt Timeline -->
                    <div class="viz-card-header">
                        <h4 class="font-bold text-white"><i class="fa-solid fa-timeline text-accent-teal"></i> Visual Interval Timeline (09:00 - 18:00)</h4>
                    </div>

                    <div class="greedy-timeline-track">
                        ${this.renderGreedyTimelineBars(trace.sortedCandidates)}
                    </div>
                </div>

                <!-- Step-by-Step Decision Trace Console -->
                <div class="viz-card">
                    <div class="viz-card-header">
                        <h4 class="font-bold text-white"><i class="fa-solid fa-terminal text-success"></i> Greedy Execution Decision Log</h4>
                        <span class="status-badge available">${trace.acceptedCount} / ${trace.sortedCandidates.length} Accepted</span>
                    </div>

                    <div class="dsa-trace-terminal" id="greedy-trace-terminal">
                        ${trace.logs.map(l => `<div>${l}</div>`).join('')}
                    </div>

                    <!-- Summary Outcome Card -->
                    <div class="root-peek-card mt-3">
                        <div class="font-bold text-white mb-1"><i class="fa-solid fa-square-check text-success"></i> Optimal Conflict-Free Output:</div>
                        <p class="text-xs text-secondary">
                            The Greedy EFT algorithm accepted <strong>${trace.acceptedCount}</strong> surgeries and eliminated <strong>${trace.rejectedCount}</strong> overlapping booking collisions with mathematical optimality.
                        </p>
                    </div>
                </div>
            </div>
        `;
    }

    runGreedyEFT(intervals) {
        const logs = [];
        logs.push('🚀 Initiating Greedy Interval Scheduling Engine...');
        logs.push(`[1] Received ${intervals.length} candidate surgical interval requests.`);

        // Step 1: Calculate minutes and sort by Finish Time (EFT)
        const candidates = intervals.map(item => {
            const startMin = timeToMinutes(item.start);
            const endMin = timeToMinutes(item.end);
            return {
                ...item,
                startMin,
                endMin,
                duration: endMin - startMin
            };
        });

        logs.push('[2] Sorting intervals by Earliest Finish Time (EFT) in ascending order. Time: O(N log N).');
        candidates.sort((a, b) => a.endMin - b.endMin);

        candidates.forEach((c, idx) => {
            logs.push(`   (${idx + 1}) ${c.patientName}: [${c.start} - ${c.end}] finishes at ${c.end}`);
        });

        // Step 2: Greedy Scan
        logs.push('[3] Executing Greedy Scan: Selecting first compatible interval after previous finish time.');
        const BUFFER_MINS = 15;
        let lastEndMin = -Infinity;
        let acceptedCount = 0;
        let rejectedCount = 0;

        for (const candidate of candidates) {
            // Check compatibility
            if (candidate.startMin >= lastEndMin) {
                candidate.accepted = true;
                acceptedCount++;
                logs.push(` ✅ ACCEPTED: "${candidate.patientName}" (${candidate.start} - ${candidate.end}). Starts after previous finish + buffer.`);
                lastEndMin = candidate.endMin + BUFFER_MINS;
                logs.push(`    ↳ Next available slot threshold set to: ${minutesToTime(lastEndMin)} (includes 15m cleaning).`);
            } else {
                candidate.accepted = false;
                rejectedCount++;
                logs.push(` ❌ CONFLICT DETECTED: "${candidate.patientName}" (${candidate.start} - ${candidate.end}) collides with previous booking ending at ${minutesToTime(lastEndMin - BUFFER_MINS)}. DEFERRED.`);
            }
        }

        logs.push(`✨ Greedy Interval Scheduling Complete. Optimal throughput: ${acceptedCount} non-conflicting surgeries.`);

        return {
            sortedCandidates: candidates,
            acceptedCount,
            rejectedCount,
            logs
        };
    }

    renderGreedyTimelineBars(candidates) {
        const START_HOUR_MIN = 9 * 60; // 09:00
        const TOTAL_MINS = 9 * 60; // 9 hours window (09:00 to 18:00)

        return candidates.map(c => {
            const sMin = c.startMin - START_HOUR_MIN;
            const leftPercent = Math.max(0, (sMin / TOTAL_MINS) * 100);
            const widthPercent = Math.min(100 - leftPercent, (c.duration / TOTAL_MINS) * 100);

            return `
                <div class="greedy-timeline-row">
                    <div class="row-label">${c.patientName.split(' ')[0]}</div>
                    <div class="row-bar-track">
                        <div class="greedy-bar ${c.accepted ? 'accepted' : 'rejected'}"
                             style="left: ${leftPercent}%; width: ${widthPercent}%;"
                             title="${c.patientName}: ${c.start} - ${c.end} (${c.accepted ? 'ACCEPTED' : 'CONFLICT'})">
                            <span>${c.surgeryType.substring(0, 16)} (${c.start}-${c.end})</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    /* =========================================================================
       3. BEST-FIT WARD BED ALLOCATION & HASH MAP VIEW
       ========================================================================= */
    renderBestFitView() {
        const beds = this.bedManager.getAllBeds();
        const wards = this.bedManager.wards;
        const metrics = this.bedManager.getMetrics();

        return `
            <!-- Algorithm Metadata Banner -->
            <div class="algo-meta-banner">
                <div class="d-flex justify-content-between align-items-center flex-wrap gap-3">
                    <div>
                        <div class="d-flex align-items-center gap-2">
                            <span class="algo-type-tag">DATA STRUCTURE: HASH TABLE & GREEDY BEST-FIT</span>
                            <span class="algo-urgency-tag"><i class="fa-solid fa-bed"></i> Inpatient Ward Allocation</span>
                        </div>
                        <h2 class="algo-title mt-1">Direct Address Hash Table & Best-Fit Bed Allocation</h2>
                        <p class="algo-desc">
                            Hospital beds require instant lookup by identifier (e.g. <code>ICU-101</code>) and fast categorization 
                            by medical ward. MedSchedule implements a <strong>Direct Address Hash Map</strong> for constant $O(1)$ bed lookup 
                            coupled with a <strong>Greedy Best-Fit Algorithm</strong> that places incoming post-op patients into the most clinically 
                            appropriate ward (ICU for trauma/cardiac, CCU for post-angioplasty, Surgical for orthopedic recovery).
                        </p>
                    </div>

                    <!-- Big-O Badges -->
                    <div class="dsa-complexity-grid">
                        <div class="complexity-pill">
                            <span class="pill-label">Bed Search (Key Hash)</span>
                            <span class="pill-value text-success">O(1)</span>
                        </div>
                        <div class="complexity-pill">
                            <span class="pill-label">Ward Filtering</span>
                            <span class="pill-value text-success">O(K)</span>
                        </div>
                        <div class="complexity-pill">
                            <span class="pill-label">Best-Fit Selection</span>
                            <span class="pill-value text-primary">O(1) amortized</span>
                        </div>
                        <div class="complexity-pill">
                            <span class="pill-label">Space Complexity</span>
                            <span class="pill-value text-violet">O(N)</span>
                        </div>
                    </div>
                </div>

                <!-- College Student Explanation Box -->
                <div class="student-guide-box mt-3">
                    <i class="fa-solid fa-graduation-cap text-violet font-lg"></i>
                    <div>
                        <strong>College DSA Concept — Hash Map Direct Indexing:</strong>
                        <p class="text-xs text-secondary mt-1">
                            Using key-value pairs <code>BedsMap[bedId] = BedRecord</code> eliminates linear $O(N)$ scanning across the hospital's hundreds of beds. 
                            When an emergency patient arrives, the Best-Fit solver queries the specific target ward bucket in $O(1)$ and extracts the first vacant sanitized berth.
                        </p>
                    </div>
                </div>
            </div>

            <!-- Ward Bucket Overview Cards -->
            <div class="metrics-grid mt-4">
                ${metrics.wardStats.map(w => `
                    <div class="stat-card">
                        <div class="stat-icon" style="background: rgba(59, 130, 246, 0.15); color: ${w.color || '#3b82f6'};">
                            <i class="fa-solid ${w.icon || 'fa-bed'}"></i>
                        </div>
                        <div class="stat-info">
                            <div class="stat-value">${w.availableCount} / ${w.total}</div>
                            <div class="stat-label">${w.name} (Vacant)</div>
                            <div class="text-xs text-muted mt-1">Occupancy: ${w.rate}%</div>
                        </div>
                    </div>
                `).join('')}
            </div>

            <!-- Direct Address Hash Lookup Simulator -->
            <div class="dsa-viz-grid mt-4">
                <div class="viz-card">
                    <div class="viz-card-header">
                        <h4 class="font-bold text-white"><i class="fa-solid fa-magnifying-glass text-primary"></i> O(1) Direct Hash Key Lookup Tester</h4>
                    </div>

                    <div class="d-flex gap-2 mt-2">
                        <input type="text" class="form-control" id="lab-hash-search-key" placeholder="Enter Bed Key (e.g. ICU-101, SUR-302)" style="max-width: 280px;">
                        <button class="btn btn-primary" id="btn-lab-hash-lookup">
                            <i class="fa-solid fa-bolt"></i> O(1) Hash Query
                        </button>
                    </div>

                    <div id="lab-hash-result-box" class="mt-3">
                        <div class="text-muted text-xs p-2">Enter a Bed Identifier above to test constant-time retrieval.</div>
                    </div>
                </div>

                <div class="viz-card">
                    <div class="viz-card-header">
                        <h4 class="font-bold text-white"><i class="fa-solid fa-sliders text-success"></i> Greedy Best-Fit Ward Matching Test</h4>
                    </div>

                    <p class="text-xs text-secondary mb-2">Simulate incoming patient condition to find best-fit vacant bed:</p>
                    <div class="d-flex gap-2 flex-wrap">
                        <button class="btn btn-xs btn-secondary bestfit-test-btn" data-ward="icu" data-condition="Severe Trauma CABG">
                            <i class="fa-solid fa-heart-pulse text-emergency"></i> Test Critical (ICU)
                        </button>
                        <button class="btn btn-xs btn-secondary bestfit-test-btn" data-ward="cardiac" data-condition="Angioplasty Post-Op">
                            <i class="fa-solid fa-heart-circle-bolt text-violet"></i> Test Cardiac (CCU)
                        </button>
                        <button class="btn btn-xs btn-secondary bestfit-test-btn" data-ward="surgical" data-condition="Hip Replacement">
                            <i class="fa-solid fa-bed-pulse text-primary"></i> Test Surgical
                        </button>
                        <button class="btn btn-xs btn-secondary bestfit-test-btn" data-ward="general" data-condition="Pneumonia Observation">
                            <i class="fa-solid fa-hospital-user text-success"></i> Test General Ward
                        </button>
                    </div>

                    <div id="lab-bestfit-result-box" class="mt-3">
                        <div class="text-muted text-xs p-2">Click a condition scenario above to run the Best-Fit matching solver.</div>
                    </div>
                </div>
            </div>
        `;
    }

    /* =========================================================================
       EVENT BINDING & INTERACTIVE CONTROLLERS
       ========================================================================= */
    bindEvents() {
        // Tab switching within Lab
        document.querySelectorAll('.dsa-lab-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.activeAlgoTab = e.currentTarget.dataset.labTab;
                this.render();
            });
        });

        // Heap View Buttons
        document.getElementById('btn-lab-extract-min')?.addEventListener('click', () => {
            const res = this.labHeap.extractMin();
            if (res && res.extracted) {
                window.app?.showToast(`Extracted Root Emergency: ${res.extracted.patientName} (P${res.extracted.priority})`, 'success');
            } else {
                window.app?.showToast('Heap is already empty!', 'error');
            }
            this.render();
        });

        document.getElementById('btn-lab-insert-sample')?.addEventListener('click', () => {
            const samples = [
                { patientName: 'Deepak Chopra', patientAge: 58, condition: 'Acute Myocardial Infarction', priority: 1, priorityLabel: 'Emergency', requiredORSpecialty: 'Cardiothoracic' },
                { patientName: 'Nandini Das', patientAge: 31, condition: 'Open Femur Fracture', priority: 1, priorityLabel: 'Emergency', requiredORSpecialty: 'General & Trauma' },
                { patientName: 'Manoj Bajpayee', patientAge: 49, condition: 'Hernia Strangulation', priority: 2, priorityLabel: 'Urgent', requiredORSpecialty: 'General & Trauma' },
                { patientName: 'Tanvi Shah', patientAge: 24, condition: 'Tonsillectomy', priority: 3, priorityLabel: 'Elective', requiredORSpecialty: 'General & Trauma' }
            ];
            const pick = samples[Math.floor(Math.random() * samples.length)];
            const res = this.labHeap.insert({
                ...pick,
                id: `TRG-LAB-${Math.floor(100 + Math.random() * 900)}`
            });
            window.app?.showToast(`Inserted "${pick.patientName}" (P${pick.priority}) into Binary Heap!`, 'success');
            this.render();
        });

        document.getElementById('btn-lab-insert-custom')?.addEventListener('click', () => {
            const name = document.getElementById('lab-custom-patient').value.trim();
            const priority = parseInt(document.getElementById('lab-custom-priority').value);
            const condition = document.getElementById('lab-custom-condition').value.trim() || 'Acute Triage';

            if (!name) {
                window.app?.showToast('Please enter a patient name.', 'error');
                return;
            }

            const priorityLabels = { 1: 'Emergency', 2: 'Urgent', 3: 'Elective' };
            this.labHeap.insert({
                id: `TRG-LAB-${Math.floor(100 + Math.random() * 900)}`,
                patientName: name,
                patientAge: 40,
                priority,
                priorityLabel: priorityLabels[priority],
                condition,
                requiredORSpecialty: 'General & Trauma'
            });

            window.app?.showToast(`Inserted custom patient "${name}" (P${priority})!`, 'success');
            this.render();
        });

        document.getElementById('btn-lab-heapify-sample')?.addEventListener('click', () => {
            const sampleArray = [
                { id: 'T1', patientName: 'Ramesh', priority: 3, priorityLabel: 'Elective', condition: 'Knee Scope' },
                { id: 'T2', patientName: 'Suresh', priority: 1, priorityLabel: 'Emergency', condition: 'Severe Trauma' },
                { id: 'T3', patientName: 'Mahesh', priority: 2, priorityLabel: 'Urgent', condition: 'Appendicitis' },
                { id: 'T4', patientName: 'Ganesh', priority: 1, priorityLabel: 'Emergency', condition: 'Internal Bleeding' },
                { id: 'T5', patientName: 'Naresh', priority: 3, priorityLabel: 'Elective', condition: 'Septoplasty' }
            ];
            this.labHeap.heapify(sampleArray);
            window.app?.showToast('Executed O(N) Bottom-Up Heapify on 5 test cases!', 'success');
            this.render();
        });

        document.getElementById('btn-lab-reset-heap')?.addEventListener('click', () => {
            this.initLabHeap();
            window.app?.showToast('Synchronized lab heap with live hospital triage data.', 'success');
            this.render();
        });

        document.getElementById('btn-clear-lab-logs')?.addEventListener('click', () => {
            this.labHeap.clearLogs();
            this.render();
        });

        // Greedy View Buttons
        document.getElementById('btn-run-greedy-simulation')?.addEventListener('click', () => {
            this.render();
            window.app?.showToast('Greedy Interval Scheduling Engine re-computed!', 'success');
        });

        document.getElementById('btn-load-hospital-surgeries')?.addEventListener('click', () => {
            const current = this.orScheduler.getAllSurgeries();
            if (current.length > 0) {
                this.greedyIntervals = current.map((s, idx) => ({
                    id: s.id,
                    patientName: s.patientName,
                    surgeryType: s.surgeryType,
                    start: s.startTime,
                    end: s.endTime,
                    room: s.orId,
                    priority: s.priority
                }));
                window.app?.showToast(`Loaded ${current.length} live surgeries into Greedy EFT visualizer.`, 'success');
            } else {
                window.app?.showToast('No active surgeries in hospital schedule.', 'error');
            }
            this.render();
        });

        document.getElementById('btn-reset-greedy-samples')?.addEventListener('click', () => {
            this.initGreedyIntervals();
            window.app?.showToast('Reset to default interval conflicts sample set.', 'success');
            this.render();
        });

        // Best-Fit Hash Search
        document.getElementById('btn-lab-hash-lookup')?.addEventListener('click', () => {
            const key = document.getElementById('lab-hash-search-key').value.trim().toUpperCase();
            const resultBox = document.getElementById('lab-hash-result-box');
            if (!key) return;

            const bed = this.bedManager.getBedById(key) || this.bedManager.getAllBeds().find(b => b.bedNumber === key || b.id.includes(key));
            if (bed) {
                const ward = this.bedManager.wards.find(w => w.id === bed.wardId);
                resultBox.innerHTML = `
                    <div class="hero-card p-3" style="border-color: #10b981; background: rgba(16, 185, 129, 0.1);">
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="text-xs text-success font-bold"><i class="fa-solid fa-check"></i> O(1) HASH HIT FOUND</span>
                            <span class="status-badge ${escapeHTML(bed.status)}">${escapeHTML(bed.status)}</span>
                        </div>
                        <div class="font-bold text-lg text-white mt-1">Bed ${escapeHTML(bed.bedNumber)} (${escapeHTML(bed.id)})</div>
                        <div class="text-xs text-secondary">Ward: <strong>${escapeHTML(ward ? ward.name : bed.wardId)}</strong></div>
                        <div class="text-xs text-muted mt-1">Patient: ${escapeHTML(bed.patientName || 'Vacant / Ready')}</div>
                    </div>
                `;
            } else {
                resultBox.innerHTML = `
                    <div class="hero-card p-3" style="border-color: #ef4444; background: rgba(239, 68, 68, 0.1);">
                        <div class="text-xs text-emergency font-bold"><i class="fa-solid fa-xmark"></i> O(1) HASH MISS — Bed "${escapeHTML(key)}" Not Found</div>
                    </div>
                `;
            }
        });

        // Best-Fit Test Buttons
        document.querySelectorAll('.bestfit-test-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const wardId = e.currentTarget.dataset.ward;
                const condition = e.currentTarget.dataset.condition;
                const resultBox = document.getElementById('lab-bestfit-result-box');

                const availInWard = this.bedManager.getAvailableBeds(wardId);
                const ward = this.bedManager.wards.find(w => w.id === wardId);

                if (availInWard.length > 0) {
                    const chosen = availInWard[0];
                    resultBox.innerHTML = `
                        <div class="hero-card p-3" style="border-color: #3b82f6; background: rgba(59, 130, 246, 0.1);">
                            <div class="text-xs text-primary font-bold"><i class="fa-solid fa-circle-check"></i> BEST-FIT MATCH SUCCEEDED</div>
                            <div class="font-bold text-white mt-1">Matched to: Bed ${escapeHTML(chosen.bedNumber)} in ${escapeHTML(ward ? ward.name : wardId)}</div>
                            <div class="text-xs text-muted mt-1">Condition "${escapeHTML(condition)}" successfully paired with highest compatibility ward.</div>
                        </div>
                    `;
                } else {
                    const fallbackAvail = this.bedManager.getAvailableBeds();
                    if (fallbackAvail.length > 0) {
                        const fallback = fallbackAvail[0];
                        resultBox.innerHTML = `
                            <div class="hero-card p-3" style="border-color: #f59e0b; background: rgba(245, 158, 11, 0.1);">
                                <div class="text-xs text-warning font-bold"><i class="fa-solid fa-triangle-exclamation"></i> PRIMARY WARD FULL — GREEDY FALLBACK ACTIVATED</div>
                                <div class="font-bold text-white mt-1">Re-routed to: Bed ${escapeHTML(fallback.bedNumber)} in ${escapeHTML(fallback.wardId.toUpperCase())}</div>
                                <div class="text-xs text-muted mt-1">Primary ward "${escapeHTML(wardId)}" at 100% capacity; allocated closest alternate bed.</div>
                            </div>
                        `;
                    } else {
                        resultBox.innerHTML = `
                            <div class="hero-card p-3" style="border-color: #ef4444; background: rgba(239, 68, 68, 0.1);">
                                <div class="text-xs text-emergency font-bold"><i class="fa-solid fa-triangle-exclamation"></i> CRITICAL: 100% HOSPITAL BED CAPACITY REACHED</div>
                            </div>
                        `;
                    }
                }
            });
        });
    }
}
