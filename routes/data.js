var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
const createError = require('http-errors');

var Model = require('../models/pomucka');

router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());

router.post('/add', function (req, res, next) {
	console.log(req.body);

	if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
		console.log('Object missing');
		next(createError(400));
	} else {
		var ids = [];

		req.body.id.split(", ").forEach(element => {
			if (element.substr(element.length - 1) == ".") {
				element = element.slice(0, -1);
			}

			ids.push(element.replace(/^UNIV: /i, "U").replace(/^UU/i, "U"));
		});

		var add = Model({
			autor: req.body.autor.replace(/[, ]*$/, "").trim(),
			nazev: req.body.nazev.replace(/[,=: ]*$/, "").trim(),
			rok: req.body.rok && parseInt(req.body.rok),
			nakladatel: req.body.nakladatel.replace(/[, ]*$/, "").trim(),
			mistoVydani: req.body.mistoVydani.replace(/[: ]*$/, "").replace(/[\[\]]/g, "").trim(),
			signatura: req.body.signatura.replace(/\/$/, "").trim(),
			ISXN: parseInt(req.body.isxn) || null,
			id: ids
		});

		add.save(function (err, doc) {
			if (err) {
				console.error(err);
				return res.send(500);
			}
			res.status(200).json({});
		});
	}
});

router.get('/fetch', function (req, res, next) {
	if (/^[A-K]/.test(req.query.kategorie)) {
		console.log(req.query.kategorie);

		Model.find({ id: { $regex: "^" + req.query.kategorie } }, function (err, docs) {
			if (err) {
				console.error(err);
				return next(createError(500));
			}
			res.send(docs);
		});
	} else {
		next(createError(400));
	}
});

module.exports = router;