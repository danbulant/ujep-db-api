import request from "supertest";
import { app } from "../app";
import { jest } from '@jest/globals';
import { Place } from "../models/place";
import { User } from "../models/user";
import mongoose from "mongoose";
import bcrypt from 'bcrypt';
import { SignJWT } from "jose";
import { privateKey } from "../keys";

/** @type {Place} */
let place;
/** @type {User} */
let user;
const USER_PASSWORD = "12345678";
const NEW_USER_PASSWORD = "87654321";

beforeAll(async () => {
    place = new Place({
        name: "test place",
        description: "Testovací místečko",
        website: "https://example.com",
        contacts: [{ email: "test@example.com", phone: "123456789", name: "test name", description: "test role"}]
    });
    await place.save();
    user = new User({
        name: "developer@example.com",
        role: 5,
        place: place._id,
        forceChangePassword: true,
        password: await bcrypt.hash(USER_PASSWORD, 10)
    });
    await user.save();
});

afterAll(async () => {
    await mongoose.disconnect();
});

test("Index works", async () => {
    const res = await request(app.callback()).get("/");
    expect(res.status).toBe(200);
    expect(JSON.parse(res.text).v).toBe("0.0.1");
});

test("Getting current user without being logged in fails", async () => {
    const res = await request(app.callback()).get("/users/@self");
    expect(res.status).toBe(401);
});

test("Getting user by id without being logged in fails", async () => {
    const res = await request(app.callback()).get(`/users/${user._id}`);
    expect(res.status).toBe(401);
});

test("Getting users at local place without being logged in fails", async () => {
    const res = await request(app.callback()).get("/places/@local/users");
    expect(res.status).toBe(401);
})

test("Getting all users without being logged in fails", async () => {
    const res = await request(app.callback()).get("/users");
    expect(res.status).toBe(401);
});

test("Getting current place detaisl without being logged in fails", async () => {
    const res = await request(app.callback()).get("/users/@self/place");
    expect(res.status).toBe(401);
});

test("Getting list of places results in 1 place", async () => {
    const res = await request(app.callback()).get("/places");
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].name).toBe("test place");
});

test("Getting details of a place by id", async () => {
    const res = await request(app.callback()).get(`/places/${place._id}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("test place");
});

test("Logging in with bad details fails", async () => {
    const res = await request(app.callback()).put("/token").send({
        name: user.name,
        password: "badpassword"
    });
    expect(res.status).toBe(404);
})

test("Logging in with correct details", async () => {
    const res = await request(app.callback()).put("/token").send({
        name: user.name,
        password: USER_PASSWORD
    }).expect("Set-Cookie", /token/);
    expect(res.status).toBe(200);
});

//! This must be ran always all at once. Other routes will not work until password is changed
describe("Developer User operations", () => {
    /** @type {string} */
    let JWT;
    beforeAll(async () => {
        // sets up token
        JWT = await new SignJWT({ 'sub': user.id })
            .setProtectedHeader({ alg: 'ES256' })
            .setIssuedAt()
            .setIssuer('urn:pomuckydb:issuer')
            .setAudience('urn:pomuckydb:audience')
            .setExpirationTime('12h')
            .sign(privateKey);
    });
    /// TODO: Fix this test
    /// Jest runs code parallely, so this may not always fail
    // test("Getting current user details fails as password change is required", async () => {
    //     const res = await request(app.callback())
    //         .get("/users/@self")
    //         .set('Cookie', `token=${JWT}`)
    //     expect(res.statusCode).toBe(401);
    // });
    test("Changing password", async () => {
        const res = await request(app.callback())
            .put("/users/@self")
            .set('Cookie', `token=${JWT}`)
            .send({
                newPassword: NEW_USER_PASSWORD,
                oldPassword: USER_PASSWORD
            });
        expect(res.statusCode).toBe(200);
    });
    test("Getting current user details", async () => {
        const res = await request(app.callback())
            .get("/users/@self")
            .set('Cookie', `token=${JWT}`);
        expect(res.statusCode).toBe(200);
    });
});