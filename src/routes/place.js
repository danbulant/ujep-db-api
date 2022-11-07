import Router from '@koa/router';
import createError from 'http-errors';
import mongoose from 'mongoose';
import { Instances } from '../models/instances.js';

import { Place } from '../models/place.js';
import { UserRoles } from '../models/user.js';
import { parseBody } from '../utils.js';

var router = new Router();

/**
 * @typedef Place
 * @property {string} name
 * @property {string} description
 * @property {string} website
 * @property {{ email: string, phone?: string, name: string, description: string }} contacts
 */


/**
 * GET /user/@self/place
 * 
 * Zobrazí informace o místě kam patří přihlášený uživatel
 * @auth
 * @response {Place}
 */
router.get("/users/@self/place", async (ctx) => {
    if (!ctx.state.user) throw createError(401);
    ctx.body = ctx.state.place;
});

/**
 * @typedef LocalStats
 * @property {number} ownedBy - počet vlastněných instancí
 * @property {number} currentlyAt - počet instancí, které jsou v daném místě
 * @property {number} rentedOwned - počet instancí, které jsou vypůjčené, a zároveň jsou vlastněné
 * @property {number} rentedCurrentlyAt - počet instancí, které jsou vypůjčené, a zároveň jsou v daném místě
 */

/**
 * GET /users/@self/place/stats
 * 
 * Zobrazí statistiky o místě kam patří přihlášený uživatel
 * 
 * @auth
 * @response
 * @property {number} globalInstanceCount
 * @property {LocalStats} local
 */
router.get("/users/@self/place/stats", async (ctx) => {
    if (!ctx.state.user) throw createError(401);
    ctx.body = {
        local: {
            ownedBy: await Instances.count({ ownedBy: ctx.state.place._id }),
            currentlyAt: await Instances.count({ currentlyAt: ctx.state.place._id }),
            rentedOwned: await Instances.count({ rentedBy: { $exists: true }, ownedBy: ctx.state.place._id }),
            rentedCurrentlyAt: await Instances.count({ rentedBy: { $exists: true }, currentlyAt: ctx.state.place._id })
        },
        globalInstanceCount: await Instances.count(),
        globalInstanceRentedCount: await Instances.count({ rentedBy: { $exists: true } })
    };
});

/**
 * GET /stats
 * 
 * Zobrazí statistiky o všech místech
 * 
 * @response
 *  @property {number} globalInstanceCount - celkový počet všech instancí
 */
router.get("/stats", async (ctx) => {
    ctx.body = {
        globalInstanceCount: await Instances.count(),
        globalInstanceRentedCount: await Instances.count({ rentedBy: { $exists: true } })
    }
});

/**
 * PUT /user/@self/place
 * 
 * Aktualizuje informace o místě
 * @auth
 * @role LOCAL_MANAGER
 * @request {Partial<Place>}
 * @response {Place}
 */
router.put("/users/@self/place", parseBody(), async (ctx) => {
    if (!ctx.state.user) throw createError(401);
    if (ctx.state.role < UserRoles.LOCAL_MANAGER) throw createError(403);
    const place = ctx.state.place;
    const body = ctx.request.body;
    if (body.name && typeof body.name === "string") place.name = body.name;
    if (body.description && typeof body.description === "string") place.description = body.description;
    if (body.website && typeof body.website === "string") place.website = body.website;
    if (body.contacts) {
        if(!Array.isArray(body.contacts)) throw createError(400, "contacts must be an array");
        if(body.contacts.some(c => typeof c.email !== "string" || !c.email)) throw createError(400, "contacts must have email");
        if(body.contacts.some(c => !["string", "undefined"].includes(typeof c.phone))) throw createError(400, "contacts must have valid phone, or omit it");
        if(body.contacts.some(c => typeof c.name !== "string" || !c.name)) throw createError(400, "contacts must have name");
        if(body.contacts.some(c => typeof c.description !== "string" || !c.description)) throw createError(400, "contacts must have description");
        place.contacts = body.contacts;
    }
    if (body.banner) {
        place.banner.data = Buffer.from(body.banner.data, "base64");
        place.banner.mimetype = body.mimetype;
    }
    await place.save();
    ctx.body = place;
});

/**
 * GET /places
 * 
 * Získá seznam míst
 * @response {Place[]}
 */
router.get("/places", async (ctx) => {
    const places = await Place.find();
    ctx.body = places;
});

/**
 * POST /places
 * 
 * Vytvoří nové místo
 * @auth
 * @role GLOBAL_ADMIN
 * @request {Place}
 * @response {Place}
 */
router.post("/places", parseBody(), async (ctx) => {
    if(!ctx.state.user) throw createError(401);
    if(ctx.state.role < UserRoles.GLOBAL_ADMIN) throw createError(403);
    if(typeof ctx.request.body == "string" || !ctx.request.body) throw createError(400);
    const body = ctx.request.body;
    if(typeof body.name !== "string" || !body.name) throw createError(400);
    if(typeof body.description !== "string" || !body.description) throw createError(400);
    if(typeof body.website !== "string" || !body.website) throw createError(400);
    if(!Array.isArray(body.contacts)) throw createError(400);
    if(body.contacts.some(c => typeof c.email !== "string" || !c.email)) throw createError(400);
    if(body.contacts.some(c => !["string", "undefined"].includes(typeof c.phone))) throw createError(400);
    if(body.contacts.some(c => typeof c.name !== "string" || !c.name)) throw createError(400);
    if(body.contacts.some(c => typeof c.description !== "string" || !c.description)) throw createError(400);
    var buf;
    if(body.buffer) {
        buf = {
            data: Buffer.from(body.buffer.data, "base64"),
            mimetype: body.buffer.mimetype
        };
    }
    const place = new Place({
        name: body.name,
        description: body.description,
        website: body.website,
        contacts: body.contacts,
        banner: buf
    });
    await place.save();
    ctx.body = place;
})

/**
 * GET /places/:id
 * 
 * Získá informace o jednom místě
 * @response {Place}
 */
router.get("/places/:id", async (ctx) => {
    if (!mongoose.isValidObjectId(ctx.params.id)) throw createError(404);
    const place = await Place.findById(ctx.params.id);
    if (!place) throw createError(404);
    ctx.body = place;
});

export default router;
