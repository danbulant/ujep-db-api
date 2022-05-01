import Router from '@koa/router';
import createError from 'http-errors';

import { Pomucka } from '../models/pomucka.js';
var router = new Router();

/**
 * @typedef {Pomucka}
 * @property {string} _id
 * @property {string} name
 * @property {string} signatura
 * @property {string} ISXN
 * @property {string[]} kategorie
 * @property {{ author: string, year: string, company: string, mistoVydani: string }} details
 */

/**
 * POST /pomucky
 * 
 * Přidá novou pomůcku.
 * 
 * @request {Omit<Pomucka, "_id">}
 * 
 * @response {Pomucka}
 */
router.post('/pomucky', async (ctx) => {
	if (typeof ctx.request.body == "string" || !ctx.request.body) throw createError(400);
	var ids = [];
	const body = ctx.request.body;

	body.kategorie.split(/[,; ]+/).forEach(element => {
		if (element.substr(element.length - 1) == ".") {
			element = element.slice(0, -1);
		}

		ids.push(element.replace(/^UNIV[:.] /i, "U").replace(/^UU/i, "U").trim());
	});

	var add = new Pomucka({
		name: body.name.replace(/[,=: ]*$/, "").trim(),
		signatura: body.signatura.replace(/\/$/, "").trim(),
		ISXN: parseInt(body.isxn) || null,
		kategorie: ids,
		details: {
			author: body.details.author.replace(/[, ]*$/, "").trim(),
			year: body.details.year && parseInt(req.body.year),
			company: body.company.replace(/[, ]*$/, "").trim(),
			mistoVydani: body.mistoVydani.replace(/[: ]*$/, "").replace(/[\[\]]/g, "").trim(),
		}
	});
	await add.save();
	ctx.body = doc;
});

/**
 * GET /pomucky/searchOptions
 * 
 * Získá možné hodnoty použitelné pro hledání
 * 
 * @response
 * - kategorie - seznam kategorií
 */
router.get("/pomucky/searchOptions", async (ctx) => {
	const [
		kategorie
	] = await Promise.all([
		Pomucka.distinct("kategorie")
	]);

	ctx.response.headers["Cache-Control"] = "max-age=43200";

	ctx.body = {
		kategorie
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
 * @response {Pomucka[]}
 */
router.get('/pomucky/search', async (ctx) => {
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
	if (Array.isArray(ctx.query.id) && ctx.query.id.every(t => typeof t === "string")) {
		query._id = { $in: ctx.query.id };
	}
	const docs = await Pomucka.find(query);
	ctx.body = docs;
});

/**
 * GET /pomucky/:id
 * 
 * Zobrazí detaily jedné pomůcky
 * 
 * @param id - přesné ID (_id) pomůcky
 * 
 * @response {Pomucka}
 */
router.get("/pomucky/:id", async (ctx) => {
	const doc = await Pomucka.find({
		_id: ctx.params.id
	});
	if (!doc) throw createError(404);
	ctx.body = doc;
});

/**
 * PUT /pomucky/:id
 * 
 * Aktualizuje data pomůcky
 * 
 * @param id - přesné ID (_id) pomůcky
 * 
 * @request {Partial<Omit<Pomucka, "_id">>}
 * 
 * @response {Pomucka}
 */
router.put("/pomucky/:id", async (ctx) => {
	const doc = Pomucka.find({
		_id: ctx.params.id
	});
	if (!doc) throw createError(404);
	if (typeof ctx.request.body === "string") throw createError(401);
	const body = ctx.request.body;
	if (typeof body.autor === "string") {
		doc.autor = body.autor;
	}
	if (typeof body.nazev === "string") {
		doc.nazev = body.nazev;
	}
	if (typeof body.rok === "number") {
		doc.rok = body.rok;
	}
	if (typeof body.nakladatel == "string") {
		doc.nakladatel = body.nakladatel;
	}
	if (typeof body.mistoVydani == "string") {
		doc.mistoVydani = body.mistoVydani;
	}
	if (typeof body.signatura == "string") {
		doc.mistoVydani = body.mistoVydani;
	}
	if (typeof body.isxn == "string") {
		doc.isxn = body.isxn;
	}
	if (typeof body.kategorie == "string") {
		doc.kategorie = body.kategorie;
	}
	await doc.save();
	ctx.body = doc;
});

export default router;