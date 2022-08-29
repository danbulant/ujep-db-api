import request from "supertest";
import mongoose from "mongoose";
import bcrypt from 'bcrypt';
import { SignJWT } from "jose";

import { app } from "../app";
import { Place } from "../models/place";
import { User } from "../models/user";
import { privateKey } from "../keys";
import { Pomucka } from "../models/pomucka";

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

test("Non-existent user token fails", async () => {
    const TOKEN = await new SignJWT({ 'sub': PLACE.id })
        .setProtectedHeader({ alg: 'ES256' })
        .setIssuedAt()
        .setIssuer('urn:pomuckydb:issuer')
        .setAudience('urn:pomuckydb:audience')
        .setExpirationTime('12h')
        .sign(privateKey);
    console.log(TOKEN);
    const res = await request(app.callback()).get("/users/@self").set("Cookie", `token=${TOKEN}`);
    expect(res.status).toBe(403);
    expect(res.body.message).toBe("user_deleted");
});

test("Updating place without user fails", async () => {
    const res = await request(app.callback()).put(`/users/@self/place`).send({
        name: "new name"
    });
    expect(res.status).toBe(401);
});

test("Getting place with invalid ID fails", async () => {
    const res = await request(app.callback()).get(`/places/0`);
    expect(res.status).toBe(404);
});
test("Getting non-existent place fails", async () => {
    const res = await request(app.callback()).get(`/places/000000000000000000000000`);
    expect(res.status).toBe(404);
});

//! This must be ran always all at once. Other routes will not work until password is changed
describe("Developer User operations", () => {
    test("Getting current user details fails as password change is required", async () => {
        const res = await request(app.callback())
            .get("/users/@self")
            .set('Cookie', `token=${USER_JWT}`)
        expect(res.statusCode).toBe(403);
    });
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
        expect(res.statusCode).toBe(200);
    });
    test("Getting list of users in place returns 1 user", async () => {
        const res = await request(app.callback())
            .get("/places/@local/users")
            .set('Cookie', `token=${USER_JWT}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.length).toBe(1);
    });
    test("Getting list of all users returns 1 user", async () => {
        const res = await request(app.callback())
            .get("/users")
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
    // TODO: Correctly implement place updates
    test("Updating place gives internal error", async () => {
        const res = await request(app.callback())
            .put(`/users/@self/place`)
            .set('Cookie', `token=${USER_JWT}`);
        expect(res.statusCode).toBe(500);
    });
    describe("Creating user", () => {
        let newUserID;
        afterAll(async () => {
            if(newUserID) {
                await User.deleteOne({ _id: newUserID });
            }
        });
        test("Creating user", async () => {
            const res = await request(app.callback())
                .post("/users")
                .set('Cookie', `token=${USER_JWT}`)
                .send({
                    name: "new@example.com",
                    password: "newpassword",
                    role: 1
                });
            expect(res.statusCode).toBe(200);
        });
        test("Creating user with invalid body fails", async () => {
            const res = await request(app.callback())
                .post("/users")
                .set('Cookie', `token=${USER_JWT}`)
                .send("");
            expect(res.statusCode).toBe(400);
        });
        test("Creating user with invalid role format fails", async () => {
            const res = await request(app.callback())
                .post("/users")
                .set('Cookie', `token=${USER_JWT}`)
                .send({
                    name: "test@example.com",
                    password: "newpassword",
                    role: "bad"
                });
            expect(res.statusCode).toBe(400);
        });
        test("Creating user with invalid name fails", async () => {
            const res = await request(app.callback())
                .post("/users")
                .set('Cookie', `token=${USER_JWT}`)
                .send({
                    name: "",
                    password: "newpassword",
                    role: 1
                });
            expect(res.statusCode).toBe(400);
        });
        test("Creating user with invalid password fails", async () => {
            const res = await request(app.callback())
                .post("/users")
                .set('Cookie', `token=${USER_JWT}`)
                .send({
                    name: "test@example.com",
                    password: "",
                    role: 1
                });
            expect(res.statusCode).toBe(400);
        });
        test("Creating user with invalid (too low) role fails", async () => {
            const res = await request(app.callback())
                .post("/users")
                .set('Cookie', `token=${USER_JWT}`)
                .send({
                    name: "test2@example.com",
                    password: "newpassword",
                    role: 0
                });
            expect(res.statusCode).toBe(400);
        });
    });
    describe("Creating user in another place", () => {
        let place;
        let userId;
        beforeAll(async () => {
            place = await Place.create({
                name: "another test place",
                description: "test description2",
                contacts: []
            });
        });
        afterAll(async () => {
            if(userId) {
                await User.deleteOne({ _id: userId });
            }
            await Place.deleteOne({ _id: place._id });
        });
        test("Create user in another place", async () => {
            const res = await request(app.callback())
                .post("/users")
                .set('Cookie', `token=${USER_JWT}`)
                .send({
                    name: "placed@example.com",
                    password: "newpassword",
                    role: 1,
                    place: place._id
                });
            expect(res.statusCode).toBe(200);
            expect(res.body.name).toBe("placed@example.com");
            expect(res.body.role).toBe(1);
            expect(res.body.place).toBe(place.id);
            userId = res.body._id;
        });
        test("Creating user in another invalid place fails", async () => {
            const res = await request(app.callback())
                .post("/users")
                .set('Cookie', `token=${USER_JWT}`)
                .send({
                    name: "placed2@example.com",
                    password: "newpassword",
                    role: 1,
                    place: "bad"
                });
            expect(res.statusCode).toBe(400);
        });
        test("Creating user in another nonexistent place fails", async () => {
            const res = await request(app.callback())
                .post("/users")
                .set('Cookie', `token=${USER_JWT}`)
                .send({
                    name: "placed3@example.com",
                    password: "newpassword",
                    role: 1,
                    place: "62af3299da7e181b79af017b"
                });
            expect(res.statusCode).toBe(404);
        });
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

describe("Using LOCAL_ADMIN user", () => {
    beforeAll(async () => {
        USER.role = 3;
        await USER.save();
    });
    afterAll(async () => {
        USER.role = 5;
        await USER.save();
    });
    test("Getting current user details", async () => {
        const res = await request(app.callback())
            .get("/users/@self")
            .set('Cookie', `token=${USER_JWT}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.role).toBe(3);
    });
    test("Getting list of all users fails", async () => {
        const res = await request(app.callback())
            .get("/users")
            .set('Cookie', `token=${USER_JWT}`);
        expect(res.statusCode).toBe(403);
    });
    test("Creating new user in another place fails", async () => {
        const res = await request(app.callback())
            .post("/users")
            .set('Cookie', `token=${USER_JWT}`)
            .send({
                name: "test@example.com",
                password: "newpassword",
                role: 3,
                place: "5e9f8f8f8f8f8f8f8f8f8f8"
            });
        expect(res.statusCode).toBe(403);
    });
    test("Creating user with higher role fails", async () => {
        const res = await request(app.callback())
            .post("/users")
            .set('Cookie', `token=${USER_JWT}`)
            .send({
                name: "test@example.com",
                password: "newpassword",
                role: 4
            });
        expect(res.statusCode).toBe(403);
    });
});

describe("Using GLOBAL_ADMIN user", () => {
    
    beforeAll(async () => {
        USER.role = 4;
        await USER.save();
    });

    afterAll(async () => {
        USER.role = 5;
        await USER.save();
    });

    test("Creating place works", async () => {
        const res = await request(app.callback())
            .post("/places")
            .set('Cookie', `token=${USER_JWT}`)
            .send({
                name: "test place",
                description: "test description",
                website: "test.com",
                contacts: []
            });
        expect(res.statusCode).toBe(200);
        expect(res.body.name).toBe("test place");
        expect(res.body.description).toBe("test description");
        expect(res.body.website).toBe("test.com");
        expect(res.body.contacts).toEqual([]);
    });
});

describe("Invalid body for login fails", () => {
    test("String instead of JSON", async () => {
        const res = await request(app.callback())
            .put("/token")
            .send("");
        expect(res.statusCode).toBe(400);
    });
    test("Empty body", async () => {
        const res = await request(app.callback())
            .put("/token");
        expect(res.statusCode).toBe(400);
    });
    test("Missing username", async () => {
        const res = await request(app.callback())
            .put("/token")
            .send({
                password: "newpassword"
            });
        expect(res.statusCode).toBe(400);
    });
    test("Missing password", async () => {
        const res = await request(app.callback())
            .put("/token")
            .send({
                name: "test"
            });
        expect(res.statusCode).toBe(400);
    });
    test("Username not found", async () => {
        const res = await request(app.callback())
            .put("/token")
            .send({
                name: "test",
                password: "newpassword"
            });
        expect(res.statusCode).toBe(404);
    });
});

test("Creating user fails when not logged in", async () => {
    const res = await request(app.callback())
        .post("/users")
        .send({
            name: "test",
            password: "newpassword",
            role: 5
        });
    expect(res.statusCode).toBe(401);
});

test("Getting user info of invalid user fails", async () => {
    const res = await request(app.callback())
        .get("/users/invalid")
        .set('Cookie', `token=${USER_JWT}`);
    expect(res.statusCode).toBe(400);
});

test("Getting user info of nonexistent user fails", async () => {
    const res = await request(app.callback())
        .get("/users/62af34367cfa9d6970bb8853")
        .set('Cookie', `token=${USER_JWT}`);
    expect(res.statusCode).toBe(404);
});


describe("Pomucky", () => {
    /** @type {Pomucka} */
    let pomucka;
    beforeAll(async () => {
        pomucka = new Pomucka({
            name: "test",
            signatura: "T106",
            ISXN: 1234,
            categories: ["K.II.09"],
            details: {
                author: "autor",
                year: 2020,
                company: "firma",
                mistoVydani: "misto",
            }
        });
        await pomucka.save();
        console.log(pomucka);
    });
    afterAll(async () => {
        await pomucka.deleteOne();
    })
    test("Getting pomucka by ID", async () => {
        const res = await request(app.callback())
            .get(`/pomucky/${pomucka._id}`);
        expect(res.statusCode).toBe(200);
    });
    test("Search options", async () => {
        const res = await request(app.callback())
            .get(`/pomucky/searchOptions`);
        expect(res.statusCode).toBe(200);
        console.log(res.body);
        expect(Array.isArray(res.body.categories)).toBe(true);
        // expect(res.body.categories.includes("K.II.09")).toBe(true);
    });
    describe("Search", () => {
        test("By name", async () => {
            const res = await request(app.callback())
                .get(`/pomucky/search?name=${pomucka.name}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.length).toBe(1);
            expect(res.body[0].name).toBe(pomucka.name);
        });
        test("By id", async () => {
            const res = await request(app.callback())
                .get(`/pomucky/search?id[]=${pomucka._id}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.length).toBe(1);
            expect(res.body[0].name).toBe(pomucka.name);
        });
        test("By categories", async () => {
            const res = await request(app.callback())
                .get(`/pomucky/search?categories[]=${pomucka.categories[0]}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.length).toBe(1);
            expect(res.body[0].name).toBe(pomucka.name); 
        });
    });
    test("Invalid pomucka ID results in 400", async () => {
        const res = await request(app.callback())
            .get(`/pomucky/invalid`);
        expect(res.statusCode).toBe(400);
    });
    test("Non-existent pomucka ID results in 404", async () => {
        const res = await request(app.callback())
            .get(`/pomucky/62af34367cfa9d6970bb8853`);
        expect(res.statusCode).toBe(404);
    });
});