import Router from '@koa/router';
import createError from 'http-errors';
import bcrypt from 'bcrypt';
import { SignJWT } from "jose";

import { User, UserRoles } from '../models/user.js';
import { privateKey } from '../keys.js';
import mongoose from 'mongoose';
import { Place } from '../models/place.js';
import { parseBody } from '../utils.js';

var router = new Router();

/**
 * @typedef User
 *  @property {string} _id
 *  @property {string} name
 *  @property {number} role
 *  @property {string} displayName
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
router.put("/token", parseBody(), async (ctx) => {
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
        displayName: user.displayName,
        forceChangePassword: user.forceChangePassword,
        role: user.role,
        place: user.place
    };
});

/**
 * DELETE /token
 * 
 * Odhlásí uživatele
 */
router.delete("/token", async (ctx) => {
    ctx.cookies.set("token");
    ctx.body = {};
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
router.post("/users", parseBody(), async (ctx) => {
    if (!ctx.state.user) throw createError(401);
    if (ctx.state.role < UserRoles.LOCAL_ADMIN) throw createError(403);
    const body = ctx.request.body;
    if (!body || typeof body === "string") throw createError(400);
    if (!body.role || typeof body.role !== "number") throw createError(400, "Role is required");
    body.role = Math.round(body.role);
    if (!body.name || typeof body.name !== "string" || !body.name.includes("@") || body.name.length < 2 || body.name.length > 256) throw createError(400, "Invalid name");
    if (!body.password || typeof body.password !== "string" || body.password.length < 6 || body.password.length > 72) throw createError(400, "Invalid password");
    if (!body.displayName) body.displayName = body.name;
    if (!body.displayName || typeof body.displayName !== "string" || body.displayName.length < 1 || body.displayName.length > 256) throw createError(400, "Invalid displayName");
    if (body.place && body.place !== ctx.state.place.id) {
        if (ctx.state.role < UserRoles.GLOBAL_ADMIN) throw createError(403);
        if(!mongoose.isValidObjectId(body.place)) throw createError(400);
        let place = await Place.findById(body.place);
        if(!place) throw createError.NotFound("place_not_found");
    }
    if (body.role < UserRoles.USER) throw createError(400, "Invalid role");
    if (body.role > ctx.state.role) throw createError(403, "Cannot create higher role");
    const user = new User({
        name: body.name,
        displayName: body.displayName,
        role: body.role,
        place: body.place || ctx.state.place.id,
        forceChangePassword: true,
        password: await bcrypt.hash(body.password, 10)
    });
    await user.save();

    ctx.body = {
        _id: user.id,
        name: user.name,
        displayName: user.displayName,
        forceChangePassword: user.forceChangePassword,
        role: user.role,
        place: user.place
    };
});

/**
 * PUT /users/@self
 * 
 * Aktualizuje informace o uživateli.
 * Momentálně umí jen heslo a display name.
 * 
 * @auth
 * 
 * @request {{ oldPassword?: string, newPassword?: string }}
 * @response {User}
 */
router.put("/users/@self", parseBody(), async (ctx) => {
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
    if (body.displayName) {
        if (typeof body.displayName !== "string" || body.displayName.length < 1 || body.displayName.length > 256) throw createError.BadRequest("invalid_display_name");
        user.displayName = body.displayName;
    }

    await user.save();

    ctx.body = {
        _id: user.id,
        name: user.name,
        displayName: user.displayName,
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
        displayName: user.displayName,
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
    if (!mongoose.isValidObjectId(ctx.params.id)) throw createError(400);
    if (!ctx.state.user) throw createError(401);
    if (ctx.state.role < UserRoles.LOCAL_ADMIN) throw createError(403);
    const user = await User.findById(ctx.params.id, {}, { populate: "place" });
    if (!user) throw createError(404);
    if (user.place.id !== ctx.state.place.id && ctx.state.role < UserRoles.GLOBAL_ADMIN) throw createError(403);

    ctx.body = {
        _id: user.id,
        name: user.name,
        displayName: user.displayName,
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
 * @role LOCAL_MANAGER
 * @response {User[]}
 */
router.get("/places/@local/users", async (ctx) => {
    if (!ctx.state.user) throw createError(401);
    if (ctx.state.role < UserRoles.LOCAL_MANAGER) throw createError(403);
    const users = await User.find({ place: ctx.state.place.id });
    ctx.body = users.map(user => ({ _id: user.id, name: user.name, displayName: user.displayName, role: user.role, place: user.place }));
});

/**
 * GET /places/:id/users
 * 
 * Zobrazí seznam uživatelů patřící k místu
 * 
 * @auth
 * @role GLOBAL_MANAGER
 * @response {User[]}
 */
router.get("/places/:id/users", async (ctx) => {
    if (!mongoose.isValidObjectId(ctx.params.id)) throw createError(400);
    if (!ctx.state.user) throw createError(401);
    if (ctx.state.role < UserRoles.GLOBAL_MANAGER) throw createError(403);
    const place = await Place.findById(ctx.params.id);
    if (!place) throw createError(404);
    const users = await User.find({ place: place.id });
    ctx.body = users.map(user => ({ _id: user.id, name: user.name, displayName: user.displayName, role: user.role, place: user.place }));
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
    ctx.body = users.map(user => ({ _id: user.id, name: user.name, displayName: user.displayName, role: user.role, place: user.place }));
});

export default router;
