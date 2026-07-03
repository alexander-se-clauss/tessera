import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '../../../app/store'

export type RecentProjectEntry = {
  id: number
  name: string
  lastOpenedAt: string
}

const STORAGE_KEY = 'tilecraft.recentProjects'
const MAX_RECENT_PROJECTS = 20

function readRecentProjects(): RecentProjectEntry[] {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return []
    }

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter((entry): entry is RecentProjectEntry => {
      return (
        typeof entry === 'object' &&
        entry !== null &&
        typeof entry.id === 'number' &&
        typeof entry.name === 'string' &&
        typeof entry.lastOpenedAt === 'string'
      )
    })
  } catch {
    return []
  }
}

export function writeRecentProjects(entries: RecentProjectEntry[]) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    // Ignore persistence failures.
  }
}

const recentProjectsSlice = createSlice({
  name: 'recentProjects',
  initialState: readRecentProjects(),
  reducers: {
    recordRecentProject(state, action: PayloadAction<{ id: number; name: string; lastOpenedAt?: string }>) {
      const { id, name, lastOpenedAt = new Date().toISOString() } = action.payload
      const next = state.filter((entry) => entry.id !== id)
      next.unshift({ id, name, lastOpenedAt })
      return next.slice(0, MAX_RECENT_PROJECTS)
    },
    removeRecentProject(state, action: PayloadAction<number>) {
      return state.filter((entry) => entry.id !== action.payload)
    },
  },
})

export const { recordRecentProject, removeRecentProject } = recentProjectsSlice.actions
export const recentProjectsReducer = recentProjectsSlice.reducer
export const selectRecentProjects = (state: RootState) => state.recentProjects
