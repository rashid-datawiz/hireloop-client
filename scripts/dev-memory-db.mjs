// Starts an in-memory MongoDB (as a single-node replica set, which better-auth
// needs for transactions) and keeps it running on a fixed port.
//
// Usage: node scripts/dev-memory-db.mjs
import { MongoMemoryReplSet } from "mongodb-memory-server"

const port = Number(process.env.MONGO_PORT ?? 27017)

const replSet = await MongoMemoryReplSet.create({
  replSet: { count: 1, storageEngine: "wiredTiger" },
  instanceOpts: [{ port }],
})

const uri = replSet.getUri()
console.log(`[memory-db] MongoDB ready at ${uri}`)
console.log(`[memory-db] export MONGODB_URI="${uri}"`)
console.log("[memory-db] press ctrl+c to stop")

const shutdown = async () => {
  await replSet.stop()
  process.exit(0)
}

process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)
