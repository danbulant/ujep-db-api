import { importPKCS8, importSPKI } from "jose";

export const privateKey = await importPKCS8(Buffer.from(process.env.PRIVATE_RSA_KEY, "base64").toString("utf-8"), "ES256");
export const publicKey = await importSPKI(Buffer.from(process.env.PUBLIC_RSA_KEY, "base64").toString("utf-8"), "ES256");