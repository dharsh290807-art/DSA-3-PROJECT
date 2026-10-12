// Notification & Surgery Approval State Manager

export const INITIAL_SURGERY_REQUESTS = [
    {
        id: 'REQ-101',
        patientName: 'Sangeeta Mukherjee',
        patientAge: 38,
        condition: 'Pneumonia Observation / Coronary Evaluation',
        surgeryType: 'Coronary Angioplasty & Stenting',
        priority: 2,
        priorityLabel: 'Urgent',
        doctorId: 'DOC-101',
        doctorName: 'Dr. Ananya Sharma',
        estDuration: 120,
        requiredWard: 'cardiac',
        requestedTime: '2026-09-11 10:15',
        status: 'Pending_Approval',
        notes: 'Coronary artery narrowing detected in angiogram. Requires urgent stenting.'
    }
];

export const INITIAL_NOTIFICATIONS = [
    {
        id: 'NOTIF-101',
        recipientRole: 'admin',
        title: 'New Surgery Application Received',
        message: 'Dr. Ananya Sharma applied for Coronary Angioplasty for patient Sangeeta Mukherjee (Priority: Urgent).',
        timestamp: '2026-09-11 10:15',
        read: false
    },
    {
        id: 'NOTIF-102',
        recipientRole: 'doctor',
        recipientName: 'Dr. Vikramaditya Rao',
        title: 'Bed Reserved Confirmation',
        message: 'Bed SUR-302 reserved for patient Rohan Sharma post-surgery.',
        timestamp: '2026-09-11 09:30',
        read: true
    },
    {
        id: 'NOTIF-103',
        recipientRole: 'patient',
        recipientName: 'Rohan Sharma',
        title: 'Surgery & Bed Allocation Confirmed',
        message: 'Your surgery (Laparoscopic Cholecystectomy) is scheduled at 09:00 in OR-1 with Dr. Vikramaditya Rao. Bed SUR-302 allocated.',
        timestamp: '2026-09-11 09:30',
        read: false
    }
];

export class NotificationManager {
    constructor() {
        this.surgeryRequests = JSON.parse(localStorage.getItem('hospital_surgery_requests')) || INITIAL_SURGERY_REQUESTS;
        this.notifications = JSON.parse(localStorage.getItem('hospital_notifications')) || INITIAL_NOTIFICATIONS;
        this.save();
    }

    save() {
        localStorage.setItem('hospital_surgery_requests', JSON.stringify(this.surgeryRequests));
        localStorage.setItem('hospital_notifications', JSON.stringify(this.notifications));
    }

    /* ---------------- Surgery Requests ---------------- */
    addSurgeryRequest(data) {
        const id = `REQ-${Math.floor(100 + Math.random() * 900)}`;
        const priorityLabels = { 1: 'Emergency', 2: 'Urgent', 3: 'Elective' };

        const newReq = {
            id,
            patientName: data.patientName,
            patientAge: parseInt(data.patientAge) || 35,
            condition: data.condition || 'Pre-Op Evaluation',
            surgeryType: data.surgeryType,
            priority: parseInt(data.priority) || 2,
            priorityLabel: priorityLabels[data.priority] || 'Urgent',
            doctorId: data.doctorId,
            doctorName: data.doctorName,
            estDuration: parseInt(data.estDuration) || 120,
            requiredWard: data.requiredWard || 'surgical',
            requestedTime: new Date().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }),
            status: 'Pending_Approval',
            notes: data.notes || ''
        };

        this.surgeryRequests.unshift(newReq);

        // Notify Admin of new request
        this.sendNotification({
            recipientRole: 'admin',
            title: '🚨 New Surgery Request Received',
            message: `${data.doctorName} applied for "${data.surgeryType}" for patient ${data.patientName} (${newReq.priorityLabel}).`,
            type: 'request'
        });

        this.save();
        return { success: true, request: newReq, message: `Surgery request submitted to Admin for approval.` };
    }

    getPendingSurgeryRequests() {
        return this.surgeryRequests.filter(r => r.status === 'Pending_Approval');
    }

    getRequestById(id) {
        return this.surgeryRequests.find(r => r.id === id);
    }

    /* ---------------- Notification Messaging ---------------- */
    sendNotification({ recipientRole, recipientName = null, title, message, type = 'info' }) {
        const notif = {
            id: `NOTIF-${Math.floor(100 + Math.random() * 900)}`,
            recipientRole,
            recipientName,
            title,
            message,
            timestamp: new Date().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }),
            read: false,
            type
        };

        this.notifications.unshift(notif);
        this.save();
        return notif;
    }

    getNotificationsForUser(user) {
        if (!user) return [];
        return this.notifications.filter(n => {
            if (n.recipientRole === user.role) {
                if (user.role === 'admin') return true;
                if (n.recipientName && n.recipientName.toLowerCase() === user.name.toLowerCase()) return true;
                if (!n.recipientName) return true;
            }
            return false;
        });
    }

    getUnreadCountForUser(user) {
        return this.getNotificationsForUser(user).filter(n => !n.read).length;
    }

    markAllAsRead(user) {
        const notifs = this.getNotificationsForUser(user);
        notifs.forEach(n => n.read = true);
        this.save();
    }
}
