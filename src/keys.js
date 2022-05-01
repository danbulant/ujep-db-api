import { importPKCS8 } from "jose";

export const privateKey = await importPKCS8(Buffer.from(process.env.PRIVATE_RSA_KEY, "base64"));
export const publicKey = await importPKCS8(Buffer.from(process.env.PUBLIC_RSA_KEY, "base64"));