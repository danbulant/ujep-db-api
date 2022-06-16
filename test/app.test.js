import request from "supertest";
import { app } from "../src/app";
import {jest} from '@jest/globals';

test("Index works", async () => {
    const res = await request(app.callback()).get("/");
    expect(res.status).toBe(200);
    expect(JSON.parse(res.text).v).toBe("0.0.1");
});