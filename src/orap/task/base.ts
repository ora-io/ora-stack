/* eslint-disable @typescript-eslint/no-explicit-any */
import { deepMerge, Constructor } from '@murongg/utils';

export abstract class TaskBase {
  abstract toKey(): string

  toString() {
    const obj: Record<string, any> = {};
    deepMerge(obj, this);
    return this.stringify(obj);
  }

  private stringify(obj: Record<string, any>) {
    const replace = (key: string, value: any) => {
      if (typeof value === 'bigint') {
        return value.toString();
      } else {
        return value
      }
    }
    return JSON.stringify(obj, replace);
  }

  fromString(jsonString: string) {
    const obj = JSON.parse(jsonString);
    Object.assign(this, obj);
    return this
  }

  static fromString<T extends TaskBase>(this: Constructor<T>, jsonString: string): T {
    const instance = new this();
    instance.fromString(jsonString)
    return instance;
  }
}
