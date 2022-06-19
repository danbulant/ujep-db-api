import "dotenv/config";
import Koa from "koa";
import logger from "koa-morgan";
import cors from "@koa/cors";
import Router from "@koa/router";
import bodyParser from "koa-body";
import mongoose from "mongoose";
import createError from 'http-errors';
import { jwtVerify } from "jose";

import indexRouter from "./routes/index.js";
import pomuckyRouter from "./routes/pomucky.js";
import instanceRouter from "./routes/instance.js";
import placeRouter from "./routes/place.js";
import userRouter from "./routes/user.js";
import { User } from "./models/user.js";
import { publicKey } from "./keys.js";

/* istanbul ignore next */
{
	const mongoDB = globalThis.__MONGO_URI__ || process.env.MONGODB || 'mongodb://127.0.0.1:27017/ujep';
	mongoose.connect(mongoDB, { useNewUrlParser: true, useUnifiedTopology: true });	
	mongoose.connection.on('error', console.error.bind(console, 'MongoDB error!'));
}

var app = new Koa();

app.use(async (ctx, next) => {
	try {
		await next();
	} catch (e) /* istanbul ignore next */ {
		ctx.status = e.status || 500;
		if (e.expose) {
			ctx.body = {
				status: ctx.status,
				message: e.message
			};
		} else {
			ctx.body = {
				status: ctx.status,
				message: "internal"
			}
		}
		if (ctx.status === 500) console.error(e);
	}
})

app.use(cors());
app.use(logger('dev'));
app.use(bodyParser({ text: false }));

/**
 * @topic Přihlášení
 * 
 * Přihlášení je přes [[PUT /token]]. To po správném přihlášení vrátí uživatele. Pokud bude `forceChangePassword` na `true`, tak je
 * třeba nejdříve změnit heslo. Veškeré jiné API requesty selžou. Změna hesla lze provést přes [[PUT /users/@self]].
 */
app.use(async (ctx, next) => {
	if (ctx.cookies.get("token")) {
		try {
			const { payload, protectedHeader } = await jwtVerify(ctx.cookies.get("token"), publicKey, {
				issuer: "urn:pomuckydb:issuer",
				audience: "urn:pomuckydb:audience"
			});
			var user = await User.findById(payload.sub, {}, { populate: "place" });
		} catch(e) {
			ctx.cookies.set("token");
			throw new createError.Forbidden("invalid_token");
		}
		if (!user) throw new createError.Forbidden("user_deleted");

		ctx.state.user = user;
		ctx.state.role = user.role;
		ctx.state.place = user.place;

		if (user.forceChangePassword && (ctx.method !== "PUT" || ctx.request.path !== "/users/@self")) {
			throw new createError.Forbidden("password_change_required");
		}
	}
	await next();
});

/**
 * @topic Role
 * 
 * Uživatelé jsou rozdělení do rolí.
 * Ty mají následující hodnoty:
 * ```
 * DEFAULT: 0,
 * LOCAL_MANAGER: 1,
 * LOCAL_ADMIN: 2,
 * GLOBAL_MANAGER: 3,
 * GLOBAL_ADMIN: 4,
 * DEVELOPER: 5
 * ```
 * 
 * Uživatel může vždy dělat všechny akce co ta role pod ním (i.e. GLOBAL_MANAGER je zároveň LOCAL_ADMIN i LOCAL_MANAGER).
 */

var router = new Router();

router.get("/", indexRouter.routes());

app.use(pomuckyRouter.routes(), pomuckyRouter.allowedMethods());
app.use(instanceRouter.routes(), instanceRouter.allowedMethods());
app.use(placeRouter.routes(), placeRouter.allowedMethods());
app.use(userRouter.routes(), userRouter.allowedMethods());
app.use(router.routes(), router.allowedMethods());

export { app };