import bodyParser from "koa-body";

export function parseBody() {
    return bodyParser({ text: false, multipart: false, json: true, urlencoded: false });
}