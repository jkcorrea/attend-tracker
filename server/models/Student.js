var cv = require('opencv')
  , mkdirp = require('mkdirp')
  , fs = require('fs')
  , path = require('path')
  , inspect = require('util').inspect
  , mongoose = require('mongoose');

var studentSchema = new mongoose.Schema({
  first_name: String,
  last_name: String,
  attended: Boolean,
  andrew_id: {type: String, unique: true, lowercase: true }
});

studentSchema.methods.getModelPath = function() {
  return path.join(this.getTrainingPath(), 'model.xml');
}

studentSchema.methods.getTrainingPath = function() {
  return path.join(__trainDir, this.andrew_id);
}

studentSchema.methods.getProfilePhotoPath = function() {
  return path.join('/static', path.basename(__trainDir), this.andrew_id, '/profile.jpg');
}

studentSchema.methods.resetModel = function() {
  fs.unlinkSync(this.getModelPath());
  this.attended = false;
  this.save();
}

studentSchema.methods.trainModel = function(image) {
  var mpath = this.getModelPath();
  var exists = fs.existsSync(mpath);
  var facerec = cv.FaceRecognizer.createLBPHFaceRecognizer();
  var self = this;

  console.log('Training model ' + this.andrew_id + ' with ' + image + '...');
  console.log('Exists? ' + (exists ? 'Yes\nLoading from ' + mpath : 'No\nCreating...'));

  mkdirp(self.getTrainingPath());

  cv.readImage(image, function(err, mat) {
    if (exists) {
      facerec.loadSync(mpath);
      facerec.updateSync([[1, mat]]);
    }
    else facerec.trainSync([[1, mat]]);

    facerec.saveSync(mpath);

    var src = fs.createReadStream(image);
    var dest = fs.createWriteStream(path.join(self.getTrainingPath(), '/profile.jpg'));
    src.pipe(dest);
    src.on('end', function() { fs.unlink(image); });
  });

  // cv.readImage(imPath, function(err, mat) {
  //   if (err) throw err;

  //   mat.detectObject(cv.FACE_CASCADE, {}, function(err, faces) {
  //     if (err) throw err;
  //     if (!faces.length) return console.log('No faces in training image: ' + imPath);

  //     var face = faces[0];
  //     var size = mat.size;
  //     var cropped = mat.roi(face.x, face.y, face.width, face.height);
  //     cropped.convertGrayscale();
  //     cropped.save(dest, function() {
  //       console.log('Cropped file saved!');
  //     });

  //   });

  // });
}

studentSchema.methods.checkModel = function(image) {
  var mpath = this.getModelPath();
  var exists = fs.existsSync(mpath);
  var facerec = cv.FaceRecognizer.createLBPHFaceRecognizer();
  var self = this;

  if (!exists) return console.log('This student\'s model has not been trained!!');
  facerec.trainSync([[1, path.join(self.getTrainingPath(), 'profile.jpg')]]);

  cv.readImage(image, function(err, im) {
    if (err) throw err;
    var results = facerec.predictSync(im);
    var msg = "";
    if (results.id == 1 && results.confidence >= __DETECT_THRESHOLD) {
      console.log("Marking " + self.andrew_id + " as having attended with a confidence rating of " + results.confidence);
      self.attended = true;
      self.save();
      return;
    }
    console.log("Photo is not " + self.andrew_id + ", with a confidence rating of " + results.confidence);

  });
}

module.exports = mongoose.model('student', studentSchema);
