export interface RegistryEntry {
  typeId: string;
  defaultConfig: Readonly<Record<string, unknown>>;
}

export interface Registry<T extends RegistryEntry> {
  has(typeId: string): boolean;
  get(typeId: string): T | undefined;
  require(typeId: string): T;
  list(): readonly T[];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function deepCloneFreeze<T>(value: T): T {
  if (Array.isArray(value)) {
    return Object.freeze(
      (value as readonly unknown[]).map((item) => deepCloneFreeze(item)),
    ) as unknown as T;
  }
  if (isPlainObject(value)) {
    const clone: Record<string, unknown> = {};
    for (const key of Object.keys(value)) {
      clone[key] = deepCloneFreeze((value as Record<string, unknown>)[key]);
    }
    return Object.freeze(clone) as unknown as T;
  }
  return value;
}

export function createRegistry<T extends RegistryEntry>(
  definitions: readonly T[],
): Registry<T> {
  const internal = new Map<string, T>();

  for (const def of definitions) {
    if (internal.has(def.typeId)) {
      throw new Error(
        `Registry duplicate typeId "${def.typeId}". A new type requires a new source-controlled definition, not runtime mutation of an existing registry.`,
      );
    }
    internal.set(def.typeId, deepCloneFreeze(def));
  }

  return {
    has(typeId: string): boolean {
      return internal.has(typeId);
    },

    get(typeId: string): T | undefined {
      const def = internal.get(typeId);
      return def === undefined ? undefined : deepCloneFreeze(def);
    },

    require(typeId: string): T {
      const def = internal.get(typeId);
      if (def === undefined) {
        throw new Error(
          `Registry unknown typeId "${typeId}". No definition is registered for this id.`,
        );
      }
      return deepCloneFreeze(def);
    },

    list(): readonly T[] {
      return Object.freeze(
        Array.from(internal.values()).map((def) => deepCloneFreeze(def)),
      ) as readonly T[];
    },
  };
}
