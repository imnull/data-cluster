import { DataCluster, DataDistributer } from "./src"

const cluster = new DataCluster({
    a: 0,
    b: 1,
    c: 2
})

cluster.subscribe({
    c: {
        depends: ['a', 'b'],
        reduce: async deps => {
            return deps.a + 10
        }
    },
    a: async () => 9
}).on({
    a: (data) => {
        console.log('hook:a', data)
    },
    c: (data) => {
        console.log('hook:c', data)
    }
}).exec().then(raw => {
    console.log('------>', raw)
    distributer.exec(raw).then(data => {
        console.log('=======>', data)
    })

})

const distributer = new DataDistributer<ReturnType<typeof cluster.getData>>({
    'a + b': async data => data.a + data.b,
    'a + c': async data => data.a + data.c,
    'b + c': async data => data.b + data.c,
})
