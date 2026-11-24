import IORedis from "ioredis"

const redisConnection = new IORedis({
    host: "127.0.0.1",
    port: 6379,
    maxRetriesPerRequest: null
})

redisConnection.on("connect",()=>{
    console.log("Redis is connected")
})

redisConnection.on("error",(error)=>{
    console.log("Redis is close",error)
})

export default redisConnection;