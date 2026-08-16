import { useEffect, useState } from 'react'
import { Button, StateDot, type StateDotState } from '@deepseek-ai/dsh-client-ui-primitives'
import css from './UpdateSection.module.css'

/**
 * Update section component (Settings -> Update).
 *
 * Design language: identical to the stock settings rows (group column with
 * hairline separator, label-primary title, alias-token palette, official
 * Button/StateDot atoms) so the panel is indistinguishable from the rest of
 * the Settings panel under any theme, including Aqua.
 *
 * All state flows through the desktop preload bridge (`window.studioUpdate`),
 * which is exposed only by the DeepSeek Harness Studio desktop shell. In any
 * other environment the section renders a desktop-only notice.
 */

/** Mirrors desktop/src/shared/contracts.ts UpdatePhase. */
type UpdatePhase =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'up-to-date'
  | 'error'
  | 'unsupported'

interface UpdateStatus {
  phase: UpdatePhase
  currentVersion: string
  availableVersion?: string
  percent?: number
  message?: string
  manual: boolean
}

interface StudioUpdateApi {
  check(): Promise<unknown>
  getStatus(): Promise<UpdateStatus>
  install(): Promise<unknown>
  onStatus(callback: (status: UpdateStatus) => void): () => void
}

declare global {
  interface Window {
    studioUpdate?: StudioUpdateApi
  }
}

/** Nothing required from the composition: state flows through window.studioUpdate. */
export interface UpdateSectionInjected {
  children?: never
}

function dotState(phase: UpdatePhase): StateDotState {
  switch (phase) {
    case 'checking':
    case 'downloading':
      return 'ongoing'
    case 'downloaded':
    case 'up-to-date':
      return 'done'
    case 'error':
      return 'error'
    default:
      return 'warning'
  }
}

function statusText(phase: UpdatePhase, status?: UpdateStatus, zhLocale = true): string {
  const v = status?.availableVersion ?? ''
  switch (phase) {
    case 'checking':
      return zhLocale ? '正在检查更新…' : 'Checking for updates…'
    case 'available':
      return zhLocale ? `发现新版本 ${v}，正在后台下载…` : `New version ${v} found, downloading…`
    case 'downloading':
      return zhLocale
        ? `正在下载 ${v}（${Math.round(status?.percent ?? 0)}%）`
        : `Downloading ${v} (${Math.round(status?.percent ?? 0)}%)`
    case 'downloaded':
      return zhLocale ? `新版本 ${v} 已下载完成` : `New version ${v} is ready to install`
    case 'up-to-date':
      return zhLocale ? '已是最新版本' : 'You are up to date'
    case 'error':
      return zhLocale
        ? `更新失败：${status?.message ?? '未知错误'}`
        : `Update failed: ${status?.message ?? 'unknown error'}`
    case 'unsupported':
      return zhLocale ? '更新检查仅在安装版中可用' : 'Update checks are only available in installed builds'
    default:
      return zhLocale ? '尚未检查更新' : 'No update check yet'
  }
}

export function UpdateSection(_props: UpdateSectionInjected) {
  const api = typeof window !== 'undefined' ? window.studioUpdate : undefined
  const [status, setStatus] = useState<UpdateStatus | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const zhLocale =
    typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('zh')

  useEffect(() => {
    if (!api) return
    let disposed = false
    api
      .getStatus()
      .then((s) => {
        if (!disposed) setStatus(s)
      })
      .catch(() => {})
    const dispose = api.onStatus(s => setStatus(s))
    return () => {
      disposed = true
      dispose()
    }
  }, [])

  if (!api) {
    return (
      <div className={css.group}>
        <div className={css.title}>{zhLocale ? '更新' : 'Update'}</div>
        <p className={css.meta}>
          {zhLocale
            ? '更新功能仅在桌面版（DeepSeek Harness Studio）中可用。'
            : 'Updates are only available in the desktop build of DeepSeek Harness Studio.'}
        </p>
      </div>
    )
  }

  const phase = status?.phase ?? 'idle'
  const isBusy = busy || phase === 'checking' || phase === 'downloading'
  const check = async (): Promise<void> => {
    setBusy(true)
    try {
      await api.check()
    } finally {
      setBusy(false)
    }
  }
  const install = async (): Promise<void> => {
    setBusy(true)
    try {
      await api.install()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={css.group}>
      <div className={css.title}>{zhLocale ? '更新' : 'Update'}</div>

      <div className={css.statusRow}>
        <StateDot state={dotState(phase)} />
        <span className={css.statusText} data-phase={phase}>
          {statusText(phase, status, zhLocale)}
        </span>
      </div>

      <p className={css.meta}>
        {zhLocale ? '当前版本' : 'Current version'}：{status?.currentVersion ?? '…'}
        {status?.availableVersion
          ? `　${zhLocale ? '可用版本' : 'Available version'}：${status.availableVersion}`
          : ''}
      </p>

      {phase === 'downloading' ? (
        <div
          className={css.progress}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(status?.percent ?? 0)}
        >
          <div className={css.progressValue} style={{ width: `${status?.percent ?? 0}%` }} />
        </div>
      ) : null}

      <div className={css.actions}>
        <Button variant="primary" size="sm" disabled={isBusy} onClick={() => void check()}>
          {zhLocale ? '检查更新' : 'Check for Updates'}
        </Button>
        {phase === 'downloaded' ? (
          <Button variant="outline" size="sm" disabled={isBusy} onClick={() => void install()}>
            {zhLocale ? '重启并安装' : 'Restart and install'}
          </Button>
        ) : null}
      </div>
    </div>
  )
}
