import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vdi_control_plane';

export const connectDatabase = async (): Promise<void> => {
  try {
    const options: mongoose.ConnectOptions = {
      maxPoolSize: 50,
      minPoolSize: 10,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 5000,
      heartbeatFrequencyMS: 10000,
      autoIndex: false,
    };

    mongoose.set('strictQuery', true);

    await mongoose.connect(MONGODB_URI, options);
    console.log('✅ MongoDB Enterprise Cluster Connection Established.');

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB Connection Error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB Connection Lost. Reconnecting...');
    });
  } catch (error) {
    console.error('💥 Fatal Database Connection Error:', error);
    process.exit(1);
  }
};

// Graceful Shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('MongoDB connection closed due to app termination.');
  process.exit(0);
});
