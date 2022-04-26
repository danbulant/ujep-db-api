import mongoose from 'mongoose';

var pomuckaSchema = new mongoose.Schema({
	autor: String,
	nazev: { type: String, required: true, index: true },
	rok: Number,
	nakladatel: String,
	mistoVydani: String,
	signatura: String,
	ISXN: { type: Number, index: true },
	kategorie: [{ type: String, required: true, index: true }]
});

export const Pomucka = mongoose.model('pomucky', pomuckaSchema, "pomucky");