import mongoose from 'mongoose';
import dotenv from 'dotenv';
import axios from 'axios';
import { Complaint } from '../src/models/Complaint';

dotenv.config();

const API_URL = process.env.API_URL || 'http://localhost:5000/api';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ruraltrust';

async function testFeedbackSystem() {
    let governmentToken = '';
    let citizenToken = '';
    let testComplaintId = '';

    try {
        console.log('--- Starting Feedback System Verification ---');

        // 1. Connect to Database
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // 2. Login as Government Official
        console.log('\nLogging in as government official...');
        const govLogin = await axios.post(`${API_URL}/auth/login`, {
            mobile: '1234567890',
            password: 'password123',
            type: 'government'
        });
        governmentToken = govLogin.data.token;
        console.log('✅ Government login successful');

        // 3. Login as Citizen
        console.log('Logging in as citizen...');
        const citLogin = await axios.post(`${API_URL}/auth/login`, {
            mobile: '9876543210',
            password: 'password123',
            type: 'citizen'
        });
        citizenToken = citLogin.data.token;
        console.log('✅ Citizen login successful');

        // 4. Create a test complaint
        console.log('\nCreating a test complaint...');
        const newComplaint = await axios.post(`${API_URL}/complaints`, {
            village: 'Tambaram',
            problemType: 'Road Damage',
            description: 'Test road damage for feedback system verification',
            language: 'en'
        }, { headers: { Authorization: `Bearer ${citizenToken}` } });

        testComplaintId = newComplaint.data.complaint._id;
        console.log(`✅ Test complaint created with ID: ${testComplaintId}`);

        // 5. Resolve the complaint as government
        console.log('\nResolving complaint as government...');
        await axios.put(`${API_URL}/complaints/${testComplaintId}/resolve`, {}, {
            headers: { Authorization: `Bearer ${governmentToken}` }
        });
        console.log('✅ Complaint resolved');

        // 5a. Verify citizenFeedback is pending
        let dbComplaint = await Complaint.findById(testComplaintId);
        if (dbComplaint?.citizenFeedback !== 'pending') {
            throw new Error(`Expected citizenFeedback to be 'pending' but got '${dbComplaint?.citizenFeedback}'`);
        }
        console.log('✅ Complaint citizenFeedback is strictly "pending"');

        // 6. Submit "unresolved" feedback as citizen
        console.log('\nSubmitting citizen feedback (unresolved)...');
        await axios.put(`${API_URL}/complaints/${testComplaintId}/citizen-feedback`, {
            feedback: 'unresolved',
            comments: 'The pothole was only filled with dirt, it washed away in the rain.'
        }, { headers: { Authorization: `Bearer ${citizenToken}` } });
        console.log('✅ Citizen feedback submitted');

        // 7. Verify Database Update
        console.log('\nVerifying database update...');
        dbComplaint = await Complaint.findById(testComplaintId);

        if (dbComplaint?.citizenFeedback !== 'unresolved') {
            throw new Error(`Expected citizenFeedback to be 'unresolved' but got '${dbComplaint?.citizenFeedback}'`);
        }
        if (dbComplaint?.citizenComments !== 'The pothole was only filled with dirt, it washed away in the rain.') {
            throw new Error('Citizen comments were not saved correctly');
        }
        console.log('✅ Database verification passed');

        // 8. Fetch Unresolved complaints as government
        console.log('\nFetching unresolved complaints as government...');
        const unresolvedResp = await axios.get(`${API_URL}/complaints?showUnresolvedByCitizen=true`, {
            headers: { Authorization: `Bearer ${governmentToken}` }
        });

        const found = unresolvedResp.data.complaints.some((c: any) => c._id === testComplaintId);
        if (!found) {
            throw new Error('Test complaint not found in unresolved filter results');
        }
        console.log('✅ Unresolved complaints API filter verification passed');

        console.log('\n🎉 All tests passed successfully!');

    } catch (error: any) {
        console.error('\n❌ Test failed:');
        console.error(error.response?.data || error.message);
    } finally {
        if (testComplaintId) {
            console.log('\nCleaning up test data...');
            await Complaint.findByIdAndDelete(testComplaintId);
            console.log('✅ Test complaint deleted');
        }
        await mongoose.disconnect();
    }
}

testFeedbackSystem();
