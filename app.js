const express = require("express");
const app = express();
const exphbs = require("express-handlebars");
const bodyParser = require("body-parser");
const url = require("url");
const session = require("express-session");
const mySQL = require("mysql");
const moment = require("moment-timezone");
const sha1 = require('sha1');
const db = mySQL.createConnection({
  host: "localhost",
  user: "root",
  password: "zaxscd0412",
  database: "test1",
});
db.connect();
app.engine("hbs", exphbs({ defaultLayout: "main", extname: ".hbs" }));
app.set("view engine", "hbs");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(
  session({
    saveUninitialized: false,
    resave: false,
    secret: "fehfjioepj",
    cookie: { maxAge: 1800000 },
  })
);
//自訂middleware
app.use((req, res, next) => {
  res.locals.renderData = {
    loginUser: req.session.loginUser,
  };
  next();
});
//首頁
app.get("/", (req, res) => {
  res.render("home");
});
//24小時預約掛號
app.get("/appointment", (req, res) => {
  const data = res.locals.renderData;
  
  res.render("appointment");
  
});
app.get('/appointment/:name',(req,res)=>{
  // console.log(req)
  const data = res.locals.renderData;
  const name = req.params
  const body = req.body
  console.log(body)
  data.name = name
  res.render("appointment-confirm",data)
});
console.log(moment().format("YYYY-MM-DD HH:mm:ss"))
//即時查詢叫號
app.get("/number", (req, res) => {
  const restaurant = require("./data/restaurant.json");
  const dis = require("./data/district.json");
  const data = res.locals.renderData;
  const areares = [];
  const restaurantarea = [];
  const allres = [];
  if (req.url.substring(12) == "") {
    for (i = 0; i < dis.length; i++) {
      for (j = 0; j < restaurant.length; j++) {
        if(dis[i].Area==restaurant[j].Add.slice(3,6)){
          allres.push(restaurant[j]);
        }   
      }
    }
  } else {
    for (i = 0; i < dis.length; i++) {
      if (req.params.area === dis[i].Area) {
        areares.push(dis[i]);
      }
    }
    for (i = 0; i < restaurant.length; i++) {
      if (req.params.area === restaurant[i].Add.slice(3, 6)){
        restaurantarea.push(restaurant[i]);
      }
    }
  }
  data.restaurantarea = restaurantarea;
  data.allres = allres;
  data.areares = areares;
  data.dis = dis;
  data.time = moment().format("YYYY-MM-DD HH:mm:ss")
  res.render("number",data);
});
//症狀查詢
app.get("/symptoms", (req, res) => {
  const activity = require("./data/activity.json");
  const data = res.locals.renderData;
  const actfilter = [];
  for (i = 0; i < activity.length; i++) {
    if (activity[i].Location.slice(0, 3)=="新北市"){
      actfilter.push(activity[i]);
    }
  }
  for(let s in actfilter){
    actfilter[s].Start=moment(actfilter[s].Start).format('YYYY-MM-DD');
    actfilter[s].End=moment(actfilter[s].End).format('YYYY-MM-DD');
  }
  data.actfilter=actfilter;
  res.render("symptoms");
});
//部落格
app.get('/blog',(req,res)=>{
  const data = res.locals.renderData;
  db.query(
    "select * from post order by createtime desc",
    (error, results, fields) => {
      for(let s in results){
        results[s].createtime=moment(results[s].createtime).format('YYYY-MM-DD HH:mm:ss');
      }
      data.blog=results;
      res.render('blog',data);
    }
  );
});
//註冊
app.get("/signup", (req, res) => {
  res.render("signup");
});
app.post('/signup', (req, res)=>{
  const data = res.locals.renderData;
  const val = {
    admin_id: req.body.admin_id,
    password: sha1(req.body.password),
    created_at:moment().format("YYYY-MM-DD HH:mm:ss")
  };
  data.addForm = val; 
  if (!req.body.admin_id || !req.body.password) {
    data.msg = {
      type: "danger",
      info: "帳號密碼必須輸入",
    };
    delete data.addForm;
    res.render("signup",data);
    return;
  }
  db.query("SELECT * FROM `admins` WHERE `admin_id`=?",
    [req.body.admin_id],
    (error, results, fields) => {
      if (results.length) {
        data.msg = {
          type: "danger",
          info: "帳號已存在",

        };
        delete data.addForm;
        res.render("signup", data);
        return;
      }
      const sql = "insert into admins set ?";
      db.query(sql, val, (error, results, fields) => {
        // console.log(results);//看inser結果
        if (error) {
          // console.log(error);
          res.send(error.sqlMessage);
          return;
        }
        if (results.affectedRows == 1) { 
          data.msg = {
            type: "success",
            info: "帳號新增成功",
          };
        }
        delete data.addForm
        res.render("signup", data);
      });
    });
});
//登入
app.get("/login", (req, res) => {
  const data = res.locals.renderData;
  if (req.session.flashMsg) {
    data.flashMsg = req.session.flashMsg;
    delete req.session.flashMsg;
  }
  res.render("login", data);
});
app.post('/login', (req, res)=>{
  db.query("SELECT * FROM `admins` WHERE `admin_id`=? AND `password`=SHA1(?)",
      [req.body.user, req.body.password],
      (error, results, fields)=>{
          // console.log(results); // debug
          if(! results.length){
              req.session.flashMsg = {
                  type: "danger",
                  msg: "帳號或密碼錯誤"
              };
          } else {
              console.log(req.session);
              req.session.loginUser = req.body.user;
              req.session.flashMsg = {
                  type: "success",
                  msg: "登入成功"
              };
          }
          res.redirect('/login');
      });
});
//登出
app.get("/logout", (req, res) => {
  delete req.session.loginUser;
  res.redirect("/");
});
//登入後模組

app.use('',require('./my-routers/users.js'))

//404
app.use((req, res) => {
  res.type("text/plain");
  res.status(404);
  res.send("Not Found Page...");
});
app.listen(3000, () => console.log("server start..."));
