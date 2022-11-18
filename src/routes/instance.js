import Router from '@koa/router';
import createError from 'http-errors';

import { Instances } from '../models/instances.js';
import { Place } from '../models/place.js';
import { Pomucka } from '../models/pomucka.js';
import { UserRoles } from '../models/user.js';
import { parseBody } from '../utils.js';
var router = new Router();

/**
 * @typedef Instance
 * @property {string} _id - unikátní ID instance
 * @property {Pomucka} pomucka - ID pomůcky
 * @property {Place} ownedBy - ID místa které vlastní instanci
 * @property {Place} currentlyAt - ID místa které má instanci vypůjčenou, nebo vlastní
 * @property {{ name: string, identifier: string }} [rentedBy] - kdo má instanci vypůjčenou
 */


router.get("/instances", async (ctx) => {
    if(!ctx.state.user) throw createError(401, "user_not_logged_in");
    const instances = await Instances.find({}, {}, { populate: ["pomucka", "ownedBy", "currentlyAt"] });
    ctx.body = instances.map(instance => {
        if(instance.ownedBy) instance.ownedBy.banner = undefined;
        if(instance.currentlyAt) instance.ownedBy.banner = undefined;
        return {
            pomucka: instance.pomucka,
            ownedBy: instance.ownedBy,
            currentlyAt: instance.currentlyAt,
            rentedBy: (ctx.state.user >= UserRoles.GLOBAL_MANAGER || instance.currentlyAt === ctx.state.place.id) ? instance.rentedBy : !!instance.rentedBy
        };
    });
});

router.get("/instances/@local", async (ctx) => {
    if(!ctx.state.user) throw createError(401, "user_not_logged_in");
    const instances = await Instances.find({
        currentlyAt: ctx.state.place.id
    }, {}, { populate: ["pomucka", "ownedBy", "currentlyAt"] });
    ctx.body = instances.map(instance => {
        if(instance.ownedBy) instance.ownedBy.banner = undefined;
        if(instance.currentlyAt) instance.ownedBy.banner = undefined;
        return {
            pomucka: instance.pomucka,
            ownedBy: instance.ownedBy,
            currentlyAt: instance.currentlyAt,
            rentedBy: (ctx.state.user >= UserRoles.GLOBAL_MANAGER || instance.currentlyAt === ctx.state.place.id) ? instance.rentedBy : !!instance.rentedBy
        };
    });
});

/**
 * POST /pomucky/:id/instances
 * 
 * Přidá novou instanci pomůcky.
 * 
 * @query
 *  @property {string} place - ID místa instance, pouze pro GLOBAL_MANAGER
 * 
 * @response {Instance}
 */
router.post('/pomucky/:id/instances', parseBody(), async (ctx) => {
    if (!ctx.state.user) throw createError(401, "user_not_logged_in");
    const pomucka = await Pomucka.findById({
        _id: ctx.params.id
    });
    if (!pomucka) throw createError(404, "pomucka_not_found");
    let place = ctx.state.place;
    if (ctx.query.place) {
        if (ctx.state.role < UserRoles.GLOBAL_MANAGER) throw createError(403, "insufficient_role");
        place = await Place.findById(ctx.query.place);
        if (!place) throw createError(404, "place_not_found");
    }
    const instance = new Instances({
        pomucka,
        ownedBy: place,
        currentlyAt: place
    });
    await instance.save();
    ctx.body = instance;
});

/**
 * GET /pomucky/:id/instances
 * 
 * Zobrazí seznam instancí dané pomůcky
 * 
 * @param id - přesné ID (_id) pomůcky
 * 
 * @response
 *  @property {Instance[]} instances - seznam instancí. Informace o osobě jež si vypůjčila pomůcku jsou dostupné pouze pokud je místo přihlášeného uživatele označené jako místo kde se nachází instance pomůcky, nebo GLOBAL_MANAGER a vyšším uživatelům.
 *  @property {Place[]} places - referencovaná místa z pomůcek
 *  @property {Pomucka} pomucka - informace o pomůcce
 */
router.get("/pomucky/:id/instances", async (ctx) => {
    const pomucka = await Pomucka.find({
        _id: ctx.params.id
    });
    if (!pomucka) throw createError(404, "pomucka_not_found");
    const instances = await Instances.find({
        pomucka: pomucka
    });
    const places = await Place.find({
        _id: {
            $in: instances.map(t => [t.ownedBy, t.currentlyAt]).flat().filter((v, i, a) => a.indexOf(v) === i)
        }
    });
    ctx.body = {
        instances: instances.map(instance => {
            if(instance.ownedBy) instance.ownedBy.banner = null;
            if(instance.currentlyAt) instance.ownedBy.banner = null;
            return {
                pomucka: instance.pomucka,
                ownedBy: instance.ownedBy,
                currentlyAt: instance.currentlyAt,
                rentedBy: (ctx.state.user >= UserRoles.GLOBAL_MANAGER || instance.currentlyAt === ctx.state.place.id) ? instance.rentedBy : !!instance.rentedBy
            };
        }),
        places, pomucka
    };
});

/**
 * GET /instances/:id
 * 
 * Zobrazí detaily jedné instance.
 * 
 * Informace o osobě jež si vypůjčila pomůcku jsou dostupné pouze pokud je místo přihlášeného uživatele označené jako místo kde se nachází instance pomůcky, nebo GLOBAL_MANAGER a vyšším uživatelům.
 * 
 * @param id - přesné ID (_id) instance pomůcky
 * 
 * @response {Instance}
 */
router.get("/instances/:id", async (ctx) => {
    const instance = await Instances.find({
        _id: ctx.params.id
    }, {}, { populate: ["pomucka", "ownedBy", "currentlyAt"] });
    ctx.body = {
        pomucka: instance.pomucka,
        ownedBy: instance.ownedBy,
        currentlyAt: instance.currentlyAt,
        rentedBy: (ctx.state.user >= UserRoles.GLOBAL_MANAGER || instance.currentlyAt === ctx.state.place.id) ? instance.rentedBy : !!instance.rentedBy
    };
});

/**
 * PUT /instances/:id
 * 
 * Aktualizuje detaily jedné instance.
 * Vyžaduje GLOBAL_MANAGER pokud není vlastníkem ani vypůjčencem instance
 * 
 * @param id - přesné ID (_id) instance pomůcky
 * @auth
 * 
 * @request {{ currentlyAt: string, rentedBy?: { name: string, identifier: string } }}
 * @response {Instance}
 */
router.put("/instances/:id", parseBody(), async (ctx) => {
    if (!ctx.state.user) throw createError(401, "user_not_logged_in");
    const body = ctx.request.body;
    if (!body || typeof body === "string") throw createError(400, "invalid_body");

    const instance = await Instances.find({
        _id: ctx.params.id
    }, {}, { populate: ["pomucka", "ownedBy", "currentlyAt"] });

    if (ctx.state.place.id !== instance.ownedBy.id && ctx.state.place.id !== instance.currentlyAt.id && ctx.state.role < UserRoles.GLOBAL_MANAGER)
        throw createError(403, "insufficient_role");

    if (body.currentlyAt) {
        const newPlace = await Place.findById(body.currentlyAt);
        if (!newPlace) throw createError(404, "not_found", { key: "currentlyAt", err: "not_found" });
        instance.currentlyAt = newPlace;
    }
    if (body.rentedBy) {
        if (typeof body.rentedBy.name !== 'string') throw createError(400, "invalid_body", { key: "rentedBy.name", err: "invalid_type" });
        if (typeof body.rentedBy.identifier !== 'string') throw createError(400, "invalid_body", { key: "rentedBy.identifier", err: "invalid_type" });
        instance.rentedBy = { name: body.rentedBy.name, identifier: body.rentedBy.identifier };
    }

    await instance.save();

    ctx.body = instance;
});




export default router;