export interface RequestOptions {
  path: string
  method: 'GET' | 'POST' | 'PATCH'
  body?: object
  signal?: AbortSignal
}

export interface CurrentUserProfile {
  name: string
  email: string
}

export interface CalendarSummary {
  id: string
  name: string
  year: number
}

export interface MemberCalendar extends CalendarSummary {
  isAdmin: boolean
}

export interface DoorContent {
  day: number
  content: string
}

export interface CalendarView extends MemberCalendar {
  days: Array<DoorContent & { openedAt: string | null }>
}

export interface EditorDay extends DoorContent {
  isEditable: boolean
}

export interface CreateCalendarInput {
  name: string
  year: number
  contents?: string[]
}

export interface CreatedCalendar extends CalendarSummary {
  inviteUrl: string
}

export interface JoinedCalendar {
  adventId: string
}
