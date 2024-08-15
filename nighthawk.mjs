import tls from "tls";
import WebSocket from "ws";
import extractJsonFromString from "extract-json-from-string";
import { token, channelId, serverId, gateway, address } from "./cfg.mjs";

const guilds = {}; let vanity;

const connectWebSocket = (ws) => ws.onopen = () => ws.send(JSON.stringify({
  op: 2, t: "0.001", d: { op: 0, token, intents: 513, properties: { os: "Linux", browser: "Firefox", device: "Nighthawk" } }
}));

const connect = () => {
  const ws = new WebSocket(gateway);
  const socket = tls.connect({ host: address, port: 443 });

  ws.onclose = connect;
  ws.onmessage = ({ data }) => {
    const { d, op, t } = JSON.parse(data);
    if (t === "READY") {
      d.guilds.forEach(g => g.vanity_url_code && (guilds[g.id] = g.vanity_url_code));
      console.log(guilds);
    } else if (op === 10) connectWebSocket(ws);
    else if (t === "GUILD_UPDATE" && guilds[d.guild_id] !== d.vanity_url_code) {
      const code = guilds[d.guild_id];
      socket.write(`PATCH /api/v9/guilds/${serverId}/vanity-url HTTP/1.1\r\nHost: ${address}\r\nAuthorization: ${token}\r\nContent-Type: application/json\r\nContent-Length: ${Buffer.byteLength(JSON.stringify({ code }))}\r\n\r\n${JSON.stringify({ code })}`);
      vanity = code;
    }
  };

  socket.on("secureConnect", () => connectWebSocket(ws));
  socket.on("data", (data) => {
    const jsonObject = extractJsonFromString(data.toString()).find(o => o.code || o.message);
    if (jsonObject && ws.readyState === WebSocket.OPEN) 
      ws.send(JSON.stringify({ content: `*Code: \`${vanity}\`\nUses: \`${JSON.stringify(jsonObject)}\`*` }));
  });
};

connect();
