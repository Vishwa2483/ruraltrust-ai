import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
    type: 'citizen' | 'government' | 'admin';
    name: string;
    status: 'active' | 'inactive';

    // Citizen-specific fields
    mobile?: string;
    village?: string;

    // Government-specific fields
    username?: string;
    password?: string;
    designation?: string;
    qrCode?: string;

    // Tracking
    lastLogin?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema: Schema = new Schema(
    {
        type: {
            type: String,
            enum: ['citizen', 'government', 'admin'],
            required: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        status: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active',
        },

        // Citizen fields
        mobile: {
            type: String,
            sparse: true,
            unique: true,
            trim: true,
        },
        village: {
            type: String,
            trim: true,
        },

        // Government fields
        username: {
            type: String,
            sparse: true,
            unique: true,
            trim: true,
        },
        password: {
            type: String,
        },
        designation: {
            type: String,
            trim: true,
        },
        qrCode: {
            type: String,
        },

        // Tracking
        lastLogin: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
UserSchema.index({ type: 1, status: 1 });
UserSchema.index({ mobile: 1 }, { sparse: true });
UserSchema.index({ username: 1 }, { sparse: true });

export default mongoose.model<IUser>('User', UserSchema);
