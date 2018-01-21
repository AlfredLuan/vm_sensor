
var gpio = require("pi-gpio");

var SENSOR_POLLING_INTERVAL = 3000;

var writeValue = 1;

function getWriteValue() {
    writeValue = (writeValue == 1? 0 : 1);
    return writeValue;
}

function _log(message) {
    console.log((new Date()) + " | " + message + "\r\n");
}

function handleSensor(pinNum, callback) {

    _log("handle pinNum " + pinNum);

    // close gpio in advance, just in case that it's not properly released in previous use
    gpio.close(pinNum, function(err) {
        // in case of any err, still try to open gpio
        if(err) {
            _log("error during close gpio " + pinNum);
            _log(err);
        }

        callback(pinNum);
    });
}

var openGpioAndRead = function(pinNum) {

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

var openGpioAndWrite = function(pinNum) {

    // open gpio for the pinNum
    gpio.open(pinNum, "output", function(err) {

        if(err) {
            _log("error during open gpio " + pinNum);
            _log(err);
            return;
        }

        // polling the sensor value from gpio by certain interval
        setInterval(function() {
            var value = getWriteValue();
            gpio.write(pinNum, value, function(err) {
                if(err) {
                    _log("error during write gpio " + pinNum);
                    _log(err);
                    return;
                }

                _log("write value " + value + " to gpio " + pinNum);
            });
        }, SENSOR_POLLING_INTERVAL);
    });
}

handleSensor(37, openGpioAndRead);
handleSensor(33, openGpioAndWrite);
