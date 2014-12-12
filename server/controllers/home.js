var Student = require('../models/Student');

/**
 * GET /
 * Home page.
 */

exports.index = function(req, res) {
  Student.find({}, function(err, students) {
    res.render('home', {
      title: 'Home',
      students: arrayTo2DArray(students, 3)
    });
  });
};

function arrayTo2DArray (list, howMany) {
    var result = []; a = list.slice(0);
    while(a[0]) {
        result.push(a.splice(0, howMany));
    }
    return result;
}
