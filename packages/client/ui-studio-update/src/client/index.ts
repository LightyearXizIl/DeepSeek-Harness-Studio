/**
 * Studio update client plugin body: registers the Settings -> Update section,
 * where the user can check for, download and install updates inside the app
 * (no manual GitHub downloads). All state flows through the desktop preload
 * bridge (`window.studioUpdate`); in non-desktop environments the section
 * renders a desktop-only notice.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: pulls the settings shell's SlotMap merge (the 'settings.section'
// entry) and the ctx.settingsScope Context merge.
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
// Type-only: pulls the `settings.section` SlotMap merge typing.
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import { UpdateSection, type UpdateSectionInjected } from './UpdateSection.tsx'
import { en, NS, zh } from './locales.ts'

/** Required services: slot registration plus locale dictionaries. */
export const inject = ['slots', 'locale']

/**
 * Client plugin body.
 * @param ctx - client cordis context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-studio-update: section dictionaries')
  const t = ctx.locale.bind(NS)

  ctx.slots.inject('settings.section', () =>
    ctx.slots.register(
      {
        name: 'settings.section',
        id: 'update',
        order: 100,
        label: () => t('update.title'),
        locale: NS,
        inject: (): UpdateSectionInjected => ({}),
      },
      UpdateSection,
    ),
  )
}
