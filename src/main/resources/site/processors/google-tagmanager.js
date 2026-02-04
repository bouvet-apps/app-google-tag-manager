const libs = {
  portal: require('/lib/xp/portal')
};

const getDefaultScript = (containerID) => {
  const snippet = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start': \
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0], \
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src= \
    '//www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f); \
    })(window,document,'script','dataLayer','${containerID}');`
  return snippet;
};

const getConsentRequiredScript = (script, defaultDisable) => {
  const snippet = `var gtmScript = "${script}"; \
    window.__RUN_ON_COOKIE_CONSENT__ = window.__RUN_ON_COOKIE_CONSENT__ || {}; \
    window.__RUN_ON_COOKIE_CONSENT__["${defaultDisable}"] = function () { \
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
    const siteConfig = libs.portal.getSiteConfig() || {};
    const containerID = siteConfig['googleTagManagerContainerID'] || '';

    // Only add snippet if in live mode and containerID is set
    if (!containerID) {
      return res;
    }

    let script = getDefaultScript(containerID);
    script = getConsentRequiredScript(script, defaultDisable);

    const headSnippet = `<!-- Google Tag Manager --> \
        <script>dataLayer = [];</script>
        <script> \
        ${script} \
        </script> \
        <!-- End Google Tag Manager -->`;


    var headEnd = res.pageContributions.headEnd;
    if (!headEnd) {
      res.pageContributions.headEnd = [];
    }
    else if (typeof (headEnd) == 'string') {
      res.pageContributions.headEnd = [headEnd];
    }
    res.pageContributions.headEnd.push(headSnippet);
  }

  return res;
};