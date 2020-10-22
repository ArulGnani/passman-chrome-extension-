// chrome.storage.local.remove(['token','expire','domins'], function(){
//     console.log("removed")
// })

// chrome.storage.local.set({'domins':{}}, function() {
//     console.log('set')
// })

function createDominObject() {
    chrome.storage.local.set({'domins' : {}});
}

chrome.storage.local.get(['token','domins','expire'],function(value) {
    // console.log(value);

    if (value.domins === undefined) {
        createDominObject();
    }

    if (value.expire !== undefined){
        if (new Date().getTime() < value.expire && value.token !== undefined) {
            showMainPage();
        }
    } else {
        validateToken(value.token).then(function(valid) {
            if (valid) mainPage(); 
            else authendicatePage(value.token);
        });
    }
});


async function validateToken(token){
    var main = document.getElementById("main");
    var p = document.createElement("p");
    p.innerText = "loading...";
    main.appendChild(p);
    var apiEndpoint = "http://localhost:5000/sample-71a5a/us-central1/ValidateToken";
    var response = {};
    await fetch(apiEndpoint, { method : "GET", headers: { token : token }})
        .then(function (res) { return res.json(); })
        .then(function (data) {
            if (data.valid === true) { 
                response.valid = true; 
                cacheToken();
            }
        })
        .catch(function(_) { response.err = true; })
        .finally(function() { main.removeChild(p); });
    return response.valid ? true : false;
}

function cacheToken() {
    var current = new Date().getTime();
    var offsetHrs = 7;
    var offset = current + offsetHrs * 24 * 60 * 60 * 1000;
    chrome.storage.local.set({'expire' : offset }); 
}

function authendicatePage(token) { return token ? login() : signin(); }
function signin() { return createForm("signIn"); }
function login() { return createForm("login"); }

function createForm(type) {
    var main = document.getElementById("main");
    var div = document.createElement("div");
    var msg = document.createElement("p");
    msg.innerText = "";
    msg.id = "msg";
    msg.className = "msg";
    div.id = "form-section";
    div.className = "form";
    var email = document.createElement("input");
    email.placeholder = "ur email id";
    email.type = "email";
    email.id = "email";  
    var password = document.createElement("input");
    password.placeholder = "password";
    password.type = "password";
    password.id = "password";
    var btn = document.createElement("button");
    btn.innerText = type === "signIn" ? "signIn" : "login";
    btn.id = "auth-btn";
    if (type === "signIn") { btn.onclick = function() { verify("signIn"); };}
    else { btn.onclick =  function() { return verify("login"); };}
    var br = document.createElement("br");
    var div2= document.createElement("div");
    var btn2 = document.createElement("button");
    var p = document.createElement("p");
    btn2.innerText = type === "signIn" ? "login" : "signin";
    div2.id = "div2";
    div2.className = "option-section";
    p.innerText = type === "signIn" ? "already have an account" :"create new account";
    if (type === "signIn") { btn2.onclick = function() { removeForm(); login(); };} 
    else { btn2.onclick = function() { removeForm(); signin(); };}
    div2.appendChild(p);
    div2.appendChild(btn2);
    div.appendChild(msg);
    div.appendChild(br);
    div.appendChild(email);
    div.appendChild(password);
    div.appendChild(br);
    div.appendChild(btn);
    div.appendChild(div2);
    main.appendChild(div);
}

function removeForm() {
    var div = document.getElementById("form-section");
    div.remove();
}

async function verify(type) {
    // console.log("clicked",type);
    var email = document.getElementById("email").value;
    var password = document.getElementById("password").value;
    var msg = document.getElementById("msg");
    if (email !== "" && password !== "") {
        msg.innerText = "loading...";
        var loginURl = "http://localhost:5000/sample-71a5a/us-central1/Login";
        var signInURL = "http://localhost:5000/sample-71a5a/us-central1/SignIn";
        var url = type === "signIn" ? signInURL : loginURl;
        var params = { email: email, password: password };
        await fetch(url, { method: "POST", body : JSON.stringify(params)})
            .then(function(response) { return response.json(); })
            .then(function(data) {
                // console.log(data);
                if (data.token) {
                    saveTokenLocally(data.token);
                    cacheToken();
                    removeForm();
                    showMainPage();
                }
                if (data.err) { msg.innerText = data.err; }
            })
            .catch(function(err) {
                // console.log(err);
                msg.innerText = "err";
            });
    } else{ msg.innerText = "all fields are required."; }
} 

function saveTokenLocally(token) {
    chrome.storage.local.set({ token: token }, function() {
        // console.log("cached token.");
    });
}

//##################################################################################

function showMainPage() { getTabId(); }

function getTabId() {
    chrome.runtime.sendMessage({msg: "tabId"},function(res) {
        if (res.id !== null) {
            getCurrentDomin(res.id);
        } else {
            var msg = document.getElementById("warning");
            msg.innerText = "something went wrong, pls reload.";
        }
    });
}

function getCurrentDomin(tabId) {
    chrome.tabs.get(tabId, current_tab_info => {
        // console.log(current_tab_info.url);
        if (current_tab_info.url) {
            var url = current_tab_info.url;
            var domin = new URL(url).hostname;
            // console.log(domin);

            if (domin !== "newtab") {
                chrome.storage.local.get(["domins"],function(data) {
                    if (data.domins[domin] !== undefined) { mainPage(domin); } 
                    else { mainPage(null); }
                });
            } else { mainPage(null);}
        }
        
    });
}

function mainPage(domin) { showPasswordComp(domin); }

function showPasswordComp(domin) {
    if (domin === null) {
        var main = document.getElementById("main");
        var p = document.createElement("p");
        p.id = "no-password";
        p.className = "no-password";
        p.innerText = "u don't have any password associated with this domin.";
        main.appendChild(p);
        showCreateNewPasswordBtn(); 
    } else { showAllPasswordProfiles(domin); }
}

function showAllPasswordProfiles(domin) {
    chrome.storage.local.get(["domins"], function(res) {
        if (res.domins[domin] !== undefined) { 
            allPasswordProfiles(res.domins[domin],domin); }
    });
}

function allPasswordProfiles(passObjs, domin) {
    var exist = document.getElementById("password-profile");
    if (exist === null) {
        var main = document.getElementById("main");
        var div = document.createElement("div");
        div.id = "password-profile";
        div.className = "password-section";
        passObjs.forEach(function(pass) {
            var comp = document.createElement("div");
            var p = document.createElement('p');
            var btn = document.createElement('button');
            p.innerText = pass.name;
            btn.innerText = "open";
            btn.id = pass.id;
            btn.onclick = function(e) { getToken(e, domin); };
            comp.appendChild(p);
            comp.appendChild(btn);
            div.appendChild(comp);
            main.appendChild(div);
        });
        showCreateNewPasswordBtn(); 
    }
}

function removeAllPasswordProfiles(){
    var div = document.getElementById("password-profile");
    if (div !== null) div.remove();
}

function getToken(e, domin) {
    chrome.storage.local.get(["token"], function(data) {
        if (data.token !== undefined) getPassObj(data.token, e, domin);
    });
}

async function getPassObj(token, e, domin) {
    removeAllPasswordProfiles();
    var div = document.getElementById("warning");
    var warnMsg = document.createElement("div");
    var p = document.createElement("p");
    var btn = document.createElement("button");
    warnMsg.id = "warn-msg";
    warnMsg.className = "warn-msg";
    p.innerText = "loading...";
    btn.innerText = "X";
    btn.onclick = function() { removeWarningMsg(); };
    warnMsg.appendChild(p);
    warnMsg.appendChild(btn);
    div.appendChild(warnMsg);
    var passId = e.target.id;
    var url = "http://localhost:5000/sample-71a5a/us-central1/GetPassword";
    await fetch(url, { 
            method: "POST", 
            headers: { token : token },
            body: JSON.stringify({ id: passId })
        })
        .then(function(response) { return response.json(); })
        .then(function(data) { 
            // console.log(data);
            if (data.err !== undefined) {
                // console.log("err", data.err);
                p.innerText = data.err; 
            } else {
                renderPasswordProfile(data);
            }
            showAllPasswordProfiles(domin);
        })
        .catch(function(err) {
            // console.log(err);
        });
}

function removeWarningMsg() {
    var msg = document.getElementById('warn-msg');
    if (msg !== null) msg.remove();
}

function renderPasswordProfile(data) {
    removeCreateNewPassword();
    var main = document.getElementById("main");
    var div = document.createElement("div");
    var msg = document.createElement("div"); 
    var p1 = document.createElement("p");
    var p2 = document.createElement("p");
    var p3 = document.createElement("p");
    var btn = document.createElement("button");
    msg.id = "copy-pass";
    msg.className="cpy-msg";
    div.id = "password-obj";
    div.className = "password-profile";
    p1.innerHTML = `Domin : <b> ${data.domin} </b>`;
    p2.innerHTML = `name : <b> ${data.name} </b>`;
    p3.innerText = "password :";
    btn.innerText = "copy";
    btn.onclick = function() { copyPassword(data.password); };
    p3.appendChild(btn);
    div.appendChild(msg);
    div.appendChild(p1);
    div.appendChild(p2);
    div.appendChild(p2);
    div.appendChild(p3);
    main.appendChild(div);
    showAllPasswordProfiles(data.domin);
}

function copyPassword(password) {
    var msg = document.getElementById("copy-pass");
    var p = document.createElement("p");
    p.id = "cpy-txt";
    var btn = document.createElement("button");
    navigator.clipboard.writeText(password).then(function(res) {
        // console.log(res, "copied");
        p.innerText = "copied";
        btn.innerText = "X";
        btn.onclick = function() { removeCopyPswd(); };
        p.appendChild(btn);
        msg.appendChild(p);
    })
    .catch(function(err) {
        // console.log(err);
    });
}

function removeCopyPswd() { 
    document.getElementById("cpy-txt").remove(); 
}

function removeRenderPassword() {
    var pass = document.getElementById("password-obj");
    if (pass !== null) pass.remove();
}


function showCreateNewPasswordBtn() {
    var btnExist = document.getElementById("new-password");
    if (btnExist === null) {
        var main = document.getElementById("main");
        var div = document.createElement("div");
        var btn = document.createElement("button");
        var p = document.createElement("p");
        div.id = "new-password";
        div.className = "new-password-btn";
        p.innerText = "create new password for this domin";
        btn.innerText = "+";
        btn.id = "add-new-password";
        btn.onclick = function() { getDominAndToken(); };
        div.appendChild(p);
        div.appendChild(btn);
        main.appendChild(div);
    }
}

function removeCreateNewPasswordBtn() {
    var div = document.getElementById("new-password");
    if (div !== null) div.remove();
}

function getDominAndToken(){
    chrome.tabs.query({active: true}, tabs => {
        // console.log(tabs);
        var url = tabs[0].url;
        var domin = new URL(url).hostname;
        if (domin !== "newtab") {
            chrome.storage.local.get(["token"], function(data) {
                if (data.token !== undefined) {
                    createNewPassword(data.token, domin); 
            }});     
        } 
    });
}

function createNewPassword(token, domin) {
    removeRenderPassword();
    removeAllPasswordProfiles();
    var txt = document.getElementById("no-password");
    if (txt !== null) txt.remove();
    removeCreateNewPasswordBtn();
    var main = document.getElementById("main");
    var div = document.createElement("div");
    var msg = document.createElement("div");
    var p = document.createElement("p");
    var input = document.createElement("input");
    var btn = document.createElement("button");
    var br = document.createElement("br");
    btn.innerText = "create password";
    div.id = "create-new-password";
    div.className = "new-password-form";
    msg.innerText = "";
    msg.id = "msg";
    msg.className = "msg";
    p.innerText = `Domin : ${domin}`;
    p.id = "domin";
    input.type = "text";
    input.id = "input";
    input.placeholder = "app name | user name";
    btn.id = "create-password-btn";
    btn.onclick = function() { createPassword(token, domin); };
    div.appendChild(msg);
    div.appendChild(p);
    div.appendChild(input);
    div.appendChild(br);
    div.appendChild(btn);
    main.appendChild(div);
}

function removeCreateNewPassword() {
    var form = document.getElementById("create-new-password");
    if (form !== null) form.remove();
}

async function createPassword(token, domin) {
    var input = document.getElementById("input");
    var p = document.getElementById("domin");
    var msg = document.getElementById("msg");
    p.innerText = domin;
    if (input.value !== "") {
        msg.innerText = "loading...";
        var url = "http://localhost:5000/sample-71a5a/us-central1/CreateNewPassword";
        await fetch(url, { 
                method: "POST",
                headers : { token : token },
                body: JSON.stringify({domin: domin, name: input.value})
            })
            .then(function(response) { return response.json(); })
            .then(function(data) {
                // console.log(data);
                if(data.err) { msg.innerText = data.err; }
                cacheData(data);
                renderPasswordProfile(data);
            })
            .catch(function(err) {
                // console.log(err);
                if (err) { msg.innerText = "something went wrong."; }
            });
    }
}

function cacheData(data) {
    chrome.storage.local.get(["domins"], function(oldData) {
        var newObj = oldData.domins;
        var updatePassObj = oldData.domins[data.domin];
        if (oldData.domins[data.domin] !== undefined) {
            updatePassObj.push({id:data.id, name: data.name});
        } else {
            oldData.domins[data.domin] = [];
            oldData.domins[data.domin].push({id:data.id, name: data.name});
        }
        // console.log(newObj);
        chrome.storage.local.set({"domins" : newObj}, function(res) {
            // console.log("passobj cached.");
        });
    });
}