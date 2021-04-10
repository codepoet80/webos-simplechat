var libraries = MojoLoader.require({ name: "foundations", version: "1.0" });
var Future = libraries["foundations"].Control.Future;
var PalmCall = libraries["foundations"].Comms.PalmCall;
var AjaxCall = libraries["foundations"].Comms.AjaxCall;

var AlarmAssistant = function() {}

AlarmAssistant.prototype.run = function(future) {
    console.log("***************Hello " + this.controller.args.name);
    if (this.controller.args.name == "silent") {
        var outputVal = 0;
        for (var i = 0; i < 1000; i++) {
            outputVal = outputVal++;
        }

        future.result = { reply: "*********** Hello quietly! Output val is:" + outputVal };

    } else {

        console.log("********* Trying to get data");
        /*var options = { "bodyEncoding": "utf8" };
        var future1 = AjaxCall.get("http://chat.webosarchive.com/get-chat.php", options);
        future1.then(function(future2) {
            console.log("********* Ajax result " + JSON.stringify(future2.result))
            if (future2.result.status == 200) { // 200 = Success
                console.log('********* Ajax get success ' + JSON.stringify(future2.result));
            } else console.log('Ajax get fail');
        });*/

        var options = { "bodyEncoding": "utf8" };
        var future1 = AjaxCall.get("http://chat.webosarchive.com/get-chat.php", options);
        future1.then(function(future) {
            var result = future.result;
            //if (result.returnValue == true) {
            console.log("********* Launch Success = " + JSON.stringify(result));
            //} else Mojo.Log.info("********* Launch Failure = " + JSON.stringify(result));
            future.result = { reply: "*********** Hello noisily!" };
        });



        /*
        var future1 = PalmCall.call("palm://com.palm.applicationManager", "open", { "id": "com.jonandnic.simplechat.app", "params": { "action": "alarm" } });
        future1.then(function(future) {
            var result = future.result;
            if (result.returnValue == true) {
                Mojo.Log.info("********* Launch Success = " + JSON.stringify(result));
            } else Mojo.Log.info("********* Launch Failure = " + JSON.stringify(result));
        });
        */
    }
}