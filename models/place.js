import { Schema, model } from 'mongoose';

var placeSchema = new Schema({
    name: String
});

export const Place = model('place', placeSchema, "place");