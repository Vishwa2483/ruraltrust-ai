import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ruraltrust';

export const connectDatabase = async (): Promise<void> => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ MongoDB connected successfully');
        console.log(`📊 Database: ${mongoose.connection.name}`);
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        console.error('💡 Make sure MongoDB is running on your system');
        process.exit(1);
    }
};

mongoose.connection.on('disconnected', () => {
    console.log('⚠️  MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB error:', err);
});
