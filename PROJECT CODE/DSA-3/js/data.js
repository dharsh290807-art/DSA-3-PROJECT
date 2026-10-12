// Initial dataset for Hospital Bed and OR Scheduling System (Indian Names Localized)

/**
 * Universal HTML Escape Helper to prevent XSS from user-controlled inputs
 */
export function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export const INITIAL_WARDS = [
    { id: 'icu', name: 'Intensive Care Unit (ICU)', icon: 'fa-heart-pulse', color: '#ef4444', totalBeds: 8 },
    { id: 'emergency', name: 'Emergency Triage', icon: 'fa-truck-medical', color: '#f97316', totalBeds: 10 },
    { id: 'surgical', name: 'Surgical Recovery Ward', icon: 'fa-bed-pulse', color: '#8b5cf6', totalBeds: 12 },
    { id: 'cardiac', name: 'Cardiac Care Unit (CCU)', icon: 'fa-heart-circle-bolt', color: '#ec4899', totalBeds: 6 },
    { id: 'general', name: 'General Ward - North', icon: 'fa-hospital-user', color: '#3b82f6', totalBeds: 16 }
];

export const DOCTORS = [
    { id: 'DOC-101', name: 'Dr. Ananya Sharma', specialty: 'Cardiothoracic Surgery', avatar: 'AS' },
    { id: 'DOC-102', name: 'Dr. Rajesh Varma', specialty: 'Neurosurgery', avatar: 'RV' },
    { id: 'DOC-103', name: 'Dr. Priya Patel', specialty: 'Orthopedic Surgery', avatar: 'PP' },
    { id: 'DOC-104', name: 'Dr. Vikramaditya Rao', specialty: 'General & Trauma Surgery', avatar: 'VR' },
    { id: 'DOC-105', name: 'Dr. Sunita Kulkarni', specialty: 'Pediatric Surgery', avatar: 'SK' }
];

export const INITIAL_BEDS = [
    // ICU
    { id: 'ICU-101', wardId: 'icu', bedNumber: '101', status: 'occupied', patientName: 'Ramesh Verma', patientAge: 64, condition: 'Critical Post-Op CABG', priority: 1, doctor: 'Dr. Ananya Sharma', admitTime: '2026-09-10 14:30' },
    { id: 'ICU-102', wardId: 'icu', bedNumber: '102', status: 'occupied', patientName: 'Sunita Gupta', patientAge: 52, condition: 'Acute Respiratory Distress', priority: 1, doctor: 'Dr. Rajesh Varma', admitTime: '2026-09-11 02:15' },
    { id: 'ICU-103', wardId: 'icu', bedNumber: '103', status: 'available', patientName: null, priority: null },
    { id: 'ICU-104', wardId: 'icu', bedNumber: '104', status: 'cleaning', patientName: null, notes: 'Sanitizing post discharge' },
    { id: 'ICU-105', wardId: 'icu', bedNumber: '105', status: 'reserved', patientName: 'Suresh Kumar (Incoming OR-2)', priority: 1, reservedForSurgeryId: 'SURG-102' },
    { id: 'ICU-106', wardId: 'icu', bedNumber: '106', status: 'available', patientName: null },
    { id: 'ICU-107', wardId: 'icu', bedNumber: '107', status: 'available', patientName: null },
    { id: 'ICU-108', wardId: 'icu', bedNumber: '108', status: 'maintenance', patientName: null, notes: 'Ventilator calibration' },

    // Emergency
    { id: 'EMG-201', wardId: 'emergency', bedNumber: '201', status: 'occupied', patientName: 'Anita Sharma', patientAge: 29, condition: 'Trauma - Fracture', priority: 2, doctor: 'Dr. Vikramaditya Rao', admitTime: '2026-09-11 08:00' },
    { id: 'EMG-202', wardId: 'emergency', bedNumber: '202', status: 'available', patientName: null },
    { id: 'EMG-203', wardId: 'emergency', bedNumber: '203', status: 'available', patientName: null },
    { id: 'EMG-204', wardId: 'emergency', bedNumber: '204', status: 'occupied', patientName: 'Manish Agarwal', patientAge: 45, condition: 'Severe Abdominal Pain', priority: 2, doctor: 'Dr. Vikramaditya Rao', admitTime: '2026-09-11 09:10' },
    { id: 'EMG-205', wardId: 'emergency', bedNumber: '205', status: 'available', patientName: null },
    { id: 'EMG-206', wardId: 'emergency', bedNumber: '206', status: 'available', patientName: null },

    // Surgical Recovery
    { id: 'SUR-301', wardId: 'surgical', bedNumber: '301', status: 'occupied', patientName: 'Geeta Devi', patientAge: 71, condition: 'Hip Replacement Recovery', priority: 3, doctor: 'Dr. Priya Patel', admitTime: '2026-09-09 11:00' },
    { id: 'SUR-302', wardId: 'surgical', bedNumber: '302', status: 'reserved', patientName: 'Rohan Sharma', priority: 2, reservedForSurgeryId: 'SURG-101' },
    { id: 'SUR-303', wardId: 'surgical', bedNumber: '303', status: 'available', patientName: null },
    { id: 'SUR-304', wardId: 'surgical', bedNumber: '304', status: 'available', patientName: null },
    { id: 'SUR-305', wardId: 'surgical', bedNumber: '305', status: 'cleaning', patientName: null },

    // Cardiac CCU
    { id: 'CCU-401', wardId: 'cardiac', bedNumber: '401', status: 'occupied', patientName: 'Ashok Swaminathan', patientAge: 68, condition: 'Post Angioplasty', priority: 1, doctor: 'Dr. Ananya Sharma', admitTime: '2026-09-10 18:20' },
    { id: 'CCU-402', wardId: 'cardiac', bedNumber: '402', status: 'available', patientName: null },
    { id: 'CCU-403', wardId: 'cardiac', bedNumber: '403', status: 'available', patientName: null },

    // General Ward
    { id: 'GEN-501', wardId: 'general', bedNumber: '501', status: 'occupied', patientName: 'Sangeeta Mukherjee', patientAge: 38, condition: 'Pneumonia Observation', priority: 3, doctor: 'Dr. Rajesh Varma', admitTime: '2026-09-08 09:00' },
    { id: 'GEN-502', wardId: 'general', bedNumber: '502', status: 'occupied', patientName: 'Jagdish Sharma', patientAge: 55, condition: 'Post Appendectomy', priority: 3, doctor: 'Dr. Vikramaditya Rao', admitTime: '2026-09-10 16:45' },
    { id: 'GEN-503', wardId: 'general', bedNumber: '503', status: 'available', patientName: null },
    { id: 'GEN-504', wardId: 'general', bedNumber: '504', status: 'available', patientName: null },
    { id: 'GEN-505', wardId: 'general', bedNumber: '505', status: 'available', patientName: null }
];

export const INITIAL_OPERATING_ROOMS = [
    { id: 'OR-1', name: 'Operating Room 1', specialty: 'General & Trauma', color: '#3b82f6', equipment: ['Laparoscopy Tower', 'C-Arm X-Ray', 'Defibrillator'] },
    { id: 'OR-2', name: 'Operating Room 2', specialty: 'Cardiothoracic', color: '#ec4899', equipment: ['Heart-Lung Bypass Machine', 'Transesophageal Echo', 'ECG Monitor'] },
    { id: 'OR-3', name: 'Operating Room 3', specialty: 'Neurosurgery & Spine', color: '#8b5cf6', equipment: ['Surgical Microscope', 'Intraoperative MRI', 'Neuro-navigation'] },
    { id: 'OR-4', name: 'Operating Room 4', specialty: 'Orthopedics & Arthroscopy', color: '#10b981', equipment: ['Arthroscopy Suite', 'Orthopedic Table', 'Fluoroscopy'] }
];

export const INITIAL_SURGERIES = [
    {
        id: 'SURG-101',
        patientName: 'Rohith Sharma',
        patientAge: 42,
        surgeryType: 'Laparoscopic Cholecystectomy',
        priority: 2,
        priorityLabel: 'Urgent',
        orId: 'OR-1',
        surgeonId: 'DOC-104', // Dr. Vikramaditya Rao
        startTime: '09:00',
        endTime: '11:00',
        durationMinutes: 120,
        postOpBedWard: 'surgical',
        status: 'Scheduled',
        notes: 'Pre-op clearance verified. Post-op bed SUR-302 reserved in Surgical Recovery.'
    },
    {
        id: 'SURG-102',
        patientName: 'Suresh Kumar',
        patientAge: 59,
        surgeryType: 'Coronary Artery Bypass Graft (CABG)',
        priority: 1,
        priorityLabel: 'Emergency',
        orId: 'OR-2',
        surgeonId: 'DOC-101', // Dr. Ananya Sharma
        startTime: '10:00',
        endTime: '14:00',
        durationMinutes: 240,
        postOpBedWard: 'icu',
        status: 'In-Progress',
        notes: 'High priority CABG. ICU bed ICU-105 pre-allocated for post-op recovery.'
    },
    {
        id: 'SURG-103',
        patientName: 'Kavita Joshi',
        patientAge: 34,
        surgeryType: 'Lumbar Microdiscectomy',
        priority: 3,
        priorityLabel: 'Elective',
        orId: 'OR-3',
        surgeonId: 'DOC-102', // Dr. Rajesh Varma
        startTime: '11:30',
        endTime: '13:30',
        durationMinutes: 120,
        postOpBedWard: 'general',
        status: 'Scheduled',
        notes: 'Elective spine decompressive procedure.'
    },
    {
        id: 'SURG-104',
        patientName: 'Alok Nandan',
        patientAge: 48,
        surgeryType: 'Total Knee Arthroplasty',
        priority: 3,
        priorityLabel: 'Elective',
        orId: 'OR-4',
        surgeonId: 'DOC-103', // Dr. Priya Patel
        startTime: '14:00',
        endTime: '16:30',
        durationMinutes: 150,
        postOpBedWard: 'surgical',
        status: 'Scheduled',
        notes: 'Requires knee implant kit and post-op physical rehab plan.'
    }
];

export const INITIAL_TRIAGE_WAITING = [
    { id: 'TRG-001', patientName: 'Varun Deshmukh', patientAge: 61, condition: 'Ruptured Abdominal Aortic Aneurysm', priority: 1, priorityLabel: 'Emergency', requiredORSpecialty: 'Cardiothoracic', estDuration: 180, requiredBedWard: 'icu' },
    { id: 'TRG-002', patientName: 'Shruti Iyer', patientAge: 27, condition: 'Acute Appendicitis with Peritonitis', priority: 1, priorityLabel: 'Emergency', requiredORSpecialty: 'General & Trauma', estDuration: 90, requiredBedWard: 'surgical' },
    { id: 'TRG-003', patientName: 'Gopalakrishnan Nair', patientAge: 67, condition: 'Cervical Spondylosis Decompression', priority: 3, priorityLabel: 'Elective', requiredORSpecialty: 'Neurosurgery & Spine', estDuration: 120, requiredBedWard: 'general' }
];
