/** `settings.update` namespace dictionaries (the Settings -> Update section copy). */

/** Dictionary namespace owned by this plugin. */
export const NS = 'settings.update'

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'update.title': '更新',
  'update.currentVersion': '当前版本',
  'update.availableVersion': '可用版本',
  'update.check': '检查更新',
  'update.checking': '正在检查更新…',
  'update.available': '发现新版本 {version}，正在后台下载…',
  'update.downloading': '正在下载 {version}（{percent}%）',
  'update.downloaded': '新版本 {version} 已下载完成',
  'update.upToDate': '已是最新版本',
  'update.error': '更新失败：{message}',
  'update.unsupported': '更新检查仅在安装版中可用',
  'update.idle': '尚未检查更新',
  'update.install': '重启并安装',
  'update.desktopOnly': '更新功能仅在桌面版（DeepSeek Harness Studio）中可用。',
} satisfies Record<string, string>

/** English dictionary. */
export const en = {
  'update.title': 'Update',
  'update.currentVersion': 'Current version',
  'update.availableVersion': 'Available version',
  'update.check': 'Check for Updates',
  'update.checking': 'Checking for updates…',
  'update.available': 'New version {version} found, downloading in background…',
  'update.downloading': 'Downloading {version} ({percent}%)',
  'update.downloaded': 'New version {version} is ready to install',
  'update.upToDate': 'You are up to date',
  'update.error': 'Update failed: {message}',
  'update.unsupported': 'Update checks are only available in installed builds',
  'update.idle': 'No update check yet',
  'update.install': 'Restart and install',
  'update.desktopOnly': 'Updates are only available in the desktop build of DeepSeek Harness Studio.',
} satisfies Record<string, string>

export type StudioUpdateLocaleKey = keyof typeof zh

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The Studio update section's copy. */
    'settings.update': StudioUpdateLocaleKey
  }
}
