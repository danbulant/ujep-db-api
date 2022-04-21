import { Schema, model } from 'mongoose';
import { Place } from './place';
import { Pomucka } from './pomucka';

var userSchema = new Schema({
    pomucka: Pomucka,
    ownedBy: Place,
    currentlyAt: Place,
    rentedBy: {
        name: String,
        identifier: String
    }
});

export const User = model('user', userSchema, "user");