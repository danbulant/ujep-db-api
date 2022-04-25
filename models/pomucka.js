import { Schema, model } from 'mongoose';

var pomuckaSchema = new Schema({
	autor: String,
	nazev: { type: String, required: true, index: true },
	rok: Number,
	nakladatel: String,
	mistoVydani: String,
	signatura: String,
	ISXN: { type: Number, index: true },
	kategorie: [{ type: String, required: true, index: true }]
});

export const Pomucka = model('pomucky', pomuckaSchema, "pomucky");