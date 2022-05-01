import Router from '@koa/router';

var router = new Router();

/**
 * GET /
 * 
 * Informace o serveru
 * 
 * @response
 *  @property {string} v - verze
 *  @property {string} publicKey - PEM+BASE64 encoded public key
 */
router.get('/', async (ctx) => {
    ctx.body = {
        v: "0.0.1",
        publicKey: process.env.PUBLIC_RSA_KEY
    };
});

export default router;
