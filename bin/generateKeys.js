import { generateKeyPair } from "crypto";

generateKeyPair(
    "rsa",
    {
        modulusLength: 2048,
        publicKeyEncoding: {
            type: "pkcs1",
            format: "pem",
        },
        privateKeyEncoding: {
            type: "pkcs1",
            format: "pem",
        },
    },
    (err, pub, priv) => {
        if (err) throw new Error(err);

        console.log(`PUBLIC_RSA_KEY=${Buffer.from(pub).toString("base64")}`);
        console.log(`PRIVATE_RSA_KEY=${Buffer.from(priv).toString("base64")}`);
    }
);