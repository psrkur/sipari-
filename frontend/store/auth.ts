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
        // Geçici olarak test kullanıcısı oluştur
        const testUser: User = {
          id: 1,
          email: email,
          name: 'Test Kullanıcı',
          phone: '0555 123 45 67',
          address: 'Test Adres',
          role: 'customer',
          branchId: null
        }
        const testToken = 'test-token-' + Date.now()
        
        // Kullanıcıyı store'a kaydet
        set({ user: testUser, token: testToken })
      },
      register: async (name: string, email: string, phone: string, password: string) => {
        // Geçici olarak test kullanıcısı oluştur
        const testUser: User = {
          id: 1,
          email: email,
          name: name,
          phone: phone,
          address: '',
          role: 'customer',
          branchId: null
        }
        const testToken = 'test-token-' + Date.now()
        
        // Kullanıcıyı store'a kaydet
        set({ user: testUser, token: testToken })
      },
      logout: () => set({ user: null, token: null }),
    }),
    {
      name: 'auth-storage',
    }
  )
) 