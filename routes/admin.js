var router = require('koa-router')();
var formidable = require('formidable');
var sd = require("silly-datetime");
var path = require('path');
var fs = require('fs');
var sequelize = require('../models/ModelHeader')();

var Admin = require('../models/AdminModel');
var ShopUserpModel = require('../models/ShopUserModel');
var ShopModel = require('../models/ShopModel');
//---路由请求头，必须添加
router.prefix('/admin');

router.get('/', async function (ctx, next) {
	
	  let loginbean = ctx.session.loginbean;
	  
	  if(loginbean){
	  	 
	  	let sql = 'select * from shops order by id desc';
	  	let rs = await sequelize.query(sql);
	  	console.log('------------------------')
	  	 console.log(rs);
	  	console.log('------------------------')
	  	await ctx.render('admin/adminIndex', {rs : rs[0]});
	  }else{
	  	ctx.redirect('/adminLogin.html');
	  }
});
//---管理员登陆界面
router.post('/login', async function (ctx, next) {
	
	let rs = await new Promise (function(resolve,reject){
		//---koo2中的写法
			var email = ctx.request.body.email;
			var pwd = ctx.request.body.pwd
			console.log(email)
		  	Admin.findOne({where:{email:email,pwd:pwd}}).then(function(rs){    
		    	if(rs!=null){
		    		let loginbean = {};
		    		loginbean.id=rs._id;
		    		loginbean.email = rs.email;
		    		loginbean.nicheng = rs.nicheng;
		    		loginbean.role = rs.role;
		       	loginbean.msgnum = rs.msgnum;
		    		ctx.session.loginbean = loginbean;
		    		resolve(1);
		    	}else{
		    		resolve(0)
		    	}
		  	});
		});
		if(rs==1){
			ctx.redirect('./')
		}else{
			ctx.body='email或者密码错误';
		}
});
//---创建商铺
router.post('/createShop', async function(ctx,next){
	
	
	 let loginbean = ctx.session.loginbean;
	 //===定义formidable
	 let form = new formidable.IncomingForm();   //创建上传表单
	  form.encoding = 'utf-8';        //设置编辑
	  form.uploadDir = './public/images/shopphoto/';     //设置上传目录 文件会自动保存在这里
	  form.keepExtensions = true;     //保留后缀
	  form.maxFieldsSize = 5 * 1024 * 1024 ;   //文件大小5M

	  
	  let fields = await new Promise(async function(resolve,reject){
	  	
	  	form.parse(ctx.req, function (err, fields, files) {
	        if(err){
	            console.log(err);
	        }
	        //===改变图片的路径
	        var ttt = sd.format(new Date(), 'YYYYMMDDHHmmss');
          var ran = parseInt(Math.random() * 89999 + 10000);
          var extname = path.extname(files.photourl.name);
						//执行改名
          // var oldpath = files.photourl.path;
          var oldpath =files.photourl.path;
          console.log(oldpath)
           //新的路径由三个部分组成：时间戳、随机数、拓展名
             var newpath ="public/images/shopphoto/" + ttt + ran + extname;
           //var newpath ="public/images/shopphoto/" + ttt + ran + extname;
 					console.log(newpath);
            //改名
          fs.rename(oldpath,newpath,function(err,res){
            if(err){
                throw Error("改名失败");
            }
            fields.photourl=newpath.replace('public','');
          });
	        //====如果不去掉 public ,从数据库拿数据就不能正常显示图片 
	        resolve(fields);
	  	});
	  	
	  });
	  	fields.createtime = new Date();
	  	console.log('----------------------------')
	  	console.log(fields)
	  	console.log('----------------------------')
	  	//==============插入两个表
	  	//=============引入事务处理=========
	  	let t = await sequelize.transaction();
	  	
	  	try{
	  		let shopsRs = await ShopModel.create(fields,{ transaction: t });
	  		
	  		console.log(shopsRs);
	  		
	  		fields.shopid = shopsRs.null;
	  		fields.nicheng = shopsRs.shopname;
	  		
	  		let shopusersRs = await ShopUserpModel.create(fields,{ transaction: t });
	  		
	  		t.commit();
	  	}catch(err){
	  		
	  		t.rollback();
	  		
	  		
//	  		console.log(err)
//=======打印错误的情况err.error[0].path==  		
	  		if(err.errors[0].path=='shopusersemailuniq'){
	  			ctx.body = '账号重复'
	  		}else{
	  			ctx.body = '数据库出现错误'
	  		}
	  		
//=======================================	  		
	  		return;
	  	}
			ctx.redirect('./');  

	});
	
	module.exports = router;
