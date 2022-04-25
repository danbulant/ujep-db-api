import Router from '@koa/router';
import createError from 'http-errors';

import { Pomucka } from '../models/pomucka';
var router = new Router();

/**
 * POST /pomucky
 * 
 * Přidá novou pomůcku.
 * 
 * @request
 * - kategorie - string s identifikacemi kategorií, oddělený čárkami
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
 * - kategorie - kategorie pomůcky
 */
router.post('/', async (ctx) => {
	if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
		console.log('Object missing');
		throw createError(400);
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
			kategorie: ids
		});
		await add.save();
		ctx.body = doc;
	}
});

/**
 * GET /pomucky/:id
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
router.get("/:id", (ctx) => {
	find({
		id: req.params.id
	}, (err, doc) => {
		if (err) {
			console.error(err);
			throw createError(500);
		}
		if (!doc) {
			throw createError(404);
		}
		ctx.body = doc;
	});
});

/**
 * GET /pomucky/searchOptions
 * 
 * Získá možné hodnoty použitelné pro hledání
 * 
 * @response
 * - id - seznam kategorií
 */
router.get("/searchOptions", async (ctx) => {
	const [
		id
	] = await Promise.all([
		Pomucka.distinct("id")
	]);

	ctx.response.headers["Cache-Control"] = "max-age=43200";

	ctx.body = {
		id
	};
});

/**
 * GET /pomucky/search
 * 
 * Vyhledá v pomůckách
 * 
 * @query
 * - id - přesné ID pomůcky
 * - nazev - fulltext hledání
 * - kategorie - kategorie pomůcky
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
router.get('/search', async (ctx) => {
	const query = {};
	if (typeof ctx.query.nazev === "string") {
		query.nazev = {
			$text: {
				$search: req.query.nazev,
				$language: "cs"
			}
		};
	}
	if (Array.isArray(ctx.query.kategorie) && ctx.query.kategorie.every(t => typeof t === "string")) {
		query.kategorie = { $in: ctx.query.kategorie };
	}
	if (Array.isArray(req.query.id) && req.query.id.every(t => typeof t === "string")) {
		query._id = { $in: req.query.id };
	}
	const docs = await Pomucka.find(query);
	ctx.body = docs;
});

export default router;