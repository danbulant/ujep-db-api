var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var pomuckaSchema = new Schema({
	autor: String,
	nazev: { type: String, required: true, index: true },
	rok: Number,
	nakladatel: String,
	mistoVydani: String,
	signatura: String,
	ISXN: { type: Number, index: true },
	id: [{ type: String, required: true, index: true }]
});

module.exports = mongoose.model('pomucky', pomuckaSchema, "pomucky");