/**
 * Last-Write-Wins conflict resolution (Constitution II).
 *
 * The server is the source of truth: when timestamps tie, the remote (server)
 * record wins. A `conflict` flag is set whenever both sides diverged so the UI
 * can signal it instead of silently overwriting (`conflict=true`).
 */
export interface SyncRecordLike {
  updatedAt: string
}

export interface ConflictResolution<T> {
  winner: T
  conflict: boolean
}

export function isNewer(a: string, b: string): boolean {
  return new Date(a).getTime() > new Date(b).getTime()
}

export function resolveLWW<T extends SyncRecordLike>(
  local: T,
  remote: T,
): ConflictResolution<T> {
  const localNewer = isNewer(local.updatedAt, remote.updatedAt)
  return {
    winner: localNewer ? local : remote,
    conflict: local.updatedAt !== remote.updatedAt,
  }
}
