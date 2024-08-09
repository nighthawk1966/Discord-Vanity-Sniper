import tls from "tls";
import WebSocket from "ws";
import extractJsonFromString from "extract-json-from-string";
import { token, channelId, serverId, gateway, address } from "./cfg.mjs";

const guilds = {};
let vanity, tlsSocket, websocket;

const connectWebSocket = () => {
    websocket = new WebSocket(gateway);
    websocket.onclose = () => connectWebSocket();
    websocket.onmessage = async ({ data }) => {
        const { d, op, t } = JSON.parse(data);
		if (t === "READY") { d.guilds.forEach((g) => g.vanity_url_code && (guilds[g.id] = g.vanity_url_code)); console.log(guilds); }
        if (op === 10) { websocket.send(JSON.stringify({ op: 2, t: "0.001", s: null, d: { op: 0, token, intents: 1 << 0, properties: { os: "linux", browser: "firefox", device: "nighthawk" }}})); }
        if (t === "GUILD_UPDATE" && guilds[d.guild_id] && guilds[d.guild_id] !== d.vanity_url_code) {
		const find = guilds[d.guild_id];
		const request = `PATCH /api/v7/guilds/${serverId}/vanity-url HTTP/1.1\r\nHost: ${address}\r\nAuthorization: ${token}\r\nContent-Type: application/json\r\nContent-Length: ${JSON.stringify({ code: find }).length}\r\n\r\n${JSON.stringify({ code: find })}`;
		tlsSocket.write(request);
		vanity = find;
		}
	}
}
const connectTLS = () => {
  tlsSocket = tls.connect({ host: address, port: 443 });
  tlsSocket.on("secureConnect", connectWebSocket);
  tlsSocket.on("data", async (data) => {
		const jsonObject = extractJsonFromString(data.toString()).find(obj => obj.code || obj.message);
		if (jsonObject) {
        console.log(jsonObject);
        tlsSocket.write(`POST /api/v7/channels/${config.channelId}/messages HTTP/1.1\r\nHost: ${config.address}\r\nAuthorization: ${config.token}\r\nContent-Type: application/json\r\nContent-Length: ${Buffer.byteLength(JSON.stringify({ content: `@everyone *Vanity Code : \`${vanity}\`\nValue : \`${JSON.stringify(jsonObject)}\`*` }))}\r\n\r\n${JSON.stringify({ content: `@everyone *Vanity Code : \`${vanity}\`\nValue : \`${JSON.stringify(jsonObject)}\`*` })}`);
		}
	});
};

connectTLS();