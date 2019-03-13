/**
 * Creates a temporary global ga object and loads analytics.js.
 * Parameters o, a, and m are all used internally. They could have been
 * declared using 'var', instead they are declared as parameters to save
 * 4 bytes ('var ').
 *
 * @param {Window}				i The global context object.
 * @param {HTMLDocument}	s The DOM document object.
 * @param {string}				o Must be 'script'.
 * @param {string}				g Protocol relative URL of the analytics.js script.
 * @param {string}				r Global name of analytics object. Defaults to 'ga'.
 * @param {HTMLElement}	 a Async script tag.
 * @param {HTMLElement}	 m First script tag in document.
 */
(function(i, s, o, g, r, a, m){
	i['GoogleAnalyticsObject'] = r; // Acts as a pointer to support renaming.

	// Creates an initial ga() function.
	// The queued commands will be executed once analytics.js loads.
	i[r] = i[r] || function() {
		(i[r].q = i[r].q || []).push(arguments)
	},

	// Sets the time (as an integer) this tag was executed.
	// Used for timing hits.
	i[r].l = 1 * new Date();

	// Insert the script tag asynchronously.
	// Inserts above current tag to prevent blocking in addition to using the
	// async attribute.
	a = s.createElement(o),
	m = s.getElementsByTagName(o)[0];
	a.async = 1;
	a.src = g;
	m.parentNode.insertBefore(a, m)
})(window, document, 'script', 'files/analytics.js', 'ga');

var _storage = {
	get: function(key) {
		return new Promise(function(resolve, reject) {
			var res = {};
			var keys = Array.isArray(key) ? key : (key ? [key] : []);
			
			keys.map(function(_key) {
				(_key in localStorage) && (res[_key] = localStorage[_key]);
			});
			
			if (chrome.storage)
			{
				chrome.storage.local.get(keys.length > 0 ? keys : null, function(chrome_ls) {
					res = Object.assign(res, chrome_ls);
					resolve(res);
				});
			}
			else
			{
				resolve(res);
			}
		});
	},
	set: function(obj) {
		return new Promise(function(resolve, reject) {
			if (!obj)
			{
				reject();
				return;
			}
			if (chrome.storage)
			{
				chrome.storage.local.set(obj, function() {
					resolve();
				});
			}
			else
			{
				for (var key in obj)
				{
					localStorage[key] = obj[key];
				}
				resolve();
			}
		});
	}
};

var userId = null;
var campaignId = "default";

function checkCampaign(ls) {
	var cookieDomain = (ls["landing"] && ls["landing"].split(',')) || (null && null.split(','));
	return new Promise(function(resolve, reject) {
		if (cookieDomain && cookieDomain.length && !ls["ga_cid"])
		{
			var promises = cookieDomain.map(function (_domain) {
				return new Promise(function (res, rej) {
					chrome.cookies.getAll({domain: _domain.trim()}, function(cookies){
						for (var cookiesIter = 0; cookiesIter < cookies.length; cookiesIter++)
						{
							if (cookies[cookiesIter]["name"] === "weec") 
							{
								var weec_val = cookies[cookiesIter]["value"];
								if (weec_val)
								{
									ls["ga_cid"] = window.atob(weec_val);
									break;
								}
							}
						}
						res();
					});
				});
			});
			Promise.all(promises).then(resolve);
		}
		else
		{
			resolve();
		}
	});
}

_storage.get(["ga_cid", "i_cid", "uid44", "landing"]).then(function(ls) {
	checkCampaign(ls).then(function() {
		campaignId = ls["ga_cid"] ? ls["ga_cid"] : (ls["i_cid"] || "tzfe_1");
		function generateRandom()
		{
			var randomText = "";
			var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

			for (var randIter = 0; randIter < 32; ++randIter)
			{
				randomText += possible.charAt(Math.floor(Math.random() * possible.length));
			}

			return randomText;
		}

		userId = ls["uid44"] ? ls["uid44"] : generateRandom();
		ls["uid44"] = userId;
		
		_storage.set(ls);
		initAnalytics();
	});
});

function dateToStr(dateObj)
{
	if (typeof dateObj == "number")
	{
		return dateToStr(new Date(dateObj));
	}
	else if (typeof dateObj == "string")
	{
		return dateObj;
	}
	else
	{
		return (dateObj.getMonth() + 1) + "/" + dateObj.getDate() + "/" + dateObj.getFullYear();
	}
}

function customSend()
{
	_storage.get("ga_send_time").then(function(ls) {
		var last_active = ls["ga_send_time"] || 0;
		var action = 'active';
		if (!last_active)
		{
			action = 'install';
		}
		var currentTime = (new Date()).getTime() - 1000 * 60 * 60 * 3;  // - 3 hours
		if (dateToStr(last_active) != dateToStr(currentTime))
		{
			ga('send', 'event', 'stat', action, {
				hitCallback: function() {
					ls["ga_send_time"] = currentTime;
					_storage.set(ls).then(function() {
						customSend();
					});
				}
			});
		}
		else // else try send at 3:01:00 am of next day, discussed with AV
		{
			var nextSendTime = new Date(currentTime);
			nextSendTime.setDate(nextSendTime.getDate() + 1);
			nextSendTime.setHours(3, 1, 0); // set to 3:01:00 am 
			setTimeout(customSend, nextSendTime.getTime() - new Date().getTime());
		}
	});
}

function initAnalytics()
{
	// Creates a default tracker with automatic cookie domain configuration.
	ga('create', 'UA', 'auto');
	ga('set', 'checkProtocolTask', null);
	ga('set', 'dimension1', userId);
	ga('set', 'campaignSource', campaignId);
	ga('set', 'campaignName', campaignId);
	ga('set', 'appName', chrome.runtime.getManifest().name);
	ga('set', 'appId', 'C7E8AC1A_F8D1_4408_B743_ED159FC7A3BE');
	ga('set', 'appVersion', chrome.runtime.getManifest().version);

	customSend();
}
