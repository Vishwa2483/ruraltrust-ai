import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export interface CaptchaResponse {
    captchaId: string;
    question: string;
}

export interface CitizenUser {
    id: string;
    type: 'citizen';
    name: string;
    mobile: string;
    village: string;
}

export interface GovernmentUser {
    id: string;
    type: 'government';
    name: string;
    username: string;
    designation: string;
}

export interface AdminUser {
    id: string;
    type: 'admin';
    name: string;
    username: string;
}

export type User = CitizenUser | GovernmentUser | AdminUser;

export interface LoginResponse {
    message: string;
    token: string;
    user: User;
}

export interface GovernmentAccount {
    _id: string;
    username: string;
    name: string;
    designation: string;
    status: 'active' | 'inactive';
    qrCode?: string;
    createdAt: string;
}

const api = axios.create({
    baseURL: `${API_BASE_URL}/auth`,
    headers: {
        'Content-Type': 'application/json',
    },
});

// ===================================
// TOKEN MANAGEMENT
// ===================================

export function saveToken(token: string): void {
    localStorage.setItem('ruraltrust_token', token);
}

export function getToken(): string | null {
    return localStorage.getItem('ruraltrust_token');
}

export function removeToken(): void {
    localStorage.removeItem('ruraltrust_token');
}

export function saveUser(user: User): void {
    localStorage.setItem('ruraltrust_user', JSON.stringify(user));
}

export function getUser(): User | null {
    const userStr = localStorage.getItem('ruraltrust_user');
    return userStr ? JSON.parse(userStr) : null;
}

export function removeUser(): void {
    localStorage.removeItem('ruraltrust_user');
}

// ===================================
// CAPTCHA
// ===================================

export async function getCaptcha(): Promise<CaptchaResponse> {
    const response = await api.get<CaptchaResponse>('/captcha');
    return response.data;
}

// ===================================
// CITIZEN AUTH
//====================================

export async function citizenSignup(mobile: string, name: string, village: string): Promise<any> {
    const response = await api.post<any>('/citizen/signup', { mobile, name, village });
    return response.data;
}

export async function citizenRequestOTP(mobile: string): Promise<any> {
    const response = await api.post<any>('/citizen/request-otp', { mobile });
    return response.data;
}

export async function citizenVerifyOTP(
    mobile: string,
    otp: string,
    captchaId: string,
    captchaAnswer: number
): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/citizen/verify-otp', {
        mobile,
        otp,
        captchaId,
        captchaAnswer,
    });

    saveToken(response.data.token);
    saveUser(response.data.user);

    return response.data;
}

// ===================================
// GOVERNMENT AUTH
// ===================================

export async function governmentLogin(username: string, password: string): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/government/login', {
        username,
        password,
    });

    saveToken(response.data.token);
    saveUser(response.data.user);

    return response.data;
}

export async function governmentQRLogin(qrData: string): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/government/qr-login', {
        qrData,
    });

    saveToken(response.data.token);
    saveUser(response.data.user);

    return response.data;
}

// ===================================
// ADMIN AUTH
// ===================================

export async function adminLogin(username: string, password: string): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/admin/login', {
        username,
        password,
    });

    saveToken(response.data.token);
    saveUser(response.data.user);

    return response.data;
}

export async function createGovernmentAccount(
    username: string,
    name: string,
    designation: string,
    password?: string
): Promise<{
    user: GovernmentAccount;
    credentials: { username: string; password: string };
}> {
    const token = getToken();
    const response = await axios.post(
        `${API_BASE_URL}/auth/admin/create-government`,
        { username, name, designation, password },
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );
    return response.data;
}

export async function getGovernmentList(): Promise<GovernmentAccount[]> {
    const token = getToken();
    const response = await axios.get(`${API_BASE_URL}/auth/admin/government-list`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    return response.data.users;
}

export async function toggleGovernmentStatus(id: string): Promise<void> {
    const token = getToken();
    await axios.put(
        `${API_BASE_URL}/auth/admin/government/${id}/toggle-status`,
        {},
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );
}

export async function deleteGovernmentAccount(id: string): Promise<void> {
    const token = getToken();
    await axios.delete(`${API_BASE_URL}/auth/admin/government/${id}`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
}

export async function getGovernmentQRCode(id: string): Promise<string> {
    const token = getToken();
    const response = await axios.get(`${API_BASE_URL}/auth/government/${id}/qr-code`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    return response.data.qrCode;
}

// ===================================
// LOGOUT
// ===================================

export function logout(): void {
    removeToken();
    removeUser();
}
