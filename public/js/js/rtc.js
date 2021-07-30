import h from './helpers.js'
var counter = 0
window.addEventListener('load', () => {
  document.getElementById('create-room').addEventListener('click', (e) => {
    e.preventDefault()
    room = document.querySelector('#room-name').value
    username = document.querySelector('#your-name').value
    if (room) {
      document.getElementById('room-create').style.display = 'none'
      let commElem = document.getElementsByClassName('room-comm')

      for (let i = 0; i < commElem.length; i++) {
        commElem[i].attributes.removeNamedItem('hidden')
      }

      var pc = []

      let socket = io('/stream')

      var socketId = ''
      var myStream = ''
      var screen = ''
      var recordedStream = []
      var mediaRecorder = ''

      //Get user video by default
      getAndSetUserStream()

      socket.on('connect', () => {
        //set socketId
        socketId = socket.io.engine.id

        socket.emit('subscribe', {
          room: room,
          socketId: socketId,
        })

        socket.on('new user', (data) => {
          socket.emit('newUserStart', { to: data.socketId, sender: socketId })
          pc.push(data.socketId)
          init(true, data.socketId)
        })

        socket.on('newUserStart', (data) => {
          pc.push(data.sender)
          init(false, data.sender)
        })

        socket.on('ice candidates', async (data) => {
          data.candidate
            ? await pc[data.sender].addIceCandidate(
                new RTCIceCandidate(data.candidate)
              )
            : ''
        })

        socket.on('sdp', async (data) => {
          if (data.description.type === 'offer') {
            data.description
              ? await pc[data.sender].setRemoteDescription(
                  new RTCSessionDescription(data.description)
                )
              : ''

            h.getUserFullMedia()
              .then(async (stream) => {
                if (!document.getElementById('local').srcObject) {
                  h.setLocalStream(stream)
                }

                //save my stream
                myStream = stream

                stream.getTracks().forEach((track) => {
                  pc[data.sender].addTrack(track, stream)
                })

                let answer = await pc[data.sender].createAnswer()

                await pc[data.sender].setLocalDescription(answer)

                socket.emit('sdp', {
                  description: pc[data.sender].localDescription,
                  to: data.sender,
                  sender: socketId,
                })
              })
              .catch((e) => {
                console.error(e)
              })
          } else if (data.description.type === 'answer') {
            await pc[data.sender].setRemoteDescription(
              new RTCSessionDescription(data.description)
            )
          }
        })
      })

      function getAndSetUserStream() {
        h.getUserFullMedia()
          .then((stream) => {
            //save my stream
            myStream = stream

            h.setLocalStream(stream)
          })
          .catch((e) => {
            console.error(`stream error: ${e}`)
          })
      }

      function init(createOffer, partnerName) {
        pc[partnerName] = new RTCPeerConnection({
          iceServers: [
            { urls: ['stun:bn-turn1.xirsys.com'] },
            {
              username:
                '8ClFlhv-_2-qBM7kglJ173Utq_SD-qhHNuzaZbqA0Yvum9gBmjTsdlfmSl6FVQ47AAAAAF__xV5Vbmtub3du',
              credential: '20d9ac2e-561f-11eb-97c2-0242ac140004',
              urls: [
                'turn:bn-turn1.xirsys.com:80?transport=udp',
                'turn:bn-turn1.xirsys.com:3478?transport=udp',
                'turn:bn-turn1.xirsys.com:80?transport=tcp',
                'turn:bn-turn1.xirsys.com:3478?transport=tcp',
                'turns:bn-turn1.xirsys.com:443?transport=tcp',
                'turns:bn-turn1.xirsys.com:5349?transport=tcp',
              ],
            },
          ],
        })

        if (screen && screen.getTracks().length) {
          screen.getTracks().forEach((track) => {
            pc[partnerName].addTrack(track, screen) //should trigger negotiationneeded event
          })
        } else if (myStream) {
          myStream.getTracks().forEach((track) => {
            pc[partnerName].addTrack(track, myStream) //should trigger negotiationneeded event
          })
        } else {
          h.getUserFullMedia()
            .then((stream) => {
              //save my stream
              myStream = stream

              stream.getTracks().forEach((track) => {
                pc[partnerName].addTrack(track, stream) //should trigger negotiationneeded event
              })

              h.setLocalStream(stream)
            })
            .catch((e) => {
              console.error(`stream error: ${e}`)
            })
        }

        //create offer
        if (createOffer) {
          pc[partnerName].onnegotiationneeded = async () => {
            let offer = await pc[partnerName].createOffer()

            await pc[partnerName].setLocalDescription(offer)

            socket.emit('sdp', {
              description: pc[partnerName].localDescription,
              to: partnerName,
              sender: socketId,
            })
          }
        }

        //send ice candidate to partnerNames
        pc[partnerName].onicecandidate = ({ candidate }) => {
          socket.emit('ice candidates', {
            candidate: candidate,
            to: partnerName,
            sender: socketId,
          })
        }

        //add
        pc[partnerName].ontrack = (e) => {
          let str = e.streams[0]
          if (document.getElementById(`${partnerName}-video`)) {
            document.getElementById(`${partnerName}-video`).srcObject = str
          } else {
            //video elem
            $('.main-section').show()
          }
        }

        pc[partnerName].onconnectionstatechange = (d) => {
          switch (pc[partnerName].iceConnectionState) {
            case 'disconnected':
            case 'failed':
              h.closeVideo(partnerName)
              break

            case 'closed':
              h.closeVideo(partnerName)
              break
          }
        }

        pc[partnerName].onsignalingstatechange = (d) => {
          switch (pc[partnerName].signalingState) {
            case 'closed':
              console.log("Signalling state is 'closed'")
              h.closeVideo(partnerName)
              break
          }
        }
      }

      function shareScreen() {
        h.shareScreen()
          .then((stream) => {
            h.toggleShareIcons(true)

            //disable the video toggle btns while sharing screen. This is to ensure clicking on the btn does not interfere with the screen sharing
            //It will be enabled was user stopped sharing screen
            h.toggleVideoBtnDisabled(true)

            //save my screen stream
            screen = stream

            //share the new stream with all partners
            broadcastNewTracks(stream, 'video', false)

            //When the stop sharing button shown by the browser is clicked
            screen.getVideoTracks()[0].addEventListener('ended', () => {
              stopSharingScreen()
            })
          })
          .catch((e) => {
            console.error(e)
          })
      }

      function stopSharingScreen() {
        //enable video toggle btn
        h.toggleVideoBtnDisabled(false)

        return new Promise((res, rej) => {
          screen.getTracks().length
            ? screen.getTracks().forEach((track) => track.stop())
            : ''

          res()
        })
          .then(() => {
            h.toggleShareIcons(false)
            broadcastNewTracks(myStream, 'video')
          })
          .catch((e) => {
            console.error(e)
          })
      }

      function broadcastNewTracks(stream, type) {
        h.setLocalStream(stream)

        let track =
          type == 'audio'
            ? stream.getAudioTracks()[0]
            : stream.getVideoTracks()[0]

        for (let p in pc) {
          let pName = pc[p]

          if (typeof pc[pName] == 'object') {
            h.replaceTrack(track, pc[pName])
          }
        }
      }

      function toggleRecordingIcons(isRecording) {
        let e = document.getElementById('record')

        if (isRecording) {
          e.setAttribute('title', 'Stop recording')
          e.children[0].classList.add('text-danger')
          e.children[0].classList.remove('text-white')
        } else {
          e.setAttribute('title', 'Record')
          e.children[0].classList.add('text-white')
          e.children[0].classList.remove('text-danger')
        }
      }

      function startRecording(stream) {
        mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'video/webm;codecs=vp9',
        })

        mediaRecorder.start(1000)
        toggleRecordingIcons(true)

        mediaRecorder.ondataavailable = function (e) {
          recordedStream.push(e.data)
        }

        mediaRecorder.onstop = function () {
          toggleRecordingIcons(false)

          h.saveRecordedStream(recordedStream, username)

          setTimeout(() => {
            recordedStream = []
          }, 3000)
        }

        mediaRecorder.onerror = function (e) {
          console.error(e)
        }
      }

      //When the video icon is clicked
      document.getElementById('toggle-video').addEventListener('click', (e) => {
        e.preventDefault()

        let elem = document.getElementById('toggle-video')

        if (myStream.getVideoTracks()[0].enabled) {
          e.target.classList.remove('fa-video')
          e.target.classList.add('fa-video-slash')
          elem.setAttribute('title', 'Show Video')

          myStream.getVideoTracks()[0].enabled = false
        } else {
          e.target.classList.remove('fa-video-slash')
          e.target.classList.add('fa-video')
          elem.setAttribute('title', 'Hide Video')

          myStream.getVideoTracks()[0].enabled = true
        }

        broadcastNewTracks(myStream, 'video')
      })

      //When the mute icon is clicked
      document.getElementById('toggle-mute').addEventListener('click', (e) => {
        e.preventDefault()

        let elem = document.getElementById('toggle-mute')

        if (myStream.getAudioTracks()[0].enabled) {
          e.target.classList.remove('fa-microphone-alt')
          e.target.classList.add('fa-microphone-alt-slash')
          elem.setAttribute('title', 'Unmute')

          myStream.getAudioTracks()[0].enabled = false
        } else {
          e.target.classList.remove('fa-microphone-alt-slash')
          e.target.classList.add('fa-microphone-alt')
          elem.setAttribute('title', 'Mute')

          myStream.getAudioTracks()[0].enabled = true
        }

        broadcastNewTracks(myStream, 'audio')
      })

      //When user clicks the 'Share screen' button
      document.getElementById('share-screen').addEventListener('click', (e) => {
        e.preventDefault()

        if (
          screen &&
          screen.getVideoTracks().length &&
          screen.getVideoTracks()[0].readyState != 'ended'
        ) {
          stopSharingScreen()
        } else {
          shareScreen()
        }
      })

      //When record button is clicked
      document.getElementById('record').addEventListener('click', (e) => {
        /**
         * Ask user what they want to record.
         * Get the stream based on selection and start recording
         */
        if (!mediaRecorder || mediaRecorder.state == 'inactive') {
          h.toggleModal('recording-options-modal', true)
        } else if (mediaRecorder.state == 'paused') {
          mediaRecorder.resume()
        } else if (mediaRecorder.state == 'recording') {
          mediaRecorder.stop()
        }
      })

      //When user choose to record screen
      document.getElementById('record-screen').addEventListener('click', () => {
        h.toggleModal('recording-options-modal', false)

        if (screen && screen.getVideoTracks().length) {
          startRecording(screen)
        } else {
          h.shareScreen()
            .then((screenStream) => {
              startRecording(screenStream)
            })
            .catch(() => {})
        }
      })

      //When user choose to record own video
      document.getElementById('record-video').addEventListener('click', () => {
        h.toggleModal('recording-options-modal', false)

        if (myStream && myStream.getTracks().length) {
          startRecording(myStream)
        } else {
          h.getUserFullMedia()
            .then((videoStream) => {
              startRecording(videoStream)
            })
            .catch(() => {})
        }
      })
    }
  })
})
