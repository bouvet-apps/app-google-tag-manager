const libs = {
    portal: require('/lib/xp/portal'),
    cache: require("/lib/cache")
};

const siteConfigCache = libs.cache.newCache({
    size: 20,
    expire: 10 * 60 // 10 minute cache
});

const getDefaultScript = (containerID) => {
    const snippet = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start': \
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0], \
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src= \
    '//www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f); \
    })(window,document,'script','dataLayer','${containerID}');`
    return snippet;
};

const getConsentRequiredScript = (script, disableCookie) => {
    const snippet = `var gtmScript = "${script}"; \
        window.__RUN_ON_COOKIE_CONSENT__ = window.__RUN_ON_COOKIE_CONSENT__ || {}; \
        window.__RUN_ON_COOKIE_CONSENT__["${disableCookie}"] = function () { \
          var s = document.createElement("script"); \
          s.id = "google-tagmanager-consent"; \
          s.innerText = gtmScript; \
          document.getElementsByTagName("head")[0].appendChild(s); \
        }`;
    return snippet;
};


exports.responseProcessor = (req, res) => {
    if (req.mode !== 'live') {
        return res;
    }

    const site = libs.portal.getSite();

    const defaultDisable = app.name.replace(/\./g, "-") + "_disabled";

    if (site && site._path) {
        const siteConfig = siteConfigCache.get(req.branch + "_" + site._id, () => {
            const config = libs.portal.getSiteConfig() || {};
            return config;
        });

        const containerID = siteConfig['googleTagManagerContainerID'] || '';
        const disableCookie = siteConfig['disableCookie'] ? siteConfig['disableCookie']['name'] : defaultDisable;


        // Only add snippet if in live mode and containerID is set
        if (!containerID) {
            return res;
        }

        const script = getConsentRequiredScript(getDefaultScript(containerID), disableCookie);

        const headSnippet = `<!-- Google Tag Manager --> \
        <script>dataLayer = [];</script>
        <script> \
        ${script} \
        </script> \
        <!-- End Google Tag Manager -->`;



        const bodySnippet = `<!-- Google Tag Manager (noscript) --> \
        <noscript><iframe name="Google Tag Manager" src="//www.googletagmanager.com/ns.html?id=${containerID}" \
        height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript> \
        <!-- End Google Tag Manager (noscript) -->`;



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