import mongoose from 'mongoose';
import { Place } from './place';
import { Pomucka } from './pomucka';

var userSchema = new mongoose.Schema({
    pomucka: Pomucka,
    ownedBy: Place,
    currentlyAt: Place,
    rentedBy: {
        name: String,
        identifier: String
    }
});

export const User = mongoose.model('user', userSchema, "user");