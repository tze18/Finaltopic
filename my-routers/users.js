const router = require("express").Router();
const mysql = require("mysql");
const moment = require("moment-timezone");
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "zaxscd0412",
  database: "test1"
});
router.use((req, res, next) => {
  if (!req.session.loginUser) {
    res.status(403);
    res.redirect("login");
  } else {
    next();
  }
});
//儲存景點顯示
router.get("/savespot", (req, res) => {
  const data = res.locals.renderData;
  db.query(
    "select * from spot where admin_id=?",
    [data.loginUser],
    (error, results, fields) => {
      data.spot = results;
      res.render("savespot", data);
    });
});
//景點儲存
router.post("/savespot", (req, res) => {
  const data = res.locals.renderData;
  const val = {
    name: req.body.name,
    desc: req.body.desc,
    addr: req.body.address,
    admin_id: data.loginUser,
  };
  db.query("insert into spot set ?", val, (error, results, fields) => {
    // console.log(results);
  // res.render("savespot");
  
  });
  // res.redirect('/savespot')
});
//景點儲存刪除
router.get("/savespot/remove/:name", (req, res) => {
  const data = res.locals.renderData;
  // console.log(req.params.title);
  db.query(
    "delete from spot where name=? and admin_id=?",
    [req.params.name,data.loginUser],
    (error, results, fields) => {
      res.redirect("/savespot");
    });
  });
//個人部落格顯示
router.get("/user-blog", (req, res) => {
  const data = res.locals.renderData;
  db.query(
    "select * from post where admin_id=? order by createtime desc",
    [data.loginUser],
    (error, results, fields) => {
      for (let s in results) {
        results[s].createtime = moment(results[s].createtime).format(
          "YYYY-MM-DD HH:mm:ss"
        );
      }
      data.blog = results;
      res.render("userblog", data);
    });
});
//發布文章
router.post("/user-blog", (req, res) => {
  const data = res.locals.renderData;
  const val = {
    admin_id: data.loginUser,
    title: req.body.title,
    message: req.body.message,
    createtime: moment().format("YYYY-MM-DD HH:mm:ss")
  };
  db.query("insert into post set ?", val, (error, results, fields) => {
    res.redirect("/user-blog");
  });
});
//修改顯示
router.get("/user-blog/edit/:title", (req, res) => {
  const data = res.locals.renderData;
  db.query(
    "select * from post where admin_id=? AND title=?",
    [data.loginUser,req.params.title],
    (error, results, fields) => {
      if (!results.length) {
        res.status(404);
        res.send("NO Data");
      } else {
        data.item = results[0];
        res.render("user-blog-edit", data);
      }
    });
});
//修改發布
router.post("/user-blog/edit/:title", (req, res) => {
  const data = res.locals.renderData;
  let my_result = {
    success: false,
    affectedRows: 0,
    info: "內容需輸入",
  };
  const val = {
    title: req.body.title,
    message: req.body.message,
    createtime:moment().format("YYYY-MM-DD HH:mm:ss")
  };
  if (!req.body.message) {
    res.json(my_result);
    return;
  }
   db.query("UPDATE `post` SET ? WHERE admin_id=? AND title=?", [val, data.loginUser,req.body.title], (error, results, fields) => {
      if (error) {
        console.log(error);
        res.send(error.sqlMessage);
        return;
      }else{
        my_result = {
          success: true,
          affectedRows: 1,
          info: "修改成功",
        };
        res.json(my_result);
       }
    });
});
//刪除
router.get("/user-blog/remove/:title", (req, res) => {
  const data = res.locals.renderData;
  // console.log(req.params.title);
  db.query(
    "delete from post where admin_id=? AND title=?",
    [data.loginUser,req.params.title],
    (error, results, fields) => {
      res.redirect("/user-blog");
    });
});
module.exports = router;
