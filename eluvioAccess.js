const { ElvClient } = require("@eluvio/elv-client-js");

async function uploadContent(LitType, LitPath, LitSize) {
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
