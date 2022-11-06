import { privateKey } from "../src/keys";

const jwt = await new SignJWT({ 'sub': process.argv[2] })
    .setProtectedHeader({ alg: 'ES256' })
    .setIssuedAt()
    .setIssuer('urn:pomuckydb:issuer')
    .setAudience('urn:pomuckydb:audience')
    .setExpirationTime('12h')
    .sign(privateKey);