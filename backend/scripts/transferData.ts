import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';

// Load local env variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const sourceUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ruraltrust-ai';
const targetUri = process.env.REMOTE_MONGODB_URI; // User needs to provide this

if (!targetUri) {
    console.error('❌ REMOTE_MONGODB_URI is not defined.');
    console.error('Please run this script with your production MongoDB connection string, like this:');
    console.error('REMOTE_MONGODB_URI="mongodb+srv://..." npx tsx scripts/transferData.ts');
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
    console.log(`✅ Connected to source: ${uriStr.split('@')[1] || uriStr}`);

    // We get the raw collections
    const collections = await connection.db.collections();
    const data: Record<string, any[]> = {};

    for (let collection of collections) {
        const collectionName = collection.collectionName;
        const docs = await collection.find({}).toArray();
        data[collectionName] = docs;
        console.log(`📦 Found ${docs.length} documents in ${collectionName}`);
    }

    await connection.close();
    return data;
}

async function runTransfer() {
    try {
        console.log('🔄 Starting data transfer...');
        console.log('----------------------------------------------------');

        // 1. Get local data
        const localData = await getCollectionData(sourceUri);

        // 2. Connect to remote database
        const remoteConnection = await mongoose.createConnection(targetUri!).asPromise();
        console.log('\n✅ Connected to remote target database.');

        // 3. Clear existing remote database (optional but recommended for a clean transfer)
        console.log('⚠️ Clearing existing collections in remote database...');
        const remoteCollections = await remoteConnection.db.collections();
        for (let collection of remoteCollections) {
            await collection.deleteMany({});
            console.log(`   Cleared ${collection.collectionName}`);
        }

        // 4. Insert data into remote database
        console.log('\n🚀 Uploading data to remote database...');
        for (const [collectionName, docs] of Object.entries(localData)) {
            if (docs.length > 0) {
                const collection = remoteConnection.db.collection(collectionName);
                await collection.insertMany(docs);
                console.log(`   Inserted ${docs.length} documents into ${collectionName}`);
            } else {
                console.log(`   Skipped ${collectionName} (empty)`);
            }
        }

        // 5. Explicitly updating the admin password in the remote database
        console.log('\n🔒 Updating remote admin password...');
        // To hash the password properly we use bcryptjs (since authService uses bcryptjs)
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash('AdminTrust@2026', 10);

        const usersCollection = remoteConnection.db.collection('users');
        const result = await usersCollection.updateOne(
            { type: 'admin' },
            { $set: { password: hashedPassword, username: 'admin' } }
        );

        if (result.matchedCount > 0) {
            console.log('   ✅ Admin password successfully changed to AdminTrust@2026');
        } else {
            console.log('   ⚠️ No admin user found in data! Creating one...');
            await usersCollection.insertOne({
                type: 'admin',
                username: 'admin',
                password: hashedPassword,
                name: 'System Administrator',
                status: 'active',
                createdAt: new Date(),
                updatedAt: new Date()
            });
            console.log('   ✅ Created new admin with password AdminTrust@2026');
        }

        await remoteConnection.close();

        console.log('----------------------------------------------------');
        console.log('🎉 Data transfer completed successfully!');

        console.log('\n⚠️ IMPORTANT NOTICE ABOUT RENDER DEPLOYMENT:');
        console.log('Your backend at server.ts auto-syncs the admin password on startup from Render environment variables.');
        console.log('To ensure your password stays AdminTrust@2026 after the server restarts, you MUST also go to your Render Dashboard -> Environment Variables and update ADMIN_PASSWORD to AdminTrust@2026.');

    } catch (error) {
        console.error('❌ Error during transfer:', error);
        process.exit(1);
    }
}

runTransfer();
