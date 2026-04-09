import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

const useSessionStore = create(
  persist(
    (set) => ({
      sessionId: null,
      exerciseYear: null,
      bufferHorizonMonths: null,

      setSession: (session) => set({
        sessionId: session.id,
        exerciseYear: session.exerciseYear,
        bufferHorizonMonths: session.bufferHorizonMonths,
      }),

      clearSession: () => set({
        sessionId: null,
        exerciseYear: null,
        bufferHorizonMonths: null,
      }),
    }),
    {
      name: 'impumate-session',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
)

export default useSessionStore
