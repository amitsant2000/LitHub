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

// Connect to CockroachDB through Sequelize.
var sequelize = new Sequelize({
  dialect: "postgres",
  username: "amitsant2000",
  password: "gdswBnFYXAeBT-IX",
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

function createBook(authorEmail, title, price, data) {
  let s = crypto.randomBytes(16).toString('hex') //replace with NFT hash
  return Book.create(
    {
      id: s,
      title:title,
      authorEmail: authorEmail,
      price: price,
      ownerEmail: "",
    }
  )
  .catch(function (err) {
    console.error("error: " + err.message);
    process.exit(1);
  });;
};

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
    let myBooks = Book.findAll({
      where: {
        authorEmail: {
          [Sequelize.Op.eq]: req.user.email
        }
      }
    })
    res.render("author", {
      "books": myBooks,
      "user": req.user
    });
  } else {
    let books = Book.findAll();
    res.render("userHome", {
      "books": books,
    });
  }
});


app.post('/upload-book', requireAuth, (req, res) => {
  if (req.user.author) {
    const { title, price, data } = req.body;
    createBook(req.user.email, title, price, data);
    res.redirect("/home");
  } else {
    res.redirect("/home");
  }
});

app.post('/buy-book', requireAuth, (req, res) => {
  if (!req.user.author) {
    const { id } = req.body;
    buyBook(req.user.email, id)
    res.redirect("/home");
  } else {
    res.redirect("/home");
  }
});