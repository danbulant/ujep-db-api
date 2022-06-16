import Router from '@koa/router';
import createError from 'http-errors';
import mongoose from 'mongoose';

import { Pomucka } from '../models/pomucka.js';
var router = new Router();

/**
 * @typedef Pomucka
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
 *  @property {string[]} kategorie - seznam kategorií
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
 *  @property {string} id - přesné ID pomůcky
 *  @property {string} nazev - fulltext hledání
 *  @property {string} kategorie - kategorie pomůcky
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
    if (!mongoose.isValidObjectId(ctx.params.id)) throw createError(404);
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
    if (!mongoose.isValidObjectId(ctx.params.id)) throw createError(404);
	const doc = Pomucka.find({
		_id: ctx.params.id
	});
	if (!doc) throw createError(404);
	if (typeof ctx.request.body === "string") throw createError(401);
	/** @type {Partial<Pomucka>} */
	const body = ctx.request.body;
	if(!doc.details) doc.details = {};
	if (typeof body.name === "string") {
		doc.name = body.name;
	}
	if (body.details && typeof body.details.author === "string") {
		doc.details.author = body.details.author;
	}
	if (body.details && typeof body.details.year === "number") {
		doc.details.year = body.details.year;
	}
	if (body.details && typeof body.details.company == "string") {
		doc.details.company = body.details.company;
	}
	if (body.details && typeof body.details.mistoVydani == "string") {
		doc.details.mistoVydani = body.details.mistoVydani;
	}
	if (typeof body.signatura == "string") {
		doc.signatura = body.signatura;
	}
	if (typeof body.ISXN == "string") {
		doc.ISXN = body.ISXN;
	}
	if (Array.isArray(body.kategorie) && body.kategorie.findIndex(t => typeof t !== "string") === -1) {
		doc.kategorie = body.kategorie;
	}
	await doc.save();
	ctx.body = doc;
});

export default router;