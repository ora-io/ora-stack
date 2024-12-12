/* eslint-disable no-prototype-builtins */
/* eslint-disable no-case-declarations */
export interface ParsedArg {
  value: any
  type: string
}

export class ArgParser {
  parse(args: any[]): ParsedArg[] {
    return args.map(arg => this._parse(arg))
  }

  private _parse(arg: any): ParsedArg {
    const type = typeof arg
    if (Array.isArray(arg)) {
      return {
        value: arg.map(item => this._parse(item)),
        type: 'array',
      }
    }
    else if (type === 'object' && arg !== null) {
      const parsedObject: { [key: string]: ParsedArg } = {}
      for (const key in arg) {
        if (arg.hasOwnProperty(key))
          parsedObject[key] = this._parse(arg[key])
      }
      return {
        value: parsedObject,
        type: 'object',
      }
    }
    else if (type === 'bigint') {
      return {
        value: arg.toString(),
        type: 'bigint',
      }
    }
    else {
      return {
        value: arg,
        type,
      }
    }
  }

  serialize(parsedArgs: ParsedArg[]): any[] {
    return parsedArgs.map(parsedArg => this._serialize(parsedArg))
  }

  private _serialize(parsedArg: ParsedArg): any {
    switch (parsedArg.type) {
      case 'string':
        return String(parsedArg.value)
      case 'number':
        return Number(parsedArg.value)
      case 'boolean':
        return Boolean(parsedArg.value)
      case 'bigint':
        return BigInt(parsedArg.value)
      case 'array':
        return (parsedArg.value as ParsedArg[]).map(item => this._serialize(item))
      case 'object':
        const serializedObject: { [key: string]: any } = {}
        const value = parsedArg.value as { [key: string]: ParsedArg }
        for (const key in value) {
          if (value.hasOwnProperty(key))
            serializedObject[key] = this._serialize(value[key])
        }
        return serializedObject
      default:
        return parsedArg.value
    }
  }
}

export const argParser = new ArgParser()
