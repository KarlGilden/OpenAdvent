import { useAuth } from '@clerk/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../queryKeys'
import { useFetch } from '../useFetch'
import type { CreateCalendarInput, CreatedCalendar } from '../types'

export function useCreateCalendar() {
  const { sessionId = null } = useAuth()
  const client = useQueryClient()
  const request = useFetch()

  return useMutation({
    mutationFn: (body: CreateCalendarInput) =>
      request<CreatedCalendar>({ path: '/api/advent', method: 'POST', body }),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.memberships(sessionId) }),
  })
}
