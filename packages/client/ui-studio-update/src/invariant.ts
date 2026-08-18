/**
 * Package-owned invariant companion for `@deepseek-ai/dsh-client-ui-studio-update`.
 * @module @deepseek-ai/dsh-client-ui-studio-update/invariant
 */

/* jscpd:ignore-start */
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-client-ui-studio-update'

/** Cordis companion plugin name. */
export const name = 'client-ui-studio-update-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/**
 * No runtime invariant: the update section renders from the desktop update
 * bridge and holds no cross-plugin mutable state; its only state is
 * component-local and disposed with the plugin fiber.
 */
const install: InvariantInstaller = () => {}

/**
 * Register this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
/* jscpd:ignore-end */
