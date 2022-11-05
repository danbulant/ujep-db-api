import mongoose from 'mongoose';
import { Place } from './place.js';

var userSchema = new mongoose.Schema({
    name: String,
    password: String, //bcrypt hash
    displayName: String,
    forceChangePassword: {
        type: Boolean,
        default: false
    },
    role: Number,
    place: {
        type: mongoose.Schema.Types.ObjectId,
        ref: Place.collection.name
    },
    tfa: { type: String, default: null }
});

export const UserRoles = {
    DEFAULT: 0,
    LOCAL_MANAGER: 1,
    LOCAL_ADMIN: 2,
    GLOBAL_MANAGER: 3,
    GLOBAL_ADMIN: 4,
    DEVELOPER: 5
}

export const User = mongoose.model('user', userSchema, "user");