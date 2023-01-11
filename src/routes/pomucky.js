import Router from '@koa/router';
import createError from 'http-errors';
import mongoose from 'mongoose';
import bodyParser from "koa-body";

import { UserRoles } from '../models/user.js';
import { Pomucka } from '../models/pomucka.js';
import { Image } from '../models/image.js';
import { parseBody } from '../utils.js';

var router = new Router();

/**
 * @typedef Pomucka
 * @property {string} _id
 * @property {string} name
 * @property {string} signatura
 * @property {string} ISXN
 * @property {string[]} kategorie
 * @property {{ author: string, year: string, company: string, mistoVydani: string }} details
 * @property {{ description: string, url: string }[]} links
 */

/**
 * @typedef Image
 * @property {string} _id
 * @property {string} pomucka
 * @property {string} alt
 * @property {string} data
 * @property {string} mimetype
 */

/**
 * @typedef MinimalImage
 * @property {string} _id
 * @property {string} alt
 * @property {string} mimetype
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

router.post('/pomucky', parseBody(), async (ctx) => {
	if (!ctx.state.user) throw createError(401, "user_not_logged_in");
	if (ctx.state.role < UserRoles.GLOBAL_ADMIN) throw createError(403, "not_authorized");
	if (typeof ctx.request.body == "string" || !ctx.request.body) throw createError(400, "invalid_body");
	const body = ctx.request.body;
	var add = new Pomucka({
		name: body.name.trim(),
		ISXN: parseInt(body.isxn) || null,
		categories: body.categories,
		details: {
			author: body.details.author?.trim() || null,
			year: parseInt(body.details.year) || null,
			company: body.details.company?.trim() || null,
			description: body.details.description?.trim() || null
		},
		links: body.links?.map(t => ({
			description: t.description,
			url: t.url
		})) || []
	});
	await add.save();
	ctx.body = {
		...add.toObject(),
		date: add._id.getTimestamp()
	};
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
		authors,
		years,
		companies,
		mistaVydani,
		categories
	] = await Promise.all([
		Pomucka.distinct("details.author"),
		Pomucka.distinct("details.year"),
		Pomucka.distinct("details.company"),
		Pomucka.distinct("details.mistoVydani"),
		Pomucka.distinct("categories")
	]);
	ctx.response.headers["Cache-Control"] = "max-age=43200";

	ctx.body = { authors, years, companies, mistaVydani, categories };
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
	let page = parseInt(ctx.query.page) || 0;
	let limit = parseInt(ctx.query.limit) || 100;
	if(page < 0) throw createError(400, "invalid_page");
	if(limit < 1 || limit > 200) throw createError(400, "invalid_limit");
	const query = {};
	let sort;
	if (typeof ctx.query.name === "string") {
		query.$text = {
			$search: ctx.query.name
		};
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
	const docs = await Pomucka.find(query).sort(sort).skip(page * limit).limit(limit);

	const [
		authors,
		years,
		companies,
		mistaVydani,
		categories
	] = await Promise.all([
		Pomucka.distinct("details.author", query),
		Pomucka.distinct("details.year", query),
		Pomucka.distinct("details.company", query),
		Pomucka.distinct("details.mistoVydani", query),
		Pomucka.distinct("categories", query)
	]);

	ctx.body = {
		results: docs.map(t => ({
			...t.toObject(),
			date: t._id.getTimestamp()
		})),
		options: {
			authors, years, companies, mistaVydani, categories
		}
	};
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
	if (!mongoose.isValidObjectId(ctx.params.id)) throw createError(404, "not_found");
	const doc = await Pomucka.findById(ctx.params.id);
	if (!doc) throw createError(404, "not_found");
	ctx.body = {
		...doc.toObject(),
		date: doc._id.getTimestamp()
	};
});

/**
 * PUT /pomucky/:id
 * 
 * Aktualizuje data pomůcky
 * 
 * @auth
 * @role GLOBAL_ADMIN
 * 
 * @param id - přesné ID (_id) pomůcky
 * 
 * @request {Partial<Omit<Pomucka, "_id">>}
 * 
 * @response {Pomucka}
 */
router.put("/pomucky/:id", parseBody(), async (ctx) => {
	if (!mongoose.isValidObjectId(ctx.params.id)) throw createError(404, "not_found");
	if (!ctx.state.user) throw createError(401, "user_not_logged_in");
	if (ctx.state.role < UserRoles.GLOBAL_ADMIN) throw createError(403, "not_authorized");
	const doc = Pomucka.findOne({
		_id: ctx.params.id
	});
	if (!doc) throw createError(404, "not_found");
	if (typeof ctx.request.body === "string") throw createError(401, "invalid_body");
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
	if (typeof body.signatura == "string") {
		doc.signatura = body.signatura;
	}
	if (typeof body.ISXN == "string") {
		doc.ISXN = body.ISXN;
	}
	if (Array.isArray(body.categories) && body.categories.findIndex(t => typeof t !== "string") === -1) {
		doc.categories = body.categories;
	}
	if(Array.isArray(body.links) && body.links.findIndex(t => typeof t !== "object" || typeof t.url !== "string" || typeof t.description !== "string" || !t.url.startsWith("https://")) === -1) {
		doc.links = body.links;
	}
	await doc.updateOne();
	ctx.body = {
		...doc.toObject(),
		date: doc._id.getTimestamp()
	};
});

/**
 * PUT /pomucky/:id/images
 * 
 * Nahrává obrázky pro pomůcku.
 * Alt se použije jako alternativní text pro čtečky obrazovky.
 * Mimetype je nutný pro správné zobrazení obrázku. Povolené mimetypy jsou: image/jpeg, image/png, image/gif, image/webp
 * Pro animované věci se doporučuje WEBP kvůli menší velikosti a vyšší kvalitě.
 * 
 * @auth
 * @role GLOBAL_ADMIN
 * 
 * @param id - přesné ID (_id) pomůcky
 * 
 * @request {{ alt: String, data: String, mimetype: String }}
 */
router.put("/pomucky/:id/images", bodyParser({ text: false, multipart: false, json: true, urlencoded: false, jsonLimit: "10mb" }), async (ctx) => {
	if(!mongoose.isValidObjectId(ctx.params.id)) throw createError(404, "not_found");
	if (!ctx.state.user) throw createError(401, "user_not_logged_in");
	if (ctx.state.role < UserRoles.GLOBAL_ADMIN) throw createError(403, "not_authorized");
	const doc = await Pomucka.findById(ctx.params.id);
	if(!doc) throw createError(404, "not_found");
	const alt = ctx.request.body.alt;
	if(typeof alt !== "string") throw createError(400, "invalid_body", { key: "alt", err: "invalid_type" });
	const mimetype = ctx.request.body.mimetype;
	if(typeof mimetype !== "string") throw createError(400, "invalid_body", { key: "mimetype", err: "invalid_type" });
	if(["image/jpeg", "image/png", "image/gif", "image/webp"].indexOf(mimetype) === -1) throw createError(400, "invalid_body", { key: "mimetype", err: "invalid_value" });
	const data = ctx.request.body.data;
	if(typeof data !== "string") throw createError(400);
	let buffer;
	try {
		buffer = Buffer.from(data, "base64");
	} catch(e) {
		throw createError(400, "invalid_body", { key: "data", err: "invalid_value", details: "Couldn't decode base64 into image." });
	}

	let image = await Image.create({
		alt: alt,
		pomucka: doc._id,
		data: buffer,
		mimetype
	});

	ctx.body = image;
});

/**
 * DELETE /pomucky/:id/images/:imageId
 * 
 * Odstraní obrázek z pomůcky
 * 
 * @auth
 * @role GLOBAL_ADMIN
 * 
 */
router.delete("/pomucky/:id/images/:imageId", async (ctx) => {
	if(!mongoose.isValidObjectId(ctx.params.id)) throw createError(404, "not_found");
	if (!ctx.state.user) throw createError(401, "user_not_logged_in");
	if (ctx.state.role < UserRoles.GLOBAL_ADMIN) throw createError(403, "not_authorized");
	const doc = await Pomucka.findById(ctx.params.id);
	if(!doc) throw createError(404, "not_found");
	if(!mongoose.isValidObjectId(ctx.params.imageId)) throw createError(404, "not_found");
	const image = await Image.findById(ctx.params.imageId);
	if(!image) throw createError(404, "not_found");
	if(image.pomucka.toString() !== doc._id.toString()) throw createError(404, "not_found");
	await image.deleteOne();
	ctx.body = { ok: true };
});

/**
 * GET /pomucky/:id/images
 * 
 * Zobrazí seznam obrázků pro danou pomůcku.
 * 
 * @param id - přesné ID (_id) pomůcky
 * 
 * @response {MinimalImage[]}
 */
router.get("/pomucky/:id/images", async (ctx) => {
	if(!mongoose.isValidObjectId(ctx.params.id)) throw createError(404, "not_found");
	const doc = await Pomucka.findById(ctx.params.id);
	if(!doc) throw createError(404, "not_found");
	const images = await Image.find({ pomucka: doc._id });
	ctx.body = images.map(t => ({ 
		_id: t._id,
		alt: t.alt,
		mimetype: t.mimetype
	}));
});

/**
 * GET /pomucky/:id/images/:imageId
 * 
 * Zobrazí informace o obrázku pro danou pomůcku.
 * 
 * @param id - přesné ID (_id) pomůcky
 * @param imageId - přesné ID (_id) obrázku
 * 
 * @response {Image}
 */
router.get("/pomucky/:id/images/:imageId", async (ctx) => {
	if(!mongoose.isValidObjectId(ctx.params.id)) throw createError(404, "not_found");
	const doc = await Pomucka.findById(ctx.params.id);
	if(!doc) throw createError(404, "not_found");
	if(!mongoose.isValidObjectId(ctx.params.imageId)) throw createError(404, "not_found");
	const image = await Image.findById(ctx.params.imageId);
	if(!image) throw createError(404, "not_found");
	if(image.pomucka.toString() !== doc._id.toString()) throw createError(404, "not_found");
	ctx.body = image;
});

/**
 * GET /pomucky/:id/images/:imageId/data
 * 
 * Zobrazí data obrázku pro danou pomůcku. Tohle se dá použít jako "src" pro img.
 * 
 * @param id - přesné ID (_id) pomůcky
 * @param imageId - přesné ID (_id) obrázku
 */
router.get("/pomucky/:id/images/:imageId/data", async (ctx) => {
	if(!mongoose.isValidObjectId(ctx.params.id)) throw createError(404, "not_found");
	const doc = await Pomucka.findById(ctx.params.id);
	if(!doc) throw createError(404, "not_found");
	if(!mongoose.isValidObjectId(ctx.params.imageId)) throw createError(404, "not_found");
	const image = await Image.findById(ctx.params.imageId);
	if(!image) throw createError(404, "not_found");
	if(image.pomucka.toString() !== doc._id.toString()) throw createError(404, "not_found");
	ctx.body = image.data;
	ctx.type = image.mimetype;
});

/**
 * GET /images/:imageId
 * 
 * Dá redirect na plnohodnotnou URL pro informace o obrázku.
 */
router.get("/images/:id", async (ctx) => {
	if(!mongoose.isValidObjectId(ctx.params.id)) throw createError(404, "not_found");
	const image = await Image.findById(ctx.params.id);
	if(!image) throw createError(404, "not_found");
	ctx.redirect(`/api/v1/pomucky/${image.pomucka}/images/${image._id}`);
});

/**
 * GET /images/:imageId/data
 * 
 * Dá redirect na plnohodnotnou URL pro data obrázku.
 */
router.get("/images/:id/data", async (ctx) => {
	if(!mongoose.isValidObjectId(ctx.params.id)) throw createError(404, "not_found");
	const image = await Image.findById(ctx.params.id);
	if(!image) throw createError(404, "not_found");
	ctx.redirect(`/api/v1/pomucky/${image.pomucka}/images/${image._id}/data`);
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
	if (!mongoose.isValidObjectId(ctx.params.id)) throw createError(400, "not_found");
	if (!ctx.state.user) throw createError(401, "user_logged_in");
	if (ctx.state.role < UserRoles.GLOBAL_ADMIN) throw createError(403, "not_authorized");
	const doc = Pomucka.find({
		_id: ctx.params.id
	});
	if (!doc) throw createError(404, "not_found");
	ctx.body = await doc.deleteOne();
});

export default router;