import mongoose from 'mongoose';

var pomuckaSchema = new mongoose.Schema({
	name: { type: String, required: true, index: true },
	signatura: String,
	ISXN: { type: Number, index: true },
	categories: [{ type: String, required: true, index: true }],
	mainImage: String,
	details: {
		description: String,
		company: String,
		author: String,
		year: Number,
		mistoVydani: String,
		images: [String]
	}
});

export const Pomucka = mongoose.model('pomucky', pomuckaSchema, "pomucky");