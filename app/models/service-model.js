var ServiceModel = function() {

};

ServiceModel.prototype.getChats = function(serviceBase, callback) {
    serviceURL = serviceBase + "get-chat.php";
    this.retVal = "";
    if (callback)
        callback = callback.bind(this);

    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("GET", serviceURL);
    xmlhttp.send();
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == XMLHttpRequest.DONE) {
            if (callback)
                callback(xmlhttp.responseText);
        }
    }.bind(this);
}

ServiceModel.prototype.postChat = function(useSender, useMessage, serviceBase, clientId, callback) {
    serviceURL = serviceBase + "post-chat.php";
    var msgToPost = {
        sender: useSender,
        message: useMessage
    }
    Mojo.Log.info("Posting chat to: " + serviceURL);
    Mojo.Log.info(JSON.stringify(msgToPost));

    this.retVal = "";
    if (callback)
        callback = callback.bind(this);

    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("POST", serviceURL);
    xmlhttp.setRequestHeader("Client-Id", clientId);
    xmlhttp.timeout = 2000;
    xmlhttp.send(JSON.stringify(msgToPost));
    xmlhttp.onreadystatechange = function() {
        Mojo.Log.info("ready state: " + xmlhttp.readyState);
        if (xmlhttp.readyState == XMLHttpRequest.DONE) {
            if (callback)
                callback(xmlhttp.responseText);
        }
    }.bind(this);
    xmlhttp.ontimeout = function() {
        callback();
    }.bind(this);
}

ServiceModel.prototype.editChat = function(useSender, useMessage, uid, editKey, serviceBase, clientId, callback) {
    serviceURL = serviceBase + "edit-chat.php";
    var msgToPost = {
        sender: useSender,
        message: useMessage,
        uid: uid,
        editKey: editKey
    }
    Mojo.Log.info("Edit chat to: " + serviceURL);
    Mojo.Log.info(JSON.stringify(msgToPost));

    this.retVal = "";
    if (callback)
        callback = callback.bind(this);

    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("POST", serviceURL);
    xmlhttp.setRequestHeader("Client-Id", clientId);
    xmlhttp.send(JSON.stringify(msgToPost));
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == XMLHttpRequest.DONE) {
            if (callback)
                callback(xmlhttp.responseText);
        }
    }.bind(this);
}

ServiceModel.prototype.likeChat = function(uid, serviceBase, clientId, callback) {
    serviceURL = serviceBase + "like-chat.php";
    var msgToPost = {
        uid: uid,
        like: "+1"
    }
    Mojo.Log.info("Like chat to: " + serviceURL);
    Mojo.Log.info(JSON.stringify(msgToPost));

    this.retVal = "";
    if (callback)
        callback = callback.bind(this);

    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("POST", serviceURL);
    xmlhttp.setRequestHeader("Client-Id", clientId);
    xmlhttp.send(JSON.stringify(msgToPost));
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == XMLHttpRequest.DONE) {
            if (callback)
                callback(xmlhttp.responseText);
        }
    }.bind(this);
}