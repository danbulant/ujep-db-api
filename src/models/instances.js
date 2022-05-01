import mongoose from 'mongoose';
import { Place } from './place.js';
import { Pomucka } from './pomucka.js';

var instanceSchema = new mongoose.Schema({
    pomucka: {
		type: mongoose.Schema.Types.ObjectId,
		ref: Pomucka.collection.name,
	},
    ownedBy: {
		type: mongoose.Schema.Types.ObjectId,
		ref: Place.collection.name,
	},
    currentlyAt: {
		type: mongoose.Schema.Types.ObjectId,
		ref: Place.collection.name,
	},
    rentedBy: {
        type: {
            name: String,
            identifier: String
        },
        optional: true
    }
});

export const Instances = mongoose.model('instance', instanceSchema, "instance");