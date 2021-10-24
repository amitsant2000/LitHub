const { ElvClient } = require("@eluvio/elv-client-js");
const fs = require("fs");
var path = require('path');
const myPrivateKey = "0x2d703a925bec7c9847424c2c9b266d0009cb7fb3c00296c9b405241ffeeec858";
const secondKey = "0xf5ae0c573548597085ee417260510292fcbbcb302c33ee80eb7422902577f2ba";
const libraryId = "ilib2gZw5kNLYSmmQ76NShfAoYv2Twne";
async function uploadContent(LitType, LitPath, LitName, LitSize, Title, key, Price) {
    const client = await ElvClient.FromConfigurationUrl({
        configUrl: "https://demov3.net955210.contentfabric.io/config"
    });
    const wallet = client.GenerateWallet();
  const signer = wallet.AddAccount({
    privateKey: key
  });

client.SetSigner({signer});
    const createResponse = await client.CreateContentObject({libraryId});
    const objectId = createResponse.id;
    const writeToken = createResponse.write_token;

    await client.ReplaceMetadata({
      libraryId,
      objectId,
      writeToken,
      metadata: {
        public: {
          name: Title,
          description: Title
        },
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
              path: "book.txt",
              type: "file",
              mime_type: "text/plain",
              size: LitSize,
              data: fs.openSync(path.join(LitPath,LitName)  ,"r")
          }
        ]
    });

    const finalizeResponse = await client.FinalizeContentObject({
      libraryId,
      objectId,
      writeToken
    });

    await client.SetAccessCharge({
      objectId: objectId, 
      accessCharge: Price});

    const versionHash = finalizeResponse.hash;
    return versionHash
}
async function setVisible(objectId, key) {
  const client = await ElvClient.FromConfigurationUrl({
    configUrl: "https://demov3.net955210.contentfabric.io/config"
  });
  const wallet = client.GenerateWallet();
  const signer = wallet.AddAccount({
    privateKey: key
  });
  client.SetSigner({signer});
  await client.SetPermission({objectId: objectId, permission: "viewable"});

  
}
async function accessBook(objectId, key) {
  const client = await ElvClient.FromConfigurationUrl({
    configUrl: "https://demov3.net955210.contentfabric.io/config"
  });
  const wallet = client.GenerateWallet();
  const signer = wallet.AddAccount({
    privateKey: key
  });
  client.SetSigner({signer});
  const accessReq =await client.AccessRequest({
    libraryId: "ilib2gZw5kNLYSmmQ76NShfAoYv2Twne",
    objectId: objectId,
  })
}
async function downloadBook(key, objectId, filePath) {
  const client = await ElvClient.FromConfigurationUrl({
    configUrl: "https://demov3.net955210.contentfabric.io/config"
  });
  const wallet = client.GenerateWallet();
  const signer = wallet.AddAccount({
    privateKey: key
  });
  client.SetSigner({signer});
  return await client.DownloadFile({
    libraryId: libraryId,
    objectId: objectId,
    filePath: filePath
  })
}

//uploadContent("Book", "testfolder", "test.txt", 10000, "Book3", myPrivateKey, 0.05)
//accessBook("iq__c6TP7cVAqRKSKu4S6PGUqYN36JE", secondKey); 
//setVisible("iq__c6TP7cVAqRKSKu4S6PGUqYN36JE", myPrivateKey);
/*downloadBook(myPrivateKey,"iq__c6TP7cVAqRKSKu4S6PGUqYN36JE", "/test.txt").then(
  (res) => {
    console.log(res)
  }
)*/