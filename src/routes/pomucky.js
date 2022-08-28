import Router from '@koa/router';
import createError from 'http-errors';
import mongoose from 'mongoose';
import { UserRoles } from '../models/user.js';
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
		categories: body.categories,
		details: {
			author: body.details.author.trim(),
			year: parseInt(body.details.year) || null,
			company: body.details.company.trim(),
			mistoVydani: body.details.mistoVydani.trim(),
			disadvType: body.details.disadvType.trim(),
			disadvDegree: body.details.disadvDegree.trim(),
			disadvTool: parseInt(body.details.disadvTool),
			place: body.details.place || ctx.state.place.id
		}
	});
	await add.save();
	ctx.body = add;
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
	let searchOptions = {
		author:{
			name: "Autor",
			value: await Pomucka.distinct("details.author")
		},
		year:{
			name: "Rok vydání",
			value: await Pomucka.distinct("details.year")
		},
		company: {
			name: "Vydavatel",
			value: await Pomucka.distinct("details.company")
		},
		mistoVydani: {
			name: "Místo vydání",
			value: await Pomucka.distinct("details.mistoVydani")
		},
		disadvType: {
			name: "Typ znevýhodnění",
			value: await Pomucka.distinct("details.disadvType")
		},
		disadvDegree: {
			name: "Stupeň znevýhodnění",
			value: await Pomucka.distinct("details.disadvDegree")
		},
		disadvTool: {
			name: "Typ pomůcky",
			value: await Pomucka.distinct("details.disadvTool")
		},
		category: {
			name: "Kategorie",
			value: await Pomucka.distinct("categories")
		}
	}
	ctx.response.headers["Cache-Control"] = "max-age=43200";

	ctx.body = {
		searchOptions
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
	let sort;
	// search
	if (typeof ctx.query.search === "string") {
		query.name = new RegExp(ctx.query.search, "i");
	}
	if (typeof ctx.query.sort === "string") {
		sort = ctx.query.sort;
		if (sort === "newest") {
			sort = {
				_id: -1
			};
		}
	}
	if (typeof ctx.query.author === "string") {
		query.$text = {
			$search: ctx.query.author
		};
	}
	if (typeof ctx.query.company === "string") {
		query.$text = {
			$search: ctx.query.company
		};
	}
	if(typeof ctx.query.place === "string") {
		query.$text = {
			$search: ctx.query.place
		}
	}
	if (Array.isArray(ctx.query.categories) && ctx.query.categories.every(t => typeof t === "string")) {
		query.categories = { $in: ctx.query.categories };
	}
	if (Array.isArray(ctx.query.id) && ctx.query.id.every(t => typeof t === "string")) {
		query._id = { $in: ctx.query.id };
	}
	const docs = await Pomucka.find(query).sort(sort);
	ctx.body = docs;
});

router.get('/pomucky/search/:key', async (ctx) => {
	let key = ctx.params.key;
	let find;
	if (!key) throw createError(400);
	if (key.length > 3) throw createError(400);
	if(key.length === 1) {
		find = {
			'details.disadvType': key[0]
		}
	}
	if(key.length === 2) {
		find = {
			'details.disadvType': key[0],
			'details.disadvDegree': key[1]
		}
	}
	if(key.length === 3) {
		find = {
			'details.disadvType': key[0],
			'details.disadvDegree': key[1],
			'details.disadvTool': key[2]
		}
	}
	const docs = await Pomucka.find(find);
	if (!docs) throw createError(404);
	ctx.body = docs;
})
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
	if (!doc.details) doc.details = {};
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
	if(body.details && typeof body.details.disadvType === "string") {
		doc.details.disadvType = body.details.disadvType;
	}
	if (body.details && typeof body.details.disadvDegree === "string") {
		doc.details.disadvDegree = body.details.disadvDegree;
	}
	if (body.details && typeof body.details.disadvTool === "string") {
		doc.details.disadvTool = body.details.disadvTool;
	}
	if (body.details && typeof body.details.place === "string") {
		doc.details.place = body.details.place;
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

/**
 * DELETE /pomucky/:id
 * 
 * Smaže pomůcku
 * 
 * @param id - přesné ID (_id) pomůcky
 * 
 * @request {Partial<Omit<Pomucka, "_id">>}
 * 
 * @response {Pomucka}
 */
router.delete("/pomucky/:id", async (ctx) => {
	if (!mongoose.isValidObjectId(ctx.params.id)) throw createError(404);
	if (!ctx.state.user) throw createError(401);
	if (ctx.state.role < UserRoles.GLOBAL_ADMIN) throw createError(403);
	const doc = Pomucka.find({
		_id: ctx.params.id
	});
	if (!doc) throw createError(404);
	ctx.body = await doc.deleteOne();
});

export default router;