export const packages = [
  {
    packName: '@ora-io/utils',
    dir: 'utils',
    external: ['cache-manager', 'cache-manager-ioredis-yet', 'ioredis'],
  }, {
    packName: '@ora-io/reku',
    dir: 'reku',
    external: [
      'ethers',
      '@ora-io/utils',
    ],
  }, {
    packName: '@ora-io/orap',
    dir: 'orap',
    external: [
      'ethers',
      '@ora-io/utils',
      '@ora-io/reku',
    ],
  },
]
export const haveWorkspacePackages = [packages[0], packages[1], packages[2]]
