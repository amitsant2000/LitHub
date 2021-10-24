const Sequelize = require("sequelize-cockroachdb");
// For secure connection:
const fs = require('fs');
var createError = require('http-errors');
express = require('express')
var path = require('path');
var logger = require('morgan');
var bodyParser = require('body-parser')
var app = express()
var http = require('http');
var cookieParser = require('cookie-parser');
var crypto = require('crypto'); 
const { ElvClient } = require("@eluvio/elv-client-js");
const multer  = require('multer')
const upload = multer({ dest: 'data/uploads/' })

const libraryId = process.env.LIB_ID;
async function uploadContent(LitType, LitPath, LitName, LitSize, Title, key, Price) {
    const client = await ElvClient.FromConfigurationUrl({
        configUrl: process.env.CONFIG_URL
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

    await client.SetPermission({objectId: objectId, permission: "viewable"});
    //var newAccessgroup = client.CreateAccessGroup()

    const versionHash = finalizeResponse.hash;
    return objectId
}
async function accessBook(objectId, key) {
  const client = await ElvClient.FromConfigurationUrl({
    configUrl: process.env.CONFIG_URL
  });
  const wallet = client.GenerateWallet();
  const signer = wallet.AddAccount({
    privateKey: key
  });
  await client.SetSigner({signer});
  const accessReq =await client.AccessRequest({
    libraryId: process.env.LIB_ID,
    objectId: objectId,
  })
  return "if you have time to clean, you are not reading enough"
}
async function downloadBook(key, objectId) {
  const client = await ElvClient.FromConfigurationUrl({
    configUrl: process.env.CONFIG_URL
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

// Connect to CockroachDB through Sequelize.
var sequelize = new Sequelize({
  dialect: "postgres",
  username: "amitsant2000",
  password: process.env.COCKROACH_PASS,
  host: "free-tier.gcp-us-central1.cockroachlabs.cloud",
  port: 26257,
  database: "curly-mink-4332.users",
  dialectOptions: {
    ssl: {
      // For secure connection:
      rejectUnauthorized: false
      /*ca: fs.readFileSync('/Users/deoxi/.postgresql/root.crt')
                .toString()*/
    },
  },
  logging: false,
});

const Account = sequelize.define("accounts", {
  email: {
    type: Sequelize.STRING,
    primaryKey: true,
  },
  fName: {
    type: Sequelize.STRING,
  },
  lName: {
    type: Sequelize.STRING,
  },
  hash: {
    type: Sequelize.STRING,
  },
  salt: {
    type: Sequelize.STRING,
  },
  author: {
    type: Sequelize.BOOLEAN,
  },
  balance: {
    type: Sequelize.FLOAT
  }
});

Account.sync({
  force: true,
})

const Book = sequelize.define("books", {
  id: {
    type: Sequelize.STRING,
    primaryKey: true,
  },
  title: {
    type: Sequelize.STRING,
  },
  authorEmail: {
    type: Sequelize.STRING,
  },
  price: {
    type: Sequelize.FLOAT
  },
  ownerEmail: {
    type: Sequelize.STRING,
  },
  filePath: {
    type: Sequelize.STRING,
  },
});

Account.sync({
  force: true,
})

Book.sync({
  force: true,
})

function createAcct(mail, password, firstName, lastName, isAuthor) {
  let s = crypto.randomBytes(16).toString('hex')
  return Account.create(
    {
      email: mail,
      fName:firstName,
      lName:lastName,
      hash: crypto.pbkdf2Sync(password, s,  
        1000, 64, `sha512`).toString(`hex`),
      salt: s,
      author: isAuthor == "isAuthor",
      balance: 0.0,
    }
  ).then(function () {
    // Retrieve accounts.
    return Account.findAll();
  })
  .then(function (accounts) {
    // Print out the balances.
    accounts.forEach(function (account) {
      console.log(account.email + " " + account.hash + " " + String(account.author));
    })
  })
  .catch(function (err) {
    console.error("error: " + err.message);
    process.exit(1);
  });;
};

function createBook(authorEmail, title, price, fileDir, fileName, fileSize, pkey) {
  uploadContent("book", fileDir, fileName, fileSize + 1000, title, pkey, price).then((id) => {
    return Book.create(
      {
        id: id,
        title:title,
        authorEmail: authorEmail,
        price: price,
        ownerEmail: "",
        filePath: fileName
      }
    ).then(function () {
      // Retrieve accounts.
      return Book.findAll();
    })
    .then(function (books) {
      // Print out the balances.
      books.forEach(function (book) {
        console.log(book.authorEmail + " " + book.id + " " + book.ownerEmail);
      })
    })
    .catch(function (err) {
      console.error("error: " + err.message);
      process.exit(1);
    });
  })
  
};

async function buyBook(userEmail, bookId, pkey){
  await accessBook(bookId, pkey).then((na) => {
    Book.findOne({id: bookId}).then((bk)=>{
      bk.ownerEmail = userEmail;
    });
  })
}

const generateAuthToken = () => {
  return crypto.randomBytes(30).toString('hex');
}

const verifyPass = (acct, password) => {
  if (acct == null) {
    return false
  } else {
    let hashedPassword = crypto.pbkdf2Sync(password, acct.salt,  
      1000, 64, `sha512`).toString(`hex`)
    return hashedPassword == acct.hash
  }
}


var port = process.env.PORT || '5000';
app.set('port', port);
var server = http.createServer(app);
server.listen(port);
app.use(logger('dev'));
app.use(express.json());
app.use(bodyParser.json({limit: '50mb'}));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

const authTokens = {};

app.use((req, res, next) => {
  const authToken = req.cookies['AuthToken'];

  req.user = authTokens[authToken];

  next();
});

const requireAuth = (req, res, next) => {
  if (req.user) {
      next();
  } else {
      res.redirect("/login");
  }
};

app.get("/", requireAuth, (req, res) => {
  res.redirect("/home");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post('/login', (req, res) => {
    const { email, password, isAuthor } = req.body;
    Account.findOne({ where: {email: email, author: isAuthor == "isAuthor" } }).then(acct => {
      if (verifyPass(acct, password)) {
        const authToken = generateAuthToken();

        authTokens[authToken] = acct;

        res.cookie('AuthToken', authToken);

        res.redirect('/home');
      } else {
          res.render('login', {
              message: 'Invalid username or password',
              messageClass: 'alert-danger'
          });
      }
    })
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.post('/register', (req, res) => {
  const { email, firstName, lastName, password, confirmPassword, isAuthor } = req.body;

  if (password === confirmPassword && password != "" && email != "" && firstName != "" && lastName != "") {

      Account.findOne({ where: {email: email} }).then(acct => {
        if (acct != null) {
          res.render('register', {
              message: 'User already registered.',
              messageClass: 'alert-danger'
          });
        } else {
          createAcct(email, password, firstName, lastName, isAuthor);
          res.redirect('/login');
        }

        return;
      })
  } else {
      res.render('register', {
          message: 'Form Filled Incorrectly.',
          messageClass: 'alert-danger'
      });
  }
});

app.get('/home', requireAuth, (req, res) => {
  if (req.user.author) {
    Book.findAll({
      where: {
        authorEmail: req.user.email
      }
    }).then((myBooks) => {
      res.render("author", {
        "books": myBooks,
        "user": req.user
      })
    });
  } else {
    Book.findAll({
      where: {
        ownerEmail: req.user.email
      }
    }).then((books)=> {
      res.render("user", {
        "books": books,
        "user": req.user
      });
    });
  }
});


app.post('/upload-book', upload.single('filename'), (req, res) => {
  if (req.user.author) {
    const { title, price, key } = req.body;
    console.log(req.file)
    createBook(req.user.email, title, price, req.file.destination, req.file.filename, req.file.size, key);
    res.redirect("/home");
  } else {
    res.redirect("/home");
  }
});

app.post('/buy-book', requireAuth, (req, res) => {
  if (!req.user.author) {
    const { key } = req.body;
    downloadBook(req.body.key, req.query.book).then((res)=> {
      //brandonis
      var dec = new TextDecoder('utf-8')
      var content = dec.decode(res)
      res.render("read", {
        "content": content
      });
    })
    return
    buyBook(req.user.email, req.query.book, key).then(() => {
      res.redirect("/home");
    });
  } else {
    res.redirect("/home");
  }
});

app.get("/market", requireAuth, (req, res) => {
  if (!req.user.author) {
    Book.findAll({
      where: {
        ownerEmail: ""
      }
    }).then((books)=> {
      res.render("book_listing", {
        "books": books
      });
    })
  } else {
    res.redirect("/home");
  }
})

app.get("/read", requireAuth, (req, res) => {
  if (!req.user.author) {
    let book = Book.findOne({
      where: {
        ownerEmail: req.user.email,
        id: req.query["book"]
      }
    });
    if (book) {
      downloadBook(req.body.key, book.id).then((res)=> {
        //brandonis
        var dec = new TextDecoder('utf-8')
        var content = dec.decode(res)
        res.render("read", {
          "content": content
        });
      })
    } else {
      res.redirect("/home")
    }
  } else {
    res.redirect("/home");
  }
})

app.get("/upload", requireAuth, (req, res) => {
  if (req.user.author) {
    res.render("upload")
  } else {
    res.redirect("/home");
  }
})