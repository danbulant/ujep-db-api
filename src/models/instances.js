import mongoose from 'mongoose';
import { Place } from './place';
import { Pomucka } from './pomucka';

var instanceSchema = new mongoose.Schema({
    pomucka: Pomucka,
    ownedBy: Place,
    currentlyAt: Place,
    rentedBy: {
        type: {
            name: String,
            identifier: String
        },
        optional: true
    }
});

export const Instances = mongoose.model('instance', instanceSchema, "instance");