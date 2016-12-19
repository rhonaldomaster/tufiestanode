var server = (function () {
  var http = require("http"),
  url = require("url"),
  qs = require('querystring');

  var requestData = '';
  const PORT = 8888;

  var init = function () {
    console.log("Server start");
    http.createServer(onRequest).listen(PORT);
  };

  var onRequest = function (request, response) {
    var pathname = url.parse(request.url).pathname;
    request.setEncoding("utf8");
    if(request.method=='POST') {
      var requestedData = '';
      request.on('data',function (data) {
        requestedData += data;
      });
      request.on('end',function () {
        //requestData = qs.parse(requestedData);
        requestData = JSON.parse(requestedData);
        route(pathname,response);
      });
    }
    else if(request.method=='GET') {
      var urlParts = url.parse(request.url,true);
      requestData = urlParts.query;
      route(pathname,response);
    }
  };

  var route = function (pathname,response) {
    var handle = {
      '/eventDetails': eventDetails
    };
    if (typeof handle[pathname] === 'function') {
      return handle[pathname](response);
    }
    else {
      writeJSONResponse(response, 404, '{"message":"404 No Encontrado"}');
    }
  };

  var eventDetails = function (response) {
    var details = '', status = 200;
    if (requestData.id != null) {
      databaseConnection.fetchEventDetails(requestData.id,function (resp) {
        writeJSONResponse(response, status, resp);
      });
    }
    else {
      status = 500;
      details = '{"error":"No request data provided"}';
      writeJSONResponse(response, status, details);
    }
  };

  var writeJSONResponse = function (response, status, json) {
    response.writeHead(status, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    response.write(json);
    response.end();
  };

  return {
    init: init
  };
})();

var databaseConnection = (function () {
  var mysql = require('mysql');
  var con = null;

  var init = function () {
    con = mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '12345',
      database: 'tufiesta',
      port: '/Applications/MAMP/tmp/mysql/mysql.sock'
    });
    connect();
  };

  var connect = function () {
    con.connect(function (err) {
      if(err){
        console.log(err);
        return;
      }
      console.log('Connection established');
    });
  };

  var closeConnection = function () {
    if (con != null) {
      con.end(function(err) {
        con = null;
        if(err){
          console.log('Error closing DB');
          return;
        }
        console.log('Connection closed');
      });
    }
  };

  var fetchEventDetails = function (eventId, callback) {
    if (con == null) {
      init();
    }
    if (con != null) {
      var query = 'SELECT id, nombre, fecha, descripcion, fechaCreacion FROM evento WHERE id='+eventId;
      con.query(query,function (err,rows) {
        if (err) {
          return callback({"error":"Error"});
        }
        else {
          var resp = {"notice":"No data found"};
          if (rows.length > 0) {
            for (var i = 0; i < rows.length; i++) {
              resp = rows[i];
            }
            var d = new Date(resp.fecha);
            resp.fecha = (d.getFullYear())+'-'+
              (d.getMonth() < 9 ?'0':'')+(d.getMonth() + 1)+'-'+
              (d.getDay()<10?'0':'')+(d.getDay())+' '+
              ((d.getHours()<10?'0':'')+d.getHours()+':'+(d.getMinutes()<10?'0':'')+d.getMinutes());
            eventGuests(eventId, function (response) {
              resp.guestList = JSON.parse(response);
              return callback(JSON.stringify(resp));
            });
          }
        }
      });
      //if (con != null) closeConnection();
    }
  };

  var eventGuests = function (eventId, callback) {
    if (con == null) {
      init();
    }
    if (con != null) {
      var query = 'SELECT ie.idInvitado AS id, u.nombre '+
      'FROM invitadosEvento ie INNER JOIN usuario u ON u.id=ie.idInvitado '+
      'WHERE idEvento='+eventId;
      con.query(query,function (err,rows) {
        if (err) {
          console.log(err);
          return callback({"error":"Error2"});
        }
        else {
          var resp = {"notice":"No data found"};
          if (rows.length > 0) {
            resp = '';
            for (var i = 0; i < rows.length; i++) {
              if (resp != '') {
                resp += ',';
              }
              else {
                resp = '[';
              }
              resp += JSON.stringify(rows[i]);
            }
            if (resp != '') {
              resp = resp += ']';
            }
          }
          return callback(resp);
        }
      });
      if (con != null) closeConnection();
    }
  };

  return {
    fetchEventDetails: fetchEventDetails
  };
})();

server.init();
