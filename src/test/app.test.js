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
let PLACE;
/** @type {User} */
let USER;
/** @type {string} */
let USER_JWT;
const USER_PASSWORD = "12345678";
const NEW_USER_PASSWORD = "87654321";

beforeAll(async () => {
    PLACE = new Place({
        name: "test place",
        description: "Testovací místečko",
        website: "https://example.com",
        contacts: [{ email: "test@example.com", phone: "123456789", name: "test name", description: "test role"}]
    });
    await PLACE.save();
    USER = new User({
        name: "developer@example.com",
        role: 5,
        place: PLACE._id,
        forceChangePassword: true,
        password: await bcrypt.hash(USER_PASSWORD, 10)
    });
    await USER.save();
    USER_JWT = await new SignJWT({ 'sub': USER.id })
        .setProtectedHeader({ alg: 'ES256' })
        .setIssuedAt()
        .setIssuer('urn:pomuckydb:issuer')
        .setAudience('urn:pomuckydb:audience')
        .setExpirationTime('12h')
        .sign(privateKey);
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
    const res = await request(app.callback()).get(`/users/${USER._id}`);
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
    const res = await request(app.callback()).get(`/places/${PLACE._id}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("test place");
});

test("Logging in with bad details fails", async () => {
    const res = await request(app.callback()).put("/token").send({
        name: USER.name,
        password: "badpassword"
    });
    expect(res.status).toBe(404);
})

test("Logging in with correct details", async () => {
    const res = await request(app.callback()).put("/token").send({
        name: USER.name,
        password: USER_PASSWORD
    }).expect("Set-Cookie", /token/);
    expect(res.status).toBe(200);
});

//! This must be ran always all at once. Other routes will not work until password is changed
describe("Developer User operations", () => {
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
            .set('Cookie', `token=${USER_JWT}`)
            .send({
                newPassword: NEW_USER_PASSWORD,
                oldPassword: USER_PASSWORD
            });
        expect(res.statusCode).toBe(200);
    });
    test("Getting current user details", async () => {
        const res = await request(app.callback())
            .get("/users/@self")
            .set('Cookie', `token=${USER_JWT}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.role).toBe(5);
        expect(res.body.password).toBeUndefined();
        expect(res.body.name).toBe("developer@example.com");
    });
    test("Wrong token fails", async () => {
        const res = await request(app.callback())
            .get("/users/@self")
            .set('Cookie', `token=${USER_JWT.slice(2)}`);
        expect(res.statusCode).toBe(403);
    });
    test("Getting current place info", async () => {
        const res = await request(app.callback())
            .get("/users/@self/place")
            .set('Cookie', `token=${USER_JWT}`);
        console.log(res.body);
        expect(res.statusCode).toBe(200);
    });
    test("Getting list of users in place returns 1 user", async () => {
        const res = await request(app.callback())
            .get("/places/@local/users")
            .set('Cookie', `token=${USER_JWT}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.length).toBe(1);
    });
    test("Getting user details by id", async () => {
        const res = await request(app.callback())
            .get(`/users/${USER._id}`)
            .set('Cookie', `token=${USER_JWT}`);
        expect(res.statusCode).toBe(200);
    });
});

describe("Using DEFAULT user", () => {
    beforeAll(async () => {
        USER.role = 0;
        await USER.save();
    });
    afterAll(async () => {
        USER.role = 5;
        await USER.save();
    })
    test("Getting current user details", async () => {
        const res = await request(app.callback())
            .get("/users/@self")
            .set('Cookie', `token=${USER_JWT}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.role).toBe(0);
    });
    test("Getting list of all users fails", async () => {
        const res = await request(app.callback())
            .get("/users")
            .set('Cookie', `token=${USER_JWT}`);
        expect(res.statusCode).toBe(403); 
    });
    test("Getting list of users in place fails", async () => {
        const res = await request(app.callback())
            .get("/places/@local/users")
            .set('Cookie', `token=${USER_JWT}`);
        expect(res.statusCode).toBe(403);
    });
    test("Getting user details by ID fails", async () => {
        const res = await request(app.callback())
            .get(`/users/${USER._id}`)
            .set('Cookie', `token=${USER_JWT}`);
        expect(res.statusCode).toBe(403);
    });
    test("Creating new user fails", async () => {
        const res = await request(app.callback())
            .post("/users")
            .set('Cookie', `token=${USER_JWT}`)
            .send({
                name: "new user",
                password: "new password",
                role: 5
            });
        expect(res.statusCode).toBe(403);
    });
    test("Getting place details", async () => {
        const res = await request(app.callback())
            .get("/users/@self/place")
            .set('Cookie', `token=${USER_JWT}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.name).toBe("test place");
    });
});