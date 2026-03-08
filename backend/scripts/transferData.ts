import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';

// Load local env variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const sourceUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ruraltrust-ai';
const targetUri = process.env.REMOTE_MONGODB_URI;

if (!targetUri) {
    console.error('❌ REMOTE_MONGODB_URI is not defined.');
    process.exit(1);
}

// Ensure the source and target are not the same
if (sourceUri === targetUri) {
    console.error('❌ MONGODB_URI and REMOTE_MONGODB_URI cannot be the same!');
    process.exit(1);
}

// Function to pull all data from a specific URI
async function getCollectionData(uriStr: string) {
    const connection = await mongoose.createConnection(uriStr).asPromise();
    const collections = await connection.db.collections();
    const data: Record<string, any[]> = {};

    for (let collection of collections) {
        const collectionName = collection.collectionName;
        const docs = await collection.find({}).toArray();
        data[collectionName] = docs;
    }
    await connection.close();
    return data;
}

async function runTransfer() {
    try {
        console.log('🔄 Fetching local data...');
        const localData = await getCollectionData(sourceUri);

        console.log('✅ Connected to target database...');
        const remoteConnection = await mongoose.createConnection(targetUri!).asPromise();

        const remoteCollections = await remoteConnection.db.collections();
        for (let collection of remoteCollections) {
            await collection.deleteMany({});
        }

        for (const [collectionName, docs] of Object.entries(localData)) {
            if (docs.length > 0) {
                const collection = remoteConnection.db.collection(collectionName);
                await collection.insertMany(docs);
            }
        }

        // Updating admin password
        const bcrypt = require('bcrypt');
        const hashedPassword = await bcrypt.hash('AdminTrust@2026', 10);

        const usersCollection = remoteConnection.db.collection('users');
        const result = await usersCollection.updateOne(
            { type: 'admin' },
            { $set: { password: hashedPassword, username: 'admin' } }
        );

        if (result.matchedCount === 0) {
            await usersCollection.insertOne({
                type: 'admin',
                username: 'admin',
                password: hashedPassword,
                name: 'System Administrator',
                status: 'active',
                createdAt: new Date(),
                updatedAt: new Date()
            });
        }

        await remoteConnection.close();
        console.log('✅ Transfer complete - Password Updated to AdminTrust@2026');
    } catch (error) {
        console.error('❌ Error during transfer:', error);
        process.exit(1);
    }
}

runTransfer();
