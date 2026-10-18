// Bed Management & Ward Controller

import { INITIAL_BEDS, INITIAL_WARDS } from './data.js';

export class BedManager {
    constructor() {
        this.beds = JSON.parse(localStorage.getItem('hospital_beds')) || INITIAL_BEDS;
        this.wards = INITIAL_WARDS;
        this.save();
    }

    save() {
        localStorage.setItem('hospital_beds', JSON.stringify(this.beds));
    }

    getAllBeds() {
        return this.beds;
    }

    getBedsByWard(wardId) {
        if (!wardId || wardId === 'all') return this.beds;
        return this.beds.filter(b => b.wardId === wardId);
    }

    getBedById(bedId) {
        return this.beds.find(b => b.id === bedId);
    }

    getAvailableBeds(wardId = null) {
        return this.beds.filter(b => b.status === 'available' && (!wardId || b.wardId === wardId));
    }

    addNewBed(wardId, bedNumber, notes = 'Newly Added Bed') {
        const ward = this.wards.find(w => w.id === wardId);
        if (!ward) return { success: false, message: 'Invalid ward selected.' };

        // Check duplicate bed number in same ward
        const existing = this.beds.find(b => b.wardId === wardId && b.bedNumber === bedNumber);
        if (existing) return { success: false, message: `Bed ${bedNumber} already exists in ${ward.name}.` };

        const id = `${wardId.toUpperCase()}-${bedNumber}`;
        const newBed = {
            id,
            wardId,
            bedNumber,
            status: 'available',
            patientName: null,
            priority: null,
            notes: notes || 'Vacant & Ready'
        };

        this.beds.push(newBed);
        ward.totalBeds = (ward.totalBeds || 0) + 1;
        this.save();

        return { success: true, bed: newBed, message: `Bed ${bedNumber} successfully added to ${ward.name}.` };
    }

    allocateBed(bedId, patientData) {
        const bed = this.getBedById(bedId);
        if (!bed) return { success: false, message: 'Bed not found.' };
        if (bed.status === 'occupied') return { success: false, message: 'Bed is currently occupied.' };

        bed.status = 'occupied';
        bed.patientName = patientData.patientName;
        bed.patientAge = patientData.patientAge || 'N/A';
        bed.condition = patientData.condition || 'Admitted';
        bed.priority = patientData.priority || 3;
        bed.doctor = patientData.doctor || 'Unassigned';
        bed.admitTime = new Date().toLocaleString();
        bed.reservedForSurgeryId = null;

        this.save();
        return { success: true, message: `Bed ${bed.bedNumber} successfully allocated to ${bed.patientName}.`, bed };
    }

    dischargeBed(bedId) {
        const bed = this.getBedById(bedId);
        if (!bed) return { success: false, message: 'Bed not found.' };

        const previousPatient = bed.patientName;
        bed.status = 'cleaning';
        bed.patientName = null;
        bed.patientAge = null;
        bed.condition = null;
        bed.priority = null;
        bed.doctor = null;
        bed.admitTime = null;
        bed.notes = 'Awaiting sanitation cleaning after discharge of ' + previousPatient;
        bed.reservedForSurgeryId = null;

        this.save();
        return { success: true, message: `Patient ${previousPatient} discharged from Bed ${bed.bedNumber}. Status changed to Cleaning.`, bed };
    }

    markClean(bedId) {
        const bed = this.getBedById(bedId);
        if (!bed) return { success: false, message: 'Bed not found.' };

        bed.status = 'available';
        bed.notes = null;
        this.save();
        return { success: true, message: `Bed ${bed.bedNumber} is now sanitized and available.`, bed };
    }

    reserveBedForSurgery(wardId, patientName, surgeryId) {
        const availableBeds = this.getAvailableBeds(wardId);
        if (availableBeds.length === 0) {
            const ward = this.wards.find(w => w.id === wardId);
            return { 
                success: false, 
                message: `No vacant beds in ${ward ? ward.name : wardId} for post-operative recovery reservation.` 
            };
        }

        const bed = availableBeds[0];
        bed.status = 'reserved';
        bed.patientName = `${patientName} (Post-Op Reserved)`;
        bed.reservedForSurgeryId = surgeryId;
        this.save();
        return { success: true, bed };
    }

    setBedStatus(bedId, status, notes = null) {
        const bed = this.getBedById(bedId);
        if (!bed) return { success: false, message: 'Bed not found.' };
        bed.status = status;
        if (notes !== null) bed.notes = notes;
        if (status === 'available') {
            bed.patientName = null;
            bed.patientAge = null;
            bed.condition = null;
            bed.doctor = null;
        }
        this.save();
        return { success: true, message: `Bed ${bed.bedNumber} status set to ${status}.`, bed };
    }

    getMetrics() {
        const total = this.beds.length;
        const occupied = this.beds.filter(b => b.status === 'occupied').length;
        const available = this.beds.filter(b => b.status === 'available').length;
        const reserved = this.beds.filter(b => b.status === 'reserved').length;
        const cleaning = this.beds.filter(b => b.status === 'cleaning').length;
        const maintenance = this.beds.filter(b => b.status === 'maintenance').length;

        const occupancyRate = total > 0 ? Math.round((occupied / total) * 100) : 0;

        const wardStats = this.wards.map(ward => {
            const wardBeds = this.beds.filter(b => b.wardId === ward.id);
            const wOccupied = wardBeds.filter(b => b.status === 'occupied').length;
            const wAvail = wardBeds.filter(b => b.status === 'available').length;
            return {
                ...ward,
                occupiedCount: wOccupied,
                availableCount: wAvail,
                total: wardBeds.length,
                rate: wardBeds.length > 0 ? Math.round((wOccupied / wardBeds.length) * 100) : 0
            };
        });

        return {
            total,
            occupied,
            available,
            reserved,
            cleaning,
            maintenance,
            occupancyRate,
            wardStats
        };
    }
}
