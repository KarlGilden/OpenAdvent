import { useAuth } from '@clerk/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { ApiError } from '../api/useFetch'

function createSessionCache(sessionId: string | null) {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) =>
          failureCount < 2 && !(error instanceof ApiError && error.status < 500),
      },
      mutations: { retry: false },
    },
  })
  return { client, key: sessionId ?? 'signed-out' }
}

export function SessionQueryProvider({ children }: { children: ReactNode }) {
  const { sessionId } = useAuth()
  const cache = useMemo(() => createSessionCache(sessionId ?? null), [sessionId])
  const previousClient = useRef(cache.client)

  useEffect(() => {
    if (previousClient.current !== cache.client) {
      previousClient.current.clear()
      previousClient.current = cache.client
    }
  }, [cache.client])

  return <QueryClientProvider key={cache.key} client={cache.client}>{children}</QueryClientProvider>
}
