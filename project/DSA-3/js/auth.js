// Authentication & Dynamic Self-Registration Manager

import { DOCTORS } from './data.js';

export const DEMO_USERS = {
    admin: {
        id: 'USR-ADMIN',
        username: 'admin',
        name: 'Hospital Operations Hub',
        role: 'admin',
        title: 'Chief Operations Officer',
        avatar: 'HO'
    },
    doctor: {
        id: 'DOC-101',
        username: 'dr.ananya',
        name: 'Dr. Ananya Sharma',
        role: 'doctor',
        doctorId: 'DOC-101',
        specialty: 'Cardiothoracic Surgery',
        avatar: 'AS'
    },
    patient: {
        id: 'PAT-101',
        username: 'rohan.sharma',
        name: 'Rohan Sharma',
        role: 'patient',
        patientName: 'Rohan Sharma',
        bedId: 'SUR-302',
        avatar: 'RS'
    }
};

export class AuthManager {
    constructor() {
        this.currentUser = JSON.parse(localStorage.getItem('medschedule_user')) || null;
        this.registeredUsers = JSON.parse(localStorage.getItem('hospital_registered_users')) || [];
    }

    saveRegisteredUsers() {
        localStorage.setItem('hospital_registered_users', JSON.stringify(this.registeredUsers));
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isLoggedIn() {
        return this.currentUser !== null;
    }

    loginAsDemo(roleKey) {
        const user = DEMO_USERS[roleKey];
        if (user) {
            this.currentUser = user;
            localStorage.setItem('medschedule_user', JSON.stringify(user));
            return { success: true, user };
        }
        return { success: false, message: 'Invalid role selected.' };
    }

    login(username, password, role) {
        // Check registered custom users first
        const match = this.registeredUsers.find(u => u.username.toLowerCase() === username.toLowerCase() || u.name.toLowerCase() === username.toLowerCase());
        if (match) {
            this.currentUser = match;
            localStorage.setItem('medschedule_user', JSON.stringify(match));
            return { success: true, user: match };
        }

        // Demo user fallback
        if (role === 'admin' && (username === 'admin' || username === 'office')) {
            return this.loginAsDemo('admin');
        }
        if (role === 'doctor') {
            return this.loginAsDemo('doctor');
        }
        if (role === 'patient') {
            return this.loginAsDemo('patient');
        }
        return this.loginAsDemo(role || 'admin');
    }

    registerDoctor(docData) {
        const docId = `DOC-${Math.floor(100 + Math.random() * 900)}`;
        const username = docData.username || docData.name.toLowerCase().replace(/[^a-z]/g, '');
        const initials = docData.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

        const newDoctorUser = {
            id: docId,
            username,
            name: docData.name.startsWith('Dr.') ? docData.name : `Dr. ${docData.name}`,
            role: 'doctor',
            doctorId: docId,
            specialty: docData.specialty || 'General Surgery',
            avatar: initials
        };

        this.registeredUsers.push(newDoctorUser);
        this.saveRegisteredUsers();

        // Push to DOCTORS memory array
        if (!DOCTORS.find(d => d.id === docId)) {
            DOCTORS.push({
                id: docId,
                name: newDoctorUser.name,
                specialty: newDoctorUser.specialty,
                avatar: initials
            });
        }

        return { success: true, user: newDoctorUser, message: `${newDoctorUser.name} registered successfully as Doctor! Portal Username: ${username}` };
    }

    registerPatient(patientData) {
        const patId = `PAT-${Math.floor(100 + Math.random() * 900)}`;
        const username = patientData.username || patientData.name.toLowerCase().replace(/[^a-z]/g, '');
        const initials = patientData.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

        const newPatientUser = {
            id: patId,
            username,
            name: patientData.name,
            role: 'patient',
            patientName: patientData.name,
            patientAge: patientData.age,
            condition: patientData.condition,
            bedId: patientData.bedId || null,
            avatar: initials
        };

        this.registeredUsers.push(newPatientUser);
        this.saveRegisteredUsers();

        return { success: true, user: newPatientUser, message: `Patient ${patientData.name} registered successfully! Portal Username: ${username}` };
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('medschedule_user');
    }

    hasRole(role) {
        return this.currentUser && this.currentUser.role === role;
    }
}
