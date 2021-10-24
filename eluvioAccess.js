
import { ElvClient } from "elv-client-js/dist/ElvClient-node-min.js";
const { ElvClient } = require("elv-client-js/dist/ElvClient-node-min.js");
const client = await ElvClient.FromConfigurationUrl({
    configUrl: "https://demov3.net955310.contentfabric.io/config"
});


const libraryId = "ilib2gZw5kNLYSmmQ76NShfAoYv2Twne";
const createResponse = await client.CreateContentObject({libraryId});
const objectId = createResponse.id;
const writeToken = createResponse.write_token;

function uploadContent(LitType, LitPath, LitSize) {
    await client.ReplaceMetadata({
      libraryId,
      objectId,
      writeToken,
      metadata: {
        tags: [
          LitType
        ]
      }
    });

    await client.UploadFiles({
        libraryId,
        objectId,
        writeToken,
        fileInfo: [
          {
              path: LitPath,
              mime_type: "text/plain",
              size: LitSize,
              data: ArrayBuffer<String>(LitSize)
          }
        ]
    });

    const finalizeResponse = await client.FinalizeContentObject({
      libraryId,
      objectId,
      writeToken
    });

    const versionHash = finalizeResponse.hash;
    return versionHash
}