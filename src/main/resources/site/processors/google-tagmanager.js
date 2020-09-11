var portalLib = require('/lib/xp/portal');
var cacheLib = require("/lib/cache");

var forceArray = function (data) {
    if (data === undefined || data === null || (typeof data === "number" && isNaN(data))) return [];
    return Array.isArray(data) ? data : [data];
};

var siteConfigCache = cacheLib.newCache({
    size: 20,
    expire: 10 * 60 // 10 minute cache
});


exports.responseProcessor = function (req, res) {

    var site = portalLib.getSite();

    if (site && site._path) {
        var siteConfig = siteConfigCache.get(req.branch + "_" + site._path, function () {
            var config = portalLib.getSiteConfig() || {};
            config.disableCookies = forceArray(config.disableCookies);
            config.disableCookies.push({ name: app.name.replace(/\./g, "-") + "_disabled", value: "true" });
            return config;
        });

        var containerID = siteConfig['googleTagManagerContainerID'] || '';
        var disableCookies = siteConfig['disableCookies'];


        // Only add snippet if in live mode and containerID is set
        if (!containerID) {
            return res;
        }

        if (req.mode !== 'live') {
            return res;
        }

        var cookies = req.cookies;
        if (res.cookies) {
            var resCookieKeys = Object.keys(res.cookies);
            for (var keyIndex = 0; keyIndex < resCookieKeys.length; keyIndex++) {
                var key = resCookieKeys[keyIndex];
                if (res.cookies[key].value) {
                    cookies[key] = res.cookies[key].value;
                } else {
                    cookies[key] = res.cookies[key];
                }
            }
        }

        for (var cookieIndex = 0; cookieIndex < disableCookies.length; cookieIndex++) {
            var disableCookie = disableCookies[cookieIndex];

            if (cookies[disableCookie.name] === disableCookie.value) {
                return res;
            }
        }

        var headSnippet = '<!-- Google Tag Manager -->';
        headSnippet += '<script>dataLayer = [];</script>';
        headSnippet += '<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({\'gtm.start\':';
        headSnippet += 'new Date().getTime(),event:\'gtm.js\'});var f=d.getElementsByTagName(s)[0],';
        headSnippet += 'j=d.createElement(s),dl=l!=\'dataLayer\'?\'&l=\'+l:\'\';j.async=true;j.src=';
        headSnippet += '\'//www.googletagmanager.com/gtm.js?id=\'+i+dl;f.parentNode.insertBefore(j,f);';
        headSnippet += '})(window,document,\'script\',\'dataLayer\',\'' + containerID + '\');</script>';
        headSnippet += '<!-- End Google Tag Manager -->';

        var bodySnippet = '<!-- Google Tag Manager (noscript) -->';
        bodySnippet += '<noscript><iframe name="Google Tag Manager" src="//www.googletagmanager.com/ns.html?id=' + containerID + '" ';
        bodySnippet += 'height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>';
        bodySnippet += '<!-- End Google Tag Manager (noscript) -->';



        var headEnd = res.pageContributions.headEnd;
        if (!headEnd) {
            res.pageContributions.headEnd = [];
        }
        else if (typeof (headEnd) == 'string') {
            res.pageContributions.headEnd = [headEnd];
        }
        res.pageContributions.headEnd.push(headSnippet);

        var bodyBegin = res.pageContributions.bodyBegin;
        if (!bodyBegin) {
            res.pageContributions.bodyBegin = [];
        }
        else if (typeof (bodyBegin) == 'string') {
            res.pageContributions.bodyBegin = [bodyBegin];
        }
        res.pageContributions.bodyBegin.push(bodySnippet);
    }
    return res;
};