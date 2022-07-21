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
    if (!ctx.state.user) throw createError(401);
    if (ctx.state.role < UserRoles.GLOBAL_ADMIN) throw createError(403);
	if (typeof ctx.request.body == "string" || !ctx.request.body) throw createError(400);
	const body = ctx.request.body;

	var add = new Pomucka({
		name: body.name.trim(),
		signatura: body.signatura.replace(/\/$/, "").trim(),
		ISXN: parseInt(body.isxn) || null,
		kategorie: body.kategorie,
		details: {
			author: body.details.author.trim(),
			year: parseInt(req.body.year) || null,
			company: body.company.trim(),
			mistoVydani: body.mistoVydani.trim(),
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
 *  @property {string[]} id - přesné ID pomůcky
 *  @property {string} name - fulltext hledání
 *  @property {string[]} categories - kategorie pomůcky
 * 
 * @response {Pomucka[]}
 */
router.get('/pomucky/search', async (ctx) => {
	const query = {};
	if (typeof ctx.query.name === "string") {
		query.$text = {
			$search: ctx.query.name,
			$language: "cs"
		};
	}
	if (Array.isArray(ctx.query.categories) && ctx.query.categories.every(t => typeof t === "string")) {
		query.categories = { $in: ctx.query.categories };
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
    if (!mongoose.isValidObjectId(ctx.params.id)) throw createError(400);
	const doc = await Pomucka.findById(ctx.params.id);
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
    if (!ctx.state.user) throw createError(401);
    if (ctx.state.role < UserRoles.GLOBAL_ADMIN) throw createError(403);
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