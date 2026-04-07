import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useAuthStore = create(
  persist(
    (set) => ({
      userId: null,
      email: null,
      rfc: null,
      nombreCompleto: null,

      setUser: (user) => set({
        userId: user.id,
        email: user.email,
        rfc: user.rfc,
        nombreCompleto: user.nombreCompleto,
      }),

      clearUser: () => set({
        userId: null,
        email: null,
        rfc: null,
        nombreCompleto: null,
      }),
    }),
    {
      name: 'impumate-auth',
    },
  ),
)

export default useAuthStore
