import { ElvClient } from "elv-client-js/dist/ElvClient-node-min.js";
const { ElvClient } = require("elv-client-js/dist/ElvClient-node-min.js");
const client = await ElvClient.FromConfigurationUrl({
    configUrl: "https://demov3.net955310.contentfabric.io/config"
});
const libraryId = "ilib2gZw5kNLYSmmQ76NShfAoYv2Twne";
const createResponse = await client.CreateContentObject({libraryId});
const objectId = createResponse.id;
const writeToken = createResponse.write_token;

await client.ReplaceMetadata({
  libraryId,
  objectId,
  writeToken,
  metadata: {
    tags: [
      "book",
    ]
  }
});

await client.UploadFiles({
  libraryId,
  objectId,
  writeToken,
  fileInfo: [
    {
      path: "book.pdf",
      mime_type: "book",
      size: 10000,
      data: (<ArrayBuffer 10000>)
    }
  ]
});

const finalizeResponse = await client.FinalizeContentObject({
  libraryId,
  objectId,
  writeToken
});

const versionHash = finalizeResponse.hash;