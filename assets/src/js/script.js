/**
 * @package koko-analytics
 * @author Danny van Kooten
 * @license GPL-3.0+
 */
const config = window.koko_analytics
const postId = String(config.post_id)

function getCookie (name) {
  if (!document.cookie) {
    return ''
  }

  const cookies = document.cookie.split('; ')
  let parts
  for (let i = 0; i < cookies.length; i++) {
    parts = cookies[i].split('=')
    if (parts[0] === name) {
      return decodeURIComponent(parts[1])
    }
  }

  return ''
}

function setCookie (name, data, expires) {
  name = window.encodeURIComponent(name)
  data = window.encodeURIComponent(String(data))
  let str = name + '=' + data
  str += ';path=' + config.cookie_path + ';SameSite=Lax;expires=' + expires.toUTCString()
  document.cookie = str
}

function trackPageview () {
  // do not track if this is a prerender request
  if ('visibilityState' in document && document.visibilityState === 'prerender') {
    return
  }

  // do not track if user agent looks like a bot
  if ((/bot|crawler|spider|crawling|seo|chrome-lighthouse/i).test(navigator.userAgent)) {
    return
  }

  // do not track if page is inside an iframe
  if (window.location !== window.parent.location) {
    return
  }

  // do not set cookies or get referrer if "Do Not Track" is enabled
  const dnt = 'doNotTrack' in navigator && navigator.doNotTrack === '1'
  const cookie = config.use_cookie ? getCookie('_koko_analytics_pages_viewed') : ''
  const pagesViewed = cookie.split(',').filter(function (id) { return id !== '' })
  let isNewVisitor = cookie.length === 0
  let isUniquePageview = pagesViewed.indexOf(postId) === -1
  let referrer = ''

  // add referrer if not from same-site & try to detect returning visitors from referrer URL
  if (typeof (document.referrer) === 'string' && document.referrer !== '') {
    if (document.referrer.indexOf(window.location.origin) === 0) {
      isNewVisitor = false // referred by same-site, so not a new visitor

      if (document.referrer === window.location.href) {
        isUniquePageview = false // referred by same-url, so not a unique pageview
      }
    } else if (!dnt) {
      referrer = document.referrer // referred by external site, so send referrer URL to be stored
    }
  }

  const img = document.createElement('img')
  img.style.display = 'none'
  img.onload = function () {
    document.body.removeChild(img)

    if (config.use_cookie && !dnt) {
      if (pagesViewed.indexOf(postId) === -1) {
        pagesViewed.push(postId)
      }
      const expires = new Date()
      expires.setHours(expires.getHours() + 6)
      setCookie('_koko_analytics_pages_viewed', pagesViewed.join(','), expires)
    }
  }

  // build tracker URL
  let queryStr = ''
  queryStr += 'p=' + postId
  queryStr += '&nv=' + (isNewVisitor ? '1' : '0')
  queryStr += '&up=' + (isUniquePageview ? '1' : '0')
  queryStr += '&r=' + encodeURIComponent(referrer)
  img.src = config.tracker_url + (config.tracker_url.indexOf('?') > -1 ? '&' : '?') + queryStr

  // add to DOM to fire request
  document.body.appendChild(img)
}

window.addEventListener('load', trackPageview)
