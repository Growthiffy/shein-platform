const mongoose = require("mongoose");

let cached = global._sheinMongo;
if (!cached) cached = global._sheinMongo = { conn: null, promise: null };

module.exports = async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error("MONGO_URI missing");
    mongoose.set("strictQuery", true);
    cached.promise = mongoose.connect(uri, { bufferCommands: false }).then(m => { console.log("mongo connected"); return m; });
  }
  cached.conn = await cached.promise;
  return cached.conn;
};
