import mongoose from 'mongoose';

var placeSchema = new mongoose.Schema({
    name: String,
    description: String,
    website: String,
    contacts: [{
        email: String,
        phone: String,
        name: String,
        description: String
    }],
    banner: {
        data: Buffer,
        mimetype: String
    }
});

export const Place = mongoose.model('place', placeSchema, "place");