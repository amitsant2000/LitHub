const { ElvClient } = require("@eluvio/elv-client-js");
const { AccessInfo } = require("@eluvio/elv-client-js/src/client/ContentAccess");
const fs = require("fs");
var path = require('path');
const myPrivateKey = "0x2d703a925bec7c9847424c2c9b266d0009cb7fb3c00296c9b405241ffeeec858";
const secondKey = "0xf5ae0c573548597085ee417260510292fcbbcb302c33ee80eb7422902577f2ba";
const groupAddress = "0xf45eefb63215197feee4a48d982a7fbaab41002d"
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

  //TODO: change permission to Publicly Listable
  await client.SetPermission({objectId: objectId, permission: "viewable"});
  //var newAccessgroup = client.CreateAccessGroup()

  const versionHash = finalizeResponse.hash;
  return objectId
}
async function accessBook(objectId, key) {
  const client = await ElvClient.FromConfigurationUrl({
    configUrl: "https://demov3.net955210.contentfabric.io/config"
  });
  const wallet = client.GenerateWallet();
  const signer = wallet.AddAccount({
    privateKey: key
  });
  await client.SetSigner({signer});
  const accessInfo = await client.AccessInfo({
    objectId
  })
  console.log(accessInfo)
  //TODO: check accessInfo to see if we have purchase access
  //client.ToggleLogging(true)    
  const accessReq =await client.AccessRequest({
    libraryId: libraryId,
    objectId: objectId,
  })
}
async function downloadBook(key, objectId) {
  const client = await ElvClient.FromConfigurationUrl({
    configUrl: "https://demov3.net955210.co ntentfabric.io/config"
  });
  const wallet = client.GenerateWallet();
  const signer = wallet.AddAccount({
    privateKey: key
  });
  client.SetSigner({signer});
  return await client.DownloadFile({
    libraryId: libraryId,
    objectId: objectId,
    filePath: "book.txt"
  })
}

uploadContent("Book", "testfolder", "test.txt", 10000, "Book54", myPrivateKey, 5)
//accessBook("iq__4VVAoFyhb2QMC8WhrDRZn5zUxFqB", secondKey); 
//setVisible("iq__c6TP7cVAqRKSKu4S6PGUqYN36JE", myPrivateKey);
/*downloadBook(myPrivateKey,"iq__c6TP7cVAqRKSKu4S6PGUqYN36JE", "test.txt").then(
  (res) => {
    var dec = new TextDecoder("utf-8");
    console.log(dec.decode(res))
  }
)*/