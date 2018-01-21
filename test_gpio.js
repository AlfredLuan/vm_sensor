
var gpio = require("pi-gpio");

var SENSOR_POLLING_INTERVAL = 3000;

function _log(message) {
    console.log((new Date()) + " | " + message + "\r\n");
}

function handleSensor(pinNum) {

    _log("handle pinNum " + pinNum);

    // close gpio in advance, just in case that it's not properly released in previous use
    gpio.close(pinNum, function(err) {
        // in case of any err, still try to open gpio
        if(err) {
            _log("error during close gpio " + pinNum);
            _log(err);
        }

        openGpio(pinNum);
    });
}

function openGpio(pinNum) {

    // open gpio for the pinNum
    gpio.open(pinNum, "input", function(err) {

        if(err) {
            _log("error during open gpio " + pinNum);
            _log(err);
            return;
        }

        // polling the sensor value from gpio by certain interval
        setInterval(function() {
            gpio.read(pinNum, function(err, value) {
                if(err) {
                    _log("error during read gpio " + pinNum);
                    _log(err);
                    return;
                }

                _log("read value " + value + " from gpio " + pinNum);
            });
        }, SENSOR_POLLING_INTERVAL);
    });
}

handleSensor(37);
handleSensor(33);
