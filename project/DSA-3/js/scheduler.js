// OR Scheduler & Conflict Checking Engine

import { INITIAL_OPERATING_ROOMS, INITIAL_SURGERIES, INITIAL_TRIAGE_WAITING, DOCTORS } from './data.js?v=2';
import { BinaryHeapPriorityQueue } from './priorityQueue.js?v=2';

export function timeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
}

export function minutesToTime(totalMinutes) {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export class ORScheduler {
    constructor(bedManager) {
        this.bedManager = bedManager;
        this.operatingRooms = INITIAL_OPERATING_ROOMS;
        this.doctors = DOCTORS;
        this.surgeries = JSON.parse(localStorage.getItem('hospital_surgeries')) || INITIAL_SURGERIES;
        
        // Phase 3: Binary Min-Heap Priority Queue for Emergency Triage
        this.triageHeap = new BinaryHeapPriorityQueue();
        const rawTriage = JSON.parse(localStorage.getItem('hospital_triage')) || INITIAL_TRIAGE_WAITING;
        this.triageHeap.heapify(rawTriage);

        this.save();
    }

    save() {
        localStorage.setItem('hospital_surgeries', JSON.stringify(this.surgeries));
        localStorage.setItem('hospital_triage', JSON.stringify(this.triageHeap.toArray()));
    }

    getAllSurgeries() {
        return this.surgeries;
    }

    getOperatingRooms() {
        return this.operatingRooms;
    }

    getDoctors() {
        return this.doctors;
    }

    getDoctorById(docId) {
        return this.doctors.find(d => d.id === docId);
    }

    /**
     * Returns triage queue sorted in strict priority order (P1 > P2 > P3, tie-broken by arrival)
     */
    getTriageQueue() {
        return this.triageHeap.toSortedArray();
    }

    /**
     * Returns raw binary heap instance for inspection and visualizer
     */
    getTriageHeap() {
        return this.triageHeap;
    }

    /**
     * DSA Interval Overlap check
     * Returns conflict object if overlap detected, or null if clean.
     */
    checkConflicts(orId, surgeonId, startTimeStr, endTimeStr, ignoreSurgeryId = null) {
        const newStart = timeToMinutes(startTimeStr);
        const newEnd = timeToMinutes(endTimeStr);
        const buffer = 15; // 15-minute preparation/cleaning buffer between surgeries

        const activeSurgeries = this.surgeries.filter(s => s.id !== ignoreSurgeryId && s.status !== 'Cancelled' && s.status !== 'Completed');

        for (const existing of activeSurgeries) {
            const exStart = timeToMinutes(existing.startTime);
            const exEnd = timeToMinutes(existing.endTime) + buffer; // add turnaround buffer

            // Check if intervals overlap [newStart, newEnd] and [exStart, exEnd]
            const isOverlap = (newStart < exEnd) && (newEnd > exStart);

            if (isOverlap) {
                // 1. Room Double-Booking Conflict
                if (existing.orId === orId) {
                    const room = this.operatingRooms.find(r => r.id === orId);
                    return {
                        hasConflict: true,
                        type: 'OR_ROOM_DOUBLE_BOOKING',
                        message: `OR Conflict: ${room ? room.name : orId} is occupied by "${existing.patientName}" (${existing.surgeryType}) from ${existing.startTime} to ${existing.endTime}.`,
                        conflictingSurgery: existing
                    };
                }

                // 2. Surgeon Double-Booking Conflict
                if (existing.surgeonId === surgeonId) {
                    const doc = this.getDoctorById(surgeonId);
                    return {
                        hasConflict: true,
                        type: 'SURGEON_DOUBLE_BOOKING',
                        message: `Surgeon Conflict: ${doc ? doc.name : surgeonId} is already scheduled for surgery "${existing.surgeryType}" in ${existing.orId} from ${existing.startTime} to ${existing.endTime}.`,
                        conflictingSurgery: existing
                    };
                }
            }
        }

        return { hasConflict: false };
    }

    /**
     * Schedule a new surgery with automated post-op bed reservation and conflict validation
     */
    scheduleSurgery(surgeryData) {
        if (!surgeryData) {
            return { success: false, message: 'Invalid surgery submission data.' };
        }

        const { patientName, patientAge, surgeryType, priority, orId, surgeonId, startTime, durationMinutes, postOpBedWard, notes } = surgeryData;

        // 1. Required Fields Validation
        if (!patientName || !patientName.trim()) {
            return { success: false, message: 'Validation Error: Patient name is required.' };
        }
        if (!surgeryType || !surgeryType.trim()) {
            return { success: false, message: 'Validation Error: Surgery procedure name is required.' };
        }
        if (!orId) {
            return { success: false, message: 'Validation Error: Operating Room selection is required.' };
        }
        if (!surgeonId) {
            return { success: false, message: 'Validation Error: Lead Surgeon selection is required.' };
        }
        if (!postOpBedWard) {
            return { success: false, message: 'Validation Error: Post-operative recovery ward selection is required.' };
        }
        if (!startTime || !startTime.trim()) {
            return { success: false, message: 'Validation Error: Start time is required.' };
        }

        // 2. Start Time Format Validation (24-Hour HH:MM format)
        const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
        const trimmedStartTime = startTime.trim();
        if (!timeRegex.test(trimmedStartTime)) {
            return { success: false, message: 'Validation Error: Invalid time format. Please enter time in 24-hour HH:MM format (e.g. 09:30 or 14:00).' };
        }

        // 3. Positive Duration Validation
        const duration = parseInt(durationMinutes, 10);
        if (isNaN(duration) || duration <= 0) {
            return { success: false, message: 'Validation Error: Surgery duration must be a positive number of minutes.' };
        }
        if (duration < 15) {
            return { success: false, message: 'Validation Error: Surgery duration must be at least 15 minutes.' };
        }
        if (duration > 720) {
            return { success: false, message: 'Validation Error: Surgery duration cannot exceed 720 minutes (12 hours).' };
        }

        // 4. Operating Room Schedule Boundaries Check (Supported Operating Schedule: 08:00 to 20:00)
        const OR_OPEN_MIN = 8 * 60;   // 08:00 (480 mins)
        const OR_CLOSE_MIN = 20 * 60; // 20:00 (1200 mins)

        const startMin = timeToMinutes(trimmedStartTime);
        const endMin = startMin + duration;
        const endTime = minutesToTime(endMin);

        if (startMin < OR_OPEN_MIN) {
            return { 
                success: false, 
                message: `Schedule Boundary Error: Operating rooms open at 08:00. Start time (${trimmedStartTime}) cannot be earlier than 08:00.` 
            };
        }

        if (endMin > OR_CLOSE_MIN) {
            return { 
                success: false, 
                message: `Schedule Boundary Error: Surgery end time (${endTime}) extends past the supported operating schedule closing time (20:00). Please choose an earlier start time or shorter duration.` 
            };
        }

        // 5. Post-Operative Bed Availability Check (Before Booking Confirmation)
        if (this.bedManager) {
            const availBedsInWard = this.bedManager.getAvailableBeds(postOpBedWard);
            const targetWard = this.bedManager.wards.find(w => w.id === postOpBedWard);
            const wardDisplayName = targetWard ? targetWard.name : postOpBedWard.toUpperCase();

            if (availBedsInWard.length === 0) {
                return {
                    success: false,
                    message: `Bed Allocation Error: No vacant beds available in ${wardDisplayName} for post-operative recovery. Please select an alternate ward with vacancy or discharge a patient before confirming.`
                };
            }
        }

        // 6. Validate OR Room & Surgeon Schedule Conflicts
        const conflictResult = this.checkConflicts(orId, surgeonId, trimmedStartTime, endTime);
        if (conflictResult.hasConflict) {
            return { success: false, conflict: conflictResult, message: conflictResult.message };
        }

        // 7. Atomic Booking Confirmation
        const newId = `SURG-${Math.floor(100 + Math.random() * 900)}`;
        const priorityNum = parseInt(priority, 10) || 3;
        const priorityLabels = { 1: 'Emergency', 2: 'Urgent', 3: 'Elective' };

        const newSurgery = {
            id: newId,
            patientName: patientName.trim(),
            patientAge: parseInt(patientAge, 10) || 30,
            surgeryType: surgeryType.trim(),
            priority: priorityNum,
            priorityLabel: priorityLabels[priorityNum] || 'Elective',
            orId,
            surgeonId,
            startTime: trimmedStartTime,
            endTime,
            durationMinutes: duration,
            postOpBedWard,
            status: 'Scheduled',
            notes: notes ? notes.trim() : ''
        };

        // Reserve post-op bed in requested ward
        if (this.bedManager && postOpBedWard) {
            const bedReservation = this.bedManager.reserveBedForSurgery(postOpBedWard, newSurgery.patientName, newId);
            if (!bedReservation.success) {
                return { success: false, message: `Bed Reservation Failed: ${bedReservation.message}` };
            }
            newSurgery.reservedBedId = bedReservation.bed.id;
        }

        this.surgeries.push(newSurgery);

        // Remove from triage if it was queued in the priority heap
        if (surgeryData.triageId) {
            const remaining = this.triageHeap.toArray().filter(t => t.id !== surgeryData.triageId);
            this.triageHeap.heapify(remaining);
        }

        this.save();
        return { 
            success: true, 
            surgery: newSurgery, 
            message: `Surgery successfully scheduled for ${newSurgery.patientName} (${newSurgery.surgeryType}) in ${orId} from ${trimmedStartTime} to ${endTime}. Post-op bed reserved.` 
        };
    }

    /**
     * Update Surgery Status
     */
    updateSurgeryStatus(surgeryId, newStatus) {
        const surgery = this.surgeries.find(s => s.id === surgeryId);
        if (!surgery) return { success: false, message: 'Surgery not found.' };

        surgery.status = newStatus;

        // If completed or cancelled, release reserved bed or activate admission
        if (newStatus === 'Completed' && surgery.reservedBedId && this.bedManager) {
            const bed = this.bedManager.getBedById(surgery.reservedBedId);
            if (bed && bed.status === 'reserved') {
                this.bedManager.allocateBed(bed.id, {
                    patientName: surgery.patientName,
                    patientAge: surgery.patientAge,
                    condition: `Post-Op: ${surgery.surgeryType}`,
                    priority: surgery.priority,
                    doctor: this.getDoctorById(surgery.surgeonId)?.name
                });
            }
        } else if (newStatus === 'Cancelled' && surgery.reservedBedId && this.bedManager) {
            const bed = this.bedManager.getBedById(surgery.reservedBedId);
            if (bed && bed.status === 'reserved') {
                this.bedManager.setBedStatus(bed.id, 'available');
            }
        }

        this.save();
        return { success: true, message: `Surgery ${surgeryId} status updated to ${newStatus}.`, surgery };
    }

    /**
     * Add emergency case to Triage Binary Heap Priority Queue
     * Time Complexity: O(log N) via bubbleUp
     */
    addEmergencyTriage(triageItem) {
        const id = `TRG-${Math.floor(100 + Math.random() * 900)}`;
        const newItem = {
            id,
            patientName: triageItem.patientName,
            patientAge: triageItem.patientAge || 30,
            condition: triageItem.condition,
            priority: parseInt(triageItem.priority) || 1,
            priorityLabel: triageItem.priority == 1 ? 'Emergency' : triageItem.priority == 2 ? 'Urgent' : 'Elective',
            requiredORSpecialty: triageItem.requiredORSpecialty || 'General & Trauma',
            estDuration: parseInt(triageItem.estDuration) || 90,
            requiredBedWard: triageItem.requiredBedWard || 'icu',
            arrivalTime: Date.now()
        };

        const heapResult = this.triageHeap.insert(newItem);
        this.save();
        return { 
            success: true, 
            item: newItem, 
            heapResult, 
            message: `Emergency triage case registered for ${newItem.patientName} (Priority ${newItem.priority}: ${newItem.priorityLabel}) via Binary Min-Heap.` 
        };
    }

    registerEmergencyCase(triageItem) {
        return this.addEmergencyTriage(triageItem);
    }

    /**
     * Extract and dequeue the most critical emergency case (Min-Heap root)
     * Time Complexity: O(log N) via sinkDown
     */
    extractNextEmergency() {
        const res = this.triageHeap.extractMin();
        this.save();
        return res;
    }

    /**
     * Get statistics for metrics dashboard
     */
    getMetrics() {
        const totalSurgeries = this.surgeries.length;
        const scheduled = this.surgeries.filter(s => s.status === 'Scheduled').length;
        const inProgress = this.surgeries.filter(s => s.status === 'In-Progress').length;
        const completed = this.surgeries.filter(s => s.status === 'Completed').length;
        const emergencyCount = this.surgeries.filter(s => s.priority === 1).length;
        const triageCount = this.triageHeap.size();

        // Calculate total booked minutes for OR utilization
        const totalBookedMinutes = this.surgeries
            .filter(s => s.status === 'Scheduled' || s.status === 'In-Progress')
            .reduce((sum, s) => sum + s.durationMinutes, 0);

        // Standard operational day = 4 ORs * 10 operational hours (600 mins each) = 2400 mins capacity
        const totalCapacityMinutes = this.operatingRooms.length * 10 * 60;
        const utilizationRate = Math.min(100, Math.round((totalBookedMinutes / totalCapacityMinutes) * 100));

        return {
            totalSurgeries,
            scheduled,
            inProgress,
            completed,
            emergencyCount,
            triageCount,
            utilizationRate
        };
    }
}
