import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const FALCON_API_KEY = process.env.FALCON_API_KEY;
const FALCON_BASE_URL = "https://beta.falcon-server.com.br/data-hub";

const server = new McpServer({
  name: "mcp-falcon-radar",
  version: "1.0.0"
});

server.tool(
  "consultar_acao",
  "Consulta dados de uma ação brasileira na Falcon Data Hub pelo ticker B3.",
  {
    symbol: z
      .string()
      .min(4)
      .max(10)
      .describe("Ticker B3, por exemplo PETR4, VALE3 ou WEGE3")
  },
  async ({ symbol }) => {
    if (!FALCON_API_KEY) {
      return {
        content: [
          {
            type: "text",
            text: "Erro: variável FALCON_API_KEY não configurada."
          }
        ],
        isError: true
      };
    }

    const ticker = symbol.trim().toUpperCase();

    try {
      const response = await fetch(
        `${FALCON_BASE_URL}/private/v1/action/${encodeURIComponent(ticker)}/search`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${FALCON_API_KEY}`,
            Accept: "application/json"
          }
        }
      );

      const body = await response.text();

      if (!response.ok) {
        return {
          content: [
            {
              type: "text",
              text: `Falcon retornou HTTP ${response.status}: ${body}`
            }
          ],
          isError: true
        };
      }

      return {
        content: [
          {
            type: "text",
            text: body
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Erro ao consultar Falcon: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }
);

app.post("/mcp", async (req, res) => {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined
  });

  res.on("close", () => {
    transport.close();
  });

  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "MCP Falcon RADAR-BB"
  });
});

app.listen(PORT, () => {
  console.log(`MCP Falcon RADAR-BB rodando na porta ${PORT}`);
});
