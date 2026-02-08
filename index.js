// Thin entry point - registers ts-node and hands control to TypeScript
require('ts-node/register');

const { connectToWhatsApp } = require('./src/code/whatsapp-client.ts');

connectToWhatsApp().catch(console.error);
