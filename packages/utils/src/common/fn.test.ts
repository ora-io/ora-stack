import { describe, expect, it, vi } from 'vitest'
import { composeFns } from './fn'

describe('composeFns', () => {
  it('should execute all functions in sequence', async () => {
    const fn1 = vi.fn((arg, next) => next())
    const fn2 = vi.fn((arg, next) => next())
    const fn3 = vi.fn((arg, next) => next())
    const handles = [fn1, fn2, fn3]

    await composeFns(handles, ['arg'])

    expect(fn1).toHaveBeenCalledTimes(1)
    expect(fn2).toHaveBeenCalledTimes(1)
    expect(fn3).toHaveBeenCalledTimes(1)
  })

  it('should pass arguments to each function', async () => {
    const fn1 = vi.fn((arg, next) => next())
    const fn2 = vi.fn((arg, next) => next())
    const fn3 = vi.fn((arg, next) => next())
    const handles = [fn1, fn2, fn3]

    await composeFns(handles, ['arg'])

    expect(fn1).toHaveBeenCalledWith('arg', expect.any(Function))
    expect(fn2).toHaveBeenCalledWith('arg', expect.any(Function))
    expect(fn3).toHaveBeenCalledWith('arg', expect.any(Function))
  })

  it('should resolve when all functions are executed', async () => {
    const fn1 = vi.fn((arg, next) => next())
    const fn2 = vi.fn((arg, next) => next())
    const fn3 = vi.fn((arg, next) => next())
    const handles = [fn1, fn2, fn3]

    const result = await composeFns(handles, ['arg'])

    expect(result).toBeUndefined()
  })

  it('should stop execution if a function does not call next', async () => {
    const fn1 = vi.fn((arg, next) => next())
    const fn2 = vi.fn((_arg, _next) => {})
    const fn3 = vi.fn((arg, next) => next())
    const handles = [fn1, fn2, fn3]

    await composeFns(handles, ['arg'])

    expect(fn1).toHaveBeenCalledTimes(1)
    expect(fn2).toHaveBeenCalledTimes(1)
    expect(fn3).not.toHaveBeenCalled()
  })
})
