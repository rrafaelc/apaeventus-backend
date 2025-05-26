export const constants = {
  aesKey: Buffer.from(process.env.AES_KEY!, 'utf8'),
  aesIv: Buffer.from(process.env.AES_IV!, 'utf8'),
};
