const packageJson = require('./package.json')

module.exports = {
  ...packageJson.build,
  appId: 'io.deepseekharness.studio.dev',
  productName: 'DeepSeek Harness Studio Dev',
  directories: {
    ...packageJson.build.directories,
    output: 'dist-dev'
  },
  extraMetadata: {
    name: 'deepseek-harness-studio-dev',
    productName: 'DeepSeek Harness Studio Dev',
    studioChannel: 'development'
  },
  artifactName: 'dsh-desktop-dev-${os}-${arch}.${ext}',
  nsis: {
    ...packageJson.build.nsis,
    artifactName: 'deepseek-harness-studio-${version}-dev-windows-${arch}-setup.${ext}'
  },
  publish: null
}
