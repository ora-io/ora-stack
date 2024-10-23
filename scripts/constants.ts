import {
  green,
  lightBlue,
  yellow,
} from 'kolorist'

export type Package = typeof packages[0]

export const packages = [
  {
    packName: '@ora-io/utils',
    dir: 'utils',
    external: ['cache-manager', 'cache-manager-ioredis-yet', 'ioredis'],
    color: lightBlue,
    isMain: false,
  }, {
    packName: '@ora-io/reku',
    dir: 'reku',
    external: [
      'ethers',
      '@ora-io/utils',
    ],
    color: yellow,
    isMain: false,
  }, {
    packName: '@ora-io/orap',
    dir: 'orap',
    external: [
      'ethers',
      '@ora-io/utils',
      '@ora-io/reku',
    ],
    color: green,
    isMain: true,
  },
]
export const haveWorkspacePackages = [packages[0], packages[1], packages[2]]
