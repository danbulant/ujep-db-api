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
		mistoVydani: String
	}
})

pomuckaSchema.index({
	name: "text",
	categories: "text",
	"details.description": "text",
	"details.author": "text",
	"details.mistoVydani": "text",
	"details.year": "text",
	"details.company": "text"
}, {
	weights: {
		name: 10,
		categories: 5,
		"details.description": 5,
		"details.author": 4,
		"details.mistoVydani": 1,
		"details.year": 3,
		"details.company": 4
	}
})

export const Pomucka = mongoose.model('pomucky', pomuckaSchema, "pomucky");