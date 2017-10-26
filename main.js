
var fs = require('fs');

var md5lib = require('js-md5');

var gpio = require("pi-gpio");

var kii = require('kii-cloud-sdk').create();

var SENSOR_LIST = null;

var SENSOR_POLLING_INTERVAL = null;

var VENDOR_THING_ID = null;

var THING_PASSWORD = null;

var OK = "OK";

var NG = "NG";

function _log(message) {
    console.log((new Date()) + " | " + message + "\r\n");
}

function loadConfig() {

    var fileContents = null;

    try {
        fileContents = fs.readFileSync("config.json", 'utf8');
    } catch (e) {
        _log("Unable to open config");
        _log(e);
        return false;
    }

    var _config = JSON.parse(fileContents.trim());

    _log("Loaded config:");
    _log("==============");

    for (var key in _config) {
        _log(key + " => " + JSON.stringify(_config[key]));
    }

    _log("==============");

    SENSOR_LIST = _config.sensorList;
    SENSOR_POLLING_INTERVAL = _config.sensorPollingInterval;

    VENDOR_THING_ID = _config.vendorThingId;
    THING_PASSWORD = _config.thingPassword;

    kii.Kii.initializeWithSite(_config.kiiAppID, _config.kiiAppKey, _config.kiiAppURL);

    return true;
}

function handleSensor(sensor) {

    _log("handle sensor " + JSON.stringify(sensor));

    // close gpio in advance, just in case that it's not properly released in previous use
    gpio.close(sensor.gpio, function(err) {
        // in case of any err, still try to open gpio
        if(err) {
            _log("error during close gpio " + JSON.stringify(sensor));
            _log(err);
        }

        openGpio(sensor);
    });
}

function openGpio(sensor) {

    // open gpio for the sensor
    gpio.open(sensor.gpio, "input", function(err) {

        if(err) {
            _log("error during open gpio " + JSON.stringify(sensor));
            _log(err);
            return;
        }

        // polling the sensor value from gpio by certain interval
        setInterval(function() {
            gpio.read(sensor.gpio, function(err, value) {
                if(err) {
                    _log("error during read gpio " + JSON.stringify(sensor));
                    _log(err);
                    return;
                }

                _log("read value " + value + " from gpio " + JSON.stringify(sensor));
                checkSensorStatus(sensor, value);
            });
        }, SENSOR_POLLING_INTERVAL);
    });
}

function checkSensorStatus(sensor, value) {

    var _status = getSensorStatus(sensor, value);

    var _previousStatus = readSensorPreviousStatus(sensor);

    if(_previousStatus == OK && _status == NG) {
        // need to raise issue ticket

        var jsonLog = {
            "code": sensor.code,
            "occurred": new Date(),
            "metaData": {"status":"OPEN"}
        };

        uploadLogEntities(jsonLog, function() {
            // write sensor status to file after log upload successfully
            writeSensorStatus(sensor, status);
        }, function() {});

    } else if (_previousStatus == NG && _status == OK) {
        // need to close issue ticket

        var jsonLog = {
            "code": sensor.code,
            "occurred": new Date(),
            "metaData": {"status":"FIXED"}
        };

        uploadLogEntities(jsonLog, function() {
            // write sensor status to file after log upload successfully
            writeSensorStatus(sensor, status);
        }, function() {});
    }
}

function uploadLogEntities(jsonLog, success, failure) {
    uploadLogEntitiesWithRetry(jsonLog, success, failure, 3);
}

function uploadLogEntitiesWithRetry(jsonLog, success, failure, retryCount) {

    var md5 = md5lib(JSON.stringify(jsonLog));

success();
return;
// TODO comment out for testing
    // var arg = {
    //     "vendorThingId": VENDOR_THING_ID,
    //     "thingPassword": THING_PASSWORD,
    //     "entities": [{ "transactionId": md5, "data": jsonLog }],
    // };
    //
    // kii.Kii.serverCodeEntry("uploadLogEntities").execute(arg).then(
    //     function(params) {
    //         var entry = params[0];
    //         var argument = params[1];
    //         var execResult = params[2];
    //         var returnedValue = execResult.getReturnedValue();
    //         var response = returnedValue["returnedValue"];
    //
    //         _log("Received response: " + JSON.stringify(response));
    //
    //         if (response.status == "Success" || response.response == "Success" || (!response.status && !response.response)) {
    //             success(response);
    //         } else {
    //             failure(response);
    //         }
    //     },
    //     function(error) {
    //         _log("Request error " + error);
    //         if(retryCount <= 0) {
    //             _log("Failed to upload log entity " + JSON.stringify(jsonLog));
    //             failure(response);
    //         } else {
    //             // retry
    //             uploadLogEntitiesWithRetry(jsonLog, success, failure, --retryCount);
    //         }
    //     }
    // );
}

function readSensorPreviousStatus(sensor) {
    var previousStatus = OK;
    var _file = getSensorStatusFile(sensor);
    try {
        previousStatus = fs.readFileSync(_file, 'utf8');
    } catch (e) {
        _log("Unable to read previous status of sensor " + JSON.stringify(sensor) + " from file " + _file);
        _log(e);
    }
    return previousStatus;
}

// return
//  OK: powder normal
//  NG: powder below low level
function getSensorStatus(sensor, value) {

    var _status = null;

    switch (value) {
        case "Light-ON":
            _status = OK;
            break;
        case "Dark-ON":
            _status = NG;
            break;
        default:
            _log("unexcepted sensor value " + value);
    }

    return _status;
}

// sensor status should be written, instead of sensor value
function writeSensorStatus(sensor, status) {

    var _file = getSensorStatusFile(sensor);

    try {
        fs.writeFileSync(_file, status);
    } catch(e) {
        _log("Error writing sensor status " + status + " to file " + _file);
        _log(e);
    };
}

function checkSensorStatusFile(sensor) {

    var _file = getSensorStatusFile(sensor);

    // if file of sensor status not existing, create it
    if(fs.existsSync(_file) == false) {
        writeSensorStatus(sensor, OK);
    }
}

function getSensorStatusFile(sensor) {
    return "sensor_status/gpio_" + sensor.gpio + ".txt";
}

// if failed to load config, exit the program
if(loadConfig() == false) {
    process.exit();
}

// open gpio and read the value for each sensor
for (var i = 0; i < SENSOR_LIST.length; i++) {
    // check whether sensor status file existing
    checkSensorStatusFile(SENSOR_LIST[i]);
    // check sensor status by certain interval
    handleSensor(SENSOR_LIST[i]);
}
