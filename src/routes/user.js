import Router from '@koa/router';
import createError from 'http-errors';
import bcrypt from 'bcrypt';
import { SignJWT } from "jose";

import { User, UserRoles } from '../models/user.js';
import { privateKey } from '../keys.js';
import mongoose from 'mongoose';
import { Place } from '../models/place.js';

var router = new Router();

/**
 * @typedef User
 *  @property {string} _id
 *  @property {string} name
 *  @property {number} role
 *  @property {Place} place
 */
/**
 * @typedef {User} CurrentUser
 *  @property {string} forceChangePassword
 */

/**
 * PUT /token
 * 
 * Příhlasí uživatele
 * 
 * @request
 *  @property {string} name
 *  @property {string} password
 *  @property {number} [tfa] - pokud uživatel má zaplé 2 faktorové ověření.
 * 
 * @response {User}
 */
router.put("/token", async (ctx) => {
    const body = ctx.request.body;
    if (!body || typeof body === "string") throw createError(400);
    if (typeof body.name !== "string") throw createError(400);
    if (typeof body.password !== "string") throw createError(400);
    const user = await User.findOne({
        name: body.name
    }, {}, { populate: "place" });
    if (!user) throw createError(404);
    if (!await bcrypt.compare(body.password, user.password)) throw createError(404);
    const jwt = await new SignJWT({ 'sub': user.id })
        .setProtectedHeader({ alg: 'ES256' })
        .setIssuedAt()
        .setIssuer('urn:pomuckydb:issuer')
        .setAudience('urn:pomuckydb:audience')
        .setExpirationTime('12h')
        .sign(privateKey);
    ctx.cookies.set("token", jwt);
    ctx.body = {
        _id: user.id,
        name: user.name,
        forceChangePassword: user.forceChangePassword,
        role: user.role,
        place: user.place
    };
});

/**
 * POST /users
 * 
 * Registruje uživatele.
 * 
 * Pro přiřazení uživatele k jinému místu je vyžadována role GLOBAL_ADMIN.
 * 
 * @auth
 * @role LOCAL_ADMIN
 * 
 * @request
 *  @property {string} name - i když je označeno jako jméno, musí obsahovat zavináč, doporučuje se použít pracovní email. 2 - 256 znaků
 *  @property {string} password - 6 - 72 znaků (momentálně se nekontroluje bezpečnost); BCrypt nepodporuje víc jak 72 znaků (bytes; emoji bude "stát" více; JS length ukazuje správnou hodnotu)
 *  @property {string} role - role uživatele. Musí být maximálně stejná jako tvořící uživatel.
 *  @property {string} [place] - ID místa, pokud se má uživatel vytvořit pro jiné místo (tvořící uživatel musí mít roli global admin)
 * 
 * @response {User}
 */
router.post("/users", async (ctx) => {
    if (!ctx.state.user) throw createError(401);
    if (ctx.state.role < UserRoles.LOCAL_ADMIN) throw createError(403);
    const body = ctx.request.body;
    if (!body || typeof body === "string") throw createError(400);
    if (!body.role || typeof body.role !== "number") throw createError(400);
    body.role = Math.round(body.role);
    if (!body.name || typeof body.name !== "string" || !body.name.includes("@") || body.name.length < 2 || body.name.length > 256) throw createError(400);
    if (!body.password || typeof body.password !== "string" || body.password.length < 6 || body.password.length > 72) throw createError(400);
    if (body.place && body.place !== ctx.state.place.id) {
        if (ctx.state.role < UserRoles.GLOBAL_ADMIN) throw createError(403);
        if(!mongoose.isValidObjectId(body.place)) throw createError.NotFound("place_not_found");
        let place = await Place.findById(body.place);
        if(!place) throw createError.NotFound("place_not_found");
    }
    if (body.role < UserRoles.USER) throw createError(400);
    if (body.role > ctx.state.role) throw createError(403);
    const user = new User({
        name: body.name,
        role: body.role,
        place: body.place || ctx.state.place.id,
        forceChangePassword: true,
        password: await bcrypt.hash(body.password, 10)
    });
    await user.save();

    ctx.body = {
        _id: user.id,
        name: user.name,
        forceChangePassword: user.forceChangePassword,
        role: user.role,
        place: user.place
    };
});

/**
 * PUT /users/@self
 * 
 * Aktualizuje informace o uživateli.
 * Momentálně umí jen heslo.
 * 
 * @auth
 * 
 * @request {{ oldPassword?: string, newPassword?: string }}
 * @response {User}
 */
router.put("/users/@self", async (ctx) => {
    if (!ctx.state.user) throw createError(401);
    const body = ctx.request.body;
    if (!body || typeof body === "string") throw createError(400);

    const user = ctx.state.user;

    if (body.newPassword) {
        if (typeof body.newPassword !== "string" || body.newPassword.length < 6 || body.newPassword.length > 72) throw createError.BadRequest("invalid_password");
        if (user.forceChangePassword && await bcrypt.compare(body.newPassword, user.password)) throw createError.BadRequest("password_not_changed");
        if (typeof body.oldPassword !== "string" || !await bcrypt.compare(body.oldPassword, user.password)) throw createError.BadRequest("wrong_password");
        user.password = await bcrypt.hash(body.newPassword, 10);
        user.forceChangePassword = false;
    }

    await user.save();

    ctx.body = {
        _id: user.id,
        name: user.name,
        forceChangePassword: user.forceChangePassword,
        role: user.role,
        place: user.place
    };
});

/**
 * GET /users/@self
 * 
 * Získá informace o přihlášeném uživateli.
 * 
 * Pro získání informací o uživateli na jiném místě je potřeba GLOBAL_ADMIN.
 * 
 * @auth
 * 
 * @response {User}
 */
router.get("/users/@self", async (ctx) => {
    if (!ctx.state.user) throw createError(401);
    const user = ctx.state.user;

    ctx.body = {
        _id: user.id,
        name: user.name,
        forceChangePassword: user.forceChangePassword,
        role: user.role,
        place: user.place
    };
});

/**
 * GET /users/:id
 * 
 * Získá informace o uživateli.
 * 
 * Pro získání informací o uživateli na jiném místě je potřeba GLOBAL_ADMIN.
 * 
 * @auth
 * @role LOCAL_ADMIN
 * 
 * @response {User}
 */
 router.get("/users/:id", async (ctx) => {
    if (!mongoose.isValidObjectId(ctx.params.id)) throw createError(404);
    if (!ctx.state.user) throw createError(401);
    if (ctx.state.role < UserRoles.LOCAL_ADMIN) throw createError(403);
    const user = await User.findById(ctx.params.id, {}, { populate: "place" });
    if (!user) throw createError(404);
    if (user.place.id !== ctx.state.place.id && ctx.state.role < UserRoles.GLOBAL_ADMIN) throw createError(403);

    ctx.body = {
        _id: user.id,
        name: user.name,
        role: user.role,
        place: user.place
    };
});

/**
 * GET /places/@local/users
 * 
 * Zobrazí seznam uživatelů patřící k místu uživatele
 * 
 * @auth
 * @role LOCAL_ADMIN
 * @response {User[]}
 */
router.get("/places/@local/users", async (ctx) => {
    if (!ctx.state.user) throw createError(401);
    if (ctx.state.role < UserRoles.LOCAL_ADMIN) throw createError(403);
    const users = await User.find({ place: ctx.state.place.id });
    ctx.body = users.map(user => ({ _id: user.id, name: user.name, role: user.role, place: user.place }));
});

/**
 * GET /users
 * 
 * Zobrazí seznam všech uživatelů
 * 
 * @auth
 * @role GLOBAL_ADMIN
 * @response {User[]}
 */
router.get("/users", async (ctx) => {
    if (!ctx.state.user) throw createError(401);
    if (ctx.state.role < UserRoles.GLOBAL_ADMIN) throw createError(403);
    const users = await User.find();
    ctx.body = users.map(user => ({ _id: user.id, name: user.name, role: user.role, place: user.place }));
});

export default router;
