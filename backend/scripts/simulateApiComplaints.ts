import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

import User from '../src/models/User';
import { generateJWT } from '../src/services/authService';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ruraltrust-ai';
const API_URL = 'http://localhost:5000/api/complaints';

const VILLAGES = ['Tambaram', 'Velachery', 'Chitlapakkam', 'Kovalam', 'Thiruporur', 'Siruseri'];
const PROBLEM_TYPES = ['Water Supply', 'Sanitation', 'Road Damage', 'Electricity', 'Healthcare', 'Street Lights', 'Waste Management'];

// Helper to get random item from array
const getRandom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// Helper to get random number between min and max
const getRandomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

// Sleep utility
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runSimulator() {
    try {
        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Find all citizens
        let citizens = await User.find({ type: 'citizen' });
        console.log(`👤 Found ${citizens.length} citizens in the database.`);

        // Auto-generate citizens if none exist to satisfy "use everyone"
        if (citizens.length === 0) {
            console.log('⚠️ No citizens found! Automatically creating 10 dummy citizen accounts first...');
            const dummyCitizens = [];
            for (let i = 0; i < 10; i++) {
                dummyCitizens.push({
                    type: 'citizen',
                    name: `Simulated Citizen ${i + 1}`,
                    mobile: `+91980000000${i}`,
                    village: getRandom(VILLAGES),
                    status: 'active'
                });
            }
            await User.insertMany(dummyCitizens);
            citizens = await User.find({ type: 'citizen' });
            console.log(`✅ Successfully created ${citizens.length} dummy citizens.`);
        }

        let totalSuccess = 0;
        let totalFailed = 0;

        console.log('\n🚀 Starting API-driven Complaint Generation...');

        for (const citizen of citizens) {
            // Generate valid JWT using backend's internal auth service
            const token = generateJWT(citizen);

            // Generate exactly 20 complaints per citizen as requested
            const numComplaints = 20;
            console.log(`\n👨‍💼 Simulating ${numComplaints} complaints for ${citizen.name || citizen.mobile}...`);

            for (let i = 0; i < numComplaints; i++) {
                const problemType = getRandom(PROBLEM_TYPES);
                const village = getRandom(VILLAGES);

                // Add some realistic filler text so NLP has context
                const descriptions = [
                    `We are facing severe issues with ${problemType} in our area since last week. The situation is getting worse every day.`,
                    `Please look into the ${problemType} matter immediately. It is causing huge inconvenience to everyone in ${village}.`,
                    `Continuous problems with ${problemType} here. We have tried contacting local authorities but no action taken yet.`,
                    `The ${problemType} infrastructure is heavily damaged. Requesting immediate repair and maintenance team in ${village}.`,
                    `Urgent intervention required regarding ${problemType}. Many families are affected and it poses a safety hazard.`
                ];

                const description = getRandom(descriptions);

                const payload = {
                    village,
                    problemType,
                    description,
                    language: 'en'
                };

                try {
                    const response = await fetch(API_URL, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify(payload)
                    });

                    if (response.ok) {
                        totalSuccess++;
                        process.stdout.write('✓ '); // Print dot on success
                    } else {
                        const errorData = await response.json();
                        console.error(`\n❌ API Error (${response.status}):`, errorData);
                        totalFailed++;
                    }
                } catch (err) {
                    console.error('\n❌ Network Error hitting API:', err);
                    totalFailed++;
                }

                // Sleep for 2.5 seconds to avoid Google Gemini AI API rate limiting (429 Too Many Requests)
                await sleep(2500);
            }
        }

        console.log(`\n\n🎉 Simulation Complete!`);
        console.log(`✅ Successful API Requests: ${totalSuccess}`);
        console.log(`❌ Failed API Requests: ${totalFailed}`);

    } catch (error) {
        console.error('❌ Fatal error during API simulation:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB.');
        process.exit(0);
    }
}

runSimulator();
