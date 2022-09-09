import Router from '@koa/router';
import createError from 'http-errors';
import mongoose from 'mongoose';

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
router.get('/users/@self/place', async (ctx) => {
    if (!ctx.state.user) throw createError(401);
    ctx.body = ctx.state.place;
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
    throw createError(500);
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

    const place = new Place({
        name: body.name,
        description: body.description,
        website: body.website,
        contacts: body.contacts
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
