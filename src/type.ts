export type TExtra<A, B> = A extends B ? never : A
export type TDataModel = { [x: string]: unknown }

export type TReduceMapper<T extends TDataModel> = {
    [key in keyof T]?: (() => T[key] | Promise<T[key]>) | ({
        depends: TExtra<keyof T, key>[];
        reduce: (deps: any) => T[key] | Promise<T[key]>
    })
}

export type THooks<T extends TDataModel> = {
    [key in keyof T]?: (data: T) => void
}

export type TDistributer<T extends TDataModel> = Record<string, (data: T) => unknown>