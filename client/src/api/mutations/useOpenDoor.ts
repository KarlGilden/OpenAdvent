import { useAuth } from '@clerk/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../queryKeys'
import { useFetch } from '../useFetch'

export function useOpenDoor(adventId: string, timeZone: string) {
  const { sessionId = null } = useAuth()
  const client = useQueryClient()
  const request = useFetch()

  return useMutation({
    mutationFn: (day: number) => request({
      path: `/api/advent/${encodeURIComponent(adventId)}/days/${day}/open`,
      method: 'POST',
      body: { timeZone },
    }),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.calendar(sessionId, adventId) }),
  })
}
