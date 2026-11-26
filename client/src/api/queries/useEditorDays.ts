import { useAuth } from '@clerk/react'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../queryKeys'
import { useFetch } from '../useFetch'
import type { EditorDay } from '../types'

export function useEditorDays(adventId: string, timeZone: string, isAdmin: boolean) {
  const { sessionId = null } = useAuth()
  const request = useFetch()

  return useQuery({
    queryKey: queryKeys.editorDays(sessionId, adventId, timeZone),
    enabled: Boolean(sessionId && adventId && timeZone && isAdmin),
    queryFn: ({ signal }) => request<EditorDay[]>({
      path: `/api/advent/${encodeURIComponent(adventId)}/days?${new URLSearchParams({ timeZone })}`,
      method: 'GET',
      signal,
    }),
  })
}
