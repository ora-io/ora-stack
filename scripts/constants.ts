export const packages = [
  {
    packName: 'utils',
    dir: 'utils',
    external: ['cache-manager', 'cache-manager-ioredis-yet', 'ioredis'],
  }, {
    packName: 'rek',
    dir: 'rek',
    external: [
      'ethers',
      '@ora-io/utils',
    ],
  }, {
    packName: 'orap',
    dir: 'orap',
    external: [
      'ethers',
      '@ora-io/utils',
      '@ora-io/rek',
    ],
  },
]
export const haveWorkspacePackages = [packages[0], packages[1]]
