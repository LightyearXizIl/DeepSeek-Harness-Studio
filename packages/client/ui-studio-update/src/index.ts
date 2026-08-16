/**
 * Studio update section plugin, node half. Pure UI plugin: the empty apply
 * exists so the plugin appears in the host cordis.yml / Loader; the browser
 * half ships via exports["./client"]. All update state flows through the
 * desktop preload bridge (`window.studioUpdate`), so this package is inert
 * outside the desktop shell.
 */

/** Host plugin body - no host-side behavior for this surface plugin. */
export function apply(): void {}
