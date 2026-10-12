// DSA Scheduling Optimizer Engine
// Implements Priority Queue Triage & Greedy Interval Scheduling Algorithms

import { timeToMinutes, minutesToTime } from './scheduler.js';

export class DSAOptimizer {
    constructor(orScheduler, bedManager) {
        this.orScheduler = orScheduler;
        this.bedManager = bedManager;
    }

    /**
     * Greedy Interval Scheduling & Priority Queue Auto-Optimizer
     * Takes all pending triage cases + scheduled surgeries, resets schedule, and re-allocates optimal slots
     */
    autoOptimizeSchedule() {
        const logs = [];
        logs.push('🚀 Initiating DSA Schedule Optimization Engine...');
        logs.push('📊 Algorithm Strategy: Multi-Tier Priority Queue + Greedy Earliest Finish Time (EFT)');

        const triageCases = [...this.orScheduler.getTriageQueue()];
        const currentSurgeries = [...this.orScheduler.getAllSurgeries()].filter(s => s.status !== 'Completed' && s.status !== 'Cancelled');
        const operatingRooms = this.orScheduler.getOperatingRooms();
        const doctors = this.orScheduler.getDoctors();

        // 1. Build Unified Task List
        const allTasks = [];

        // Existing surgeries
        currentSurgeries.forEach(s => {
            allTasks.push({
                isTriage: false,
                originalId: s.id,
                patientName: s.patientName,
                patientAge: s.patientAge,
                surgeryType: s.surgeryType,
                priority: s.priority,
                priorityLabel: s.priorityLabel,
                specialty: s.specialty || this.mapORToSpecialty(s.orId),
                durationMinutes: s.durationMinutes,
                postOpBedWard: s.postOpBedWard,
                preferredDoctorId: s.surgeonId,
                status: s.status,
                originalStart: s.startTime
            });
        });

        // Triage cases
        triageCases.forEach(t => {
            allTasks.push({
                isTriage: true,
                triageId: t.id,
                patientName: t.patientName,
                patientAge: t.patientAge,
                surgeryType: t.condition,
                priority: t.priority,
                priorityLabel: t.priorityLabel,
                specialty: t.requiredORSpecialty,
                durationMinutes: t.estDuration,
                postOpBedWard: t.requiredBedWard,
                preferredDoctorId: this.getDoctorForSpecialty(t.requiredORSpecialty, doctors),
                status: 'Scheduled'
            });
        });

        // 2. Priority Queue Sort: Order by (Priority ASC: 1->2->3), then by Duration (Shortest Job First)
        allTasks.sort((a, b) => {
            if (a.priority !== b.priority) return a.priority - b.priority;
            return a.durationMinutes - b.durationMinutes;
        });

        logs.push(`📋 Priority Queue Formatted: ${allTasks.length} total surgical tasks queued.`);
        allTasks.forEach((t, i) => {
            logs.push(`   [${i + 1}] P${t.priority} (${t.priorityLabel}) - ${t.patientName} (${t.surgeryType}, ${t.durationMinutes} mins)`);
        });

        // 3. Interval Scheduling Allocation across Operating Rooms
        const DAY_START_MIN = 8 * 60; // 08:00 AM
        const DAY_END_MIN = 20 * 60; // 08:00 PM
        const BUFFER_MIN = 15;

        // Track room timelines: { 'OR-1': nextAvailableMin }
        const roomTimelines = {};
        operatingRooms.forEach(r => roomTimelines[r.id] = DAY_START_MIN);

        // Track doctor timelines: { 'DOC-101': nextAvailableMin }
        const doctorTimelines = {};
        doctors.forEach(d => doctorTimelines[d.id] = DAY_START_MIN);

        const newSurgeries = [];
        const unassigned = [];

        for (const task of allTasks) {
            let allocated = false;

            // Filter rooms matching specialty or general fallback
            let eligibleRooms = operatingRooms.filter(r => r.specialty.includes(task.specialty.split(' ')[0]) || r.id === 'OR-1');
            if (eligibleRooms.length === 0) eligibleRooms = operatingRooms;

            // Find room with earliest available slot where doctor is also available
            let bestRoom = null;
            let bestStartMin = Infinity;

            for (const room of eligibleRooms) {
                const roomAvail = roomTimelines[room.id];
                const docId = task.preferredDoctorId || doctors[0].id;
                const docAvail = doctorTimelines[docId] || DAY_START_MIN;

                const candidateStart = Math.max(roomAvail, docAvail);
                const candidateEnd = candidateStart + task.durationMinutes;

                if (candidateEnd <= DAY_END_MIN && candidateStart < bestStartMin) {
                    bestStartMin = candidateStart;
                    bestRoom = room;
                }
            }

            if (bestRoom && bestStartMin < Infinity) {
                const startMin = bestStartMin;
                const endMin = startMin + task.durationMinutes;
                const startTimeStr = minutesToTime(startMin);
                const endTimeStr = minutesToTime(endMin);

                const surgeonId = task.preferredDoctorId || doctors[0].id;

                // Update timelines with buffer
                roomTimelines[bestRoom.id] = endMin + BUFFER_MIN;
                doctorTimelines[surgeonId] = endMin + BUFFER_MIN;

                const surgeryId = task.originalId || `SURG-${Math.floor(100 + Math.random() * 900)}`;

                newSurgeries.push({
                    id: surgeryId,
                    patientName: task.patientName,
                    patientAge: task.patientAge,
                    surgeryType: task.surgeryType,
                    priority: task.priority,
                    priorityLabel: task.priorityLabel,
                    orId: bestRoom.id,
                    surgeonId: surgeonId,
                    startTime: startTimeStr,
                    endTime: endTimeStr,
                    durationMinutes: task.durationMinutes,
                    postOpBedWard: task.postOpBedWard,
                    status: 'Scheduled',
                    notes: `Auto-scheduled by DSA Optimizer (Slot: ${startTimeStr}-${endTimeStr} in ${bestRoom.name})`
                });

                logs.push(`✅ Scheduled: ${task.patientName} -> ${bestRoom.name} [${startTimeStr} - ${endTimeStr}]`);
                allocated = true;
            }

            if (!allocated) {
                unassigned.push(task);
                logs.push(`⚠️ Deferred: ${task.patientName} could not fit in today's 08:00-20:00 schedule window.`);
            }
        }

        // Apply new schedule if optimized
        this.orScheduler.surgeries = newSurgeries;
        this.orScheduler.triageQueue = unassigned.map((u, idx) => ({
            id: u.triageId || `TRG-OPT-${idx + 10}`,
            patientName: u.patientName,
            patientAge: u.patientAge,
            condition: u.surgeryType,
            priority: u.priority,
            priorityLabel: u.priorityLabel,
            requiredORSpecialty: u.specialty,
            estDuration: u.durationMinutes,
            requiredBedWard: u.postOpBedWard
        }));

        this.orScheduler.save();

        logs.push('✨ Optimization Complete! Schedule updated cleanly with 0 conflicts.');

        return {
            success: true,
            logs,
            assignedCount: newSurgeries.length,
            deferredCount: unassigned.length
        };
    }

    /**
     * Emergency Override Insertion Solver
     * Inserts emergency case (P1) into immediate slot, bumping elective cases if necessary
     */
    handleEmergencyOverride(emergencyCase) {
        const logs = [];
        logs.push(`🚨 EMERGENCY OVERRIDE TRIGGERED for patient: ${emergencyCase.patientName}`);
        logs.push(`   Condition: ${emergencyCase.condition} | Est. Duration: ${emergencyCase.estDuration} mins`);

        const duration = parseInt(emergencyCase.estDuration) || 90;
        const requiredSpecialty = emergencyCase.requiredORSpecialty || 'General & Trauma';
        const operatingRooms = this.orScheduler.getOperatingRooms();
        const doctors = this.orScheduler.getDoctors();

        // Target ideal room
        let targetOR = operatingRooms.find(r => r.specialty.includes(requiredSpecialty.split(' ')[0])) || operatingRooms[0];
        const assignedDoc = doctors.find(d => d.specialty.includes(requiredSpecialty.split(' ')[0])) || doctors[0];

        // Find current surgeries in target OR
        const roomSurgeries = this.orScheduler.getAllSurgeries().filter(s => s.orId === targetOR.id && s.status === 'Scheduled');

        // Look for elective surgery (P3) that can be bumped
        let bumpTarget = roomSurgeries.find(s => s.priority === 3);
        if (!bumpTarget) {
            bumpTarget = roomSurgeries.find(s => s.priority === 2);
        }

        let emergencyStartTime = '09:00';
        let emergencyEndTime = minutesToTime(timeToMinutes('09:00') + duration);

        if (bumpTarget) {
            logs.push(`⚠️ Bump Target Identified: Elective Surgery "${bumpTarget.surgeryType}" for ${bumpTarget.patientName} (P${bumpTarget.priority})`);
            emergencyStartTime = bumpTarget.startTime;
            emergencyEndTime = minutesToTime(timeToMinutes(emergencyStartTime) + duration);

            // Shift bumpTarget to later slot
            const bumpedStartMin = timeToMinutes(emergencyEndTime) + 15;
            const bumpedEndMin = bumpedStartMin + bumpTarget.durationMinutes;

            bumpTarget.startTime = minutesToTime(bumpedStartMin);
            bumpTarget.endTime = minutesToTime(bumpedEndMin);
            bumpTarget.notes = `[BUMPED FOR EMERGENCY] Rescheduled to ${bumpTarget.startTime} due to emergency case insertion (${emergencyCase.patientName}).`;

            logs.push(`🔄 Elective Surgery Rescheduled to later slot: ${bumpTarget.startTime} - ${bumpTarget.endTime}`);
        } else {
            logs.push(`ℹ️ No active elective surgeries to bump. Assigning immediate slot.`);
        }

        // Create Emergency Surgery entry
        const emgSurgeryId = `SURG-EMG-${Math.floor(100 + Math.random() * 900)}`;
        const emgSurgery = {
            id: emgSurgeryId,
            patientName: emergencyCase.patientName,
            patientAge: parseInt(emergencyCase.patientAge) || 40,
            surgeryType: emergencyCase.condition,
            priority: 1,
            priorityLabel: 'Emergency',
            orId: targetOR.id,
            surgeonId: assignedDoc.id,
            startTime: emergencyStartTime,
            endTime: emergencyEndTime,
            durationMinutes: duration,
            postOpBedWard: emergencyCase.requiredBedWard || 'icu',
            status: 'Scheduled',
            notes: '🚨 PRIORITY 1 EMERGENCY INSERTION.'
        };

        // Reserve post-op ICU bed immediately
        if (this.bedManager) {
            this.bedManager.reserveBedForSurgery(emergencyCase.requiredBedWard || 'icu', emergencyCase.patientName, emgSurgeryId);
        }

        this.orScheduler.surgeries.push(emgSurgery);
        this.orScheduler.save();

        logs.push(`✅ Emergency Surgery Scheduled in ${targetOR.name} at ${emergencyStartTime} - ${emergencyEndTime}`);

        return {
            success: true,
            logs,
            emergencySurgery: emgSurgery,
            bumpedSurgery: bumpTarget || null
        };
    }

    mapORToSpecialty(orId) {
        const room = this.orScheduler.getOperatingRooms().find(r => r.id === orId);
        return room ? room.specialty : 'General & Trauma';
    }

    getDoctorForSpecialty(specialty, doctors) {
        const match = doctors.find(d => d.specialty.includes(specialty.split(' ')[0]));
        return match ? match.id : doctors[0].id;
    }
}
