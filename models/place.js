import mongoose from 'mongoose';

var placeSchema = new mongooes.Schema({
    name: String
});

export const Place = mongoose.model('place', placeSchema, "place");