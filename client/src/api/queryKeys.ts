const calendar = (sessionId: string | null, adventId: string) => [sessionId, 'calendar', adventId] as const
const editor = (sessionId: string | null, adventId: string) => [sessionId, 'editor', adventId] as const

export const queryKeys = {
  profile: (sessionId: string | null) => [sessionId, 'profile'] as const,
  memberships: (sessionId: string | null) => [sessionId, 'memberships'] as const,
  calendar,
  calendarView: (sessionId: string | null, adventId: string, timeZone: string) =>
    [...calendar(sessionId, adventId), timeZone] as const,
  editor,
  editorDays: (sessionId: string | null, adventId: string, timeZone: string) =>
    [...editor(sessionId, adventId), timeZone] as const,
}
