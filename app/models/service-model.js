var ServiceModel = function() {

};

ServiceModel.prototype.makeServiceUrl = function(serviceBase, endPoint) {
    if (endPoint.indexOf(".php") == -1)
        endPoint = endPoint + ".php";
    return serviceBase + endPoint;
}

ServiceModel.prototype.getChats = function(serviceBase, clientId, callback) {
    var serviceURL = serviceBase + "get-chat.php";
    Mojo.Log.info("Trying to get chats from: " + serviceURL);
    this.retVal = "";
    if (callback)
        callback = callback.bind(this);

    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("GET", serviceURL);
    xmlhttp.setRequestHeader("Client-Id", clientId);
    xmlhttp.send();
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == XMLHttpRequest.DONE) {
            if (callback)
                callback(xmlhttp.responseText);
        }
    }.bind(this);
}

ServiceModel.prototype.postChat = function(useSender, useMessage, serviceBase, clientId, callback) {
    var serviceURL = serviceBase + "post-chat.php";
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
    var serviceURL = serviceBase + "edit-chat.php";
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

ServiceModel.prototype.uploadPhoto = function(fullFilePath, sender, serviceBase, clientId, callback, errorhandler) {
    var useURL = serviceBase + 'upload-attachment.php';
    Mojo.Log.info("Uploading photo: " + fullFilePath + " to " + useURL);
    return new Mojo.Service.Request('palm://com.palm.downloadmanager/', {
        method: 'upload',
        parameters: {
            fileName: fullFilePath,
            url: useURL,
            fileLabel: 'image',
            contentType: (function(p) {
                var e = p.split('.').pop().toLowerCase();
                return e === 'png' ? 'image/png' : e === 'gif' ? 'image/gif' : 'image/jpeg';
            }(fullFilePath)),
            postParameters: [
                { key: 'sender', data: sender }
            ],
            customHttpHeaders: ['Client-Id: ' + clientId],
            subscribe: true
        },
        onSuccess: function(e) {
            if (!e.completed) return;
            if (e.completionCode !== 0 || e.httpCode !== 200) {
                if (errorhandler) errorhandler('Upload failed: HTTP ' + e.httpCode + ', code ' + e.completionCode);
                return;
            }
            try {
                var result = JSON.parse(e.responseString);
                if (callback) callback(result);
            } catch (ex) {
                if (errorhandler) errorhandler('Bad response from upload server');
            }
        },
        onFailure: function(e) {
            if (errorhandler) errorhandler('Upload error: ' + JSON.stringify(e));
        }
    });
};

ServiceModel.prototype.postChatWithAttachment = function(useSender, attachments, serviceBase, clientId, callback) {
    var serviceURL = serviceBase + 'post-chat.php';
    var msgToPost = {
        sender: useSender,
        message: '',
        attachments: attachments
    };
    Mojo.Log.info("Posting chat with attachment to: " + serviceURL);

    if (callback)
        callback = callback.bind(this);

    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("POST", serviceURL);
    xmlhttp.setRequestHeader("Client-Id", clientId);
    xmlhttp.timeout = 5000;
    xmlhttp.send(JSON.stringify(msgToPost));
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == XMLHttpRequest.DONE) {
            if (callback)
                callback(xmlhttp.responseText);
        }
    }.bind(this);
    xmlhttp.ontimeout = function() {
        if (callback) callback();
    }.bind(this);
};

ServiceModel.prototype.likeChat = function(uid, serviceBase, clientId, callback) {
    var serviceURL = serviceBase + "like-chat.php";
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