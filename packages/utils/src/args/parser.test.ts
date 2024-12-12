import { describe, expect, it } from 'vitest'
import { ArgParser } from './parser'

describe('ArgParser', () => {
  it('should parse and serialize basic types', () => {
    const parser = new ArgParser()
    const args = [42, 'hello', true, BigInt(12345678901234567890n)]
    const parsedArgs = parser.parse(args)
    const serializedArgs = parser.serialize(parsedArgs)
    expect(serializedArgs).toEqual(args)
  })

  it('should parse and serialize nested structures', () => {
    const parser = new ArgParser()
    const args = [42, 'hello', true, { a: 1, b: 'world', c: [1, 2, { d: 'nested' }] }]
    const parsedArgs = parser.parse(args)
    const serializedArgs = parser.serialize(parsedArgs)
    expect(serializedArgs).toEqual(args)
  })

  it('should handle empty arrays and objects', () => {
    const parser = new ArgParser()
    const args = [[], {}]
    const parsedArgs = parser.parse(args)
    const serializedArgs = parser.serialize(parsedArgs)
    expect(serializedArgs).toEqual(args)
  })

  it('should handle complex nested structures with bigint', () => {
    const parser = new ArgParser()
    const args = [
      42,
      'hello',
      true,
      {
        a: 1,
        b: 'world',
        c: [1, 2, { d: 'nested', e: BigInt(9876543210987654321n) }],
      },
      BigInt(12345678901234567890n),
    ]
    const parsedArgs = parser.parse(args)
    const serializedArgs = parser.serialize(parsedArgs)
    expect(serializedArgs).toEqual(args)
  })
})
