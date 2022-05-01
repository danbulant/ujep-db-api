import { exportPKCS8, exportSPKI, generateKeyPair } from "jose";

const { publicKey, privateKey } = await generateKeyPair('ES256', { extractable: true });

console.log(`PUBLIC_RSA_KEY=${Buffer.from(await exportSPKI(publicKey)).toString("base64")}`);
console.log(`PRIVATE_RSA_KEY=${Buffer.from(await exportPKCS8(privateKey)).toString("base64")}`);