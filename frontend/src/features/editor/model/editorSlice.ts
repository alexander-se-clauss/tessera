import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '../../../app/store'
import type { EditorTab, EntryPoint, EventType, SelectedCell } from './types'

type EditorState = {
  activeProjectId: number | null
  activeMapId: number | null
  activeTilesetId: number | null
  activeTab: EditorTab
  selectedTileIndex: number | null
  selectedCell: SelectedCell | null
  selectedEventId: number | null
  selectedObjectId: string | null
  selectedEventTypeForPlacement: EventType | null
  temporaryEntryPoint: EntryPoint | null
  activeGroupId: number | null
}

const initialState: EditorState = {
  activeProjectId: null,
  activeMapId: null,
  activeTilesetId: null,
  activeTab: 'background',
  selectedTileIndex: null,
  selectedCell: null,
  selectedEventId: null,
  selectedObjectId: null,
  selectedEventTypeForPlacement: null,
  temporaryEntryPoint: null,
  activeGroupId: null,
}

const editorSlice = createSlice({
  name: 'editor',
  initialState,
  reducers: {
    setActiveProjectId(state, action: PayloadAction<number | null>) {
      state.activeProjectId = action.payload
      state.activeMapId = null
      state.activeTilesetId = null
      state.selectedTileIndex = null
      state.selectedCell = null
      state.selectedEventId = null
      state.selectedObjectId = null
      state.activeGroupId = null
    },
    setActiveMapId(state, action: PayloadAction<number | null>) {
      state.activeMapId = action.payload
      state.selectedCell = null
      state.selectedEventId = null
      state.selectedObjectId = null
    },
    setActiveTilesetId(state, action: PayloadAction<number | null>) {
      state.activeTilesetId = action.payload
      state.selectedTileIndex = null
    },
    setActiveTab(state, action: PayloadAction<EditorTab>) {
      state.activeTab = action.payload
      state.selectedEventId = action.payload === 'events' ? state.selectedEventId : null
      state.selectedObjectId = action.payload === 'objects' ? state.selectedObjectId : null
    },
    setSelectedTileIndex(state, action: PayloadAction<number | null>) {
      state.selectedTileIndex = action.payload
    },
    setSelectedCell(state, action: PayloadAction<SelectedCell | null>) {
      state.selectedCell = action.payload
    },
    setSelectedEventId(state, action: PayloadAction<number | null>) {
      state.selectedEventId = action.payload
    },
    setSelectedObjectId(state, action: PayloadAction<string | null>) {
      state.selectedObjectId = action.payload
    },
    setSelectedEventTypeForPlacement(state, action: PayloadAction<EventType | null>) {
      state.selectedEventTypeForPlacement = action.payload
    },
    setTemporaryEntryPoint(state, action: PayloadAction<EntryPoint | null>) {
      state.temporaryEntryPoint = action.payload
    },
    setActiveGroupId(state, action: PayloadAction<number | null>) {
      state.activeGroupId = action.payload
      state.selectedCell = null
      state.selectedEventId = null
      state.selectedObjectId = null
    },
    clearProjectSelection(state) {
      state.activeProjectId = null
      state.activeMapId = null
      state.activeTilesetId = null
      state.selectedTileIndex = null
      state.selectedCell = null
      state.selectedEventId = null
      state.selectedObjectId = null
      state.selectedEventTypeForPlacement = null
      state.temporaryEntryPoint = null
      state.activeGroupId = null
    },
  },
})

export const {
  setActiveProjectId,
  setActiveMapId,
  setActiveTilesetId,
  setActiveTab,
  setSelectedTileIndex,
  setSelectedCell,
  setSelectedEventId,
  setSelectedObjectId,
  setSelectedEventTypeForPlacement,
  setTemporaryEntryPoint,
  setActiveGroupId,
  clearProjectSelection,
} = editorSlice.actions

export const editorReducer = editorSlice.reducer

export const selectActiveProjectId = (state: RootState) => state.editor.activeProjectId
export const selectActiveMapId = (state: RootState) => state.editor.activeMapId
export const selectActiveTilesetId = (state: RootState) => state.editor.activeTilesetId
export const selectActiveTab = (state: RootState) => state.editor.activeTab
export const selectSelectedTileIndex = (state: RootState) => state.editor.selectedTileIndex
export const selectSelectedCell = (state: RootState) => state.editor.selectedCell
export const selectSelectedEventId = (state: RootState) => state.editor.selectedEventId
export const selectSelectedObjectId = (state: RootState) => state.editor.selectedObjectId
export const selectSelectedEventTypeForPlacement = (state: RootState) => state.editor.selectedEventTypeForPlacement
export const selectTemporaryEntryPoint = (state: RootState) => state.editor.temporaryEntryPoint
export const selectActiveGroupId = (state: RootState) => state.editor.activeGroupId
