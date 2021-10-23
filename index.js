var createError = require('http-errors');
express = require('express')
var path = require('path');
var logger = require('morgan');
var bodyParser = require('body-parser')
var app = express()
var http = require('http');
var cookieParser = require('cookie-parser');
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
app.get('/', function(req, res, next){
  res.render('index', {title: 'Home'})
});
app.get('/about', function(req, res, next){
  res.render('about', {title: 'About'})
});
app.get('/contact', function(req, res, next){
  res.render('contact', {title: 'Contact Me'})
});
app.get('/teaching', function(req, res, next){
  res.render('teaching', {title: 'Teaching'})
});
app.get('/resources', function(req, res, next){
  res.render('resources', {title: 'Resources'})
});
app.get('/projects', function(req, res, next){
  res.render('projects', {title: 'Projects'})
});