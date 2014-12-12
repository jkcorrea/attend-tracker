var Busboy = require('busboy')
  , fs = require('fs')
  , cv = require('opencv')
  , path = require('path')
  , mkdirp = require('mkdirp')
  , Student = require('../models/Student');

exports.getTrain = function(req, res) {
  Student.find({}, function(err, stus) {
    var andrew_ids = stus.map(function(s) { return s.andrew_id; });
    res.render('train', {
      title: 'Train',
      andrew_ids: andrew_ids
    });
  });
}

exports.getCheckin = function(req, res) {
  res.render('checkin', {
    title: 'Checkin'
  });
}

exports.postTrain = function(req, res) {
  var busboy = new Busboy({ headers: req.headers });
  var files = [];

  busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
    var fname = 'trainer-photo-' + Math.floor(Date.now() / 1000) + '.jpg';
    var saveTo = path.join(__upDir, fname);
    var bufs = [];
    files.push(saveTo);
    file.on('data', function(d) { bufs.push(d); });
    file.on('end', function() {
      cv.readImage(Buffer.concat(bufs), function(err, mat) {
        if (err) throw err;
        mat.convertGrayscale();
        mat.save(saveTo);
        // mat.detectObject(cv.FACE_CASCADE, {}, function(err, faces) {
        //   if (err) throw err;
        //   if (!faces.length) return console.log('No faces in uploaded image!');
        //   var face = faces[0];
        //   var size = mat.size;
        //   var cropped = mat.roi(face.x, face.y, face.width, face.height);
        //   cropped.convertGrayscale();
        //   cropped.save(saveTo);
        // });
      });
    });
  });

  busboy.on('field', function(k, v, kTrunc, vTrunc) {
    req.body[k] = v;
  });

  busboy.on('finish', function() {
    var andrew = req.body.andrew_id;
    var reset = req.body.reset_model;
    var student;
    setTimeout(function() {
      Student.findOne({ andrew_id: andrew }, function(err, stu) {
        if (!stu) student = new Student({ andrew_id: andrew });
        else student = stu;
        if (reset) student.resetModel();
        for (var i = 0; i < files.length; i++) student.trainModel(files[i]);
        student.save();
        req.flash('success', { msg: 'Successfully trained ' + andrew + '\'s model.' });
        res.redirect('/');
      });
    }, 250);
  });

  return req.pipe(busboy);
}

exports.postCheckin = function(req, res) {
  var dest = __upDir;
  var busboy = new Busboy({ headers: req.headers, limits: { files: 1 } });
  mkdirp(dest);

  busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
    var fname = 'recog-photo-' + Math.floor(Date.now() / 1000) + '.jpg';
    var saveTo = path.join(__upDir + "/", fname);
    var bufs = [];
    file.on('data', function(d) { bufs.push(d); });
    file.on('end', function() {
      cv.readImage(Buffer.concat(bufs), function(err, mat) {
        if (err) throw err;
        mat.convertGrayscale();
        var imageBuffer = mat.toBuffer();
        fs.writeFileSync(saveTo, imageBuffer);
        Student.find({}, function(err, stus) {
          for (var i = 0; i < stus.length; i++)
            stus[i].checkModel(saveTo);
        });
      });
    });
  });

  busboy.on('finish', function() {
    res.redirect('/');
  });
  return req.pipe(busboy);
}
