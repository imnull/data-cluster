import { TDataModel, TDistributer, TExtra, THooks, TReduceMapper } from './type'


export class DataCluster<T extends TDataModel>{
    private readonly reducer: TReduceMapper<T>
    private readonly data: T
    private hooks: { [key in keyof T]?: (data: Omit<T, key>) => void }
    private status: { [key in keyof T]?: 0 | 1 | 2 | 3 }

    constructor(initData: T) {
        this.data = initData
        this.status = {}
        this.hooks = {}
        this.reducer = {}
    }

    subscribe(reducer: {
        [key in keyof T]?: (() => T[key] | Promise<T[key]>) | ({
            depends: TExtra<keyof T, key>[];
            reduce: (deps: Omit<T, key>) => T[key] | Promise<T[key]>
        })
    }) {
        Object.assign(this.reducer, reducer)
        return this
    }

    private async _exec() {
        const prepareKeys = Object.keys(this.reducer).filter(k => !this.status[k]) as Array<keyof T>
        if (prepareKeys.length < 1) {
            return
        }
        const doneKeys = Object.keys(this.status).filter(k => this.status[k] === 2)
        const cache = this.getData()
        const params: any = doneKeys.map(key => ({ [key]: cache[key] })).reduce((r, v) => ({ ...r, ...v }), {})
        const methods = prepareKeys.map(key => {
            const item = this.reducer[key]
            if (!item) {
                return null
            }
            if (typeof item === 'function') {
                this.status[key] = 1
                return { key, reduce: item }
            } else if (item.depends.every(dep => doneKeys.includes(dep as any))) {
                this.status[key] = 1
                return { key, reduce: () => item.reduce(params) }
            }
        }).filter(f => !!f) as { key: keyof T, reduce: () => any }[]
        if (methods.length < 1) {
            return
        }
        await Promise.all(methods.map(async ({ key, reduce }) => {
            try {
                this.data[key] = await reduce()
                this.status[key] = 2
                this.triggerEvent(key)
            } catch (ex) {
                this.data[key] = ex as any
                this.status[key] = 3
            }
        }))
        await this._exec()
    }

    private triggerEvent(eventName: keyof T) {
        const { [eventName]: event } = this.hooks
        if (typeof event === 'function') {
            try {
                event(this.getData())
            } catch (ex) {
                console.log(`DataCluster trigger event [${String(eventName)}] error:`, ex)
            }
        }
    }

    private reset() {
        this.status = {}
        Object.keys(this.data).forEach((key: keyof T) => {
            // 如果初始值的键并未注册为动态方法，则初始化为`status=2`
            if(!(key in this.reducer)) {
                this.status[key] = 2
            }
        })
    }

    async exec() {
        this.reset()
        await this._exec()
        return this.getData()
    }

    on(hooks: THooks<T>) {
        Object.assign(this.hooks, hooks)
        return this
    }

    getData() {
        return { ...this.data } as T
    }
}


export class DataDistributer<T extends TDataModel> {
    private readonly distributer: TDistributer<T>
    constructor(distributer: TDistributer<T>) {
        this.distributer = distributer
    }

    async exec(data: T) {
        const keys = Object.keys(this.distributer) as (keyof typeof this.distributer)[]
        const res: { [key in keyof typeof this.distributer]?: ReturnType<(typeof this.distributer)[key]> } = {}
        await Promise.all(keys.map(async key => {
            const r = await this.distributer[key](data)
            res[key] = r
        }))
        return res
    }
}