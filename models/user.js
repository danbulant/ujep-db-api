import mongoose from 'mongoose';
import { Place } from './place';

var userSchema = new mongoose.Schema({
    name: String,
    password: String, //bcrypt hash
    forceChangePassword: {
        type: Boolean,
        default: false
    },
    role: Number,
    place: Place
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