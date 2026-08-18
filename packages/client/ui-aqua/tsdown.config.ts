// DeepSeek Harness Studio local theme, shipped to users through the desktop
// bundle (desktop/vendor/@deepseek-ai/dsh-client-ui-aqua, mounted by
// desktop/build/dsh-local.patch.yml). The monorepo workspace build must skip
// it: the package is not registered in tsconfig.client.json, so no lib/types
// is emitted, and its source has not yet been ported to the rc.7 slot
// contracts. Port it (re-register in tsconfig.client.json + drop this skip)
// as part of the rc.7 feature work.
export default { entry: '' }
