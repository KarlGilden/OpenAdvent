import { useAuth } from '@clerk/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../queryKeys'
import { useFetch } from '../useFetch'
import type { DoorContent } from '../types'

export function useUpdateDoor(adventId: string, timeZone: string) {
  const { sessionId = null } = useAuth()
  const client = useQueryClient()
  const request = useFetch()

  return useMutation({
    mutationFn: ({ day, content }: DoorContent) => request<DoorContent>({
      path: `/api/advent/${encodeURIComponent(adventId)}/days/${day}`,
      method: 'PATCH',
      body: { content, timeZone },
    }),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: queryKeys.editor(sessionId, adventId) }),
        client.invalidateQueries({ queryKey: queryKeys.calendar(sessionId, adventId) }),
      ])
    },
  })
}
