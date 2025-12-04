// src/config/db.js
import mongoose from 'mongoose';

export const connectDB = async () => {
  const uri = process.env.MONGO_URI; // corregido
  const dbName = process.env.MONGO_DB_NAME || 'gordont';

  if (!uri) {
    console.error(' FALTA MONGO_URI en las variables de entorno.');
    process.exit(1);
  }

  try {
    const options = {
      dbName,
      maxPoolSize: 10,
      connectTimeoutMS: 10000,
      serverSelectionTimeoutMS: 10000,
    };

    // authSource solo si no es SRV
    if (uri.startsWith('mongodb://')) options.authSource = 'admin';

    const conn = await mongoose.connect(uri, options);
    console.log(` MongoDB conectado a ${conn.connection.host}/${dbName}`);
    return conn;
  } catch (error) {
    console.error(' Error al conectar con MongoDB:', error.message);
    process.exit(1);
  }
};
