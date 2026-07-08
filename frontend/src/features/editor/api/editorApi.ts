import { createApi } from '@reduxjs/toolkit/query/react'
import type { RootState } from '../../../app/store'
import { clearSession } from '../../auth/model/authSlice'
import { clearStoredToken } from '../../auth/model/authStorage'
import { clearProjectSelection } from '../model/editorSlice'
import type {
  AssetImport,
  AssetImportUploadRequest,
  AddTilesRequest,
  AddTilesResponse,
  AssignTileToGroupRequest,
  AssignMapToGroupRequest,
  EventRequest,
  GameMap,
  GroupNeighbors,
  MapEvent,
  MapCreateRequest,
  MapGroup,
  MapGroupRequest,
  MapUpdateRequest,
  MoveTileToTilesetGroupRequest,
  ObjectType,
  ObjectTypeRequest,
  Project,
  ProjectRequest,
  RestitchTilesetTileRequest,
  SaveTilesetRequest,
  Tileset,
  TilesetGroupRequest,
  TilesetRequest,
} from '../model/types'
import { createApiBaseQuery } from '../../../app/api/apiBaseQuery'

export const editorApi = createApi({
  reducerPath: 'editorApi',
  tagTypes: ['Project', 'Map', 'MapGroup', 'Tileset', 'Event', 'AssetImport', 'ObjectType'],
  baseQuery: createApiBaseQuery({ baseUrl: '/api' }),
  endpoints: (builder) => ({
    listProjects: builder.query<Project[], void>({
      query: () => '/projects',
      providesTags: (result) =>
        result
          ? [...result.map((project) => ({ type: 'Project' as const, id: project.id })), { type: 'Project', id: 'LIST' }]
          : [{ type: 'Project', id: 'LIST' }],
    }),
    createProject: builder.mutation<Project, ProjectRequest>({
      query: (body) => ({
        url: '/projects',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Project', id: 'LIST' }],
    }),
    getProject: builder.query<Project, number>({
      query: (projectId) => `/projects/${projectId}`,
      providesTags: (_result, _error, projectId) => [{ type: 'Project', id: projectId }],
    }),
    updateProject: builder.mutation<Project, { projectId: number; body: ProjectRequest }>({
      query: ({ projectId, body }) => ({
        url: `/projects/${projectId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: 'Project', id: projectId },
        { type: 'Project', id: 'LIST' },
      ],
    }),
    deleteProject: builder.mutation<void, number>({
      query: (projectId) => ({
        url: `/projects/${projectId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, projectId) => [
        { type: 'Project', id: projectId },
        { type: 'Project', id: 'LIST' },
        { type: 'Map', id: `PROJECT-${projectId}` },
        { type: 'MapGroup', id: `PROJECT-${projectId}` },
        { type: 'Tileset', id: `PROJECT-${projectId}` },
      ],
    }),
    listMaps: builder.query<GameMap[], number>({
      query: (projectId) => `/projects/${projectId}/maps`,
      providesTags: (result, _error, projectId) =>
        result
          ? [...result.map((map) => ({ type: 'Map' as const, id: map.id })), { type: 'Map', id: `PROJECT-${projectId}` }]
          : [{ type: 'Map', id: `PROJECT-${projectId}` }],
    }),
    createMap: builder.mutation<GameMap, { projectId: number; body: MapCreateRequest }>({
      query: ({ projectId, body }) => ({
        url: `/projects/${projectId}/maps`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { projectId }) => [{ type: 'Map', id: `PROJECT-${projectId}` }],
    }),
    getMap: builder.query<GameMap, number>({
      query: (mapId) => `/maps/${mapId}`,
      providesTags: (_result, _error, mapId) => [{ type: 'Map', id: mapId }],
    }),
    updateMap: builder.mutation<GameMap, { mapId: number; body: MapUpdateRequest }>({
      query: ({ mapId, body }) => ({
        url: `/maps/${mapId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { mapId }) => [{ type: 'Map', id: mapId }],
    }),
    deleteMap: builder.mutation<void, { mapId: number; projectId: number }>({
      query: ({ mapId }) => ({
        url: `/maps/${mapId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { mapId, projectId }) => [
        { type: 'Map', id: mapId },
        { type: 'Map', id: `PROJECT-${projectId}` },
        { type: 'Event', id: `MAP-${mapId}` },
      ],
    }),
    assignMapToGroup: builder.mutation<GameMap, { mapId: number; projectId: number; body: AssignMapToGroupRequest }>({
      query: ({ mapId, body }) => ({
        url: `/maps/${mapId}/group`,
        method: 'PUT',
        body,
      }),
      async onQueryStarted({ mapId, projectId, body }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          editorApi.util.updateQueryData('listMaps', projectId, (draft) => {
            const map = draft.find((m) => m.id === mapId)
            if (map) {
              map.mapGroupId = body.mapGroupId
              map.gridCol = body.gridCol
              map.gridRow = body.gridRow
            }
          }),
        )
        try {
          await queryFulfilled
        } catch {
          patch.undo()
        }
      },
      invalidatesTags: (_result, _error, { mapId, projectId }) => [
        { type: 'Map', id: mapId },
        { type: 'Map', id: `PROJECT-${projectId}` },
      ],
    }),
    listMapGroups: builder.query<MapGroup[], number>({
      query: (projectId) => `/projects/${projectId}/map-groups`,
      providesTags: (result, _error, projectId) =>
        result
          ? [
              ...result.map((g) => ({ type: 'MapGroup' as const, id: g.id })),
              { type: 'MapGroup', id: `PROJECT-${projectId}` },
            ]
          : [{ type: 'MapGroup', id: `PROJECT-${projectId}` }],
    }),
    createMapGroup: builder.mutation<MapGroup, { projectId: number; body: MapGroupRequest }>({
      query: ({ projectId, body }) => ({
        url: `/projects/${projectId}/map-groups`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: 'MapGroup', id: `PROJECT-${projectId}` },
        { type: 'Project', id: projectId },
      ],
    }),
    getMapGroup: builder.query<MapGroup, number>({
      query: (groupId) => `/map-groups/${groupId}`,
      providesTags: (_result, _error, groupId) => [{ type: 'MapGroup', id: groupId }],
    }),
    updateMapGroup: builder.mutation<MapGroup, { groupId: number; projectId: number; body: MapGroupRequest }>({
      query: ({ groupId, body }) => ({
        url: `/map-groups/${groupId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { groupId, projectId }) => [
        { type: 'MapGroup', id: groupId },
        { type: 'MapGroup', id: `PROJECT-${projectId}` },
        { type: 'Project', id: projectId },
      ],
    }),
    deleteMapGroup: builder.mutation<void, { groupId: number; projectId: number }>({
      query: ({ groupId }) => ({
        url: `/map-groups/${groupId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { groupId, projectId }) => [
        { type: 'MapGroup', id: groupId },
        { type: 'MapGroup', id: `PROJECT-${projectId}` },
        { type: 'Map', id: `PROJECT-${projectId}` },
        { type: 'Project', id: projectId },
      ],
    }),
    getGroupNeighbors: builder.query<GroupNeighbors, { groupId: number; col: number; row: number }>({
      query: ({ groupId, col, row }) => `/map-groups/${groupId}/neighbors?col=${col}&row=${row}`,
      providesTags: (_result, _error, { groupId }) => [{ type: 'MapGroup', id: groupId }],
    }),
    listTilesets: builder.query<Tileset[], number>({
      query: (projectId) => `/projects/${projectId}/tilesets`,
      providesTags: (result, _error, projectId) =>
        result
          ? [
              ...result.map((tileset) => ({ type: 'Tileset' as const, id: tileset.id })),
              { type: 'Tileset', id: `PROJECT-${projectId}` },
            ]
          : [{ type: 'Tileset', id: `PROJECT-${projectId}` }],
    }),
    createAssetImport: builder.mutation<AssetImport, AssetImportUploadRequest>({
      async queryFn({ projectId, name, assetType, file }, api) {
        const token = (api.getState() as RootState).auth.token
        const formData = new FormData()
        formData.append('name', name)
        formData.append('assetType', assetType)
        formData.append('file', file)

        try {
          const response = await fetch(`/api/projects/${projectId}/asset-imports`, {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            body: formData,
          })

          if (!response.ok) {
            const errorBody = await response.json().catch(() => ({ message: 'Asset import failed.' }))

            if (response.status === 401 || response.status === 403) {
              clearStoredToken()
              api.dispatch(clearSession())
              api.dispatch(clearProjectSelection())
            }

            return {
              error: {
                status: response.status,
                data: errorBody,
              },
            }
          }

          const data = (await response.json()) as AssetImport
          return { data }
        } catch (error) {
          return {
            error: {
              status: 'FETCH_ERROR',
              error: error instanceof Error ? error.message : 'Asset import failed.',
            },
          }
        }
      },
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: 'AssetImport', id: 'LIST' },
        { type: 'Tileset', id: `PROJECT-${projectId}` },
      ],
    }),
    getAssetImport: builder.query<AssetImport, number>({
      query: (importId) => `/asset-imports/${importId}`,
      providesTags: (_result, _error, importId) => [{ type: 'AssetImport', id: importId }],
    }),
    saveAssetImportAsTileset: builder.mutation<Tileset, { importId: number; body: SaveTilesetRequest; projectId: number }>({
      query: ({ importId, body }) => ({
        url: `/asset-imports/${importId}/save-as-tileset`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { importId, projectId }) => [
        { type: 'AssetImport', id: importId },
        { type: 'Tileset', id: `PROJECT-${projectId}` },
      ],
    }),
    createTileset: builder.mutation<Tileset, { projectId: number; body: TilesetRequest }>({
      query: ({ projectId, body }) => ({
        url: `/projects/${projectId}/tilesets`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { projectId }) => [{ type: 'Tileset', id: `PROJECT-${projectId}` }],
    }),
    addTilesToTileset: builder.mutation<AddTilesResponse, AddTilesRequest & { projectId: number }>({
      async queryFn({ tilesetId, sourceImage, tiles }, api) {
        const token = (api.getState() as RootState).auth.token
        const formData = new FormData()
        formData.append('sourceImage', sourceImage)
        formData.append('tiles', JSON.stringify(tiles))
        try {
          const response = await fetch(`/api/tilesets/${tilesetId}/tiles`, {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            body: formData,
          })
          if (!response.ok) return { error: { status: response.status, data: await response.text() } }
          return { data: (await response.json()) as AddTilesResponse }
        } catch (error) {
          return { error: { status: 'FETCH_ERROR', error: error instanceof Error ? error.message : 'Tile import failed.' } }
        }
      },
      invalidatesTags: (_result, _error, { tilesetId, projectId }) => [
        { type: 'Tileset', id: tilesetId },
        { type: 'Tileset', id: `PROJECT-${projectId}` },
      ],
    }),
    updateTilesetGroups: builder.mutation<Tileset, { tilesetId: number; projectId: number; groups: Array<Record<string, unknown>> }>({
      query: ({ tilesetId, groups }) => ({
        url: `/tilesets/${tilesetId}/groups`,
        method: 'PUT',
        body: groups,
      }),
      invalidatesTags: (_result, _error, { tilesetId, projectId }) => [
        { type: 'Tileset', id: tilesetId },
        { type: 'Tileset', id: `PROJECT-${projectId}` },
      ],
    }),
    createTilesetGroup: builder.mutation<Tileset, { tilesetId: number; projectId: number; body: TilesetGroupRequest }>({
      query: ({ tilesetId, body }) => ({
        url: `/tilesets/${tilesetId}/groups`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { tilesetId, projectId }) => [
        { type: 'Tileset', id: tilesetId },
        { type: 'Tileset', id: `PROJECT-${projectId}` },
      ],
    }),
    updateTilesetGroup: builder.mutation<Tileset, { tilesetId: number; groupId: string; projectId: number; body: TilesetGroupRequest }>({
      query: ({ tilesetId, groupId, body }) => ({
        url: `/tilesets/${tilesetId}/groups/${groupId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { tilesetId, projectId }) => [
        { type: 'Tileset', id: tilesetId },
        { type: 'Tileset', id: `PROJECT-${projectId}` },
      ],
    }),
    deleteTilesetGroup: builder.mutation<Tileset, { tilesetId: number; groupId: string; projectId: number }>({
      query: ({ tilesetId, groupId }) => ({
        url: `/tilesets/${tilesetId}/groups/${groupId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { tilesetId, projectId }) => [
        { type: 'Tileset', id: tilesetId },
        { type: 'Tileset', id: `PROJECT-${projectId}` },
      ],
    }),
    assignTileToTilesetGroup: builder.mutation<Tileset, AssignTileToGroupRequest>({
      async queryFn({ tilesetId, groupId, sourceImage, tile }, api) {
        const token = (api.getState() as RootState).auth.token
        const formData = new FormData()
        formData.append('sourceImage', sourceImage)
        formData.append('tile', JSON.stringify(tile))
        try {
          const response = await fetch(`/api/tilesets/${tilesetId}/groups/${groupId}/tiles`, {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            body: formData,
          })
          if (!response.ok) return { error: { status: response.status, data: await response.text() } }
          return { data: (await response.json()) as Tileset }
        } catch (error) {
          return { error: { status: 'FETCH_ERROR', error: error instanceof Error ? error.message : 'Tile assignment failed.' } }
        }
      },
      invalidatesTags: (_result, _error, { tilesetId, projectId }) => [
        { type: 'Tileset', id: tilesetId },
        { type: 'Tileset', id: `PROJECT-${projectId}` },
      ],
      async onQueryStarted({ projectId }, { dispatch, queryFulfilled }) {
        try {
          const { data: updatedTileset } = await queryFulfilled
          dispatch(editorApi.util.updateQueryData('listTilesets', projectId, (draft) => {
            const index = draft.findIndex((tileset) => tileset.id === updatedTileset.id)
            if (index >= 0) draft[index] = updatedTileset
          }))
        } catch {
          // Refetch invalidation handles failures.
        }
      },
    }),
    restitchTilesetTile: builder.mutation<Tileset, RestitchTilesetTileRequest>({
      async queryFn({ tilesetId, col, row, sourceImage, tile }, api) {
        const token = (api.getState() as RootState).auth.token
        const formData = new FormData()
        formData.append('sourceImage', sourceImage)
        formData.append('tile', JSON.stringify(tile))
        try {
          const response = await fetch(`/api/tilesets/${tilesetId}/tiles/${col}/${row}`, {
            method: 'PUT',
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            body: formData,
          })
          if (!response.ok) return { error: { status: response.status, data: await response.text() } }
          return { data: (await response.json()) as Tileset }
        } catch (error) {
          return { error: { status: 'FETCH_ERROR', error: error instanceof Error ? error.message : 'Tile restitch failed.' } }
        }
      },
      invalidatesTags: (_result, _error, { tilesetId, projectId }) => [
        { type: 'Tileset', id: tilesetId },
        { type: 'Tileset', id: `PROJECT-${projectId}` },
      ],
      async onQueryStarted({ projectId }, { dispatch, queryFulfilled }) {
        try {
          const { data: updatedTileset } = await queryFulfilled
          dispatch(editorApi.util.updateQueryData('listTilesets', projectId, (draft) => {
            const index = draft.findIndex((tileset) => tileset.id === updatedTileset.id)
            if (index >= 0) draft[index] = updatedTileset
          }))
        } catch {
          // Refetch invalidation handles failures.
        }
      },
    }),
    removeTileFromTilesetGroup: builder.mutation<Tileset, { tilesetId: number; groupId: string; projectId: number; col: number; row: number }>({
      query: ({ tilesetId, groupId, col, row }) => ({
        url: `/tilesets/${tilesetId}/groups/${groupId}/tiles/${col}/${row}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { tilesetId, projectId }) => [
        { type: 'Tileset', id: tilesetId },
        { type: 'Tileset', id: `PROJECT-${projectId}` },
      ],
    }),
    moveTileToTilesetGroup: builder.mutation<Tileset, MoveTileToTilesetGroupRequest>({
      query: ({ sourceTilesetId, sourceGroupId, col, row, targetTilesetId, targetGroupId, duplicate }) => ({
        url: `/tilesets/${sourceTilesetId}/groups/${sourceGroupId}/tiles/${col}/${row}/move`,
        method: 'POST',
        body: { targetTilesetId, targetGroupId, duplicate: Boolean(duplicate) },
      }),
      invalidatesTags: (_result, _error, { sourceTilesetId, targetTilesetId, projectId }) => [
        { type: 'Tileset', id: sourceTilesetId },
        { type: 'Tileset', id: targetTilesetId },
        { type: 'Tileset', id: `PROJECT-${projectId}` },
      ],
    }),
    getTileset: builder.query<Tileset, number>({
      query: (tilesetId) => `/tilesets/${tilesetId}`,
      providesTags: (_result, _error, tilesetId) => [{ type: 'Tileset', id: tilesetId }],
    }),
    updateTileset: builder.mutation<Tileset, { tilesetId: number; body: TilesetRequest }>({
      query: ({ tilesetId, body }) => ({
        url: `/tilesets/${tilesetId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { tilesetId }) => [{ type: 'Tileset', id: tilesetId }],
    }),
    deleteTileset: builder.mutation<void, { tilesetId: number; projectId: number }>({
      query: ({ tilesetId }) => ({
        url: `/tilesets/${tilesetId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { tilesetId, projectId }) => [
        { type: 'Tileset', id: tilesetId },
        { type: 'Tileset', id: `PROJECT-${projectId}` },
      ],
    }),
    listEvents: builder.query<MapEvent[], number>({
      query: (mapId) => `/maps/${mapId}/events`,
      providesTags: (result, _error, mapId) =>
        result
          ? [...result.map((event) => ({ type: 'Event' as const, id: event.id })), { type: 'Event', id: `MAP-${mapId}` }]
          : [{ type: 'Event', id: `MAP-${mapId}` }],
    }),
    createEvent: builder.mutation<MapEvent, { mapId: number; body: EventRequest }>({
      query: ({ mapId, body }) => ({
        url: `/maps/${mapId}/events`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { mapId }) => [{ type: 'Event', id: `MAP-${mapId}` }],
    }),
    updateEvent: builder.mutation<MapEvent, { eventId: number; mapId: number; body: EventRequest }>({
      query: ({ eventId, body }) => ({
        url: `/events/${eventId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { eventId, mapId }) => [
        { type: 'Event', id: eventId },
        { type: 'Event', id: `MAP-${mapId}` },
      ],
    }),
    deleteEvent: builder.mutation<void, { eventId: number; mapId: number }>({
      query: ({ eventId }) => ({
        url: `/events/${eventId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { eventId, mapId }) => [
        { type: 'Event', id: eventId },
        { type: 'Event', id: `MAP-${mapId}` },
      ],
    }),
    listObjectTypes: builder.query<ObjectType[], { projectId: number; tilesetId?: number }>({
      query: ({ projectId, tilesetId }) => {
        const url = `/projects/${projectId}/object-types`
        return tilesetId != null ? `${url}?tilesetId=${tilesetId}` : url
      },
      providesTags: (result, _e, { projectId }) =>
        result
          ? [...result.map((o) => ({ type: 'ObjectType' as const, id: o.id })), { type: 'ObjectType' as const, id: `PROJECT-${projectId}` }]
          : [{ type: 'ObjectType' as const, id: `PROJECT-${projectId}` }],
    }),
    createObjectType: builder.mutation<ObjectType, { projectId: number; body: ObjectTypeRequest }>({
      query: ({ projectId, body }) => ({ url: `/projects/${projectId}/object-types`, method: 'POST', body }),
      invalidatesTags: (_r, _e, { projectId }) => [{ type: 'ObjectType' as const, id: `PROJECT-${projectId}` }],
    }),
    getObjectType: builder.query<ObjectType, string>({
      query: (id) => `/object-types/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'ObjectType' as const, id }],
    }),
    updateObjectType: builder.mutation<ObjectType, { id: string; projectId: number; body: ObjectTypeRequest }>({
      query: ({ id, body }) => ({ url: `/object-types/${id}`, method: 'PUT', body }),
      invalidatesTags: (_r, _e, { id, projectId }) => [
        { type: 'ObjectType' as const, id },
        { type: 'ObjectType' as const, id: `PROJECT-${projectId}` },
      ],
    }),
    deleteObjectType: builder.mutation<void, { id: string; projectId: number }>({
      query: ({ id }) => ({ url: `/object-types/${id}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, { id, projectId }) => [
        { type: 'ObjectType' as const, id },
        { type: 'ObjectType' as const, id: `PROJECT-${projectId}` },
      ],
    }),
  }),
})

export const {
  useListProjectsQuery,
  useCreateProjectMutation,
  useGetProjectQuery,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
  useListMapsQuery,
  useCreateMapMutation,
  useGetMapQuery,
  useUpdateMapMutation,
  useDeleteMapMutation,
  useAssignMapToGroupMutation,
  useListMapGroupsQuery,
  useCreateMapGroupMutation,
  useGetMapGroupQuery,
  useUpdateMapGroupMutation,
  useDeleteMapGroupMutation,
  useGetGroupNeighborsQuery,
  useListTilesetsQuery,
  useCreateAssetImportMutation,
  useGetAssetImportQuery,
  useSaveAssetImportAsTilesetMutation,
  useCreateTilesetMutation,
  useAddTilesToTilesetMutation,
  useUpdateTilesetGroupsMutation,
  useCreateTilesetGroupMutation,
  useUpdateTilesetGroupMutation,
  useDeleteTilesetGroupMutation,
  useAssignTileToTilesetGroupMutation,
  useRestitchTilesetTileMutation,
  useRemoveTileFromTilesetGroupMutation,
  useMoveTileToTilesetGroupMutation,
  useGetTilesetQuery,
  useUpdateTilesetMutation,
  useDeleteTilesetMutation,
  useListEventsQuery,
  useCreateEventMutation,
  useUpdateEventMutation,
  useDeleteEventMutation,
  useListObjectTypesQuery,
  useCreateObjectTypeMutation,
  useGetObjectTypeQuery,
  useUpdateObjectTypeMutation,
  useDeleteObjectTypeMutation,
} = editorApi
