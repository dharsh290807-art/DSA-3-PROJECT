// E-Prescription & Hospital Medication State Manager

export const INITIAL_PRESCRIPTIONS = [
    {
        id: 'RX-101',
        patientName: 'Rohith Sharma',
        patientBedNumber: 'SUR-302',
        wardId: 'surgical',
        medicineName: 'Augmentin 625mg',
        dosage: '1 Tablet (625mg)',
        frequency: '1-0-1 (After Meals)',
        duration: '5 Days',
        category: 'Antibiotic',
        doctorId: 'DOC-104',
        doctorName: 'Dr. Vikramaditya Rao',
        prescribedTime: '2026-09-11 09:30',
        status: 'Active',
        instructions: 'Post-op antibiotic prophylaxis. Take after food with water.'
    },
    {
        id: 'RX-102',
        patientName: 'Rohan Sharma',
        patientBedNumber: 'SUR-302',
        wardId: 'surgical',
        medicineName: 'Ultracet (Tramadol + Paracetamol)',
        dosage: '1 Tablet',
        frequency: '1-0-1 (SOS Pain)',
        duration: '3 Days',
        category: 'Analgesic Pain Relief',
        doctorId: 'DOC-104',
        doctorName: 'Dr. Vikramaditya Rao',
        prescribedTime: '2026-09-11 09:35',
        status: 'Active',
        instructions: 'For surgical incision pain relief. Do not exceed 3 tablets daily.'
    },
    {
        id: 'RX-103',
        patientName: 'Suresh Kumar',
        patientBedNumber: 'ICU-105',
        wardId: 'icu',
        medicineName: 'Heparin Injection 5000 IU',
        dosage: '1 Dose Subcutaneous',
        frequency: '0-1-0 (Evening)',
        duration: '7 Days',
        category: 'Anticoagulant',
        doctorId: 'DOC-101',
        doctorName: 'Dr. Ananya Sharma',
        prescribedTime: '2026-09-10 16:00',
        status: 'Active',
        instructions: 'Post CABG thrombosis prophylaxis. Administer via ICU nurse.'
    },
    {
        id: 'RX-104',
        patientName: 'Sunita Gupta',
        patientBedNumber: 'ICU-102',
        wardId: 'icu',
        medicineName: 'Deriphyllin Injection',
        dosage: '2ml IV Nebulization',
        frequency: '1-1-1 (Every 8 hours)',
        duration: '4 Days',
        category: 'Bronchodilator',
        doctorId: 'DOC-102',
        doctorName: 'Dr. Rajesh Varma',
        prescribedTime: '2026-09-11 03:00',
        status: 'Active',
        instructions: 'For respiratory distress relief in ICU.'
    }
];

export class PrescriptionManager {
    constructor() {
        this.prescriptions = JSON.parse(localStorage.getItem('hospital_prescriptions')) || INITIAL_PRESCRIPTIONS;
        this.save();
    }

    save() {
        localStorage.setItem('hospital_prescriptions', JSON.stringify(this.prescriptions));
    }

    getAllPrescriptions() {
        return this.prescriptions;
    }

    getPrescriptionsByPatient(patientName) {
        if (!patientName) return [];
        return this.prescriptions.filter(p => p.patientName.toLowerCase().includes(patientName.toLowerCase()));
    }

    getPrescriptionsByDoctor(doctorId) {
        if (!doctorId) return [];
        return this.prescriptions.filter(p => p.doctorId === doctorId);
    }

    addPrescription(rxData) {
        const id = `RX-${Math.floor(100 + Math.random() * 900)}`;
        const newRx = {
            id,
            patientName: rxData.patientName,
            patientBedNumber: rxData.patientBedNumber || 'Unassigned',
            wardId: rxData.wardId || 'general',
            medicineName: rxData.medicineName,
            dosage: rxData.dosage,
            frequency: rxData.frequency,
            duration: rxData.duration,
            category: rxData.category || 'General',
            doctorId: rxData.doctorId,
            doctorName: rxData.doctorName,
            prescribedTime: new Date().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }),
            status: 'Active',
            instructions: rxData.instructions || 'As directed by physician.'
        };

        this.prescriptions.unshift(newRx);
        this.save();
        return { success: true, prescription: newRx, message: `Prescription issued for ${rxData.medicineName} to ${rxData.patientName}.` };
    }

    updateStatus(rxId, newStatus) {
        const rx = this.prescriptions.find(p => p.id === rxId);
        if (!rx) return { success: false, message: 'Prescription not found.' };

        rx.status = newStatus;
        this.save();
        return { success: true, prescription: rx, message: `Prescription ${rxId} status changed to ${newStatus}.` };
    }
}
