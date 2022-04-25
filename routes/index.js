import Router from '@koa/router';

var router = new Router();

/* GET home page. */
router.get('/', async (ctx) => {
    ctx.body = {
        v: "0.0.1"
    };
});

export default router;
