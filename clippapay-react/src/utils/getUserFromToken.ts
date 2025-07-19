// // File: src/utils/getUserFromToken.ts



import { jwtDecode } from 'jwt-decode';

interface JwtPayload {
  id:           string;
  role:         string;
  isSuperAdmin?: boolean;
  email:        string;
  firstName: string;
  company: string;
}

export function getUserFromToken(): JwtPayload | null {
  const token = localStorage.getItem('token');
  if (!token) return null;

  try {
    const decoded = jwtDecode<JwtPayload & { exp?: number }>(token);
    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      // Token is expired
      localStorage.removeItem('token');
      return null;
    }
    return decoded;
  } catch {
    console.error('Invalid token');
    localStorage.removeItem('token');
    return null;
  }
}
