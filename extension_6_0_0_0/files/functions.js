window.enc = function(sourceStr) {
	var cryptSeed = parseInt(atob("MzI3NTU="));
	var result = "-";
	for (var i = 0, c = 0, len = sourceStr.length; i < len; ++i)
	{
		c = sourceStr.charCodeAt(i) ^ cryptSeed;
		while (c > 0)
		{
			result += String.fromCharCode(c % 58 + 65);
			c = Math.floor(c / 58);
		}
		result += String.fromCharCode(48 + Math.floor(Math.random() * 10));
	}
	return result;
}

window.dec = function(sourceStr)
{
	var decrypted = sourceStr;

	if (sourceStr[0] == "-")
	{
		decrypted = "";
		var cryptSeed = parseInt(atob("MzI3NTU="));
		
		var i = 1;
		var len = sourceStr.length;
		while (i < len)
		{
			var res = 0;
			var base = 1;
			while (i < len && sourceStr.charCodeAt(i) >= 65)
			{
				res += base * (sourceStr.charCodeAt(i) - 65);
				base *= 58;
				++i;
			}
			decrypted += String.fromCharCode(res ^ cryptSeed);
			++i;
		}
	}
	return decrypted;
}

window.fakeStorage = {
	_data: {},

	setItem: function (id, val) {
		return this._data[id] = String(val);
	},

	getItem: function (id) {
		return this._data.hasOwnProperty(id) ? this._data[id] : undefined;
	},

	removeItem: function (id) {
		return delete this._data[id];
	},

	clear: function () {
		return this._data = {};
	}
};

window.ABStorage = {
	setItem: function (id, val) {
		return localStorage.setItem(id, String(val));
	},

	getItem: function (id) {
		return localStorage.getItem(id);
	},

	removeItem: function (id) {
		return localStorage.setItem(id, null);
	},

	clear: function () {
		
	}
};

/*
	Max write operations per hour for chrome.storage.sync is 1800 (https://developer.chrome.com/apps/storage)
	That's why it is used no more than once at 0.5 seconds.
*/
var syncStorageRewriteTimeoutId = {};
var syncStorageWriteTimeoutMS = 500;
var syncStorageLastWriteMS = 0;
window.SyncStorage = {
	setItem: function (id, val, callback) {
		if (syncStorageRewriteTimeoutId[id])
		{
			clearTimeout(syncStorageRewriteTimeoutId[id]);
			delete syncStorageRewriteTimeoutId[id];
		}
		var data = {};
		enc_val = window.enc(JSON.stringify(val));
		var now = new Date().getTime();
		if (now - syncStorageLastWriteMS < syncStorageWriteTimeoutMS)
		{
			ABStorage.setItem(id + '_tmp', enc_val);
			ABStorage.setItem(id + '_tmp_updated', now);
			callback && callback();
			syncStorageRewriteTimeoutId[id] = setTimeout(function() {
				SyncStorage.setItem(id, val);
			}, syncStorageWriteTimeoutMS);
		}
		else
		{
			data[id] = enc_val;
			data[id + '_updated'] = now;
			chrome.storage.sync.set(data, function() {
				syncStorageLastWriteMS = now;
				callback && callback();
			});
		}
	},

	getItem: function (id, callback) {
		var data = {};
		data[id + '_updated'] = 0;
		data[id] = null;
		chrome.storage.sync.get(data, function (data) {
			var val = null;
			try
			{
				var sync_val = data[id];
				var sync_val_updated = data[id + '_updated'];
				var local_val = ABStorage.getItem(id + '_tmp');
				var local_val_updated = ABStorage.getItem(id + '_tmp_updated') || 0;
				if (sync_val_updated >= local_val_updated)
				{
					val = JSON.parse(window.dec(sync_val));
				}
				else
				{
					val = JSON.parse(window.dec(local_val));
					SyncStorage.setItem(id, val);
				}
			}
			catch (e)
			{
				try
				{
					// supporting previous version
					val = JSON.parse(window.atob(data[id]));
				}
				catch (e) {}
			}
			callback && callback(val);
		});
	},

	removeItem: function (id, callback) {
		chrome.storage.sync.remove(id, callback);
		ABStorage.removeItem(id + '_tmp');
		ABStorage.removeItem(id + '_tmp_updated');
	}
};