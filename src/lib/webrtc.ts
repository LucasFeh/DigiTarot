/** O Firestore leva apenas a oferta/resposta; a mídia usa WebRTC entre navegadores. */
export function criarPeer(): RTCPeerConnection {
  return new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] })
}

function aguardarIce(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === 'complete') return Promise.resolve()
  return new Promise((resolve) => {
    const pronto = () => {
      if (pc.iceGatheringState !== 'complete') return
      pc.removeEventListener('icegatheringstatechange', pronto)
      window.clearTimeout(limite)
      resolve()
    }
    const limite = window.setTimeout(() => {
      pc.removeEventListener('icegatheringstatechange', pronto)
      resolve()
    }, 12000)
    pc.addEventListener('icegatheringstatechange', pronto)
  })
}

export async function oferecer(pc: RTCPeerConnection): Promise<string> {
  await pc.setLocalDescription(await pc.createOffer())
  await aguardarIce(pc)
  if (!pc.localDescription) throw new Error('Não foi possível preparar a conexão.')
  return JSON.stringify(pc.localDescription.toJSON())
}

export async function responder(pc: RTCPeerConnection, oferta: string): Promise<string> {
  await pc.setRemoteDescription(JSON.parse(oferta) as RTCSessionDescriptionInit)
  await pc.setLocalDescription(await pc.createAnswer())
  await aguardarIce(pc)
  if (!pc.localDescription) throw new Error('Não foi possível responder à conexão.')
  return JSON.stringify(pc.localDescription.toJSON())
}

export async function receberResposta(pc: RTCPeerConnection, resposta: string) {
  if (pc.signalingState === 'have-local-offer') {
    await pc.setRemoteDescription(JSON.parse(resposta) as RTCSessionDescriptionInit)
  }
}
