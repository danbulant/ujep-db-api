import "dotenv/config";
import Koa from "koa";
import logger from "koa-morgan";
import cors from "@koa/cors";
import Router from "@koa/router";
import bodyParser from "koa-body";
import mongoose from "mongoose";
import indexRouter from "./routes/index.js";
import pomuckyRouter from "./routes/pomucky.js";

const mongoDB = process.env.MONGODB || 'mongodb://127.0.0.1:27017/ujep';

mongoose.connect(mongoDB, { useNewUrlParser: true, useUnifiedTopology: true });

mongoose.connection.on('error', console.error.bind(console, 'MongoDB error!'));

var app = new Koa();

app.use(async (ctx, next) => {
	try {
		await next();
	} catch(e) {
		ctx.status = e.status || 500;
		ctx.body = {
			message: err.message
		};
		if(ctx.status === 500) console.error(e);
	}
})

app.use(cors());
app.use(logger('dev'));
app.use(bodyParser());

var router = new Router();

router.get("/", indexRouter.routes());
router.get("/pomucky", pomuckyRouter.routes(), pomuckyRouter.allowedMethods());

app.use(router.routes(), router.allowedMethods());

export { app };