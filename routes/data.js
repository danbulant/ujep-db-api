var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
const createError = require('http-errors');

var Model = require('../models/pomucka');

router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());

/**
 * POST /data/add
 * 
 * Přidá novou pomůcku.
 * 
 * @request
 * - id - string s identifikacemi kategorií, oddělený čárkami
 * - autor - název autora
 * - nazev - název pomůcky
 * - rok - rok vydání
 * - nakladatel - nakladatelství
 * - mistoVydani
 * - signatura
 * - ISXN
 * 
 * @response
 * - _id - přesné ID pomůcky
 * - autor - autor pomůcky
 * - nazev
 * - rok
 * - nakladatel
 * - mistoVydani
 * - signatura
 * - ISXN
 * - id - kategorie pomůcky
 */
router.post('/add', (req, res, next) => {
	if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
		console.log('Object missing');
		next(createError(400));
	} else {
		var ids = [];

		req.body.id.split(/[,; ]+/).forEach(element => {
			if (element.substr(element.length - 1) == ".") {
				element = element.slice(0, -1);
			}

			ids.push(element.replace(/^UNIV[:.] /i, "U").replace(/^UU/i, "U").trim());
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
			res.status(200).json(doc);
		});
	}
});

/**
 * GET /data/fetch/:id
 * 
 * Zobrazí detaily jedné pomůcky
 * 
 * @param id - přesné ID (_id) pomůcky
 * 
 * @response
 * - _id - přesné ID pomůcky
 * - autor - autor pomůcky
 * - nazev
 * - rok
 * - nakladatel
 * - mistoVydani
 * - signatura
 * - ISXN
 * - id - kategorie pomůcky
 */
router.get("/fetch/:id", (req, res, next) => {
	Model.find({
		id: req.params.id
	}, (err, doc) => {
		if (err) {
			console.error(err);
			return next(createError(500));
		}
		if (!doc) {
			return next(createError(404));
		}
		res.json(doc);
	});
});

/**
 * GET /data/searchOptions
 * 
 * Získá možné hodnoty použitelné pro hledání
 * 
 * @response
 * - autori - seznam autorů pomůcek (string[])
 * - rok - seznam roků ze kterých je nějaká pomůcka (number?[])
 * - nakladatel - seznam nakladatelů (string[])
 * - mistoVydani - seznam míst vydání (string[])
 * - signatura - seznam signatur
 * - id - seznam kategorií
 */
router.get("/searchOptions", async (req, res, next) => {
	try {
		const [
			autori,
			roky,
			nakladatele,
			mistaVydani,
			signatury,
			id
		] = await Promise.all([
			Model.distinct("autor"),
			Model.distinct("rok"),
			Model.distinct("nakladatel"),
			Model.distinct("mistoVydani"),
			Model.distinct("signatura"),
			Model.distinct("id")
		]);

		res.setHeader("Cache-Control", "max-age=43200"); // 12 hodin cache

		res.json({
			autori, roky, nakladatele, mistaVydani, signatury, id
		});
	} catch(e) {
		next(e);
	}
});

/**
 * GET /data/search
 * 
 * Vyhledá v pomůckách
 * 
 * @query
 * - kategorie - regex (^ přidán na začátek) hledání
 * - nazev - fulltext hledání
 * - rok - seznam čísel roků ve kterých hledat
 * - nakladatel - seznam jmen nakladatelů ve kterých hledat
 * 
 * @response
 * Array výsledků
 * - _id - přesné ID pomůcky
 * - autor - autor pomůcky
 * - nazev
 * - rok
 * - nakladatel
 * - mistoVydani
 * - signatura
 * - ISXN
 * - id - kategorie pomůcky
 */
router.get('/search', (req, res, next) => {
	const query = {};
	if (typeof req.query.kategorie === "string" && /^[A-K]/.test(req.query.kategorie)) {
		query.id = { $regex: "^" + req.query.kategorie };
	}
	if (typeof req.query.nazev === "string") {
		query.nazev = {
			$text: {
				$search: req.query.nazev,
				$language: "cs"
			}
		};
	}
	if (Array.isArray(req.query.rok) && req.query.rok.every(t => typeof t === "number")) {
		query.rok = { $in: req.query.rok };
	}
	if (Array.isArray(req.query.nakladatel) && req.query.nakladatel.every(t => typeof t === "string")) {
		query.nakladatel = { $in: req.query.nakladatel };
	}
	if (Object.keys(query).length === 0) {
		return next(createError(400));
	}
	Model.find(query, function (err, docs) {
		if (err) {
			console.error(err);
			return next(createError(500));
		}
		res.send(docs);
	});
});

module.exports = router;