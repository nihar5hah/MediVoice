import 'dotenv/config';
import { VapiClient } from '../src/vapi/client.js';
import {
  DEFAULT_VAPI_ASSISTANT_NAME,
  buildAssistantDefinition,
  buildProcessTurnToolDefinition,
  getWebhookUrl,
  resolvePublicServerUrl
} from '../src/vapi/config.js';

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

async function main() {
  if (!process.env.VAPI_PRIVATE_KEY) {
    fail('Missing VAPI_PRIVATE_KEY in environment.');
  }

  const publicServerUrl = await resolvePublicServerUrl();
  if (!publicServerUrl) {
    fail('Could not resolve PUBLIC_SERVER_URL. Set PUBLIC_SERVER_URL or start ngrok for port 8787.');
  }

  const client = new VapiClient();
  const phoneNumbers = await client.listPhoneNumbers();
  const assistants = await client.listAssistants(100);
  const tools = await client.listTools(100);

  const resolvedPhoneNumber = process.env.VAPI_PHONE_NUMBER_ID
    ? phoneNumbers.find((phoneNumber) => phoneNumber.id === process.env.VAPI_PHONE_NUMBER_ID)
    : phoneNumbers.find((phoneNumber) => phoneNumber.number && phoneNumber.status === 'active');

  if (!resolvedPhoneNumber) {
    fail('No active Vapi phone number found. Set VAPI_PHONE_NUMBER_ID to an existing number.');
  }

  const toolDefinition = buildProcessTurnToolDefinition(publicServerUrl);
  const currentTool = (process.env.VAPI_PROCESS_TURN_TOOL_ID
    ? tools.find((tool) => tool.id === process.env.VAPI_PROCESS_TURN_TOOL_ID)
    : undefined) ?? tools.find((tool) => tool.function?.name === 'processTurn');

  const processTurnTool = currentTool?.server?.url === toolDefinition.server.url
    ? currentTool
    : await client.createTool(toolDefinition as unknown as Record<string, unknown>);

  const assistantDefinition = buildAssistantDefinition({
    name: process.env.VAPI_ASSISTANT_NAME ?? DEFAULT_VAPI_ASSISTANT_NAME,
    firstMessage: 'Hello, this is Maya from the clinic scheduling team. How can I help you today?',
    language: 'en',
    toolIds: [processTurnTool.id]
  });

  const currentAssistant = (process.env.VAPI_ASSISTANT_ID
    ? assistants.find((assistant) => assistant.id === process.env.VAPI_ASSISTANT_ID)
    : undefined) ?? assistants.find((assistant) => assistant.name === assistantDefinition.name);

  const assistant = currentAssistant
    ? await client.updateAssistant(currentAssistant.id, assistantDefinition as unknown as Record<string, unknown>)
    : await client.createAssistant(assistantDefinition as unknown as Record<string, unknown>);

  const phoneNumber = await client.updatePhoneNumber(resolvedPhoneNumber.id, {
    assistantId: assistant.id,
    server: {
      url: getWebhookUrl(publicServerUrl)
    }
  });

  console.log(JSON.stringify({
    ok: true,
    publicServerUrl,
    webhookUrl: getWebhookUrl(publicServerUrl),
    assistantId: assistant.id,
    phoneNumberId: phoneNumber.id,
    phoneNumber: phoneNumber.number ?? resolvedPhoneNumber.number ?? null,
    processTurnToolId: processTurnTool.id
  }, null, 2));
}

main().catch((error) => fail(error instanceof Error ? error.message : 'Unknown Vapi setup error.'));
