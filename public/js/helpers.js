export default {
  closeVideo(elemId) {
    if (document.getElementById(elemId)) {
      document.getElementById(elemId).remove()
    }
  },

  pageHasFocus() {
    return !(
      document.hidden ||
      document.onfocusout ||
      window.onpagehide ||
      window.onblur
    )
  },

  userMediaAvailable() {
    return !!(
      navigator.getUserMedia ||
      navigator.webkitGetUserMedia ||
      navigator.mozGetUserMedia ||
      navigator.msGetUserMedia
    )
  },

  getUserFullMedia() {
    if (this.userMediaAvailable()) {
      return navigator.mediaDevices.getUserMedia({
        video: true,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      })
    } else {
      throw new Error('User media not available')
    }
  },

  getUserAudio() {
    if (this.userMediaAvailable()) {
      return navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      })
    } else {
      throw new Error('User media not available')
    }
  },

  shareScreen() {
    if (this.userMediaAvailable()) {
      return navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      })
    } else {
      throw new Error('User media not available')
    }
  },

  getIceServer() {
    // "turns:eu-turn4.xirsys.com:5349?transport=tcp"
    // "turns:eu-turn4.xirsys.com:443?transport=tcp"
    // "turn:eu-turn4.xirsys.com:80?transport=tcp",
    // "turn:eu-turn4.xirsys.com:3478?transport=udp",
    return {
      iceServers: [
        {
          urls: ['stun:eu-turn4.xirsys.com'],
        },
        {
          username:
            'ml0jh0qMKZKd9P_9C0UIBY2G0nSQMCFBUXGlk6IXDJf8G2uiCymg9WwbEJTMwVeiAAAAAF2__hNSaW5vbGVl',
          credential: '4dd454a6-feee-11e9-b185-6adcafebbb45',
          urls: [
            'turn:eu-turn4.xirsys.com:80?transport=udp',
            'turn:eu-turn4.xirsys.com:3478?transport=tcp',
          ],
        },
      ],
    }
  },

  replaceTrack(stream, recipientPeer) {
    let sender = recipientPeer.getSenders
      ? recipientPeer
          .getSenders()
          .find((s) => s.track && s.track.kind === stream.kind)
      : false

    sender ? sender.replaceTrack(stream) : ''
  },

  toggleShareIcons(share) {
    let shareIconElem = document.querySelector('#share-screen')

    if (share) {
      shareIconElem.setAttribute('title', 'Stop sharing screen')
      $('#share-screen').addClass('btn-danger')
      $('#share-screen').removeClass('btn-success')
    } else {
      shareIconElem.setAttribute('title', 'Share screen')
      $('#share-screen').removeClass('btn-danger')
      $('#share-screen').addClass('btn-success')
    }
  },

  toggleVideoBtnDisabled(disabled) {
    document.getElementById('toggle-video').disabled = disabled
  },

  maximiseStream(e) {
    let elem = e.target.parentElement.previousElementSibling

    elem.requestFullscreen() ||
      elem.mozRequestFullScreen() ||
      elem.webkitRequestFullscreen() ||
      elem.msRequestFullscreen()
  },

  saveRecordedStream(stream, user) {
    let blob = new Blob(stream, { type: 'video/webm' })

    let file = new File([blob], `abcd-record.webm`)

    saveAs(file)
  },

  toggleModal(id, show) {
    let el = document.getElementById(id)

    if (show) {
      el.style.display = 'block'
      el.removeAttribute('aria-hidden')
    } else {
      el.style.display = 'none'
      el.setAttribute('aria-hidden', true)
    }
  },

  setLocalStream(stream, mirrorMode = true) {
    const localVidElem = document.getElementById('local')

    localVidElem.srcObject = stream
    mirrorMode
      ? localVidElem.classList.add('mirror-mode')
      : localVidElem.classList.remove('mirror-mode')
  },
}
