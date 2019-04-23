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
  host: "medical.cg1fvo9lgals.ap-southeast-1.rds.amazonaws.com",
  user: "admin",
  password: "12345678",
  database: "medical",
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
  const data = res.locals.renderData;
  res.render("home",data);
});
//24小時預約掛號
app.get("/appointment", (req, res) => {
  const data = res.locals.renderData;
  
  res.render("appointment",data);
  
});
app.get('/appointment/:name/:time?',(req,res)=>{
  // console.log(req)
  const doctor = require("./data/doctor.json");
  const data = res.locals.renderData;
  const params = req.params
  // console.log(params)
  // console.log(doctor[0].Id)
  doc = []
  for(i=0;i <doctor.length;i++){
    if(params.name == doctor[i].Id){
      data.name = doctor[i].Name
      data.sub = doctor[i].Sub
      data.room = doctor[i].Room
    }
  }
  data.time = params.time
  res.render("appointment-confirm",data)
});
app.post('/appointment/:name/:time?',(req,res)=>{
  // console.log(req.body)
  const data = res.locals.renderData;
  db.query("SELECT * FROM `med_basic_info` WHERE `id`=?",
      [req.body.id],
      (error, results, fields)=>{
        if(results.length){
          const val = {
            ID: req.body.id,
            Name:results[0].Name,
            Sex:results[0].Sex,
            Subject:req.body.sub,
            App_time:req.body.time,
            Doctor:req.body.name,
          }; 
          db.query("SELECT * FROM med_appointment_sub Where Doctor=? and App_time=?;",[req.body.name,req.body.time],(error, results, fields)=>{
            // val.row= results[0].row+1
            // console.log(results.length)
            if(results.length == 0){
              val.row = 1
              db.query("insert into med_appointment_sub set ?", val, (error, results, fields) =>{
              console.log(results)
            });
            }
            else{
              val.row= results[results.length-1].row+1
              console.log(val)
              const sql = "insert into med_appointment_sub set ?";
              db.query(sql, val, (error, results, fields) =>{
              console.log(results)
            });
            }
          });
          res.redirect("/appointment")
        }
        else{
          console.log('身分證輸入錯誤')
          res.redirect("/singup")
        }
      });  
});
//查詢掛號
app.get("/check",(req,res)=>{
  res.render("check")
});
app.post("/check",(req,res)=>{
  const data = res.locals.renderData;
  // console.log(req.body.id)
  db.query("SELECT * FROM med_appointment_sub Where ID=?",[req.body.id],(error, results, fields) =>{
    // console.log(results)
    getval = []
    results.forEach(el => {
      el.App_time = moment(el.App_time).format("YYYY-MM-DD");
    });
    for(i=0;i<results.length;i++){
      getval.push(results[i])
    }
    // console.log(getval[1])
    return;
  })
  data.getval = getval
  res.render("check",data)
});

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
//部落格
// app.get('/blog',(req,res)=>{
//   const data = res.locals.renderData;
//   db.query(
//     "select * from post order by createtime desc",
//     (error, results, fields) => {
//       for(let s in results){
//         results[s].createtime=moment(results[s].createtime).format('YYYY-MM-DD HH:mm:ss');
//       }
//       data.blog=results;
//       res.render('blog',data);
//     }
//   );
// });
//註冊
app.get("/signup", (req, res) => {
  res.render("signup");
});

app.post('/signup', (req, res)=>{
  const data = res.locals.renderData;
  const val = {
    Name:req.body.name,
    ID: req.body.user,
    password: sha1(req.body.password),
    Tel: req.body.phone,
    Mobile:req.body.mobile,
    Sex:req.body.sex,
    Address:req.body.address,
    Birth:req.body.Birth,
    Create_time:moment().format("YYYY-MM-DD HH:mm:ss")
  };
  data.addForm = val;
  if (!req.body.user || !req.body.password||!req.body.name||!req.body.phone||!req.body.mobile||!req.body.sex||!req.body.address||!req.body.Birth) {
    data.msg = {
      type: "danger",
      info: "尚有欄位未填",
    };
    // delete data.addForm;
    res.render("signup",data);
    return;
  };
  if(! /^\d{4}\-\d{1,2}\-\d{1,2}$/.test(req.body.Birth))
  {
    data.msg = {
        type: 'danger',
        info: '生日格式有誤'
    };
    res.render('signup', data);
    return;
  };
  db.query("SELECT * FROM `med_basic_info` WHERE `id`=?",
    [req.body.user],
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
      const sql = "insert into med_basic_info set ?";
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
// 登入
app.get("/login", (req, res) => {
  const data = res.locals.renderData;
  if (req.session.flashMsg) {
    data.flashMsg = req.session.flashMsg;
    delete req.session.flashMsg;
  }
  res.render("login", data);
});
app.post('/login', (req, res)=>{
  db.query("SELECT * FROM `med_basic_info` WHERE `id`=? AND `password`=SHA1(?)",
      [req.body.user, req.body.password],
      (error, results, fields)=>{
          // console.log(results); // debug
          
          if(! results.length){
              req.session.flashMsg = {
                  type: "danger",
                  msg: "帳號或密碼錯誤"
              };
              res.redirect('/login');

          } 
          
          else {
              console.log(req.session);
              req.session.loginUser = results[0].Name;
              // req.session.flashMsg = {
              //     type: "success",
              //     msg: "登入成功"
              // };
              res.redirect('/');
          }
          
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
