import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: number
  email: string
  name: string
  phone?: string | null
  address?: string | null
  role: string
  branchId?: number | null
}

interface AuthState {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, phone: string, password: string) => Promise<void>
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      login: async (email: string, password: string) => {
        try {
          // API base URL'yi al
          const apiBaseUrl = process.env.NODE_ENV === 'development' 
            ? 'http://localhost:3001' 
            : 'https://yemek5-backend.onrender.com';
          
          const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Giriş yapılamadı');
          }

          const data = await response.json();
          console.log('✅ Login başarılı:', data);
          set({ user: data.user, token: data.token });
        } catch (error: any) {
          console.error('❌ Login hatası:', error);
          throw new Error(error.message || 'Giriş yapılamadı');
        }
      },
      register: async (name: string, email: string, phone: string, password: string) => {
        try {
          // API base URL'yi al
          const apiBaseUrl = process.env.NODE_ENV === 'development' 
            ? 'http://localhost:3001' 
            : 'https://yemek5-backend.onrender.com';
          
          const response = await fetch(`${apiBaseUrl}/api/auth/register`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, email, phone, password }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Kayıt oluşturulamadı');
          }

          const data = await response.json();
          console.log('✅ Register başarılı:', data);
          // Kayıt başarılı ama otomatik giriş yapmıyor, kullanıcı manuel giriş yapmalı
          throw new Error('Kayıt başarılı! Lütfen giriş yapın.');
        } catch (error: any) {
          console.error('❌ Register hatası:', error);
          throw new Error(error.message || 'Kayıt oluşturulamadı');
        }
      },
      logout: () => set({ user: null, token: null }),
    }),
    {
      name: 'auth-storage',
    }
  )
) 