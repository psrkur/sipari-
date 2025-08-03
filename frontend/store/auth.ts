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
  login: (user: User, token: string) => void
  register: (name: string, email: string, phone: string, password: string) => Promise<void>
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      login: (user: User, token: string) => set({ user, token }),
      register: async (name: string, email: string, phone: string, password: string) => {
        // Bu fonksiyon backend'de register API'si çağrıldıktan sonra kullanılacak
        // Şimdilik sadece interface'i tamamlamak için boş bırakıyoruz
        throw new Error('Register function not implemented')
      },
      logout: () => set({ user: null, token: null }),
    }),
    {
      name: 'auth-storage',
    }
  )
) 