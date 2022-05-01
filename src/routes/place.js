import Router from '@koa/router';
import createError from 'http-errors';
import { Place } from '../models/place';

var router = new Router();

/**
 * @typedef Place
 * @property {string} name
 * @property {string} description
 * @property {{ email: string, phone: string, name: string, description: string }} contacts
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
router.put("/users/@self/place", async (ctx) => {
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
 * GET /places/:id
 * 
 * Získá informace o jednom místě
 * @response {Place}
 */
router.get("/places/:id", async (ctx) => {
    const place = await Place.findById(ctx.params.id);
    if (!place) throw createError(404);
    ctx.body = place;
});

export default router;
