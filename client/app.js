var rest = require("restler")
  , tessel = require("tessel")
  , camera = require("camera-vc0706").use(tessel.port["B"]);

var notificationLED = tessel.led[1];

camera.on("ready", function() {
tessel.button.on("release", function() {
  notificationLED.high();
  camera.takePicture(function(err, im) {
    if (err) { console.log("error taking image", err); return; }

    notificationLED.low();
    console.log("Sending photo to server...");

    rest.post("http://192.168.1.136:3000/students/checkin", {
      multipart: true,
      timeout: 10000,
      data: { photo: rest.data("photo.jpg", "image/jpg", im) }

    }).on("complete", function(data) { console.log(data); });

    // camera.disable();
  });
});
});
// camera.on("ready", function() {
//   notificationLED.high();
//   camera.takePicture(function(err, im) {
//     if (err) { console.log("error taking image", err); return; }

//     notificationLED.low();
//     console.log("Sending photo to server...");

//     rest.post("http://192.168.1.136:3000/checkin", {
//       multipart: true,
//       timeout: 10000,
//       data: { photo: rest.data("photo.jpg", "image/jpg", im) }

//     }).on("complete", function(data) { console.log(data); });

//     camera.disable();
//   });
// });
