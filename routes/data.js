import { Router } from 'express';
import { urlencoded, json } from 'body-parser';
import createError from 'http-errors';

import { Pomucka } from '../models/pomucka';
var router = Router();

router.use(urlencoded({ extended: false }));
router.use(json());

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

		var add = new Pomucka({
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
	find({
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
 * - id - seznam kategorií
 */
router.get("/searchOptions", async (req, res, next) => {
	try {
		const [
			id
		] = await Promise.all([
			Pomucka.distinct("id")
		]);

		res.setHeader("Cache-Control", "max-age=43200"); // 12 hodin cache

		res.json({
			id
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
 * - id - kategorie pomůcky
 * - nazev - fulltext hledání
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
	if (typeof req.query.nazev === "string") {
		query.nazev = {
			$text: {
				$search: req.query.nazev,
				$language: "cs"
			}
		};
	}
	if (Array.isArray(req.query.id) && req.query.id.every(t => typeof t === "string")) {
		query.id = { $in: req.query.id };
	}
	Pomucka.find(query, function (err, docs) {
		if (err) {
			console.error(err);
			return next(createError(500));
		}
		res.send(docs);
	});
});

export default router;