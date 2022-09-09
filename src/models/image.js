import mongoose from 'mongoose';

var imageSchema = new mongoose.Schema({
    pomucka: { type: mongoose.Schema.Types.ObjectId, ref: 'pomucky', required: true, index: true },
    alt: String,
    data: Buffer,
    mimetype: String
});

export const Image = mongoose.model('images', imageSchema, "images");