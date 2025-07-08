import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface CartItem {
  id: number
  name: string
  price: number
  quantity: number
  description: string
  category: string
}

interface CartState {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (id: number) => void
  updateQuantity: (id: number, quantity: number) => void
  clearCart: () => void
  getTotal: () => number
  getItemCount: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
  items: [],
  
  addItem: (item: CartItem) => {
    set((state) => {
      const existingItem = state.items.find(i => i.id === item.id)
      if (existingItem) {
        return {
          items: state.items.map(i => 
            i.id === item.id 
              ? { ...i, quantity: i.quantity + item.quantity }
              : i
          )
        }
      }
      return { items: [...state.items, item] }
    })
  },
  
  removeItem: (id: number) => {
    set((state) => ({
      items: state.items.filter(item => item.id !== id)
    }))
  },
  
  updateQuantity: (id: number, quantity: number) => {
    set((state) => ({
      items: state.items.map(item => 
        item.id === id ? { ...item, quantity } : item
      )
    }))
  },
  
  clearCart: () => {
    set({ items: [] })
  },
  
  getTotal: () => {
    const { items } = get()
    return items.reduce((total, item) => total + (item.price * item.quantity), 0)
  },
  
  getItemCount: () => {
    const { items } = get()
    return items.reduce((count, item) => count + item.quantity, 0)
  }
}),
    {
      name: 'cart-storage',
    }
  )
) 